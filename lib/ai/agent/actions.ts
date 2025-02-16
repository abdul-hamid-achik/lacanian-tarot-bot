import { type TarotAgentContext, type TarotAgentAction, type TarotAgentError } from './types';
import { getSpreadById } from '@/lib/spreads';
import { customModel } from '@/lib/ai';
import { db } from '@/lib/db/client';
import { tarotCard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  generateDrawingPrompt,
  generateAnalysisPrompt,
  generateResponsePrompt,
  CARD_REVERSAL_PROMPT,
  SPREAD_POSITION_PROMPT,
  THEME_INTEGRATION_PROMPT,
  TRANSFERENCE_PROMPT,
  RESISTANCE_PROMPT,
  UNCONSCIOUS_PROMPT,
  SYMBOLIC_CHAINS_PROMPT
} from './prompts';

export async function drawCards(
  context: TarotAgentContext,
  numCards: number,
  spreadId?: string
): Promise<TarotAgentAction> {
  console.log('Drawing cards:', { numCards, spreadId, sessionId: context.sessionId });
  
  try {
    let spread;
    if (spreadId) {
      console.log('Fetching spread:', spreadId);
      spread = await getSpreadById(spreadId);
      console.log('Spread found:', spread ? 'yes' : 'no');
    }

    const requiredCards = spread?.positions.length ?? numCards;
    console.log('Required cards:', requiredCards);

    // Get all cards from the database
    console.log('Querying database for cards');
    const allCards = await db.select().from(tarotCard);
    console.log('Cards found in database:', allCards.length);

    if (!allCards.length) {
      const error = new Error('No cards available in the database');
      console.error('Database error:', error);
      throw error;
    }

    // Randomly select cards
    console.log('Selecting random cards');
    const selectedCards = [];
    const usedIndices = new Set();
    
    while (selectedCards.length < requiredCards) {
      const index = Math.floor(Math.random() * allCards.length);
      if (!usedIndices.has(index)) {
        usedIndices.add(index);
        selectedCards.push({
          ...allCards[index],
          isReversed: Math.random() > 0.5
        });
      }
    }

    console.log('Selected cards:', selectedCards.map(c => c.name).join(', '));

    return {
      type: 'DRAW_CARDS',
      payload: { cards: selectedCards, spread }
    };
  } catch (error) {
    console.error('Error in drawCards:', {
      error,
      context: {
        sessionId: context.sessionId,
        numCards,
        spreadId
      }
    });

    return {
      type: 'SET_ERROR',
      payload: {
        code: 'DRAW_CARDS_ERROR',
        message: 'Failed to draw cards',
        details: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
          ...error
        } : error
      } as TarotAgentError
    };
  }
}

export async function analyzeSpread(
  context: TarotAgentContext
): Promise<TarotAgentAction> {
  try {
    const { cards, spread } = context.state;
    if (!cards.length) {
      throw new Error('No cards drawn');
    }

    const analysisPrompt = [
      generateAnalysisPrompt(cards, spread),
      CARD_REVERSAL_PROMPT,
      spread ? SPREAD_POSITION_PROMPT : '',
      THEME_INTEGRATION_PROMPT,
      TRANSFERENCE_PROMPT,
      RESISTANCE_PROMPT,
      UNCONSCIOUS_PROMPT,
      SYMBOLIC_CHAINS_PROMPT
    ].filter(Boolean).join('\n\n');

    const analysis = await customModel.analyze({
      cards,
      spread
    });

    return {
      type: 'ANALYZE_SPREAD',
      payload: { analysis }
    };
  } catch (error) {
    return {
      type: 'SET_ERROR',
      payload: {
        code: 'ANALYZE_SPREAD_ERROR',
        message: 'Failed to analyze spread',
        details: error
      } as TarotAgentError
    };
  }
}

export async function interpretCards(
  context: TarotAgentContext
): Promise<TarotAgentAction> {
  try {
    const { cards, spread, metadata } = context.state;
    const analysis = metadata.analysis;

    if (!cards.length || !analysis) {
      throw new Error('Missing cards or analysis');
    }

    const messages = [
      {
        role: 'system' as const,
        content: generateAnalysisPrompt(cards, spread)
      },
      {
        role: 'user' as const,
        content: metadata.userQuery
      },
      {
        role: 'assistant' as const,
        content: analysis
      }
    ];

    const interpretation = await customModel.complete({
      messages,
      model: context.config.modelId || 'gpt-4o'
    });

    return {
      type: 'INTERPRET_CARDS',
      payload: { interpretation }
    };
  } catch (error) {
    return {
      type: 'SET_ERROR',
      payload: {
        code: 'INTERPRET_CARDS_ERROR',
        message: 'Failed to interpret cards',
        details: error
      } as TarotAgentError
    };
  }
}

export async function generateResponse(
  context: TarotAgentContext
): Promise<TarotAgentAction> {
  try {
    const { cards, spread, interpretation, metadata } = context.state;
    if (!interpretation) {
      throw new Error('Missing interpretation');
    }

    const messages = [
      {
        role: 'system' as const,
        content: generateResponsePrompt(cards, spread, metadata.analysis, interpretation)
      },
      {
        role: 'user' as const,
        content: metadata.userQuery
      },
      {
        role: 'assistant' as const,
        content: interpretation
      }
    ];

    const response = await customModel.complete({
      messages,
      model: context.config.modelId || 'gpt-4o'
    });

    return {
      type: 'GENERATE_RESPONSE',
      payload: { response }
    };
  } catch (error) {
    return {
      type: 'SET_ERROR',
      payload: {
        code: 'GENERATE_RESPONSE_ERROR',
        message: 'Failed to generate response',
        details: error
      } as TarotAgentError
    };
  }
} 