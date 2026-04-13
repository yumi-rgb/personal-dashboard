'use client';

import { useState, useEffect } from 'react';
import { Sprout, Printer, Leaf, BookOpen, Plus, CheckCircle2, Clock, ChevronDown, ChevronUp, Trash2, Edit2, X, Check, Star, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// ── Types ────────────────────────────────────────────────────────────────────

type PrintStatus = 'idea' | 'in_progress' | 'done' | 'failed';
type PlantStage = 'seed' | 'seedling' | 'growing' | 'mature' | 'dormant';
type BookStatus = 'want_to_read' | 'reading' | 'finished' | 'abandoned';

interface Book {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages?: number;
  currentPage?: number;
  rating?: number; // 1-5
  notes?: string;
  startedAt?: string;
  finishedAt?: string;
}

interface PrintProject {
  id: string;
  name: string;
  description: string;
  status: PrintStatus;
  filament?: string;
  printTime?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

interface GardenPlant {
  id: string;
  name: string;
  variety?: string;
  location: string; // e.g. 'front bed', 'back yard', 'container'
  stage: PlantStage;
  plantedAt?: string;
  notes?: string;
}

interface Houseplant {
  id: string;
  name: string;
  species?: string;
  location: string; // e.g. 'living room', 'kitchen'
  waterEveryDays: number;
  lastWatered?: string; // ISO date
  notes?: string;
}

type BinStatus = 'active' | 'dormant' | 'new';
type WormPopulation = 'small' | 'medium' | 'large' | 'thriving';

interface VermicompostData {
  binStatus: BinStatus;
  lastFed?: string; // ISO date
  lastHarvested?: string; // ISO date
  notes: string;
  wormPopulation: WormPopulation;
}

type WardrobeStatus = 'have' | 'need' | 'for_sale';
type ClothingCategory = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories' | 'workwear' | 'casual' | 'formal';

interface WardrobeItem {
  id: string;
  name: string;
  category: ClothingCategory;
  size: string;
  status: WardrobeStatus;
  brand?: string;
  notes?: string;
  price?: number;
}

interface HobbiesData {
  printProjects: PrintProject[];
  gardenPlants: GardenPlant[];
  houseplants: Houseplant[];
  books: Book[];
  vermicompost?: VermicompostData;
  wardrobe?: WardrobeItem[];
}

const STORAGE_KEY = 'hobbies-v1';

const DEFAULT_VERMICOMPOST: VermicompostData = {
  binStatus: 'new',
  lastFed: undefined,
  lastHarvested: undefined,
  notes: 'Red wigglers (Eisenia fetida) ordered — arriving in 3-5 days. Bedding: shredded paper + coconut coir. Scan paper → shred → bin → harvest → garden.',
  wormPopulation: 'small',
};

const DEFAULT_WARDROBE: WardrobeItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `dress-sale-${i + 1}`,
  name: `Dress ${i + 1}`,
  category: 'dresses' as ClothingCategory,
  size: '12',
  status: 'for_sale' as WardrobeStatus,
  notes: 'Given to Ash to sell',
}));

const DEFAULT_DATA: HobbiesData = {
  printProjects: [],
  gardenPlants: [],
  houseplants: [],
  books: [],
  vermicompost: DEFAULT_VERMICOMPOST,
  wardrobe: DEFAULT_WARDROBE,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysUntilWater(plant: Houseplant): number | null {
  if (!plant.lastWatered) return null;
  const days = daysSince(plant.lastWatered);
  if (days === null) return null;
  return plant.waterEveryDays - days;
}

function waterStatus(plant: Houseplant): 'overdue' | 'today' | 'soon' | 'ok' {
  const days = daysUntilWater(plant);
  if (days === null) return 'today';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 2) return 'soon';
  return 'ok';
}

const STATUS_COLORS: Record<PrintStatus, string> = {
  idea: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABELS: Record<PrintStatus, string> = {
  idea: 'Idea',
  in_progress: 'Printing',
  done: 'Done',
  failed: 'Failed',
};

const STAGE_LABELS: Record<PlantStage, string> = {
  seed: '🌱 Seed',
  seedling: '🌿 Seedling',
  growing: '🌳 Growing',
  mature: '✅ Mature',
  dormant: '💤 Dormant',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

// ── 3D Printing Section ───────────────────────────────────────────────────────

function PrintingSection({ projects, onChange }: { projects: PrintProject[]; onChange: (p: PrintProject[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', filament: '', printTime: '', notes: '', status: 'idea' as PrintStatus });

  function addProject() {
    if (!form.name.trim()) return;
    const project: PrintProject = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      filament: form.filament.trim() || undefined,
      printTime: form.printTime.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      completedAt: form.status === 'done' ? new Date().toISOString() : undefined,
    };
    onChange([project, ...projects]);
    setForm({ name: '', description: '', filament: '', printTime: '', notes: '', status: 'idea' });
    setShowAdd(false);
  }

  function updateStatus(id: string, status: PrintStatus) {
    onChange(projects.map(p => p.id === id ? {
      ...p, status,
      completedAt: status === 'done' ? new Date().toISOString() : p.completedAt
    } : p));
  }

  function deleteProject(id: string) {
    onChange(projects.filter(p => p.id !== id));
  }

  const counts = { idea: 0, in_progress: 0, done: 0, failed: 0 };
  projects.forEach(p => counts[p.status]++);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Printer size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">3D Printing</h2>
          <span className="text-xs text-gray-500">Flashforge Adventurer 5M</span>
        </div>
        <AddButton onClick={() => setShowAdd(!showAdd)} label="Add Project" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(Object.keys(counts) as PrintStatus[]).map(status => (
          <div key={status} className={`rounded-lg px-3 py-2 text-center ${STATUS_COLORS[status]}`}>
            <div className="text-lg font-bold">{counts[status]}</div>
            <div className="text-xs">{STATUS_LABELS[status]}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Project name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <input
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Filament (e.g. PLA Black)"
              value={form.filament}
              onChange={e => setForm(f => ({ ...f, filament: e.target.value }))}
            />
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Print time (e.g. 4h 30m)"
              value={form.printTime}
              onChange={e => setForm(f => ({ ...f, printTime: e.target.value }))}
            />
          </div>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as PrintStatus }))}
          >
            <option value="idea">Idea</option>
            <option value="in_progress">Printing</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
          </select>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            placeholder="Notes"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={addProject} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
              <Check size={14} /> Add
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Projects list */}
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No projects yet — add your first one!</p>
      ) : (
        <div className="space-y-2">
          {projects.map(project => (
            <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  {project.description && <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>}
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {project.filament && <span className="text-xs text-gray-400">🎨 {project.filament}</span>}
                    {project.printTime && <span className="text-xs text-gray-400">⏱ {project.printTime}</span>}
                  </div>
                  {project.notes && <p className="text-xs text-gray-400 mt-1 italic">{project.notes}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <select
                    className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    value={project.status}
                    onChange={e => updateStatus(project.id, e.target.value as PrintStatus)}
                  >
                    <option value="idea">Idea</option>
                    <option value="in_progress">Printing</option>
                    <option value="done">Done</option>
                    <option value="failed">Failed</option>
                  </select>
                  <button onClick={() => deleteProject(project.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Garden Section ────────────────────────────────────────────────────────────

function GardenSection({ plants, onChange }: { plants: GardenPlant[]; onChange: (p: GardenPlant[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', variety: '', location: '', stage: 'seed' as PlantStage, plantedAt: '', notes: '' });

  function addPlant() {
    if (!form.name.trim()) return;
    const plant: GardenPlant = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      variety: form.variety.trim() || undefined,
      location: form.location.trim() || 'unspecified',
      stage: form.stage,
      plantedAt: form.plantedAt || undefined,
      notes: form.notes.trim() || undefined,
    };
    onChange([...plants, plant]);
    setForm({ name: '', variety: '', location: '', stage: 'seed', plantedAt: '', notes: '' });
    setShowAdd(false);
  }

  function updateStage(id: string, stage: PlantStage) {
    onChange(plants.map(p => p.id === id ? { ...p, stage } : p));
  }

  function deletePlant(id: string) {
    onChange(plants.filter(p => p.id !== id));
  }

  // Group by location
  const byLocation: Record<string, GardenPlant[]> = {};
  plants.forEach(p => {
    if (!byLocation[p.location]) byLocation[p.location] = [];
    byLocation[p.location].push(p);
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sprout size={18} className="text-green-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Garden</h2>
          <span className="text-xs text-gray-500">{plants.length} plants</span>
        </div>
        <AddButton onClick={() => setShowAdd(!showAdd)} label="Add Plant" />
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Plant name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Variety (e.g. Roma tomato)"
              value={form.variety}
              onChange={e => setForm(f => ({ ...f, variety: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Location (e.g. front bed)"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
            <input
              type="date"
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.plantedAt}
              onChange={e => setForm(f => ({ ...f, plantedAt: e.target.value }))}
            />
          </div>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={form.stage}
            onChange={e => setForm(f => ({ ...f, stage: e.target.value as PlantStage }))}
          >
            {(Object.keys(STAGE_LABELS) as PlantStage[]).map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            placeholder="Notes"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={addPlant} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
              <Check size={14} /> Add
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {plants.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No garden plants yet — add your first one!</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byLocation).map(([location, locationPlants]) => (
            <div key={location}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{location}</h3>
              <div className="space-y-2">
                {locationPlants.map(plant => (
                  <div key={plant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{plant.name}</span>
                          {plant.variety && <span className="text-xs text-gray-500">{plant.variety}</span>}
                        </div>
                        <div className="flex gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">{STAGE_LABELS[plant.stage]}</span>
                          {plant.plantedAt && <span className="text-xs text-gray-400">Planted {new Date(plant.plantedAt).toLocaleDateString()}</span>}
                        </div>
                        {plant.notes && <p className="text-xs text-gray-400 mt-1 italic">{plant.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <select
                          className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          value={plant.stage}
                          onChange={e => updateStage(plant.id, e.target.value as PlantStage)}
                        >
                          {(Object.keys(STAGE_LABELS) as PlantStage[]).map(s => (
                            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                          ))}
                        </select>
                        <button onClick={() => deletePlant(plant.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Houseplants Section ───────────────────────────────────────────────────────

function HouseplantsSection({ plants, onChange }: { plants: Houseplant[]; onChange: (p: Houseplant[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', species: '', location: '', waterEveryDays: '7', lastWatered: '', notes: '' });

  function addPlant() {
    if (!form.name.trim()) return;
    const plant: Houseplant = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      species: form.species.trim() || undefined,
      location: form.location.trim() || 'unspecified',
      waterEveryDays: parseInt(form.waterEveryDays) || 7,
      lastWatered: form.lastWatered || undefined,
      notes: form.notes.trim() || undefined,
    };
    onChange([...plants, plant]);
    setForm({ name: '', species: '', location: '', waterEveryDays: '7', lastWatered: '', notes: '' });
    setShowAdd(false);
  }

  function waterPlant(id: string) {
    onChange(plants.map(p => p.id === id ? { ...p, lastWatered: new Date().toISOString().split('T')[0] } : p));
  }

  function deletePlant(id: string) {
    onChange(plants.filter(p => p.id !== id));
  }

  const overdue = plants.filter(p => waterStatus(p) === 'overdue' || waterStatus(p) === 'today');
  const upcoming = plants.filter(p => waterStatus(p) === 'soon');

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf size={18} className="text-emerald-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Houseplants</h2>
          <span className="text-xs text-gray-500">{plants.length} plants</span>
        </div>
        <AddButton onClick={() => setShowAdd(!showAdd)} label="Add Plant" />
      </div>

      {/* Watering alerts */}
      {overdue.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            💧 {overdue.length} plant{overdue.length > 1 ? 's' : ''} need{overdue.length === 1 ? 's' : ''} water today: {overdue.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Plant name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Species (e.g. Monstera deliciosa)"
              value={form.species}
              onChange={e => setForm(f => ({ ...f, species: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Location (e.g. living room)"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                className="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="7"
                value={form.waterEveryDays}
                onChange={e => setForm(f => ({ ...f, waterEveryDays: e.target.value }))}
              />
              <span className="text-sm text-gray-500">days between watering</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Last watered:</label>
            <input
              type="date"
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.lastWatered}
              onChange={e => setForm(f => ({ ...f, lastWatered: e.target.value }))}
            />
          </div>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            placeholder="Notes (light requirements, soil, etc.)"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={addPlant} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
              <Check size={14} /> Add
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {plants.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No houseplants yet — add your first one!</p>
      ) : (
        <div className="space-y-2">
          {plants
            .slice()
            .sort((a, b) => {
              const da = daysUntilWater(a) ?? 999;
              const db = daysUntilWater(b) ?? 999;
              return da - db;
            })
            .map(plant => {
              const status = waterStatus(plant);
              const daysLeft = daysUntilWater(plant);
              return (
                <div
                  key={plant.id}
                  className={`border rounded-lg p-3 ${
                    status === 'overdue' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/10' :
                    status === 'today' ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10' :
                    status === 'soon' ? 'border-blue-200 dark:border-blue-900' :
                    'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{plant.name}</span>
                        {plant.species && <span className="text-xs text-gray-500 italic">{plant.species}</span>}
                        <span className="text-xs text-gray-400">{plant.location}</span>
                      </div>
                      <div className="mt-1">
                        {daysLeft === null ? (
                          <span className="text-xs text-amber-600">Not watered yet</span>
                        ) : daysLeft < 0 ? (
                          <span className="text-xs text-red-600 font-medium">Overdue by {Math.abs(daysLeft)} day{Math.abs(daysLeft) > 1 ? 's' : ''}</span>
                        ) : daysLeft === 0 ? (
                          <span className="text-xs text-amber-600 font-medium">Water today</span>
                        ) : (
                          <span className="text-xs text-gray-500">Water in {daysLeft} day{daysLeft > 1 ? 's' : ''}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-2">(every {plant.waterEveryDays}d)</span>
                      </div>
                      {plant.notes && <p className="text-xs text-gray-400 mt-1 italic">{plant.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => waterPlant(plant.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
                      >
                        💧 Water
                      </button>
                      <button onClick={() => deletePlant(plant.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
}

// ── Reading Section ───────────────────────────────────────────────────────────

const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '📚 Want to Read',
  reading: '📖 Reading',
  finished: '✅ Finished',
  abandoned: '❌ Abandoned',
};

const BOOK_STATUS_COLORS: Record<BookStatus, string> = {
  want_to_read: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  reading: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  finished: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  abandoned: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

function StarRating({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`text-lg transition-colors ${n <= (value ?? 0) ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReadingSection({ books, onChange }: { books: Book[]; onChange: (b: Book[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', status: 'want_to_read' as BookStatus, totalPages: '', currentPage: '', notes: '' });

  function addBook() {
    if (!form.title.trim()) return;
    const book: Book = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      author: form.author.trim(),
      status: form.status,
      totalPages: form.totalPages ? parseInt(form.totalPages) : undefined,
      currentPage: form.currentPage ? parseInt(form.currentPage) : undefined,
      notes: form.notes.trim() || undefined,
      startedAt: form.status === 'reading' || form.status === 'finished' ? new Date().toISOString() : undefined,
      finishedAt: form.status === 'finished' ? new Date().toISOString() : undefined,
    };
    onChange([book, ...books]);
    setForm({ title: '', author: '', status: 'want_to_read', totalPages: '', currentPage: '', notes: '' });
    setShowAdd(false);
  }

  function updateBook(id: string, changes: Partial<Book>) {
    onChange(books.map(b => b.id === id ? { ...b, ...changes } : b));
  }

  function deleteBook(id: string) {
    onChange(books.filter(b => b.id !== id));
  }

  const reading = books.filter(b => b.status === 'reading');
  const wantToRead = books.filter(b => b.status === 'want_to_read');
  const finished = books.filter(b => b.status === 'finished');
  const abandoned = books.filter(b => b.status === 'abandoned');

  function BookCard({ book }: { book: Book }) {
    const progress = book.totalPages && book.currentPage ? Math.round((book.currentPage / book.totalPages) * 100) : null;
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900 dark:text-white">{book.title}</span>
              {book.author && <span className="text-xs text-gray-500">by {book.author}</span>}
            </div>
            {progress !== null && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                  <span>p. {book.currentPage} / {book.totalPages}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {book.rating && (
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-sm ${n <= book.rating! ? 'text-amber-400' : 'text-gray-300'}`}>★</span>
                ))}
              </div>
            )}
            {book.notes && <p className="text-xs text-gray-400 mt-1 italic">{book.notes}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <select
              className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              value={book.status}
              onChange={e => updateBook(book.id, {
                status: e.target.value as BookStatus,
                finishedAt: e.target.value === 'finished' ? new Date().toISOString() : book.finishedAt,
                startedAt: (e.target.value === 'reading' || e.target.value === 'finished') && !book.startedAt ? new Date().toISOString() : book.startedAt,
              })}
            >
              {(Object.keys(BOOK_STATUS_LABELS) as BookStatus[]).map(s => (
                <option key={s} value={s}>{BOOK_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button onClick={() => deleteBook(book.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {book.status === 'reading' && book.totalPages && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min="0"
              max={book.totalPages}
              className="w-20 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              placeholder="Page"
              value={book.currentPage ?? ''}
              onChange={e => updateBook(book.id, { currentPage: parseInt(e.target.value) || 0 })}
            />
            <span className="text-xs text-gray-400">current page</span>
          </div>
        )}
        {book.status === 'finished' && !book.rating && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Rate it:</span>
            <StarRating value={book.rating} onChange={n => updateBook(book.id, { rating: n })} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-purple-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Reading</h2>
          <span className="text-xs text-gray-500">{finished.length} finished · {reading.length} in progress</span>
        </div>
        <AddButton onClick={() => setShowAdd(!showAdd)} label="Add Book" />
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Author"
              value={form.author}
              onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as BookStatus }))}
            >
              {(Object.keys(BOOK_STATUS_LABELS) as BookStatus[]).map(s => (
                <option key={s} value={s}>{BOOK_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <input
              type="number"
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Total pages"
              value={form.totalPages}
              onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))}
            />
          </div>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            placeholder="Notes"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={addBook} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg">
              <Check size={14} /> Add
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No books yet — add your first one!</p>
      ) : (
        <div className="space-y-4">
          {reading.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Currently Reading</h3>
              <div className="space-y-2">{reading.map(b => <BookCard key={b.id} book={b} />)}</div>
            </div>
          )}
          {wantToRead.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Want to Read ({wantToRead.length})</h3>
              <div className="space-y-2">{wantToRead.map(b => <BookCard key={b.id} book={b} />)}</div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Finished ({finished.length})</h3>
              <div className="space-y-2">{finished.map(b => <BookCard key={b.id} book={b} />)}</div>
            </div>
          )}
          {abandoned.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Abandoned ({abandoned.length})</h3>
              <div className="space-y-2">{abandoned.map(b => <BookCard key={b.id} book={b} />)}</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Vermicompost Section ──────────────────────────────────────────────────────

const BIN_STATUS_LABELS: Record<BinStatus, string> = {
  active: 'Active',
  dormant: 'Dormant',
  new: 'New',
};

const BIN_STATUS_COLORS: Record<BinStatus, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  dormant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const WORM_POP_LABELS: Record<WormPopulation, string> = {
  small: 'Small (< 500)',
  medium: 'Medium (500-1000)',
  large: 'Large (1000-2000)',
  thriving: 'Thriving (2000+)',
};

function VermicompostSection({ data, onChange }: { data: VermicompostData; onChange: (d: VermicompostData) => void }) {
  const daysSinceFed = data.lastFed ? Math.floor((Date.now() - new Date(data.lastFed).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const feedAlert = daysSinceFed !== null && daysSinceFed >= 7;

  function feedBin() {
    onChange({ ...data, lastFed: new Date().toISOString().split('T')[0] });
  }

  function logHarvest() {
    onChange({ ...data, lastHarvested: new Date().toISOString().split('T')[0] });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪱</span>
          <h2 className="font-semibold text-gray-900 dark:text-white">Vermicompost</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BIN_STATUS_COLORS[data.binStatus]}`}>
            {BIN_STATUS_LABELS[data.binStatus]}
          </span>
        </div>
      </div>

      {/* Feed alert */}
      {feedAlert && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span className="text-sm font-medium">Bin not fed in {daysSinceFed} days — time to feed!</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Bin Status */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bin Status</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={data.binStatus}
            onChange={e => onChange({ ...data, binStatus: e.target.value as BinStatus })}
          >
            {(Object.keys(BIN_STATUS_LABELS) as BinStatus[]).map(s => (
              <option key={s} value={s}>{BIN_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Worm Population */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Worm Population</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={data.wormPopulation}
            onChange={e => onChange({ ...data, wormPopulation: e.target.value as WormPopulation })}
          >
            {(Object.keys(WORM_POP_LABELS) as WormPopulation[]).map(s => (
              <option key={s} value={s}>{WORM_POP_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Last Fed */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Fed</span>
            {data.lastFed && (
              <span className={`text-xs ${feedAlert ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                {daysSinceFed === 0 ? 'Today' : `${daysSinceFed}d ago`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={data.lastFed ?? ''}
              onChange={e => onChange({ ...data, lastFed: e.target.value || undefined })}
            />
            <button
              onClick={feedBin}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex-shrink-0"
            >
              Feed Bin
            </button>
          </div>
        </div>

        {/* Last Harvested */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Harvested</span>
            {data.lastHarvested && (
              <span className="text-xs text-gray-400">
                {Math.floor((Date.now() - new Date(data.lastHarvested).getTime()) / (1000 * 60 * 60 * 24))}d ago
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={data.lastHarvested ?? ''}
              onChange={e => onChange({ ...data, lastHarvested: e.target.value || undefined })}
            />
            <button
              onClick={logHarvest}
              className="px-3 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex-shrink-0"
            >
              Log Harvest
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
        <textarea
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          placeholder="Bedding type, food scraps added, observations..."
          rows={2}
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
        />
      </div>
    </Card>
  );
}

// ── Wardrobe Section ──────────────────────────────────────────────────────────

const WARDROBE_STATUS_LABELS: Record<WardrobeStatus, string> = {
  have: '✅ Have it',
  need: '🛒 Need to buy',
  for_sale: '🏷️ For sale',
};

const WARDROBE_STATUS_COLORS: Record<WardrobeStatus, string> = {
  have: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  need: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  for_sale: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const CLOTHING_CATEGORY_LABELS: Record<ClothingCategory, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  workwear: 'Workwear',
  casual: 'Casual',
  formal: 'Formal',
};

const ALL_CATEGORIES: ClothingCategory[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'workwear', 'casual', 'formal'];

function WardrobeSection({ items, onChange }: { items: WardrobeItem[]; onChange: (items: WardrobeItem[]) => void }) {
  const [filterStatus, setFilterStatus] = useState<WardrobeStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'tops' as ClothingCategory, size: '6', status: 'need' as WardrobeStatus,
    brand: '', notes: '', price: '',
  });

  const counts = {
    have: items.filter(i => i.status === 'have').length,
    need: items.filter(i => i.status === 'need').length,
    for_sale: items.filter(i => i.status === 'for_sale').length,
  };

  const filtered = filterStatus === 'all' ? items : items.filter(i => i.status === filterStatus);

  const grouped = ALL_CATEGORIES.reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Partial<Record<ClothingCategory, WardrobeItem[]>>);

  function addItem() {
    if (!form.name.trim()) return;
    const item: WardrobeItem = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      category: form.category,
      size: form.size.trim() || '6',
      status: form.status,
      brand: form.brand.trim() || undefined,
      notes: form.notes.trim() || undefined,
      price: form.price ? parseFloat(form.price) : undefined,
    };
    onChange([item, ...items]);
    setForm({ name: '', category: 'tops', size: '6', status: 'need', brand: '', notes: '', price: '' });
    setShowAdd(false);
  }

  function updateItem(id: string, changes: Partial<WardrobeItem>) {
    onChange(items.map(i => i.id === id ? { ...i, ...changes } : i));
  }

  function deleteItem(id: string) {
    onChange(items.filter(i => i.id !== id));
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👗</span>
          <h2 className="font-semibold text-gray-900 dark:text-white">Wardrobe</h2>
          <span className="text-xs text-gray-500">Size 6 transition</span>
        </div>
        <AddButton onClick={() => setShowAdd(!showAdd)} label="Add Item" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['have', 'need', 'for_sale'] as WardrobeStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`rounded-lg px-3 py-2 text-center transition-all ${WARDROBE_STATUS_COLORS[s]} ${filterStatus === s ? 'ring-2 ring-offset-1 ring-current' : ''}`}
          >
            <div className="text-lg font-bold">{counts[s]}</div>
            <div className="text-xs">{s === 'for_sale' ? 'For Sale' : s === 'have' ? 'Owned' : 'Need'}</div>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          All ({items.length})
        </button>
        {(['have', 'need', 'for_sale'] as WardrobeStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {s === 'for_sale' ? 'For Sale' : s === 'have' ? 'Owned' : 'Need'} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Item name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Brand (optional)"
              value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as ClothingCategory }))}
            >
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CLOTHING_CATEGORY_LABELS[c]}</option>)}
            </select>
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Size (e.g. 6, S)"
              value={form.size}
              onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
            />
            <select
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as WardrobeStatus }))}
            >
              <option value="have">Have it</option>
              <option value="need">Need to buy</option>
              <option value="for_sale">For sale</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Price (optional)"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
            <input
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
              <Check size={14} /> Add Item
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grouped items */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No items{filterStatus !== 'all' ? ' in this category' : ''} — add some!</p>
      ) : (
        <div className="space-y-4">
          {(Object.entries(grouped) as [ClothingCategory, WardrobeItem[]][]).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CLOTHING_CATEGORY_LABELS[cat]} ({catItems.length})
              </h3>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                        {item.brand && <span className="text-xs text-gray-400">{item.brand}</span>}
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">Size {item.size}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${WARDROBE_STATUS_COLORS[item.status]}`}>{WARDROBE_STATUS_LABELS[item.status]}</span>
                        {item.price && <span className="text-xs text-gray-400">${item.price.toFixed(2)}</span>}
                      </div>
                      {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        value={item.status}
                        onChange={e => updateItem(item.id, { status: e.target.value as WardrobeStatus })}
                      >
                        <option value="have">Have</option>
                        <option value="need">Need</option>
                        <option value="for_sale">For sale</option>
                      </select>
                      <button onClick={() => deleteItem(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HobbiesSection() {
  const [data, setData] = useState<HobbiesData>(DEFAULT_DATA);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData(JSON.parse(stored));
    } catch {}
  }, []);

  function updateData(next: HobbiesData) {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="space-y-6">
      <PrintingSection
        projects={data.printProjects}
        onChange={projects => updateData({ ...data, printProjects: projects })}
      />
      <ReadingSection
        books={data.books ?? []}
        onChange={books => updateData({ ...data, books })}
      />
      <WardrobeSection
        items={data.wardrobe ?? DEFAULT_WARDROBE}
        onChange={wardrobe => updateData({ ...data, wardrobe })}
      />
      <GardenSection
        plants={data.gardenPlants}
        onChange={gardenPlants => updateData({ ...data, gardenPlants })}
      />
      <VermicompostSection
        data={data.vermicompost ?? DEFAULT_VERMICOMPOST}
        onChange={vermicompost => updateData({ ...data, vermicompost })}
      />
      <HouseplantsSection
        plants={data.houseplants}
        onChange={houseplants => updateData({ ...data, houseplants })}
      />
    </div>
  );
}
