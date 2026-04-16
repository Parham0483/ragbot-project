// all supported models — used across the app

export const MODELS = [
  { id: 'gpt-4',                        provider: 'openai',    label: 'GPT-4',              abbr: 'GPT', color: '#10a37f' },
  { id: 'gpt-3.5-turbo',                provider: 'openai',    label: 'GPT-3.5 Turbo',      abbr: 'GPT', color: '#10a37f' },
  { id: 'claude-3-5-haiku-20241022',    provider: 'anthropic', label: 'Claude Haiku 3.5',   abbr: 'CLO', color: '#cc5d3a' },
  { id: 'claude-3-7-sonnet-20250219',   provider: 'anthropic', label: 'Claude Sonnet 3.7',  abbr: 'CLO', color: '#cc5d3a' },
  { id: 'grok-4-1-fast-reasoning',      provider: 'grok',      label: 'Grok 4.1 Fast',      abbr: 'GRK', color: '#1a1a1a' },
  { id: 'grok-4.20-0309-reasoning',     provider: 'grok',      label: 'Grok 4.20 Reasoning',abbr: 'GRK', color: '#1a1a1a' },
];

export const DEFAULT_MODEL = MODELS[0]; // GPT-4

export const findModel = (modelId) =>
  MODELS.find(m => m.id === modelId) ?? DEFAULT_MODEL;
