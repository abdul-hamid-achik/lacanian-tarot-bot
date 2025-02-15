import { z } from 'zod';
import { registry, SecuritySchemes, ErrorResponse, SuccessResponse } from '../registry';

const VoteSchema = registry.register('Vote', z.object({
  id: z.string().describe('Vote identifier'),
  userId: z.string().optional().describe('User identifier'),
  anonymousUserId: z.string().optional().describe('Anonymous user identifier'),
  chatId: z.string().describe('Chat identifier'),
  messageId: z.string().describe('Message identifier'),
  isUpvoted: z.boolean().describe('Whether the vote is an upvote'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
}));

const VoteRequestSchema = registry.register('VoteRequest', z.object({
  chatId: z.string().describe('Chat identifier'),
  messageId: z.string().describe('Message identifier'),
  type: z.enum(['up', 'down']).describe('Vote type'),
}));

registry.registerPath({
  method: 'get',
  path: '/api/vote',
  description: 'Get all votes for a chat',
  tags: ['Vote'],
  parameters: [
    {
      name: 'chatId',
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
      description: 'List of votes',
      content: {
        'application/json': {
          schema: z.array(VoteSchema),
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
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/vote',
  description: 'Vote on a message',
  tags: ['Vote'],
  security: [
    { [SecuritySchemes.BearerAuth]: [] },
    { [SecuritySchemes.AnonymousSession]: [] },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: VoteRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Vote recorded',
      content: {
        'application/json': {
          schema: SuccessResponse,
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
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
}); 