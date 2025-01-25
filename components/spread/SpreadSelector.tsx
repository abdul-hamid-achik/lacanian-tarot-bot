'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { PREDEFINED_SPREADS } from '@/lib/spreads';

interface SpreadSelectorProps {
    onSpreadSelect: (spreadId: string) => void;
    className?: string;
}

export function SpreadSelector({ onSpreadSelect, className }: SpreadSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedSpread, setSelectedSpread] = useState<string>('');

    const handleSelect = (spreadId: string) => {
        setSelectedSpread(spreadId);
        setOpen(false);
        onSpreadSelect(spreadId);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', className)}
                >
                    {selectedSpread
                        ? PREDEFINED_SPREADS[selectedSpread]?.name
                        : 'Select a spread...'}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search spreads..." />
                    <CommandEmpty>No spread found.</CommandEmpty>
                    <CommandGroup>
                        {Object.entries(PREDEFINED_SPREADS).map(([id, spread]) => (
                            <CommandItem
                                key={id}
                                value={id}
                                onSelect={() => handleSelect(id)}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedSpread === id ? 'opacity-100' : 'opacity-0'
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
