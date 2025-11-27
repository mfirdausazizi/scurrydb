import { z } from 'zod';

export const aiProviders = ['openai', 'anthropic', 'ollama', 'custom'] as const;

export const aiSettingsSchema = z.object({
  provider: z.enum(aiProviders, { message: 'Provider is required' }),
  apiKey: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(100).max(128000),
  baseUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export type AISettingsFormData = z.infer<typeof aiSettingsSchema>;

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  connectionId: z.string().optional(),
  conversationId: z.string().optional(),
});

export type AIChatFormData = z.infer<typeof aiChatSchema>;

// Model options per provider (latest models as of Nov 2024)
export const modelOptions: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-4.1', value: 'gpt-4.1' },
    { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
    { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'o3', value: 'o3' },
    { label: 'o3 Mini', value: 'o3-mini' },
    { label: 'o1', value: 'o1' },
    { label: 'o1 Mini', value: 'o1-mini' },
  ],
  anthropic: [
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-20250219' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  ],
  ollama: [], // User enters model name manually
  custom: [], // User enters model name manually
};
