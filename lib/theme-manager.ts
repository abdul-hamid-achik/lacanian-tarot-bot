import { db } from './db/client';
import { userTheme, } from './db/schema';
import { eq, and, } from 'drizzle-orm';
import { trackThemeChange } from './analytics';

export class PersonaManager {
    private static readonly DECAY_RATE = 0.05; // 5% decay per day
    private static readonly MIN_WEIGHT = 0.1;
    private static readonly MAX_WEIGHT = 10;

    public async applyDecay(userId: string): Promise<void> {
        const userThemes = await db.select().from(userTheme).where(eq(userTheme.userId, userId));

        for (const ut of userThemes) {
            if (ut.themeId && ut.weight) {
                const days = this.getDaysSinceUpdate(ut.updatedAt);
                if (days > 0) {
                    const newWeight = this.calculateDecayedWeight(Number(ut.weight), days);
                    await this.updateThemeWeight(userId, ut.themeId, newWeight);
                    await trackThemeChange(userId, ut.themeId, newWeight, 'decay');
                }
            }
        }
    }

    public async updateWeight(
        userId: string,
        themeId: string,
        interaction: 'upvote' | 'downvote'
    ): Promise<void> {
        const userThemes = await db
            .select()
            .from(userTheme)
            .where(and(
                eq(userTheme.userId, userId),
                eq(userTheme.themeId, themeId)
            ));

        const currentTheme = userThemes[0];
        const currentWeight = currentTheme?.weight ? Number(currentTheme.weight) : 1;
        const weightChange = interaction === 'upvote' ? 0.1 : -0.1;
        const newWeight = Math.max(
            PersonaManager.MIN_WEIGHT,
            Math.min(PersonaManager.MAX_WEIGHT, currentWeight + weightChange)
        );

        await this.updateThemeWeight(userId, themeId, newWeight);
        await trackThemeChange(userId, themeId, newWeight, interaction);
    }

    public async getPersona(userId: string): Promise<Record<string, number>> {
        const userThemes = await db.select().from(userTheme).where(eq(userTheme.userId, userId));
        return Object.fromEntries(
            userThemes
                .filter(ut => ut.themeId && ut.weight)
                .map(ut => [ut.themeId!, Number(ut.weight!)])
        );
    }

    private getDaysSinceUpdate(updatedAt: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    private calculateDecayedWeight(weight: number, days: number): number {
        const decayFactor = Math.pow(1 - PersonaManager.DECAY_RATE, days);
        return Math.max(PersonaManager.MIN_WEIGHT, weight * decayFactor);
    }

    private async updateThemeWeight(
        userId: string,
        themeId: string,
        weight: number
    ): Promise<void> {
        const now = new Date();
        await db
            .insert(userTheme)
            .values({
                userId,
                themeId,
                weight: weight.toString()
            })
            .onConflictDoUpdate({
                target: [userTheme.userId, userTheme.themeId],
                set: { weight: weight.toString() }
            });
    }
}
