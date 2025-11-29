import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { aiSettingsSchema } from '@/lib/validations/ai';
import { getTeamAISettings, saveTeamAISettings, deleteTeamAISettings } from '@/lib/db/app-db';
import { getUserRoleInTeam, canManageTeam } from '@/lib/db/teams';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const role = await getUserRoleInTeam(teamId, user.id);
    if (!role) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const settings = await getTeamAISettings(teamId);
    if (!settings) {
      return NextResponse.json({ configured: false });
    }

    // Return settings without exposing the full API key
    return NextResponse.json({
      configured: true,
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      baseUrl: settings.baseUrl,
      hasApiKey: !!settings.apiKey,
    });
  } catch (error) {
    console.error('Failed to get team AI settings:', error);
    return NextResponse.json({ error: 'Failed to get team AI settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const role = await getUserRoleInTeam(teamId, user.id);
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Only admins and owners can manage AI settings' }, { status: 403 });
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

    // Validate that API key is provided for non-Ollama providers
    if (provider !== 'ollama' && !apiKey) {
      // Check if existing settings have an API key
      const existing = await getTeamAISettings(teamId);
      if (!existing?.apiKey) {
        return NextResponse.json(
          { error: 'API key is required for this provider' },
          { status: 400 }
        );
      }
    }

    await saveTeamAISettings(teamId, user.id, {
      provider,
      apiKey: apiKey || undefined,
      model: model || undefined,
      temperature,
      maxTokens,
      baseUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save team AI settings:', error);
    return NextResponse.json({ error: 'Failed to save team AI settings' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const role = await getUserRoleInTeam(teamId, user.id);
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Only admins and owners can manage AI settings' }, { status: 403 });
    }

    await deleteTeamAISettings(teamId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete team AI settings:', error);
    return NextResponse.json({ error: 'Failed to delete team AI settings' }, { status: 500 });
  }
}
