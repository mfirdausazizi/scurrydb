import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { type AISettings, type AIProvider } from '@/lib/db/app-db';

export function getAIModel(settings: AISettings) {
  const { provider, apiKey, model, baseUrl } = settings;

  if (!model) {
    throw new Error('No model configured. Please select a model in AI Settings.');
  }

  switch (provider) {
    case 'openai': {
      if (!apiKey) {
        throw new Error('OpenAI API key is required. Please configure it in AI Settings.');
      }
      const openai = createOpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
      });
      return openai(model);
    }

    case 'anthropic': {
      if (!apiKey) {
        throw new Error('Anthropic API key is required. Please configure it in AI Settings.');
      }
      const anthropic = createAnthropic({
        apiKey,
        baseURL: baseUrl || undefined,
      });
      return anthropic(model);
    }

    case 'ollama': {
      const ollamaBaseUrl = baseUrl || 'http://localhost:11434';
      const openai = createOpenAI({
        apiKey: 'ollama', // Ollama doesn't need a real API key
        baseURL: `${ollamaBaseUrl}/v1`,
      });
      return openai(model);
    }

    case 'custom': {
      if (!baseUrl) {
        throw new Error('Base URL is required for custom provider.');
      }
      const custom = createOpenAI({
        apiKey: apiKey || 'custom',
        baseURL: baseUrl,
      });
      return custom(model);
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function getSystemPromptForSQL(schema: string, dbType: string) {
  return `You are an expert SQL assistant for ${dbType} databases. You help users write SQL queries based on their natural language requests.

DATABASE SCHEMA:
${schema}

INSTRUCTIONS:
1. Generate valid ${dbType} SQL queries based on user requests
2. Always use the exact table and column names from the schema
3. Provide clear, efficient queries
4. If the request is ambiguous, ask for clarification
5. Explain what the query does briefly
6. Format SQL queries in code blocks with \`\`\`sql

IMPORTANT:
- Only generate SELECT queries unless explicitly asked for INSERT/UPDATE/DELETE
- Be careful with destructive operations
- Consider performance for large tables`;
}

export function getSystemPromptForAnalysis(schema: string, dbType: string) {
  return `You are a database analyst expert. Analyze the provided ${dbType} database schema and provide insights.

DATABASE SCHEMA:
${schema}

You can help with:
1. Schema analysis and design recommendations
2. Index optimization suggestions
3. Query performance tips
4. Data modeling improvements
5. Relationship analysis

Provide actionable, specific recommendations based on the actual schema.`;
}
