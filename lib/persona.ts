import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from './db/client';
import { user, userTheme, theme, chat, message, type Theme, type UserTheme } from './db/schema';
import { TextEmbedder } from './embeddings';

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
    private decayRate = parseFloat(process.env.THEME_DECAY_RATE || '0.95');

    constructor(embeddingModel?: TextEmbedder) {
        this.embeddingModel = embeddingModel || new TextEmbedder();
    }

    async getPersona(userId: string): Promise<UserPersona> {
        // Get user's themes with weights
        const userThemes = await db
            .select({
                id: theme.id,
                name: theme.name,
                weight: sql<number>`COALESCE(${userTheme.weight}, 0.5)`,
            })
            .from(userTheme)
            .innerJoin(theme, eq(theme.id, userTheme.themeId))
            .where(eq(userTheme.userId, userId));

        // If no themes found, initialize with defaults
        if (userThemes.length === 0) {
            return this.initializePersona(userId);
        }

        // Apply decay to weights based on last update
        const decayedThemes = await this.applyThemeDecay(userId, userThemes);

        return {
            userId,
            themes: decayedThemes,
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
