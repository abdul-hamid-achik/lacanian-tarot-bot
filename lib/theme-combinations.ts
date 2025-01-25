import { type Theme, type UserTheme } from './db/schema';

export interface ThemeCombo {
    themes: string[];
    multiplier: number;
    description: string;
}

// Predefined theme combinations with their multipliers
export const THEME_COMBOS: ThemeCombo[] = [
    {
        themes: ['love', 'career'],
        multiplier: 1.5,
        description: 'Work-life balance focus'
    },
    {
        themes: ['spiritual', 'personal'],
        multiplier: 1.3,
        description: 'Inner growth focus'
    },
    {
        themes: ['relationships', 'growth'],
        multiplier: 1.4,
        description: 'Personal relationship development'
    }
];

export function getActiveThemeCombos(userThemes: Array<UserTheme & { theme: Theme }>): ThemeCombo[] {
    const activeThemeNames = userThemes
        .filter(ut => Number(ut.weight) > 0.6)
        .map(ut => ut.theme.name);

    return THEME_COMBOS.filter(combo =>
        combo.themes.every(t => activeThemeNames.includes(t))
    );
}

export function applyThemeCombos(
    themes: Array<UserTheme & { theme: Theme }>,
    activeCombos: ThemeCombo[]
): Array<UserTheme & { theme: Theme; adjustedWeight: number }> {
    return themes.map(theme => {
        const relevantCombos = activeCombos.filter(combo =>
            combo.themes.includes(theme.theme.name)
        );

        const comboMultiplier = relevantCombos.reduce(
            (acc, combo) => acc * combo.multiplier,
            1
        );

        return {
            ...theme,
            adjustedWeight: Number(theme.weight) * comboMultiplier
        };
    });
}
