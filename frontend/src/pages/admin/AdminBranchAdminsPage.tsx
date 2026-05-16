import { useEffect, useState } from 'react';
import { Plus, Edit, Save, X, UserMinus, Network } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  useBranchAdmins,
  useCreateBranchAdmin,
  useUpdateBranchAdmin,
  useDeleteBranchAdmin,
  type BranchAdminRow,
} from '../../hooks/useBranches';
import { useAuthStore } from '../../stores/authStore';
import { getApiErrorMessage } from '../../lib/apiClient';
import { Navigate } from 'react-router-dom';

interface FormState {
  // Branch fields
  branch_code: string;
  branch_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  branch_phone: string;
  branch_email: string;
  gstin: string;
  upi_id: string;
  upi_payee_name: string;
  // Admin fields
  admin_email: string;
  admin_mobile: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_password: string;
}

const emptyForm: FormState = {
  branch_code: '',
  branch_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  branch_phone: '',
  branch_email: '',
  gstin: '',
  upi_id: '',
  upi_payee_name: '',
  admin_email: '',
  admin_mobile: '',
  admin_first_name: '',
  admin_last_name: '',
  admin_password: '',
};

function autoBranchCode(city: string): string {
  const cleaned = city.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (!cleaned) return '';
  return `AROGYA-${cleaned}`;
}

export default function AdminBranchAdminsPage() {
  // Super-admin-only page. Branch admins should never reach it — guard
  // belt-and-suspenders here, on top of the layout-level nav hide.
  const user = useAuthStore((s) => s.user);
  const { data: rows = [], isLoading } = useBranchAdmins();
  const createMutation = useCreateBranchAdmin();
  const updateMutation = useUpdateBranchAdmin();
  const deleteMutation = useDeleteBranchAdmin();

  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<BranchAdminRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest branch_code from city only while creating a brand-new row.
  useEffect(() => {
    if (!editingRow && form.city && !form.branch_code) {
      setForm((f) => ({ ...f, branch_code: autoBranchCode(form.city) }));
    }
  }, [form.city, form.branch_code, editingRow]);

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  function openCreate() {
    setEditingRow(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(row: BranchAdminRow) {
    setEditingRow(row);
    setForm({
      branch_code: row.branch.branch_code,
      branch_name: row.branch.name,
      address_line1: row.branch.address_line1,
      address_line2: row.branch.address_line2 ?? '',
      city: row.branch.city,
      state: row.branch.state,
      pincode: row.branch.pincode,
      branch_phone: row.branch.phone,
      branch_email: row.branch.email ?? '',
      gstin: row.branch.gstin ?? '',
      upi_id: row.branch.upi_id ?? '',
      upi_payee_name: row.branch.upi_payee_name ?? '',
      admin_email: row.admin?.email ?? '',
      admin_mobile: row.admin?.mobile ?? '',
      admin_first_name: row.admin?.first_name ?? '',
      admin_last_name: row.admin?.last_name ?? '',
      admin_password: '',
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingRow(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const branchPayload = {
      branch_code: form.branch_code.trim(),
      name: form.branch_name.trim(),
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      phone: form.branch_phone.trim(),
      email: form.branch_email.trim() || null,
      gstin: form.gstin.trim() || null,
      upi_id: form.upi_id.trim() || null,
      upi_payee_name: form.upi_payee_name.trim() || null,
    };

    try {
      if (editingRow) {
        if (!editingRow.admin) {
          setError(
            'This branch has no active admin yet. Disable & recreate, or wait for the team to assign one.',
          );
          return;
        }
        await updateMutation.mutateAsync({
          adminUserId: editingRow.admin.id,
          branch: branchPayload,
          admin: {
            email: form.admin_email.trim() || undefined,
            mobile: form.admin_mobile.trim() || undefined,
            first_name: form.admin_first_name.trim() || undefined,
            last_name: form.admin_last_name.trim() || undefined,
            password: form.admin_password ? form.admin_password : undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          branch: branchPayload,
          admin: {
            email: form.admin_email.trim(),
            mobile: form.admin_mobile.trim(),
            first_name: form.admin_first_name.trim(),
            last_name: form.admin_last_name.trim(),
            password: form.admin_password,
          },
        });
      }
      closeForm();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save branch admin.'));
    }
  }

  async function handleDisable(row: BranchAdminRow) {
    if (!row.admin) return;
    const ok = window.confirm(
      `Disable ${row.admin.first_name ?? row.admin.email}? They will be unable to log in. The branch (${row.branch.name}) stays for historical data.`,
    );
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(row.admin.id);
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to disable admin.'));
    }
  }

  const columns: Column<BranchAdminRow>[] = [
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => (
        <div className="font-medium">
          <div>{row.branch.name}</div>
          <div className="text-xs text-muted-foreground">{row.branch.branch_code}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <div className="text-sm">
          <div>{row.branch.city}</div>
          <div className="text-xs text-muted-foreground">
            {row.branch.state} · {row.branch.pincode}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-sm">{row.branch.phone}</span>,
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (row) =>
        row.admin ? (
          <div className="text-sm">
            <div>
              {row.admin.first_name} {row.admin.last_name}
            </div>
            <div className="text-xs text-muted-foreground">{row.admin.email}</div>
          </div>
        ) : (
          <Badge variant="outline">No admin</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.admin ? (
          row.admin.is_active ? (
            <Badge>Active</Badge>
          ) : (
            <Badge variant="outline">Disabled</Badge>
          )
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(row)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          {row.admin && row.admin.is_active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDisable(row)}
              title="Disable admin"
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Network className="h-6 w-6" />
            Branch Admins
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One branch, one admin. Create a branch and its admin in a single form.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New branch & admin
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable<BranchAdminRow>
              columns={columns}
              data={rows}
              emptyMessage="No branches yet. Click 'New branch & admin' to create the first one."
            />
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeForm}
        >
          <Card
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {editingRow ? `Edit ${editingRow.branch.name}` : 'New branch & admin'}
                </CardTitle>
                <Button type="button" size="icon" variant="ghost" onClick={closeForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Branch details
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="branch_code">Branch code *</Label>
                      <Input
                        id="branch_code"
                        value={form.branch_code}
                        onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
                        placeholder="AROGYA-KOL"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch_name">Branch name *</Label>
                      <Input
                        id="branch_name"
                        value={form.branch_name}
                        onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                        placeholder="Arogya — Salt Lake"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="address_line1">Address line 1 *</Label>
                      <Input
                        id="address_line1"
                        value={form.address_line1}
                        onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="address_line2">Address line 2</Label>
                      <Input
                        id="address_line2"
                        value={form.address_line2}
                        onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        value={form.pincode}
                        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                        placeholder="700001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch_phone">Phone *</Label>
                      <Input
                        id="branch_phone"
                        value={form.branch_phone}
                        onChange={(e) => setForm({ ...form, branch_phone: e.target.value })}
                        placeholder="+919831990734"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch_email">Branch email</Label>
                      <Input
                        id="branch_email"
                        type="email"
                        value={form.branch_email}
                        onChange={(e) => setForm({ ...form, branch_email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={form.gstin}
                        onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="upi_id">UPI ID</Label>
                      <Input
                        id="upi_id"
                        value={form.upi_id}
                        onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                        placeholder="arogya@upi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="upi_payee_name">UPI payee name</Label>
                      <Input
                        id="upi_payee_name"
                        value={form.upi_payee_name}
                        onChange={(e) => setForm({ ...form, upi_payee_name: e.target.value })}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin login
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="admin_first_name">First name *</Label>
                      <Input
                        id="admin_first_name"
                        value={form.admin_first_name}
                        onChange={(e) => setForm({ ...form, admin_first_name: e.target.value })}
                        required={!editingRow}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_last_name">Last name *</Label>
                      <Input
                        id="admin_last_name"
                        value={form.admin_last_name}
                        onChange={(e) => setForm({ ...form, admin_last_name: e.target.value })}
                        required={!editingRow}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_email">Email *</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        value={form.admin_email}
                        onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                        required={!editingRow}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin_mobile">Mobile *</Label>
                      <Input
                        id="admin_mobile"
                        value={form.admin_mobile}
                        onChange={(e) => setForm({ ...form, admin_mobile: e.target.value })}
                        placeholder="9876543210"
                        required={!editingRow}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="admin_password">
                        {editingRow ? 'New password (leave blank to keep)' : 'Password *'}
                      </Label>
                      <Input
                        id="admin_password"
                        type="password"
                        value={form.admin_password}
                        onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                        required={!editingRow}
                        placeholder={editingRow ? '••••••••' : 'min 6 characters'}
                      />
                    </div>
                  </div>
                </section>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="ghost" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {editingRow ? 'Save changes' : 'Create branch & admin'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
