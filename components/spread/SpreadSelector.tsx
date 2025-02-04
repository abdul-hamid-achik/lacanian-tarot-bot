'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn, fetcher } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { Spread } from '@/lib/spreads';
import useSWR from 'swr';

interface SpreadSelectorProps {
    onSpreadSelect: (spreadId: string) => void;
    className?: string;
}

export function SpreadSelector({ onSpreadSelect, className }: SpreadSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedSpread, setSelectedSpread] = useState<string>('');
    const { data, error } = useSWR<{ spreads: Spread[] }>('/api/spreads', fetcher);

    const handleSelect = (spreadId: string) => {
        setSelectedSpread(spreadId);
        setOpen(false);
        onSpreadSelect(spreadId);
    };

    const selectedSpreadName = data?.spreads.find(s => s.id === selectedSpread)?.name;

    if (error) {
        return (
            <Button variant="outline" disabled className={className}>
                Failed to load spreads
            </Button>
        );
    }

    if (!data) {
        return (
            <Button variant="outline" disabled className={className}>
                Loading spreads...
            </Button>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', className)}
                >
                    {selectedSpreadName || 'Select a spread...'}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search spreads..." />
                    <CommandEmpty>No spread found.</CommandEmpty>
                    <CommandGroup>
                        {data.spreads.map((spread) => (
                            <CommandItem
                                key={spread.id}
                                value={spread.id}
                                onSelect={() => handleSelect(spread.id)}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedSpread === spread.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                />
                                <div className="flex flex-col">
                                    <span>{spread.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {spread.description}
                                    </span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
