import { type TarotCard, type Spread } from '@/lib/db/schema';

export function generateDrawingPrompt(
  userQuery: string,
  spread?: Spread
): string {
  return `You are a Lacanian Tarot reader preparing to draw cards for a reading.

User Query: ${userQuery}

${spread ? `Selected Spread: ${spread.name}
${spread.description}

Positions:
${spread.positions.map((pos, i) => `${i + 1}. ${pos.name}: ${pos.description}`).join('\n')}
` : 'No specific spread selected. Draw cards that best address the query.'}

Consider the following in your selection:
1. The Symbolic order - language, culture, and social structures
2. The Imaginary order - ego, identity, and self-image
3. The Real - the ineffable, traumatic, and unsymbolizable

Draw cards that will help illuminate these dimensions of the querent's situation.`;
} 