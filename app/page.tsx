'use client';

import { useEffect, useState } from 'react';
import { Todo, TodoStatus, TodoPriority, CreateTodoInput } from '@/types/todo';

const STATUS_LABELS: Record<TodoStatus, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
};

const STATUS_COLORS: Record<TodoStatus, string> = {
  pending:     'bg-yellow-100 text-yellow-800 border-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  completed:   'bg-green-100 text-green-800 border-green-300',
};

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-orange-100 text-orange-700',
  high:   'bg-red-100 text-red-700',
};

const NEXT_STATUS: Record<TodoStatus, TodoStatus> = {
  pending:     'in_progress',
  in_progress: 'completed',
  completed:   'pending',
};

const FILTER_TABS: { label: string; value: string }[] = [
  { label: 'All',         value: 'all' },
  { label: 'Pending',     value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed',   value: 'completed' },
];

export default function TodoPage() {
  const [todos, setTodos]           = useState<Todo[]>([]);
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState<CreateTodoInput>({
    title: '', description: '', priority: 'medium', due_date: '',
  });

  async function fetchTodos(status = filter) {
    setLoading(true);
    try {
      const url = status === 'all' ? '/api/todos' : `/api/todos?status=${status}`;
      const res  = await fetch(url);
      const json = await res.json();
      setTodos(json.data ?? []);
    } catch {
      setError('Failed to load todos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTodos(filter); }, [filter]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/todos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm({ title: '', description: '', priority: 'medium', due_date: '' });
      fetchTodos();
    } catch {
      setError('Failed to add todo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(todo: Todo) {
    const newStatus = NEXT_STATUS[todo.status];
    try {
      await fetch(`/api/todos/${todo.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      fetchTodos();
    } catch {
      setError('Failed to update status.');
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      fetchTodos();
    } catch {
      setError('Failed to delete todo.');
    }
  }

  const allTodos = todos;
  const counts = {
    all:         allTodos.length,
    pending:     allTodos.filter(t => t.status === 'pending').length,
    in_progress: allTodos.filter(t => t.status === 'in_progress').length,
    completed:   allTodos.filter(t => t.status === 'completed').length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Task Manager</h1>
          <p className="text-slate-400 mt-1 text-sm">Powered by Next.js + PostgreSQL</p>
        </div>

        {/* Add Todo Form */}
        <form onSubmit={handleAdd}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6 shadow-xl">
          <h2 className="text-white font-semibold mb-4 text-lg">Add New Task</h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Task title *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-lg px-4 py-2.5 border border-slate-600 focus:outline-none focus:border-indigo-500 transition"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-lg px-4 py-2.5 border border-slate-600 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
            <div className="flex gap-3">
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as TodoPriority })}
                className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2.5 border border-slate-600 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2.5 border border-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 transition"
            >
              {submitting ? 'Adding...' : '+ Add Task'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                filter === tab.value
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.value ? 'bg-indigo-500' : 'bg-slate-700'
              }`}>
                {counts[tab.value as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Todo List */}
        {loading ? (
          <div className="text-center text-slate-400 py-16">Loading...</div>
        ) : todos.length === 0 ? (
          <div className="text-center text-slate-500 py-16">
            <p className="text-5xl mb-3">📋</p>
            <p>No tasks found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todos.map(todo => (
              <div
                key={todo.id}
                className={`bg-slate-800 border rounded-xl p-4 shadow-lg transition-all ${
                  todo.status === 'completed' ? 'border-slate-700 opacity-75' : 'border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`font-semibold text-base ${
                        todo.status === 'completed' ? 'line-through text-slate-400' : 'text-white'
                      }`}>
                        {todo.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[todo.priority]}`}>
                        {todo.priority}
                      </span>
                    </div>
                    {todo.description && (
                      <p className="text-slate-400 text-sm mb-2 truncate">{todo.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[todo.status]}`}>
                        {STATUS_LABELS[todo.status]}
                      </span>
                      {todo.due_date && (
                        <span className="text-xs text-slate-400">
                          Due: {new Date(todo.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(todo.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleStatusChange(todo)}
                      title="Change status"
                      className="text-xs bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
                    >
                      {todo.status === 'completed' ? '↩ Reset' : '→ Next'}
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      title="Delete"
                      className="text-xs bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-8">
          {todos.length} task{todos.length !== 1 ? 's' : ''} • PostgreSQL 18
        </p>
      </div>
    </main>
  );
}
