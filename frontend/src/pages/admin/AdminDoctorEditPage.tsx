import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { DoctorAvatar } from '../../components/shared/DoctorAvatar';
import { WeeklyScheduleEditor } from '../../components/admin/WeeklyScheduleEditor';
import {
  useAdminDoctor,
  useCreateDoctor,
  useDeleteCenter,
  useDepartments,
  useUpdateDoctor,
  useUploadDoctorPhoto,
  useUpsertCenter,
  type DoctorCenterInput,
  type DoctorCenterRow,
  type WeeklySchedule,
} from '../../hooks/queries';
import { getApiErrorMessage } from '../../lib/apiClient';

const EMPTY_SCHEDULE: WeeklySchedule = {
  mon: { start: '09:00', end: '13:00', slot_minutes: 15, lunch_start: null, lunch_end: null },
  tue: { start: '09:00', end: '13:00', slot_minutes: 15, lunch_start: null, lunch_end: null },
  wed: { start: '09:00', end: '13:00', slot_minutes: 15, lunch_start: null, lunch_end: null },
  thu: { start: '09:00', end: '13:00', slot_minutes: 15, lunch_start: null, lunch_end: null },
  fri: { start: '09:00', end: '13:00', slot_minutes: 15, lunch_start: null, lunch_end: null },
  sat: { start: '09:00', end: '13:00', slot_minutes: 15, lunch_start: null, lunch_end: null },
  sun: null,
};

interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  speciality: string;
  department_id: string;
  qualifications: string;
  consultation_fee: string;
  about: string;
  education_training: string;
  is_verified: boolean;
  offers_home_visit: boolean;
  is_active: boolean;
}

interface CenterDraft extends DoctorCenterInput {
  id?: number;
}

const emptyProfile: ProfileForm = {
  first_name: '',
  last_name: '',
  email: '',
  mobile: '',
  speciality: '',
  department_id: '',
  qualifications: '',
  consultation_fee: '0',
  about: '',
  education_training: '',
  is_verified: false,
  offers_home_visit: false,
  is_active: true,
};

const blankCenterDraft = (): CenterDraft => ({
  center_name: 'Arogya Diagnostics — Salt Lake',
  address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
  phone: '+91 98319 90734',
  city: 'Kolkata',
  pincode: '700064',
  schedule: { ...EMPTY_SCHEDULE },
  home_visit_schedule: null,
  is_active: true,
});

export default function AdminDoctorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const { data: doctor, isLoading } = useAdminDoctor(isNew ? undefined : id);
  const { data: departments = [] } = useDepartments();

  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor(id ?? '');
  const photoMutation = useUploadDoctorPhoto(id ?? '');
  const centerMutation = useUpsertCenter(id ?? '');
  const deleteCenterMutation = useDeleteCenter(id ?? '');

  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [centers, setCenters] = useState<CenterDraft[]>([blankCenterDraft()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Hydrate the form once the doctor record arrives (edit mode).
  useEffect(() => {
    if (!doctor || isNew) return;
    setProfile({
      first_name: doctor.first_name ?? '',
      last_name: doctor.last_name ?? '',
      email: doctor.email ?? '',
      mobile: doctor.mobile ?? '',
      speciality: doctor.speciality ?? '',
      department_id: doctor.department_id ? String(doctor.department_id) : '',
      qualifications: (doctor.qualifications ?? []).join(', '),
      consultation_fee: String(doctor.consultation_fee ?? '0'),
      about: doctor.about ?? '',
      education_training: doctor.education_training ?? '',
      is_verified: doctor.is_verified,
      offers_home_visit: doctor.offers_home_visit,
      is_active: doctor.is_active,
    });
    setCenters(
      (doctor.centers ?? []).map(centerRowToDraft),
    );
  }, [doctor, isNew]);

  const setProfileField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const updateCenter = (i: number, patch: Partial<CenterDraft>) =>
    setCenters((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const handleAddCenter = () =>
    setCenters((cs) => [...cs, blankCenterDraft()]);

  const handleRemoveCenter = async (i: number) => {
    const c = centers[i];
    if (c.id && !isNew) {
      if (!window.confirm('Delete this center? It will be hidden from the public site.')) return;
      try {
        await deleteCenterMutation.mutateAsync(c.id);
        setCenters((cs) => cs.filter((_, idx) => idx !== i));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Could not delete center'));
      }
    } else {
      setCenters((cs) => cs.filter((_, idx) => idx !== i));
    }
  };

  const handlePickPhoto = () => fileRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Grab the file BEFORE clearing input.value — `e.target.files` is a live
    // FileList and clearing the input wipes it.
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-picking the same file later
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      setError('Photo must be JPG, PNG or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be smaller than 5 MB.');
      return;
    }
    setError(null);
    // Local preview right away. Revoke the previous blob URL if any.
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    // If we already have a doctor row, upload immediately. Otherwise hold the
    // file until Save creates the row, then upload below.
    if (!isNew && id) {
      try {
        await photoMutation.mutateAsync(file);
        // Drop the blob preview so the freshly-cache-busted server URL renders
        // (DoctorAvatar will append ?v=<updated_at> after the refetch). This
        // proves to the admin that the upload landed on the server.
        setPhotoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      } catch (err) {
        setError(getApiErrorMessage(err, 'Photo upload failed'));
      }
    } else {
      pendingPhotoRef.current = file;
    }
  };

  const pendingPhotoRef = useRef<File | null>(null);

  const buildPayload = () => ({
    first_name: profile.first_name.trim(),
    last_name: profile.last_name.trim(),
    email: profile.email.trim() || null,
    mobile: profile.mobile.trim() || null,
    speciality: profile.speciality.trim(),
    department_id: profile.department_id ? Number(profile.department_id) : null,
    qualifications: profile.qualifications
      .split(',')
      .map((q) => q.trim())
      .filter(Boolean),
    consultation_fee: Number(profile.consultation_fee) || 0,
    about: profile.about.trim() || null,
    education_training: profile.education_training.trim() || null,
    is_verified: profile.is_verified,
    offers_home_visit: profile.offers_home_visit,
    is_active: profile.is_active,
  });

  const handleSave = async () => {
    setError(null);
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!profile.speciality.trim()) {
      setError('Speciality is required (e.g. Cardiologist).');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        // Strip drafts of any stale `id` field before sending centers up.
        const cleanedCenters = centers.map(stripCenterDraftId);
        const { id: newId } = await createMutation.mutateAsync({
          ...buildPayload(),
          centers: cleanedCenters,
        });
        // If we held a photo before the row existed, upload it now.
        if (pendingPhotoRef.current) {
          const fd = new FormData();
          fd.append('file', pendingPhotoRef.current);
          // Use a one-shot fetch via the hook by constructing the URL ourselves
          // — the photo hook is keyed on a fixed id, but we just created `newId`.
          await fetch(
            `${(import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')}/admin/doctors/${newId}/photo`,
            {
              method: 'POST',
              body: fd,
              headers: { Authorization: `Bearer ${localStorage.getItem('arogya-jwt') ?? ''}` },
            },
          );
          pendingPhotoRef.current = null;
        }
        navigate(`/admin/doctors/${newId}`);
      } else {
        await updateMutation.mutateAsync(buildPayload());
        // Upsert each center
        for (const c of centers) {
          const payload: DoctorCenterInput = stripCenterDraftId(c);
          // useUpsertCenter is keyed by centerId; create one-shot hooks here
          // would be wasteful — call the API directly with the right verb.
          const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
          const headers = {
            Authorization: `Bearer ${localStorage.getItem('arogya-jwt') ?? ''}`,
            'Content-Type': 'application/json',
          };
          if (c.id) {
            await fetch(`${base}/admin/centers/${c.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(payload),
            });
          } else {
            await fetch(`${base}/admin/doctors/${id}/centers`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });
          }
        }
        // Refresh detail
        await centerMutation.reset?.();
        navigate('/admin/doctors');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save doctor'));
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/doctors">
          <ArrowLeft className="mr-1 h-4 w-4" /> All doctors
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Add Doctor' : `Edit Dr. ${profile.first_name} ${profile.last_name}`}
        </h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first">First name *</Label>
                  <Input
                    id="first"
                    value={profile.first_name}
                    onChange={(e) => setProfileField('first_name', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="last">Last name *</Label>
                  <Input
                    id="last"
                    value={profile.last_name}
                    onChange={(e) => setProfileField('last_name', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="speciality">Speciality *</Label>
                  <Input
                    id="speciality"
                    value={profile.speciality}
                    onChange={(e) => setProfileField('speciality', e.target.value)}
                    placeholder="Cardiologist"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={profile.department_id}
                    onChange={(e) => setProfileField('department_id', e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfileField('email', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile (10 digits)</Label>
                  <Input
                    id="mobile"
                    value={profile.mobile}
                    onChange={(e) => setProfileField('mobile', e.target.value)}
                    placeholder="9876543210"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="quals">Qualifications (comma-separated)</Label>
                <Input
                  id="quals"
                  value={profile.qualifications}
                  onChange={(e) => setProfileField('qualifications', e.target.value)}
                  placeholder="MBBS, MD"
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="fee">Consultation fee (₹) *</Label>
                  <Input
                    id="fee"
                    type="number"
                    min={0}
                    value={profile.consultation_fee}
                    onChange={(e) => setProfileField('consultation_fee', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <label className="flex items-center gap-2 pt-7 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.is_verified}
                    onChange={(e) => setProfileField('is_verified', e.target.checked)}
                  />
                  Verified badge
                </label>
                <label className="flex items-center gap-2 pt-7 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.offers_home_visit}
                    onChange={(e) => setProfileField('offers_home_visit', e.target.checked)}
                  />
                  Offers home visit
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={profile.is_active}
                  onChange={(e) => setProfileField('is_active', e.target.checked)}
                />
                Active (visible on public site)
              </label>
              <div>
                <Label htmlFor="about">About</Label>
                <Textarea
                  id="about"
                  rows={3}
                  value={profile.about}
                  onChange={(e) => setProfileField('about', e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edu">Education &amp; training</Label>
                <Textarea
                  id="edu"
                  rows={3}
                  value={profile.education_training}
                  onChange={(e) => setProfileField('education_training', e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Consulting centers &amp; schedules</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddCenter}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add center
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {centers.length === 0 && (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No centers yet. Add at least one center so this doctor can take bookings.
                </p>
              )}
              {centers.map((c, i) => (
                <div key={c.id ?? `new-${i}`} className="space-y-3 rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={c.center_name}
                      onChange={(e) => updateCenter(i, { center_name: e.target.value })}
                      placeholder="Center name"
                    />
                    <Input
                      value={c.phone ?? ''}
                      onChange={(e) => updateCenter(i, { phone: e.target.value || null })}
                      placeholder="Phone"
                    />
                  </div>
                  <Input
                    value={c.address}
                    onChange={(e) => updateCenter(i, { address: e.target.value })}
                    placeholder="Full address"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={c.city ?? ''}
                      onChange={(e) => updateCenter(i, { city: e.target.value || null })}
                      placeholder="City"
                    />
                    <Input
                      value={c.pincode ?? ''}
                      onChange={(e) => updateCenter(i, { pincode: e.target.value || null })}
                      placeholder="Pincode"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Weekly schedule (in-clinic)</Label>
                    <div className="mt-2">
                      <WeeklyScheduleEditor
                        value={c.schedule}
                        onChange={(next) => updateCenter(i, { schedule: next })}
                      />
                    </div>
                  </div>
                  {profile.offers_home_visit && (
                    <div>
                      <Label className="text-sm font-semibold">Weekly schedule (home visits)</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave all days off if this center doesn't offer home visits.
                      </p>
                      <div className="mt-2">
                        <WeeklyScheduleEditor
                          value={c.home_visit_schedule}
                          onChange={(next) => updateCenter(i, { home_visit_schedule: next })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveCenter(i)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Remove center
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="New doctor photo preview"
                    className="h-40 w-40 rounded-md object-cover"
                  />
                ) : (
                  <DoctorAvatar
                    firstName={profile.first_name}
                    lastName={profile.last_name}
                    profilePhotoUrl={doctor?.profile_photo_url}
                    cacheBust={doctor?.updated_at}
                    size={160}
                    square
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePickPhoto}
                  disabled={photoMutation.isPending}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {photoMutation.isPending ? 'Uploading…' : 'Choose file'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG / PNG / WEBP, square, ≥400×400px. Max 5&nbsp;MB.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function centerRowToDraft(row: DoctorCenterRow): CenterDraft {
  return {
    id: row.id,
    center_name: row.center_name,
    address: row.address,
    phone: row.phone,
    map_link: row.map_link,
    city: row.city,
    pincode: row.pincode,
    consultation_fee_override:
      row.consultation_fee_override !== null ? Number(row.consultation_fee_override) : null,
    schedule: row.schedule ?? null,
    home_visit_schedule: row.home_visit_schedule ?? null,
    is_active: row.is_active,
  };
}

function stripCenterDraftId(c: CenterDraft): DoctorCenterInput {
  const { id: _id, ...rest } = c;
  void _id;
  return rest;
}
