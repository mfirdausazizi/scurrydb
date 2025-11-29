import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  clearConversation,
  clearAllUserConversations,
  getOrCreateConversation,
  getConversationMessages,
} from '@/lib/db/app-db';
import { z } from 'zod';

const clearConversationSchema = z.object({
  connectionId: z.string().optional().nullable(),
  clearAll: z.boolean().optional(),
});

// GET - Get conversation messages for a connection
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    const conversation = await getOrCreateConversation(user.id, connectionId);
    const messages = await getConversationMessages(conversation.id);

    return NextResponse.json({
      conversationId: conversation.id,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

// DELETE - Clear conversation memory
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = clearConversationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, clearAll } = validationResult.data;

    if (clearAll) {
      // Clear all conversations for this user
      const count = await clearAllUserConversations(user.id);
      return NextResponse.json({
        success: true,
        message: `Cleared ${count} conversation(s)`,
        clearedCount: count,
      });
    } else {
      // Clear specific conversation for user-connection pair
      const success = await clearConversation(user.id, connectionId || null);
      return NextResponse.json({
        success,
        message: success ? 'Conversation cleared' : 'No conversation found to clear',
      });
    }
  } catch (error) {
    console.error('Clear conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear conversation' },
      { status: 500 }
    );
  }
}
