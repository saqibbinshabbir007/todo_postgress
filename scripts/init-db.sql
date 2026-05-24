-- Create database (run this separately if needed)
-- CREATE DATABASE todo_db;

-- Connect to todo_db then run below:

-- Drop existing types and table for clean setup
DROP TABLE IF EXISTS todos CASCADE;
DROP TYPE IF EXISTS todo_status CASCADE;
DROP TYPE IF EXISTS todo_priority CASCADE;

-- Enums
CREATE TYPE todo_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE todo_priority AS ENUM ('low', 'medium', 'high');

-- Main todos table
CREATE TABLE todos (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      todo_status  NOT NULL DEFAULT 'pending',
    priority    todo_priority NOT NULL DEFAULT 'medium',
    due_date    DATE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_updated_at_trigger
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_todos_status   ON todos(status);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_created  ON todos(created_at DESC);

-- Sample data
INSERT INTO todos (title, description, status, priority, due_date) VALUES
  ('Setup PostgreSQL database',  'Install and configure PostgreSQL for the project', 'completed', 'high',   CURRENT_DATE - 1),
  ('Build REST API',             'Create API routes with Next.js',                   'in_progress','high',  CURRENT_DATE + 1),
  ('Design Todo UI',             'Create professional UI with Tailwind CSS',         'in_progress','medium',CURRENT_DATE + 2),
  ('Write unit tests',           'Cover all API endpoints with tests',               'pending',    'medium', CURRENT_DATE + 5),
  ('Deploy to production',       'Deploy app to Vercel or Railway',                  'pending',    'low',   CURRENT_DATE + 10);
