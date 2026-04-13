'use client';

import { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, Calendar, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const CARD_BENEFITS_URL = 'http://localhost:3000';
const STORAGE_KEY = 'card-benefits-v1';

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
      description: '$120 credit every 4 years for Global Entry, TSA PreCheck, or NEXUS application fee.',
      creditValue: 120,
      usedValue: 120,
      period: 'per_4_years',
      annualValue: 30,
      expiresAt: '2026-12-01',
      status: 'redeemed',
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
      <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
}
