'use client';

import { useState } from 'react';
import { CheckSquare, Heart, DollarSign, Home, Target, Trophy, ListTodo, CreditCard, Sprout, LayoutDashboard } from 'lucide-react';
import HabitsSection from './sections/HabitsSection';
import HealthSection from './sections/HealthSection';
import FinancesSection from './sections/FinancesSection';
import HomeSection from './sections/HomeSection';
import GoalsSection from './sections/GoalsSection';
import RewardsSection from './sections/RewardsSection';
import TasksSection from './sections/TasksSection';
import CardsSection from './sections/CardsSection';
import HobbiesSection from './sections/HobbiesSection';
import SummarySection from './sections/SummarySection';
import { PointsProvider, usePoints } from '@/lib/PointsContext';
import { useSyncStatus, SyncState } from '@/lib/useSyncStatus';

const TABS = [
  { id: 'summary', label: 'Summary', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: CheckSquare },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'finances', label: 'Finances', icon: DollarSign },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'hobbies', label: 'Hobbies', icon: Sprout },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
] as const;

type TabId = typeof TABS[number]['id'];

function SyncIndicator({ state }: { state: SyncState }) {
  const isConfigured =
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!isConfigured) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs" title={
      state === 'syncing' ? 'Syncing to cloud…'
      : state === 'synced' ? 'Synced'
      : state === 'error' ? 'Sync error'
      : 'Cloud sync active'
    }>
      {state === 'syncing' && (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="hidden sm:inline text-blue-500 dark:text-blue-400">Syncing</span>
        </>
      )}
      {state === 'synced' && (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          <span className="hidden sm:inline text-green-600 dark:text-green-400">Synced</span>
        </>
      )}
      {state === 'error' && (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span className="hidden sm:inline text-red-500">Sync error</span>
        </>
      )}
      {state === 'idle' && (
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 opacity-60" />
      )}
    </div>
  );
}

function HeaderPoints() {
  const { spendable, totalEarned, levelInfo } = usePoints();
  return (
    <div className="flex items-center gap-3">
      {/* Level badge */}
      <div className="hidden md:flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-amber-500 dark:text-amber-400">{levelInfo.title}</span>
          {levelInfo.nextThreshold !== null && (
            <span className="text-xs text-gray-400">
              ({totalEarned}/{levelInfo.nextThreshold} pts)
            </span>
          )}
        </div>
        {/* Progress bar to next level */}
        <div className="w-32 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>
      {/* Point balances */}
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
        <Trophy size={14} className="text-amber-500" />
        <div className="flex flex-col leading-none">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
            {spendable.toLocaleString()} pts
          </span>
          <span className="text-[10px] text-amber-500 dark:text-amber-500">
            {totalEarned.toLocaleString()} earned
          </span>
        </div>
      </div>
    </div>
  );
}

function DashboardInner() {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const syncStatus = useSyncStatus();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
              Personal Dashboard
            </h1>
            <SyncIndicator state={syncStatus.state} />
          </div>
          <nav className="flex gap-1 flex-1 justify-center overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                  activeTab === id
                    ? id === 'rewards'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={16} className={id === 'rewards' && activeTab === id ? 'text-amber-600' : ''} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex-shrink-0">
            <HeaderPoints />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'summary' && <SummarySection onSwitchTab={(tab) => setActiveTab(tab as TabId)} />}
        {activeTab === 'habits' && <HabitsSection />}
        {activeTab === 'health' && <HealthSection />}
        {activeTab === 'tasks' && <TasksSection />}
        {activeTab === 'finances' && <FinancesSection />}
        {activeTab === 'cards' && <CardsSection />}
        {activeTab === 'hobbies' && <HobbiesSection />}
        {activeTab === 'home' && <HomeSection />}
        {activeTab === 'goals' && <GoalsSection />}
        {activeTab === 'rewards' && <RewardsSection />}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <PointsProvider>
      <DashboardInner />
    </PointsProvider>
  );
}
