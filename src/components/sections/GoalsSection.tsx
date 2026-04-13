'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { goalsStorage } from '@/lib/storage';
import { generateId, today, formatDate, daysBetween } from '@/lib/utils';
import { Goal, Milestone } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePoints } from '@/lib/PointsContext';

const SEED_GOALS: Goal[] = [
  {
    id: 'seed-paperless',
    title: 'Go Paperless',
    description: 'Eliminate paper clutter — scan everything important, shred the rest, and stop paper at the source.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-pl-1', title: 'Buy or set up a document scanner', completed: false },
      { id: 'seed-pl-2', title: 'Scan all important documents (tax returns, insurance, legal)', completed: false },
      { id: 'seed-pl-3', title: 'Shred current paper backlog', completed: false },
      { id: 'seed-pl-4', title: 'Switch all bills and statements to paperless', completed: false },
      { id: 'seed-pl-5', title: 'Establish ongoing scan-and-shred habit for incoming mail', completed: false },
    ],
  },
  {
    id: 'seed-files',
    title: 'Organize Electronic Files',
    description: 'Create a clean, consistent folder structure and naming convention for all digital files — work and personal.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-ef-1', title: 'Define folder structure for personal files (Documents, Finance, Legal, etc.)', completed: false },
      { id: 'seed-ef-2', title: 'Define folder structure for law firm files (by case, by year)', completed: false },
      { id: 'seed-ef-3', title: 'Clean up and reorganize existing desktop and downloads', completed: false },
      { id: 'seed-ef-4', title: 'Move all files into new structure', completed: false },
      { id: 'seed-ef-5', title: 'Set naming conventions and document them', completed: false },
    ],
  },
  {
    id: 'seed-debt',
    title: 'Debt Reduction',
    description: 'Pay down the Chase Sapphire Reserve and student loans. Get credit utilization below 30% and clear student loan arrears.',
    targetDate: '2027-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-debt-1', title: 'Clear student loan past-due balance ($5,388)', completed: false },
      { id: 'seed-debt-2', title: 'Get Sapphire Reserve below 80% utilization (~$41K)', completed: false },
      { id: 'seed-debt-3', title: 'Get Sapphire Reserve below 50% utilization (~$25K)', completed: false },
      { id: 'seed-debt-4', title: 'Get Sapphire Reserve below 30% utilization (~$15K)', completed: false },
      { id: 'seed-debt-5', title: 'Enroll in IDR plan for student loans after filing taxes', completed: true },
      { id: 'seed-debt-6', title: 'Pay off student loans completely', completed: false },
    ],
  },
  {
    id: 'seed-simplify',
    title: 'Simplify Life with AI & Technology',
    description: 'Use AI tools, automation, and smart technology to reduce mental load, save time, and run life and the firm more efficiently.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-ai-1', title: 'Connect bank accounts to Wave for automatic transaction sync', completed: false },
      { id: 'seed-ai-2', title: 'Set up AI-assisted task and case management in CMS', completed: false },
      { id: 'seed-ai-3', title: 'Automate recurring bill payments', completed: false },
      { id: 'seed-ai-4', title: 'Use AI for document drafting and legal research', completed: false },
      { id: 'seed-ai-5', title: 'Set up smart home routines (cleaning, reminders, schedules)', completed: false },
      { id: 'seed-ai-6', title: 'Consolidate apps — fewer tools, better integrated', completed: false },
    ],
  },
  {
    id: 'seed-income',
    title: 'Earn More — Multiple Income Streams',
    description: 'Grow total household income through the law firm, passive income, and new revenue sources.',
    targetDate: '2027-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-inc-1', title: 'Define target annual household income goal', completed: false },
      { id: 'seed-inc-2', title: 'Grow law firm revenue by 20% this year', completed: false },
      { id: 'seed-inc-3', title: 'Identify one passive income opportunity (rental, digital product, investment)', completed: false },
      { id: 'seed-inc-4', title: 'Launch or invest in one new income stream', completed: false },
      { id: 'seed-inc-5', title: 'Maximize retirement contributions (SEP-IRA or solo 401k)', completed: false },
    ],
  },
  {
    id: 'seed-stress',
    title: 'Less Stress',
    description: 'Reduce daily stress through better systems, boundaries, delegation, and self-care habits.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-str-1', title: 'Identify top 3 biggest stress sources', completed: false },
      { id: 'seed-str-2', title: 'Delegate or eliminate at least one major stressor', completed: false },
      { id: 'seed-str-3', title: 'Establish a morning routine that starts the day calmly', completed: false },
      { id: 'seed-str-4', title: 'Set clear work-off hours — no client contact after a set time', completed: false },
      { id: 'seed-str-5', title: 'Build a consistent exercise habit (Peloton counts!)', completed: false },
    ],
  },
  {
    id: 'seed-joy',
    title: 'More Joy',
    description: 'Make time for the things that bring genuine happiness — hobbies, people, experiences.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-joy-1', title: 'Schedule one fun trip using Frontier Go Wild pass', completed: false },
      { id: 'seed-joy-2', title: 'Use StubHub credit on a concert or event you really want to attend', completed: false },
      { id: 'seed-joy-3', title: 'Dedicate time weekly to a hobby (3D printing, gardening, reading)', completed: false },
      { id: 'seed-joy-4', title: 'Plan one date night or getaway with Steven', completed: false },
      { id: 'seed-joy-5', title: 'Do one thing purely for fun each week for a month', completed: false },
    ],
  },
  {
    id: 'seed-freetime',
    title: 'More Free Time',
    description: 'Reclaim personal time by automating, delegating, and streamlining the firm and home.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-ft-1', title: 'Identify tasks at work that can be delegated to staff', completed: false },
      { id: 'seed-ft-2', title: 'Automate at least 3 recurring administrative tasks', completed: false },
      { id: 'seed-ft-3', title: 'Establish staff accountability for Wave and case tracking', completed: false },
      { id: 'seed-ft-4', title: 'Block at least one full day off per week', completed: false },
      { id: 'seed-ft-5', title: 'Take a full vacation — no work emails', completed: false },
    ],
  },
  {
    id: 'seed-cooking',
    title: 'Learn to Cook',
    description: 'Build real cooking skills — from basics to confidence in the kitchen. Eat healthier, save money, and enjoy it.',
    targetDate: '2027-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-cook-1', title: 'Learn 5 basic techniques (sauté, roast, simmer, etc.)', completed: false },
      { id: 'seed-cook-2', title: 'Cook at home 3x per week for a full month', completed: false },
      { id: 'seed-cook-3', title: 'Master 10 go-to recipes you actually like', completed: false },
      { id: 'seed-cook-4', title: 'Try one new recipe per week for 2 months', completed: false },
      { id: 'seed-cook-5', title: 'Cook a full dinner for guests', completed: false },
    ],
  },
  {
    id: 'seed-selfcare',
    title: 'Take Better Care of Me',
    description: 'Prioritize physical health, mental health, rest, and personal wellbeing — not as a reward after everything else is done, but as a non-negotiable.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-sc-0', title: 'Build a size 6 wardrobe — shop ThredUp/eBay with proceeds from selling old clothes', completed: false },
      { id: 'seed-sc-1', title: 'Establish a consistent sleep schedule', completed: false },
      { id: 'seed-sc-2', title: 'Work out at least 3x per week (Peloton, walk, anything)', completed: false },
      { id: 'seed-sc-3', title: 'Schedule and attend one medical/dental checkup', completed: false },
      { id: 'seed-sc-4', title: 'Build a morning routine that includes something just for you', completed: false },
      { id: 'seed-sc-5', title: 'Take at least one full day off per week — no exceptions', completed: false },
      { id: 'seed-sc-6', title: 'Do something nourishing for yourself every single day for 30 days', completed: false },
    ],
  },
  {
    id: 'seed-vehicle',
    title: 'Save for a Vehicle',
    description: 'Build up savings for a vehicle purchase — avoid financing if possible, or save a strong down payment to minimize payments.',
    targetDate: '2027-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-veh-1', title: 'Decide on vehicle type and budget', completed: false },
      { id: 'seed-veh-2', title: 'Open a dedicated savings account for vehicle fund', completed: false },
      { id: 'seed-veh-3', title: 'Save $5,000 toward vehicle', completed: false },
      { id: 'seed-veh-4', title: 'Save $10,000 toward vehicle', completed: false },
      { id: 'seed-veh-5', title: 'Save $20,000 toward vehicle', completed: false },
      { id: 'seed-veh-6', title: 'Purchase vehicle', completed: false },
    ],
  },
  {
    id: 'seed-remodel',
    title: 'Remodel the House',
    description: 'Plan and execute home renovations to make the house feel like home — prioritized by impact and budget.',
    targetDate: '2028-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-rem-1', title: 'Make a wish list of all desired renovations', completed: false },
      { id: 'seed-rem-2', title: 'Prioritize by impact and cost', completed: false },
      { id: 'seed-rem-3', title: 'Get estimates for top priority project', completed: false },
      { id: 'seed-rem-4', title: 'Save dedicated remodel fund', completed: false },
      { id: 'seed-rem-5', title: 'Complete first renovation project', completed: false },
    ],
  },
  {
    id: 'seed-house',
    title: 'Beautiful, Clutter-Free Home',
    description: 'Transform the house into a space that feels calm, intentional, and beautiful — not just clean but curated.',
    targetDate: '2026-12-31',
    createdAt: '2026-04-12',
    milestones: [
      { id: 'seed-house-0', title: 'Pull all size 10-12 clothes from closet — bag for Ash to sell', completed: false },
      { id: 'seed-house-1', title: 'Declutter every room — donate, toss, or store', completed: false },
      { id: 'seed-house-2', title: 'Establish a weekly cleaning routine that sticks', completed: false },
      { id: 'seed-house-3', title: 'Create a vision for how each main room should look and feel', completed: false },
      { id: 'seed-house-4', title: 'Make one decorative improvement per room (art, plants, lighting)', completed: false },
      { id: 'seed-house-5', title: 'Everything has a place — nothing lives on counters or floors', completed: false },
      { id: 'seed-house-6', title: 'Maintain the space for 30 days and feel proud of it', completed: false },
    ],
  },
];

export default function GoalsSection() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const stored = goalsStorage.get();
    const storedIds = new Set(stored.map(g => g.id));
    const missing = SEED_GOALS.filter(g => !storedIds.has(g.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      goalsStorage.set(merged);
      return merged;
    }
    return stored;
  });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const { award } = usePoints();

  // Goal form
  const [form, setForm] = useState({ title: '', description: '', targetDate: '' });
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>(['']);

  // Milestone add
  const [addMilestoneGoalId, setAddMilestoneGoalId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const save = (updated: Goal[]) => {
    setGoals(updated);
    goalsStorage.set(updated);
  };

  const openAdd = () => {
    setForm({ title: '', description: '', targetDate: '' });
    setMilestoneInputs(['']);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (goal: Goal) => {
    setForm({ title: goal.title, description: goal.description, targetDate: goal.targetDate });
    setMilestoneInputs(goal.milestones.map(m => m.title));
    setEditId(goal.id);
    setShowForm(true);
  };

  const submitForm = () => {
    if (!form.title.trim()) return;
    const milestones: Milestone[] = milestoneInputs
      .map(t => t.trim())
      .filter(Boolean)
      .map((title, i) => {
        if (editId) {
          const existing = goals.find(g => g.id === editId)?.milestones[i];
          return existing ? { ...existing, title } : { id: generateId(), title, completed: false };
        }
        return { id: generateId(), title, completed: false };
      });

    if (editId) {
      save(goals.map(g => g.id === editId
        ? { ...g, title: form.title.trim(), description: form.description, targetDate: form.targetDate, milestones }
        : g
      ));
    } else {
      const goal: Goal = {
        id: generateId(),
        title: form.title.trim(),
        description: form.description,
        targetDate: form.targetDate,
        milestones,
        createdAt: today(),
      };
      save([...goals, goal]);
    }
    setShowForm(false);
  };

  const deleteGoal = (id: string) => {
    save(goals.filter(g => g.id !== id));
    if (expandedGoal === id) setExpandedGoal(null);
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    const goal = goals.find(g => g.id === goalId);
    const milestone = goal?.milestones.find(m => m.id === milestoneId);
    const wasCompleted = milestone?.completed ?? false;

    save(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        milestones: g.milestones.map(m =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        ),
      };
    }));

    // Award 20 pts when a milestone is being checked (not unchecked)
    if (!wasCompleted && goal && milestone) {
      award({
        date: today(),
        action: 'milestone',
        description: `Milestone completed: "${milestone.title}" (${goal.title})`,
        points: 20,
        key: `milestone_${milestoneId}`,
      });
    }
  };

  const addMilestone = (goalId: string) => {
    if (!newMilestoneTitle.trim()) return;
    save(goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        milestones: [...g.milestones, { id: generateId(), title: newMilestoneTitle.trim(), completed: false }],
      };
    }));
    setNewMilestoneTitle('');
    setAddMilestoneGoalId(null);
  };

  const deleteMilestone = (goalId: string, milestoneId: string) => {
    save(goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) };
    }));
  };

  const getProgress = (goal: Goal): number => {
    if (!goal.milestones.length) return 0;
    return Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100);
  };

  const addMilestoneInput = () => setMilestoneInputs(m => [...m, '']);
  const removeMilestoneInput = (i: number) => setMilestoneInputs(m => m.filter((_, idx) => idx !== i));
  const updateMilestoneInput = (i: number, value: string) => setMilestoneInputs(m => m.map((v, idx) => idx === i ? value : v));

  const completedGoals = goals.filter(g => getProgress(g) === 100);
  const activeGoals = goals.filter(g => getProgress(g) < 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Long-term goals with milestone tracking</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Target size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No goals yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Add your first goal to start tracking progress</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Goals ({activeGoals.length})</h3>
              {activeGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={getProgress(goal)}
                  expanded={expandedGoal === goal.id}
                  onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  onEdit={openEdit}
                  onDelete={deleteGoal}
                  onToggleMilestone={toggleMilestone}
                  onDeleteMilestone={deleteMilestone}
                  onAddMilestone={() => setAddMilestoneGoalId(goal.id)}
                  addMilestoneGoalId={addMilestoneGoalId}
                  setAddMilestoneGoalId={setAddMilestoneGoalId}
                  newMilestoneTitle={newMilestoneTitle}
                  setNewMilestoneTitle={setNewMilestoneTitle}
                  addMilestone={addMilestone}
                />
              ))}
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Completed ({completedGoals.length})</h3>
              {completedGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={100}
                  expanded={expandedGoal === goal.id}
                  onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  onEdit={openEdit}
                  onDelete={deleteGoal}
                  onToggleMilestone={toggleMilestone}
                  onDeleteMilestone={deleteMilestone}
                  onAddMilestone={() => setAddMilestoneGoalId(goal.id)}
                  addMilestoneGoalId={addMilestoneGoalId}
                  setAddMilestoneGoalId={setAddMilestoneGoalId}
                  newMilestoneTitle={newMilestoneTitle}
                  setNewMilestoneTitle={setNewMilestoneTitle}
                  addMilestone={addMilestone}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Goal Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Goal' : 'Add Goal'}>
        <div className="space-y-4">
          <Input
            label="Goal Title"
            placeholder="What do you want to achieve?"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            placeholder="Why is this goal important to you?"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Target Date (optional)"
            type="date"
            value={form.targetDate}
            onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
          />

          {/* Milestones */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">Milestones</label>
            <div className="space-y-2">
              {milestoneInputs.map((val, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={`Milestone ${i + 1}`}
                    value={val}
                    onChange={e => updateMilestoneInput(i, e.target.value)}
                  />
                  {milestoneInputs.length > 1 && (
                    <button
                      onClick={() => removeMilestoneInput(i)}
                      className="text-gray-400 hover:text-red-500 px-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addMilestoneInput}
              className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add milestone
            </button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={!form.title.trim()}>{editId ? 'Save Changes' : 'Add Goal'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GoalCard({
  goal, progress, expanded, onToggleExpand, onEdit, onDelete,
  onToggleMilestone, onDeleteMilestone, onAddMilestone,
  addMilestoneGoalId, setAddMilestoneGoalId, newMilestoneTitle, setNewMilestoneTitle, addMilestone
}: {
  goal: Goal;
  progress: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestone: () => void;
  addMilestoneGoalId: string | null;
  setAddMilestoneGoalId: (id: string | null) => void;
  newMilestoneTitle: string;
  setNewMilestoneTitle: (v: string) => void;
  addMilestone: (goalId: string) => void;
}) {
  const todayStr = today();
  const daysLeft = goal.targetDate ? daysBetween(todayStr, goal.targetDate) : null;
  const isCompleted = progress === 100;

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
        }`}>
          {isCompleted
            ? <Check size={20} className="text-green-600 dark:text-green-400" />
            : <Target size={20} className="text-indigo-600 dark:text-indigo-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{goal.title}</h4>
              {goal.targetDate && (
                <span className={`text-xs ${
                  daysLeft !== null && daysLeft < 0 ? 'text-red-500' :
                  daysLeft !== null && daysLeft <= 30 ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {daysLeft !== null && daysLeft < 0
                    ? `${Math.abs(daysLeft)} days overdue`
                    : daysLeft !== null
                    ? `${daysLeft} days left`
                    : ''
                  } {goal.targetDate && `(${formatDate(goal.targetDate)})`}
                </span>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEdit(goal)} className="text-gray-400 hover:text-indigo-500 p-1">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(goal.id)} className="text-gray-300 hover:text-red-500 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {goal.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{goal.description}</p>
          )}

          {/* Progress bar */}
          {goal.milestones.length > 0 && (
            <div className="mt-3">
              <ProgressBar
                value={progress}
                color={isCompleted ? 'bg-green-500' : 'bg-indigo-500'}
                label={`${goal.milestones.filter(m => m.completed).length}/${goal.milestones.length} milestones`}
              />
            </div>
          )}

          {/* Expand/collapse milestones */}
          {goal.milestones.length > 0 && (
            <button
              onClick={onToggleExpand}
              className="mt-2 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? 'Hide' : 'Show'} milestones
            </button>
          )}
        </div>
      </div>

      {/* Expanded milestones */}
      {expanded && (
        <div className="mt-4 pl-13 ml-13">
          <div className="ml-13 pl-1 border-l-2 border-gray-100 dark:border-gray-800 space-y-2 ml-[52px]">
            {goal.milestones.map(m => (
              <div key={m.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => onToggleMilestone(goal.id, m.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    m.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                >
                  {m.completed && <Check size={10} className="text-white" />}
                </button>
                <span className={`text-sm flex-1 ${m.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {m.title}
                </span>
                <button
                  onClick={() => onDeleteMilestone(goal.id, m.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Add milestone inline */}
            {addMilestoneGoalId === goal.id ? (
              <div className="flex gap-2 mt-2">
                <input
                  autoFocus
                  type="text"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="New milestone..."
                  value={newMilestoneTitle}
                  onChange={e => setNewMilestoneTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addMilestone(goal.id); if (e.key === 'Escape') setAddMilestoneGoalId(null); }}
                />
                <Button size="sm" onClick={() => addMilestone(goal.id)}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddMilestoneGoalId(null)}>Cancel</Button>
              </div>
            ) : (
              <button
                onClick={onAddMilestone}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
              >
                <Plus size={12} /> Add milestone
              </button>
            )}
          </div>
        </div>
      )}

      {/* No milestones yet */}
      {goal.milestones.length === 0 && (
        <div className="mt-3 ml-[52px]">
          {addMilestoneGoalId === goal.id ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="First milestone..."
                value={newMilestoneTitle}
                onChange={e => setNewMilestoneTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMilestone(goal.id); if (e.key === 'Escape') setAddMilestoneGoalId(null); }}
              />
              <Button size="sm" onClick={() => addMilestone(goal.id)}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddMilestoneGoalId(null)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={onAddMilestone}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add milestones
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
