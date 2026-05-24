import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { todos } from '@/lib/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await db.select().from(todos).where(eq(todos.id, parseInt(id)));

    if (result.length === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }
    return NextResponse.json({ data: result[0] });
  } catch (error) {
    console.error('GET /api/todos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch todo' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.title       !== undefined) updateData.title       = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status      !== undefined) updateData.status      = body.status;
    if (body.priority    !== undefined) updateData.priority    = body.priority;
    if (body.due_date    !== undefined) updateData.due_date    = body.due_date || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const result = await db.update(todos)
      .set(updateData)
      .where(eq(todos.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }
    return NextResponse.json({ data: result[0] });
  } catch (error) {
    console.error('PUT /api/todos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await db.delete(todos)
      .where(eq(todos.id, parseInt(id)))
      .returning({ id: todos.id });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }
    return NextResponse.json({ data: result[0] });
  } catch (error) {
    console.error('DELETE /api/todos/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
