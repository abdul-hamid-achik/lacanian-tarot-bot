// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'gpt-4o-mini',
    label: 'Casual',
    apiIdentifier: 'gpt-4o-mini',
    description: 'Quick tarot insights and simple card interpretations',
  },
  {
    id: 'gpt-4o',
    label: 'Deep',
    apiIdentifier: 'gpt-4o',
    description: 'Deep tarot analysis with Lacanian psychological insights',
  },
] as const;

export const DEFAULT_MODEL_NAME: string = 'gpt-4o';
