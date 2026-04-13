'use client';

import { useState } from 'react';
import { Plus, Trash2, Activity, Scale, Ruler } from 'lucide-react';
import { healthStorage } from '@/lib/storage';
import { generateId, today, formatDate } from '@/lib/utils';
import { HealthData, WorkoutEntry, WeightEntry, BodyMetricEntry } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePoints } from '@/lib/PointsContext';

const EXERCISE_TYPES = ['Running', 'Walking', 'Cycling', 'Swimming', 'Weight Training', 'Yoga', 'HIIT', 'Pilates', 'CrossFit', 'Sports', 'Other'];

type SubTab = 'workouts' | 'weight' | 'metrics';

// Weight chart — defined outside component to avoid "components created during render" lint error
function WeightChart({ weights }: { weights: WeightEntry[] }) {
  const recentWeights = weights.slice(-30);
  if (recentWeights.length < 2) {
    return <p className="text-gray-400 text-sm text-center py-8">Log at least 2 weight entries to see a chart.</p>;
  }
  const vals = recentWeights.map(w => w.weight);
  const minW = Math.min(...vals) - 2;
  const maxW = Math.max(...vals) + 2;
  const W = 500, H = 150;
  const pad = { l: 40, r: 10, t: 10, b: 30 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const xScale = (i: number) => pad.l + (i / (recentWeights.length - 1)) * plotW;
  const yScale = (w: number) => pad.t + plotH - ((w - minW) / (maxW - minW)) * plotH;

  const points = recentWeights.map((w, i) => `${xScale(i)},${yScale(w.weight)}`).join(' ');
  const area = `${pad.l},${pad.t + plotH} ${points} ${xScale(recentWeights.length - 1)},${pad.t + plotH}`;
  const yLabels = [minW, (minW + maxW) / 2, maxW].map(v => Math.round(v));
  const step = Math.max(1, Math.floor(recentWeights.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {yLabels.map((v, i) => {
        const y = yScale(v);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
            <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">{v}</text>
          </g>
        );
      })}
      <polygon points={area} fill="#6366f1" fillOpacity="0.1" />
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {recentWeights.map((w, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(w.weight)} r="3" fill="#6366f1" />
      ))}
      {recentWeights.filter((_, i) => i % step === 0).map((w, i) => (
        <text key={w.id} x={xScale(i * step)} y={H - 5} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
          {w.date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function initHealthData(): HealthData {
  const d = healthStorage.get();
  return d;
}

function initMetricForm(data: HealthData): Record<string, string> {
  const init: Record<string, string> = {};
  data.metricNames.forEach(n => (init[n] = ''));
  return init;
}

export default function HealthSection() {
  const [data, setData] = useState<HealthData>(initHealthData);
  const [subTab, setSubTab] = useState<SubTab>('workouts');
  const { award } = usePoints();
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showNewMetric, setShowNewMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');

  const [workoutForm, setWorkoutForm] = useState({ date: today(), exerciseType: 'Running', duration: '', notes: '' });
  const [weightForm, setWeightForm] = useState({ date: today(), weight: '' });
  const [metricForm, setMetricForm] = useState<Record<string, string>>(() => initMetricForm(initHealthData()));
  const [metricDate, setMetricDate] = useState(today());

  const save = (updated: HealthData) => {
    setData(updated);
    healthStorage.set(updated);
  };

  const addWorkout = () => {
    if (!workoutForm.duration) return;
    const entry: WorkoutEntry = {
      id: generateId(),
      date: workoutForm.date,
      exerciseType: workoutForm.exerciseType,
      duration: Number(workoutForm.duration),
      notes: workoutForm.notes,
    };
    save({ ...data, workouts: [entry, ...data.workouts] });
    // Award 25 pts for logging a workout (idempotent by workout id)
    award({
      date: workoutForm.date,
      action: 'workout',
      description: `Workout logged: ${workoutForm.exerciseType} (${workoutForm.duration} min)`,
      points: 25,
      key: `workout_${entry.id}`,
    });
    setWorkoutForm({ date: today(), exerciseType: 'Running', duration: '', notes: '' });
    setShowWorkoutForm(false);
  };

  const deleteWorkout = (id: string) => save({ ...data, workouts: data.workouts.filter(w => w.id !== id) });

  const addWeight = () => {
    if (!weightForm.weight) return;
    const entry: WeightEntry = { id: generateId(), date: weightForm.date, weight: Number(weightForm.weight) };
    const updated = [...data.weights, entry].sort((a, b) => a.date.localeCompare(b.date));
    save({ ...data, weights: updated });
    setWeightForm({ date: today(), weight: '' });
    setShowWeightForm(false);
  };

  const deleteWeight = (id: string) => save({ ...data, weights: data.weights.filter(w => w.id !== id) });

  const addMetricEntry = () => {
    const metrics: Record<string, number> = {};
    let hasAny = false;
    data.metricNames.forEach(n => {
      if (metricForm[n] && !isNaN(Number(metricForm[n]))) {
        metrics[n] = Number(metricForm[n]);
        hasAny = true;
      }
    });
    if (!hasAny) return;
    const entry: BodyMetricEntry = { id: generateId(), date: metricDate, metrics };
    save({ ...data, bodyMetrics: [...data.bodyMetrics, entry].sort((a, b) => a.date.localeCompare(b.date)) });
    const init: Record<string, string> = {};
    data.metricNames.forEach(n => (init[n] = ''));
    setMetricForm(init);
    setShowMetricForm(false);
  };

  const addMetricName = () => {
    if (!newMetricName.trim() || data.metricNames.includes(newMetricName.trim())) return;
    const updated = { ...data, metricNames: [...data.metricNames, newMetricName.trim()] };
    save(updated);
    setMetricForm(f => ({ ...f, [newMetricName.trim()]: '' }));
    setNewMetricName('');
    setShowNewMetric(false);
  };

  const deleteMetricEntry = (id: string) => save({ ...data, bodyMetrics: data.bodyMetrics.filter(m => m.id !== id) });

  const subTabs: { id: SubTab; label: string; icon: typeof Activity }[] = [
    { id: 'workouts', label: 'Workouts', icon: Activity },
    { id: 'weight', label: 'Weight', icon: Scale },
    { id: 'metrics', label: 'Body Metrics', icon: Ruler },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Health</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Track workouts, weight, and body metrics</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
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
            {label}
          </button>
        ))}
      </div>

      {/* Workouts */}
      {subTab === 'workouts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowWorkoutForm(true)}>
              <Plus size={16} /> Log Workout
            </Button>
          </div>
          {data.workouts.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-6">No workouts logged yet.</p></Card>
          ) : (
            <div className="space-y-3">
              {data.workouts.slice(0, 20).map(w => (
                <Card key={w.id}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{w.exerciseType}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{w.duration} min</span>
                        <span className="text-xs text-gray-400">{formatDate(w.date)}</span>
                      </div>
                      {w.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{w.notes}</p>}
                    </div>
                    <button onClick={() => deleteWorkout(w.id)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {data.workouts.length > 0 && (
            <Card title="This Month">
              {(() => {
                const now = new Date();
                const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const thisMonth = data.workouts.filter(w => w.date.startsWith(prefix));
                const totalMin = thisMonth.reduce((s, w) => s + w.duration, 0);
                const byType: Record<string, number> = {};
                thisMonth.forEach(w => (byType[w.exerciseType] = (byType[w.exerciseType] || 0) + 1));
                return (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{thisMonth.length}</div>
                      <div className="text-xs text-gray-500">Workouts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{totalMin}</div>
                      <div className="text-xs text-gray-500">Minutes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{Object.keys(byType).length}</div>
                      <div className="text-xs text-gray-500">Activity types</div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}
        </div>
      )}

      {/* Weight */}
      {subTab === 'weight' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowWeightForm(true)}>
              <Plus size={16} /> Log Weight
            </Button>
          </div>
          <Card title="Weight Over Time">
            <WeightChart weights={data.weights} />
          </Card>
          {data.weights.length > 0 && (
            <Card title="Recent Entries">
              <div className="space-y-2">
                {[...data.weights].reverse().slice(0, 15).map(w => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="text-sm text-gray-500">{formatDate(w.date)}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{w.weight} lbs</span>
                    <button onClick={() => deleteWeight(w.id)} className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {data.weights.length >= 2 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-6 text-sm">
                  <span className="text-gray-500">Change: <span className={`font-semibold ${data.weights[data.weights.length - 1].weight < data.weights[0].weight ? 'text-green-600' : 'text-red-500'}`}>
                    {(data.weights[data.weights.length - 1].weight - data.weights[0].weight).toFixed(1)} lbs
                  </span></span>
                  <span className="text-gray-500">Current: <span className="font-semibold text-gray-900 dark:text-gray-100">{data.weights[data.weights.length - 1].weight} lbs</span></span>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Body Metrics */}
      {subTab === 'metrics' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowNewMetric(true)}>
              <Plus size={16} /> Add Metric Type
            </Button>
            <Button onClick={() => setShowMetricForm(true)}>
              <Plus size={16} /> Log Measurements
            </Button>
          </div>
          {data.bodyMetrics.length === 0 ? (
            <Card><p className="text-gray-400 text-sm text-center py-6">No measurements logged yet.</p></Card>
          ) : (
            <Card title="Measurement History">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 pr-4 text-gray-500 font-medium">Date</th>
                      {data.metricNames.map(n => (
                        <th key={n} className="pb-2 pr-4 text-gray-500 font-medium">{n}</th>
                      ))}
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.bodyMetrics].reverse().map(entry => (
                      <tr key={entry.id} className="border-t border-gray-50 dark:border-gray-800">
                        <td className="py-2 pr-4 text-gray-500">{formatDate(entry.date)}</td>
                        {data.metricNames.map(n => (
                          <td key={n} className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">
                            {entry.metrics[n] !== undefined ? `${entry.metrics[n]}"` : '—'}
                          </td>
                        ))}
                        <td className="py-2">
                          <button onClick={() => deleteMetricEntry(entry.id)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Workout Modal */}
      <Modal isOpen={showWorkoutForm} onClose={() => setShowWorkoutForm(false)} title="Log Workout">
        <div className="space-y-4">
          <Input label="Date" type="date" value={workoutForm.date} onChange={e => setWorkoutForm(f => ({ ...f, date: e.target.value }))} />
          <Select label="Exercise Type" value={workoutForm.exerciseType} onChange={e => setWorkoutForm(f => ({ ...f, exerciseType: e.target.value }))}>
            {EXERCISE_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Duration (minutes)" type="number" min="1" placeholder="30" value={workoutForm.duration} onChange={e => setWorkoutForm(f => ({ ...f, duration: e.target.value }))} />
          <Textarea label="Notes (optional)" placeholder="How did it go?" rows={2} value={workoutForm.notes} onChange={e => setWorkoutForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowWorkoutForm(false)}>Cancel</Button>
            <Button onClick={addWorkout} disabled={!workoutForm.duration}>Log Workout</Button>
          </div>
        </div>
      </Modal>

      {/* Weight Modal */}
      <Modal isOpen={showWeightForm} onClose={() => setShowWeightForm(false)} title="Log Weight">
        <div className="space-y-4">
          <Input label="Date" type="date" value={weightForm.date} onChange={e => setWeightForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Weight (lbs)" type="number" step="0.1" placeholder="165.5" value={weightForm.weight} onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowWeightForm(false)}>Cancel</Button>
            <Button onClick={addWeight} disabled={!weightForm.weight}>Log Weight</Button>
          </div>
        </div>
      </Modal>

      {/* Body Metric Modal */}
      <Modal isOpen={showMetricForm} onClose={() => setShowMetricForm(false)} title="Log Measurements">
        <div className="space-y-4">
          <Input label="Date" type="date" value={metricDate} onChange={e => setMetricDate(e.target.value)} />
          {data.metricNames.map(name => (
            <Input
              key={name}
              label={`${name} (inches)`}
              type="number"
              step="0.1"
              placeholder="Enter measurement"
              value={metricForm[name] || ''}
              onChange={e => setMetricForm(f => ({ ...f, [name]: e.target.value }))}
            />
          ))}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowMetricForm(false)}>Cancel</Button>
            <Button onClick={addMetricEntry}>Save Measurements</Button>
          </div>
        </div>
      </Modal>

      {/* New Metric Name Modal */}
      <Modal isOpen={showNewMetric} onClose={() => setShowNewMetric(false)} title="Add Metric Type">
        <div className="space-y-4">
          <Input
            label="Metric Name"
            placeholder="e.g. Thighs, Neck..."
            value={newMetricName}
            onChange={e => setNewMetricName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMetricName()}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowNewMetric(false)}>Cancel</Button>
            <Button onClick={addMetricName} disabled={!newMetricName.trim()}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
