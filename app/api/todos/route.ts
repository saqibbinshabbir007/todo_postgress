import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { todos, todoStatusEnum } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const result = status && status !== 'all'
      ? await db.select().from(todos)
          .where(eq(todos.status, status as typeof todoStatusEnum.enumValues[number]))
          .orderBy(desc(todos.created_at))
      : await db.select().from(todos)
          .orderBy(desc(todos.created_at));

    return NextResponse.json({ data: result, count: result.length });
  } catch (error) {
    console.error('GET /api/todos error:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, priority = 'medium', due_date } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await db.insert(todos).values({
      title:       title.trim(),
      description: description || null,
      priority,
      due_date:    due_date || null,
    }).returning();

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/todos error:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
