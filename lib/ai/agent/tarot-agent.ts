import { type TarotAgentContext, type TarotAgentConfig, type Message } from './types';
import { createInitialState, reducer, isTerminalState } from './state';
import { drawCards, analyzeSpread, interpretCards, generateResponse } from './actions';
import { createDataStreamResponse, type DataStreamWriter } from 'ai';
import { BASE_LACANIAN_PROMPT } from '../prompts/lacanian';
import { streamText } from '@/lib/ai/stream';
import { RedisStateManager } from './redis-state';
import { createRedisClient } from './redis-client';
import { db } from '@/lib/db/client';
import { tarotCard, spread } from '@/lib/db/schema';

export class TarotAgent {
  private context: TarotAgentContext;
  private stateManager?: RedisStateManager;
  private initializationPromise?: Promise<void>;

  constructor(
    sessionId: string,
    userId: string,
    isAnonymous: boolean = false,
    config: TarotAgentConfig = {}
  ) {
    this.context = {
      sessionId,
      userId,
      isAnonymous,
      config,
      state: createInitialState(sessionId, userId, isAnonymous)
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.stateManager) {
      if (!this.initializationPromise) {
        this.initializationPromise = this.initialize();
      }
      await this.initializationPromise;
    }
  }

  private async initialize(): Promise<void> {
    const redis = await createRedisClient();
    this.stateManager = new RedisStateManager(redis);
    await this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    if (!this.stateManager) return;

    // Cache all cards if not already cached
    const cachedCards = await this.stateManager.getAllCachedCards();
    if (!cachedCards.length) {
      const cards = await db.select().from(tarotCard);
      await this.stateManager.cacheAllCards(cards);
    }

    // Cache all spreads if not already cached
    const cachedSpreads = await this.stateManager.getAllCachedSpreads();
    if (!cachedSpreads.length) {
      const spreads = await db.select().from(spread);
      await this.stateManager.cacheAllSpreads(spreads);
    }
  }

  private async loadState(): Promise<void> {
    await this.ensureInitialized();
    const savedState = await this.stateManager?.getState(this.context.sessionId);
    if (savedState) {
      this.context.state = savedState;
    }
  }

  private async saveState(): Promise<void> {
    await this.ensureInitialized();
    await this.stateManager?.setState(this.context.sessionId, this.context.state);
  }

  private async executeStep(): Promise<void> {
    const { state } = this.context;

    if (isTerminalState(state)) {
      return;
    }

    try {
      let action;
      switch (state.currentStep) {
        case 'INITIALIZING': {
          // Try to get cards from cache first
          const cards = await this.stateManager?.getAllCachedCards() || [];
          if (cards.length) {
            action = {
              type: 'DRAW_CARDS' as const,
              payload: {
                cards: cards.slice(0, this.context.config.maxCards || 3).map(card => ({
                  ...card,
                  isReversed: Math.random() > 0.5,
                  keywords: card.keywords || []
                }))
              }
            };
          } else {
            action = await drawCards(
              this.context,
              this.context.config.maxCards || 3
            );
          }
          break;
        }

        case 'DRAWING_CARDS': {
          // Get spread from cache if specified
          if (state.metadata.spreadId) {
            const spread = await this.stateManager?.getCachedSpread(state.metadata.spreadId);
            if (spread) {
              state.spread = spread;
            }
          }
          action = await analyzeSpread(this.context);
          break;
        }

        case 'ANALYZING_SPREAD':
          action = await interpretCards(this.context);
          break;

        case 'INTERPRETING':
          action = await generateResponse(this.context);
          break;

        case 'RESPONDING':
          // Save reading history
          if (state.cards.length && this.stateManager) {
            await this.stateManager.addRecentReading(this.context.userId, {
              cards: state.cards,
              spread: state.spread,
              timestamp: Date.now()
            });

            // Update user patterns
            const patterns = await this.stateManager.getUserPatterns(this.context.userId) || {
              commonCards: {},
              preferredSpreads: {},
              themes: {}
            };

            // Update card frequencies
            state.cards.forEach(card => {
              patterns.commonCards[card.id] = (patterns.commonCards[card.id] || 0) + 1;
            });

            // Update spread frequencies
            if (state.spread) {
              patterns.preferredSpreads[state.spread.id] = 
                (patterns.preferredSpreads[state.spread.id] || 0) + 1;
            }

            await this.stateManager.updateUserPatterns(this.context.userId, patterns);
          }

          this.context.state = reducer(state, {
            type: 'RESET'
          });
          return;

        default:
          throw new Error(`Invalid step: ${state.currentStep}`);
      }

      if (action.type === 'SET_ERROR') {
        throw action.payload;
      }

      this.context.state = reducer(state, action);
      await this.saveState();
    } catch (error) {
      this.context.state = reducer(state, {
        type: 'SET_ERROR',
        payload: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute step',
          details: error
        }
      });
      await this.saveState();
    }
  }

  public async processReading(
    userQuery: string,
    spreadId?: string
  ): Promise<Response> {
    await this.loadState();
    this.context.state.metadata.userQuery = userQuery;
    if (spreadId) {
      this.context.state.metadata.spreadId = spreadId;
    }
    
    return createDataStreamResponse({
      execute: async (writer: DataStreamWriter) => {
        while (!isTerminalState(this.context.state)) {
          const currentStep = this.context.state.currentStep;
          await this.executeStep();

          if (this.context.state.error) {
            await writer.write(`2:${JSON.stringify({
              type: 'error',
              content: this.context.state.error,
              role: 'assistant'
            })}\n`);
            break;
          }

          // Stream step results
          switch (currentStep) {
            case 'DRAWING_CARDS':
              await writer.write(`2:${JSON.stringify({
                type: 'cards',
                content: {
                  cards: this.context.state.cards,
                  spread: this.context.state.spread
                },
                role: 'assistant'
              })}\n`);
              break;

            case 'ANALYZING_SPREAD':
              await writer.write(`2:${JSON.stringify({
                type: 'analysis',
                content: this.context.state.metadata.analysis,
                role: 'assistant'
              })}\n`);
              break;

            case 'INTERPRETING':
              await writer.write(`2:${JSON.stringify({
                type: 'interpretation',
                content: this.context.state.interpretation,
                role: 'assistant'
              })}\n`);
              break;

            case 'RESPONDING':
              await writer.write(`2:${JSON.stringify({
                type: 'response',
                content: this.context.state.metadata.response,
                role: 'assistant'
              })}\n`);
              break;
          }
        }

        await writer.write('0:done\n');
      }
    });
  }

  public async processChat(messages: Message[]): Promise<Response> {
    await this.loadState();
    
    return createDataStreamResponse({
      execute: async (writer: DataStreamWriter) => {
        const systemMessage = {
          role: 'system' as const,
          content: BASE_LACANIAN_PROMPT
        };

        const aiMessages = [
          systemMessage,
          ...messages
        ];

        const stream = await streamText({
          model: this.context.config.modelId || 'gpt-4o',
          messages: aiMessages
        });
        
        if (stream instanceof Response) {
          const reader = stream.body?.getReader();
          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(`2:${JSON.stringify({ 
                  content: new TextDecoder().decode(value),
                  role: 'assistant'
                })}\n`);
              }
            } finally {
              reader.releaseLock();
            }
          }
        }
        
        await writer.write('0:done\n');
      }
    });
  }

  public getState() {
    return this.context.state;
  }

  public async reset() {
    await this.loadState();
    this.context.state = reducer(this.context.state, { type: 'RESET' });
    await this.saveState();
  }
} 