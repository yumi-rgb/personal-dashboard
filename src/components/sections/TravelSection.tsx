'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle, Calendar, DollarSign, Plane, Star, Phone, Mail, Globe, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { today } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type TripStatus = 'planning' | 'booked' | 'in_progress' | 'completed' | 'cancelled';
type CheckCategory = 'flights' | 'hotel' | 'activities' | 'packing' | 'documents' | 'other';

interface CheckItem {
  id: string;
  label: string;
  done: boolean;
  category: CheckCategory;
}

interface Trip {
  id: string;
  destination: string;
  emoji: string;
  subtitle?: string;
  departureDate?: string;
  returnDate?: string;
  status: TripStatus;
  budget?: number;
  spent?: number;
  notes?: string;
  checklist: CheckItem[];
  createdAt: string;
}

const STORAGE_KEY = 'travel-v1';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TripStatus, string> = {
  planning: 'Planning',
  booked: 'Booked',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<TripStatus, string> = {
  planning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  booked: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400',
};

const CAT_LABELS: Record<CheckCategory, string> = {
  flights: '✈️ Flights',
  hotel: '🏨 Hotel',
  activities: '🎯 Activities',
  packing: '🧳 Packing',
  documents: '📄 Documents',
  other: '📝 Other',
};

const CAT_ORDER: CheckCategory[] = ['flights', 'hotel', 'activities', 'documents', 'packing', 'other'];

function makeCheck(label: string, category: CheckCategory, done = false): CheckItem {
  return { id: crypto.randomUUID(), label, category, done };
}

// ── Seed trips ────────────────────────────────────────────────────────────────

function buildSeedTrips(): Trip[] {
  return [
    {
      id: 'trip-mexico',
      destination: 'Cancún, Mexico',
      emoji: '🇲🇽',
      subtitle: 'Secrets Mirabel → Dreams Sands (Apr 24 – May 1)',
      departureDate: '2026-04-24',
      returnDate: '2026-05-01',
      status: 'booked',
      budget: 3000,
      spent: 672,
      notes: '🏨 HOTEL 1 — Secrets Mirabel Cancun Resort & Spa (Hyatt Secrets)\n✅ Conf #58154228 · Apr 24 check-in (3pm) → Apr 29 check-out (12pm)\nRoom: Tropical View Balcony King · Paid with Hyatt free night cert (Explorist)\nBlvd. Kukulcan Km 19.5 · +52 998 891 5000\nCancel policy: Explorist can cancel until 11:59pm the day before arrival.\n\n🏨 HOTEL 2 — Dreams Sands Cancun Resort & Spa (UVC Member)\n✅ Conf #DD1-58848 · Apr 28 arrival → May 1 departure · 3 nights · $672 USD\nRoom: Partial Ocean View King · UVC Unlimited Nights member rate\nEarly checkout from Secrets on Apr 28, then check into Dreams Sands same day.\nCancel: free 30+ days out; 1-night penalty 7–29 days out; 2-night penalty <7 days.\n\nStill need: flights via Frontier Go Wild pass to CUN.',
      createdAt: new Date().toISOString(),
      checklist: [
        makeCheck('Check Frontier Go Wild pass for flights to Cancún (CUN)', 'flights'),
        makeCheck('Book round-trip flights', 'flights'),
        makeCheck('Hotel 1 booked: Secrets Mirabel Cancun Resort & Spa ✅', 'hotel', true),
        makeCheck('Hotel 2 booked: Dreams Sands Cancun Resort & Spa ✅', 'hotel', true),
        makeCheck('Apr 28 overlap confirmed — early checkout from Secrets, check into Dreams Sands ✅', 'hotel', true),
        makeCheck('Check passport expiry — needs 6 months validity', 'documents'),
        makeCheck('Travel insurance (Chase Sapphire Reserve covers trip cancellation)', 'documents'),
        makeCheck('Research currency exchange / get pesos', 'documents'),
        makeCheck('Book cenote tour', 'activities'),
        makeCheck('Research Tulum or Chichen Itza day trip', 'activities'),
        makeCheck('Book snorkeling or diving excursion', 'activities'),
        makeCheck('Swimwear & cover-ups', 'packing'),
        makeCheck('Sunscreen SPF 50+', 'packing'),
        makeCheck('Light breathable clothing', 'packing'),
        makeCheck('Reef-safe sunscreen for cenotes', 'packing'),
        makeCheck('Portable charger & adapter', 'packing'),
      ],
    },
    {
      id: 'trip-vegas',
      destination: 'Las Vegas, NV',
      emoji: '🎰',
      subtitle: 'Shows, food, and fun',
      status: 'planning',
      budget: 2500,
      spent: 0,
      notes: 'Check Frontier Go Wild pass for flights to LAS. Use Chase Sapphire Reserve for hotel through Chase Travel for 10x points.',
      createdAt: new Date().toISOString(),
      checklist: [
        makeCheck('Check Frontier Go Wild pass for flights to LAS', 'flights'),
        makeCheck('Book flights', 'flights'),
        makeCheck('Book hotel — consider Aria, Bellagio, or Cosmopolitan via Chase Travel (10x pts)', 'hotel'),
        makeCheck('Set gambling budget (cash only)', 'activities'),
        makeCheck('Book a show — Cirque du Soleil, comedy, or magic', 'activities'),
        makeCheck('Restaurant reservations — Joël Robuchon, Nobu, or Hell\'s Kitchen', 'activities'),
        makeCheck('Pool day plans (check resort amenities)', 'activities'),
        makeCheck('Book a spa day', 'activities'),
        makeCheck('Research free/cheap things: Bellagio fountains, Fremont Street', 'activities'),
        makeCheck('Comfortable walking shoes (you will walk MILES)', 'packing'),
        makeCheck('Nice outfit for shows/dinner', 'packing'),
        makeCheck('Sunscreen for outdoor areas', 'packing'),
      ],
    },
    {
      id: 'trip-sedona',
      destination: 'Sedona, AZ',
      emoji: '🔴',
      subtitle: 'Red rocks, hiking & spa',
      status: 'planning',
      budget: 2000,
      spent: 0,
      notes: 'Fly into Phoenix (PHX), ~2hr drive to Sedona. Best in spring (Apr-May) or fall. Use Frontier Go Wild for PHX.',
      createdAt: new Date().toISOString(),
      checklist: [
        makeCheck('Check Frontier Go Wild pass for flights to PHX', 'flights'),
        makeCheck('Book flights to Phoenix', 'flights'),
        makeCheck('Rent a car in Phoenix (Jeep recommended for Red Rock areas)', 'hotel'),
        makeCheck('Book unique lodging — Airbnb with red rock views or L\'Auberge de Sedona', 'hotel'),
        makeCheck('Book spa at Mii amo or Enchantment Resort', 'activities'),
        makeCheck('Hike Devil\'s Bridge Trail (permit required — book early!)', 'activities'),
        makeCheck('Hike Cathedral Rock at sunset', 'activities'),
        makeCheck('Visit Airport Mesa Vortex', 'activities'),
        makeCheck('Book Jeep tour of backcountry', 'activities'),
        makeCheck('Research restaurants: Elote Cafe, Mariposa', 'activities'),
        makeCheck('Visit Tlaquepaque Arts Village for shopping', 'activities'),
        makeCheck('Sturdy hiking boots', 'packing'),
        makeCheck('Layers — warm days, cold nights', 'packing'),
        makeCheck('Trekking poles (optional)', 'packing'),
        makeCheck('National Parks pass (America the Beautiful — $80/yr)', 'documents'),
      ],
    },
    {
      id: 'trip-bourbon',
      destination: 'Kentucky Bourbon Trail',
      emoji: '🥃',
      subtitle: 'Distillery tours — Louisville & Lexington',
      status: 'planning',
      budget: 1500,
      spent: 0,
      notes: '~5hr drive from Cleveland OR fly to Louisville (SDF). Best in spring/fall. Designate a driver or book a tour bus!',
      createdAt: new Date().toISOString(),
      checklist: [
        makeCheck('Decide: drive (~5hrs from Cleveland) or fly to SDF', 'flights'),
        makeCheck('Check Frontier Go Wild pass for Louisville (SDF)', 'flights'),
        makeCheck('Book hotel in Louisville or Lexington', 'hotel'),
        makeCheck('Book Maker\'s Mark Distillery tour (Loretto, KY)', 'activities'),
        makeCheck('Book Buffalo Trace Distillery tour (Frankfort, KY — FREE!)', 'activities'),
        makeCheck('Book Woodford Reserve tour (scenic horse country setting)', 'activities'),
        makeCheck('Book Four Roses Distillery', 'activities'),
        makeCheck('Visit Wild Turkey with Matthew McConaughey\'s brand', 'activities'),
        makeCheck('Louisville: visit Churchill Downs (horse racing!)', 'activities'),
        makeCheck('Louisville: dinner at 610 Magnolia or Proof on Main', 'activities'),
        makeCheck('Designate a driver or book a bourbon tour bus', 'other'),
        makeCheck('Budget for bottle purchases at distilleries', 'other'),
        makeCheck('Casual comfortable clothes (distilleries involve walking)', 'packing'),
        makeCheck('Get Kentucky Bourbon Trail passport (free, collect stamps)', 'documents'),
      ],
    },
  ];
}

// ── Trip Card ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onUpdate, onDelete }: {
  trip: Trip;
  onUpdate: (t: Trip) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newCheckLabel, setNewCheckLabel] = useState('');
  const [newCheckCat, setNewCheckCat] = useState<CheckCategory>('other');
  const [showAddCheck, setShowAddCheck] = useState(false);

  const done = trip.checklist.filter(c => c.done).length;
  const total = trip.checklist.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = CAT_ORDER.reduce<Record<string, CheckItem[]>>((acc, cat) => {
    const items = trip.checklist.filter(c => c.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  function toggleCheck(id: string) {
    onUpdate({ ...trip, checklist: trip.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) });
  }

  function deleteCheck(id: string) {
    onUpdate({ ...trip, checklist: trip.checklist.filter(c => c.id !== id) });
  }

  function addCheck() {
    if (!newCheckLabel.trim()) return;
    const item = makeCheck(newCheckLabel.trim(), newCheckCat);
    onUpdate({ ...trip, checklist: [...trip.checklist, item] });
    setNewCheckLabel('');
    setShowAddCheck(false);
  }

  const budgetUsed = trip.budget ? Math.min(100, ((trip.spent ?? 0) / trip.budget) * 100) : 0;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <span className="text-3xl">{trip.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">{trip.destination}</h3>
              {trip.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{trip.subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[trip.status]}`}>
                {STATUS_LABELS[trip.status]}
              </span>
              <select
                className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                value={trip.status}
                onChange={e => onUpdate({ ...trip, status: e.target.value as TripStatus })}
              >
                {(Object.keys(STATUS_LABELS) as TripStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates & Budget row */}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {(trip.departureDate || trip.returnDate) && (
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {trip.departureDate && new Date(trip.departureDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {trip.returnDate && ` – ${new Date(trip.returnDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            )}
            {trip.budget && (
              <span className="flex items-center gap-1">
                <DollarSign size={13} />
                ${(trip.spent ?? 0).toLocaleString()} / ${trip.budget.toLocaleString()} budget
              </span>
            )}
            <span className="flex items-center gap-1">
              <CheckCircle2 size={13} />
              {done}/{total} checklist items
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => onDelete(trip.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {/* Notes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Notes / Tips</label>
            {editingField === 'notes' ? (
              <div className="flex gap-2">
                <textarea
                  autoFocus
                  className="flex-1 border border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none"
                  rows={3}
                  value={trip.notes ?? ''}
                  onChange={e => onUpdate({ ...trip, notes: e.target.value })}
                  onBlur={() => setEditingField(null)}
                />
              </div>
            ) : (
              <p
                className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 -ml-1"
                onClick={() => setEditingField('notes')}
              >
                {trip.notes || <span className="text-gray-400 italic">Click to add notes…</span>}
              </p>
            )}
          </div>

          {/* Dates & Budget edit row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Depart</label>
              <input type="date" className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={trip.departureDate ?? ''}
                onChange={e => onUpdate({ ...trip, departureDate: e.target.value || undefined })} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Return</label>
              <input type="date" className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={trip.returnDate ?? ''}
                onChange={e => onUpdate({ ...trip, returnDate: e.target.value || undefined })} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Budget ($)</label>
              <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={trip.budget ?? ''}
                onChange={e => onUpdate({ ...trip, budget: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Spent ($)</label>
              <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                value={trip.spent ?? ''}
                onChange={e => onUpdate({ ...trip, spent: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Checklist ({pct}% complete)</label>
              <button
                onClick={() => setShowAddCheck(s => !s)}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus size={12} /> Add item
              </button>
            </div>

            {showAddCheck && (
              <div className="flex gap-2 mb-3">
                <select
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800"
                  value={newCheckCat}
                  onChange={e => setNewCheckCat(e.target.value as CheckCategory)}
                >
                  {CAT_ORDER.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
                <input
                  autoFocus
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
                  placeholder="Checklist item…"
                  value={newCheckLabel}
                  onChange={e => setNewCheckLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCheck()}
                />
                <button onClick={addCheck} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg">Add</button>
              </div>
            )}

            <div className="space-y-3">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">{CAT_LABELS[cat as CheckCategory]}</div>
                  <div className="space-y-1">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button onClick={() => toggleCheck(item.id)} className="flex-shrink-0">
                          {item.done
                            ? <CheckCircle2 size={16} className="text-green-500" />
                            : <Circle size={16} className="text-gray-300 dark:text-gray-600 hover:text-indigo-400" />
                          }
                        </button>
                        <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.label}
                        </span>
                        <button
                          onClick={() => deleteCheck(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Frontier Miles ────────────────────────────────────────────────────────────

const FRONTIER_KEY = 'frontier-account-v1';

interface FrontierAccount {
  miles: number;
  statusPoints: number;
  notes: string;
}

const DEFAULT_FRONTIER: FrontierAccount = {
  miles: 20497,
  statusPoints: 0,
  notes: '',
};

function FrontierSection() {
  const [acct, setAcct] = useState<FrontierAccount>(DEFAULT_FRONTIER);
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FRONTIER_KEY);
      if (stored) setAcct(JSON.parse(stored));
    } catch {}
  }, []);

  function save(next: FrontierAccount) {
    setAcct(next);
    localStorage.setItem(FRONTIER_KEY, JSON.stringify(next));
  }

  // Status tiers
  const tiers = [
    { name: 'Elite Gold', pts: 20000, color: 'text-yellow-600', bg: 'bg-yellow-500' },
    { name: 'Elite Platinum', pts: 50000, color: 'text-slate-500', bg: 'bg-slate-400' },
    { name: 'Elite Diamond', pts: 100000, color: 'text-cyan-600', bg: 'bg-cyan-500' },
  ];
  const nextTier = tiers.find(t => t.pts > acct.statusPoints) ?? tiers[tiers.length - 1];
  const prevPts = tiers[tiers.indexOf(nextTier) - 1]?.pts ?? 0;
  const progress = Math.min(100, ((acct.statusPoints - prevPts) / (nextTier.pts - prevPts)) * 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Plane size={18} className="text-white" />
              <span className="text-lg font-bold">Frontier Miles</span>
            </div>
            <p className="text-green-100 text-sm">Member #90101397359 · Yu Kim Reynolds</p>
            <p className="text-green-100 text-xs mt-0.5">Family Pool Head · 0 additional members</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{acct.miles.toLocaleString()}</div>
            <div className="text-green-200 text-xs">travel miles</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-green-100 mb-0.5">Go Wild! Annual Pass™</div>
            <div className="font-bold">Expires Apr 30, 2027</div>
            <div className="text-xs text-green-200">Auto-renews · All-you-can-fly</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <div className="text-xs text-green-100 mb-0.5">Elite Gold Status</div>
            <div className="font-bold">Expires Dec 31, 2026</div>
            <div className="text-xs text-green-200">Free carry-on · Group 1 boarding</div>
          </div>
        </div>
      </div>

      {/* Miles editor */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">✈️ Miles Balance</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => save({ ...acct, miles: Math.max(0, acct.miles - 500) })} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center hover:bg-green-100 text-sm">−</button>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400 w-24 text-center">{acct.miles.toLocaleString()}</span>
            <button onClick={() => save({ ...acct, miles: acct.miles + 500 })} className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold flex items-center justify-center hover:bg-green-200 text-sm">+</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <div className="font-semibold text-gray-800 dark:text-gray-200">5,000</div>
            <div className="text-xs text-gray-500">min redemption</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
            <div className="font-semibold text-green-700 dark:text-green-400">{Math.floor(acct.miles / 5000)}</div>
            <div className="text-xs text-gray-500">award flights possible</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <div className="font-semibold text-gray-800 dark:text-gray-200">Family</div>
            <div className="text-xs text-gray-500">pool (you're head)</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Miles never expire while your Frontier credit card account is open and in good standing. Use +/− buttons (500 increments) to update balance.</p>
      </Card>

      {/* Status progress */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">🏆 Elite Status Progress</h3>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium text-yellow-600">Elite Gold ✓</span>
              <span>{acct.statusPoints.toLocaleString()} / {nextTier.pts.toLocaleString()} pts → {nextTier.name}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${nextTier.bg}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => save({ ...acct, statusPoints: Math.max(0, acct.statusPoints - 1000) })} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center hover:bg-yellow-100 text-sm">−</button>
            <button onClick={() => save({ ...acct, statusPoints: acct.statusPoints + 1000 })} className="w-7 h-7 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 font-bold flex items-center justify-center hover:bg-yellow-200 text-sm">+</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {tiers.map(t => (
            <div key={t.name} className={`rounded-lg p-2 border ${acct.statusPoints >= t.pts ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className={`font-semibold ${acct.statusPoints >= t.pts ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>{t.name}</div>
              <div className="text-gray-500">{t.pts.toLocaleString()} pts</div>
              {acct.statusPoints >= t.pts && <div className="text-green-600 dark:text-green-400">✓ Achieved</div>}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Status points reset each year. Use +/− (1,000 increments) to track as you fly.</p>
      </Card>

      {/* Elite Gold Benefits */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">⭐ Your Elite Gold Benefits (expires 12/31/26)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['🧳', 'Free carry-on bag'],
            ['💺', 'Premium seat at check-in'],
            ['1️⃣', 'Group 1 boarding'],
            ['🚫', 'No change/cancel fees'],
            ['📞', 'Priority customer care'],
            ['🔄', 'Miles never expire (w/ card)'],
          ].map(([icon, benefit]) => (
            <div key={benefit as string} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>{icon}</span><span>{benefit}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500"><strong>Next tier — Elite Platinum (50k pts):</strong> Free checked bag, premium seat at booking, pet-in-cabin fee waiver, companion travel</p>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 block">Notes</label>
        {editingNotes ? (
          <textarea
            autoFocus
            className="w-full border border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none"
            rows={3}
            value={acct.notes}
            onChange={e => save({ ...acct, notes: e.target.value })}
            onBlur={() => setEditingNotes(false)}
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 -ml-1" onClick={() => setEditingNotes(true)}>
            {acct.notes || <span className="text-gray-400 italic">Click to add notes (flights booked, miles redeemed, etc.)…</span>}
          </p>
        )}
      </Card>
    </div>
  );
}

// ── UVC Membership ────────────────────────────────────────────────────────────

const UVC_KEY = 'uvc-membership-v1';

interface UVCUsage {
  premierNightsUsed: number;   // out of 28 total
  vipWeeksUsed: number;        // out of 8 total
  guestCertsUsed: number;      // out of 12 per year (expire Dec 31)
  firstReservationUsed: boolean; // first one free per anniversary year
  rewardCreditsUsed: number;   // out of 8250
  notes: string;
}

const DEFAULT_UVC: UVCUsage = {
  premierNightsUsed: 0,
  vipWeeksUsed: 0,
  guestCertsUsed: 0,
  firstReservationUsed: false,
  rewardCreditsUsed: 0,
  notes: '',
};

const UVC_BRANDS = [
  { emoji: '🤫', name: 'Secrets Resorts & Spas', note: 'Adults-only, flagship brand' },
  { emoji: '🌅', name: 'Dreams Resorts & Spas', note: 'Family-friendly all-inclusive' },
  { emoji: '🎉', name: 'Breathless Resorts & Spas', note: 'Adults-only, party/social vibe' },
  { emoji: '🌿', name: 'Zoëtry Wellness & Spa', note: 'Boutique wellness, smaller properties' },
  { emoji: '🌞', name: 'Now Resorts & Spas', note: 'Family-friendly, lively atmosphere' },
  { emoji: '☀️', name: 'Sunscape Resorts & Spas', note: 'Budget-friendly, family focus' },
];

const UVC_2FOR1 = [
  'Dreams Las Mareas', 'Dreams Playa Mujeres', 'Dreams Bahía Mita',
  'Breathless Riviera Cancún', 'Breathless Montego Bay', 'Breathless Cabo San Lucas', 'Breathless Cancún Soul',
  'Secrets Maroma', 'Secrets Playa Mujeres', 'Secrets Riviera Cancún', 'Secrets The Vine',
  'Secrets Saint James', 'Secrets Wild Orchid', 'Secrets Puerto Los Cabos', 'Secrets Akumal',
  'Secrets Cap Cana', 'Secrets Papagayo', 'Secrets St. Martin', 'Secrets Moxché', 'Secrets Royal Beach',
  'Secrets Bahía Mita', 'Secrets Tides Punta Cana', 'Secrets Playa Blanca', 'Secrets Tulum',
  'Zoëtry Brand Hotels',
];

function UVCSection() {
  const [usage, setUsage] = useState<UVCUsage>(DEFAULT_UVC);
  const [showBrands, setShowBrands] = useState(false);
  const [show2for1, setShow2for1] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(UVC_KEY);
      if (stored) setUsage(JSON.parse(stored));
    } catch {}
  }, []);

  function save(next: UVCUsage) {
    setUsage(next);
    localStorage.setItem(UVC_KEY, JSON.stringify(next));
  }

  function adj(field: keyof UVCUsage, delta: number, max: number) {
    const cur = usage[field] as number;
    const next = Math.max(0, Math.min(max, cur + delta));
    save({ ...usage, [field]: next });
  }

  const premierNightsLeft = 28 - usage.premierNightsUsed;
  const vipWeeksLeft = 8 - usage.vipWeeksUsed;
  const guestCertsLeft = 12 - usage.guestCertsUsed;
  const rewardCreditsLeft = 8250 - usage.rewardCreditsUsed;

  // Hyatt Explorist status: granted Jun 2025, valid through end of 2027 (current year + 26 months)
  const exploristExpiry = 'December 31, 2027';

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star size={18} className="text-yellow-300 fill-yellow-300" />
              <span className="text-lg font-bold">PLATINUM Membership</span>
            </div>
            <p className="text-teal-100 text-sm">Unlimited Vacation Club® · Contract SA1-010663</p>
            <p className="text-teal-100 text-xs mt-0.5">Signed June 1, 2025 · 40-year term · All AMResorts brands</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-teal-200 mb-0.5">Previous contracts</div>
            <div className="text-xs text-teal-100">ZP1-000619 (Gold Plus)</div>
            <div className="text-xs text-teal-100">SVX-001484 (Choices)</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">${(318.83).toFixed(2)}</div>
            <div className="text-xs text-teal-100">monthly payment</div>
            <div className="text-xs text-teal-200">due 1st of month</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">$185</div>
            <div className="text-xs text-teal-100">annual renewal</div>
            <div className="text-xs text-teal-200">due Jun 1 each year</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">25%</div>
            <div className="text-xs text-teal-100">discount off</div>
            <div className="text-xs text-teal-200">lowest public rate</div>
          </div>
        </div>
      </div>

      {/* Usage Trackers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Premier Nights */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">🌙 Premier Nights</h3>
              <p className="text-xs text-gray-500">Min 2/stay · Deluxe Room (or Preferred if avail) · Excl. major holidays</p>
            </div>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{premierNightsLeft}<span className="text-sm font-normal text-gray-400">/28</span></div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
            <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${(premierNightsLeft / 28) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{usage.premierNightsUsed} used</span>
            <div className="flex items-center gap-2">
              <button onClick={() => adj('premierNightsUsed', -1, 28)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-lg font-bold flex items-center justify-center hover:bg-teal-100">−</button>
              <button onClick={() => adj('premierNightsUsed', 1, 28)} className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-lg font-bold flex items-center justify-center hover:bg-teal-200">+</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">💡 7 nights carried over from ZP1 contract. 11 more release with monthly payments.</p>
        </Card>

        {/* VIP Weeks */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">⭐ VIP Weeks</h3>
              <p className="text-xs text-gray-500">$2,400/week · 2 people · Deluxe Room · All year (excl. holidays)</p>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{vipWeeksLeft}<span className="text-sm font-normal text-gray-400">/8</span></div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
            <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${(vipWeeksLeft / 8) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{usage.vipWeeksUsed} used</span>
            <div className="flex items-center gap-2">
              <button onClick={() => adj('vipWeeksUsed', -1, 8)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-lg font-bold flex items-center justify-center hover:bg-amber-100">−</button>
              <button onClick={() => adj('vipWeeksUsed', 1, 8)} className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-lg font-bold flex items-center justify-center hover:bg-amber-200">+</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">💡 For longer stays — great value at a fixed $2,400/wk vs. full rate.</p>
        </Card>

        {/* Guest Certificates */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">🎟️ Guest Certificates</h3>
              <p className="text-xs text-gray-500">12/year · Friends & family get 25% discount · Expire Dec 31</p>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{guestCertsLeft}<span className="text-sm font-normal text-gray-400">/12</span></div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
            <div className="h-2 bg-purple-500 rounded-full transition-all" style={{ width: `${(guestCertsLeft / 12) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{usage.guestCertsUsed} used</span>
            <div className="flex items-center gap-2">
              <button onClick={() => adj('guestCertsUsed', -1, 12)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-lg font-bold flex items-center justify-center hover:bg-purple-100">−</button>
              <button onClick={() => adj('guestCertsUsed', 1, 12)} className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-lg font-bold flex items-center justify-center hover:bg-purple-200">+</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">First reservation/yr free:</span>
            <button
              onClick={() => save({ ...usage, firstReservationUsed: !usage.firstReservationUsed })}
              className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${usage.firstReservationUsed ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}
            >
              {usage.firstReservationUsed ? 'Used ✓' : 'Available'}
            </button>
          </div>
        </Card>

        {/* U Experiences Reward Credits */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">💎 Reward Credits</h3>
              <p className="text-xs text-gray-500">U Experiences program · Use on cruises, hotels, tours · 1yr expiry</p>
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${rewardCreditsLeft.toLocaleString()}</div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
            <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${(rewardCreditsLeft / 8250) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">${usage.rewardCreditsUsed.toLocaleString()} used</span>
            <div className="flex items-center gap-2">
              <button onClick={() => adj('rewardCreditsUsed', -100, 8250)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold flex items-center justify-center hover:bg-indigo-100">−</button>
              <button onClick={() => adj('rewardCreditsUsed', 100, 8250)} className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold flex items-center justify-center hover:bg-indigo-200">+</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">+$5,500 anniversary credits · 1,000 cruise certificate included</p>
        </Card>
      </div>

      {/* Benefits & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌍</span>
            <span className="font-semibold text-green-800 dark:text-green-300 text-sm">Hyatt Explorist Status</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-400">Valid through <strong>{exploristExpiry}</strong></p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">Room upgrades, late checkout, bonus points, waived resort fees at some properties</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⛵</span>
            <span className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Yacht Certificates</span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400">34–45 ft yachts, up to 16 people</p>
          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Cancún, Cozumel, Puerto Vallarta, Los Cabos, Dominican Republic</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔄</span>
            <span className="font-semibold text-purple-800 dark:text-purple-300 text-sm">RCI Exchange</span>
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-400">4,200 exchange nights (600 weeks)</p>
          <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">2 yr RCI affiliation included · $299 exchange fee/week · Signature Selections access</p>
        </div>
      </div>

      {/* Notes */}
      <Card>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 block">Membership Notes</label>
        {editingNotes ? (
          <textarea
            autoFocus
            className="w-full border border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none"
            rows={3}
            value={usage.notes}
            onChange={e => save({ ...usage, notes: e.target.value })}
            onBlur={() => setEditingNotes(false)}
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 -ml-1" onClick={() => setEditingNotes(true)}>
            {usage.notes || <span className="text-gray-400 italic">Click to add notes (reservations made, upgrades received, etc.)…</span>}
          </p>
        )}
      </Card>

      {/* Contact */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">📞 Contact & Quick Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone size={14} /> <span>US/Canada: 1-844-797-7297</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone size={14} /> <span>Alt: 1-877-923-2582</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Mail size={14} /> <span>memberservices@unlimitedvacationclub.com</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Globe size={14} /> <span>unlimitedvacationclub.com</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
          <div><span className="font-medium">Reservation fee:</span> $25 (1st free/yr)</div>
          <div><span className="font-medium">Min stay:</span> 2 nights</div>
          <div><span className="font-medium">Book ahead:</span> 72hrs minimum</div>
          <div><span className="font-medium">Beneficiary:</span> Carrie Reynolds</div>
        </div>
      </Card>

      {/* Participating Brands */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBrands(b => !b)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-left"
        >
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">🏨 Participating Hotel Brands (PLATINUM — all brands, all seasons)</span>
          {showBrands ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showBrands && (
          <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {UVC_BRANDS.map(b => (
              <div key={b.name} className="flex items-start gap-2">
                <span className="text-lg">{b.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.name}</div>
                  <div className="text-xs text-gray-500">{b.note}</div>
                </div>
              </div>
            ))}
            <div className="sm:col-span-2 mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Info size={12} /> Impression by Secrets suites, Imperial Suites, and Premium Suites excluded from PLATINUM access.
            </div>
          </div>
        )}
      </div>

      {/* 2-for-1 Hotels */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShow2for1(b => !b)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-left"
        >
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">🔥 2-for-1 Category Hotels</span>
          {show2for1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {show2for1 && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-2">These properties have special 2-for-1 pricing for UVC members:</p>
            <div className="flex flex-wrap gap-1.5">
              {UVC_2FOR1.map(h => (
                <span key={h} className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-full px-2.5 py-0.5">{h}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TravelSection() {
  const [activeTab, setActiveTab] = useState<'trips' | 'uvc' | 'frontier'>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDest, setNewDest] = useState('');
  const [newEmoji, setNewEmoji] = useState('✈️');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let trips: Trip[];

      if (stored) {
        const parsed: Trip[] = JSON.parse(stored);
        // Merge: add seed trips that aren't already stored
        const seeds = buildSeedTrips();
        const existingIds = new Set(parsed.map(t => t.id));
        const missing = seeds.filter(s => !existingIds.has(s.id));
        trips = missing.length > 0 ? [...missing, ...parsed] : parsed;
      } else {
        trips = buildSeedTrips();
      }

      // Migration: update Mexico trip to reflect confirmed booking
      trips = trips.map(t => {
        if (t.id === 'trip-mexico' && (t.status === 'planning' || t.departureDate === '2026-04-25')) {
          let updatedChecklist = t.checklist.map(c => {
            if (c.label.includes('Book resort or hotel') || c.label.includes('Hotel booked:') || c.label.includes('Hotel 1 booked:')) {
              return { ...c, label: 'Hotel 1 booked: Secrets Mirabel Cancun Resort & Spa ✅', done: true };
            }
            return c;
          });
          // Add Dreams Sands items if missing
          if (!updatedChecklist.some(c => c.label.includes('Dreams Sands'))) {
            updatedChecklist = [
              ...updatedChecklist,
              { id: crypto.randomUUID(), label: 'Hotel 2 booked: Dreams Sands Cancun Resort & Spa ✅', category: 'hotel' as CheckCategory, done: true },
              { id: crypto.randomUUID(), label: 'Apr 28 overlap confirmed — early checkout from Secrets, check into Dreams Sands ✅', category: 'hotel' as CheckCategory, done: true },
            ];
          }
          return {
            ...t,
            destination: 'Cancún, Mexico',
            subtitle: 'Secrets Mirabel → Dreams Sands (Apr 24 – May 1)',
            departureDate: '2026-04-24',
            returnDate: '2026-05-01',
            status: 'booked' as TripStatus,
            spent: 672,
            notes: '🏨 HOTEL 1 — Secrets Mirabel Cancun Resort & Spa (Hyatt Secrets)\n✅ Conf #58154228 · Award Category C · Apr 24 check-in (3pm) → Apr 29 check-out (12pm)\nRoom: Tropical View Balcony King · Paid with Hyatt free night cert (Explorist)\nBlvd. Kukulcan Km 19.5, Cancún, 77500 Mexico · +52 998 891 5000\nCancel policy: Explorist can cancel until 11:59pm the day before arrival.\n💡 Award chart changes May 2026 — locked in at Category C before price increases.\n\n🏨 HOTEL 2 — Dreams Sands Cancun Resort & Spa (UVC Member)\n✅ Conf #DD1-58848 · Apr 28 arrival → May 1 departure · 3 nights · $672 USD\nRoom: Partial Ocean View King · UVC Unlimited Nights member rate\nEarly checkout from Secrets on Apr 28, then check into Dreams Sands same day.\nCancel: free 30+ days out; 1-night penalty 7–29 days out; 2-night penalty <7 days.\n\nStill need: flights via Frontier Go Wild pass to CUN.',
            checklist: updatedChecklist,
          };
        }
        return t;
      });

      setTrips(trips);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {}
  }, []);

  function save(next: Trip[]) {
    setTrips(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updateTrip(updated: Trip) {
    save(trips.map(t => t.id === updated.id ? updated : t));
  }

  function deleteTrip(id: string) {
    save(trips.filter(t => t.id !== id));
  }

  function addTrip() {
    if (!newDest.trim()) return;
    const trip: Trip = {
      id: crypto.randomUUID(),
      destination: newDest.trim(),
      emoji: newEmoji,
      status: 'planning',
      checklist: [],
      createdAt: new Date().toISOString(),
    };
    save([trip, ...trips]);
    setNewDest('');
    setNewEmoji('✈️');
    setShowAddForm(false);
  }

  const active = trips.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const past = trips.filter(t => t.status === 'completed' || t.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">✈️ Travel Planner</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {active.length} trips planned · <span className="font-medium text-indigo-600 dark:text-indigo-400">Frontier Go Wild</span> for flights · <span className="font-medium text-teal-600 dark:text-teal-400">UVC PLATINUM</span> for hotels
          </p>
        </div>
        {activeTab === 'trips' && (
          <button
            onClick={() => setShowAddForm(s => !s)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Trip
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {([['trips', '🗺️ My Trips'], ['frontier', '🟢 Frontier Miles'], ['uvc', '🌴 UVC Membership']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'uvc' && <UVCSection />}
      {activeTab === 'frontier' && <FrontierSection />}
      {activeTab === 'trips' && (<>

      {showAddForm && (
        <Card>
          <div className="flex gap-3">
            <input
              className="w-16 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-center text-xl bg-white dark:bg-gray-800"
              placeholder="🌍"
              value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)}
            />
            <input
              autoFocus
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Destination (e.g. Paris, France)"
              value={newDest}
              onChange={e => setNewDest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTrip()}
            />
            <button onClick={addTrip} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg">Add</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-lg">Cancel</button>
          </div>
        </Card>
      )}

      {/* Active trips */}
      <div className="space-y-4">
        {active.map(trip => (
          <TripCard key={trip.id} trip={trip} onUpdate={updateTrip} onDelete={deleteTrip} />
        ))}
      </div>

      {/* Past trips */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Past Trips</h3>
          <div className="space-y-4 opacity-60">
            {past.map(trip => (
              <TripCard key={trip.id} trip={trip} onUpdate={updateTrip} onDelete={deleteTrip} />
            ))}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
