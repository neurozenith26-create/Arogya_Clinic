import { Building2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBranchFilterStore } from '../../stores/branchFilterStore';
import { usePublicBranches } from '../../hooks/useBranches';

/**
 * Top-bar control for the multi-branch admin panel.
 *
 *   • role='super_admin' → real dropdown (`All branches` + each active branch).
 *     Selection persists in branchFilterStore and is read by every admin list
 *     hook to send `branch_id=N` to the API.
 *
 *   • role='admin' (branch admin) → non-interactive chip pinned to their
 *     own branch. They cannot see other branches' data.
 */

export function BranchFilterDropdown() {
  const user = useAuthStore((s) => s.user);
  const selectedBranchId = useBranchFilterStore((s) => s.selectedBranchId);
  const setSelectedBranchId = useBranchFilterStore((s) => s.setSelectedBranchId);
  const { data: branches = [], isLoading } = usePublicBranches();

  if (!user) return null;

  // Branch admin: read-only chip
  if (user.role === 'admin') {
    const myBranch = branches.find((b) => b.id === user.branch_id);
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        {myBranch?.name ?? (user.branch_id ? `Branch #${user.branch_id}` : 'No branch assigned')}
      </span>
    );
  }

  // Super admin: real dropdown
  if (user.role === 'super_admin') {
    return (
      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Branch:</span>
        <select
          value={selectedBranchId === 'all' ? 'all' : String(selectedBranchId)}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedBranchId(v === 'all' ? 'all' : Number(v));
          }}
          disabled={isLoading}
          className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return null;
}
