// all supported models — used across the app

export const MODELS = [
  { id: 'gpt-4',                   provider: 'openai',    label: 'GPT-4',             abbr: 'GPT', color: '#10a37f', logo: '/logos/openai.svg'    },
  { id: 'gpt-3.5-turbo',           provider: 'openai',    label: 'GPT-3.5 Turbo',     abbr: 'GPT', color: '#10a37f', logo: '/logos/openai.svg'    },
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', label: 'Claude Haiku 4.5',  abbr: 'CLO', color: '#cc5d3a', logo: '/logos/anthropic.svg' },
  { id: 'claude-sonnet-4-6',       provider: 'anthropic', label: 'Claude Sonnet 4.6', abbr: 'CLO', color: '#cc5d3a', logo: '/logos/anthropic.svg' },
  { id: 'grok-4-1-fast-reasoning', provider: 'grok',      label: 'Grok 4.1 Fast',     abbr: 'GRK', color: '#1a1a1a', logo: '/logos/xai.svg'       },
  { id: 'grok-4.20-0309-reasoning',provider: 'grok',      label: 'Grok 4.20',         abbr: 'GRK', color: '#1a1a1a', logo: '/logos/xai.svg'       },
];

export const DEFAULT_MODEL = MODELS[0]; // GPT-4

export const findModel = (modelId) =>
  MODELS.find(m => m.id === modelId) ?? DEFAULT_MODEL;
