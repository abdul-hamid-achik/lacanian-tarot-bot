import { z } from 'zod';
import { registry, SecuritySchemes, ErrorResponse, SuccessResponse } from '../registry';

const ChatMessageSchema = registry.register('ChatMessage', z.object({
  role: z.enum(['user', 'assistant', 'system']).describe('Role of the message sender'),
  content: z.string().describe('Content of the message'),
  name: z.string().optional().describe('Name of the message sender'),
}));

const SpreadPositionSchema = registry.register('SpreadPosition', z.object({
  name: z.string().describe('Name of the position'),
  description: z.string().describe('Description of the position'),
  themeMultiplier: z.number().describe('Theme multiplier for this position'),
  position: z.number().describe('Position index'),
}));

const SpreadSchema = registry.register('Spread', z.object({
  positions: z.array(SpreadPositionSchema).describe('Positions in the spread'),
}));

const ChatRequestSchema = registry.register('ChatRequest', z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).describe('Array of chat messages'),
  chatId: z.string().describe('Unique identifier for the chat'),
  userId: z.string().optional().describe('User identifier'),
  spread: SpreadSchema.optional().describe('Tarot spread configuration'),
}));

const ChatResponseSchema = registry.register('ChatResponse', z.object({
  id: z.string().describe('Chat identifier'),
  title: z.string().describe('Chat title'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
  userId: z.string().optional().describe('User identifier'),
  anonymousUserId: z.string().optional().describe('Anonymous user identifier'),
  isPublic: z.boolean().describe('Whether the chat is public'),
}));

const ChatVoteRequestSchema = registry.register('ChatVoteRequest', z.object({
  chatId: z.string().describe('Chat identifier'),
  messageId: z.string().describe('Message identifier'),
  type: z.enum(['upvote', 'downvote']).describe('Vote type'),
}));

registry.registerPath({
  method: 'get',
  path: '/api/chat',
  description: 'Get all chats for the authenticated user',
  tags: ['Chat'],
  security: [{ [SecuritySchemes.BearerAuth]: [] }],
  responses: {
    200: {
      description: 'List of chats',
      content: {
        'application/json': {
          schema: z.array(ChatResponseSchema),
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
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chat',
  description: 'Create a new chat message',
  tags: ['Chat'],
  security: [
    { [SecuritySchemes.BearerAuth]: [] },
    { [SecuritySchemes.AnonymousSession]: [] },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChatRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Chat response stream',
      content: {
        'text/plain': {
          schema: z.string().openapi({
            type: 'string',
            format: 'text-stream',
          }),
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
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/chat',
  description: 'Vote on a chat message',
  tags: ['Chat'],
  security: [
    { [SecuritySchemes.BearerAuth]: [] },
    { [SecuritySchemes.AnonymousSession]: [] },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChatVoteRequestSchema,
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
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/chat',
  description: 'Delete a chat',
  tags: ['Chat'],
  security: [{ [SecuritySchemes.BearerAuth]: [] }],
  parameters: [
    {
      name: 'id',
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
      description: 'Chat deleted',
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
    404: {
      description: 'Not found',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
}); 