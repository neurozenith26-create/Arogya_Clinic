import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  useAdminServices,
  useCreateService,
  useDeleteService,
  useServiceCategories,
  useUpdateService,
  type AdminServiceRow,
  type ServiceInput,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';

interface FormState {
  name: string;
  slug: string;
  test_key: string;
  category_id: string;
  price: string;
  short_description: string;
  full_details: string;
  prep_instructions: string;
  sample_type: string;
  report_turnaround_hours: string;
  is_package: boolean;
  package_discount_percent: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  test_key: '',
  category_id: '',
  price: '0',
  short_description: '',
  full_details: '',
  prep_instructions: '',
  sample_type: '',
  report_turnaround_hours: '',
  is_package: false,
  package_discount_percent: '',
  is_active: true,
};

function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

export default function AdminServicesPage() {
  const [search, setSearch] = useState('');
  const { data: services = [], isLoading } = useAdminServices({ q: search || undefined });
  const { data: categories = [] } = useServiceCategories();

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) {
      setForm((f) => ({ ...f, slug: autoSlug(f.name) }));
    }
  }, [form.name, slugTouched]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setError(null);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, category_id: categories[0] ? String(categories[0].id) : '' });
    setSlugTouched(false);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (s: AdminServiceRow) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      slug: s.slug,
      test_key: s.test_key ?? '',
      category_id: String(s.category_id),
      price: String(s.price),
      short_description: s.short_description ?? '',
      full_details: '',
      prep_instructions: '',
      sample_type: s.sample_type ?? '',
      report_turnaround_hours:
        s.report_turnaround_hours != null ? String(s.report_turnaround_hours) : '',
      is_package: s.is_package,
      package_discount_percent:
        s.package_discount_percent != null ? String(s.package_discount_percent) : '',
      is_active: s.is_active,
    });
    setSlugTouched(true);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.category_id) {
      setError('Pick a category.');
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    const tat = form.report_turnaround_hours
      ? Number(form.report_turnaround_hours)
      : null;
    if (tat !== null && (!Number.isFinite(tat) || tat < 0)) {
      setError('Turnaround must be a non-negative number of hours.');
      return;
    }
    const discount = form.package_discount_percent
      ? Number(form.package_discount_percent)
      : null;
    if (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
      setError('Discount must be between 0 and 100.');
      return;
    }
    try {
      const payload: ServiceInput = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        test_key: form.test_key.trim() || null,
        category_id: Number(form.category_id),
        price,
        short_description: form.short_description.trim() || null,
        full_details: form.full_details.trim() || null,
        prep_instructions: form.prep_instructions.trim() || null,
        sample_type: form.sample_type.trim() || null,
        report_turnaround_hours: tat,
        is_package: form.is_package,
        package_service_ids: form.is_package ? [] : null,
        package_discount_percent: form.is_package ? discount : null,
        is_active: form.is_active,
      };
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save service'));
    }
  };

  const handleDelete = async (s: AdminServiceRow) => {
    if (!window.confirm(`Deactivate "${s.name}"? It will be hidden from the booking flow.`)) {
      return;
    }
    setError(null);
    try {
      await deleteMutation.mutateAsync(s.id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete service'));
    }
  };

  const columns: Column<AdminServiceRow>[] = [
    {
      key: 'name',
      header: 'Test / Package',
      render: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          {s.short_description && (
            <div className="text-xs text-muted-foreground">{s.short_description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (s) => <Badge variant="outline">{s.category_name}</Badge>,
    },
    {
      key: 'sample',
      header: 'Sample',
      render: (s) => s.sample_type ?? '—',
    },
    {
      key: 'tat',
      header: 'TAT',
      render: (s) => (s.report_turnaround_hours != null ? `${s.report_turnaround_hours}h` : '—'),
    },
    {
      key: 'price',
      header: 'Price',
      render: (s) => (
        <span className="font-semibold">{formatCurrencyINR(Number(s.price))}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (s) =>
        s.is_package ? <Badge>Package</Badge> : <Badge variant="outline">Test</Badge>,
    },
    {
      key: 'status',
      header: '',
      render: (s) =>
        s.is_active ? null : <Badge variant="destructive">Inactive</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => startEdit(s)}
            aria-label="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(s)}
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
          <h1 className="text-3xl font-bold tracking-tight">Services &amp; Tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${services.length} service(s) across the catalog`}
          </p>
        </div>
        {!showForm && (
          <Button onClick={startCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add Service
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {editingId !== null ? 'Edit service' : 'Add service'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="svc-name">Name *</Label>
                  <Input
                    id="svc-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Complete Blood Count (CBC)"
                    className="mt-1.5"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="svc-cat">Category *</Label>
                  <select
                    id="svc-cat"
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Pick category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="svc-slug">Slug (auto)</Label>
                  <Input
                    id="svc-slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
                    }}
                    placeholder="cbc"
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="svc-key">Test key</Label>
                  <Input
                    id="svc-key"
                    value={form.test_key}
                    onChange={(e) => setForm((f) => ({ ...f, test_key: e.target.value }))}
                    placeholder="LAB_CBC"
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="svc-price">Price (₹) *</Label>
                  <Input
                    id="svc-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="svc-desc">Short description</Label>
                <Textarea
                  id="svc-desc"
                  rows={2}
                  value={form.short_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, short_description: e.target.value }))
                  }
                  placeholder="Evaluates overall health and screens for a wide range of disorders."
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="svc-sample">Sample type</Label>
                  <Input
                    id="svc-sample"
                    value={form.sample_type}
                    onChange={(e) => setForm((f) => ({ ...f, sample_type: e.target.value }))}
                    placeholder="Blood / Urine / —"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="svc-tat">Turnaround (hours)</Label>
                  <Input
                    id="svc-tat"
                    type="number"
                    min={0}
                    value={form.report_turnaround_hours}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, report_turnaround_hours: e.target.value }))
                    }
                    placeholder="24"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input
                    id="svc-pkg"
                    type="checkbox"
                    checked={form.is_package}
                    onChange={(e) => setForm((f) => ({ ...f, is_package: e.target.checked }))}
                  />
                  <Label htmlFor="svc-pkg">Is a package</Label>
                </div>
              </div>
              {form.is_package && (
                <div>
                  <Label htmlFor="svc-discount">Package discount (%)</Label>
                  <Input
                    id="svc-discount"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.package_discount_percent}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, package_discount_percent: e.target.value }))
                    }
                    placeholder="0"
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. Per-test bundling (which tests are inside the package) can
                    be added later — packages save without it.
                  </p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active (visible on public site and booking flow)
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
                      ? 'Update service'
                      : 'Create service'}
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
            placeholder="Search services..."
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
          data={services}
          emptyMessage="No services yet — click Add Service to create your first one."
        />
      )}
    </div>
  );
}
