import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  useAdminServiceCategories,
  useCreateServiceCategory,
  useDeleteServiceCategory,
  useUpdateServiceCategory,
  type AdminServiceCategoryRow,
  type ServiceCategoryInput,
} from '../../hooks/queries';
import { getApiErrorMessage } from '../../lib/apiClient';

const emptyForm: ServiceCategoryInput = {
  name: '',
  slug: '',
  display_order: 0,
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

export default function AdminServiceCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminServiceCategories();
  const createMutation = useCreateServiceCategory();
  const updateMutation = useUpdateServiceCategory();
  const deleteMutation = useDeleteServiceCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceCategoryInput>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) {
      setForm((f) => ({ ...f, slug: autoSlug(f.name ?? '') }));
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
    setForm(emptyForm);
    setSlugTouched(false);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (c: AdminServiceCategoryRow) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      display_order: c.display_order,
      is_active: c.is_active,
    });
    setSlugTouched(true);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name?.trim()) {
      setError('Name is required.');
      return;
    }
    try {
      const payload: ServiceCategoryInput = {
        name: form.name.trim(),
        slug: form.slug?.trim() || undefined,
        display_order: Number(form.display_order ?? 0),
        is_active: form.is_active ?? true,
      };
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save category'));
    }
  };

  const handleDelete = async (c: AdminServiceCategoryRow) => {
    if (c.services_count > 0) {
      if (
        !window.confirm(
          `${c.services_count} service(s) belong to "${c.name}". Deactivating won't change their category label, but the category will be hidden from the public site. Continue?`,
        )
      ) {
        return;
      }
    } else if (!window.confirm(`Deactivate "${c.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await deleteMutation.mutateAsync(c.id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete category'));
    }
  };

  const columns: Column<AdminServiceCategoryRow>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (c) => (
        <div>
          <div className="font-medium">{c.name}</div>
          <div className="font-mono text-xs text-muted-foreground">/{c.slug}</div>
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      render: (c) => <Badge variant="outline">{c.services_count}</Badge>,
    },
    {
      key: 'order',
      header: 'Display order',
      render: (c) => c.display_order,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) =>
        c.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => startEdit(c)}
            aria-label="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(c)}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test category</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        {!showForm && (
          <Button onClick={startCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add test category
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {editingId !== null ? 'Edit test category' : 'Add test category'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cat-name">Name *</Label>
                  <Input
                    id="cat-name"
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Pathology"
                    className="mt-1.5"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="cat-slug">Slug (auto)</Label>
                  <Input
                    id="cat-slug"
                    value={form.slug ?? ''}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
                    }}
                    placeholder="pathology"
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used in URLs (/services?category={form.slug || 'name'}).
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cat-order">Display order</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    min={0}
                    value={form.display_order ?? 0}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        display_order: Number(e.target.value) || 0,
                      }))
                    }
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lower numbers show first.
                  </p>
                </div>
                <label className="flex items-center gap-2 pt-7 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active ?? true}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />
                  Active (visible in Services form &amp; public site)
                </label>
              </div>
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
                      ? 'Update category'
                      : 'Create category'}
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
          <CardTitle className="text-base">All categories</CardTitle>
          <p className="text-xs text-muted-foreground">
            Categories you create here appear immediately in the Category dropdown on
            the Services &amp; Tests page.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={categories}
              emptyMessage="No categories yet — click Add test category to create one."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
