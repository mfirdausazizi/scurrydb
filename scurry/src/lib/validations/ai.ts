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
  teamId: z.string().optional().nullable(), // Workspace context
});

export type AIChatFormData = z.infer<typeof aiChatSchema>;

// Model options per provider (latest models as of Nov 2025)
export const modelOptions: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-5.1', value: 'gpt-5.1' },
    { label: 'GPT-5', value: 'gpt-5' },
    { label: 'GPT-5 Mini', value: 'gpt-5-mini' },
    { label: 'GPT-5 Nano', value: 'gpt-5-nano' },
    { label: 'GPT-4.1', value: 'gpt-4.1' },
    { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
    { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  ],
  anthropic: [
    { label: 'Claude Opus 4.5', value: 'claude-opus-4-5-20251124' },
    { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
    { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
  ],
  ollama: [], // User enters model name manually
  custom: [], // User enters model name manually
};
