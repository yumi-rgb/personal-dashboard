'use client';

import { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, Calendar, ExternalLink, CheckCircle2, Plus, Trash2, Star, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const CARD_BENEFITS_URL = 'http://localhost:3000';
const STORAGE_KEY = 'card-benefits-v1';
const WATCHLIST_KEY = 'cards-watchlist-v1';

// ── Cards-to-Consider types ───────────────────────────────────────────────────

type WatchlistStatus = 'watching' | 'apply_when_ready' | 'applied' | 'approved' | 'declined' | 'skipped';
type WatchlistPriority = 'high' | 'medium' | 'low';

interface WatchlistCard {
  id: string;
  name: string;
  issuer: string;
  network?: string;
  annualFee: number;
  welcomeBonus?: string;
  spendRequirement?: string;
  bonusExpires?: string;       // ISO date — when offer ends
  estimatedValue?: number;     // dollar value of welcome bonus
  minCreditScore?: number;
  status: WatchlistStatus;
  priority: WatchlistPriority;
  notes?: string;
  applyUrl?: string;
  createdAt: string;
}

const WATCHLIST_STATUS_LABELS: Record<WatchlistStatus, string> = {
  watching: 'Watching',
  apply_when_ready: 'Apply When Ready',
  applied: 'Applied',
  approved: 'Approved ✅',
  declined: 'Declined',
  skipped: 'Skipped',
};

const WATCHLIST_STATUS_COLORS: Record<WatchlistStatus, string> = {
  watching: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  apply_when_ready: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  applied: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  declined: 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400',
  skipped: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
};

const PRIORITY_COLORS: Record<WatchlistPriority, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-gray-400',
};

function buildSeedWatchlist(): WatchlistCard[] {
  return [
    {
      id: 'wl-alaska-mileage-plan-visa',
      name: 'Alaska Airlines Visa Signature® Card',
      issuer: 'Bank of America',
      network: 'Visa',
      annualFee: 95,
      welcomeBonus: '60,000 miles + Alaska\'s Famous Companion Fare',
      spendRequirement: '$3,000 in first 90 days',
      estimatedValue: 900,
      minCreditScore: 700,
      status: 'apply_when_ready',
      priority: 'high',
      notes: 'Alaska Mileage Plan uses distance-based award chart — great emergency backup (4,500 pts economy on short hops). Partners with American Airlines. Apply once credit score hits 700+. Husband may qualify now.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wl-bilt-mastercard',
      name: 'Bilt Mastercard®',
      issuer: 'Wells Fargo',
      network: 'Mastercard',
      annualFee: 0,
      welcomeBonus: 'No welcome bonus — but earns points on rent (no fee!)',
      estimatedValue: 0,
      minCreditScore: 700,
      status: 'watching',
      priority: 'medium',
      notes: 'No annual fee. Earn points on rent payments with no transaction fee. Bilt transfers to Chase partners + Alaska + Hyatt + AA. Transfers to Hyatt at 1:1 are especially valuable. Apply once score hits 700.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wl-amex-gold',
      name: 'American Express® Gold Card',
      issuer: 'American Express',
      network: 'Amex',
      annualFee: 325,
      welcomeBonus: '60,000–90,000 Membership Rewards points',
      spendRequirement: '$6,000 in first 6 months',
      estimatedValue: 1200,
      minCreditScore: 700,
      status: 'watching',
      priority: 'medium',
      notes: '$240 dining credit + $120 Uber Cash annually offsets most of fee. 4x on dining and groceries. Membership Rewards transfer to Delta, Air France/KLM, British Airways, ANA. Good complement to Sapphire Reserve.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wl-capital-one-venture-business',
      name: 'Capital One Venture Business Card',
      issuer: 'Capital One',
      network: 'Visa',
      annualFee: 95,
      welcomeBonus: 'Up to 150,000 miles (75k after $7.5k spend + 75k after $30k spend)',
      spendRequirement: '$7,500 in 3 months + $30,000 in 6 months',
      estimatedValue: 2775,
      minCreditScore: 680,
      status: 'watching',
      priority: 'high',
      notes: 'BUSINESS CARD — law firm qualifies. $50 Capital One Business Travel credit + $50 software/advertising credit offsets $95 fee. Extra Global Entry/TSA PreCheck credit ($120 every 4 years) — use for husband since your Sapphire Reserve already covered yours. Put firm expenses (Clio, Adobe, office supplies, ads) toward $30k spend requirement. 5x on travel booked through Capital One Business Travel. Apply once credit score hits 680+.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'wl-capital-one-venture-x',
      name: 'Capital One Venture X Rewards Credit Card',
      issuer: 'Capital One',
      network: 'Visa',
      annualFee: 395,
      welcomeBonus: '75,000 miles',
      spendRequirement: '$4,000 in first 3 months',
      estimatedValue: 1125,
      minCreditScore: 720,
      status: 'watching',
      priority: 'low',
      notes: '$300 Capital One Travel credit + 10,000 anniversary miles = net +$90/year after fee. 2x on all purchases (great everyday card). 10x on hotels/cars through Capital One Travel. Perfect for Kentucky Bourbon Trail — use $300 credit for Lexington hotel + 10x on car rental CVG→Lexington. HUSBAND should apply (needs 720+ score). You already have Priority Pass via Sapphire Reserve so lounge benefit is redundant for you.',
      createdAt: new Date().toISOString(),
    },
  ];
}

// ── Types ────────────────────────────────────────────────────────────────────

type BenefitPeriod = 'annual' | 'monthly' | 'semi_annual' | 'quarterly' | 'one_time' | 'per_4_years';
type BenefitStatus = 'unused' | 'active' | 'needs_activation' | 'redeemed' | 'needs_setup';

interface KnownBenefit {
  id: string;
  name: string;
  description: string;
  creditValue: number;        // per-period dollar value
  usedValue: number;
  period: BenefitPeriod;
  annualValue: number;        // total annual dollar value for display
  expiresAt?: string;         // ISO date string for period deadline
  status: BenefitStatus;
  activationNote?: string;
  category: string;
}

interface KnownCard {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  annualFee: number;
  color: string;
  benefits: KnownBenefit[];
}

// ── Hilton Honors Surpass data (updated 4/11/2026) ───────────────────────────

const HILTON_SURPASS: KnownCard = {
  id: 'amex-hilton-surpass-71009',
  name: 'Hilton Honors Surpass® Card',
  issuer: 'American Express',
  last4: '71009',
  annualFee: 150,
  color: '#0f4c81',
  benefits: [
    {
      id: 'hh-hilton-credit-q2',
      name: '$200 Hilton Credit — Q2 2026 (Apr–Jun)',
      description: '$50/quarter statement credit on eligible Hilton purchases. No activation needed.',
      creditValue: 50,
      usedValue: 0,
      period: 'quarterly',
      annualValue: 200,
      expiresAt: '2026-06-30',
      status: 'unused',
      category: 'hotels',
    },
    {
      id: 'hh-free-night',
      name: 'Free Night Reward (spend $15K)',
      description: 'Earn a free night after $15,000 in eligible purchases in a calendar year. Progress: $1,286/$15,000 spent ($13,714 to go).',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2026-12-31',
      status: 'unused',
      activationNote: 'Spend $13,714 more by 12/31/2026 to earn a free night',
      category: 'hotels',
    },
    {
      id: 'hh-points',
      name: '548,549 Hilton Honors Points',
      description: 'Current balance. Worth ~$3,300 in hotel stays at ~0.6¢/point. Earn 12x at Hilton, 6x at U.S. supermarkets and gas stations.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      status: 'active',
      category: 'hotels',
    },
    {
      id: 'hh-diamond-upgrade',
      name: 'Diamond Status Upgrade (spend $40K)',
      description: 'Earn an upgrade to Hilton Honors Diamond status (through end of next calendar year) after $40,000 in eligible purchases. Diamond perks: 100% bonus on base points, executive lounge access, daily food & beverage credit, premium Wi-Fi, space-available room upgrades. Progress: $1,286/$40,000 ($38,714 to go).',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2026-12-31',
      status: 'unused',
      activationNote: 'Spend $38,714 more by 12/31/2026 to unlock Diamond through 2027',
      category: 'hotels',
    },
    {
      id: 'hh-gold-status',
      name: 'Hilton Honors Gold Status',
      description: 'Complimentary Gold status automatically with card. Perks: 80% bonus on base points earned on stays, space-available room upgrades at select properties, daily food & beverage credit at select brands.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      status: 'active',
      category: 'hotels',
    },
    {
      id: 'hh-venue-collection',
      name: 'Amex Venue Collection — Concessions Credit',
      description: '10% back on qualifying concessions purchases at select stadiums/arenas, up to $250 in spend ($25 max back) per calendar year. Also includes dedicated entrances/fast lanes at participating venues. Enrollment required.',
      creditValue: 25,
      usedValue: 0,
      period: 'annual',
      annualValue: 25,
      expiresAt: '2026-12-31',
      status: 'needs_activation',
      activationNote: 'Enroll your Amex Surpass card in the Venue Collection via americanexpress.com',
      category: 'entertainment',
    },
    {
      id: 'hh-national-car',
      name: 'National Car Rental Emerald Club Executive Status',
      description: 'Complimentary National Car Rental Emerald Club Executive® status — skip the counter, choose your car from the Emerald Aisle, guaranteed upgrades. Enrollment required.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      status: 'needs_activation',
      activationNote: 'Enroll via americanexpress.com or national.com using your Amex Surpass card',
      category: 'travel',
    },
  ],
};

// ── Freedom Flex data (updated 4/11/2026) ────────────────────────────────────

const FREEDOM_FLEX: KnownCard = {
  id: 'chase-freedom-flex-5343',
  name: 'Chase Freedom Flex',
  issuer: 'Chase',
  last4: '5343',
  annualFee: 0,
  color: '#1a56db',
  benefits: [
    {
      id: 'ff-5pct-q2',
      name: '5% Cash Back — Q2 2026 (Apr–Jun)',
      description: 'Amazon, Chase Travel, Feeding America. Up to $1,500 spend = max $75 back. Must activate each quarter.',
      creditValue: 75,
      usedValue: 0,
      period: 'quarterly',
      annualValue: 300,
      expiresAt: '2026-06-30',
      status: 'needs_activation',
      activationNote: 'Activate at ultimaterewardspoints.chase.com/freedom/',
      category: 'other',
    },
    {
      id: 'ff-dashpass',
      name: 'DashPass Membership (6-month promo)',
      description: '$60 value — complimentary DashPass for 6 months. Activation required.',
      creditValue: 60,
      usedValue: 0,
      period: 'one_time',
      annualValue: 60,
      status: 'needs_activation',
      activationNote: 'Activate through DoorDash or Caviar app',
      category: 'dining',
    },
    {
      id: 'ff-cell-phone',
      name: 'Cell Phone Protection',
      description: 'Up to $800/claim, $1,000/year, $50 deductible. Pay your cell phone bill with this card to activate coverage. Claims: chasecardbenefits.com or 1-800-349-2691.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      status: 'needs_setup',
      activationNote: 'Pay your monthly cell phone bill with this card',
      category: 'other',
    },
  ],
};

// ── Hardcoded Sapphire Reserve data (updated 4/11/2026) ──────────────────────

const SAPPHIRE_RESERVE: KnownCard = {
  id: 'chase-sapphire-reserve-0302',
  name: 'Chase Sapphire Reserve',
  issuer: 'Chase',
  last4: '0302',
  annualFee: 550,
  color: '#1a1a2e',
  benefits: [
    {
      id: 'csr-edit',
      name: 'The Edit Hotel Credit',
      description: 'Prepaid "Pay Now" bookings at The Edit hotels. Min 2-night stay. Includes daily breakfast for 2, $100 property credit, room upgrade.',
      creditValue: 500,
      usedValue: 0,
      period: 'annual',
      annualValue: 500,
      expiresAt: '2026-12-31',
      status: 'unused',
      category: 'hotels',
    },
    {
      id: 'csr-travel',
      name: 'Annual Travel Credit',
      description: 'Any travel purchase — flights, hotels, Uber, parking, tolls. No activation needed.',
      creditValue: 300,
      usedValue: 0,
      period: 'annual',
      annualValue: 300,
      expiresAt: '2027-02-13',
      status: 'unused',
      category: 'travel',
    },
    {
      id: 'csr-select-hotels',
      name: '$250 Select Hotel Credit',
      description: 'Select hotels through Chase Travel (IHG, Omni, Montage, Pendry, Virgin, Minor, Pan Pacific). Prepaid, min 2-night stay.',
      creditValue: 250,
      usedValue: 0,
      period: 'annual',
      annualValue: 250,
      expiresAt: '2026-12-31',
      status: 'unused',
      category: 'hotels',
    },
    {
      id: 'csr-dining-jan-jun',
      name: 'Dining Credit (Jan–Jun)',
      description: 'Sapphire Reserve Exclusive Tables restaurants on OpenTable.',
      creditValue: 150,
      usedValue: 0,
      period: 'semi_annual',
      annualValue: 300,
      expiresAt: '2026-06-30',
      status: 'unused',
      category: 'dining',
    },
    {
      id: 'csr-stubhub-jan-jun',
      name: 'StubHub Credit (Jan–Jun)',
      description: '$150 credit on StubHub and viagogo purchases. Activated 4/11/2026. Use by 6/30/2026.',
      creditValue: 150,
      usedValue: 0,
      period: 'semi_annual',
      annualValue: 300,
      expiresAt: '2026-06-30',
      status: 'unused',
      category: 'entertainment',
    },
    {
      id: 'csr-doordash',
      name: 'DoorDash Promos',
      description: '$5/mo restaurant orders + 2×$10/mo grocery/retail orders via DashPass.',
      creditValue: 25,
      usedValue: 0,
      period: 'monthly',
      annualValue: 300,
      expiresAt: '2027-12-31',
      status: 'active',
      category: 'dining',
    },
    {
      id: 'csr-lyft',
      name: 'Lyft Credit',
      description: '$10/month in Lyft app credits. Card added to Lyft 4/11/2026. Credit auto-applies each month.',
      creditValue: 10,
      usedValue: 0,
      period: 'monthly',
      annualValue: 120,
      expiresAt: '2027-09-30',
      status: 'active',
      category: 'travel',
    },
    {
      id: 'csr-peloton',
      name: 'Peloton Membership Credit',
      description: '$10/month toward eligible Peloton memberships. Activated 4/11/2026 — membership essentially free.',
      creditValue: 10,
      usedValue: 0,
      period: 'monthly',
      annualValue: 120,
      expiresAt: '2027-12-31',
      status: 'active',
      category: 'health',
    },
    {
      id: 'csr-apple-tv',
      name: 'Apple TV+',
      description: 'Complimentary Apple TV+ subscription (~$12.99/month value). Activated 4/11/2026.',
      creditValue: 12.99,
      usedValue: 0,
      period: 'monthly',
      annualValue: 156,
      expiresAt: '2027-06-22',
      status: 'active',
      category: 'entertainment',
    },
    {
      id: 'csr-apple-music',
      name: 'Apple Music',
      description: 'Complimentary Apple Music subscription (~$10.99/month value). Activated 4/11/2026.',
      creditValue: 10.99,
      usedValue: 0,
      period: 'monthly',
      annualValue: 132,
      expiresAt: '2027-06-22',
      status: 'active',
      category: 'entertainment',
    },
    {
      id: 'csr-priority-pass',
      name: 'Priority Pass Lounge Access',
      description: 'Complimentary access to 1,300+ Priority Pass lounges + Sapphire Lounges by The Club + Air Canada Maple Leaf Lounges. 2 guests free, $27/additional guest.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      status: 'active',
      category: 'travel',
    },
    {
      id: 'csr-dashpass',
      name: 'DashPass Membership',
      description: '$0 delivery fees on eligible DoorDash/Caviar orders. Already activated through 12/31/2027.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2027-12-31',
      status: 'active',
      category: 'dining',
    },
    {
      id: 'csr-ihg',
      name: 'IHG One Rewards Platinum Elite',
      description: 'Complimentary Platinum Elite status through 12/31/2027. Activated 4/11/2026. Member #283927465.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2027-12-31',
      status: 'active',
      category: 'hotels',
    },
    // ── $75K Spend Tier — UNLOCKED in 2025, active through 2026 ─────────────
    {
      id: 'csr-sw-credit',
      name: '$500 Southwest Airlines Chase Travel Credit',
      description: 'Unlocked via $75K spend in 2025. Active through 2026. Use for Southwest bookings through Chase Travel.',
      creditValue: 500,
      usedValue: 0,
      period: 'annual',
      annualValue: 500,
      expiresAt: '2026-12-31',
      status: 'active',
      category: 'travel',
    },
    {
      id: 'csr-shops-credit',
      name: '$250 Credit for The Shops at Chase',
      description: 'Unlocked via $75K spend in 2025. Active through 2026.',
      creditValue: 250,
      usedValue: 0,
      period: 'annual',
      annualValue: 250,
      expiresAt: '2026-12-31',
      status: 'active',
      category: 'other',
    },
    {
      id: 'csr-hyatt-explorist',
      name: 'World of Hyatt Explorist Status',
      description: 'Unlocked via $75K spend in 2025. Active through 2026. Activation required. Hyatt Explorist benefits: 30% bonus points, room upgrades, late checkout.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2026-12-31',
      status: 'needs_activation',
      activationNote: 'Activate on Chase benefits page — link your World of Hyatt account',
      category: 'hotels',
    },
    {
      id: 'csr-ihg-diamond',
      name: 'IHG One Rewards Diamond Elite Status',
      description: 'Unlocked via $75K spend in 2025. Active through 2026. Diamond Elite = upgrade from Platinum. Activation required.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2026-12-31',
      status: 'needs_activation',
      activationNote: 'Activate on Chase benefits page — link your IHG One Rewards membership',
      category: 'hotels',
    },
    {
      id: 'csr-sw-alist',
      name: 'Southwest Airlines A-List Status',
      description: 'Unlocked via $75K spend in 2025. Active through 2026. Activation required. A-List = priority boarding, same-day standby, 25% bonus points.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      expiresAt: '2026-12-31',
      status: 'needs_activation',
      activationNote: 'Activate on Chase benefits page — link your Southwest Rapid Rewards account',
      category: 'travel',
    },
    {
      id: 'csr-global-entry',
      name: 'Global Entry / TSA PreCheck',
      description: '$120 credit every 4 years for Global Entry, TSA PreCheck, or NEXUS application fee. ✅ Already have Global Entry. Use next credit (2030) for husband or Clear+.',
      creditValue: 120,
      usedValue: 120,
      period: 'per_4_years',
      annualValue: 30,
      expiresAt: '2030-12-01',
      status: 'redeemed',
      category: 'travel',
    },
    {
      id: 'csr-clear-plus',
      name: 'Clear+ Membership',
      description: 'Active Clear+ membership (~$189/yr). Biometric ID lane at security — skip the document check line, still use TSA PreCheck lane after. Have both Global Entry + Clear+ = fastest possible airport experience.',
      creditValue: 0,
      usedValue: 0,
      period: 'annual',
      annualValue: 0,
      status: 'active',
      category: 'travel',
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: BenefitStatus) {
  switch (status) {
    case 'active':           return { label: '✓ Active',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    case 'unused':           return { label: 'Unused',         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'needs_activation': return { label: '⚠ Activate',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'needs_setup':      return { label: '⚠ Setup needed', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'redeemed':         return { label: '✓ Redeemed',    cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CardsSection() {
  const [extraData, setExtraData] = useState<{ cards: KnownCard[] } | null>(null);

  useEffect(() => {
    // Try to load any additional cards from card-benefits app localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setExtraData(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const knownCards: KnownCard[] = [SAPPHIRE_RESERVE, FREEDOM_FLEX, HILTON_SURPASS];

  const totalAnnualFee = knownCards.reduce((s, c) => s + c.annualFee, 0);
  const totalAnnualBenefitValue = knownCards.reduce((s, c) => s + c.benefits.reduce((bs, b) => bs + b.annualValue, 0), 0);
  const usedValue = knownCards.reduce((s, c) => s + c.benefits.reduce((bs, b) => bs + b.usedValue, 0), 0);

  const allBenefits = knownCards.flatMap(c => c.benefits.map(b => ({ ...b, cardName: c.name })));

  // Benefits needing action
  const actionNeeded = allBenefits.filter(
    b => b.status === 'needs_activation' || b.status === 'needs_setup'
  );

  // Expiring soon (within 60 days, not redeemed)
  const expiringSoon = allBenefits.filter(b => {
    if (!b.expiresAt || b.status === 'redeemed') return false;
    return daysUntil(b.expiresAt) <= 60 && b.usedValue < b.creditValue;
  }).sort((a, b) => daysUntil(a.expiresAt!) - daysUntil(b.expiresAt!));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Card Benefits</h2>
          <p className="text-sm text-gray-500">{knownCards.length} card tracked</p>
        </div>
        <a
          href={CARD_BENEFITS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800"
        >
          Full App <ExternalLink size={12} />
        </a>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Annual Fee</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalAnnualFee)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Total Benefit Value</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAnnualBenefitValue)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Net Value</p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAnnualBenefitValue - totalAnnualFee)}</p>
        </Card>
      </div>

      {/* Action needed */}
      {actionNeeded.length > 0 && (
        <Card title="Action Required" titleRight={
          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
            {actionNeeded.length}
          </span>
        }>
          <div className="space-y-2">
            {actionNeeded.map(b => (
              <div key={b.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{b.activationNote}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {formatCurrency(b.annualValue)}/year value
                    {b.expiresAt && ` · period ends ${b.expiresAt}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <Card title="Expiring Soon" titleRight={
          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
            {expiringSoon.length}
          </span>
        }>
          <div className="space-y-2">
            {expiringSoon.map(b => {
              const days = daysUntil(b.expiresAt!);
              const remaining = b.creditValue - b.usedValue;
              return (
                <div key={b.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                  days <= 14
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                }`}>
                  <Calendar size={14} className={`mt-0.5 flex-shrink-0 ${days <= 14 ? 'text-red-500' : 'text-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(remaining)} remaining · expires in {days} day{days !== 1 ? 's' : ''}
                    </p>
                    {b.description && <p className="text-xs text-gray-400 mt-0.5">{b.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Full benefits list */}
      {knownCards.map(card => (
        <Card key={card.id} title={card.name} titleRight={
          <span className="text-xs text-gray-400">···{card.last4} · ${card.annualFee}/yr fee</span>
        }>
          <div className="space-y-2">
            {card.benefits.map(b => {
              const badge = statusBadge(b.status);
              const remaining = b.creditValue - b.usedValue;
              return (
                <div key={b.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{b.description}</p>
                    {b.expiresAt && b.status !== 'redeemed' && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <Calendar size={10} className="inline mr-1" />
                        Expires {b.expiresAt} ({daysUntil(b.expiresAt)} days)
                      </p>
                    )}
                    {b.status === 'redeemed' && b.expiresAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <CheckCircle2 size={10} className="inline mr-1 text-green-500" />
                        Renews {b.expiresAt}
                      </p>
                    )}
                    {/* Progress bar for period credits */}
                    {b.status !== 'redeemed' && b.creditValue > 0 && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                          <span>{formatCurrency(b.usedValue)} used</span>
                          <span>{formatCurrency(remaining)} left of {formatCurrency(b.creditValue)}{b.period === 'monthly' ? '/mo' : b.period === 'semi_annual' ? '/6mo' : ''}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.usedValue >= b.creditValue ? 'bg-gray-300' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, (b.usedValue / b.creditValue) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {formatCurrency(b.annualValue)}
                    </span>
                    <p className="text-[10px] text-gray-400">/year</p>
                  </div>
                </div>
              );
            })}
            {/* Card total */}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Total value vs fee</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totalAnnualBenefitValue)} / {formatCurrency(card.annualFee)}
              </span>
            </div>
          </div>
        </Card>
      ))}

      {/* Extra cards from card-benefits app */}
      {extraData && extraData.cards && extraData.cards.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          + {extraData.cards.length} more card{extraData.cards.length !== 1 ? 's' : ''} from the full app
        </p>
      )}

      {/* Cards to Consider */}
      <CardsWatchlist />
    </div>
  );
}

// ── Cards Watchlist Component ─────────────────────────────────────────────────

function CardsWatchlist() {
  const [cards, setCards] = useState<WatchlistCard[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<WatchlistStatus | 'active'>('active');
  const [form, setForm] = useState<Partial<WatchlistCard>>({
    name: '', issuer: '', annualFee: 0, status: 'watching', priority: 'medium', notes: '',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      if (stored) {
        const parsed: WatchlistCard[] = JSON.parse(stored);
        const seeds = buildSeedWatchlist();
        const existingIds = new Set(parsed.map(c => c.id));
        const missing = seeds.filter(s => !existingIds.has(s.id));
        const merged = missing.length > 0 ? [...missing, ...parsed] : parsed;
        setCards(merged);
        if (missing.length > 0) localStorage.setItem(WATCHLIST_KEY, JSON.stringify(merged));
      } else {
        const seeds = buildSeedWatchlist();
        setCards(seeds);
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(seeds));
      }
    } catch {}
  }, []);

  function save(next: WatchlistCard[]) {
    setCards(next);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  }

  function updateCard(id: string, updates: Partial<WatchlistCard>) {
    save(cards.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function deleteCard(id: string) {
    save(cards.filter(c => c.id !== id));
  }

  function addCard() {
    if (!form.name?.trim()) return;
    const card: WatchlistCard = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      issuer: form.issuer?.trim() ?? '',
      annualFee: form.annualFee ?? 0,
      welcomeBonus: form.welcomeBonus?.trim(),
      spendRequirement: form.spendRequirement?.trim(),
      bonusExpires: form.bonusExpires,
      estimatedValue: form.estimatedValue,
      minCreditScore: form.minCreditScore,
      status: form.status ?? 'watching',
      priority: form.priority ?? 'medium',
      notes: form.notes?.trim(),
      applyUrl: form.applyUrl?.trim(),
      createdAt: new Date().toISOString(),
    };
    save([card, ...cards]);
    setForm({ name: '', issuer: '', annualFee: 0, status: 'watching', priority: 'medium', notes: '' });
    setShowAdd(false);
  }

  const activeStatuses: WatchlistStatus[] = ['watching', 'apply_when_ready', 'applied'];
  const filtered = filterStatus === 'active'
    ? cards.filter(c => activeStatuses.includes(c.status))
    : cards.filter(c => c.status === filterStatus);

  const activeCount = cards.filter(c => activeStatuses.includes(c.status)).length;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">🎯 Cards to Consider</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track offers and apply when your credit score is ready</p>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(['active', 'watching', 'apply_when_ready', 'applied', 'approved', 'skipped'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'active' ? `Active (${activeCount})` : WATCHLIST_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-4 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Card name *" value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Issuer (e.g. Chase)" value={form.issuer ?? ''}
              onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))} />
            <input type="number" className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Annual fee ($)" value={form.annualFee ?? ''}
              onChange={e => setForm(f => ({ ...f, annualFee: Number(e.target.value) }))} />
            <input className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Welcome bonus (e.g. 60,000 miles)" value={form.welcomeBonus ?? ''}
              onChange={e => setForm(f => ({ ...f, welcomeBonus: e.target.value }))} />
            <input className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Spend requirement" value={form.spendRequirement ?? ''}
              onChange={e => setForm(f => ({ ...f, spendRequirement: e.target.value }))} />
            <input type="number" className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Estimated value ($)" value={form.estimatedValue ?? ''}
              onChange={e => setForm(f => ({ ...f, estimatedValue: Number(e.target.value) }))} />
            <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              value={form.priority ?? 'medium'}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as WatchlistPriority }))}>
              <option value="high">⭐ High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <input type="number" className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
              placeholder="Min credit score" value={form.minCreditScore ?? ''}
              onChange={e => setForm(f => ({ ...f, minCreditScore: Number(e.target.value) }))} />
            <textarea className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 resize-none"
              rows={2} placeholder="Notes / why you want this card"
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={addCard} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">Add Card</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Card list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No cards in this filter.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Star size={14} className={PRIORITY_COLORS[c.priority]} fill="currentColor" />
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.issuer}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WATCHLIST_STATUS_COLORS[c.status]}`}>
                      {WATCHLIST_STATUS_LABELS[c.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>💳 ${c.annualFee}/yr fee</span>
                    {c.estimatedValue != null && c.estimatedValue > 0 && (
                      <span className="text-green-600 dark:text-green-400 font-medium">🎁 ~${c.estimatedValue} value</span>
                    )}
                    {c.minCreditScore && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Need {c.minCreditScore}+ score
                      </span>
                    )}
                    {c.bonusExpires && (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⏰ Offer ends {new Date(c.bonusExpires + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {c.welcomeBonus && (
                    <p className="text-xs mt-1 text-indigo-600 dark:text-indigo-400 font-medium">
                      🎯 {c.welcomeBonus}
                      {c.spendRequirement && <span className="text-gray-400 font-normal"> — {c.spendRequirement}</span>}
                    </p>
                  )}

                  {c.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{c.notes}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                  <select
                    className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                    value={c.status}
                    onChange={e => updateCard(c.id, { status: e.target.value as WatchlistStatus })}
                  >
                    {(Object.keys(WATCHLIST_STATUS_LABELS) as WatchlistStatus[]).map(s => (
                      <option key={s} value={s}>{WATCHLIST_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button onClick={() => deleteCard(c.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
