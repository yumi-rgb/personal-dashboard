'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { PointEvent, Reward, getLevelInfo } from './types';
import { pointsLogStorage, rewardsStorage, getTotalPointsEarned, getSpendablePoints } from './storage';
import { today } from './utils';

interface Toast {
  id: number;
  message: string;
}

interface PointsContextValue {
  pointsLog: PointEvent[];
  rewards: Reward[];
  totalEarned: number;
  spendable: number;
  levelInfo: ReturnType<typeof getLevelInfo>;
  award: (event: Omit<PointEvent, 'id' | 'timestamp'>) => PointEvent | null;
  redeemReward: (rewardId: string) => boolean;
  addReward: (reward: Omit<Reward, 'id' | 'redeemed' | 'redeemedDate'>) => void;
  deleteReward: (id: string) => void;
  toasts: Toast[];
  refresh: () => void;
}

const PointsContext = createContext<PointsContextValue | null>(null);

export function PointsProvider({ children }: { children: ReactNode }) {
  const [pointsLog, setPointsLog] = useState<PointEvent[]>(() => pointsLogStorage.get());
  const [rewards, setRewards] = useState<Reward[]>(() => rewardsStorage.get());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const totalEarned = pointsLog.reduce((s, e) => s + e.points, 0);
  const redeemedCost = rewards.filter(r => r.redeemed).reduce((s, r) => s + r.pointCost, 0);
  const spendable = totalEarned - redeemedCost;
  const levelInfo = getLevelInfo(totalEarned);

  const showToast = useCallback((message: string) => {
    const id = ++toastCounter.current;
    setToasts(t => [...t, { id, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500);
  }, []);

  const award = useCallback((event: Omit<PointEvent, 'id' | 'timestamp'>): PointEvent | null => {
    const result = pointsLogStorage.award(event);
    if (result) {
      setPointsLog(pointsLogStorage.get());
      showToast(`+${result.points} pts! ${result.description}`);
    }
    return result;
  }, [showToast]);

  const redeemReward = useCallback((rewardId: string): boolean => {
    const current = rewardsStorage.get();
    const reward = current.find(r => r.id === rewardId);
    if (!reward || reward.redeemed) return false;
    const currentSpendable = getTotalPointsEarned() - current.filter(r => r.redeemed).reduce((s, r) => s + r.pointCost, 0);
    if (currentSpendable < reward.pointCost) return false;
    const updated = current.map(r =>
      r.id === rewardId ? { ...r, redeemed: true, redeemedDate: today() } : r
    );
    rewardsStorage.set(updated);
    setRewards(updated);
    showToast(`Redeemed: ${reward.name}!`);
    return true;
  }, [showToast]);

  const addReward = useCallback((reward: Omit<Reward, 'id' | 'redeemed' | 'redeemedDate'>) => {
    const current = rewardsStorage.get();
    const newReward: Reward = { ...reward, id: Date.now().toString(36), redeemed: false };
    const updated = [...current, newReward];
    rewardsStorage.set(updated);
    setRewards(updated);
  }, []);

  const deleteReward = useCallback((id: string) => {
    const current = rewardsStorage.get();
    const updated = current.filter(r => r.id !== id);
    rewardsStorage.set(updated);
    setRewards(updated);
  }, []);

  const refresh = useCallback(() => {
    setPointsLog(pointsLogStorage.get());
    setRewards(rewardsStorage.get());
  }, []);

  return (
    <PointsContext.Provider value={{
      pointsLog, rewards, totalEarned, spendable, levelInfo,
      award, redeemReward, addReward, deleteReward, toasts, refresh,
    }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-amber-400 text-amber-900 font-semibold text-sm px-4 py-2 rounded-lg shadow-lg animate-bounce-in"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </PointsContext.Provider>
  );
}

export function usePoints(): PointsContextValue {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error('usePoints must be used within PointsProvider');
  return ctx;
}
