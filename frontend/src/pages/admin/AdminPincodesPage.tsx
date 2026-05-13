import { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  useAdminPincodes,
  useCreatePincode,
  useDeletePincode,
  useUpdatePincode,
  type AdminPincodeRow,
  type PincodeInput,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';

interface FormState {
  pincode: string;
  city: string;
  state: string;
  zone: string;
  home_visit_charge: string;
  collection_lead_time_hours: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  pincode: '',
  city: 'Kolkata',
  state: 'West Bengal',
  zone: '',
  home_visit_charge: '0',
  collection_lead_time_hours: '4',
  is_active: true,
};

export default function AdminPincodesPage() {
  const { data: pincodes = [], isLoading } = useAdminPincodes();
  const createMutation = useCreatePincode();
  const updateMutation = useUpdatePincode();
  const deleteMutation = useDeletePincode();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const filtered = pincodes.filter((p) =>
    !search
      ? true
      : p.pincode.includes(search) ||
        (p.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.zone ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (p: AdminPincodeRow) => {
    setEditingId(p.id);
    setForm({
      pincode: p.pincode,
      city: p.city ?? '',
      state: p.state ?? '',
      zone: p.zone ?? '',
      home_visit_charge: String(p.home_visit_charge),
      collection_lead_time_hours: String(p.collection_lead_time_hours),
      is_active: p.is_active,
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[1-9]\d{5}$/.test(form.pincode.trim())) {
      setError('Pincode must be a 6-digit Indian PIN (cannot start with 0).');
      return;
    }
    const charge = Number(form.home_visit_charge);
    if (!Number.isFinite(charge) || charge < 0) {
      setError('Home charge must be a non-negative number.');
      return;
    }
    const lead = Number(form.collection_lead_time_hours);
    if (!Number.isInteger(lead) || lead < 0) {
      setError('Lead time must be a whole number of hours (≥ 0).');
      return;
    }
    try {
      const payload: PincodeInput = {
        pincode: form.pincode.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zone: form.zone.trim() || null,
        home_visit_charge: charge,
        collection_lead_time_hours: lead,
        is_active: form.is_active,
      };
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save pincode'));
    }
  };

  const handleDelete = async (p: AdminPincodeRow) => {
    if (!window.confirm(`Deactivate pincode ${p.pincode}? Patients in that PIN won't be able to book home collection.`)) {
      return;
    }
    setError(null);
    try {
      await deleteMutation.mutateAsync(p.id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete pincode'));
    }
  };

  const columns: Column<AdminPincodeRow>[] = [
    { key: 'pin', header: 'Pincode', render: (p) => <span className="font-mono">{p.pincode}</span> },
    { key: 'city', header: 'City', render: (p) => p.city ?? '—' },
    {
      key: 'zone',
      header: 'Zone',
      render: (p) => (p.zone ? <Badge variant="outline">{p.zone}</Badge> : '—'),
    },
    {
      key: 'charge',
      header: 'Home charge',
      render: (p) => formatCurrencyINR(Number(p.home_visit_charge)),
    },
    {
      key: 'lead',
      header: 'Lead time',
      render: (p) => `${p.collection_lead_time_hours}h`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.is_active ? 'success' : 'destructive'}>
          {p.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => startEdit(p)}
            aria-label="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(p)}
            aria-label="Delete"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviceable Pincodes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : `${pincodes.length} pincode${pincodes.length === 1 ? '' : 's'} covered for home collection`}
          </p>
        </div>
        {!showForm && (
          <Button onClick={startCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add pincode
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {editingId !== null ? 'Edit pincode' : 'Add pincode'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="pin-pincode">Pincode *</Label>
                  <Input
                    id="pin-pincode"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pincode: e.target.value.replace(/[^0-9]/g, '').slice(0, 6),
                      }))
                    }
                    placeholder="700064"
                    className="mt-1.5 font-mono"
                    autoFocus
                    disabled={editingId !== null}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    6-digit Indian PIN. Cannot be changed after creation.
                  </p>
                </div>
                <div>
                  <Label htmlFor="pin-city">City</Label>
                  <Input
                    id="pin-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Kolkata"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="pin-state">State</Label>
                  <Input
                    id="pin-state"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="West Bengal"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="pin-zone">Zone</Label>
                  <Input
                    id="pin-zone"
                    value={form.zone}
                    onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                    placeholder="zone_a"
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Free-form tag used for pricing tiers (zone_a, zone_b, …).
                  </p>
                </div>
                <div>
                  <Label htmlFor="pin-charge">Home charge (₹) *</Label>
                  <Input
                    id="pin-charge"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.home_visit_charge}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, home_visit_charge: e.target.value }))
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="pin-lead">Lead time (hours) *</Label>
                  <Input
                    id="pin-lead"
                    type="number"
                    min={0}
                    value={form.collection_lead_time_hours}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, collection_lead_time_hours: e.target.value }))
                    }
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Earliest collection slot offset from booking time.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active (patients in this PIN can book home collection)
              </label>
              {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  <Save className="mr-1 h-4 w-4" />
                  {submitting
                    ? 'Saving…'
                    : editingId !== null
                      ? 'Update pincode'
                      : 'Create pincode'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search pincode, city or zone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No pincodes yet — click Add pincode to add your first serviceable area."
        />
      )}
    </div>
  );
}
