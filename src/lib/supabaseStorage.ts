/**
 * Supabase storage layer — mirrors the storage.ts API but persists to Supabase.
 * Falls back to localStorage when NEXT_PUBLIC_SUPABASE_URL is not configured.
 */

import { Habit, HealthData, Goal, PointEvent, Reward, DEFAULT_REWARDS, HomeData } from './types';
import { generateId } from './utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSupabaseConfigured(): boolean {
  return (
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function getSupabase() {
  const { supabase } = await import('./supabase');
  return supabase;
}

/** Read all rows from a collection table, return array of their data payloads. */
async function fetchCollection<T extends { id: string }>(table: string): Promise<T[]> {
  const sb = await getSupabase();
  const { data, error } = await sb.from(table).select('data');
  if (error) throw error;
  return (data ?? []).map((row: { data: T }) => row.data as T);
}

/** Upsert a collection (each item stored as its own row keyed by item.id). */
async function upsertCollection<T extends { id: string }>(table: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const sb = await getSupabase();
  const rows = items.map(item => ({ id: item.id, data: item, updated_at: new Date().toISOString() }));
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

/** Delete rows that are no longer in the items list. */
async function deleteRemovedRows<T extends { id: string }>(table: string, items: T[]): Promise<void> {
  const sb = await getSupabase();
  const existing = await fetchCollection<T>(table);
  const currentIds = new Set(items.map(i => i.id));
  const toDelete = existing.filter(i => !currentIds.has(i.id)).map(i => i.id);
  if (toDelete.length === 0) return;
  const { error } = await sb.from(table).delete().in('id', toDelete);
  if (error) throw error;
}

/** Full replace of a collection: upsert current items + delete removed ones. */
async function setCollection<T extends { id: string }>(table: string, items: T[]): Promise<void> {
  await upsertCollection(table, items);
  await deleteRemovedRows(table, items);
}

/** Read a singleton row (id = 'singleton'). Returns null if not found. */
async function fetchSingleton<T>(table: string): Promise<T | null> {
  const sb = await getSupabase();
  const { data, error } = await sb.from(table).select('data').eq('id', 'singleton').maybeSingle();
  if (error) throw error;
  return data ? (data.data as T) : null;
}

/** Upsert a singleton row (id = 'singleton'). */
async function setSingleton<T>(table: string, value: T): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb
    .from(table)
    .upsert({ id: 'singleton', data: value, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// localStorage fallback helpers (client-side only)
// ---------------------------------------------------------------------------

const LS_KEYS = {
  habits: 'dashboard_habits',
  health: 'dashboard_health',
  goals: 'dashboard_goals',
  pointsLog: 'dashboard_points_log',
  rewards: 'dashboard_rewards',
  home: 'dashboard_home',
  hobbies: 'hobbies-v1',
  personalTasks: 'personal-tasks-v1',
  cardBenefits: 'card-benefits-v1',
  taxFiling: 'tax-filing-v1',
  eeBonds: 'ee-bonds-v1',
  savingsGoals: 'savings-goals-v1',
  networthTrend: 'networth-trend-v1',
  cleaningChecklist: 'cleaning-checklist-v1',
} as const;

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
// Default values
// ---------------------------------------------------------------------------

const defaultHealth: HealthData = {
  workouts: [],
  weights: [],
  bodyMetrics: [],
  metricNames: ['Waist', 'Chest', 'Hips', 'Biceps'],
};

const defaultHome: HomeData = {
  chores: [],
  shoppingList: [],
};

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export const supabaseHabitsStorage = {
  get: async (): Promise<Habit[]> => {
    if (!isSupabaseConfigured()) return lsGet<Habit[]>(LS_KEYS.habits, []);
    try {
      return await fetchCollection<Habit>('habits');
    } catch {
      return lsGet<Habit[]>(LS_KEYS.habits, []);
    }
  },
  set: async (habits: Habit[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.habits, habits); return; }
    try {
      await setCollection('habits', habits);
    } catch {
      lsSet(LS_KEYS.habits, habits);
    }
  },
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const supabaseHealthStorage = {
  get: async (): Promise<HealthData> => {
    if (!isSupabaseConfigured()) return lsGet<HealthData>(LS_KEYS.health, defaultHealth);
    try {
      return (await fetchSingleton<HealthData>('health')) ?? defaultHealth;
    } catch {
      return lsGet<HealthData>(LS_KEYS.health, defaultHealth);
    }
  },
  set: async (data: HealthData): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.health, data); return; }
    try {
      await setSingleton('health', data);
    } catch {
      lsSet(LS_KEYS.health, data);
    }
  },
};

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export const supabaseGoalsStorage = {
  get: async (): Promise<Goal[]> => {
    if (!isSupabaseConfigured()) return lsGet<Goal[]>(LS_KEYS.goals, []);
    try {
      return await fetchCollection<Goal>('goals');
    } catch {
      return lsGet<Goal[]>(LS_KEYS.goals, []);
    }
  },
  set: async (goals: Goal[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.goals, goals); return; }
    try {
      await setCollection('goals', goals);
    } catch {
      lsSet(LS_KEYS.goals, goals);
    }
  },
};

// ---------------------------------------------------------------------------
// Points log
// ---------------------------------------------------------------------------

export const supabasePointsLogStorage = {
  get: async (): Promise<PointEvent[]> => {
    if (!isSupabaseConfigured()) return lsGet<PointEvent[]>(LS_KEYS.pointsLog, []);
    try {
      return await fetchCollection<PointEvent>('points_log');
    } catch {
      return lsGet<PointEvent[]>(LS_KEYS.pointsLog, []);
    }
  },
  set: async (log: PointEvent[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.pointsLog, log); return; }
    try {
      await setCollection('points_log', log);
    } catch {
      lsSet(LS_KEYS.pointsLog, log);
    }
  },
  award: async (event: Omit<PointEvent, 'id' | 'timestamp'>): Promise<PointEvent | null> => {
    const log = await supabasePointsLogStorage.get();
    if (event.key && log.some(e => e.key === event.key)) return null;
    const newEvent: PointEvent = { ...event, id: generateId(), timestamp: Date.now() };
    await supabasePointsLogStorage.set([...log, newEvent]);
    return newEvent;
  },
  hasKey: async (key: string): Promise<boolean> => {
    const log = await supabasePointsLogStorage.get();
    return log.some(e => e.key === key);
  },
};

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export const supabaseRewardsStorage = {
  get: async (): Promise<Reward[]> => {
    if (!isSupabaseConfigured()) {
      const stored = lsGet<Reward[]>(LS_KEYS.rewards, []);
      if (stored.length === 0) {
        const defaults: Reward[] = DEFAULT_REWARDS.map(r => ({ ...r, id: generateId() }));
        lsSet(LS_KEYS.rewards, defaults);
        return defaults;
      }
      return stored;
    }
    try {
      const stored = await fetchSingleton<Reward[]>('rewards');
      if (!stored || stored.length === 0) {
        const defaults: Reward[] = DEFAULT_REWARDS.map(r => ({ ...r, id: generateId() }));
        await setSingleton('rewards', defaults);
        return defaults;
      }
      return stored;
    } catch {
      return lsGet<Reward[]>(LS_KEYS.rewards, []);
    }
  },
  set: async (rewards: Reward[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.rewards, rewards); return; }
    try {
      await setSingleton('rewards', rewards);
    } catch {
      lsSet(LS_KEYS.rewards, rewards);
    }
  },
};

// ---------------------------------------------------------------------------
// Home data
// ---------------------------------------------------------------------------

export const supabaseHomeStorage = {
  get: async (): Promise<HomeData> => {
    if (!isSupabaseConfigured()) return lsGet<HomeData>(LS_KEYS.home, defaultHome);
    try {
      return (await fetchSingleton<HomeData>('home_data')) ?? defaultHome;
    } catch {
      return lsGet<HomeData>(LS_KEYS.home, defaultHome);
    }
  },
  set: async (data: HomeData): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.home, data); return; }
    try {
      await setSingleton('home_data', data);
    } catch {
      lsSet(LS_KEYS.home, data);
    }
  },
};

// ---------------------------------------------------------------------------
// Hobbies data (raw JSON blob)
// ---------------------------------------------------------------------------

export const supabaseHobbiesStorage = {
  get: async <T>(fallback: T): Promise<T> => {
    if (!isSupabaseConfigured()) return lsGet<T>(LS_KEYS.hobbies, fallback);
    try {
      return (await fetchSingleton<T>('hobbies_data')) ?? fallback;
    } catch {
      return lsGet<T>(LS_KEYS.hobbies, fallback);
    }
  },
  set: async <T>(data: T): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.hobbies, data); return; }
    try {
      await setSingleton('hobbies_data', data);
    } catch {
      lsSet(LS_KEYS.hobbies, data);
    }
  },
};

// ---------------------------------------------------------------------------
// Personal tasks
// ---------------------------------------------------------------------------

export const supabasePersonalTasksStorage = {
  get: async <T extends { id: string }>(fallback: T[]): Promise<T[]> => {
    if (!isSupabaseConfigured()) return lsGet<T[]>(LS_KEYS.personalTasks, fallback);
    try {
      const rows = await fetchCollection<T>('personal_tasks');
      return rows.length > 0 ? rows : fallback;
    } catch {
      return lsGet<T[]>(LS_KEYS.personalTasks, fallback);
    }
  },
  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.personalTasks, items); return; }
    try {
      await setCollection('personal_tasks', items);
    } catch {
      lsSet(LS_KEYS.personalTasks, items);
    }
  },
};

// ---------------------------------------------------------------------------
// Card benefits
// ---------------------------------------------------------------------------

export const supabaseCardBenefitsStorage = {
  get: async <T>(fallback: T): Promise<T> => {
    if (!isSupabaseConfigured()) return lsGet<T>(LS_KEYS.cardBenefits, fallback);
    try {
      return (await fetchSingleton<T>('card_benefits')) ?? fallback;
    } catch {
      return lsGet<T>(LS_KEYS.cardBenefits, fallback);
    }
  },
  set: async <T>(data: T): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.cardBenefits, data); return; }
    try {
      await setSingleton('card_benefits', data);
    } catch {
      lsSet(LS_KEYS.cardBenefits, data);
    }
  },
};

// ---------------------------------------------------------------------------
// Tax filing
// ---------------------------------------------------------------------------

export const supabaseTaxFilingStorage = {
  get: async <T>(fallback: T): Promise<T> => {
    if (!isSupabaseConfigured()) return lsGet<T>(LS_KEYS.taxFiling, fallback);
    try {
      return (await fetchSingleton<T>('tax_filing')) ?? fallback;
    } catch {
      return lsGet<T>(LS_KEYS.taxFiling, fallback);
    }
  },
  set: async <T>(data: T): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.taxFiling, data); return; }
    try {
      await setSingleton('tax_filing', data);
    } catch {
      lsSet(LS_KEYS.taxFiling, data);
    }
  },
};

// ---------------------------------------------------------------------------
// EE Bonds
// ---------------------------------------------------------------------------

export const supabaseEEBondsStorage = {
  get: async <T extends { id: string }>(fallback: T[]): Promise<T[]> => {
    if (!isSupabaseConfigured()) return lsGet<T[]>(LS_KEYS.eeBonds, fallback);
    try {
      return await fetchCollection<T>('ee_bonds');
    } catch {
      return lsGet<T[]>(LS_KEYS.eeBonds, fallback);
    }
  },
  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.eeBonds, items); return; }
    try {
      await setCollection('ee_bonds', items);
    } catch {
      lsSet(LS_KEYS.eeBonds, items);
    }
  },
};

// ---------------------------------------------------------------------------
// Savings goals
// ---------------------------------------------------------------------------

export const supabaseSavingsGoalsStorage = {
  get: async <T extends { id: string }>(fallback: T[]): Promise<T[]> => {
    if (!isSupabaseConfigured()) return lsGet<T[]>(LS_KEYS.savingsGoals, fallback);
    try {
      return await fetchCollection<T>('savings_goals');
    } catch {
      return lsGet<T[]>(LS_KEYS.savingsGoals, fallback);
    }
  },
  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.savingsGoals, items); return; }
    try {
      await setCollection('savings_goals', items);
    } catch {
      lsSet(LS_KEYS.savingsGoals, items);
    }
  },
};

// ---------------------------------------------------------------------------
// Net worth trend
// ---------------------------------------------------------------------------

export const supabaseNetworthTrendStorage = {
  get: async <T extends { id: string }>(fallback: T[]): Promise<T[]> => {
    if (!isSupabaseConfigured()) return lsGet<T[]>(LS_KEYS.networthTrend, fallback);
    try {
      return await fetchCollection<T>('networth_trend');
    } catch {
      return lsGet<T[]>(LS_KEYS.networthTrend, fallback);
    }
  },
  set: async <T extends { id: string }>(items: T[]): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.networthTrend, items); return; }
    try {
      await setCollection('networth_trend', items);
    } catch {
      lsSet(LS_KEYS.networthTrend, items);
    }
  },
};

// ---------------------------------------------------------------------------
// Cleaning checklist
// ---------------------------------------------------------------------------

export const supabaseCleaningChecklistStorage = {
  get: async <T>(fallback: T): Promise<T> => {
    if (!isSupabaseConfigured()) return lsGet<T>(LS_KEYS.cleaningChecklist, fallback);
    try {
      return (await fetchSingleton<T>('cleaning_checklist')) ?? fallback;
    } catch {
      return lsGet<T>(LS_KEYS.cleaningChecklist, fallback);
    }
  },
  set: async <T>(data: T): Promise<void> => {
    if (!isSupabaseConfigured()) { lsSet(LS_KEYS.cleaningChecklist, data); return; }
    try {
      await setSingleton('cleaning_checklist', data);
    } catch {
      lsSet(LS_KEYS.cleaningChecklist, data);
    }
  },
};
