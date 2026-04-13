'use client';

import { useState } from 'react';
import { Trophy, Plus, Trash2, Gift } from 'lucide-react';
import { usePoints } from '@/lib/PointsContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';

export default function RewardsSection() {
  const { rewards, spendable, pointsLog, redeemReward, addReward, deleteReward } = usePoints();
  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', pointCost: '' });

  const handleRedeem = (id: string) => {
    redeemReward(id);
  };

  const handleAddReward = () => {
    if (!rewardForm.name.trim() || !rewardForm.pointCost) return;
    addReward({
      name: rewardForm.name.trim(),
      description: rewardForm.description.trim(),
      pointCost: Number(rewardForm.pointCost),
    });
    setRewardForm({ name: '', description: '', pointCost: '' });
    setShowAddReward(false);
  };

  const sortedLog = [...pointsLog].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rewards</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Redeem your hard-earned points</p>
        </div>
        <Button onClick={() => setShowAddReward(true)}>
          <Plus size={16} /> Add Reward
        </Button>
      </div>

      {/* Balance banner */}
      <div className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 p-5 flex items-center gap-4 shadow-md">
        <Trophy size={36} className="text-amber-800 flex-shrink-0" />
        <div>
          <div className="text-amber-900 text-sm font-medium">Available Balance</div>
          <div className="text-4xl font-extrabold text-amber-900">{spendable.toLocaleString()} pts</div>
        </div>
      </div>

      {/* Rewards list */}
      <Card title="Available Rewards">
        {rewards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No rewards added yet.</p>
        ) : (
          <div className="space-y-3">
            {rewards.map(reward => {
              const canAfford = !reward.redeemed && spendable >= reward.pointCost;
              const cantAfford = !reward.redeemed && spendable < reward.pointCost;
              return (
                <div
                  key={reward.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    reward.redeemed
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 opacity-75'
                      : cantAfford
                      ? 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 opacity-60'
                      : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <Gift
                      size={24}
                      className={reward.redeemed ? 'text-green-500' : canAfford ? 'text-amber-500' : 'text-gray-400'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{reward.name}</div>
                    {reward.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{reward.description}</div>
                    )}
                    {reward.redeemed && reward.redeemedDate && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Claimed on {formatDate(reward.redeemedDate)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-bold text-sm ${
                      canAfford ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'
                    }`}>
                      {reward.pointCost.toLocaleString()} pts
                    </span>
                    {reward.redeemed ? (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                        Claimed ✓
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canAfford}
                        onClick={() => handleRedeem(reward.id)}
                        className={canAfford
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-0'
                          : ''}
                        variant={canAfford ? 'primary' : 'secondary'}
                      >
                        Redeem
                      </Button>
                    )}
                    {!reward.redeemed && (
                      <button
                        onClick={() => deleteReward(reward.id)}
                        className="text-gray-300 hover:text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Points History */}
      <Card title="Points History">
        {sortedLog.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No points earned yet. Complete habits, workouts, chores, and goals to earn points!</p>
        ) : (
          <div className="space-y-1">
            {sortedLog.slice(0, 50).map(event => (
              <div key={event.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{event.description}</div>
                  <div className="text-xs text-gray-400">{formatDate(event.date)}</div>
                </div>
                <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm flex-shrink-0">
                  +{event.points}
                </span>
              </div>
            ))}
            {sortedLog.length > 50 && (
              <p className="text-xs text-gray-400 text-center pt-2">Showing last 50 events</p>
            )}
          </div>
        )}
        {sortedLog.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
            <span className="text-gray-500">Total events: {sortedLog.length}</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {pointsLog.reduce((s, e) => s + e.points, 0).toLocaleString()} pts total earned
            </span>
          </div>
        )}
      </Card>

      {/* Add Reward Modal */}
      <Modal isOpen={showAddReward} onClose={() => setShowAddReward(false)} title="Add Custom Reward">
        <div className="space-y-4">
          <Input
            label="Reward Name"
            placeholder="e.g. New video game..."
            value={rewardForm.name}
            onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="What is this reward?"
            value={rewardForm.description}
            onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Point Cost"
            type="number"
            min="1"
            placeholder="150"
            value={rewardForm.pointCost}
            onChange={e => setRewardForm(f => ({ ...f, pointCost: e.target.value }))}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAddReward(false)}>Cancel</Button>
            <Button
              onClick={handleAddReward}
              disabled={!rewardForm.name.trim() || !rewardForm.pointCost}
            >
              Add Reward
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
