import { z } from 'zod';
import { registry, SecuritySchemes, ErrorResponse, SuccessResponse, DateRangeParams } from '../registry';

const AnalyticsDataSchema = registry.register('AnalyticsData', z.object({
  totalChats: z.number().describe('Total number of chats'),
  totalMessages: z.number().describe('Total number of messages'),
  totalUsers: z.number().describe('Total number of users'),
  averageMessagesPerChat: z.number().describe('Average messages per chat'),
  popularThemes: z.array(z.object({
    id: z.string().describe('Theme identifier'),
    name: z.string().describe('Theme name'),
    count: z.number().describe('Number of occurrences'),
  })).describe('Most popular themes'),
  popularCards: z.array(z.object({
    id: z.string().describe('Card identifier'),
    name: z.string().describe('Card name'),
    count: z.number().describe('Number of times drawn'),
  })).describe('Most frequently drawn cards'),
  timeDistribution: z.array(z.object({
    hour: z.number().describe('Hour of day (0-23)'),
    count: z.number().describe('Number of readings'),
  })).describe('Reading time distribution'),
}));

registry.registerPath({
  method: 'get',
  path: '/api/analytics',
  description: 'Get analytics data for the Tarot readings',
  tags: ['Analytics'],
  security: [{ [SecuritySchemes.BearerAuth]: [] }],
  parameters: [
    {
      name: 'startDate',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'date-time',
      },
      description: 'Start date for analytics period',
    },
    {
      name: 'endDate',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        format: 'date-time',
      },
      description: 'End date for analytics period',
    },
  ],
  responses: {
    200: {
      description: 'Analytics data',
      content: {
        'application/json': {
          schema: AnalyticsDataSchema,
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
      description: 'Forbidden - User does not have analytics access',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
}); 