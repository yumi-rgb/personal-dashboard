'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, Trash2, User, Edit2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePoints } from '@/lib/PointsContext';
import { today } from '@/lib/utils';

const CMS_BASE = 'https://cms.medinacriminaldefense.com';
const PERSONAL_TASKS_KEY = 'personal-tasks-v1';

// ── Work task types ───────────────────────────────────────────────────────────

interface Task {
  id: string | number;
  title: string;
  description?: string;
  status: string;
  taskType?: string;
  dueDate?: string;
  matterLookupId?: string | number;
  assignedTo?: string;
  comments?: string;
}

// ── Personal task types ───────────────────────────────────────────────────────

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'every_x_days';

interface PersonalTask {
  id: string;
  title: string;
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  done: boolean;
  createdAt: string;
  // Recurring fields
  recurrence: RecurrenceType;
  recurrenceDayOfWeek?: number; // 0=Sun, 1=Mon... for weekly
  recurrenceInterval?: number;  // for every_x_days
  lastCompletedAt?: string;     // YYYY-MM-DD
  nextDueDate?: string;         // auto-calculated
}

type FilterTab = 'open' | 'done' | 'all';
type SourceTab = 'personal' | 'work';

interface AddTaskForm {
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  case_id: string;
}

interface AddPersonalTaskForm {
  title: string;
  dueDate: string;
  notes: string;
  recurrence: RecurrenceType;
  recurrenceDayOfWeek: number;
  recurrenceInterval: number;
}

const OPEN_STATUSES = ['To Do', 'Open', 'In Progress'];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Recurrence helpers ────────────────────────────────────────────────────────

function calcNextDueDate(task: PersonalTask): string {
  const base = today();
  const d = new Date(base + 'T00:00:00');

  switch (task.recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly': {
      const targetDay = task.recurrenceDayOfWeek ?? 1;
      const current = d.getDay();
      let diff = targetDay - current;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      break;
    }
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'every_x_days': {
      const interval = task.recurrenceInterval ?? 1;
      d.setDate(d.getDate() + interval);
      break;
    }
    default:
      return base;
  }

  return d.toISOString().split('T')[0];
}

function recurrenceLabel(task: PersonalTask): string {
  switch (task.recurrence) {
    case 'daily': return 'Daily';
    case 'weekly': return `Every ${DAY_NAMES[task.recurrenceDayOfWeek ?? 1]}`;
    case 'monthly': return 'Monthly';
    case 'every_x_days': return `Every ${task.recurrenceInterval ?? 1}d`;
    default: return '';
  }
}

// ── Pre-seed data ─────────────────────────────────────────────────────────────

function buildSeedTasks(): PersonalTask[] {
  const todayStr = today();
  const d = new Date(todayStr + 'T00:00:00');

  function makeRecurring(
    title: string,
    recurrence: RecurrenceType,
    extra: Partial<PersonalTask> = {}
  ): PersonalTask {
    const partial: PersonalTask = {
      id: crypto.randomUUID(),
      title,
      done: false,
      createdAt: new Date().toISOString(),
      recurrence,
      ...extra,
    };
    partial.nextDueDate = calcNextDueDate(partial);
    return partial;
  }

  return [
    makeRecurring('🧺 Laundry — Load 1 (Mon)', 'weekly', { recurrenceDayOfWeek: 1 }),
    makeRecurring('🧺 Laundry — Load 2 (Tue)', 'weekly', { recurrenceDayOfWeek: 2 }),
    makeRecurring('🧺 Laundry — Load 3 (Wed)', 'weekly', { recurrenceDayOfWeek: 3 }),
    makeRecurring('🧺 Laundry — Load 4 (Thu)', 'weekly', { recurrenceDayOfWeek: 4 }),
    makeRecurring('🧺 Laundry — Load 5 (Fri)', 'weekly', { recurrenceDayOfWeek: 5 }),
    makeRecurring('🚗 Clean out the car', 'weekly', { recurrenceDayOfWeek: 6 }),
    makeRecurring('☕ Return mugs/glasses to kitchen', 'every_x_days', { recurrenceInterval: 3 }),
    makeRecurring('💇 Hair dye reminder', 'every_x_days', { recurrenceInterval: 42 }),
    makeRecurring('🌸 Seasonal clothing swap', 'every_x_days', { recurrenceInterval: 180 }),
  ];
}

// ── Shared formatting / grouping ──────────────────────────────────────────────

function formatDueDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDueDateCategory(dueDate: string | undefined): 'overdue' | 'today' | 'week' | 'later' | 'none' {
  if (!dueDate) return 'none';
  const todayStr = today();
  const due = dueDate.split('T')[0];
  if (due < todayStr) return 'overdue';
  if (due === todayStr) return 'today';
  const weekOut = new Date();
  weekOut.setDate(weekOut.getDate() + 7);
  const weekStr = weekOut.toISOString().split('T')[0];
  if (due <= weekStr) return 'week';
  return 'later';
}

/** For recurring tasks use nextDueDate; for non-recurring use dueDate */
function getPersonalTaskDate(task: PersonalTask): string | undefined {
  if (task.recurrence !== 'none') return task.nextDueDate ?? task.dueDate;
  return task.dueDate;
}

function groupTasks<T extends { dueDate?: string }>(tasks: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    none: [],
  };
  for (const task of tasks) {
    const cat = getDueDateCategory(task.dueDate);
    groups[cat].push(task);
  }
  return groups;
}

function groupPersonalTasks(tasks: PersonalTask[]): Record<string, PersonalTask[]> {
  const groups: Record<string, PersonalTask[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    none: [],
  };
  for (const task of tasks) {
    const dateForGrouping = getPersonalTaskDate(task);
    const cat = getDueDateCategory(dateForGrouping);
    groups[cat].push(task);
  }
  return groups;
}

const GROUP_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This Week',
  later: 'Later',
  none: 'No Due Date',
};

const GROUP_ORDER = ['overdue', 'today', 'week', 'later', 'none'];

// ── Personal Tasks Panel ──────────────────────────────────────────────────────

function PersonalTasksPanel() {
  const { award } = usePoints();
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('open');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [editForm, setEditForm] = useState<AddPersonalTaskForm>({
    title: '',
    dueDate: '',
    notes: '',
    recurrence: 'none',
    recurrenceDayOfWeek: 1,
    recurrenceInterval: 1,
  });
  const [addForm, setAddForm] = useState<AddPersonalTaskForm>({
    title: '',
    dueDate: '',
    notes: '',
    recurrence: 'none',
    recurrenceDayOfWeek: 1,
    recurrenceInterval: 1,
  });

  // Load from localStorage, seeding recurring tasks if empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSONAL_TASKS_KEY);
      if (stored) {
        const parsed: PersonalTask[] = JSON.parse(stored);
        // Migrate old tasks that are missing the recurrence field
        const migrated = parsed.map(t =>
          t.recurrence === undefined ? { ...t, recurrence: 'none' as RecurrenceType } : t
        );
        // Append seed recurring tasks if none exist yet
        const hasRecurring = migrated.some(t => t.recurrence !== 'none');
        if (!hasRecurring) {
          const seeded = [...buildSeedTasks(), ...migrated];
          setTasks(seeded);
          localStorage.setItem(PERSONAL_TASKS_KEY, JSON.stringify(seeded));
        } else {
          setTasks(migrated);
        }
      } else {
        // Brand-new — seed everything
        const seeded = buildSeedTasks();
        setTasks(seeded);
        localStorage.setItem(PERSONAL_TASKS_KEY, JSON.stringify(seeded));
      }
    } catch {}
  }, []);

  function saveTasks(next: PersonalTask[]) {
    setTasks(next);
    localStorage.setItem(PERSONAL_TASKS_KEY, JSON.stringify(next));
  }

  function handleAddTask() {
    if (!addForm.title.trim()) return;
    const task: PersonalTask = {
      id: crypto.randomUUID(),
      title: addForm.title.trim(),
      dueDate: addForm.dueDate || undefined,
      notes: addForm.notes.trim() || undefined,
      done: false,
      createdAt: new Date().toISOString(),
      recurrence: addForm.recurrence,
      recurrenceDayOfWeek: addForm.recurrence === 'weekly' ? addForm.recurrenceDayOfWeek : undefined,
      recurrenceInterval: addForm.recurrence === 'every_x_days' ? addForm.recurrenceInterval : undefined,
    };
    if (task.recurrence !== 'none') {
      task.nextDueDate = calcNextDueDate(task);
    }
    saveTasks([task, ...tasks]);
    setAddForm({ title: '', dueDate: '', notes: '', recurrence: 'none', recurrenceDayOfWeek: 1, recurrenceInterval: 1 });
    setShowAddModal(false);
  }

  function handleMarkDone(task: PersonalTask) {
    if (task.recurrence !== 'none') {
      // Recurring: reset with new due date instead of marking permanently done
      const updatedTask: PersonalTask = {
        ...task,
        done: false,
        lastCompletedAt: today(),
        nextDueDate: calcNextDueDate(task),
      };
      saveTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
    } else {
      saveTasks(tasks.map(t => t.id === task.id ? { ...t, done: true } : t));
    }
    award({
      date: today(),
      action: 'task_done',
      description: `Completed personal task: ${task.title}`,
      points: 15,
      key: `personal_task_done_${task.id}_${today()}`,
    });
  }

  function handleDelete(id: string) {
    saveTasks(tasks.filter(t => t.id !== id));
  }

  function openEditModal(task: PersonalTask) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      dueDate: task.dueDate ?? '',
      notes: task.notes ?? '',
      recurrence: task.recurrence,
      recurrenceDayOfWeek: task.recurrenceDayOfWeek ?? 1,
      recurrenceInterval: task.recurrenceInterval ?? 1,
    });
  }

  function handleSaveEdit() {
    if (!editingTask || !editForm.title.trim()) return;
    const updated: PersonalTask = {
      ...editingTask,
      title: editForm.title.trim(),
      dueDate: editForm.dueDate || undefined,
      notes: editForm.notes.trim() || undefined,
      recurrence: editForm.recurrence,
      recurrenceDayOfWeek: editForm.recurrence === 'weekly' ? editForm.recurrenceDayOfWeek : undefined,
      recurrenceInterval: editForm.recurrence === 'every_x_days' ? editForm.recurrenceInterval : undefined,
    };
    if (updated.recurrence !== 'none') {
      updated.nextDueDate = calcNextDueDate(updated);
    }
    saveTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
    setEditingTask(null);
  }

  const filteredTasks = tasks.filter(task => {
    if (filterTab === 'open') return !task.done;
    if (filterTab === 'done') return task.done;
    return true;
  });

  const grouped = groupPersonalTasks(filteredTasks);
  const openCount = tasks.filter(t => !t.done).length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 flex-1">
          {(['open', 'done', 'all'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${
                filterTab === tab
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'open' ? 'Open' : tab === 'done' ? 'Done' : 'All'}
              {tab === 'open' && openCount > 0 && (
                <span className="ml-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs px-1.5 py-0.5 rounded-full">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)} className="ml-3 flex-shrink-0">
          <Plus size={14} />
          Add Task
        </Button>
      </div>

      {/* Task groups */}
      {filteredTasks.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 dark:text-gray-400 py-6">
            No {filterTab === 'open' ? 'open' : filterTab === 'done' ? 'completed' : ''} personal tasks.
          </p>
        </Card>
      ) : (
        GROUP_ORDER.map(groupKey => {
          const groupItems = grouped[groupKey];
          if (!groupItems || groupItems.length === 0) return null;
          const isOverdue = groupKey === 'overdue';
          return (
            <div key={groupKey} className="mb-4">
              <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                isOverdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {GROUP_LABELS[groupKey]} ({groupItems.length})
              </h3>
              <div className="space-y-2">
                {groupItems.map(task => (
                  <PersonalTaskCard
                    key={task.id}
                    task={task}
                    isOverdue={isOverdue}
                    onMarkDone={handleMarkDone}
                    onDelete={handleDelete}
                    onEdit={openEditModal}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Edit Personal Task Modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Personal Task">
        <div className="space-y-3">
          <Input
            label="Title *"
            value={editForm.title}
            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title"
          />
          <Input
            label="Due Date"
            type="date"
            value={editForm.dueDate}
            onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
          />
          <Textarea
            label="Notes"
            value={editForm.notes}
            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
            rows={3}
          />
          <Select
            label="Repeat"
            value={editForm.recurrence}
            onChange={e => setEditForm(f => ({ ...f, recurrence: e.target.value as RecurrenceType }))}
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="every_x_days">Every X days</option>
          </Select>
          {editForm.recurrence === 'weekly' && (
            <Select
              label="Day of week"
              value={String(editForm.recurrenceDayOfWeek)}
              onChange={e => setEditForm(f => ({ ...f, recurrenceDayOfWeek: Number(e.target.value) }))}
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </Select>
          )}
          {editForm.recurrence === 'every_x_days' && (
            <Input
              label="Every how many days?"
              type="number"
              min={1}
              value={String(editForm.recurrenceInterval)}
              onChange={e => setEditForm(f => ({ ...f, recurrenceInterval: Math.max(1, Number(e.target.value)) }))}
            />
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingTask(null)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.title.trim()} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Personal Task Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Personal Task">
        <div className="space-y-3">
          <Input
            label="Title *"
            value={addForm.title}
            onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title"
          />
          <Input
            label="Due Date"
            type="date"
            value={addForm.dueDate}
            onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))}
          />
          <Textarea
            label="Notes"
            value={addForm.notes}
            onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
            rows={3}
          />
          {/* Repeat dropdown */}
          <Select
            label="Repeat"
            value={addForm.recurrence}
            onChange={e => setAddForm(f => ({ ...f, recurrence: e.target.value as RecurrenceType }))}
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="every_x_days">Every X days</option>
          </Select>
          {/* Day-of-week picker for weekly */}
          {addForm.recurrence === 'weekly' && (
            <Select
              label="Day of week"
              value={String(addForm.recurrenceDayOfWeek)}
              onChange={e => setAddForm(f => ({ ...f, recurrenceDayOfWeek: Number(e.target.value) }))}
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </Select>
          )}
          {/* Interval input for every_x_days */}
          {addForm.recurrence === 'every_x_days' && (
            <Input
              label="Every how many days?"
              type="number"
              min={1}
              value={String(addForm.recurrenceInterval)}
              onChange={e => setAddForm(f => ({ ...f, recurrenceInterval: Math.max(1, Number(e.target.value)) }))}
            />
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!addForm.title.trim()} className="flex-1">
              Add Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface PersonalTaskCardProps {
  task: PersonalTask;
  isOverdue: boolean;
  onMarkDone: (task: PersonalTask) => void;
  onDelete: (id: string) => void;
  onEdit: (task: PersonalTask) => void;
}

function PersonalTaskCard({ task, isOverdue, onMarkDone, onDelete, onEdit }: PersonalTaskCardProps) {
  const isRecurring = task.recurrence !== 'none';
  const displayDate = isRecurring ? task.nextDueDate : task.dueDate;

  return (
    <div className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      isOverdue && !task.done
        ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {task.title}
          </span>
          {isRecurring && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
              <RefreshCw size={10} />
              {recurrenceLabel(task)}
            </span>
          )}
          {isOverdue && !task.done && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              <AlertCircle size={10} />
              Overdue
            </span>
          )}
          {task.done && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              Done
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {displayDate && (
            <span className={`flex items-center gap-1 ${isOverdue && !task.done ? 'text-red-500' : ''}`}>
              <Calendar size={11} />
              {isRecurring ? 'Next: ' : ''}{formatDueDate(displayDate)}
            </span>
          )}
          {task.lastCompletedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} />
              Last done {formatDueDate(task.lastCompletedAt)}
            </span>
          )}
          {task.notes && (
            <span className="italic truncate max-w-xs">{task.notes}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!task.done && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkDone(task)}
            className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 min-h-[36px] min-w-[36px]"
          >
            <CheckCircle2 size={16} />
            <span className="hidden sm:inline">Done</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(task)}
          className="text-gray-400 hover:text-indigo-500 min-h-[36px] min-w-[36px]"
        >
          <Edit2 size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(task.id)}
          className="text-gray-400 hover:text-red-500 min-h-[36px] min-w-[36px]"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

// ── Work Tasks Panel ──────────────────────────────────────────────────────────

function WorkTasksPanel() {
  const { award } = usePoints();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('open');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddTaskForm>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'normal',
    case_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [markingDone, setMarkingDone] = useState<Set<string | number>>(new Set());
  const [editingWorkTask, setEditingWorkTask] = useState<Task | null>(null);
  const [workEditForm, setWorkEditForm] = useState({ title: '', dueDate: '', notes: '' });
  const [workEditSaving, setWorkEditSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${CMS_BASE}/api/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    if (filterTab === 'open') return OPEN_STATUSES.includes(task.status);
    if (filterTab === 'done') return task.status === 'Done';
    return true;
  });

  const grouped = groupTasks(filteredTasks);

  const handleMarkDone = async (task: Task) => {
    setMarkingDone(prev => new Set(prev).add(task.id));
    try {
      const res = await fetch(`${CMS_BASE}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Done' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Done' } : t));
      award({
        date: today(),
        action: 'task_done',
        description: `Completed task: ${task.title}`,
        points: 15,
        key: `task_done_${task.id}_${today()}`,
      });
    } catch (e) {
      console.error('Failed to mark done:', e);
    } finally {
      setMarkingDone(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleAddTask = async () => {
    if (!addForm.title.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        title: addForm.title,
        description: addForm.description,
        dueDate: addForm.dueDate,
        priority: addForm.priority,
      };
      if (addForm.case_id.trim()) payload.case_id = addForm.case_id;
      const res = await fetch(`${CMS_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowAddModal(false);
      setAddForm({ title: '', description: '', dueDate: '', priority: 'normal', case_id: '' });
      await fetchTasks();
    } catch (e) {
      console.error('Failed to add task:', e);
    } finally {
      setSubmitting(false);
    }
  };

  function openWorkEditModal(task: Task) {
    setEditingWorkTask(task);
    setWorkEditForm({
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      notes: task.comments ?? '',
    });
  }

  async function handleSaveWorkEdit() {
    if (!editingWorkTask || !workEditForm.title.trim()) return;
    setWorkEditSaving(true);
    try {
      const res = await fetch(`${CMS_BASE}/api/tasks/${editingWorkTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: workEditForm.title.trim(),
          dueDate: workEditForm.dueDate || undefined,
          notes: workEditForm.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(prev => prev.map(t =>
        t.id === editingWorkTask.id
          ? { ...t, title: workEditForm.title.trim(), dueDate: workEditForm.dueDate || t.dueDate, comments: workEditForm.notes.trim() || t.comments }
          : t
      ));
      setEditingWorkTask(null);
    } catch (e) {
      console.error('Failed to save work task:', e);
    } finally {
      setWorkEditSaving(false);
    }
  }

  const openCount = tasks.filter(t => OPEN_STATUSES.includes(t.status)).length;

  return (
    <div>
      {/* Filter tabs + controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 flex-1">
          {(['open', 'done', 'all'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${
                filterTab === tab
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'open' ? 'Open' : tab === 'done' ? 'Done' : 'All'}
              {tab === 'open' && openCount > 0 && (
                <span className="ml-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs px-1.5 py-0.5 rounded-full">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={fetchTasks} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Add Task
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Loading tasks...
        </div>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">Error: {error}</span>
            <Button variant="ghost" size="sm" onClick={fetchTasks} className="ml-auto">Retry</Button>
          </div>
        </Card>
      )}

      {!loading && !error && filteredTasks.length === 0 && (
        <Card>
          <p className="text-center text-gray-500 dark:text-gray-400 py-6">
            No {filterTab === 'open' ? 'open' : filterTab === 'done' ? 'completed' : ''} tasks.
          </p>
        </Card>
      )}

      {!loading && !error && GROUP_ORDER.map(groupKey => {
        const groupItems = grouped[groupKey];
        if (!groupItems || groupItems.length === 0) return null;
        const isOverdue = groupKey === 'overdue';
        return (
          <div key={groupKey} className="mb-4">
            <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
              isOverdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {GROUP_LABELS[groupKey]} ({groupItems.length})
            </h3>
            <div className="space-y-2">
              {groupItems.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isOverdue={isOverdue}
                  isMarkingDone={markingDone.has(task.id)}
                  onMarkDone={handleMarkDone}
                  onEdit={openWorkEditModal}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Edit Work Task Modal */}
      <Modal isOpen={!!editingWorkTask} onClose={() => setEditingWorkTask(null)} title="Edit Work Task">
        <div className="space-y-3">
          <Input
            label="Title *"
            value={workEditForm.title}
            onChange={e => setWorkEditForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title"
          />
          <Input
            label="Due Date"
            type="date"
            value={workEditForm.dueDate}
            onChange={e => setWorkEditForm(f => ({ ...f, dueDate: e.target.value }))}
          />
          <Textarea
            label="Notes"
            value={workEditForm.notes}
            onChange={e => setWorkEditForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingWorkTask(null)} className="flex-1" disabled={workEditSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkEdit} disabled={workEditSaving || !workEditForm.title.trim()} className="flex-1">
              {workEditSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Work Task">
        <div className="space-y-3">
          <Input
            label="Title *"
            value={addForm.title}
            onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title"
          />
          <Textarea
            label="Description"
            value={addForm.description}
            onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
            rows={3}
          />
          <Input
            label="Due Date"
            type="date"
            value={addForm.dueDate}
            onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))}
          />
          <Select
            label="Priority"
            value={addForm.priority}
            onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Input
            label="Case ID (optional)"
            value={addForm.case_id}
            onChange={e => setAddForm(f => ({ ...f, case_id: e.target.value }))}
            placeholder="e.g. 42"
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={submitting || !addForm.title.trim()} className="flex-1">
              {submitting ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function TasksSection() {
  const [sourceTab, setSourceTab] = useState<SourceTab>('personal');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
          <p className="text-sm text-gray-500">Manage your personal and work tasks</p>
        </div>
      </div>

      {/* Source tabs (Personal / Work) */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSourceTab('personal')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            sourceTab === 'personal'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <User size={13} />
          Personal
        </button>
        <button
          onClick={() => setSourceTab('work')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            sourceTab === 'work'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Briefcase size={13} />
          Work (CMS)
        </button>
      </div>

      {/* Panel content */}
      {sourceTab === 'personal' ? <PersonalTasksPanel /> : <WorkTasksPanel />}
    </div>
  );
}

// ── Work TaskCard ─────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  isMarkingDone: boolean;
  onMarkDone: (task: Task) => void;
  onEdit: (task: Task) => void;
}

function TaskCard({ task, isOverdue, isMarkingDone, onMarkDone, onEdit }: TaskCardProps) {
  const isDone = task.status === 'Done';
  return (
    <div className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      isOverdue && !isDone
        ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {task.title}
          </span>
          {task.taskType && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              <Briefcase size={10} />
              {task.taskType}
            </span>
          )}
          {isOverdue && !isDone && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              <AlertCircle size={10} />
              Overdue
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue && !isDone ? 'text-red-500' : ''}`}>
              <Calendar size={11} />
              {formatDueDate(task.dueDate)}
            </span>
          )}
          {task.matterLookupId && (
            <span className="flex items-center gap-1">
              <Briefcase size={11} />
              Case #{task.matterLookupId}
            </span>
          )}
          {task.assignedTo && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {task.assignedTo}
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded ${
            task.status === 'Done'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : task.status === 'In Progress'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {task.status}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(task)}
          className="text-gray-400 hover:text-indigo-500 min-h-[36px] min-w-[36px]"
        >
          <Edit2 size={14} />
        </Button>
        {!isDone && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkDone(task)}
            disabled={isMarkingDone}
            className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 min-h-[36px] min-w-[36px]"
          >
            <CheckCircle2 size={16} />
            {isMarkingDone ? '...' : <span className="hidden sm:inline">Done</span>}
          </Button>
        )}
      </div>
    </div>
  );
}
