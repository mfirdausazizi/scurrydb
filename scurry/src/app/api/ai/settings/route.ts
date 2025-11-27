import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getAISettings, saveAISettings } from '@/lib/db/app-db';
import { aiSettingsSchema } from '@/lib/validations/ai';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = getAISettings(user.id);
    
    if (!settings) {
      return NextResponse.json({
        provider: 'openai',
        model: null,
        temperature: 0.7,
        maxTokens: 2048,
        baseUrl: null,
        hasApiKey: false,
      });
    }

    // Don't send the actual API key, just whether one exists
    return NextResponse.json({
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      baseUrl: settings.baseUrl,
      hasApiKey: !!settings.apiKey,
    });
  } catch (error) {
    console.error('Failed to get AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to get AI settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = aiSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { provider, apiKey, model, temperature, maxTokens, baseUrl } = validationResult.data;

    const settings = saveAISettings(user.id, {
      provider,
      apiKey: apiKey || null,
      model: model || null,
      temperature,
      maxTokens,
      baseUrl: baseUrl || null,
    });

    return NextResponse.json({
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      baseUrl: settings.baseUrl,
      hasApiKey: !!settings.apiKey,
    });
  } catch (error) {
    console.error('Failed to save AI settings:', error);
    return NextResponse.json(
      { error: 'Failed to save AI settings' },
      { status: 500 }
    );
  }
}
