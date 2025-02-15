'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="prose max-w-none mb-8 dark:prose-invert">
        <h1 className="text-4xl font-bold mb-4">Lacanian Tarot API Documentation</h1>
        <div className="text-lg mb-8 space-y-4">
          <p>
            Welcome to the mystical realm of the Lacanian Tarot API. This documentation 
            provides a comprehensive guide to our endpoints, enabling you to integrate 
            the psychoanalytic wisdom of tarot into your applications.
          </p>
          <p>
            Our API supports both authenticated users and anonymous sessions, offering 
            endpoints for:
          </p>
          <ul className="list-disc list-inside">
            <li>Tarot card readings and interpretations</li>
            <li>Chat interactions with psychoanalytic insights</li>
            <li>User voting and feedback mechanisms</li>
            <li>Reading analytics and theme tracking</li>
            <li>Document suggestions and improvements</li>
          </ul>
          <p>
            Authentication is handled through JWT tokens for registered users, while 
            anonymous sessions are managed via secure cookies.
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <SwaggerUI
          url="/api/openapi.json"
          docExpansion="list"
          defaultModelsExpandDepth={3}
          persistAuthorization={true}
          tryItOutEnabled={true}
        />
      </div>
    </div>
  );
} 