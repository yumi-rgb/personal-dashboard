'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, CheckCircle2, Circle, MapPin, Calendar, DollarSign, Plane } from 'lucide-react';
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
      subtitle: 'Secrets Mirabel Cancun Resort & Spa',
      departureDate: '2026-04-24',
      returnDate: '2026-04-29',
      status: 'booked',
      budget: 3000,
      spent: 0,
      notes: '✅ HOTEL CONFIRMED — Conf #58154228\nSecrets Mirabel Cancun Resort & Spa (Hyatt Secrets — adults-only all-inclusive)\nApr 24 check-in (3pm) → Apr 29 check-out (12pm) · 5 nights · 2 adults\nRoom: Tropical View Balcony King · Paid with Hyatt free night cert (Explorist)\nBlvd. Kukulcan Km 19.5, Cancún · +52 998 891 5000\nCancellation: within 3 days of arrival = 1-night penalty. As Explorist, can cancel until 11:59pm the day before.\nStill need: flights via Frontier Go Wild pass to CUN.',
      createdAt: new Date().toISOString(),
      checklist: [
        makeCheck('Check Frontier Go Wild pass for flights to Cancún (CUN)', 'flights'),
        makeCheck('Book round-trip flights', 'flights'),
        makeCheck('Hotel booked: Secrets Mirabel Cancun Resorts & Spa ✅', 'hotel', true),
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function TravelSection() {
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
          const updatedChecklist = t.checklist.map(c => {
            if (c.label.includes('Book resort or hotel') || c.label.includes('Hotel booked:')) {
              return { ...c, label: 'Hotel booked: Secrets Mirabel Cancun Resort & Spa ✅', done: true };
            }
            return c;
          });
          return {
            ...t,
            destination: 'Cancún, Mexico',
            subtitle: 'Secrets Mirabel Cancun Resort & Spa',
            departureDate: '2026-04-24',
            returnDate: '2026-04-29',
            status: 'booked' as TripStatus,
            notes: '✅ HOTEL CONFIRMED — Conf #58154228\nSecrets Mirabel Cancun Resort & Spa (Hyatt Secrets — adults-only all-inclusive)\nApr 24 check-in (3pm) → Apr 29 check-out (12pm) · 5 nights · 2 adults\nRoom: Tropical View Balcony King · Paid with Hyatt free night cert (Explorist)\nBlvd. Kukulcan Km 19.5, Cancún · +52 998 891 5000\nCancellation: within 3 days of arrival = 1-night penalty. As Explorist, can cancel until 11:59pm the day before.\nStill need: flights via Frontier Go Wild pass to CUN.',
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
            {active.length} trips in planning · Remember: use your <span className="font-medium text-indigo-600 dark:text-indigo-400">Frontier Go Wild pass</span> for flights!
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> Add Trip
        </button>
      </div>

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
    </div>
  );
}
