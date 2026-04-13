import { Habit, HealthData, FinanceData, HomeData, Goal, PointEvent, Reward, DEFAULT_REWARDS } from './types';
import { generateId } from './utils';

const KEYS = {
  habits: 'dashboard_habits',
  health: 'dashboard_health',
  finances: 'dashboard_finances',
  home: 'dashboard_home',
  goals: 'dashboard_goals',
  pointsLog: 'dashboard_points_log',
  rewards: 'dashboard_rewards',
} as const;

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Sync localStorage storage (backward compatible)
// ---------------------------------------------------------------------------

// Habits
export const habitsStorage = {
  get: (): Habit[] => get<Habit[]>(KEYS.habits, []),
  set: (habits: Habit[]) => set(KEYS.habits, habits),
};

// Health
const defaultHealth: HealthData = {
  workouts: [],
  weights: [],
  bodyMetrics: [],
  metricNames: ['Waist', 'Chest', 'Hips', 'Biceps'],
};
export const healthStorage = {
  get: (): HealthData => get<HealthData>(KEYS.health, defaultHealth),
  set: (data: HealthData) => set(KEYS.health, data),
};

// Finances
const defaultFinances: FinanceData = {
  transactions: [],
  bills: [],
  budgets: [],
  savingsGoals: [],
};
export const financeStorage = {
  get: (): FinanceData => get<FinanceData>(KEYS.finances, defaultFinances),
  set: (data: FinanceData) => set(KEYS.finances, data),
};

// Home
const defaultHome: HomeData = {
  chores: [],
  shoppingList: [],
};
export const homeStorage = {
  get: (): HomeData => get<HomeData>(KEYS.home, defaultHome),
  set: (data: HomeData) => set(KEYS.home, data),
};

// Goals
export const goalsStorage = {
  get: (): Goal[] => get<Goal[]>(KEYS.goals, []),
  set: (goals: Goal[]) => set(KEYS.goals, goals),
};

// Points log
export const pointsLogStorage = {
  get: (): PointEvent[] => get<PointEvent[]>(KEYS.pointsLog, []),
  set: (log: PointEvent[]) => set(KEYS.pointsLog, log),
  /** Award points only if the idempotency key hasn't been used yet. Returns the new event or null if already awarded. */
  award: (event: Omit<PointEvent, 'id' | 'timestamp'>): PointEvent | null => {
    const log = get<PointEvent[]>(KEYS.pointsLog, []);
    if (event.key && log.some(e => e.key === event.key)) return null;
    const newEvent: PointEvent = { ...event, id: generateId(), timestamp: Date.now() };
    set(KEYS.pointsLog, [...log, newEvent]);
    return newEvent;
  },
  hasKey: (key: string): boolean => {
    const log = get<PointEvent[]>(KEYS.pointsLog, []);
    return log.some(e => e.key === key);
  },
};

// Rewards
export const rewardsStorage = {
  get: (): Reward[] => {
    const stored = get<Reward[]>(KEYS.rewards, []);
    if (stored.length === 0) {
      // Seed default rewards
      const defaults: Reward[] = DEFAULT_REWARDS.map(r => ({ ...r, id: generateId() }));
      set(KEYS.rewards, defaults);
      return defaults;
    }
    return stored;
  },
  set: (rewards: Reward[]) => set(KEYS.rewards, rewards),
};

// Points helpers (computed from log)
export function getTotalPointsEarned(): number {
  return get<PointEvent[]>(KEYS.pointsLog, []).reduce((s, e) => s + e.points, 0);
}

export function getSpendablePoints(): number {
  const earned = getTotalPointsEarned();
  const redeemed = get<Reward[]>(KEYS.rewards, [])
    .filter(r => r.redeemed)
    .reduce((s, r) => s + r.pointCost, 0);
  return earned - redeemed;
}

// ---------------------------------------------------------------------------
// Async Supabase storage (re-exported from supabaseStorage for convenience)
// ---------------------------------------------------------------------------

export {
  supabaseHabitsStorage,
  supabaseHealthStorage,
  supabaseGoalsStorage,
  supabasePointsLogStorage,
  supabaseRewardsStorage,
  supabaseHomeStorage,
  supabaseHobbiesStorage,
  supabasePersonalTasksStorage,
  supabaseCardBenefitsStorage,
  supabaseTaxFilingStorage,
  supabaseEEBondsStorage,
  supabaseSavingsGoalsStorage,
  supabaseNetworthTrendStorage,
  supabaseCleaningChecklistStorage,
} from './supabaseStorage';
