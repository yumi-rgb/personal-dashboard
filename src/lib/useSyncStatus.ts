'use client';

import { useState, useCallback } from 'react';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncStatus {
  state: SyncState;
  setSyncing: () => void;
  setSynced: () => void;
  setError: () => void;
}

/**
 * Tracks the current sync state for the Supabase indicator in the header.
 * Components that write to Supabase can call setSyncing/setSynced/setError
 * by pulling this from a shared context, but for a lightweight approach the
 * hook is used directly in Dashboard and a context is provided via SyncContext.
 */
export function useSyncStatus(): SyncStatus {
  const [state, setState] = useState<SyncState>('idle');

  const setSyncing = useCallback(() => {
    setState('syncing');
  }, []);

  const setSynced = useCallback(() => {
    setState('synced');
    // Auto-reset to idle after 2s
    setTimeout(() => setState('idle'), 2000);
  }, []);

  const setError = useCallback(() => {
    setState('error');
    // Auto-reset to idle after 4s
    setTimeout(() => setState('idle'), 4000);
  }, []);

  return { state, setSyncing, setSynced, setError };
}
