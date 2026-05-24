'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Todo, TodoStatus, TodoPriority, CreateTodoInput } from '@/types/todo';

const NEXT_STATUS: Record<TodoStatus, TodoStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
};

const PRIORITY_CONFIG: Record<TodoPriority, { color: string; bar: string; label: string; bg: string }> = {
  high:   { color: '#EF4444', bar: 'bg-red-500',     label: 'High',   bg: 'bg-red-50 text-red-600' },
  medium: { color: '#F59E0B', bar: 'bg-amber-400',   label: 'Medium', bg: 'bg-amber-50 text-amber-600' },
  low:    { color: '#10B981', bar: 'bg-emerald-400',  label: 'Low',    bg: 'bg-emerald-50 text-emerald-600' },
};

function isOverdue(due: string | null, status: TodoStatus) {
  if (!due || status === 'completed') return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CheckIcon({ status, onClick }: { status: TodoStatus; onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 w-5 h-5 mt-0.5 group">
      {status === 'completed' ? (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="#18181B" />
          <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : status === 'in_progress' ? (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#18181B" strokeWidth="1.5" />
          <path d="M10 1a9 9 0 0 1 0 18V1z" fill="#18181B" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="group-hover:opacity-50 transition-opacity">
          <circle cx="10" cy="10" r="9" stroke="#D4D4D8" strokeWidth="1.5" />
        </svg>
      )}
    </button>
  );
}

const FILTERS = [
  { value: 'all',         label: 'All' },
  { value: 'pending',     label: 'To Do' },
  { value: 'in_progress', label: 'Doing' },
  { value: 'completed',   label: 'Done' },
];

export default function Page() {
  const [todos, setTodos]           = useState<Todo[]>([]);
  const [allTodos, setAllTodos]     = useState<Todo[]>([]);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [darkMode, setDarkMode]     = useState(false);
  const [hoveredId, setHoveredId]   = useState<number | null>(null);
  const [toast, setToast]           = useState('');
  const [form, setForm]             = useState<CreateTodoInput>({ title: '', description: '', priority: 'medium', due_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const titleRef  = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  async function load(status = filter) {
    setLoading(true);
    try {
      const url = status === 'all' ? '/api/todos' : `/api/todos?status=${status}`;
      const res  = await fetch(url);
      const json = await res.json();
      setAllTodos(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);
  useEffect(() => { if (showForm) titleRef.current?.focus(); }, [showForm]);

  // Search filter
  useEffect(() => {
    if (!search.trim()) { setTodos(allTodos); return; }
    const q = search.toLowerCase();
    setTodos(allTodos.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    ));
  }, [search, allTodos]);

  // Keyboard shortcuts
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setShowForm(true); }
    if (e.key === 'Escape') { setShowForm(false); setSearch(''); }
    if (e.key === '/' ) { e.preventDefault(); searchRef.current?.focus(); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowForm(false);
      showToast('Task added!');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: NEXT_STATUS[todo.status] }),
    });
    const next = NEXT_STATUS[todo.status];
    showToast(next === 'completed' ? '✓ Marked complete!' : `Moved to ${next.replace('_', ' ')}`);
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    showToast('Task deleted');
    load();
  }

  const counts = {
    all:         allTodos.length,
    pending:     allTodos.filter(t => t.status === 'pending').length,
    in_progress: allTodos.filter(t => t.status === 'in_progress').length,
    completed:   allTodos.filter(t => t.status === 'completed').length,
  };
  const overdueCount = allTodos.filter(t => isOverdue(t.due_date, t.status)).length;
  const progress     = allTodos.length > 0 ? Math.round((counts.completed / allTodos.length) * 100) : 0;

  const dm = darkMode;
  const bg       = dm ? 'bg-[#111110]'   : 'bg-[#F7F6F3]';
  const card     = dm ? 'bg-[#1C1C1A]'   : 'bg-white';
  const border   = dm ? 'border-[#2C2C2A]' : 'border-[#E8E7E2]';
  const textPri  = dm ? 'text-[#FAFAF8]' : 'text-[#18181B]';
  const textSec  = dm ? 'text-[#A1A09E]' : 'text-[#71717A]';
  const textMut  = dm ? 'text-[#5C5C5A]' : 'text-[#A1A1AA]';
  const inputBg  = dm ? 'bg-[#252523]'   : 'bg-[#F7F6F3]';
  const hoverRow = dm ? 'hover:bg-[#212120]' : 'hover:bg-[#FAFAF8]';
  const divider  = dm ? 'border-[#252523]' : 'border-[#F4F3F0]';
  const tabActive = dm ? 'bg-[#2C2C2A] text-[#FAFAF8]' : 'bg-white text-[#18181B]';
  const tabInact  = dm ? 'text-[#5C5C5A]' : 'text-[#71717A]';
  const tabWrap   = dm ? 'bg-[#1C1C1A]'   : 'bg-[#EEECEA]';
  const btnPri    = dm ? 'bg-[#FAFAF8] text-[#18181B] hover:bg-[#E8E7E2]' : 'bg-[#18181B] text-white hover:bg-[#2D2D2F]';

  return (
    <div className={`min-h-screen ${bg} font-sans transition-colors duration-300`}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#18181B] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className={`border-b ${border} ${card} sticky top-0 z-10 transition-colors duration-300`}>
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={`w-6 h-6 rounded-md ${dm ? 'bg-[#FAFAF8]' : 'bg-[#18181B]'} flex items-center justify-center`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M2 7h6M2 10h8" stroke={dm ? '#18181B' : 'white'} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className={`font-semibold text-sm tracking-tight ${textPri}`}>Taskboard</span>
          </div>

          {/* Search */}
          <div className={`flex-1 max-w-xs flex items-center gap-2 ${inputBg} border ${border} rounded-lg px-3 py-1.5`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={textMut}>
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search tasks... ( / )"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`flex-1 text-xs bg-transparent outline-none ${textPri} placeholder-[#A1A1AA]`}
            />
            {search && (
              <button onClick={() => setSearch('')} className={`${textMut} hover:${textSec}`}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <div className={`w-16 h-1.5 ${dm ? 'bg-[#2C2C2A]' : 'bg-[#E8E7E2]'} rounded-full overflow-hidden`}>
                <div className={`h-full ${dm ? 'bg-[#FAFAF8]' : 'bg-[#18181B]'} rounded-full transition-all duration-700`} style={{ width: `${progress}%` }} />
              </div>
              <span className={`text-xs font-medium ${textSec}`}>{progress}%</span>
            </div>
            {/* Dark mode */}
            <button
              onClick={() => setDarkMode(!dm)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${border} ${textSec} hover:${textPri} transition-colors`}
            >
              {dm ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M10.5 2.5l-1 1M3.5 10.5l-1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M12 7.5A5.5 5.5 0 0 1 6.5 2a5.5 5.5 0 1 0 5.5 5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',       value: counts.all,         color: textPri },
            { label: 'To Do',       value: counts.pending,     color: 'text-amber-500' },
            { label: 'In Progress', value: counts.in_progress, color: 'text-blue-500' },
            { label: 'Done',        value: counts.completed,   color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className={`${card} border ${border} rounded-xl p-3 text-center transition-colors duration-300`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-xs mt-0.5 ${textMut}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Overdue warning */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#EF4444" strokeWidth="1.3"/>
              <path d="M7 4v3.5M7 9.5v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-xs font-medium text-red-600">
              {overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue
            </p>
          </div>
        )}

        {/* Title + Add */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${textPri}`}>My Tasks</h1>
            <p className={`text-xs mt-0.5 ${textMut}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors ${btnPri}`}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Task
            <span className={`ml-1 text-[10px] opacity-50 font-normal`}>N</span>
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className={`${card} border ${border} rounded-xl p-4 mb-4 shadow-sm transition-colors duration-300`}>
            <input
              ref={titleRef}
              type="text"
              placeholder="Task title..."
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className={`w-full text-sm font-medium placeholder-[#C4C4C7] bg-transparent outline-none mb-2 ${textPri}`}
              required
            />
            <textarea
              placeholder="Add a note (optional)..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={`w-full text-sm placeholder-[#C4C4C7] bg-transparent outline-none resize-none mb-3 leading-relaxed ${textSec}`}
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {(['low', 'medium', 'high'] as TodoPriority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                      form.priority === p
                        ? (dm ? 'border-[#FAFAF8] bg-[#FAFAF8] text-[#18181B]' : 'border-[#18181B] bg-[#18181B] text-white')
                        : `${border} ${textSec} hover:border-[#A1A1AA]`
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_CONFIG[p].color }} />
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className={`text-xs ${textSec} border ${border} rounded-full px-2.5 py-1 outline-none bg-transparent`}
                />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowForm(false)} className={`text-xs ${textMut} hover:${textSec} px-2 py-1`}>
                  Esc
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors ${btnPri}`}
                >
                  {submitting ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Keyboard hint */}
        <div className={`flex items-center gap-3 mb-3 text-[10px] ${textMut}`}>
          <span><kbd className={`px-1.5 py-0.5 rounded border ${border} font-mono`}>N</kbd> New</span>
          <span><kbd className={`px-1.5 py-0.5 rounded border ${border} font-mono`}>/</kbd> Search</span>
          <span><kbd className={`px-1.5 py-0.5 rounded border ${border} font-mono`}>Esc</kbd> Close</span>
        </div>

        {/* Filter tabs */}
        <div className={`flex items-center gap-1 mb-4 ${tabWrap} p-1 rounded-lg w-fit`}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                filter === f.value ? `${tabActive} shadow-sm` : `${tabInact} hover:opacity-80`
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-50">
                {counts[f.value as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Search result info */}
        {search && (
          <p className={`text-xs ${textMut} mb-3`}>
            {todos.length} result{todos.length !== 1 ? 's' : ''} for &quot;{search}&quot;
          </p>
        )}

        {/* Todo list */}
        <div className={`${card} border ${border} rounded-xl overflow-hidden shadow-sm transition-colors duration-300`}>
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className={`w-5 h-5 border-2 ${dm ? 'border-[#2C2C2A] border-t-[#FAFAF8]' : 'border-[#E8E7E2] border-t-[#18181B]'} rounded-full animate-spin`} />
            </div>
          ) : todos.length === 0 ? (
            <div className="py-16 text-center">
              <div className={`w-10 h-10 ${inputBg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="2" width="14" height="14" rx="2" stroke="#C4C4C7" strokeWidth="1.5"/>
                  <path d="M6 9h6M6 6h4M6 12h3" stroke="#C4C4C7" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className={`text-sm ${textMut}`}>{search ? 'No tasks found' : 'No tasks here'}</p>
            </div>
          ) : (
            <ul>
              {todos.map((todo, idx) => {
                const overdue = isOverdue(todo.due_date, todo.status);
                return (
                  <li
                    key={todo.id}
                    onMouseEnter={() => setHoveredId(todo.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${hoverRow} ${
                      idx !== 0 ? `border-t ${divider}` : ''
                    } ${overdue ? (dm ? 'bg-red-950/20' : 'bg-red-50/50') : ''}`}
                  >
                    {/* Priority bar */}
                    <div className={`w-0.5 h-5 rounded-full mt-0.5 shrink-0 ${PRIORITY_CONFIG[todo.priority].bar}`} />

                    {/* Status */}
                    <CheckIcon status={todo.status} onClick={() => handleStatus(todo)} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${
                        todo.status === 'completed'
                          ? `line-through ${textMut}`
                          : textPri
                      }`}>
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className={`text-xs mt-0.5 truncate ${textMut}`}>{todo.description}</p>
                      )}
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${PRIORITY_CONFIG[todo.priority].bg}`}>
                          {PRIORITY_CONFIG[todo.priority].label}
                        </span>
                        {todo.due_date && (
                          <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-medium' : textMut}`}>
                            {overdue && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <circle cx="5" cy="5" r="4.5" stroke="currentColor" strokeWidth="1"/>
                                <path d="M5 3v2.5M5 6.5v.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                              </svg>
                            )}
                            {overdue ? 'Overdue · ' : ''}{formatDate(todo.due_date)}
                          </span>
                        )}
                        <span className={`text-xs ${textMut} opacity-60`}>
                          {new Date(todo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Actions on hover */}
                    <div className={`flex items-center gap-1 transition-opacity shrink-0 ${
                      hoveredId === todo.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <button
                        onClick={() => handleDelete(todo.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md border ${border} ${textMut} hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 3h8M5 3V2h2v1M4 3l.5 6.5h3L8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <p className={`text-xs ${textMut}`}>{counts.completed} of {counts.all} tasks completed</p>
          <p className={`text-xs ${textMut}`}>PostgreSQL · Drizzle ORM</p>
        </div>

      </main>
    </div>
  );
}
