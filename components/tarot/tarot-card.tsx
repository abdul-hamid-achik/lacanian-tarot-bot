import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TarotCard as TarotCardType } from '@/lib/db/schema';

interface TarotCardProps {
    card: TarotCardType;
    position: number;
    isReversed?: boolean;
}

const positionNames = {
    1: 'Past',
    2: 'Present',
    3: 'Future',
    4: 'Above',
    5: 'Below',
    6: 'Advice',
    7: 'External',
    8: 'Hopes',
    9: 'Outcome'
};

export function TarotCard({ card, position, isReversed }: TarotCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="p-2">
                <CardTitle className="text-sm">
                    {positionNames[position as keyof typeof positionNames] || `Position ${position}`}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                <div className="relative aspect-[2/3] w-full">
                    <Image
                        src={card.imageUrl || '/images/cards/CardBacks.png'}
                        alt={card.name}
                        fill
                        className={cn(
                            "object-cover transition-all duration-700",
                            isReversed && "rotate-180"
                        )}
                    />
                </div>
                <div className="mt-2 space-y-1 text-sm">
                    <h3 className="font-semibold">
                        {card.name} {isReversed && '(Reversed)'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {card.arcana} Arcana • {card.suit !== 'none' ? card.suit : ''}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
