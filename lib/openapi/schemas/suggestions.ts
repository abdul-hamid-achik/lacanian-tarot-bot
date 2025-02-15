import { z } from 'zod';
import { registry, SecuritySchemes, ErrorResponse, SuccessResponse } from '../registry';

const SuggestionSchema = registry.register('Suggestion', z.object({
  id: z.string().describe('Suggestion identifier'),
  documentId: z.string().describe('Document identifier'),
  userId: z.string().describe('User identifier'),
  content: z.string().describe('Suggestion content'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
}));

registry.registerPath({
  method: 'get',
  path: '/api/suggestions',
  description: 'Get all suggestions for a document',
  tags: ['Suggestions'],
  security: [{ [SecuritySchemes.BearerAuth]: [] }],
  parameters: [
    {
      name: 'documentId',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
        format: 'uuid',
      },
    },
  ],
  responses: {
    200: {
      description: 'List of suggestions',
      content: {
        'application/json': {
          schema: z.array(SuggestionSchema),
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
}); 