'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TarotCard, Spread } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface SpreadPosition {
    name: string;
    description: string;
    themeMultiplier: number;
    position: number;
}

interface DrawnCard extends TarotCard {
    isReversed: boolean;
}

interface SpreadDisplayProps {
    spread: Spread & { positions: SpreadPosition[] };
    onDrawCards?: (numCards: number) => Promise<DrawnCard[]>;
    className?: string;
}

export function SpreadDisplay({ spread, onDrawCards, className }: SpreadDisplayProps) {
    const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleDrawCards = async () => {
        if (!onDrawCards) return;
        setIsLoading(true);
        try {
            const cards = await onDrawCards(spread.positions.length);
            setDrawnCards(cards);
        } catch (error) {
            console.error('Failed to draw cards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={cn('p-6', className)}>
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">{spread.name}</h3>
                    <p className="text-sm text-muted-foreground">{spread.description}</p>
                </div>

                {onDrawCards && (
                    <Button
                        onClick={handleDrawCards}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Drawing cards...' : 'Draw Cards'}
                    </Button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {spread.positions.sort((a, b) => a.position - b.position).map((position, index) => (
                        <Card key={index} className="p-4">
                            <h4 className="font-medium mb-2">{position.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4">{position.description}</p>

                            {drawnCards[index] && (
                                <div className="relative aspect-[2/3] w-full">
                                    <div className={cn(
                                        'absolute inset-0 transition-transform duration-500',
                                        drawnCards[index].isReversed && 'rotate-180'
                                    )}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={drawnCards[index].imageUrl || '/cards/default.jpg'}
                                            alt={drawnCards[index].name}
                                            className="size-full object-cover rounded-md"
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </Card>
    );
}
