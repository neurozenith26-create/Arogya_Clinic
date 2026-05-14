import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useAdminSettings,
  useUpdateSetting,
  type AdminSettingRow,
} from '../../hooks/queries';
import { getApiErrorMessage } from '../../lib/apiClient';

/**
 * The clinic_settings table is a generic key/value JSONB store. We surface the
 * commonly-edited keys via labelled inputs; anything else can be added later.
 */
const STRING_KEYS = [
  { key: 'clinic_name', label: 'Legal name', placeholder: 'Arogya Diagnostics…' },
  { key: 'helpline_phone', label: 'Helpline phone', placeholder: '+91 98319 90734' },
  { key: 'support_email', label: 'Support email', placeholder: 'arogyaclinic2025@gmail.com' },
  { key: 'gstin', label: 'GSTIN', placeholder: '22AAAAA0000A1Z5' },
  { key: 'upi_id', label: 'UPI ID (where payments are received)', placeholder: '7584045922@jio' },
  { key: 'upi_display_name', label: 'UPI display name', placeholder: 'Arogya Diagnostics' },
] as const;

const NUMERIC_KEYS = [
  { key: 'default_tax_percent', label: 'Default tax %', placeholder: '0' },
  { key: 'cancellation_window_hours', label: 'Cancellation window (hours)', placeholder: '24' },
] as const;

const TEXT_KEYS = [
  {
    key: 'clinic_address',
    label: 'Address',
    placeholder: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
  },
] as const;

// Pulls a string out of a JSONB value that might be a quoted JSON string,
// a plain string, or an object (clinic_address is sometimes a structured
// object — flatten line1/line2/city/pincode in that case).
function jsonbToString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (typeof raw === 'object') {
    const a = raw as Record<string, string | null | undefined>;
    if ('line1' in a || 'city' in a || 'pincode' in a) {
      return [a.line1, a.line2, a.city, a.state, a.pincode]
        .filter(Boolean)
        .join(', ');
    }
    try {
      return JSON.stringify(raw);
    } catch {
      return '';
    }
  }
  return '';
}

export default function AdminSettingsPage() {
  const { data: settings = [], isLoading } = useAdminSettings();
  const updateSetting = useUpdateSetting();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const settingsByKey = useMemo(() => {
    const map = new Map<string, AdminSettingRow>();
    for (const s of settings) map.set(s.key, s);
    return map;
  }, [settings]);

  // Seed the local form whenever the server data changes (e.g. after a
  // successful PUT invalidates the query and a fresh list comes back).
  useEffect(() => {
    if (settings.length === 0) return;
    const next: Record<string, string> = {};
    for (const s of settings) next[s.key] = jsonbToString(s.value);
    setFormValues(next);
  }, [settings]);

  const setField = (key: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [key]: value }));

  // PUT the new value for a single key. Numeric keys are sent as numbers,
  // everything else as a JSON string.
  const saveOne = async (key: string, numeric = false) => {
    setErrors((e) => ({ ...e, [key]: '' }));
    const raw = formValues[key] ?? '';
    let value: unknown = raw;
    if (numeric) {
      if (raw.trim() === '') {
        setErrors((e) => ({ ...e, [key]: 'Please enter a number' }));
        return;
      }
      const n = Number(raw);
      if (Number.isNaN(n)) {
        setErrors((e) => ({ ...e, [key]: 'Must be a valid number' }));
        return;
      }
      value = n;
    }
    try {
      await updateSetting.mutateAsync({ key, value });
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [key]: getApiErrorMessage(err, 'Could not save setting'),
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clinic-wide configuration. Edits write directly to{' '}
          <code>clinic_settings</code> (one row per key). Use the per-field save button
          so a typo in one field doesn't block the others.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {STRING_KEYS.slice(0, 3).map(({ key, label, placeholder }) => (
              <SettingField
                key={key}
                k={key}
                label={label}
                placeholder={placeholder}
                value={formValues[key] ?? ''}
                onChange={(v) => setField(key, v)}
                onSave={() => saveOne(key)}
                saving={updateSetting.isPending}
                saved={savedKey === key}
                error={errors[key]}
              />
            ))}
            {TEXT_KEYS.map(({ key, label, placeholder }) => (
              <SettingField
                key={key}
                k={key}
                label={label}
                placeholder={placeholder}
                value={formValues[key] ?? ''}
                onChange={(v) => setField(key, v)}
                onSave={() => saveOne(key)}
                saving={updateSetting.isPending}
                saved={savedKey === key}
                error={errors[key]}
                textarea
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing &amp; tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingField
              k="gstin"
              label="GSTIN"
              placeholder="22AAAAA0000A1Z5"
              value={formValues.gstin ?? ''}
              onChange={(v) => setField('gstin', v)}
              onSave={() => saveOne('gstin')}
              saving={updateSetting.isPending}
              saved={savedKey === 'gstin'}
              error={errors.gstin}
              help="Shown on every invoice."
            />
            {NUMERIC_KEYS.map(({ key, label, placeholder }) => (
              <SettingField
                key={key}
                k={key}
                label={label}
                placeholder={placeholder}
                value={formValues[key] ?? ''}
                onChange={(v) => setField(key, v)}
                onSave={() => saveOne(key, true)}
                saving={updateSetting.isPending}
                saved={savedKey === key}
                error={errors[key]}
                type="number"
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments (UPI manual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingField
              k="upi_id"
              label="UPI ID — where money is received"
              placeholder="7584045922@jio"
              value={formValues.upi_id ?? ''}
              onChange={(v) => setField('upi_id', v)}
              onSave={() => saveOne('upi_id')}
              saving={updateSetting.isPending}
              saved={savedKey === 'upi_id'}
              error={errors.upi_id}
              help="Patients scan a QR built from this VPA to pay."
            />
            <SettingField
              k="upi_display_name"
              label="UPI display name (shown in patient's UPI app)"
              placeholder="Arogya Diagnostics"
              value={formValues.upi_display_name ?? ''}
              onChange={(v) => setField('upi_display_name', v)}
              onSave={() => saveOne('upi_display_name')}
              saving={updateSetting.isPending}
              saved={savedKey === 'upi_display_name'}
              error={errors.upi_display_name}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <IntegrationRow
              name="Postgres / Supabase"
              subtitle="Database"
              connected={true}
            />
            <IntegrationRow
              name="Razorpay"
              subtitle="Online payments — replaced by manual UPI flow"
              connected={false}
              note="Reactivate when a Razorpay merchant account is provisioned."
            />
            <IntegrationRow
              name="MSG91 (SMS)"
              subtitle="OTP + notifications"
              connected={false}
            />
            <IntegrationRow
              name="Resend (Email)"
              subtitle="Transactional email"
              connected={false}
            />
          </CardContent>
        </Card>
      </div>

      {settings.length > STRING_KEYS.length + NUMERIC_KEYS.length + TEXT_KEYS.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other configured keys</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Settings stored in the DB that don't yet have a dedicated editor here.
              Edit these directly in SQL for now (or open a follow-up ticket to add a
              UI editor).
            </p>
            <ul className="space-y-1 text-xs">
              {(() => {
                const known = new Set<string>([
                  ...STRING_KEYS.map((k) => k.key),
                  ...NUMERIC_KEYS.map((k) => k.key),
                  ...TEXT_KEYS.map((k) => k.key),
                ]);
                return settings.filter((s) => !known.has(s.key));
              })()
                .map((s) => (
                  <li key={s.key} className="flex items-start justify-between gap-3 border-b py-1.5 last:border-0">
                    <div>
                      <code className="font-mono">{s.key}</code>
                      {s.description && (
                        <div className="text-muted-foreground">{s.description}</div>
                      )}
                    </div>
                    <code className="max-w-md truncate text-right text-muted-foreground">
                      {jsonbToString(s.value)}
                    </code>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingField({
  k,
  label,
  placeholder,
  value,
  onChange,
  onSave,
  saving,
  saved,
  error,
  help,
  textarea,
  type,
}: {
  k: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error?: string;
  help?: string;
  textarea?: boolean;
  type?: 'text' | 'number';
}) {
  return (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <div className="mt-1.5 flex gap-2">
        {textarea ? (
          <Textarea
            id={k}
            rows={3}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input
            id={k}
            type={type ?? 'text'}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
      {saved && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-green-700">
          <CheckCircle2 className="h-3 w-3" /> Saved
        </p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function IntegrationRow({
  name,
  subtitle,
  connected,
  note,
}: {
  name: string;
  subtitle: string;
  connected: boolean;
  note?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <Badge variant={connected ? 'success' : 'destructive'}>
          {connected ? 'Connected' : 'Not configured'}
        </Badge>
      </div>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
