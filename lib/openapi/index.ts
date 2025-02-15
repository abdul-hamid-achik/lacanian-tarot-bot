import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

// Import all schema files to ensure they are registered
import './schemas/chat';
import './schemas/vote';
import './schemas/suggestions';
import './schemas/cards';
import './schemas/analytics';

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Lacanian Tarot API',
      version: '1.0.0',
      description: `
        API for the Lacanian Tarot application, providing endpoints for tarot readings, 
        chat interactions, and analytics through a psychoanalytic lens.
        
        The API supports both authenticated users and anonymous sessions, with endpoints 
        for card readings, chat management, voting, and analytics.

        ## Authentication
        - Bearer token for authenticated users
        - Cookie-based session for anonymous users

        ## Rate Limiting
        - 10 requests per 15 seconds for authenticated users
        - 5 requests per 15 seconds for anonymous users

        ## Endpoints
        - /api/chat - Chat and reading interactions
        - /api/cards - Tarot card information
        - /api/vote - Message voting system
        - /api/suggestions - Document suggestions
        - /api/analytics - Reading analytics
      `,
      contact: {
        name: 'Lacanian Tarot Support',
        url: 'https://github.com/yourusername/lacanian-tarot-bot/issues',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    tags: [
      { 
        name: 'Chat',
        description: 'Chat and reading interaction endpoints for tarot interpretations'
      },
      { 
        name: 'Cards',
        description: 'Tarot card information, drawing, and related card suggestions'
      },
      { 
        name: 'Vote',
        description: 'Message voting and feedback system for readings'
      },
      { 
        name: 'Suggestions',
        description: 'Document suggestions and improvements for collaborative interpretation'
      },
      { 
        name: 'Analytics',
        description: 'Reading analytics and theme tracking for personalization'
      },
    ],
    externalDocs: {
      description: 'Additional Documentation',
      url: 'https://github.com/yourusername/lacanian-tarot-bot/wiki',
    },
  });
} 