/**
 * One-time migration utility: reads all existing localStorage data and uploads
 * it to Supabase. Safe to call multiple times — uses upsert so it won't
 * create duplicates.
 *
 * Usage (run once from browser console or a migration page):
 *   import { migrateLocalStorageToSupabase } from '@/lib/migrateToSupabase';
 *   await migrateLocalStorageToSupabase();
 */

import {
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

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface MigrationResult {
  migrated: string[];
  skipped: string[];
  errors: { key: string; error: string }[];
}

export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: [], skipped: [], errors: [] };

  async function migrate(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      result.migrated.push(label);
    } catch (err) {
      result.errors.push({ key: label, error: String(err) });
    }
  }

  // Habits
  const habits = lsGet<unknown[]>('dashboard_habits', []);
  if (habits.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('habits', () => supabaseHabitsStorage.set(habits as any));
  } else {
    result.skipped.push('habits');
  }

  // Health
  const health = lsGet<unknown | null>('dashboard_health', null);
  if (health) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('health', () => supabaseHealthStorage.set(health as any));
  } else {
    result.skipped.push('health');
  }

  // Goals
  const goals = lsGet<unknown[]>('dashboard_goals', []);
  if (goals.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('goals', () => supabaseGoalsStorage.set(goals as any));
  } else {
    result.skipped.push('goals');
  }

  // Points log
  const pointsLog = lsGet<unknown[]>('dashboard_points_log', []);
  if (pointsLog.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('points_log', () => supabasePointsLogStorage.set(pointsLog as any));
  } else {
    result.skipped.push('points_log');
  }

  // Rewards
  const rewards = lsGet<unknown[]>('dashboard_rewards', []);
  if (rewards.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('rewards', () => supabaseRewardsStorage.set(rewards as any));
  } else {
    result.skipped.push('rewards');
  }

  // Home data
  const home = lsGet<unknown | null>('dashboard_home', null);
  if (home) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('home_data', () => supabaseHomeStorage.set(home as any));
  } else {
    result.skipped.push('home_data');
  }

  // Hobbies
  const hobbies = lsGet<unknown | null>('hobbies-v1', null);
  if (hobbies) {
    await migrate('hobbies_data', () => supabaseHobbiesStorage.set(hobbies));
  } else {
    result.skipped.push('hobbies_data');
  }

  // Personal tasks
  const personalTasks = lsGet<unknown[]>('personal-tasks-v1', []);
  if (personalTasks.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('personal_tasks', () => supabasePersonalTasksStorage.set(personalTasks as any));
  } else {
    result.skipped.push('personal_tasks');
  }

  // Card benefits
  const cardBenefits = lsGet<unknown | null>('card-benefits-v1', null);
  if (cardBenefits) {
    await migrate('card_benefits', () => supabaseCardBenefitsStorage.set(cardBenefits));
  } else {
    result.skipped.push('card_benefits');
  }

  // Tax filing
  const taxFiling = lsGet<unknown | null>('tax-filing-v1', null);
  if (taxFiling) {
    await migrate('tax_filing', () => supabaseTaxFilingStorage.set(taxFiling));
  } else {
    result.skipped.push('tax_filing');
  }

  // EE Bonds
  const eeBonds = lsGet<unknown[]>('ee-bonds-v1', []);
  if (eeBonds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('ee_bonds', () => supabaseEEBondsStorage.set(eeBonds as any));
  } else {
    result.skipped.push('ee_bonds');
  }

  // Savings goals
  const savingsGoals = lsGet<unknown[]>('savings-goals-v1', []);
  if (savingsGoals.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('savings_goals', () => supabaseSavingsGoalsStorage.set(savingsGoals as any));
  } else {
    result.skipped.push('savings_goals');
  }

  // Net worth trend
  const networthTrend = lsGet<unknown[]>('networth-trend-v1', []);
  if (networthTrend.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate('networth_trend', () => supabaseNetworthTrendStorage.set(networthTrend as any));
  } else {
    result.skipped.push('networth_trend');
  }

  // Cleaning checklist
  const cleaningChecklist = lsGet<unknown | null>('cleaning-checklist-v1', null);
  if (cleaningChecklist) {
    await migrate('cleaning_checklist', () => supabaseCleaningChecklistStorage.set(cleaningChecklist));
  } else {
    result.skipped.push('cleaning_checklist');
  }

  console.log('[migrateToSupabase] Done:', result);
  return result;
}
