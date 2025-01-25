import { ResponsiveRadar } from '@nivo/radar';
import { Card } from '@/components/ui/card';
import type { Theme, UserTheme } from '@/lib/db/schema';

interface PersonaGraphProps {
    themes: Array<UserTheme & { theme: Theme }>;
}

export function PersonaGraph({ themes }: PersonaGraphProps) {
    const data = themes.map(theme => ({
        theme: theme.theme.name,
        weight: Number(theme.weight)
    }));

    return (
        <Card className="h-[400px] p-4">
            <ResponsiveRadar
                data={data}
                keys={['weight']}
                indexBy="theme"
                maxValue={1}
                curve="linearClosed"
                borderWidth={2}
                borderColor={{ theme: 'grid.line.stroke' }}
                gridLevels={5}
                gridShape="circular"
                gridLabelOffset={12}
                enableDots={true}
                dotSize={8}
                dotColor={{ theme: 'background' }}
                dotBorderWidth={2}
                motionConfig="gentle"
                theme={{
                    background: 'transparent',
                    text: {
                        color: 'var(--theme-text)',
                    },
                    grid: {
                        line: {
                            stroke: 'var(--theme-border)'
                        }
                    }
                }}
            />
        </Card>
    );
}
