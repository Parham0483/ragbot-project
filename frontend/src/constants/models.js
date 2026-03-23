// all supported models — used across the app

export const MODELS = [
  { id: 'gpt-4o',           provider: 'openai', label: 'GPT-4o',            abbr: 'GPT', color: '#10a37f' },
  { id: 'gpt-4',            provider: 'openai', label: 'GPT-4',             abbr: 'GPT', color: '#10a37f' },
  { id: 'gpt-3.5-turbo',    provider: 'openai', label: 'GPT-3.5 Turbo',    abbr: 'GPT', color: '#10a37f' },
  { id: 'gemini-1.5-pro-002', provider: 'gemini', label: 'Gemini 1.5 Pro',   abbr: 'GEM', color: '#4285f4' },
  { id: 'gemini-2.0-flash',  provider: 'gemini', label: 'Gemini 2.0 Flash', abbr: 'GEM', color: '#4285f4' },
  { id: 'grok-2',            provider: 'grok',   label: 'Grok 2',           abbr: 'GRK', color: '#e5e5e5' },
  { id: 'grok-beta',         provider: 'grok',   label: 'Grok Beta',        abbr: 'GRK', color: '#e5e5e5' },
];

export const DEFAULT_MODEL = MODELS[0]; // GPT-4o

export const findModel = (modelId) =>
  MODELS.find(m => m.id === modelId) ?? DEFAULT_MODEL;
