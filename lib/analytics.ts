import { track } from '@vercel/analytics';

export type AnalyticsEvent = {
    name: string;
    properties?: Record<string, string | number | boolean>;
};

export const trackEvent = async (event: AnalyticsEvent) => {
    try {
        await track(event.name, event.properties);
    } catch (error) {
        console.error('Failed to track event:', error);
    }
};

export const trackThemeChange = async (
    userId: string,
    themeId: string,
    newWeight: number,
    reason: 'decay' | 'upvote' | 'downvote'
) => {
    await trackEvent({
        name: 'theme_weight_change',
        properties: {
            userId,
            themeId,
            newWeight,
            reason,
            timestamp: Date.now()
        }
    });
};

export const trackRateLimit = async (
    ip: string,
    endpoint: string,
    remaining: number
) => {
    await trackEvent({
        name: 'rate_limit_hit',
        properties: {
            ip,
            endpoint,
            remaining,
            timestamp: Date.now()
        }
    });
};
