'use client';

import { useState } from 'react';
import { Plus, Trash2, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { habitsStorage } from '@/lib/storage';
import { generateId, today, getStreak, getDaysInMonth, toDateString } from '@/lib/utils';
import { Habit } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePoints } from '@/lib/PointsContext';

const SEED_HABITS: Habit[] = [
  {
    id: 'seed-habit-laundry',
    name: '🧺 Do a load of laundry (wash, dry, fold, put away)',
    createdAt: '2026-04-12',
    completedDates: [],
  },
  {
    id: 'seed-habit-mugs',
    name: '☕ Return mugs & glasses from bedrooms to kitchen (2x/week)',
    createdAt: '2026-04-12',
    completedDates: [],
  },
  {
    id: 'seed-habit-car',
    name: '🚗 Clean out the car (1x/week)',
    createdAt: '2026-04-12',
    completedDates: [],
  },
  {
    id: 'seed-habit-seasonal-clothes',
    name: '🌸 Seasonal clothing swap (every April & October)',
    createdAt: '2026-04-12',
    completedDates: [],
  },
  {
    id: 'seed-habit-hair',
    name: '💇 Dye hair (every 6 weeks)',
    createdAt: '2026-04-12',
    completedDates: [],
  },
];

export default function HabitsSection() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const stored = habitsStorage.get();
    const storedIds = new Set(stored.map(h => h.id));
    const missing = SEED_HABITS.filter(h => !storedIds.has(h.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      habitsStorage.set(merged);
      return merged;
    }
    return stored;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const { award } = usePoints();

  const save = (updated: Habit[]) => {
    setHabits(updated);
    habitsStorage.set(updated);
  };

  const todayStr = today();

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const habit: Habit = {
      id: generateId(),
      name: newHabitName.trim(),
      createdAt: todayStr,
      completedDates: [],
    };
    save([...habits, habit]);
    setNewHabitName('');
    setShowAdd(false);
  };

  const deleteHabit = (id: string) => {
    save(habits.filter(h => h.id !== id));
    if (selectedHabit === id) setSelectedHabit(null);
  };

  const toggleToday = (id: string) => {
    const updatedHabits = habits.map(h => {
      if (h.id !== id) return h;
      const has = h.completedDates.includes(todayStr);
      return {
        ...h,
        completedDates: has
          ? h.completedDates.filter(d => d !== todayStr)
          : [...h.completedDates, todayStr],
      };
    });
    save(updatedHabits);

    // Award points only when checking (not unchecking)
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    const wasChecked = habit.completedDates.includes(todayStr);
    if (!wasChecked) {
      // It's being checked now — award points
      const streak = getStreak([...habit.completedDates, todayStr]);
      const pts = streak >= 7 ? 20 : 10;
      const key = `habit_${id}_${todayStr}`;
      award({
        date: todayStr,
        action: 'habit_check',
        description: `Habit completed: ${habit.name}${streak >= 7 ? ' (7+ day streak!)' : ''}`,
        points: pts,
        key,
      });

      // Check if ALL habits are now done today — bonus (once per day)
      const allDone = updatedHabits.every(h => h.completedDates.includes(todayStr));
      if (allDone && updatedHabits.length > 0) {
        award({
          date: todayStr,
          action: 'habit_bonus',
          description: 'All habits completed today! Bonus!',
          points: 50,
          key: `habit_all_${todayStr}`,
        });
      }
    }
  };

  // Calendar helpers
  const { year, month } = viewMonth;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setViewMonth(v => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setViewMonth(v => {
    const d = new Date(v.year, v.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const selectedHabitData = selectedHabit ? habits.find(h => h.id === selectedHabit) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Habits</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Track your daily habits</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Habit
        </Button>
      </div>

      {/* Today's Check-off */}
      <Card title={`Today — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}>
        {habits.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">
            No habits yet. Add your first habit!
          </p>
        ) : (
          <div className="space-y-3">
            {habits.map(habit => {
              const done = habit.completedDates.includes(todayStr);
              const streak = getStreak(habit.completedDates);
              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    done
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                  onClick={() => toggleToday(habit.id)}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    done
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {done && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 font-medium ${done ? 'text-green-700 dark:text-green-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="flex items-center gap-1 text-orange-500 text-xs font-semibold">
                      <Flame size={14} /> {streak}
                    </span>
                  )}
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {streak >= 7 ? '20 pts' : '10 pts'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedHabit(habit.id === selectedHabit ? null : habit.id); }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                  >
                    Calendar
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteHabit(habit.id); }}
                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {habits.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm text-gray-500">
            <span>{habits.filter(h => h.completedDates.includes(todayStr)).length}/{habits.length} done today</span>
            {habits.every(h => h.completedDates.includes(todayStr)) && habits.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">All done! +50 bonus pts</span>
            )}
          </div>
        )}
      </Card>

      {/* Monthly Calendar View */}
      {selectedHabitData && (
        <Card
          title={`${selectedHabitData.name} — Monthly View`}
          titleRight={
            <button onClick={() => setSelectedHabit(null)} className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          }
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{monthName}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-xs font-medium text-gray-400 pb-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateString(new Date(year, month, day));
              const completed = selectedHabitData.completedDates.includes(dateStr);
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              return (
                <div
                  key={day}
                  title={dateStr}
                  className={`aspect-square flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    completed
                      ? 'bg-green-500 text-white'
                      : isToday
                      ? 'ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : isFuture
                      ? 'text-gray-300 dark:text-gray-700'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-sm text-gray-500">
            <span>{selectedHabitData.completedDates.filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}/{daysInMonth} days this month</span>
            <span className="flex items-center gap-1">
              <Flame size={14} className="text-orange-500" />
              {getStreak(selectedHabitData.completedDates)} day streak
            </span>
          </div>
        </Card>
      )}

      {/* Add Habit Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Habit">
        <div className="space-y-4">
          <Input
            label="Habit Name"
            placeholder="e.g. Exercise, Read, Meditate..."
            value={newHabitName}
            onChange={e => setNewHabitName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addHabit} disabled={!newHabitName.trim()}>Add Habit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
