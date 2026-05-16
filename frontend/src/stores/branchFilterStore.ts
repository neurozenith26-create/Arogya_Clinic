import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The branch dropdown selection shown at the top of every admin screen.
 *
 *   'all'          → super admin's aggregated view across all branches.
 *   <number>       → only this branch's data.
 *
 * For a branch admin (role='admin'), this is effectively locked to their own
 * branch_id; the AdminLayout reconciles `useAuthStore().user.branch_id` into
 * here on every render, so any stale value gets fixed automatically.
 *
 * Hooks that fetch admin data should call `useSelectedBranchId()` and append
 * `branch_id=N` to their API query (skip when it's 'all'). They should also
 * include the value in their React Query `queryKey` so cached data is per-branch.
 */

export type BranchSelection = number | 'all';

interface BranchFilterState {
  selectedBranchId: BranchSelection;
  setSelectedBranchId: (id: BranchSelection) => void;
}

export const useBranchFilterStore = create<BranchFilterState>()(
  persist(
    (set) => ({
      selectedBranchId: 'all',
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),
    }),
    { name: 'arogya-branch-filter' },
  ),
);

/** Convenience selector hook. */
export function useSelectedBranchId(): BranchSelection {
  return useBranchFilterStore((s) => s.selectedBranchId);
}

/** Turns the store value into the API query-param value (or undefined when 'all'). */
export function branchFilterParam(sel: BranchSelection): number | undefined {
  return sel === 'all' ? undefined : sel;
}
