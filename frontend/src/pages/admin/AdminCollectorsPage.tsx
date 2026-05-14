import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Edit2, Loader2, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  resolveCollectorPhotoUrl,
  useAdminCollectors,
  useCreateCollector,
  useDeleteCollector,
  useUpdateCollector,
  type AdminCollectorRow,
  type CollectorInput,
} from '../../hooks/queries';
import { api, getApiErrorMessage } from '../../lib/apiClient';

interface FormState {
  first_name: string;
  last_name: string;
  mobile: string;
  date_of_birth: string;
  gender: '' | 'M' | 'F' | 'O';
  is_active: boolean;
  photoFile: File | null;
}

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  mobile: '',
  date_of_birth: '',
  gender: '',
  is_active: true,
  photoFile: null,
};

export default function AdminCollectorsPage() {
  const [search, setSearch] = useState('');
  const { data: collectors = [], isLoading } = useAdminCollectors(
    search ? { q: search } : undefined,
  );
  const createMutation = useCreateCollector();
  const deleteMutation = useDeleteCollector();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateMutation = useUpdateCollector();
  const qc = useQueryClient();

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setSubmitError(null);
  };

  // Pre-fill form when entering edit mode for an existing collector.
  useEffect(() => {
    if (editingId === null) return;
    const c = collectors.find((x) => x.id === editingId);
    if (!c) return;
    setForm({
      first_name: c.first_name,
      last_name: c.last_name ?? '',
      mobile: c.mobile,
      date_of_birth: c.date_of_birth ?? '',
      gender: (c.gender ?? '') as FormState['gender'],
      is_active: c.is_active,
      photoFile: null,
    });
    setShowForm(true);
  }, [editingId, collectors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!form.first_name.trim()) {
      setSubmitError('First name is required.');
      return;
    }
    if (!/^\d{10,15}$/.test(form.mobile.trim())) {
      setSubmitError('Mobile must be 10–15 digits.');
      return;
    }
    const payload: CollectorInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      mobile: form.mobile.trim(),
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      is_active: form.is_active,
    };

    try {
      let collectorId = editingId;
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
      } else {
        const created = await createMutation.mutateAsync(payload);
        collectorId = created.id;
      }
      if (form.photoFile && collectorId) {
        // Photo is stored as BYTEA in users.profile_photo_bytes via the
        // multer endpoint — same pattern as doctor photos. We post it as a
        // second request because the create endpoint takes JSON, not
        // multipart, but the round-trip happens in the same submit click.
        const fd = new FormData();
        fd.append('file', form.photoFile);
        await api.post(`/admin/collectors/${collectorId}/photo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // The raw axios call above doesn't go through a useMutation, so
        // invalidate the collector caches manually — otherwise the row in
        // "All collectors" keeps its old profile_photo_url=null and the
        // <img> never renders.
        qc.invalidateQueries({ queryKey: ['admin', 'collectors'] });
        qc.invalidateQueries({ queryKey: ['admin', 'collection-staff'] });
        qc.invalidateQueries({ queryKey: ['admin', 'home-collections'] });
      }
      resetForm();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not save collector'));
    }
  };

  const handleDelete = async (c: AdminCollectorRow) => {
    if (!window.confirm(`Deactivate ${c.first_name}? This hides them from future assignments but keeps past dispatches intact.`)) return;
    try {
      await deleteMutation.mutateAsync(c.id);
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Could not deactivate'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    const file = files[0];
    if (!file) return;
    setForm((f) => ({ ...f, photoFile: file }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Home Collectors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phlebotomists / sample-collection staff. Admin assigns one of these to each
            home-collection booking; the patient sees the assigned collector's name, age,
            phone, and photo on their booking page.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create home collector account
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {editingId ? 'Edit collector' : 'Create home collector account'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-fn">First name *</Label>
                <Input
                  id="c-fn"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="c-ln">Last name</Label>
                <Input
                  id="c-ln"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="c-mb">Mobile (10–15 digits) *</Label>
                <Input
                  id="c-mb"
                  inputMode="numeric"
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                  placeholder="9999900000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="c-dob">Date of birth (for age)</Label>
                <Input
                  id="c-dob"
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="c-gn">Gender</Label>
                <select
                  id="c-gn"
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as FormState['gender'] }))}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <input
                  id="c-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="c-active" className="cursor-pointer">
                  Active (shown in assignment dropdown)
                </Label>
              </div>
              <div className="sm:col-span-2">
                <Label>Profile photo</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-1 h-4 w-4" /> Choose photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {form.photoFile && (
                    <span className="text-xs text-muted-foreground">{form.photoFile.name}</span>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive sm:col-span-2">
                  {submitError}
                </div>
              )}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  )}
                  {editingId ? 'Save changes' : 'Create home collector account'}
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
          <CardTitle className="text-base">
            All collectors {!isLoading && `(${collectors.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : collectors.length === 0 ? (
            <div className="rounded-md border border-dashed p-10 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No collectors yet. Click <strong>Create home collector account</strong> to add
                the first one.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {collectors.map((c) => {
                const photoUrl = resolveCollectorPhotoUrl(c.profile_photo_url, c.updated_at);
                const fullName = `${c.first_name} ${c.last_name ?? ''}`.trim();
                return (
                  <li key={c.id} className="flex items-center gap-4 py-3">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={fullName}
                        className="h-12 w-12 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted text-sm font-medium text-muted-foreground">
                        {c.first_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{fullName}</span>
                        {!c.is_active && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.mobile}
                        {c.age != null && ` · age ${c.age}`}
                        {c.gender && ` · ${c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : 'Other'}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(c.id)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {c.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
