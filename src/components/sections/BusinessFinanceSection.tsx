'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, Loader2, Building2, ReceiptText, Wallet, Home, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency, formatDate } from '@/lib/utils';

// ─── API types ────────────────────────────────────────────────────────────────

interface MonthlyBreakdown {
  month: number; // 1-12
  income: number;
  expenses: number;
  netProfit: number;
}

interface PnLReport {
  year: number;
  ytdIncome: number;
  ytdExpenses: number;
  netProfit: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

interface TaxEstimate {
  year: number;
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  estimatedSETax: number;
  quarterlyEstimate: number;
}

interface AccountBalance {
  name: string;
  bank: string;
  balance: number;
  type?: string;
}

interface NetWorthReport {
  accounts: AccountBalance[];
  totalAssets: number;
  netWorth: number;
}

interface CMSTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
}

interface TransactionsResponse {
  transactions: CMSTransaction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3005';
const INCOME_GOAL_KEY = 'dashboard_income_goal';
const MORTGAGE_KEY = 'dashboard_mortgage';
const DEFAULT_GOAL = 100_000;
const YEAR = 2026;

interface MortgageData {
  balance: number;
  originalBalance: number;
  interestRate: number;
  monthlyPayment: number;
  principalPortion: number;
  interestPortion: number;
  escrowPortion: number;
  nextPaymentDate: string;
  bank: string;
  accountLast4: string;
  lastUpdated: string;
}

const DEFAULT_MORTGAGE: MortgageData = {
  balance: 63556.40,
  originalBalance: 73124.86, // Outstanding principal as of Jan 1, 2025 (per 2025 Form 1098)
  interestRate: 4.87,
  monthlyPayment: 1586.19,
  principalPortion: 499.63,
  interestPortion: 258.20,
  escrowPortion: 828.36,
  nextPaymentDate: '2026-05-01',
  bank: 'Wells Fargo',
  accountLast4: '3432',
  lastUpdated: '2026-04-09',
};

// Quarterly payment schedule: { quarterEnd, paymentDue }
const QUARTERLY_SCHEDULE = [
  { quarterEnd: `${YEAR}-03-31`, paymentDue: `${YEAR}-04-15`, label: 'Q1' },
  { quarterEnd: `${YEAR}-06-30`, paymentDue: `${YEAR}-06-15`, label: 'Q2' },
  { quarterEnd: `${YEAR}-09-30`, paymentDue: `${YEAR}-09-15`, label: 'Q3' },
  { quarterEnd: `${YEAR + 1}-01-15`, paymentDue: `${YEAR + 1}-01-15`, label: 'Q4' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** SVG bar chart: income vs expenses per month, matching the WeightChart pattern */
function MonthlyBarChart({ breakdown }: { breakdown: MonthlyBreakdown[] }) {
  const months = breakdown.filter(m => m.income > 0 || m.expenses > 0);
  if (months.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No monthly data available yet.</p>;
  }

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const W = 560;
  const H = 160;
  const pad = { l: 50, r: 10, t: 10, b: 28 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expenses)), 1);
  const barGroupW = plotW / months.length;
  const barW = Math.min(16, barGroupW * 0.38);
  const gap = 2;

  const yScale = (v: number) => pad.t + plotH - (v / maxVal) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Y grid lines + labels */}
      {yTicks.map((v, i) => {
        const y = yScale(v);
        const label = v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4" />
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">{label}</text>
          </g>
        );
      })}

      {/* Bars */}
      {months.map((m, i) => {
        const cx = pad.l + i * barGroupW + barGroupW / 2;
        const x1 = cx - barW - gap / 2;
        const x2 = cx + gap / 2;
        const incomeH = (m.income / maxVal) * plotH;
        const expenseH = (m.expenses / maxVal) * plotH;
        return (
          <g key={m.month}>
            {/* Income bar (green) */}
            <rect
              x={x1}
              y={pad.t + plotH - incomeH}
              width={barW}
              height={incomeH}
              fill="#22c55e"
              fillOpacity="0.85"
              rx="2"
            />
            {/* Expenses bar (red) */}
            <rect
              x={x2}
              y={pad.t + plotH - expenseH}
              width={barW}
              height={expenseH}
              fill="#ef4444"
              fillOpacity="0.75"
              rx="2"
            />
            {/* Month label */}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
              {MONTH_NAMES[m.month - 1]}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={pad.l} y={2} width={8} height={8} fill="#22c55e" fillOpacity="0.85" rx="1" />
      <text x={pad.l + 11} y={9} fontSize="9" fill="currentColor" fillOpacity="0.6">Income</text>
      <rect x={pad.l + 55} y={2} width={8} height={8} fill="#ef4444" fillOpacity="0.75" rx="1" />
      <text x={pad.l + 68} y={9} fontSize="9" fill="currentColor" fillOpacity="0.6">Expenses</text>
    </svg>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
      <Loader2 size={22} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
      <AlertCircle size={16} className="flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function MortgageCard() {
  const [mortgage, setMortgage] = useState<MortgageData>(() => {
    if (typeof window === 'undefined') return DEFAULT_MORTGAGE;
    const stored = localStorage.getItem(MORTGAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_MORTGAGE;
  });
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  const saveBalance = () => {
    const val = parseFloat(balanceInput);
    if (!isNaN(val) && val >= 0) {
      const updated = { ...mortgage, balance: val, lastUpdated: new Date().toISOString().split('T')[0] };
      setMortgage(updated);
      localStorage.setItem(MORTGAGE_KEY, JSON.stringify(updated));
      // Also update CMS account
      fetch(`${API_BASE}/api/finance/accounts/2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: -val }),
      }).catch(() => {/* silent */});
    }
    setEditingBalance(false);
  };

  const paidOff = mortgage.originalBalance - mortgage.balance;
  const paidOffPct = Math.min(100, (paidOff / mortgage.originalBalance) * 100);
  const daysToNext = Math.ceil((new Date(mortgage.nextPaymentDate).getTime() - Date.now()) / 86400000);

  return (
    <Card
      title="Mortgage"
      titleRight={
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Home size={13} /> Wells Fargo ···{mortgage.accountLast4}
        </span>
      }
    >
      <div className="space-y-4">
        {/* Balance + update */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Outstanding Balance</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(mortgage.balance)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{mortgage.interestRate}% interest · updated {mortgage.lastUpdated}</div>
          </div>
          <button
            onClick={() => { setBalanceInput(String(mortgage.balance)); setEditingBalance(true); }}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline"
          >
            Update balance
          </button>
        </div>

        {editingBalance && (
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number" min="0" step="0.01"
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveBalance(); if (e.key === 'Escape') setEditingBalance(false); }}
              autoFocus
            />
            <Button size="sm" onClick={saveBalance}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingBalance(false)}>Cancel</Button>
          </div>
        )}

        {/* Payoff progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Paid off: {formatCurrency(paidOff)}</span>
            <span>{Math.round(paidOffPct)}% paid</span>
          </div>
          <ProgressBar value={paidOffPct} color="bg-green-500" showPercent={false} />
          <div className="text-xs text-gray-400 mt-1">Original balance: {formatCurrency(mortgage.originalBalance)}</div>
        </div>

        {/* Monthly payment breakdown */}
        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Principal</div>
            <div className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(mortgage.principalPortion)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Interest</div>
            <div className="text-sm font-semibold text-red-500">{formatCurrency(mortgage.interestPortion)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Escrow</div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(mortgage.escrowPortion)}</div>
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
          <span>Monthly payment: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(mortgage.monthlyPayment)}</span></span>
          <span className={daysToNext <= 7 ? 'text-amber-500 font-medium' : ''}>
            Next due: {mortgage.nextPaymentDate} {daysToNext > 0 ? `(${daysToNext}d)` : '(today)'}
          </span>
        </div>

        {/* 2025 Form 1098 tax data */}
        <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">2025 Form 1098 — Tax Summary</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-gray-500">Mortgage Interest Paid</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">$3,389.92</span>
            <span className="text-gray-500">Real Estate Taxes</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">$4,860.76</span>
            <span className="text-gray-500">Points Paid</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">$0.00</span>
            <span className="text-gray-500">Principal (Jan 1, 2025)</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">$73,124.86</span>
          </div>
          <p className="text-xs text-gray-400 italic mt-2">Originated 08/12/2010 · 1220 Stonesthrow Way, Wadsworth OH</p>
        </div>
      </div>
    </Card>
  );
}

const PORTFOLIO_KEY = 'dashboard_portfolio';

interface Holding {
  symbol: string;
  lastPrice: number;
  changePercent: number;
  changeDollar: number;
  dayGain: number;
}

const DEFAULT_HOLDINGS: Holding[] = [
  { symbol: 'PLTR',  lastPrice: 130.49, changePercent: -7.30, changeDollar: -10.27, dayGain: -102.70 },
  { symbol: 'SPG',   lastPrice: 198.97, changePercent:  2.54, changeDollar:   4.93, dayGain:   14.79 },
  { symbol: 'AMGN',  lastPrice: 355.60, changePercent:  1.66, changeDollar:   5.79, dayGain:   23.16 },
  { symbol: 'UPS',   lastPrice: 101.64, changePercent:  1.18, changeDollar:   1.19, dayGain:   20.90 },
  { symbol: 'MSFT',  lastPrice: 373.07, changePercent: -0.34, changeDollar:  -1.26, dayGain:  -33.53 },
  { symbol: 'SWISX', lastPrice:  30.59, changePercent: -0.07, changeDollar:  -0.02, dayGain:   -0.31 },
];

interface PortfolioData {
  accountValue: number;
  daysGain: number;
  availableForWithdrawal: number;
  holdings: Holding[];
  asOf: string;
}

const DEFAULT_PORTFOLIO: PortfolioData = {
  accountValue: 17398.36,
  daysGain: -77.69,
  availableForWithdrawal: 1892.04,
  holdings: DEFAULT_HOLDINGS,
  asOf: '2026-04-09',
};

function PortfolioCard() {
  const [portfolio] = useState<PortfolioData>(() => {
    if (typeof window === 'undefined') return DEFAULT_PORTFOLIO;
    const stored = localStorage.getItem(PORTFOLIO_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PORTFOLIO;
  });

  const totalDayGain = portfolio.holdings.reduce((s, h) => s + h.dayGain, 0);

  return (
    <Card
      title="Investment Portfolio"
      titleRight={
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <BarChart2 size={13} /> Fidelity ···9212
        </span>
      }
    >
      <div className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Account Value</div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(portfolio.accountValue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Day's Gain</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${totalDayGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {totalDayGain >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {totalDayGain >= 0 ? '+' : ''}{formatCurrency(totalDayGain)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Available</div>
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(portfolio.availableForWithdrawal)}</div>
          </div>
        </div>

        {/* Holdings table */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Holdings</div>
          <div className="space-y-0">
            {/* Header */}
            <div className="grid grid-cols-4 text-xs text-gray-400 pb-1.5 border-b border-gray-100 dark:border-gray-800">
              <span>Symbol</span>
              <span className="text-right">Last Price</span>
              <span className="text-right">Change</span>
              <span className="text-right">Day's Gain</span>
            </div>
            {portfolio.holdings.map(h => (
              <div key={h.symbol} className="grid grid-cols-4 py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0 text-sm">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{h.symbol}</span>
                <span className="text-right text-gray-700 dark:text-gray-300">{formatCurrency(h.lastPrice)}</span>
                <span className={`text-right font-medium ${h.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                </span>
                <span className={`text-right font-medium ${h.dayGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {h.dayGain >= 0 ? '+' : ''}{formatCurrency(h.dayGain)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 italic">As of {portfolio.asOf} · prices are snapshots, not live</p>
      </div>
    </Card>
  );
}

export default function BusinessFinanceSection() {
  const [pnl, setPnl] = useState<PnLReport | null>(null);
  const [tax, setTax] = useState<TaxEstimate | null>(null);
  const [netWorth, setNetWorth] = useState<NetWorthReport | null>(null);
  const [transactions, setTransactions] = useState<CMSTransaction[]>([]);

  const [loadingPnl, setLoadingPnl] = useState(true);
  const [loadingTax, setLoadingTax] = useState(true);
  const [loadingNetWorth, setLoadingNetWorth] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  const [errorPnl, setErrorPnl] = useState<string | null>(null);
  const [errorTax, setErrorTax] = useState<string | null>(null);
  const [errorNetWorth, setErrorNetWorth] = useState<string | null>(null);
  const [errorTx, setErrorTx] = useState<string | null>(null);

  const [incomeGoal, setIncomeGoal] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_GOAL;
    const stored = localStorage.getItem(INCOME_GOAL_KEY);
    return stored ? Number(stored) : DEFAULT_GOAL;
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const fetchPnl = useCallback(async () => {
    setLoadingPnl(true);
    setErrorPnl(null);
    try {
      const res = await fetch(`${API_BASE}/api/finance/reports/pnl?year=${YEAR}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PnLReport = await res.json();
      setPnl(data);
    } catch (e) {
      setErrorPnl(`Could not load P&L data — is the CMS API running? (${(e as Error).message})`);
    } finally {
      setLoadingPnl(false);
    }
  }, []);

  const fetchTax = useCallback(async () => {
    setLoadingTax(true);
    setErrorTax(null);
    try {
      const res = await fetch(`${API_BASE}/api/finance/reports/tax-estimate?year=${YEAR}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TaxEstimate = await res.json();
      setTax(data);
    } catch (e) {
      setErrorTax(`Could not load tax estimate — (${(e as Error).message})`);
    } finally {
      setLoadingTax(false);
    }
  }, []);

  const fetchNetWorth = useCallback(async () => {
    setLoadingNetWorth(true);
    setErrorNetWorth(null);
    try {
      const res = await fetch(`${API_BASE}/api/finance/reports/net-worth`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NetWorthReport = await res.json();
      setNetWorth(data);
    } catch (e) {
      setErrorNetWorth(`Could not load account balances — (${(e as Error).message})`);
    } finally {
      setLoadingNetWorth(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingTx(true);
    setErrorTx(null);
    try {
      const res = await fetch(`${API_BASE}/api/finance/transactions?year=${YEAR}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TransactionsResponse = await res.json();
      // Support both { transactions: [...] } and a bare array
      const list = Array.isArray(data) ? (data as CMSTransaction[]) : data.transactions ?? [];
      setTransactions(list);
    } catch (e) {
      setErrorTx(`Could not load transactions — (${(e as Error).message})`);
    } finally {
      setLoadingTx(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchPnl();
    fetchTax();
    fetchNetWorth();
    fetchTransactions();
  }, [fetchPnl, fetchTax, fetchNetWorth, fetchTransactions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Income goal helpers
  const saveGoal = () => {
    const val = Number(goalInput);
    if (!isNaN(val) && val > 0) {
      setIncomeGoal(val);
      localStorage.setItem(INCOME_GOAL_KEY, String(val));
    }
    setEditingGoal(false);
  };

  const goalPct = pnl ? Math.min(100, (pnl.netProfit / incomeGoal) * 100) : 0;
  const goalColor = goalPct < 50 ? 'bg-red-500' : goalPct < 80 ? 'bg-yellow-500' : 'bg-green-500';

  // Quarterly tax alert
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextQuarter = QUARTERLY_SCHEDULE.find(q => q.paymentDue >= todayStr);
  const daysToPayment = nextQuarter
    ? Math.ceil((new Date(nextQuarter.paymentDue).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const paymentSoon = daysToPayment !== null && daysToPayment <= 30;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 size={20} className="text-indigo-500" />
            Business Income
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
            Live data from YKR Law CMS · {YEAR} YTD
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refreshAll}
          disabled={loadingPnl || loadingTax || loadingNetWorth || loadingTx}
        >
          <RefreshCw size={13} className={(loadingPnl || loadingTax || loadingNetWorth || loadingTx) ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* ── 1. Income Summary ─────────────────────────────────────────────── */}
      <Card
        title="Income Summary"
        titleRight={
          <span className="text-xs text-gray-400 font-normal">{YEAR} YTD</span>
        }
      >
        {loadingPnl ? (
          <LoadingSpinner label="Loading P&L data…" />
        ) : errorPnl ? (
          <ErrorState message={errorPnl} />
        ) : pnl ? (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Gross Revenue</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(pnl.ytdIncome)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Expenses</div>
                <div className="text-xl font-bold text-red-500 dark:text-red-400">{formatCurrency(pnl.ytdExpenses)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Net Profit</div>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(pnl.netProfit)}</div>
              </div>
            </div>

            {/* Monthly bar chart */}
            {pnl.monthlyBreakdown && pnl.monthlyBreakdown.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2 font-medium">Monthly Income vs Expenses</div>
                <MonthlyBarChart breakdown={pnl.monthlyBreakdown} />
              </div>
            )}
          </div>
        ) : null}
      </Card>

      {/* ── 2. Income Goal ────────────────────────────────────────────────── */}
      <Card
        title="Annual Income Goal"
        titleRight={
          <button
            onClick={() => { setGoalInput(String(incomeGoal)); setEditingGoal(true); }}
            className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 underline"
          >
            Edit goal
          </button>
        }
      >
        {editingGoal ? (
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              min="1"
              step="1000"
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
              autoFocus
            />
            <Button size="sm" onClick={saveGoal}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingGoal(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {pnl ? formatCurrency(pnl.netProfit) : '—'} net profit
              </span>
              <span className="text-gray-400">goal: {formatCurrency(incomeGoal)}</span>
            </div>
            <ProgressBar
              value={goalPct}
              color={goalColor}
              showPercent={false}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span className={goalPct < 50 ? 'text-red-500 font-medium' : goalPct < 80 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                {Math.round(goalPct)}% of goal
              </span>
              {pnl && (
                <span>
                  {formatCurrency(Math.max(0, incomeGoal - pnl.netProfit))} remaining
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── 3. Tax Liability ──────────────────────────────────────────────── */}
      <Card title="Tax Liability Estimate">
        {loadingTax ? (
          <LoadingSpinner label="Loading tax estimates…" />
        ) : errorTax ? (
          <ErrorState message={errorTax} />
        ) : tax ? (
          <div className="space-y-4">
            {/* Quarterly payment alert */}
            {paymentSoon && nextQuarter && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
                daysToPayment! <= 7
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
              }`}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{nextQuarter.label} estimated tax payment</strong> due {formatDate(nextQuarter.paymentDue)}
                  {' '}({daysToPayment} day{daysToPayment !== 1 ? 's' : ''} away) —{' '}
                  {formatCurrency(tax.quarterlyEstimate)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex justify-between col-span-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Gross Income</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tax.grossIncome)}</span>
              </div>
              <div className="flex justify-between col-span-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Total Deductions</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">({formatCurrency(tax.totalDeductions)})</span>
              </div>
              <div className="flex justify-between col-span-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Taxable Income</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tax.taxableIncome)}</span>
              </div>
              <div className="flex justify-between col-span-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Est. Self-Employment Tax</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(tax.estimatedSETax)}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-500">Quarterly Payment</span>
                <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{formatCurrency(tax.quarterlyEstimate)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 italic border-t border-gray-100 dark:border-gray-800 pt-3">
              Estimates only — consult your CPA before making payments.
            </p>
          </div>
        ) : null}
      </Card>

      {/* ── 3b. Mortgage ─────────────────────────────────────────────────── */}
      <MortgageCard />

      {/* ── 3c. Investment Portfolio ──────────────────────────────────────── */}
      <PortfolioCard />

      {/* ── 4. Account Balances ───────────────────────────────────────────── */}
      <Card title="Account Balances" titleRight={<Wallet size={15} className="text-gray-400" />}>
        {loadingNetWorth ? (
          <LoadingSpinner label="Loading account balances…" />
        ) : errorNetWorth ? (
          <ErrorState message={errorNetWorth} />
        ) : netWorth ? (
          <div className="space-y-2">
            {netWorth.accounts.filter(a => a.balance >= 0).length > 0 && (
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-1">Assets</div>
            )}
            {netWorth.accounts.filter(a => a.balance >= 0).map((acct, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{acct.name}</div>
                  <div className="text-xs text-gray-400">{acct.bank}{acct.type ? ` · ${acct.type}` : ''}</div>
                </div>
                <span className="text-sm font-semibold flex-shrink-0 ml-4 text-gray-900 dark:text-gray-100">{formatCurrency(acct.balance)}</span>
              </div>
            ))}
            {netWorth.accounts.filter(a => a.balance < 0).length > 0 && (
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-1 pt-3">Liabilities</div>
            )}
            {netWorth.accounts.filter(a => a.balance < 0).map((acct, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{acct.name}</div>
                  <div className="text-xs text-gray-400">{acct.bank}{acct.type ? ` · ${acct.type}` : ''}</div>
                </div>
                <span className="text-sm font-semibold flex-shrink-0 ml-4 text-red-500 dark:text-red-400">{formatCurrency(acct.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Net Worth</span>
              <span className={`text-sm font-bold ${netWorth.netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>{formatCurrency(netWorth.netWorth)}</span>
            </div>
          </div>
        ) : null}
      </Card>

      {/* ── 5. Recent Transactions ────────────────────────────────────────── */}
      <Card
        title="Recent Transactions"
        titleRight={<ReceiptText size={15} className="text-gray-400" />}
      >
        {loadingTx ? (
          <LoadingSpinner label="Loading transactions…" />
        ) : errorTx ? (
          <ErrorState message={errorTx} />
        ) : transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No transactions found.</p>
        ) : (
          <div className="space-y-0">
            {transactions.slice(0, 10).map((tx, i) => (
              <div
                key={tx.id ?? i}
                className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {tx.description}
                  </div>
                  <div className="text-xs text-gray-400">{tx.date ? formatDate(tx.date) : ''}
                    {tx.category ? ` · ${tx.category}` : ''}</div>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-3 text-center">
              Showing last 10 transactions · <TrendingUp size={11} className="inline" /> from YKR Law CMS
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
