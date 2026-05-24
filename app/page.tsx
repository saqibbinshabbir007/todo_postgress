'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Todo, TodoStatus, TodoPriority, CreateTodoInput } from '@/types/todo';

const PRIORITY_CONFIG: Record<TodoPriority, { color: string; bar: string; label: string; badge: string }> = {
  high:   { color: '#EF4444', bar: 'bg-red-500',    label: 'High',   badge: 'bg-red-100 text-red-600' },
  medium: { color: '#F59E0B', bar: 'bg-amber-400',  label: 'Medium', badge: 'bg-amber-100 text-amber-600' },
  low:    { color: '#10B981', bar: 'bg-emerald-400', label: 'Low',   badge: 'bg-emerald-100 text-emerald-600' },
};

const COLUMNS: { id: TodoStatus; label: string; accent: string; dot: string }[] = [
  { id: 'pending',     label: 'To Do',       accent: 'border-t-amber-400',   dot: 'bg-amber-400' },
  { id: 'in_progress', label: 'In Progress', accent: 'border-t-blue-400',    dot: 'bg-blue-400' },
  { id: 'completed',   label: 'Done',        accent: 'border-t-emerald-400', dot: 'bg-emerald-400' },
];

function isOverdue(due: string | null, status: TodoStatus) {
  if (!due || status === 'completed') return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Draggable Card ───────────────────────────────────────────
function DraggableCard({ todo, onDelete, onStatus, dark }: {
  todo: Todo; onDelete: (id: number) => void;
  onStatus: (todo: Todo) => void; dark: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: todo.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardContent todo={todo} onDelete={onDelete} onStatus={onStatus} dark={dark} />
    </div>
  );
}

// ─── Card Content (reused in overlay too) ────────────────────
function CardContent({ todo, onDelete, onStatus, dark, overlay = false }: {
  todo: Todo; onDelete?: (id: number) => void;
  onStatus?: (todo: Todo) => void; dark: boolean; overlay?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const overdue = isOverdue(todo.due_date, todo.status);

  const card   = dark ? 'bg-[#1C1C1A] border-[#2C2C2A]' : 'bg-white border-[#E8E7E2]';
  const textP  = dark ? 'text-[#FAFAF8]' : 'text-[#18181B]';
  const textM  = dark ? 'text-[#6C6C6A]' : 'text-[#A1A1AA]';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`border rounded-xl p-3.5 mb-2.5 shadow-sm transition-all select-none
        ${card}
        ${overdue ? (dark ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-red-400') : ''}
        ${overlay ? 'rotate-2 shadow-xl scale-105' : 'hover:shadow-md'}
        ${todo.status === 'completed' ? 'opacity-70' : ''}
      `}
    >
      {/* Priority strip */}
      <div className={`w-full h-0.5 rounded-full mb-2.5 ${PRIORITY_CONFIG[todo.priority].bar}`} />

      {/* Title */}
      <p className={`text-sm font-medium leading-snug mb-1.5 ${
        todo.status === 'completed' ? `line-through ${textM}` : textP
      }`}>
        {todo.title}
      </p>

      {/* Description */}
      {todo.description && (
        <p className={`text-xs mb-2 line-clamp-2 leading-relaxed ${textM}`}>
          {todo.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${PRIORITY_CONFIG[todo.priority].badge}`}>
            {PRIORITY_CONFIG[todo.priority].label}
          </span>
          {todo.due_date && (
            <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? 'text-red-500 font-semibold' : textM}`}>
              {overdue ? '⚠ Overdue' : formatDate(todo.due_date)}
            </span>
          )}
        </div>

        {/* Actions */}
        {!overlay && (
          <div className={`flex gap-1 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onStatus?.(todo); }}
              className={`text-[10px] px-2 py-0.5 rounded-md border ${
                dark ? 'border-[#2C2C2A] text-[#8C8C8A] hover:text-[#FAFAF8] hover:border-[#4C4C4A]'
                     : 'border-[#E8E7E2] text-[#A1A1AA] hover:text-[#18181B] hover:border-[#C4C4C7]'
              } transition-colors`}
            >
              {todo.status === 'completed' ? '↩' : '→'}
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDelete?.(todo.id); }}
              className="text-[10px] px-2 py-0.5 rounded-md border border-transparent text-[#A1A1AA] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Droppable Column ────────────────────────────────────────
function KanbanColumn({ col, todos, onDelete, onStatus, dark, onAddClick }: {
  col: typeof COLUMNS[0]; todos: Todo[];
  onDelete: (id: number) => void; onStatus: (todo: Todo) => void;
  dark: boolean; onAddClick: (status: TodoStatus) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id });

  const colBg   = dark ? 'bg-[#161615]' : 'bg-[#F4F3F0]';
  const border  = dark ? 'border-[#2C2C2A]' : 'border-[#E8E7E2]';
  const textP   = dark ? 'text-[#FAFAF8]' : 'text-[#18181B]';
  const textM   = dark ? 'text-[#6C6C6A]' : 'text-[#A1A1AA]';
  const addBtn  = dark ? 'text-[#5C5C5A] hover:text-[#FAFAF8] hover:bg-[#2C2C2A]'
                       : 'text-[#B4B4B7] hover:text-[#71717A] hover:bg-[#EAEAE7]';

  return (
    <div className={`flex-1 min-w-0 flex flex-col rounded-2xl border-t-4 ${col.accent} ${colBg} border ${border} transition-all duration-200 ${
      isOver ? (dark ? 'bg-[#1C1C1A] border-opacity-100' : 'bg-[#EDECEA]') : ''
    }`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <h3 className={`text-sm font-semibold ${textP}`}>{col.label}</h3>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
            dark ? 'bg-[#2C2C2A] text-[#8C8C8A]' : 'bg-[#E8E7E2] text-[#71717A]'
          }`}>{todos.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-3 overflow-y-auto min-h-[200px]"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {todos.length === 0 && (
          <div className={`text-xs text-center py-8 ${textM}`}>
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
        {todos.map(todo => (
          <DraggableCard
            key={todo.id}
            todo={todo}
            onDelete={onDelete}
            onStatus={onStatus}
            dark={dark}
          />
        ))}
      </div>

      {/* Add button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onAddClick(col.id)}
          className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors ${addBtn}`}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Add task
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Page() {
  const [todos, setTodos]           = useState<Todo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [darkMode, setDarkMode]     = useState(false);
  const [search, setSearch]         = useState('');
  const [activeId, setActiveId]     = useState<number | null>(null);
  const [toast, setToast]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [formStatus, setFormStatus] = useState<TodoStatus>('pending');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState<CreateTodoInput>({ title: '', description: '', priority: 'medium', due_date: '' });
  const titleRef  = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/todos');
      const json = await res.json();
      setTodos(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showForm) titleRef.current?.focus(); }, [showForm]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setFormStatus('pending'); setShowForm(true); }
    if (e.key === 'Escape') { setShowForm(false); setSearch(''); }
    if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const todoId    = active.id as number;
    const newStatus = over.id as TodoStatus;
    const todo      = todos.find(t => t.id === todoId);
    if (!todo || todo.status === newStatus) return;

    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, status: newStatus } : t));
    await fetch(`/api/todos/${todoId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    });
    showToast(`Moved to ${newStatus.replace('_', ' ')}`);
    load();
  }

  async function handleStatus(todo: Todo) {
    const map: Record<TodoStatus, TodoStatus> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: map[todo.status] }),
    });
    showToast('Status updated!');
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    showToast('Task deleted');
    load();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/todos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: formStatus }),
      });
      setForm({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowForm(false);
      showToast('Task added!');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  // Filter todos
  const filtered = search.trim()
    ? todos.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : todos;

  const byStatus = (status: TodoStatus) => filtered.filter(t => t.status === status);
  const activeTodo = todos.find(t => t.id === activeId);

  const counts   = { pending: todos.filter(t => t.status==='pending').length, in_progress: todos.filter(t => t.status==='in_progress').length, completed: todos.filter(t => t.status==='completed').length };
  const progress = todos.length > 0 ? Math.round((counts.completed / todos.length) * 100) : 0;
  const overdue  = todos.filter(t => isOverdue(t.due_date, t.status)).length;

  const dm      = darkMode;
  const pageBg  = dm ? 'bg-[#111110]'    : 'bg-[#F0EFEC]';
  const card    = dm ? 'bg-[#1C1C1A]'    : 'bg-white';
  const border  = dm ? 'border-[#2C2C2A]': 'border-[#E8E7E2]';
  const textP   = dm ? 'text-[#FAFAF8]'  : 'text-[#18181B]';
  const textS   = dm ? 'text-[#8C8C8A]'  : 'text-[#71717A]';
  const textM   = dm ? 'text-[#5C5C5A]'  : 'text-[#A1A1AA]';
  const inputBg = dm ? 'bg-[#1C1C1A]'    : 'bg-white';
  const btnPri  = dm ? 'bg-[#FAFAF8] text-[#18181B] hover:bg-[#E8E7E2]' : 'bg-[#18181B] text-white hover:bg-[#2D2D2F]';

  return (
    <div className={`min-h-screen ${pageBg} font-sans transition-colors duration-300`}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#18181B] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className={`border-b ${border} ${card} sticky top-0 z-20 transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-6 h-6 rounded-md ${dm ? 'bg-[#FAFAF8]' : 'bg-[#18181B]'} flex items-center justify-center`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M2 7h6M2 10h8" stroke={dm ? '#18181B' : 'white'} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className={`font-bold text-sm tracking-tight ${textP}`}>Taskboard</span>
          </div>

          {/* Search */}
          <div className={`flex-1 max-w-sm flex items-center gap-2 ${dm ? 'bg-[#1C1C1A] border-[#2C2C2A]' : 'bg-[#F4F3F0] border-[#E8E7E2]'} border rounded-lg px-3 py-1.5`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={textM}>
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8.5 8.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder='Search tasks... ( / )'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`flex-1 text-xs bg-transparent outline-none ${textP} placeholder-[#A1A1AA]`}
            />
            {search && <button onClick={() => setSearch('')} className={`${textM} text-xs`}>✕</button>}
          </div>

          <div className="flex items-center gap-3 ml-auto shrink-0">
            {/* Progress */}
            <div className="hidden md:flex items-center gap-2">
              <div className={`w-20 h-1.5 ${dm ? 'bg-[#2C2C2A]' : 'bg-[#E8E7E2]'} rounded-full overflow-hidden`}>
                <div className={`h-full ${dm ? 'bg-[#FAFAF8]' : 'bg-[#18181B]'} rounded-full transition-all duration-700`} style={{ width: `${progress}%` }} />
              </div>
              <span className={`text-xs font-semibold ${textS}`}>{progress}%</span>
            </div>

            {/* Add button */}
            <button
              onClick={() => { setFormStatus('pending'); setShowForm(true); }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors ${btnPri}`}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              New Task
              <span className="opacity-40 font-normal text-[10px] ml-0.5">N</span>
            </button>

            {/* Dark mode */}
            <button
              onClick={() => setDarkMode(!dm)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border ${border} ${textS} transition-colors hover:${textP}`}
            >
              {dm ? (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M6.5 1v1M6.5 11v1M1 6.5h1M11 6.5h1M2.5 2.5l.7.7M9.8 9.8l.7.7M9.8 2.5l-.7.7M3.2 9.8l-.7.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M11.5 7A5.5 5.5 0 0 1 6 1.5a5.5 5.5 0 1 0 5.5 5.5z" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',    value: todos.length,       color: textP },
            { label: 'To Do',    value: counts.pending,     color: 'text-amber-500' },
            { label: 'Doing',    value: counts.in_progress, color: 'text-blue-500' },
            { label: 'Done',     value: counts.completed,   color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className={`${card} border ${border} rounded-xl p-3.5 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-xs mt-0.5 ${textM}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Overdue */}
        {overdue > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-5">
            <span className="text-red-500 text-sm">⚠</span>
            <p className="text-xs font-medium text-red-600">
              {overdue} task{overdue > 1 ? 's are' : ' is'} overdue
            </p>
          </div>
        )}

        {/* Add Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <form
              onSubmit={handleAdd}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-md ${card} border ${border} rounded-2xl p-5 shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold text-sm ${textP}`}>New Task</h3>
                <div className="flex gap-1">
                  {COLUMNS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormStatus(c.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        formStatus === c.id
                          ? (dm ? 'bg-[#FAFAF8] text-[#18181B] border-transparent' : 'bg-[#18181B] text-white border-transparent')
                          : `${border} ${textS}`
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                ref={titleRef}
                type="text"
                placeholder="Task title *"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className={`w-full text-sm font-medium placeholder-[#C4C4C7] bg-transparent outline-none mb-2.5 ${textP}`}
                required
              />
              <textarea
                placeholder="Description (optional)..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={`w-full text-sm placeholder-[#C4C4C7] bg-transparent outline-none resize-none mb-3 leading-relaxed ${textS}`}
              />
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {(['low', 'medium', 'high'] as TodoPriority[]).map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                      form.priority === p
                        ? (dm ? 'border-[#FAFAF8] bg-[#FAFAF8] text-[#18181B]' : 'border-[#18181B] bg-[#18181B] text-white')
                        : `${border} ${textS}`
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
                  className={`text-xs ${textS} border ${border} rounded-full px-2.5 py-1 outline-none bg-transparent`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className={`text-xs px-3 py-1.5 rounded-lg ${textM}`}>Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 ${btnPri}`}
                >
                  {submitting ? 'Saving...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Keyboard hints */}
        <div className={`flex items-center gap-3 mb-4 text-[10px] ${textM}`}>
          <span><kbd className={`px-1.5 py-0.5 rounded border ${border} font-mono`}>N</kbd> New task</span>
          <span><kbd className={`px-1.5 py-0.5 rounded border ${border} font-mono`}>/</kbd> Search</span>
          <span><kbd className={`px-1.5 py-0.5 rounded border ${border} font-mono`}>Esc</kbd> Close</span>
          <span className={textM}>· Drag cards between columns</span>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className={`w-6 h-6 border-2 ${dm ? 'border-[#2C2C2A] border-t-[#FAFAF8]' : 'border-[#E8E7E2] border-t-[#18181B]'} rounded-full animate-spin`} />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 items-start">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  todos={byStatus(col.id)}
                  onDelete={handleDelete}
                  onStatus={handleStatus}
                  dark={dm}
                  onAddClick={(status) => { setFormStatus(status); setShowForm(true); }}
                />
              ))}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {activeTodo && (
                <div className="w-64 rotate-2">
                  <CardContent todo={activeTodo} dark={dm} overlay />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <p className={`text-xs ${textM}`}>{counts.completed} of {todos.length} tasks completed</p>
          <p className={`text-xs ${textM}`}>PostgreSQL · Drizzle ORM · Next.js</p>
        </div>
      </main>
    </div>
  );
}
