'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, AlertCircle, CheckCircle2, Droplets, DollarSign, Calendar, Target, Plus, RefreshCw, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { habitsStorage, goalsStorage } from '@/lib/storage';
import { today, getStreak } from '@/lib/utils';
import { Habit, Goal } from '@/lib/types';

const CMS_BASE = 'https://cms.medinacriminaldefense.com';
const PERSONAL_TASKS_KEY = 'personal-tasks-v1';
const HOBBIES_KEY = 'hobbies-v1';
const FINANCE_API = 'http://localhost:3005/api/finance/reports/net-worth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalTask {
  id: string;
  title: string;
  dueDate?: string;
  notes?: string;
  done: boolean;
  createdAt: string;
  recurrence: string;
  nextDueDate?: string;
}

interface WorkTask {
  id: string | number;
  title: string;
  status: string;
  dueDate?: string;
}

interface Houseplant {
  id: string;
  name: string;
  location: string;
  waterEveryDays: number;
  lastWatered?: string;
  notes?: string;
}

interface HobbiesData {
  houseplants?: Houseplant[];
  [key: string]: unknown;
}

interface FinanceData {
  totalAssets?: number;
  totalDebts?: number;
  netWorth?: number;
  accounts?: Array<{ name: string; balance: number; type: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return today();
}

function getPersonalTaskDate(task: PersonalTask): string | undefined {
  if (task.recurrence && task.recurrence !== 'none') return task.nextDueDate ?? task.dueDate;
  return task.dueDate;
}

function isOverdueOrToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const t = todayStr();
  const d = dateStr.split('T')[0];
  return d <= t;
}

function isDueWithin7Days(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const t = todayStr();
  const d = dateStr.split('T')[0];
  if (d < t) return false;
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekStr = week.toISOString().split('T')[0];
  return d <= weekStr;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function waterStatus(plant: Houseplant): 'overdue' | 'today' | 'soon' | 'ok' {
  const days = daysSince(plant.lastWatered);
  if (days === null) return 'today';
  const daysUntil = plant.waterEveryDays - days;
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'today';
  if (daysUntil <= 2) return 'soon';
  return 'ok';
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ── Card 1: Today's Focus ─────────────────────────────────────────────────────

function TodayFocusCard({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);
  const [workLoading, setWorkLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSONAL_TASKS_KEY);
      if (stored) setPersonalTasks(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${CMS_BASE}/api/tasks`);
        if (res.ok) {
          const data = await res.json();
          setWorkTasks(Array.isArray(data) ? data : []);
        }
      } catch {}
      setWorkLoading(false);
    })();
  }, []);

  const urgentPersonal = personalTasks.filter(t => !t.done && isOverdueOrToday(getPersonalTaskDate(t)));
  const OPEN_STATUSES = ['To Do', 'Open', 'In Progress'];
  const urgentWork = workTasks.filter(t => OPEN_STATUSES.includes(t.status) && isOverdueOrToday(t.dueDate));
  const total = urgentPersonal.length + urgentWork.length;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={16} className="text-red-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Today&apos;s Focus</h3>
        {total > 0 && (
          <span className="ml-auto bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {total}
          </span>
        )}
      </div>
      {total === 0 ? (
        <p className="text-sm text-green-600 dark:text-green-400">All caught up! Nothing due today.</p>
      ) : (
        <ul className="space-y-1.5">
          {[...urgentPersonal.slice(0, 5).map(t => ({ title: t.title, source: 'Personal', date: getPersonalTaskDate(t) })),
            ...urgentWork.slice(0, Math.max(0, 5 - urgentPersonal.length)).map(t => ({ title: t.title, source: 'Work', date: t.dueDate }))
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${item.source === 'Personal' ? 'bg-indigo-400' : 'bg-amber-400'}`} />
              <span className="text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">{item.title}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{item.source}</span>
            </li>
          ))}
        </ul>
      )}
      {total > 5 && (
        <button
          onClick={() => onSwitchTab('tasks')}
          className="mt-2 text-xs text-indigo-500 hover:underline"
        >
          See all {total} tasks →
        </button>
      )}
      {workLoading && <p className="text-xs text-gray-400 mt-1">Loading work tasks...</p>}
    </Card>
  );
}

// ── Card 2: Action Required (Cards) ──────────────────────────────────────────

const CARD_ACTIONS = [
  { label: '$50 Sapphire hotel credit', expiry: '6/30/2026', urgent: true },
  { label: '$50 Hilton credit', expiry: '6/30/2026', urgent: true },
  { label: '$150 StubHub credit', expiry: '6/30/2026', urgent: false },
  { label: 'Southwest A-List status — call Chase to activate', expiry: null, urgent: false },
];

function CardActionsCard({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💳</span>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Action Required</h3>
      </div>
      <ul className="space-y-2">
        {CARD_ACTIONS.map((action, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${action.urgent ? 'bg-orange-400' : 'bg-blue-400'}`} />
            <span className="flex-1 text-gray-800 dark:text-gray-200">{action.label}</span>
            {action.expiry && (
              <span className="text-xs text-orange-500 flex-shrink-0">Exp {action.expiry}</span>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSwitchTab('cards')}
        className="mt-2 text-xs text-indigo-500 hover:underline"
      >
        View all card benefits →
      </button>
    </Card>
  );
}

// ── Card 3: Habits Today ──────────────────────────────────────────────────────

function HabitsTodayCard() {
  const t = todayStr();
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    setHabits(habitsStorage.get());
  }, []);

  function toggle(id: string) {
    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const has = h.completedDates.includes(t);
      return { ...h, completedDates: has ? h.completedDates.filter(d => d !== t) : [...h.completedDates, t] };
    });
    setHabits(updated);
    habitsStorage.set(updated);
  }

  const doneCount = habits.filter(h => h.completedDates.includes(t)).length;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Flame size={16} className="text-orange-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Habits Today</h3>
        <span className="ml-auto text-xs text-gray-400">{doneCount}/{habits.length}</span>
      </div>
      {habits.length === 0 ? (
        <p className="text-sm text-gray-500">No habits set up yet.</p>
      ) : (
        <ul className="space-y-2">
          {habits.map(habit => {
            const done = habit.completedDates.includes(t);
            const streak = getStreak(habit.completedDates);
            return (
              <li key={habit.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggle(habit.id)}
                  className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    done
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {done && <CheckCircle2 size={12} />}
                </button>
                <span className={`flex-1 text-sm truncate ${done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {habit.name}
                </span>
                {streak > 0 && (
                  <span className="text-xs text-orange-500 flex-shrink-0">{streak}🔥</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Card 4: Plants Needing Water ──────────────────────────────────────────────

function PlantsCard() {
  const [houseplants, setHouseplants] = useState<Houseplant[]>([]);

  function loadPlants() {
    try {
      const stored = localStorage.getItem(HOBBIES_KEY);
      if (stored) {
        const data: HobbiesData = JSON.parse(stored);
        setHouseplants(data.houseplants ?? []);
      }
    } catch {}
  }

  useEffect(() => { loadPlants(); }, []);

  function waterPlant(id: string) {
    try {
      const stored = localStorage.getItem(HOBBIES_KEY);
      if (!stored) return;
      const data: HobbiesData = JSON.parse(stored);
      const updated = (data.houseplants ?? []).map((p: Houseplant) =>
        p.id === id ? { ...p, lastWatered: new Date().toISOString() } : p
      );
      const newData = { ...data, houseplants: updated };
      localStorage.setItem(HOBBIES_KEY, JSON.stringify(newData));
      setHouseplants(updated);
    } catch {}
  }

  const needsWater = houseplants.filter(p => {
    const s = waterStatus(p);
    return s === 'overdue' || s === 'today';
  });

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Droplets size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Plants Needing Water</h3>
        {needsWater.length > 0 && (
          <span className="ml-auto bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {needsWater.length}
          </span>
        )}
      </div>
      {houseplants.length === 0 ? (
        <p className="text-sm text-gray-500">No houseplants tracked yet.</p>
      ) : needsWater.length === 0 ? (
        <p className="text-sm text-green-600 dark:text-green-400">All plants are watered!</p>
      ) : (
        <ul className="space-y-2">
          {needsWater.map(plant => {
            const s = waterStatus(plant);
            return (
              <li key={plant.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s === 'overdue' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{plant.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{plant.location}</span>
                <button
                  onClick={() => waterPlant(plant.id)}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors flex-shrink-0"
                >
                  Water
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Card 5: Financial Snapshot ────────────────────────────────────────────────

function FinanceSnapshotCard() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setOffline(false);
    try {
      const res = await fetch(FINANCE_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sapphire = data?.accounts?.find(a => a.name?.toLowerCase().includes('sapphire'));
  const studentLoan = data?.accounts?.find(a => a.name?.toLowerCase().includes('student') || a.name?.toLowerCase().includes('loan'));
  const sapphireLimit = 51500;
  const sapphireUtil = sapphire ? Math.round((Math.abs(sapphire.balance) / sapphireLimit) * 100) : null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={16} className="text-green-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Financial Snapshot</h3>
        <button onClick={fetchData} className="ml-auto text-gray-400 hover:text-gray-600">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : offline ? (
        <p className="text-sm text-gray-400 italic">Finance server offline</p>
      ) : data ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-gray-500">Assets</div>
              <div className="text-sm font-semibold text-green-600">{formatCurrency(data.totalAssets ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Debts</div>
              <div className="text-sm font-semibold text-red-500">{formatCurrency(data.totalDebts ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Net Worth</div>
              <div className={`text-sm font-bold ${(data.netWorth ?? 0) >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                {formatCurrency(data.netWorth ?? 0)}
              </div>
            </div>
          </div>
          {sapphire && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Sapphire Reserve</span>
                <span>{formatCurrency(Math.abs(sapphire.balance))} / {formatCurrency(sapphireLimit)} ({sapphireUtil}%)</span>
              </div>
              <ProgressBar value={sapphireUtil ?? 0} color={sapphireUtil && sapphireUtil > 80 ? 'bg-red-500' : sapphireUtil && sapphireUtil > 50 ? 'bg-yellow-500' : 'bg-green-500'} showPercent={false} />
            </div>
          )}
          {studentLoan && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Student Loan</span>
              <span className="text-red-500">{formatCurrency(Math.abs(studentLoan.balance))}</span>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

// ── Card 6: Upcoming (next 7 days) ────────────────────────────────────────────

const UPCOMING_CARD_CREDITS = [
  { label: '$50 Sapphire hotel credit', expiry: '2026-06-30' },
  { label: '$50 Hilton credit', expiry: '2026-06-30' },
  { label: '$150 StubHub credit', expiry: '2026-06-30' },
];

function UpcomingCard() {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSONAL_TASKS_KEY);
      if (stored) setPersonalTasks(JSON.parse(stored));
    } catch {}
    (async () => {
      try {
        const res = await fetch(`${CMS_BASE}/api/tasks`);
        if (res.ok) setWorkTasks(Array.isArray(await res.json()) ? await res.json() : []);
      } catch {}
    })();
  }, []);

  const t = todayStr();
  const OPEN_STATUSES = ['To Do', 'Open', 'In Progress'];

  const items: Array<{ date: string; label: string; type: string }> = [
    ...personalTasks
      .filter(t2 => !t2.done && isDueWithin7Days(getPersonalTaskDate(t2)) && !isOverdueOrToday(getPersonalTaskDate(t2)))
      .map(t2 => ({ date: getPersonalTaskDate(t2)!, label: t2.title, type: 'personal' })),
    ...workTasks
      .filter(t2 => OPEN_STATUSES.includes(t2.status) && isDueWithin7Days(t2.dueDate) && !isOverdueOrToday(t2.dueDate))
      .map(t2 => ({ date: t2.dueDate!, label: t2.title, type: 'work' })),
    ...UPCOMING_CARD_CREDITS
      .filter(c => isDueWithin7Days(c.expiry))
      .map(c => ({ date: c.expiry, label: c.label, type: 'credit' })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  void t;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-purple-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Upcoming (7 Days)</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing coming up in the next 7 days.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 8).map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                item.type === 'personal' ? 'bg-indigo-400' : item.type === 'work' ? 'bg-amber-400' : 'bg-orange-400'
              }`} />
              <span className="flex-1 text-gray-800 dark:text-gray-200 truncate">{item.label}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(item.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Card 7: Goals Progress ────────────────────────────────────────────────────

function GoalsProgressCard({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    setGoals(goalsStorage.get());
  }, []);

  const activeGoals = goals
    .filter(g => g.milestones.length > 0)
    .map(g => ({
      ...g,
      pct: g.milestones.length > 0
        ? Math.round((g.milestones.filter(m => m.completed).length / g.milestones.length) * 100)
        : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Goals Progress</h3>
      </div>
      {activeGoals.length === 0 ? (
        <p className="text-sm text-gray-500">No goals yet.</p>
      ) : (
        <div className="space-y-3">
          {activeGoals.map(g => (
            <div key={g.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{g.title}</span>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {g.milestones.filter(m => m.completed).length}/{g.milestones.length}
                </span>
              </div>
              <ProgressBar value={g.pct} showPercent={true} />
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onSwitchTab('goals')}
        className="mt-2 text-xs text-indigo-500 hover:underline"
      >
        View all goals →
      </button>
    </Card>
  );
}

// ── Card 8: Quick Add Task ────────────────────────────────────────────────────

function QuickAddTaskCard() {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saved, setSaved] = useState(false);

  function handleAdd() {
    if (!title.trim()) return;
    try {
      const stored = localStorage.getItem(PERSONAL_TASKS_KEY);
      const tasks: PersonalTask[] = stored ? JSON.parse(stored) : [];
      const newTask: PersonalTask = {
        id: crypto.randomUUID(),
        title: title.trim(),
        dueDate: dueDate || undefined,
        done: false,
        createdAt: new Date().toISOString(),
        recurrence: 'none',
      };
      localStorage.setItem(PERSONAL_TASKS_KEY, JSON.stringify([newTask, ...tasks]));
      setTitle('');
      setDueDate('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Plus size={16} className="text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick Add Task</h3>
      </div>
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Task title..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <Button onClick={handleAdd} disabled={!title.trim()} className="w-full">
          {saved ? (
            <><CheckCircle2 size={14} /> Saved!</>
          ) : (
            <><Plus size={14} /> Add Personal Task</>
          )}
        </Button>
      </div>
    </Card>
  );
}

// ── Main SummarySection ───────────────────────────────────────────────────────

interface SummarySectionProps {
  onSwitchTab?: (tab: string) => void;
}

export default function SummarySection({ onSwitchTab }: SummarySectionProps) {
  const switchTab = onSwitchTab ?? (() => {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard size={20} className="text-indigo-500" />
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Summary</h2>
          <p className="text-sm text-gray-500">Command center — everything at a glance</p>
        </div>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <TodayFocusCard onSwitchTab={switchTab} />
        <CardActionsCard onSwitchTab={switchTab} />
        <HabitsTodayCard />
        <PlantsCard />
        <FinanceSnapshotCard />
        <UpcomingCard />
        <GoalsProgressCard onSwitchTab={switchTab} />
        <QuickAddTaskCard />
      </div>
    </div>
  );
}
