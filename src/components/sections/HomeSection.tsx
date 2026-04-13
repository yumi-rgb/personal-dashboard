'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, ShoppingCart, Home, AlertCircle } from 'lucide-react';
import { homeStorage } from '@/lib/storage';
import { generateId, today, addDays, isOverdue, formatDate } from '@/lib/utils';
import { HomeData, Chore, ShoppingItem, ChoreRecurrence } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePoints } from '@/lib/PointsContext';

// ── Cleaning Checklist ────────────────────────────────────────────────────────

const CLEANING_KEY = 'cleaning-checklist-v1';

interface CleaningTask {
  id: string;
  label: string;
  type: 'weekly' | 'monthly';
}

const WEEKLY_TASKS: CleaningTask[] = [
  { id: 'wk-vacuum', label: '🧹 Vacuum all rooms', type: 'weekly' },
  { id: 'wk-bathrooms', label: '🧽 Clean bathrooms', type: 'weekly' },
  { id: 'wk-kitchen', label: '🍽️ Clean kitchen (counters, stovetop, sink)', type: 'weekly' },
  { id: 'wk-surfaces', label: '🪟 Wipe down surfaces and mirrors', type: 'weekly' },
  { id: 'wk-laundry', label: '🧺 Do all laundry (wash, dry, fold, put away)', type: 'weekly' },
  { id: 'wk-car', label: '🚗 Clean out the car', type: 'weekly' },
  { id: 'wk-mugs', label: '☕ Return mugs/glasses from bedrooms to kitchen', type: 'weekly' },
];

const MONTHLY_TASKS: CleaningTask[] = [
  { id: 'mo-floors', label: '🧹 Deep clean floors (mop/steam)', type: 'monthly' },
  { id: 'mo-windows', label: '🪟 Clean windows', type: 'monthly' },
  { id: 'mo-appliances', label: '🧴 Clean appliances (microwave, oven, fridge)', type: 'monthly' },
  { id: 'mo-bathrooms', label: '🛁 Deep clean bathrooms (grout, behind toilet, etc.)', type: 'monthly' },
  { id: 'mo-declutter', label: '📦 Declutter one area of the house', type: 'monthly' },
  { id: 'mo-plants', label: '🌿 Tend to houseplants (repot, fertilize as needed)', type: 'monthly' },
];

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getYearWeek(date: Date): string {
  return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
}

function getYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface CleaningState {
  weekly: Record<string, string>; // taskId -> yearWeek when checked
  monthly: Record<string, string>; // taskId -> yearMonth when checked
}

function loadCleaningState(): CleaningState {
  try {
    const stored = localStorage.getItem(CLEANING_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { weekly: {}, monthly: {} };
}

function CleaningChecklist() {
  const [state, setState] = useState<CleaningState>({ weekly: {}, monthly: {} });
  const { award } = usePoints();

  useEffect(() => { setState(loadCleaningState()); }, []);

  const now = new Date();
  const currentWeek = getYearWeek(now);
  const currentMonth = getYearMonth(now);

  function isWeeklyDone(taskId: string): boolean {
    return state.weekly[taskId] === currentWeek;
  }

  function isMonthlyDone(taskId: string): boolean {
    return state.monthly[taskId] === currentMonth;
  }

  function toggleWeekly(task: CleaningTask) {
    const done = isWeeklyDone(task.id);
    const next: CleaningState = {
      ...state,
      weekly: { ...state.weekly, [task.id]: done ? '' : currentWeek },
    };
    setState(next);
    localStorage.setItem(CLEANING_KEY, JSON.stringify(next));
    if (!done) {
      award({
        date: today(),
        action: 'cleaning',
        description: `Cleaning: ${task.label}`,
        points: 10,
        key: `clean_weekly_${task.id}_${currentWeek}`,
      });
    }
  }

  function toggleMonthly(task: CleaningTask) {
    const done = isMonthlyDone(task.id);
    const next: CleaningState = {
      ...state,
      monthly: { ...state.monthly, [task.id]: done ? '' : currentMonth },
    };
    setState(next);
    localStorage.setItem(CLEANING_KEY, JSON.stringify(next));
    if (!done) {
      award({
        date: today(),
        action: 'cleaning',
        description: `Cleaning: ${task.label}`,
        points: 10,
        key: `clean_monthly_${task.id}_${currentMonth}`,
      });
    }
  }

  const weeklyDone = WEEKLY_TASKS.filter(t => isWeeklyDone(t.id)).length;
  const monthlyDone = MONTHLY_TASKS.filter(t => isMonthlyDone(t.id)).length;

  return (
    <Card title="Cleaning Checklist" titleRight={
      <span className="text-xs text-gray-400">
        {weeklyDone}/{WEEKLY_TASKS.length} weekly · {monthlyDone}/{MONTHLY_TASKS.length} monthly
      </span>
    }>
      <div className="space-y-4">
        {/* Weekly */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              Weekly — {currentWeek}
            </h3>
            <span className="text-xs text-gray-400">{weeklyDone}/{WEEKLY_TASKS.length} done</span>
          </div>
          <div className="space-y-1.5">
            {WEEKLY_TASKS.map(task => {
              const done = isWeeklyDone(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleWeekly(task)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    done
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {done && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {task.label}
                  </span>
                  {done && <span className="ml-auto text-xs text-green-600 dark:text-green-400 flex-shrink-0">+10 pts</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Monthly */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              Monthly — {currentMonth}
            </h3>
            <span className="text-xs text-gray-400">{monthlyDone}/{MONTHLY_TASKS.length} done</span>
          </div>
          <div className="space-y-1.5">
            {MONTHLY_TASKS.map(task => {
              const done = isMonthlyDone(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleMonthly(task)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    done
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {done && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {task.label}
                  </span>
                  {done && <span className="ml-auto text-xs text-green-600 dark:text-green-400 flex-shrink-0">+10 pts</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 italic">Checks reset automatically each week/month. Each task awards 10 points once per period.</p>
    </Card>
  );
}

type SubTab = 'chores' | 'shopping';

function getNextDue(recurrence: ChoreRecurrence, fromDate: string): string | undefined {
  switch (recurrence) {
    case 'daily': return addDays(fromDate, 1);
    case 'weekly': return addDays(fromDate, 7);
    case 'monthly': return addDays(fromDate, 30);
    default: return undefined;
  }
}

export default function HomeSection() {
  const [data, setData] = useState<HomeData>(() => homeStorage.get());
  const [subTab, setSubTab] = useState<SubTab>('chores');
  const { award } = usePoints();

  // Chore form
  const [showChoreForm, setShowChoreForm] = useState(false);
  const [choreForm, setChoreForm] = useState({ name: '', recurrence: 'none' as ChoreRecurrence, nextDue: '', notes: '' });

  // Shopping form
  const [showShoppingForm, setShowShoppingForm] = useState(false);
  const [shoppingForm, setShoppingForm] = useState({ name: '', quantity: '' });
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const save = (updated: HomeData) => {
    setData(updated);
    homeStorage.set(updated);
  };

  // Chores
  const addChore = () => {
    if (!choreForm.name.trim()) return;
    const chore: Chore = {
      id: generateId(),
      name: choreForm.name.trim(),
      recurrence: choreForm.recurrence,
      nextDue: choreForm.nextDue || undefined,
      notes: choreForm.notes,
    };
    save({ ...data, chores: [...data.chores, chore] });
    setChoreForm({ name: '', recurrence: 'none', nextDue: '', notes: '' });
    setShowChoreForm(false);
  };

  const completeChore = (id: string) => {
    const todayStr = today();
    const chore = data.chores.find(c => c.id === id);
    save({
      ...data,
      chores: data.chores.map(c => {
        if (c.id !== id) return c;
        const nextDue = c.recurrence !== 'none' ? getNextDue(c.recurrence, todayStr) : undefined;
        return { ...c, lastCompleted: todayStr, nextDue };
      }),
    });
    // Award 10 pts for completing a chore. Key: chore_id_date prevents re-awarding same chore same day.
    if (chore) {
      award({
        date: todayStr,
        action: 'chore',
        description: `Chore completed: ${chore.name}`,
        points: 10,
        key: `chore_${id}_${todayStr}`,
      });
    }
  };

  const deleteChore = (id: string) => save({ ...data, chores: data.chores.filter(c => c.id !== id) });

  const overdueChores = data.chores.filter(c => c.nextDue && isOverdue(c.nextDue));
  const upcomingChores = data.chores.filter(c => c.nextDue && !isOverdue(c.nextDue));
  const noDateChores = data.chores.filter(c => !c.nextDue);

  // Shopping
  const addShoppingItem = () => {
    if (!shoppingForm.name.trim()) return;
    const item: ShoppingItem = {
      id: generateId(),
      name: shoppingForm.name.trim(),
      quantity: shoppingForm.quantity,
      checked: false,
      addedAt: today(),
    };
    save({ ...data, shoppingList: [...data.shoppingList, item] });
    setShoppingForm({ name: '', quantity: '' });
    setShowShoppingForm(false);
  };

  const addBulkItems = () => {
    if (!bulkInput.trim()) return;
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
    const newItems: ShoppingItem[] = lines.map(line => ({
      id: generateId(),
      name: line,
      quantity: '',
      checked: false,
      addedAt: today(),
    }));
    save({ ...data, shoppingList: [...data.shoppingList, ...newItems] });
    setBulkInput('');
    setShowBulk(false);
  };

  const toggleShoppingItem = (id: string) => {
    save({
      ...data,
      shoppingList: data.shoppingList.map(i => i.id === id ? { ...i, checked: !i.checked } : i),
    });
  };

  const deleteShoppingItem = (id: string) => save({ ...data, shoppingList: data.shoppingList.filter(i => i.id !== id) });

  const clearChecked = () => save({ ...data, shoppingList: data.shoppingList.filter(i => !i.checked) });

  const uncheckedItems = data.shoppingList.filter(i => !i.checked);
  const checkedItems = data.shoppingList.filter(i => i.checked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Home</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Chores and shopping list</p>
        </div>
      </div>

      {/* Cleaning Checklist */}
      <CleaningChecklist />

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-800">
        {([{ id: 'chores', label: 'Chores', icon: Home }, { id: 'shopping', label: 'Shopping List', icon: ShoppingCart }] as const).map(({ id, label, icon: Icon }) => (
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
            {label}
            {id === 'chores' && overdueChores.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{overdueChores.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Chores */}
      {subTab === 'chores' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowChoreForm(true)}>
              <Plus size={16} /> Add Chore
            </Button>
          </div>

          {/* Overdue */}
          {overdueChores.length > 0 && (
            <Card title="Overdue" titleRight={<span className="text-xs text-red-500">{overdueChores.length} overdue</span>}>
              <div className="space-y-2">
                {overdueChores.map(chore => (
                  <ChoreRow key={chore.id} chore={chore} onComplete={completeChore} onDelete={deleteChore} overdue />
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming */}
          {upcomingChores.length > 0 && (
            <Card title="Upcoming">
              <div className="space-y-2">
                {upcomingChores.sort((a, b) => (a.nextDue || '').localeCompare(b.nextDue || '')).map(chore => (
                  <ChoreRow key={chore.id} chore={chore} onComplete={completeChore} onDelete={deleteChore} />
                ))}
              </div>
            </Card>
          )}

          {/* No date / one-time */}
          {noDateChores.length > 0 && (
            <Card title="Tasks">
              <div className="space-y-2">
                {noDateChores.map(chore => (
                  <ChoreRow key={chore.id} chore={chore} onComplete={completeChore} onDelete={deleteChore} />
                ))}
              </div>
            </Card>
          )}

          {data.chores.length === 0 && (
            <Card><p className="text-gray-400 text-sm text-center py-6">No chores added yet.</p></Card>
          )}
        </div>
      )}

      {/* Shopping List */}
      {subTab === 'shopping' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            {checkedItems.length > 0 && (
              <Button variant="secondary" onClick={clearChecked}>Clear Checked ({checkedItems.length})</Button>
            )}
            <Button variant="secondary" onClick={() => setShowBulk(true)}>Bulk Add</Button>
            <Button onClick={() => setShowShoppingForm(true)}>
              <Plus size={16} /> Add Item
            </Button>
          </div>

          {data.shoppingList.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-6">Shopping list is empty.</p></Card>
          ) : (
            <Card title={`Shopping List (${uncheckedItems.length} items remaining)`}>
              <div className="space-y-1.5">
                {/* Unchecked items */}
                {uncheckedItems.map(item => (
                  <ShoppingItemRow key={item.id} item={item} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} />
                ))}
                {/* Checked items */}
                {checkedItems.length > 0 && (
                  <>
                    <div className="pt-2 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Completed</div>
                    {checkedItems.map(item => (
                      <ShoppingItemRow key={item.id} item={item} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} />
                    ))}
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Quick add inline */}
          <Card title="Quick Add">
            <div className="flex gap-2">
              <Input
                placeholder="Item name..."
                value={shoppingForm.name}
                onChange={e => setShoppingForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
                className="flex-1"
              />
              <Input
                placeholder="Qty"
                value={shoppingForm.quantity}
                onChange={e => setShoppingForm(f => ({ ...f, quantity: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addShoppingItem()}
                className="w-20"
              />
              <Button onClick={addShoppingItem} disabled={!shoppingForm.name.trim()}>Add</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Chore Modal */}
      <Modal isOpen={showChoreForm} onClose={() => setShowChoreForm(false)} title="Add Chore">
        <div className="space-y-4">
          <Input label="Chore Name" placeholder="e.g. Vacuum living room..." value={choreForm.name} onChange={e => setChoreForm(f => ({ ...f, name: e.target.value }))} />
          <Select
            label="Recurrence"
            value={choreForm.recurrence}
            onChange={e => setChoreForm(f => ({ ...f, recurrence: e.target.value as ChoreRecurrence }))}
          >
            <option value="none">One-time / No recurrence</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
          <Input label="Due Date (optional)" type="date" value={choreForm.nextDue} onChange={e => setChoreForm(f => ({ ...f, nextDue: e.target.value }))} />
          <Textarea label="Notes (optional)" rows={2} value={choreForm.notes} onChange={e => setChoreForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowChoreForm(false)}>Cancel</Button>
            <Button onClick={addChore} disabled={!choreForm.name.trim()}>Add Chore</Button>
          </div>
        </div>
      </Modal>

      {/* Shopping Item Modal */}
      <Modal isOpen={showShoppingForm} onClose={() => setShowShoppingForm(false)} title="Add Item">
        <div className="space-y-4">
          <Input label="Item Name" placeholder="e.g. Milk" value={shoppingForm.name} onChange={e => setShoppingForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <Input label="Quantity (optional)" placeholder="e.g. 2, 1 lb..." value={shoppingForm.quantity} onChange={e => setShoppingForm(f => ({ ...f, quantity: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowShoppingForm(false)}>Cancel</Button>
            <Button onClick={addShoppingItem} disabled={!shoppingForm.name.trim()}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal isOpen={showBulk} onClose={() => setShowBulk(false)} title="Bulk Add Items">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Enter one item per line:</p>
          <textarea
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={"Milk\nBread\nEggs\nApples"}
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button onClick={addBulkItems} disabled={!bulkInput.trim()}>Add Items</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChoreRow({ chore, onComplete, onDelete, overdue }: {
  chore: Chore;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  overdue?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      overdue ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-gray-100 dark:border-gray-800'
    }`}>
      <button
        onClick={() => onComplete(chore.id)}
        className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 flex items-center justify-center flex-shrink-0 transition-colors"
        title="Mark done"
      >
        <Check size={12} className="text-gray-400" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">{chore.name}</span>
          {chore.recurrence !== 'none' && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded capitalize">
              {chore.recurrence}
            </span>
          )}
          {overdue && <AlertCircle size={14} className="text-red-500" />}
        </div>
        <div className="flex gap-3 text-xs text-gray-400">
          {chore.nextDue && <span>Due: {formatDate(chore.nextDue)}</span>}
          {chore.lastCompleted && <span>Last done: {formatDate(chore.lastCompleted)}</span>}
          {chore.notes && <span className="truncate">{chore.notes}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(chore.id)} className="text-gray-300 hover:text-red-500 p-1 flex-shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ShoppingItemRow({ item, onToggle, onDelete }: {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`flex items-center gap-3 py-2 px-1 rounded transition-colors ${item.checked ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(item.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
        }`}
      >
        {item.checked && <Check size={12} className="text-white" />}
      </button>
      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {item.name}
        {item.quantity && <span className="text-gray-400 ml-1">({item.quantity})</span>}
      </span>
      <button onClick={() => onDelete(item.id)} className="text-gray-200 hover:text-red-500 p-1 flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
