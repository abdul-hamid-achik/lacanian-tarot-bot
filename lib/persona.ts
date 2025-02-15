import { eq, sql, and } from 'drizzle-orm';
import { db } from './db/client';
import { userTheme, theme, } from './db/schema';
import { TextEmbedder } from './embeddings';
import { getOrCreateAnonymousUser, getAnonymousUserThemes, updateAnonymousUserTheme } from './db/queries';

export interface UserPersona {
    userId: string;
    themes: Array<{
        id: string;
        name: string;
        weight: number;
    }>;
    lastUpdated: Date;
}

const daysSince = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export class PersonaManager {
    private embeddingModel: TextEmbedder;
    private decayRate = Number.parseFloat(process.env.THEME_DECAY_RATE || '0.95');

    constructor(embeddingModel?: TextEmbedder) {
        this.embeddingModel = embeddingModel || new TextEmbedder();
    }

    async getPersona(userId: string, sessionId?: string): Promise<UserPersona> {
        if (sessionId) {
            // Handle anonymous user
            const anonymousUser = await getOrCreateAnonymousUser(sessionId);
            const anonymousThemes = await getAnonymousUserThemes(anonymousUser.id);
            
            if (anonymousThemes.length === 0) {
                return this.initializeAnonymousPersona(anonymousUser.id);
            }

            // Get theme names
            const themeIds = anonymousThemes.map(t => t.themeId);
            const themes = await db
                .select({
                    id: theme.id,
                    name: theme.name,
                })
                .from(theme)
                .where(sql`${theme.id} = ANY(${themeIds})`);

            return {
                userId: anonymousUser.id,
                themes: themes.map(t => ({
                    id: t.id,
                    name: t.name,
                    weight: Number(anonymousThemes.find(at => at.themeId === t.id)?.weight || 0.5),
                })),
                lastUpdated: anonymousUser.lastActive,
            };
        }

        // Handle regular user
        const userThemes = await db
            .select({
                id: theme.id,
                name: theme.name,
                weight: sql<number>`COALESCE(${userTheme.weight}, 0.5)`,
            })
            .from(userTheme)
            .innerJoin(theme, eq(theme.id, userTheme.themeId))
            .where(eq(userTheme.userId, userId));

        if (userThemes.length === 0) {
            return this.initializePersona(userId);
        }

        const decayedThemes = await this.applyThemeDecay(userId, userThemes);

        return {
            userId,
            themes: decayedThemes,
            lastUpdated: new Date(),
        };
    }

    private async initializeAnonymousPersona(anonymousUserId: string): Promise<UserPersona> {
        // Get all available themes
        const themes = await db.select().from(theme);

        // Initialize each theme with default weight
        for (const t of themes) {
            await updateAnonymousUserTheme(anonymousUserId, t.id, 0.5);
        }

        return {
            userId: anonymousUserId,
            themes: themes.map(t => ({
                id: t.id,
                name: t.name,
                weight: 0.5,
            })),
            lastUpdated: new Date(),
        };
    }

    private async initializePersona(userId: string): Promise<UserPersona> {
        // Get all available themes
        const themes = await db.select().from(theme);

        // Initialize each theme with default weight
        for (const t of themes) {
            await db.insert(userTheme).values({
                userId,
                themeId: t.id,
                weight: sql<string>`0.5`,
            });
        }

        return {
            userId,
            themes: themes.map(t => ({
                id: t.id,
                name: t.name,
                weight: 0.5,
            })),
            lastUpdated: new Date(),
        };
    }

    private async applyThemeDecay(
        userId: string,
        themes: Array<{ id: string; name: string; weight: number }>
    ): Promise<Array<{ id: string; name: string; weight: number }>> {
        const daysSinceLastUpdate = await this.getDaysSinceLastUpdate(userId);
        const decayFactor = Math.pow(this.decayRate, daysSinceLastUpdate);

        // Apply decay to each theme
        const decayedThemes = themes.map(theme => ({
            ...theme,
            weight: Math.max(0.1, theme.weight * decayFactor),
        }));

        // Update weights in database
        for (const theme of decayedThemes) {
            await db
                .update(userTheme)
                .set({
                    weight: sql<string>`${theme.weight}::numeric(3,2)`,
                })
                .where(
                    and(
                        eq(userTheme.userId, userId),
                        eq(userTheme.themeId, theme.id)
                    )
                );
        }

        return decayedThemes;
    }

    private async getDaysSinceLastUpdate(userId: string): Promise<number> {
        const result = await db
            .select({
                lastUpdate: sql<Date>`MAX(updated_at)`,
            })
            .from(userTheme)
            .where(eq(userTheme.userId, userId));

        const lastUpdate = result[0]?.lastUpdate;
        if (!lastUpdate) return 0;

        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async updateThemeWeight(
        userId: string,
        themeId: string,
        adjustment: number
    ): Promise<number> {
        const result = await db
            .update(userTheme)
            .set({
                weight: sql<string>`LEAST(1.0, GREATEST(0.0, COALESCE(weight, 0.5) + ${adjustment}))::numeric(3,2)`,
            })
            .where(
                and(
                    eq(userTheme.userId, userId),
                    eq(userTheme.themeId, themeId)
                )
            )
            .returning({ newWeight: userTheme.weight });

        return Number(result[0]?.newWeight ?? 0.5);
    }
}
