import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:  './lib/schema.ts',
  out:     './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'todo_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl:      false,
  },
});
