export const detectTarotIntent = (message: string): boolean => {
    const tarotKeywords = ['tarot', 'cards', 'reading', 'spread', 'draw'];
    return tarotKeywords.some(keyword => message.toLowerCase().includes(keyword));
};

export const parseTarotRequest = (message: string) => {
    // Simple parsing - can be enhanced with NLP
    const numCardsMatch = message.match(/(\d+)\s+cards?/);
    const spreadMatch = message.match(/spread:\s*(\w+)/);

    return {
        numCards: numCardsMatch ? parseInt(numCardsMatch[1], 10) : 3,
        spread: spreadMatch ? spreadMatch[1] : undefined
    };
};
