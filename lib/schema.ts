import { pgTable, serial, varchar, text, pgEnum, date, timestamp } from 'drizzle-orm/pg-core';

export const todoStatusEnum = pgEnum('todo_status', ['pending', 'in_progress', 'completed']);
export const todoPriorityEnum = pgEnum('todo_priority', ['low', 'medium', 'high']);

export const todos = pgTable('todos', {
  id:          serial('id').primaryKey(),
  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status:      todoStatusEnum('status').notNull().default('pending'),
  priority:    todoPriorityEnum('priority').notNull().default('medium'),
  due_date:    date('due_date'),
  created_at:  timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at:  timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
