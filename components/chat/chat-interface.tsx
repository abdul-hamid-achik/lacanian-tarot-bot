'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SpreadSelector } from '../spread/SpreadSelector';
import { SpreadDisplay } from '../spread/SpreadDisplay';
import { PREDEFINED_SPREADS } from '@/lib/spreads';
import type { Spread, TarotCard as TarotCardType, SpreadPosition } from '@/lib/db/types';
import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';

interface ChatInterfaceProps {
    userId: string;
}

interface TarotResponse {
    type: 'cards';
    cards: Array<TarotCardType & { isReversed: boolean }>;
    interpretation: string;
    spread: Spread & { positions: SpreadPosition[] };
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        body: {
            userId,
        },
    });
    const [selectedSpread, setSelectedSpread] = useState<string>('');
    const [chatId] = useState(() => crypto.randomUUID());

    const handleSpreadSelect = (spreadId: string) => {
        setSelectedSpread(spreadId);
        const spread = PREDEFINED_SPREADS[spreadId];
        if (spread) {
            handleInputChange({ target: { value: `Please do a ${spread.name} reading for me.` } } as any);
        }
    };

    const handleVote = async (messageId: string, type: 'upvote' | 'downvote') => {
        try {
            await fetch('/api/chat', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    messageId,
                    type
                })
            });
        } catch (error) {
            console.error('Failed to submit vote:', error);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const spread = selectedSpread ? PREDEFINED_SPREADS[selectedSpread] : undefined;
        handleSubmit(e, {
            body: {
                chatId,
                userId,
                spread: spread ? {
                    id: selectedSpread,
                    name: spread.name,
                    description: spread.description,
                    positions: spread.positions,
                    userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isPublic: false
                } : undefined
            }
        });
        setSelectedSpread('');
    };

    return (
        <div className="flex h-full flex-col space-y-4">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((message) => {
                    let tarotResponse: TarotResponse | undefined;
                    let messageContent = message.content;

                    // Only try to parse as JSON if it looks like a tarot reading
                    if (message.role === 'assistant') {
                        try {
                            // Accumulate the streamed content until we have a complete JSON object
                            if (message.content.startsWith('{') && message.content.endsWith('}')) {
                                const parsed = JSON.parse(message.content);
                                if (parsed.type === 'cards') {
                                    tarotResponse = parsed as TarotResponse;
                                    messageContent = parsed.interpretation || message.content;
                                }
                            }
                        } catch (e) {
                            // If parsing fails, just display the content as is
                            console.debug('Not a JSON message:', e);
                        }
                    }

                    return (
                        <div
                            key={message.id}
                            className={cn(
                                'flex w-full',
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            <Card className="max-w-[80%] space-y-2 p-4">
                                {tarotResponse && (
                                    <SpreadDisplay
                                        spread={tarotResponse.spread}
                                        onDrawCards={undefined}
                                        className="mb-4"
                                    />
                                )}
                                <div className="prose dark:prose-invert whitespace-pre-wrap">
                                    {messageContent}
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleVote(message.id, 'upvote')}
                                    >
                                        👍
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleVote(message.id, 'downvote')}
                                    >
                                        👎
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>

            <div className="border-t p-4">
                <form onSubmit={onSubmit} className="space-y-4">
                    <SpreadSelector
                        onSpreadSelect={handleSpreadSelect}
                        className="mb-4"
                    />
                    <div className="flex space-x-4">
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask about your cards..."
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Thinking...' : 'Send'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
