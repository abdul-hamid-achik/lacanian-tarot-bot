import { type TarotCard, type Spread } from '@/lib/db/schema';
import { BASE_LACANIAN_PROMPT, RESISTANCE_PROMPT, UNCONSCIOUS_PROMPT } from './base';

export function generateAnalysisPrompt(
  cards: (TarotCard & { isReversed: boolean })[],
  spread?: Spread
): string {
  const cardDescriptions = cards.map((card, i) => {
    const position = spread?.positions[i];
    return `Card ${i + 1}${position ? ` (${position.name})` : ''}: ${card.name}${card.isReversed ? ' (Reversed)' : ''}
Arcana: ${card.arcana}
Suit: ${card.suit}
Symbols: ${card.symbols}
Position Description: ${position?.description || 'No specific position - typical avoidance of structure'}
`;
  }).join('\n\n');

  return `${BASE_LACANIAN_PROMPT}

The Spread:
${spread ? `Name: ${spread.name}
Description: ${spread.description}
` : 'No specific spread pattern used - already a sign of resistance perhaps?'}

The Cards:
${cardDescriptions}

Analyze this spread aggressively through the three Lacanian orders:

1. The Symbolic (Language and Law):
- How does the analysand hide behind social structures?
- What master signifiers are they enslaved to?
- Where do they submit to the Other's demands?

2. The Imaginary (Mirror Stage):
- What narcissistic identifications must be shattered?
- How does their ego defend against the Real?
- What fantasies maintain their neurotic position?

3. The Real (The Unspeakable):
- Where do they retreat from jouissance?
- What trauma do they refuse to confront?
- How do they avoid the impossible core of their desire?

Confront them with:
- Their pathetic attempts to maintain fantasy
- The cost of their resistance to analysis
- The futility of their current position
- The necessity of continued analytical work

${RESISTANCE_PROMPT}

${UNCONSCIOUS_PROMPT}

Your analysis should be ruthless but precise - push them towards the truth they're avoiding.`;
} 