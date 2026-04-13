'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, DollarSign, CreditCard, PiggyBank, Target, Check, Trophy, Building2 } from 'lucide-react';
import { financeStorage } from '@/lib/storage';
import { generateId, today, formatDate, formatCurrency } from '@/lib/utils';
import { FinanceData, Transaction, Bill, BudgetCategory, SavingsGoal } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePoints } from '@/lib/PointsContext';
import BusinessFinanceSection from './BusinessFinanceSection';
import PersonalFinanceSection from './PersonalFinanceSection';

type SubTab = 'personal' | 'business' | 'spending' | 'bills' | 'budget' | 'savings';

const CATEGORIES = ['Food', 'Groceries', 'Transport', 'Housing', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Personal', 'Other'];

export default function FinancesSection() {
  const [data, setData] = useState<FinanceData>(() => financeStorage.get());
  const [subTab, setSubTab] = useState<SubTab>('personal');
  const { award } = usePoints();

  // Spending form
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ date: today(), amount: '', category: 'Food', description: '', type: 'expense' as 'expense' | 'income' });

  // Bills form
  const [showBillForm, setShowBillForm] = useState(false);
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDay: '1', category: 'Utilities' });
  const [editBillId, setEditBillId] = useState<string | null>(null);

  // Budget form
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', monthlyLimit: '' });
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);

  // Savings form
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [savingsForm, setSavingsForm] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '', notes: '' });
  const [editSavingsId, setEditSavingsId] = useState<string | null>(null);

  const save = (updated: FinanceData) => {
    setData(updated);
    financeStorage.set(updated);
  };

  // Current month helpers
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthStr = currentMonthPrefix;

  const thisMonthExpenses = data.transactions.filter(
    t => t.type === 'expense' && t.date.startsWith(currentMonthPrefix)
  );

  const spentByCategory = (category: string) =>
    thisMonthExpenses.filter(t => t.category === category).reduce((s, t) => s + t.amount, 0);

  const checkBudgetGoals = () => {
    let awarded = 0;
    data.budgets.forEach(b => {
      const spent = spentByCategory(b.category);
      if (spent <= b.monthlyLimit) {
        const key = `budget_check_${b.id}_${currentMonthStr}`;
        const result = award({
          date: today(),
          action: 'budget_check',
          description: `Under budget: ${b.category} (${formatCurrency(spent)} / ${formatCurrency(b.monthlyLimit)})`,
          points: 50,
          key,
        });
        if (result) awarded++;
      }
    });
    if (awarded === 0) {
      // Nothing new to award — already checked or over budget
    }
  };

  // Transactions
  const addTransaction = () => {
    if (!txForm.amount) return;
    const tx: Transaction = {
      id: generateId(),
      date: txForm.date,
      amount: Number(txForm.amount),
      category: txForm.category,
      description: txForm.description,
      type: txForm.type,
    };
    save({ ...data, transactions: [tx, ...data.transactions] });
    setTxForm({ date: today(), amount: '', category: 'Food', description: '', type: 'expense' });
    setShowTxForm(false);
  };

  const deleteTx = (id: string) => save({ ...data, transactions: data.transactions.filter(t => t.id !== id) });

  // Bills
  const addBill = () => {
    if (!billForm.name || !billForm.amount) return;
    if (editBillId) {
      save({
        ...data,
        bills: data.bills.map(b => b.id === editBillId
          ? { ...b, name: billForm.name, amount: Number(billForm.amount), dueDay: Number(billForm.dueDay), category: billForm.category }
          : b
        ),
      });
      setEditBillId(null);
    } else {
      const bill: Bill = {
        id: generateId(),
        name: billForm.name,
        amount: Number(billForm.amount),
        dueDay: Number(billForm.dueDay),
        category: billForm.category,
        isPaid: false,
      };
      save({ ...data, bills: [...data.bills, bill] });
    }
    setBillForm({ name: '', amount: '', dueDay: '1', category: 'Utilities' });
    setShowBillForm(false);
  };

  const toggleBillPaid = (id: string) => {
    save({
      ...data,
      bills: data.bills.map(b => b.id === id
        ? { ...b, isPaid: !b.isPaid, paidMonth: !b.isPaid ? currentMonthStr : undefined }
        : b
      ),
    });
  };

  const deleteBill = (id: string) => save({ ...data, bills: data.bills.filter(b => b.id !== id) });

  const openEditBill = (bill: Bill) => {
    setBillForm({ name: bill.name, amount: String(bill.amount), dueDay: String(bill.dueDay), category: bill.category });
    setEditBillId(bill.id);
    setShowBillForm(true);
  };

  // Budget
  const addBudget = () => {
    if (!budgetForm.monthlyLimit) return;
    if (editBudgetId) {
      save({
        ...data,
        budgets: data.budgets.map(b => b.id === editBudgetId
          ? { ...b, category: budgetForm.category, monthlyLimit: Number(budgetForm.monthlyLimit) }
          : b
        ),
      });
      setEditBudgetId(null);
    } else {
      const budget: BudgetCategory = {
        id: generateId(),
        category: budgetForm.category,
        monthlyLimit: Number(budgetForm.monthlyLimit),
      };
      save({ ...data, budgets: [...data.budgets, budget] });
    }
    setBudgetForm({ category: 'Food', monthlyLimit: '' });
    setShowBudgetForm(false);
  };

  const deleteBudget = (id: string) => save({ ...data, budgets: data.budgets.filter(b => b.id !== id) });

  const openEditBudget = (b: BudgetCategory) => {
    setBudgetForm({ category: b.category, monthlyLimit: String(b.monthlyLimit) });
    setEditBudgetId(b.id);
    setShowBudgetForm(true);
  };

  // Savings
  const addSavings = () => {
    if (!savingsForm.name || !savingsForm.targetAmount) return;
    if (editSavingsId) {
      save({
        ...data,
        savingsGoals: data.savingsGoals.map(s => s.id === editSavingsId
          ? { ...s, ...savingsForm, targetAmount: Number(savingsForm.targetAmount), currentAmount: Number(savingsForm.currentAmount) }
          : s
        ),
      });
      setEditSavingsId(null);
    } else {
      const goal: SavingsGoal = {
        id: generateId(),
        name: savingsForm.name,
        targetAmount: Number(savingsForm.targetAmount),
        currentAmount: Number(savingsForm.currentAmount) || 0,
        targetDate: savingsForm.targetDate,
        notes: savingsForm.notes,
      };
      save({ ...data, savingsGoals: [...data.savingsGoals, goal] });
    }
    setSavingsForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', notes: '' });
    setShowSavingsForm(false);
  };

  const deleteSavings = (id: string) => save({ ...data, savingsGoals: data.savingsGoals.filter(s => s.id !== id) });

  const openEditSavings = (s: SavingsGoal) => {
    setSavingsForm({ name: s.name, targetAmount: String(s.targetAmount), currentAmount: String(s.currentAmount), targetDate: s.targetDate, notes: s.notes });
    setEditSavingsId(s.id);
    setShowSavingsForm(true);
  };

  const subTabs: { id: SubTab; label: string; icon: typeof DollarSign }[] = [
    { id: 'personal', label: 'Net Worth', icon: PiggyBank },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'spending', label: 'Spending', icon: CreditCard },
    { id: 'bills', label: 'Bills', icon: DollarSign },
    { id: 'budget', label: 'Budget', icon: Target },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
  ];

  const billsSortedByDue = [...data.bills].sort((a, b) => a.dueDay - b.dueDay);
  const upcomingBills = billsSortedByDue.filter(b => !b.isPaid || b.paidMonth !== currentMonthStr);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Finances</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Track spending, bills, budgets, and savings</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              subTab === id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Personal Net Worth */}
      {subTab === 'personal' && <PersonalFinanceSection />}

      {/* Business Income */}
      {subTab === 'business' && <BusinessFinanceSection />}

      {/* Spending Log */}
      {subTab === 'spending' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTxForm(true)}>
              <Plus size={16} /> Add Transaction
            </Button>
          </div>

          {/* Month summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Food', 'Transport', 'Housing', 'Entertainment'] as const).map(cat => {
              const spent = spentByCategory(cat);
              const budget = data.budgets.find(b => b.category === cat);
              return (
                <Card key={cat} className="!p-0">
                  <div className="p-4">
                    <div className="text-xs text-gray-500 mb-1">{cat}</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(spent)}</div>
                    {budget && (
                      <div className="text-xs text-gray-400 mt-0.5">of {formatCurrency(budget.monthlyLimit)}</div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {data.transactions.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-6">No transactions yet.</p></Card>
          ) : (
            <Card title="Recent Transactions">
              <div className="space-y-1">
                {data.transactions.slice(0, 30).map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'expense' ? 'bg-red-400' : 'bg-green-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description || tx.category}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{tx.category}</span>
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(tx.date)}</div>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                    <button onClick={() => deleteTx(tx.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {/* Monthly total */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
                <span className="text-gray-500">This month total:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(thisMonthExpenses.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Bills */}
      {subTab === 'bills' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setBillForm({ name: '', amount: '', dueDay: '1', category: 'Utilities' }); setEditBillId(null); setShowBillForm(true); }}>
              <Plus size={16} /> Add Bill
            </Button>
          </div>

          {upcomingBills.length > 0 && (
            <Card title="Upcoming / Unpaid Bills">
              <div className="space-y-2">
                {upcomingBills.map(bill => {
                  const isPaid = bill.isPaid && bill.paidMonth === currentMonthStr;
                  const dueDate = new Date(now.getFullYear(), now.getMonth(), bill.dueDay);
                  const isOverdue = !isPaid && dueDate < now;
                  return (
                    <div key={bill.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isPaid ? 'opacity-50' : isOverdue ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-gray-100 dark:border-gray-800'
                    }`}>
                      <button
                        onClick={() => toggleBillPaid(bill.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isPaid ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                        }`}
                      >
                        {isPaid && <Check size={12} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{bill.name}</span>
                          {isOverdue && <span className="text-xs text-red-600 font-medium">OVERDUE</span>}
                        </div>
                        <div className="text-xs text-gray-400">Due: {bill.dueDay}{['st','nd','rd'][bill.dueDay - 1] || 'th'} of month • {bill.category}</div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(bill.amount)}</span>
                      <button onClick={() => openEditBill(bill)} className="text-gray-400 hover:text-indigo-500 p-1">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteBill(bill.id)} className="text-gray-300 hover:text-red-500 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                Monthly total: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(data.bills.reduce((s, b) => s + b.amount, 0))}</span>
              </div>
            </Card>
          )}

          {data.bills.length === 0 && (
            <Card><p className="text-gray-400 text-sm text-center py-6">No bills added yet.</p></Card>
          )}
        </div>
      )}

      {/* Budget */}
      {subTab === 'budget' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            {data.budgets.length > 0 && (
              <Button
                variant="secondary"
                onClick={checkBudgetGoals}
                className="border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Trophy size={15} className="text-amber-500" /> Check Budget Goals (+50 pts each)
              </Button>
            )}
            <Button onClick={() => { setBudgetForm({ category: 'Food', monthlyLimit: '' }); setEditBudgetId(null); setShowBudgetForm(true); }}>
              <Plus size={16} /> Add Budget
            </Button>
          </div>

          {data.budgets.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-6">No budgets set. Add a monthly budget per category.</p></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.budgets.map(b => {
                const spent = spentByCategory(b.category);
                const pct = Math.min(100, (spent / b.monthlyLimit) * 100);
                const over = spent > b.monthlyLimit;
                return (
                  <Card key={b.id}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{b.category}</span>
                      <div className="flex gap-1">
                        <button onClick={() => openEditBudget(b)} className="text-gray-400 hover:text-indigo-500 p-1">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteBudget(b.id)} className="text-gray-300 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar
                      value={pct}
                      color={over ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-green-500'}
                      showPercent={false}
                    />
                    <div className="flex justify-between mt-2 text-sm">
                      <span className={over ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500'}>
                        {formatCurrency(spent)} spent
                        {over && ' (over budget!)'}
                      </span>
                      <span className="text-gray-400">{formatCurrency(b.monthlyLimit)} budget</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Savings Goals */}
      {subTab === 'savings' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSavingsForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', notes: '' }); setEditSavingsId(null); setShowSavingsForm(true); }}>
              <Plus size={16} /> Add Goal
            </Button>
          </div>

          {data.savingsGoals.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-6">No savings goals yet.</p></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.savingsGoals.map(goal => {
                const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                const remaining = goal.targetAmount - goal.currentAmount;
                return (
                  <Card key={goal.id}>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{goal.name}</h4>
                      <div className="flex gap-1">
                        <button onClick={() => openEditSavings(goal)} className="text-gray-400 hover:text-indigo-500 p-1">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteSavings(goal.id)} className="text-gray-300 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {goal.targetDate && <div className="text-xs text-gray-400 mb-3">Target: {formatDate(goal.targetDate)}</div>}
                    {goal.notes && <p className="text-xs text-gray-500 mb-3">{goal.notes}</p>}
                    <ProgressBar
                      value={pct}
                      color={pct >= 100 ? 'bg-green-500' : 'bg-indigo-500'}
                      showPercent={false}
                    />
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(goal.currentAmount)}</span>
                      <span className="text-gray-400">of {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    {remaining > 0 && (
                      <div className="text-xs text-gray-400 mt-1">{formatCurrency(remaining)} remaining ({Math.round(pct)}%)</div>
                    )}
                    {remaining <= 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Goal reached!</div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      <Modal isOpen={showTxForm} onClose={() => setShowTxForm(false)} title="Add Transaction">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTxForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  txForm.type === t
                    ? t === 'expense'
                      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      : 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <Input label="Date" type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Amount ($)" type="number" step="0.01" min="0" placeholder="0.00" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} />
          <Select label="Category" value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Description (optional)" placeholder="What was it for?" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowTxForm(false)}>Cancel</Button>
            <Button onClick={addTransaction} disabled={!txForm.amount}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Bill Modal */}
      <Modal isOpen={showBillForm} onClose={() => setShowBillForm(false)} title={editBillId ? 'Edit Bill' : 'Add Bill'}>
        <div className="space-y-4">
          <Input label="Bill Name" placeholder="e.g. Netflix, Rent, Electric..." value={billForm.name} onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Amount ($)" type="number" step="0.01" placeholder="0.00" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Due Day of Month" type="number" min="1" max="31" value={billForm.dueDay} onChange={e => setBillForm(f => ({ ...f, dueDay: e.target.value }))} />
          <Select label="Category" value={billForm.category} onChange={e => setBillForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowBillForm(false)}>Cancel</Button>
            <Button onClick={addBill} disabled={!billForm.name || !billForm.amount}>{editBillId ? 'Save' : 'Add Bill'}</Button>
          </div>
        </div>
      </Modal>

      {/* Budget Modal */}
      <Modal isOpen={showBudgetForm} onClose={() => setShowBudgetForm(false)} title={editBudgetId ? 'Edit Budget' : 'Add Budget'}>
        <div className="space-y-4">
          <Select label="Category" value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Monthly Limit ($)" type="number" step="1" placeholder="500" value={budgetForm.monthlyLimit} onChange={e => setBudgetForm(f => ({ ...f, monthlyLimit: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowBudgetForm(false)}>Cancel</Button>
            <Button onClick={addBudget} disabled={!budgetForm.monthlyLimit}>{editBudgetId ? 'Save' : 'Add Budget'}</Button>
          </div>
        </div>
      </Modal>

      {/* Savings Modal */}
      <Modal isOpen={showSavingsForm} onClose={() => setShowSavingsForm(false)} title={editSavingsId ? 'Edit Goal' : 'Add Savings Goal'}>
        <div className="space-y-4">
          <Input label="Goal Name" placeholder="e.g. Emergency Fund, Vacation..." value={savingsForm.name} onChange={e => setSavingsForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Target Amount ($)" type="number" step="1" placeholder="1000" value={savingsForm.targetAmount} onChange={e => setSavingsForm(f => ({ ...f, targetAmount: e.target.value }))} />
          <Input label="Current Amount ($)" type="number" step="1" placeholder="0" value={savingsForm.currentAmount} onChange={e => setSavingsForm(f => ({ ...f, currentAmount: e.target.value }))} />
          <Input label="Target Date (optional)" type="date" value={savingsForm.targetDate} onChange={e => setSavingsForm(f => ({ ...f, targetDate: e.target.value }))} />
          <Textarea label="Notes (optional)" rows={2} value={savingsForm.notes} onChange={e => setSavingsForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowSavingsForm(false)}>Cancel</Button>
            <Button onClick={addSavings} disabled={!savingsForm.name || !savingsForm.targetAmount}>{editSavingsId ? 'Save' : 'Add Goal'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
