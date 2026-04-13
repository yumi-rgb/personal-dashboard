// =====================
// HABITS
// =====================
export interface Habit {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  completedDates: string[]; // ISO date strings (YYYY-MM-DD)
}

// =====================
// HEALTH
// =====================
export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  exerciseType: string;
  duration: number; // minutes
  notes: string;
}

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // lbs
}

export interface BodyMetricEntry {
  id: string;
  date: string; // YYYY-MM-DD
  metrics: Record<string, number>; // e.g. { waist: 32, chest: 40 }
}

export interface HealthData {
  workouts: WorkoutEntry[];
  weights: WeightEntry[];
  bodyMetrics: BodyMetricEntry[];
  metricNames: string[]; // custom metric names
}

// =====================
// FINANCES
// =====================
export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  type: 'expense' | 'income';
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // day of month (1-31)
  category: string;
  isPaid: boolean;
  paidMonth?: string; // YYYY-MM
}

export interface BudgetCategory {
  id: string;
  category: string;
  monthlyLimit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  notes: string;
}

export interface FinanceData {
  transactions: Transaction[];
  bills: Bill[];
  budgets: BudgetCategory[];
  savingsGoals: SavingsGoal[];
}

// =====================
// HOME
// =====================
export type ChoreRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Chore {
  id: string;
  name: string;
  recurrence: ChoreRecurrence;
  lastCompleted?: string; // YYYY-MM-DD
  nextDue?: string; // YYYY-MM-DD
  notes: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  addedAt: string;
}

export interface HomeData {
  chores: Chore[];
  shoppingList: ShoppingItem[];
}

// =====================
// GOALS
// =====================
export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  milestones: Milestone[];
  createdAt: string;
}

// =====================
// GAMIFICATION
// =====================
export interface PointEvent {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g. 'habit_check', 'habit_bonus', 'workout', 'chore', 'milestone', 'budget_check'
  description: string;
  points: number;
  timestamp: number; // Date.now()
  key?: string; // idempotency key e.g. 'habit_{habitId}_{date}'
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointCost: number;
  redeemed: boolean;
  redeemedDate?: string; // YYYY-MM-DD
}

export const LEVEL_THRESHOLDS: { min: number; max: number; title: string }[] = [
  { min: 0, max: 99, title: 'Rookie' },
  { min: 100, max: 299, title: 'Apprentice' },
  { min: 300, max: 599, title: 'Consistent' },
  { min: 600, max: 999, title: 'Dedicated' },
  { min: 1000, max: 1999, title: 'Champion' },
  { min: 2000, max: Infinity, title: 'Legend' },
];

export function getLevelInfo(totalPoints: number): {
  title: string;
  min: number;
  max: number;
  progress: number;
  nextThreshold: number | null;
} {
  const level = LEVEL_THRESHOLDS.find(l => totalPoints >= l.min && totalPoints <= l.max)
    ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const next = LEVEL_THRESHOLDS.find(l => l.min > level.min) ?? null;
  const progress = next
    ? Math.min(100, ((totalPoints - level.min) / (next.min - level.min)) * 100)
    : 100;
  return { title: level.title, min: level.min, max: level.max, progress, nextThreshold: next ? next.min : null };
}

export const DEFAULT_REWARDS: Omit<Reward, 'id'>[] = [
  { name: 'Movie night at home', description: 'Cozy movie night', pointCost: 75, redeemed: false },
  { name: 'New book', description: 'Buy a book you\'ve been wanting', pointCost: 100, redeemed: false },
  { name: 'Nice dinner out', description: 'Treat yourself to a nice restaurant', pointCost: 300, redeemed: false },
  { name: 'Massage', description: 'Relaxing massage session', pointCost: 350, redeemed: false },
  { name: 'New outfit / shoes', description: 'Something new to wear', pointCost: 400, redeemed: false },
  { name: 'Spa day', description: 'Full spa day experience', pointCost: 500, redeemed: false },
  { name: 'Weekend trip', description: 'A fun weekend getaway', pointCost: 1000, redeemed: false },
];
