'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, Loader2, Home, GraduationCap, CreditCard, Plus, Briefcase, Banknote, HeartPulse, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/lib/utils';

const API_BASE = 'http://localhost:3005';
const TAX_FILING_KEY = 'tax-filing-v1';
const EE_BONDS_KEY = 'ee-bonds-v1';
const SAVINGS_GOALS_KEY = 'savings-goals-v1';
const NETWORTH_TREND_KEY = 'networth-trend-v1';

// ── Net Worth Trend ───────────────────────────────────────────────────────────

interface NetWorthSnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  netWorth: number;
}

const DEFAULT_NW_SNAPSHOTS: NetWorthSnapshot[] = [
  { id: 'nw-seed-1', date: '2026-04-12', netWorth: 2550149.76 },
];

function loadNWSnapshots(): NetWorthSnapshot[] {
  try {
    const stored = localStorage.getItem(NETWORTH_TREND_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_NW_SNAPSHOTS;
}

function NetWorthTrendCard() {
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], netWorth: '' });

  useEffect(() => { setSnapshots(loadNWSnapshots()); }, []);

  function saveSnapshots(next: NetWorthSnapshot[]) {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setSnapshots(sorted);
    localStorage.setItem(NETWORTH_TREND_KEY, JSON.stringify(sorted));
  }

  function addSnapshot() {
    if (!form.date || !form.netWorth) return;
    const snap: NetWorthSnapshot = {
      id: crypto.randomUUID(),
      date: form.date,
      netWorth: parseFloat(form.netWorth.replace(/,/g, '')),
    };
    saveSnapshots([...snapshots, snap]);
    setForm({ date: new Date().toISOString().split('T')[0], netWorth: '' });
    setShowAdd(false);
  }

  function deleteSnapshot(id: string) {
    saveSnapshots(snapshots.filter(s => s.id !== id));
  }

  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date)); // newest first for display

  return (
    <Card title="Net Worth Trend">
      <div className="flex justify-end mb-3">
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={13} /> Log Snapshot
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Net Worth ($)</label>
              <input
                type="number"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="2550149.76"
                value={form.netWorth}
                onChange={e => setForm(f => ({ ...f, netWorth: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addSnapshot} disabled={!form.date || !form.netWorth}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No snapshots yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-2 px-1">Date</th>
                <th className="text-right py-2 px-1">Net Worth</th>
                <th className="text-right py-2 px-1">Change</th>
                <th className="py-2 px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((snap, idx) => {
                const prev = sorted[idx + 1]; // older entry
                const change = prev ? snap.netWorth - prev.netWorth : null;
                const pct = change !== null && prev ? (change / prev.netWorth) * 100 : null;
                return (
                  <tr key={snap.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="py-2.5 px-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{snap.date}</td>
                    <td className="py-2.5 px-1 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCurrency(snap.netWorth)}
                    </td>
                    <td className="py-2.5 px-1 text-right whitespace-nowrap">
                      {change !== null ? (
                        <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {change >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(change))}
                          {pct !== null && <span className="ml-1 opacity-70">({Math.abs(pct).toFixed(1)}%)</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-1">
                      <button onClick={() => deleteSnapshot(snap.id)} className="text-gray-200 hover:text-red-500 p-0.5">
                        <span className="text-xs">✕</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Savings Goals ─────────────────────────────────────────────────────────────

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  notes?: string;
  emoji: string;
}

const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  { id: 'sg-vehicle', name: 'Vehicle Fund', targetAmount: 20000, currentAmount: 0, emoji: '🚗' },
  { id: 'sg-remodel', name: 'Home Remodel Fund', targetAmount: 50000, currentAmount: 0, emoji: '🏠' },
  { id: 'sg-wardrobe', name: 'Wardrobe Fund', targetAmount: 2000, currentAmount: 0, emoji: '👗' },
  { id: 'sg-emergency', name: 'Emergency Fund', targetAmount: 25000, currentAmount: 0, emoji: '🌱', notes: 'Have $35k cash + $80k in accounts but no dedicated emergency fund' },
];

function loadSavingsGoals(): SavingsGoal[] {
  try {
    const stored = localStorage.getItem(SAVINGS_GOALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_SAVINGS_GOALS;
}

function SavingsGoalsCard() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', emoji: '🎯', targetAmount: '', currentAmount: '', targetDate: '', notes: '' });
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});

  useEffect(() => { setGoals(loadSavingsGoals()); }, []);

  function saveGoals(next: SavingsGoal[]) {
    setGoals(next);
    localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(next));
  }

  function addGoal() {
    if (!form.name.trim() || !form.targetAmount) return;
    const goal: SavingsGoal = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      emoji: form.emoji || '🎯',
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount || '0'),
      targetDate: form.targetDate || undefined,
      notes: form.notes.trim() || undefined,
    };
    saveGoals([...goals, goal]);
    setForm({ name: '', emoji: '🎯', targetAmount: '', currentAmount: '', targetDate: '', notes: '' });
    setShowAdd(false);
  }

  function updateAmount(id: string) {
    const val = parseFloat(editAmounts[id] ?? '');
    if (isNaN(val)) return;
    saveGoals(goals.map(g => g.id === id ? { ...g, currentAmount: val } : g));
    setEditingId(null);
  }

  function deleteGoal(id: string) {
    saveGoals(goals.filter(g => g.id !== id));
  }

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <Card title="Savings Goals">
      {/* Summary */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-500">Total saved</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalCurrent)} <span className="text-gray-400 font-normal">of {formatCurrency(totalTarget)}</span></span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, overallPct)}%` }} />
        </div>
      </div>

      <div className="space-y-3 mb-3">
        {goals.map(goal => {
          const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
          return (
            <div key={goal.id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span>{goal.emoji}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{goal.name}</span>
                  </div>
                  {goal.notes && <p className="text-xs text-gray-400 mt-0.5">{goal.notes}</p>}
                </div>
                <button onClick={() => deleteGoal(goal.id)} className="text-gray-200 hover:text-red-500 p-0.5 ml-2">
                  <span className="text-xs">✕</span>
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{formatCurrency(goal.currentAmount)} saved</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(goal.targetAmount)} goal · {pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {editingId === goal.id ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    autoFocus
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Current amount"
                    value={editAmounts[goal.id] ?? goal.currentAmount}
                    onChange={e => setEditAmounts(a => ({ ...a, [goal.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && updateAmount(goal.id)}
                  />
                  <Button size="sm" onClick={() => updateAmount(goal.id)}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingId(goal.id); setEditAmounts(a => ({ ...a, [goal.id]: String(goal.currentAmount) })); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Update amount
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={13} /> Add Goal
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Goal name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Emoji (e.g. 🚗)"
              value={form.emoji}
              onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="number"
              className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Target amount *"
              value={form.targetAmount}
              onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
            />
            <input
              type="number"
              className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Current amount"
              value={form.currentAmount}
              onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))}
            />
          </div>
          <input
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addGoal} disabled={!form.name.trim() || !form.targetAmount}>Add Goal</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── EE Bond Tracker ───────────────────────────────────────────────────────────

interface EEBond {
  id: string;
  denomination: number;
  issueDate: string; // YYYY-MM-DD
  serialNumber?: string;
  currentValue?: number;
  maturityDate?: string;
  notes?: string;
}

function calcMaturity(issueDate: string): string {
  const d = new Date(issueDate);
  d.setFullYear(d.getFullYear() + 30);
  return d.toISOString().split('T')[0];
}

function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function loadEEBonds(): EEBond[] {
  try {
    const stored = localStorage.getItem(EE_BONDS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function EEBondCard() {
  const [bonds, setBonds] = useState<EEBond[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ denomination: '', issueDate: '', serialNumber: '', currentValue: '', notes: '' });

  useEffect(() => { setBonds(loadEEBonds()); }, []);

  function saveBonds(next: EEBond[]) {
    setBonds(next);
    localStorage.setItem(EE_BONDS_KEY, JSON.stringify(next));
  }

  function addBond() {
    if (!form.denomination || !form.issueDate) return;
    const bond: EEBond = {
      id: crypto.randomUUID(),
      denomination: parseFloat(form.denomination),
      issueDate: form.issueDate,
      maturityDate: calcMaturity(form.issueDate),
      serialNumber: form.serialNumber.trim() || undefined,
      currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
      notes: form.notes.trim() || undefined,
    };
    saveBonds([...bonds, bond]);
    setForm({ denomination: '', issueDate: '', serialNumber: '', currentValue: '', notes: '' });
    setShowAdd(false);
  }

  function deleteBond(id: string) {
    saveBonds(bonds.filter(b => b.id !== id));
  }

  function updateCurrentValue(id: string, val: number) {
    saveBonds(bonds.map(b => b.id === id ? { ...b, currentValue: val } : b));
  }

  const totalValue = bonds.reduce((s, b) => s + (b.currentValue ?? b.denomination), 0);
  const pastMaturity = bonds.filter(b => b.maturityDate && daysUntilDate(b.maturityDate) < 0);

  function maturityColor(days: number): string {
    if (days < 0) return 'text-red-600 dark:text-red-400 font-semibold';
    if (days <= 365) return 'text-amber-600 dark:text-amber-400 font-medium';
    return 'text-green-600 dark:text-green-400';
  }

  return (
    <Card title="Series EE Savings Bonds">
      {pastMaturity.length > 0 && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg text-sm border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span><strong>{pastMaturity.length} bond{pastMaturity.length > 1 ? 's' : ''} past maturity!</strong> These have stopped earning interest. Redeem at your bank or TreasuryDirect.</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">
          {bonds.length} bonds · Total value: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</span>
        </div>
        <a
          href="https://www.treasurydirect.gov/BC/SBCPrice"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ExternalLink size={11} /> Look up values
        </a>
      </div>

      {bonds.length > 0 && (
        <div className="overflow-x-auto -mx-1 mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-2 px-1">Face Value</th>
                <th className="text-left py-2 px-1">Issue Date</th>
                <th className="text-left py-2 px-1">Matures</th>
                <th className="text-left py-2 px-1">Days Left</th>
                <th className="text-right py-2 px-1">Curr. Value</th>
                <th className="py-2 px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {bonds.map(bond => {
                const matDate = bond.maturityDate ?? calcMaturity(bond.issueDate);
                const days = daysUntilDate(matDate);
                return (
                  <tr key={bond.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="py-2.5 px-1 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCurrency(bond.denomination)}
                    </td>
                    <td className="py-2.5 px-1 text-gray-500 whitespace-nowrap text-xs">{bond.issueDate}</td>
                    <td className="py-2.5 px-1 text-gray-500 whitespace-nowrap text-xs">{matDate}</td>
                    <td className={`py-2.5 px-1 whitespace-nowrap text-xs ${maturityColor(days)}`}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today!' : `${days}d`}
                    </td>
                    <td className="py-2.5 px-1 text-right">
                      <input
                        type="number"
                        className="w-24 px-1.5 py-0.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-right"
                        placeholder="Enter value"
                        value={bond.currentValue ?? ''}
                        onChange={e => updateCurrentValue(bond.id, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-2.5 px-1">
                      <button onClick={() => deleteBond(bond.id)} className="text-gray-200 hover:text-red-500 p-0.5">
                        <span className="text-xs">✕</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={13} /> Add Bond
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Face Value ($) *</label>
              <input
                type="number"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g. 100"
                value={form.denomination}
                onChange={e => setForm(f => ({ ...f, denomination: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Issue Date *</label>
              <input
                type="date"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={form.issueDate}
                onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Serial number (optional)"
              value={form.serialNumber}
              onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))}
            />
            <input
              type="number"
              className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Current value (optional)"
              value={form.currentValue}
              onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
            />
          </div>
          <input
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <p className="text-xs text-gray-400">Maturity date auto-calculated as issue date + 30 years.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={addBond} disabled={!form.denomination || !form.issueDate}>Add Bond</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {bonds.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400 mt-2 text-center italic">No bonds tracked yet. Add your paper EE bonds above.</p>
      )}
    </Card>
  );
}

// ── CMSAccount ────────────────────────────────────────────────────────────────

interface CMSAccount {
  id: string;
  title: string;
  accountType: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  isActive: boolean;
  scope: string;
  accountSubType: string;
}

// ── Tax Filing ────────────────────────────────────────────────────────────────

type TaxStatus =
  | 'refund_lost'
  | 'file_now'
  | 'pending'
  | 'mailed'
  | 'filed_electronically'
  | 'not_started'
  | 'processing';

interface TaxYear {
  year: number;
  defaultStatus: TaxStatus;
  deadline: string; // display string
  deadlinePassed: boolean;
  defaultNotes: string;
}

interface TaxFilingEntry {
  year: number;
  status: TaxStatus;
  notes: string;
}

type TaxFilingState = Record<number, TaxFilingEntry>;

const TAX_YEARS: TaxYear[] = [
  { year: 2020, defaultStatus: 'refund_lost',  deadline: 'Jul 15, 2023 (passed)', deadlinePassed: true,  defaultNotes: '3-year window closed' },
  { year: 2021, defaultStatus: 'refund_lost',  deadline: 'Apr 18, 2025 (passed)', deadlinePassed: true,  defaultNotes: '3-year window closed' },
  { year: 2022, defaultStatus: 'file_now',     deadline: 'Apr 15, 2026',          deadlinePassed: false, defaultNotes: 'File by Wednesday or lose refund' },
  { year: 2023, defaultStatus: 'pending',      deadline: 'Apr 15, 2027',          deadlinePassed: false, defaultNotes: 'Still within window' },
  { year: 2024, defaultStatus: 'mailed',       deadline: 'Apr 15, 2026',          deadlinePassed: false, defaultNotes: 'Return mailed' },
  { year: 2025, defaultStatus: 'not_started',  deadline: 'Apr 15, 2027',          deadlinePassed: false, defaultNotes: 'File after 2024 processes' },
];

const TAX_STATUS_OPTIONS: { value: TaxStatus; label: string }[] = [
  { value: 'refund_lost',         label: '⚠️ Refund likely lost' },
  { value: 'file_now',            label: '🚨 FILE NOW' },
  { value: 'pending',             label: '📋 Pending' },
  { value: 'mailed',              label: '✅ Mailed' },
  { value: 'filed_electronically', label: '✅ Filed electronically' },
  { value: 'not_started',         label: '📋 Not started' },
  { value: 'processing',          label: '⏳ Processing' },
];

function taxStatusBadge(status: TaxStatus): string {
  switch (status) {
    case 'refund_lost':          return '⚠️ Refund likely lost';
    case 'file_now':             return '🚨 FILE NOW';
    case 'pending':              return '📋 Pending';
    case 'mailed':               return '✅ Mailed';
    case 'filed_electronically': return '✅ Filed electronically';
    case 'not_started':          return '📋 Not started';
    case 'processing':           return '⏳ Processing';
  }
}

function taxStatusRowClass(status: TaxStatus): string {
  switch (status) {
    case 'refund_lost': return 'bg-amber-50 dark:bg-amber-900/10';
    case 'file_now':    return 'bg-red-50 dark:bg-red-900/15';
    case 'mailed':
    case 'filed_electronically': return 'bg-green-50 dark:bg-green-900/10';
    default:            return '';
  }
}

function loadTaxFiling(): TaxFilingState {
  try {
    const stored = localStorage.getItem(TAX_FILING_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Build defaults
  const defaults: TaxFilingState = {};
  TAX_YEARS.forEach(ty => {
    defaults[ty.year] = { year: ty.year, status: ty.defaultStatus, notes: ty.defaultNotes };
  });
  return defaults;
}

function TaxFilingCard() {
  const [entries, setEntries] = useState<TaxFilingState>({});

  useEffect(() => {
    setEntries(loadTaxFiling());
  }, []);

  function updateEntry(year: number, changes: Partial<TaxFilingEntry>) {
    const next = {
      ...entries,
      [year]: { ...entries[year], ...changes },
    };
    setEntries(next);
    localStorage.setItem(TAX_FILING_KEY, JSON.stringify(next));
  }

  return (
    <Card title="Tax Filing Status">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
              <th className="text-left py-2 px-1">Year</th>
              <th className="text-left py-2 px-1">Status</th>
              <th className="text-left py-2 px-1 hidden sm:table-cell">Deadline</th>
              <th className="text-left py-2 px-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {TAX_YEARS.map(ty => {
              const entry = entries[ty.year];
              if (!entry) return null;
              return (
                <tr
                  key={ty.year}
                  className={`border-b border-gray-50 dark:border-gray-800 last:border-0 ${taxStatusRowClass(entry.status)}`}
                >
                  <td className="py-2.5 px-1 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {ty.year}
                  </td>
                  <td className="py-2.5 px-1 min-w-[160px]">
                    <select
                      className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-full"
                      value={entry.status}
                      onChange={e => updateEntry(ty.year, { status: e.target.value as TaxStatus })}
                    >
                      {TAX_STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-1 text-xs text-gray-500 whitespace-nowrap hidden sm:table-cell">
                    <span className={ty.deadlinePassed ? 'text-red-500' : ''}>{ty.deadline}</span>
                  </td>
                  <td className="py-2.5 px-1 min-w-[140px]">
                    <input
                      className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-full"
                      value={entry.notes}
                      onChange={e => updateEntry(ty.year, { notes: e.target.value })}
                      placeholder="Notes..."
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3 italic">Statuses saved locally. Update as you file.</p>
    </Card>
  );
}

// ── Debt Payoff Progress ──────────────────────────────────────────────────────

const CHASE_CURRENT = 42050.53;
const CHASE_LIMIT = 51100;
const CHASE_INTEREST_RATE_MONTHLY = 0.27 / 12; // approx 27% APR

const STUDENT_LOAN_CURRENT_STATIC = 127447;
const STUDENT_LOAN_ORIGINAL = 144537.90;

function monthsToPayoff(balance: number, monthlyPayment: number, monthlyRate: number): number | null {
  if (monthlyPayment <= balance * monthlyRate) return null; // never pays off
  return Math.ceil(-Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate));
}

function ChasePayoffCard({ currentBalance }: { currentBalance: number }) {
  const utilization = (currentBalance / CHASE_LIMIT) * 100;
  const toZeroPct = ((CHASE_LIMIT - currentBalance) / CHASE_LIMIT) * 100;

  const scenarios = [800, 1400, 2000].map(pmt => ({
    payment: pmt,
    months: monthsToPayoff(currentBalance, pmt, CHASE_INTEREST_RATE_MONTHLY),
  }));

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chase Sapphire Reserve — Payoff Progress</div>

      {/* Utilization bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Balance: {formatCurrency(currentBalance)} / limit {formatCurrency(CHASE_LIMIT)}</span>
          <span className={utilization > 90 ? 'text-red-500 font-semibold' : utilization > 70 ? 'text-amber-500' : ''}>{utilization.toFixed(1)}% of limit used</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-400' : 'bg-indigo-500'}`}
            style={{ width: `${utilization}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$0 (goal)</span>
          <span>{formatCurrency(CHASE_LIMIT)} (limit)</span>
        </div>
      </div>

      {/* Payoff scenarios */}
      <div className="text-xs font-medium text-gray-500 mb-1.5">Estimated payoff at different payment amounts:</div>
      <div className="space-y-1.5">
        {scenarios.map(({ payment, months }) => (
          <div key={payment} className="flex items-center gap-2">
            <span className="w-20 text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(payment)}/mo</span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              {months !== null && (
                <div
                  className="h-full bg-indigo-400 rounded-full"
                  style={{ width: `${Math.min(100, (1 - months / 60) * 100)}%` }}
                />
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap w-28 text-right">
              {months === null ? 'Never (min pmt)' : `${months} mo (${(months / 12).toFixed(1)} yr)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentLoanPayoffCard({ currentBalance }: { currentBalance: number }) {
  const paidOff = STUDENT_LOAN_ORIGINAL - currentBalance;
  const pctPaid = (paidOff / STUDENT_LOAN_ORIGINAL) * 100;

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student Loans — Payoff Progress</div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Paid off: {formatCurrency(paidOff)}</span>
        <span className="font-medium text-indigo-600 dark:text-indigo-400">{pctPaid.toFixed(1)}% paid down</span>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${pctPaid}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Original: {formatCurrency(STUDENT_LOAN_ORIGINAL)}</span>
        <span>Remaining: {formatCurrency(currentBalance)}</span>
      </div>
    </div>
  );
}

// ── Categorise accounts ───────────────────────────────────────────────────────

function categorise(accounts: CMSAccount[]) {
  const retirement = accounts.filter(a => a.accountType === 'Retirement' || a.accountSubType === '401k' || a.accountSubType === 'IRA');
  const hsa = accounts.filter(a => a.accountType === 'HSA');
  const investments = accounts.filter(a => a.accountType === 'Brokerage' || a.accountSubType === 'Investment');
  const cash = accounts.filter(a =>
    (a.accountType === 'Checking' || a.accountType === 'Savings' || a.accountType === 'Operating') &&
    a.scope === 'Personal' &&
    a.balance > 0
  );
  const creditCards = accounts.filter(a =>
    (a.accountType === 'Credit Card' || a.accountSubType === 'Credit Card') && a.balance < 0
  );
  const studentLoans = accounts.filter(a => a.accountType === 'Student Loan' || a.accountSubType === 'Student Loan');
  const mortgage = accounts.filter(a => a.accountType === 'Mortgage');

  return { retirement, hsa, investments, cash, creditCards, studentLoans, mortgage };
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

function AccountRow({ account, isDebt }: { account: CMSAccount; isDebt?: boolean }) {
  const displayBalance = Math.abs(account.balance);
  const last4 = account.accountNumber ? ` ···${account.accountNumber}` : '';
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{account.title}</div>
        <div className="text-xs text-gray-400">{account.bankName}{last4}</div>
      </div>
      <span className={`text-sm font-semibold flex-shrink-0 ml-4 ${isDebt ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {isDebt ? '-' : ''}{formatCurrency(displayBalance)}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, total, isDebt }: { icon: React.ElementType; label: string; total: number; isDebt?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 mb-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <Icon size={13} />
        {label}
      </div>
      <span className={`text-sm font-bold ${isDebt ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {isDebt ? '-' : ''}{formatCurrency(Math.abs(total))}
      </span>
    </div>
  );
}

export default function PersonalFinanceSection() {
  const [accounts, setAccounts] = useState<CMSAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/finance/accounts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CMSAccount[] = await res.json();
      setAccounts(data.filter(a => a.isActive && a.title));
    } catch (e) {
      setError(`Could not load accounts — is the CMS API running? (${(e as Error).message})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const { retirement, hsa, investments, cash, creditCards, studentLoans, mortgage } = categorise(accounts);

  const totalRetirement = retirement.reduce((s, a) => s + a.balance, 0);
  const totalHsa = hsa.reduce((s, a) => s + a.balance, 0);
  const totalInvestments = investments.reduce((s, a) => s + a.balance, 0);
  const totalCash = cash.reduce((s, a) => s + a.balance, 0);
  const totalAssets = totalRetirement + totalHsa + totalInvestments + totalCash;

  const totalCreditCardDebt = Math.abs(creditCards.reduce((s, a) => s + a.balance, 0));
  const totalStudentLoans = Math.abs(studentLoans.reduce((s, a) => s + a.balance, 0));
  const totalMortgage = Math.abs(mortgage.reduce((s, a) => s + a.balance, 0));
  const totalDebt = totalCreditCardDebt + totalStudentLoans + totalMortgage;

  const netWorth = totalAssets - totalDebt;

  // Debt payoff progress bars
  const MORTGAGE_ORIGINAL = 73124.86; // from 1098

  // Chase Sapphire Reserve: use live balance if found, else fallback to static
  const chaseAccount = creditCards.find(a => /chase/i.test(a.bankName) || /sapphire/i.test(a.title));
  const chaseBalance = chaseAccount ? Math.abs(chaseAccount.balance) : CHASE_CURRENT;

  // Student loans: use live balance if found, else static fallback
  const studentLoanBalance = totalStudentLoans > 0 ? totalStudentLoans : STUDENT_LOAN_CURRENT_STATIC;

  if (loading) return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" disabled><RefreshCw size={13} className="animate-spin" /> Loading…</Button>
      </div>
      <LoadingSpinner />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 flex gap-2 items-start text-sm">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      {error}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={fetchAccounts}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* ── Net Worth Hero ─────────────────────────────────────────────────── */}
      <Card title="Household Net Worth">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Assets</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAssets)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Debt</div>
            <div className="text-xl font-bold text-red-500 dark:text-red-400">-{formatCurrency(totalDebt)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Net Worth</div>
            <div className={`text-xl font-bold ${netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
              {formatCurrency(netWorth)}
            </div>
          </div>
        </div>

        {/* Assets breakdown bar */}
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between"><span>Retirement ({((totalRetirement / totalAssets) * 100).toFixed(0)}%)</span><span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(totalRetirement)}</span></div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div className="bg-indigo-500 h-full" style={{ width: `${(totalRetirement / totalAssets) * 100}%` }} />
            <div className="bg-blue-400 h-full" style={{ width: `${(totalHsa / totalAssets) * 100}%` }} />
            <div className="bg-emerald-400 h-full" style={{ width: `${(totalInvestments / totalAssets) * 100}%` }} />
            <div className="bg-teal-300 h-full" style={{ width: `${(totalCash / totalAssets) * 100}%` }} />
          </div>
          <div className="flex gap-4 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Retirement</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> HSA</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Investments</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-300 inline-block" /> Cash</span>
          </div>
        </div>
      </Card>

      {/* ── Net Worth Trend ────────────────────────────────────────────────── */}
      <NetWorthTrendCard />

      {/* ── Assets ─────────────────────────────────────────────────────────── */}
      <Card title="Assets">
        <div className="space-y-5">
          {/* Retirement */}
          {retirement.length > 0 && (
            <div>
              <SectionHeader icon={Briefcase} label="Retirement Accounts" total={totalRetirement} />
              {retirement.map(a => <AccountRow key={a.id} account={a} />)}
            </div>
          )}
          {/* HSA */}
          {hsa.length > 0 && (
            <div>
              <SectionHeader icon={HeartPulse} label="HSA" total={totalHsa} />
              {hsa.map(a => <AccountRow key={a.id} account={a} />)}
            </div>
          )}
          {/* Investments */}
          {investments.length > 0 && (
            <div>
              <SectionHeader icon={TrendingUp} label="Investments" total={totalInvestments} />
              {investments.map(a => <AccountRow key={a.id} account={a} />)}
            </div>
          )}
          {/* Cash */}
          {cash.length > 0 && (
            <div>
              <SectionHeader icon={Banknote} label="Cash & Checking" total={totalCash} />
              {cash.map(a => <AccountRow key={a.id} account={a} />)}
            </div>
          )}
          {/* Total */}
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Assets</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAssets)}</span>
          </div>
        </div>
      </Card>

      {/* ── Debts ──────────────────────────────────────────────────────────── */}
      <Card title="Debts">
        <div className="space-y-5">
          {/* Credit Cards */}
          {creditCards.length > 0 && (
            <div>
              <SectionHeader icon={CreditCard} label="Credit Cards" total={totalCreditCardDebt} isDebt />
              {creditCards.map(a => <AccountRow key={a.id} account={a} isDebt />)}
              {/* Chase Sapphire Reserve payoff progress */}
              <ChasePayoffCard currentBalance={chaseBalance} />
            </div>
          )}
          {/* Student Loans */}
          {studentLoans.length > 0 && (
            <div>
              <SectionHeader icon={GraduationCap} label="Student Loans" total={totalStudentLoans} isDebt />
              {studentLoans.map(a => <AccountRow key={a.id} account={a} isDebt />)}
              <StudentLoanPayoffCard currentBalance={studentLoanBalance} />
            </div>
          )}
          {/* Mortgage */}
          {mortgage.length > 0 && (
            <div>
              <SectionHeader icon={Home} label="Mortgage" total={totalMortgage} isDebt />
              {mortgage.map(a => <AccountRow key={a.id} account={a} isDebt />)}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Paid off</span>
                  <span>{(((MORTGAGE_ORIGINAL - totalMortgage) / MORTGAGE_ORIGINAL) * 100).toFixed(1)}% of Jan 2025 balance</span>
                </div>
                <ProgressBar value={Math.round(((MORTGAGE_ORIGINAL - totalMortgage) / MORTGAGE_ORIGINAL) * 100)} color="indigo" showPercent={false} />
                <p className="text-xs text-gray-400 mt-1">{formatCurrency(MORTGAGE_ORIGINAL - totalMortgage)} paid · {formatCurrency(totalMortgage)} remaining</p>
              </div>
            </div>
          )}
          {/* Alert: past-due student loans */}
          <div className="flex items-start gap-2 p-3 rounded-lg text-sm border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span><strong>Student loans past due:</strong> $5,388.73 overdue · $7,777.47 total due 05/08/2026</span>
          </div>
          {/* Total */}
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Debt</span>
            <span className="text-sm font-bold text-red-500 dark:text-red-400">-{formatCurrency(totalDebt)}</span>
          </div>
        </div>
      </Card>

      {/* ── Household Income ───────────────────────────────────────────────── */}
      <Card title="Household Income" titleRight={<span className="text-xs text-gray-400">2025 W-2 data</span>}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Steven Reynolds</div>
              <div className="text-xs text-gray-400">Bridgestone Americas · W-2</div>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(146359.20)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Yu Mi Kim-Reynolds</div>
              <div className="text-xs text-gray-400">YKR Law · Law firm net profit (live from CMS)</div>
            </div>
            <span className="font-semibold text-gray-500">See Business tab</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold text-gray-700 dark:text-gray-300">Steven's W-2 subtotal</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(146359.20)}</span>
          </div>
          <p className="text-xs text-gray-400 italic">Add your law firm net profit from the Business tab for total household income.</p>
        </div>
      </Card>

      {/* ── Savings Goals ──────────────────────────────────────────────────── */}
      <SavingsGoalsCard />

      {/* ── EE Bonds ───────────────────────────────────────────────────────── */}
      <EEBondCard />

      {/* ── Tax Filing Status ──────────────────────────────────────────────── */}
      <TaxFilingCard />
    </div>
  );
}
