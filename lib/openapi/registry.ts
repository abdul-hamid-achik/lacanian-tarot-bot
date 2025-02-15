import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const SecuritySchemes = {
  BearerAuth: 'BearerAuth',
  AnonymousSession: 'AnonymousSession',
} as const;

registry.registerComponent('securitySchemes', SecuritySchemes.BearerAuth, {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token for authenticated users',
});

registry.registerComponent('securitySchemes', SecuritySchemes.AnonymousSession, {
  type: 'apiKey',
  in: 'cookie',
  name: 'anonymous_session',
  description: 'Session cookie for anonymous users',
});

export const ErrorResponse = registry.register('ErrorResponse', z.object({
  error: z.string().describe('A mystical error message'),
  code: z.number().describe('HTTP status code'),
  details: z.any().optional().describe('Additional error details'),
}));

export const SuccessResponse = registry.register('SuccessResponse', z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  data: z.any().optional().describe('Response data'),
}));

export const PaginationParams = registry.register('PaginationParams', z.object({
  page: z.number().min(1).default(1).describe('Page number'),
  limit: z.number().min(1).max(100).default(10).describe('Items per page'),
}));

export const DateRangeParams = registry.register('DateRangeParams', z.object({
  startDate: z.string().datetime().optional().describe('Start date (ISO 8601)'),
  endDate: z.string().datetime().optional().describe('End date (ISO 8601)'),
})); 