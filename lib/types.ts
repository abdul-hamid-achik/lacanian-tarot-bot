export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
} 