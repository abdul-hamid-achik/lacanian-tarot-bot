import { z } from 'zod';
import { registry, SecuritySchemes, ErrorResponse, SuccessResponse } from '../registry';

const TarotCardSchema = registry.register('TarotCard', z.object({
  id: z.string().describe('Card identifier'),
  name: z.string().describe('Card name'),
  description: z.string().describe('Card description'),
  upright: z.string().describe('Upright meaning'),
  reversed: z.string().describe('Reversed meaning'),
  suit: z.string().describe('Card suit'),
  number: z.number().describe('Card number'),
  arcana: z.enum(['major', 'minor']).describe('Card arcana type'),
  element: z.string().optional().describe('Associated element'),
  astrology: z.string().optional().describe('Astrological correspondence'),
  isReversed: z.boolean().optional().describe('Whether the card is reversed in a reading'),
}));

const DrawnCardSchema = registry.register('DrawnCard', TarotCardSchema.extend({
  isReversed: z.boolean().describe('Whether the card is reversed in the reading'),
}));

registry.registerPath({
  method: 'get',
  path: '/api/cards',
  description: 'Get a tarot card by ID or get related cards',
  tags: ['Cards'],
  parameters: [
    {
      name: 'id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Card identifier to fetch a specific card',
    },
    {
      name: 'themeId',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'uuid',
      },
      description: 'Theme identifier to fetch cards by theme',
    },
  ],
  responses: {
    200: {
      description: 'Tarot card or list of related cards',
      content: {
        'application/json': {
          schema: z.union([
            TarotCardSchema,
            z.array(TarotCardSchema),
          ]),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    404: {
      description: 'Card not found',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
}); 