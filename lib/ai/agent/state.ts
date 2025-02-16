import { type TarotAgentState, type TarotAgentAction, type TarotAgentError } from './types';

const initialState: TarotAgentState = {
  sessionId: '',
  userId: '',
  isAnonymous: false,
  currentStep: 'INITIALIZING',
  cards: [],
  metadata: {},
};

export function reducer(state: TarotAgentState, action: TarotAgentAction): TarotAgentState {
  switch (action.type) {
    case 'DRAW_CARDS':
      return {
        ...state,
        currentStep: 'DRAWING_CARDS',
        cards: action.payload.cards,
        spread: action.payload.spread,
      };

    case 'ANALYZE_SPREAD':
      return {
        ...state,
        currentStep: 'ANALYZING_SPREAD',
        metadata: {
          ...state.metadata,
          analysis: action.payload.analysis,
        },
      };

    case 'INTERPRET_CARDS':
      return {
        ...state,
        currentStep: 'INTERPRETING',
        interpretation: action.payload.interpretation,
      };

    case 'GENERATE_RESPONSE':
      return {
        ...state,
        currentStep: 'RESPONDING',
        metadata: {
          ...state.metadata,
          response: action.payload.response,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        currentStep: 'ERROR',
        error: action.payload as TarotAgentError,
      };

    case 'RESET':
      return {
        ...initialState,
        sessionId: state.sessionId,
        userId: state.userId,
        isAnonymous: state.isAnonymous,
      };

    default:
      return state;
  }
}

export function createInitialState(
  sessionId: string,
  userId: string,
  isAnonymous: boolean = false
): TarotAgentState {
  return {
    ...initialState,
    sessionId,
    userId,
    isAnonymous,
  };
}

export function isTerminalState(state: TarotAgentState): boolean {
  return state.currentStep === 'COMPLETED' || state.currentStep === 'ERROR';
}

export function canTransition(
  from: TarotAgentState['currentStep'],
  to: TarotAgentState['currentStep']
): boolean {
  const validTransitions: Record<TarotAgentState['currentStep'], TarotAgentState['currentStep'][]> = {
    INITIALIZING: ['DRAWING_CARDS', 'ERROR'],
    DRAWING_CARDS: ['ANALYZING_SPREAD', 'ERROR'],
    ANALYZING_SPREAD: ['INTERPRETING', 'ERROR'],
    INTERPRETING: ['RESPONDING', 'ERROR'],
    RESPONDING: ['COMPLETED', 'ERROR'],
    COMPLETED: ['INITIALIZING'],
    ERROR: ['INITIALIZING'],
  };

  return validTransitions[from]?.includes(to) ?? false;
} 