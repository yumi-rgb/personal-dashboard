/**
 * SharePoint-backed API client for the personal dashboard.
 * Mirrors the localStorage/Supabase storage interface so components can swap
 * backends without changes.  Falls back to localStorage if the API is
 * unreachable (e.g. offline or tunnel down).
 */

import { Habit, Goal, PointEvent, SavingsGoal } from '@/lib/types';

export const API_BASE =
  process.env.NEXT_PUBLIC_DASHBOARD_API_URL || 'http://localhost:3005';

// ---------------------------------------------------------------------------
// Low-level fetch helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export const apiHabitsStorage = {
  get: async (): Promise<Habit[]> => {
    try {
      const rows = await apiFetch<Array<{
        id: string; title: string; createdDate: string; completedDates: string[];
      }>>('/api/dashboard/habits');
      // Normalize SharePoint shape → Habit shape
      return rows.map(r => ({
        id: r.id,
        name: r.title,
        createdAt: r.createdDate,
        completedDates: r.completedDates ?? [],
      }));
    } catch {
      return lsGet<Habit[]>('dashboard_habits', []);
    }
  },

  set: async (habits: Habit[]): Promise<void> => {
    try {
      // Fetch current list to reconcile creates / updates / deletes
      const existing = await apiFetch<Array<{ id: string; title: string }>>('/api/dashboard/habits');
      const existingIds = new Set(existing.map(e => e.id));
      const incomingIds = new Set(habits.map(h => h.id));

      // Create new ones
      for (const h of habits) {
        if (!existingIds.has(h.id)) {
          await apiFetch('/api/dashboard/habits', {
            method: 'POST',
            body: JSON.stringify({
              title: h.name,
              createdDate: h.createdAt,
              completedDates: h.completedDates,
            }),
          });
        } else {
          // Update existing
          await apiFetch(`/api/dashboard/habits/${h.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              title: h.name,
              createdDate: h.createdAt,
              completedDates: h.completedDates,
            }),
          });
        }
      }

      // Delete removed ones
      for (const e of existing) {
        if (!incomingIds.has(e.id)) {
          await apiFetch(`/api/dashboard/habits/${e.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      lsSet('dashboard_habits', habits);
    }
  },
};

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export const apiGoalsStorage = {
  get: async (): Promise<Goal[]> => {
    try {
      const rows = await apiFetch<Array<{
        id: string; title: string; description: string;
        targetDate: string; milestones: Goal['milestones']; createdDate: string;
      }>>('/api/dashboard/goals');
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        targetDate: r.targetDate,
        milestones: r.milestones ?? [],
        createdAt: r.createdDate,
      }));
    } catch {
      return lsGet<Goal[]>('dashboard_goals', []);
    }
  },

  set: async (goals: Goal[]): Promise<void> => {
    try {
      const existing = await apiFetch<Array<{ id: string }>>('/api/dashboard/goals');
      const existingIds = new Set(existing.map(e => e.id));
      const incomingIds = new Set(goals.map(g => g.id));

      for (const g of goals) {
        const payload = {
          title: g.title,
          description: g.description,
          targetDate: g.targetDate,
          milestones: g.milestones,
          createdDate: g.createdAt,
        };
        if (!existingIds.has(g.id)) {
          await apiFetch('/api/dashboard/goals', { method: 'POST', body: JSON.stringify(payload) });
        } else {
          await apiFetch(`/api/dashboard/goals/${g.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        }
      }
      for (const e of existing) {
        if (!incomingIds.has(e.id)) {
          await apiFetch(`/api/dashboard/goals/${e.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      lsSet('dashboard_goals', goals);
    }
  },
};

// ---------------------------------------------------------------------------
// Personal tasks (generic — mirrors supabasePersonalTasksStorage interface)
// ---------------------------------------------------------------------------

export const apiPersonalTasksStorage = {
  get: async <T extends { id: string }>(fallback: T[] = []): Promise<T[]> => {
    try {
      return await apiFetch<T[]>('/api/dashboard/tasks');
    } catch {
      return lsGet<T[]>('personal-tasks-v1', fallback);
    }
  },

  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    try {
      const existing = await apiFetch<Array<{ id: string }>>('/api/dashboard/tasks');
      const existingIds = new Set(existing.map(e => e.id));
      const incomingIds = new Set(items.map(i => i.id));

      for (const item of items) {
        if (!existingIds.has(item.id)) {
          await apiFetch('/api/dashboard/tasks', { method: 'POST', body: JSON.stringify(item) });
        } else {
          await apiFetch(`/api/dashboard/tasks/${item.id}`, { method: 'PATCH', body: JSON.stringify(item) });
        }
      }
      for (const e of existing) {
        if (!incomingIds.has(e.id)) {
          await apiFetch(`/api/dashboard/tasks/${e.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      lsSet('personal-tasks-v1', items);
    }
  },
};

// ---------------------------------------------------------------------------
// Hobbies (singleton blob)
// ---------------------------------------------------------------------------

export const apiHobbiesStorage = {
  get: async <T>(fallback: T): Promise<T> => {
    try {
      const data = await apiFetch<T | null>('/api/dashboard/hobbies');
      return data ?? fallback;
    } catch {
      return lsGet<T>('hobbies-v1', fallback);
    }
  },

  set: async <T>(data: T): Promise<void> => {
    try {
      await apiFetch('/api/dashboard/hobbies', { method: 'PUT', body: JSON.stringify(data) });
    } catch {
      lsSet('hobbies-v1', data);
    }
  },
};

// ---------------------------------------------------------------------------
// Points log
// ---------------------------------------------------------------------------

export const apiPointsStorage = {
  get: async (): Promise<PointEvent[]> => {
    try {
      const rows = await apiFetch<Array<{
        id: string; eventDate: string; action: string;
        description: string; points: number; eventKey: string; timestamp: number;
      }>>('/api/dashboard/points');
      return rows.map(r => ({
        id: r.id,
        date: r.eventDate,
        action: r.action,
        description: r.description,
        points: r.points,
        key: r.eventKey || undefined,
        timestamp: r.timestamp,
      }));
    } catch {
      return lsGet<PointEvent[]>('dashboard_points_log', []);
    }
  },

  award: async (event: Omit<PointEvent, 'id' | 'timestamp'>): Promise<PointEvent | null> => {
    try {
      const payload = {
        eventDate: event.date,
        action: event.action,
        description: event.description,
        points: event.points,
        eventKey: event.key ?? '',
        timestamp: Date.now(),
      };
      const created = await apiFetch<{
        id: string; eventDate: string; action: string;
        description: string; points: number; eventKey: string; timestamp: number;
      }>('/api/dashboard/points', { method: 'POST', body: JSON.stringify(payload) });
      return {
        id: created.id,
        date: created.eventDate,
        action: created.action,
        description: created.description,
        points: created.points,
        key: created.eventKey || undefined,
        timestamp: created.timestamp,
      };
    } catch (err) {
      // 409 means duplicate key — return null (same contract as localStorage award)
      if (err instanceof Error && err.message.includes('409')) return null;
      // Offline fallback: write to localStorage
      const log = lsGet<PointEvent[]>('dashboard_points_log', []);
      if (event.key && log.some(e => e.key === event.key)) return null;
      const newEvent: PointEvent = {
        ...event,
        id: `ls-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };
      lsSet('dashboard_points_log', [...log, newEvent]);
      return newEvent;
    }
  },
};

// ---------------------------------------------------------------------------
// Savings goals
// ---------------------------------------------------------------------------

export const apiSavingsGoalsStorage = {
  get: async <T extends { id: string }>(fallback: T[] = []): Promise<T[]> => {
    try {
      return await apiFetch<T[]>('/api/dashboard/savings-goals');
    } catch {
      return lsGet<T[]>('savings-goals-v1', fallback);
    }
  },

  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    try {
      const existing = await apiFetch<Array<{ id: string }>>('/api/dashboard/savings-goals');
      const existingIds = new Set(existing.map(e => e.id));
      const incomingIds = new Set(items.map(i => i.id));

      for (const item of items) {
        if (!existingIds.has(item.id)) {
          await apiFetch('/api/dashboard/savings-goals', { method: 'POST', body: JSON.stringify(item) });
        } else {
          await apiFetch(`/api/dashboard/savings-goals/${item.id}`, { method: 'PATCH', body: JSON.stringify(item) });
        }
      }
      for (const e of existing) {
        if (!incomingIds.has(e.id)) {
          await apiFetch(`/api/dashboard/savings-goals/${e.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      lsSet('savings-goals-v1', items);
    }
  },
};

// ---------------------------------------------------------------------------
// EE Bonds
// ---------------------------------------------------------------------------

export const apiEEBondsStorage = {
  get: async <T extends { id: string }>(fallback: T[] = []): Promise<T[]> => {
    try {
      return await apiFetch<T[]>('/api/dashboard/ee-bonds');
    } catch {
      return lsGet<T[]>('ee-bonds-v1', fallback);
    }
  },

  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    try {
      const existing = await apiFetch<Array<{ id: string }>>('/api/dashboard/ee-bonds');
      const existingIds = new Set(existing.map(e => e.id));
      const incomingIds = new Set(items.map(i => i.id));

      for (const item of items) {
        if (!existingIds.has(item.id)) {
          await apiFetch('/api/dashboard/ee-bonds', { method: 'POST', body: JSON.stringify(item) });
        } else {
          await apiFetch(`/api/dashboard/ee-bonds/${item.id}`, { method: 'PATCH', body: JSON.stringify(item) });
        }
      }
      for (const e of existing) {
        if (!incomingIds.has(e.id)) {
          await apiFetch(`/api/dashboard/ee-bonds/${e.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      lsSet('ee-bonds-v1', items);
    }
  },
};

// ---------------------------------------------------------------------------
// Net worth trend
// ---------------------------------------------------------------------------

export const apiNetWorthTrendStorage = {
  get: async <T extends { id: string }>(fallback: T[] = []): Promise<T[]> => {
    try {
      return await apiFetch<T[]>('/api/dashboard/networth-trend');
    } catch {
      return lsGet<T[]>('networth-trend-v1', fallback);
    }
  },

  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    try {
      const existing = await apiFetch<Array<{ id: string }>>('/api/dashboard/networth-trend');
      const existingIds = new Set(existing.map(e => e.id));
      const incomingIds = new Set(items.map(i => i.id));

      for (const item of items) {
        if (!existingIds.has(item.id)) {
          await apiFetch('/api/dashboard/networth-trend', { method: 'POST', body: JSON.stringify(item) });
        }
        // Note: no PATCH for net worth snapshots — they are append-only by design
      }
      for (const e of existing) {
        if (!incomingIds.has(e.id)) {
          await apiFetch(`/api/dashboard/networth-trend/${e.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      lsSet('networth-trend-v1', items);
    }
  },
};
