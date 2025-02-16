import type { CardReading, Spread } from '@/lib/db/schema';

export interface TarotCard {
  id: string;
  name: string;
  suit?: string;
  number?: number;
  arcana: 'major' | 'minor';
  description: string;
  keywords: string[];
  isReversed?: boolean;
}

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
};

export type TarotAgentStep = 
  | 'INITIALIZING'
  | 'DRAWING_CARDS'
  | 'ANALYZING_SPREAD'
  | 'INTERPRETING'
  | 'RESPONDING'
  | 'COMPLETED'
  | 'ERROR';

export type TarotAgentActionType = 
  | 'DRAW_CARDS'
  | 'ANALYZE_SPREAD'
  | 'INTERPRET_CARDS'
  | 'GENERATE_RESPONSE'
  | 'SET_ERROR'
  | 'RESET';

export interface TarotAgentState {
  sessionId: string;
  userId: string;
  isAnonymous: boolean;
  currentStep: TarotAgentStep;
  cards: TarotCardWithReversed[];
  spread?: Spread;
  interpretation?: string;
  error?: TarotAgentError;
  metadata: {
    userQuery?: string;
    spreadId?: string;
    analysis?: string;
    interpretation?: string;
    response?: string;
    [key: string]: any;
  };
}

export interface TarotAgentError {
  code: string;
  message: string;
  details?: unknown;
}

export interface TarotAgentConfig {
  modelId?: string;
  maxCards?: number;
  streamResponses?: boolean;
  persistState?: boolean;
  debug?: boolean;
}

export interface TarotAgentContext {
  sessionId: string;
  userId: string;
  isAnonymous: boolean;
  config: TarotAgentConfig;
  state: TarotAgentState;
}

export type TarotAgentAction = 
  | { type: 'DRAW_CARDS'; payload: { cards: TarotCard[]; spread?: Spread } }
  | { type: 'ANALYZE_SPREAD'; payload: { analysis: string } }
  | { type: 'INTERPRET_CARDS'; payload: { interpretation: string } }
  | { type: 'GENERATE_RESPONSE'; payload: { response: string } }
  | { type: 'SET_ERROR'; payload: TarotAgentError }
  | { type: 'RESET' };

export type TarotCardWithReversed = TarotCard & {
  isReversed: boolean;
};

export type CardReadingWithReversed = CardReading & {
  isReversed: boolean;
};
