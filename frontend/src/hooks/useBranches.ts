import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import { USE_MOCK_DATA } from '../lib/mockData';
import type { Branch } from '@arogya/shared';

export const branchQueryKeys = {
  publicList: ['branches', 'public'] as const,
  adminList: ['branches', 'admin'] as const,
};

// ── Public list of active branches ─────────────────────────────────────────
// Used by:
//  • the super-admin branch dropdown (top of every admin screen)
//  • the patient booking flow Step 0 — Branch picker
//  • the public ContactPage to render every branch's address & phone.

const MOCK_BRANCHES: Branch[] = [
  {
    id: 1,
    branch_code: 'AROGYA-MAIN',
    name: 'Arogya Diagnostics — Main Branch',
    address_line1: 'Kolkata Office',
    address_line2: null,
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
    phone: '+919831990734',
    email: 'contact@arogya.in',
    gstin: null,
    upi_id: null,
    upi_payee_name: null,
    business_hours: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    branch_code: 'AROGYA-MUM',
    name: 'Arogya Diagnostics — Mumbai',
    address_line1: 'Andheri West',
    address_line2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    phone: '+912226705000',
    email: 'mumbai@arogya.in',
    gstin: null,
    upi_id: null,
    upi_payee_name: null,
    business_hours: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export function usePublicBranches() {
  return useQuery({
    queryKey: branchQueryKeys.publicList,
    queryFn: async (): Promise<Branch[]> => {
      if (USE_MOCK_DATA) return MOCK_BRANCHES;
      const { data } = await api.get<{ data: Branch[] }>('/public/branches');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — branches change rarely
  });
}

// ── Super-admin: list + manage branch admins ───────────────────────────────

export interface BranchAdminRow {
  branch: Branch;
  admin: {
    id: string;
    email: string | null;
    mobile: string | null;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    last_login_at: string | null;
  } | null;
}

export function useBranchAdmins() {
  return useQuery({
    queryKey: branchQueryKeys.adminList,
    queryFn: async (): Promise<BranchAdminRow[]> => {
      if (USE_MOCK_DATA) {
        return MOCK_BRANCHES.map((branch) => ({
          branch,
          admin:
            branch.id === 1
              ? {
                  id: 'admin-demo',
                  email: 'admin@gmail.com',
                  mobile: '+919831990734',
                  first_name: 'Arogya',
                  last_name: 'Admin',
                  is_active: true,
                  last_login_at: null,
                }
              : null,
        }));
      }
      const { data } = await api.get<{ data: BranchAdminRow[] }>('/admin/branch-admins');
      return data.data;
    },
  });
}

export interface CreateBranchAdminPayload {
  branch: {
    branch_code: string;
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email?: string | null;
    gstin?: string | null;
    upi_id?: string | null;
    upi_payee_name?: string | null;
    business_hours?: Record<string, unknown> | null;
  };
  admin: {
    email: string;
    mobile: string;
    first_name: string;
    last_name: string;
    password: string;
  };
}

export function useCreateBranchAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBranchAdminPayload) => {
      if (USE_MOCK_DATA) {
        // In mock mode we don't persist — but resolve so the form closes
        await new Promise((r) => setTimeout(r, 300));
        return { branchId: Date.now(), adminId: 'mock-admin' };
      }
      const { data } = await api.post<{ data: { branchId: number; adminId: string } }>(
        '/admin/branch-admins',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchQueryKeys.adminList });
      qc.invalidateQueries({ queryKey: branchQueryKeys.publicList });
    },
  });
}

export interface UpdateBranchAdminPayload {
  adminUserId: string;
  branch?: Partial<CreateBranchAdminPayload['branch']>;
  admin?: Partial<Omit<CreateBranchAdminPayload['admin'], 'password'>> & {
    password?: string;
    is_active?: boolean;
  };
}

export function useUpdateBranchAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminUserId, ...body }: UpdateBranchAdminPayload) => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 200));
        return { ok: true };
      }
      const { data } = await api.patch<{ data: { ok: boolean } }>(
        `/admin/branch-admins/${adminUserId}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchQueryKeys.adminList });
      qc.invalidateQueries({ queryKey: branchQueryKeys.publicList });
    },
  });
}

export function useDeleteBranchAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (adminUserId: string) => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 200));
        return { ok: true };
      }
      const { data } = await api.delete<{ data: { ok: boolean } }>(
        `/admin/branch-admins/${adminUserId}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchQueryKeys.adminList });
    },
  });
}
