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

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

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
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSpread, setSelectedSpread] = useState<string>('');
    const [chatId] = useState(() => crypto.randomUUID());

    const handleSpreadSelect = (spreadId: string) => {
        setSelectedSpread(spreadId);
        const spread = PREDEFINED_SPREADS[spreadId];
        if (spread) {
            setInput(`Please do a ${spread.name} reading for me.`);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const messageId = crypto.randomUUID();
        const userMessage: Message = {
            id: messageId,
            role: 'user',
            content: input,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const spread = selectedSpread ? PREDEFINED_SPREADS[selectedSpread] : undefined;
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    id: chatId,
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
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            let accumulatedMessage = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                accumulatedMessage += chunk;

                // Update the message in real-time
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'assistant') {
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMessage, content: accumulatedMessage }
                        ];
                    } else {
                        return [
                            ...prev,
                            {
                                id: crypto.randomUUID(),
                                role: 'assistant',
                                content: accumulatedMessage,
                                createdAt: new Date()
                            }
                        ];
                    }
                });
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: 'Sorry, something went wrong. Please try again.',
                    createdAt: new Date()
                }
            ]);
        } finally {
            setIsLoading(false);
            setSelectedSpread('');
        }
    };

    return (
        <div className="flex h-full flex-col space-y-4">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((message) => {
                    const isTarotReading = message.role === 'assistant' && message.content.includes('"type":"cards"');
                    let tarotResponse: TarotResponse | undefined;

                    if (isTarotReading) {
                        try {
                            tarotResponse = JSON.parse(message.content) as TarotResponse;
                        } catch (e) {
                            console.error('Failed to parse tarot reading:', e);
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
                                <div className="prose dark:prose-invert">
                                    {tarotResponse?.interpretation || message.content}
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <SpreadSelector
                        onSpreadSelect={handleSpreadSelect}
                        className="mb-4"
                    />
                    <div className="flex space-x-4">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
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
