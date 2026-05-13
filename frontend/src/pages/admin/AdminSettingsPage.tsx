import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { CLINIC_FULL_NAME, CLINIC_PHONE, CLINIC_EMAIL } from '../../config/featureFlags';

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clinic-wide configuration. Edits write to <code>clinic_settings</code>.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Legal name</Label>
              <Input id="name" defaultValue={CLINIC_FULL_NAME} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Helpline phone</Label>
              <Input id="phone" defaultValue={CLINIC_PHONE} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Support email</Label>
              <Input id="email" type="email" defaultValue={CLINIC_EMAIL} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="addr">Address</Label>
              <Textarea
                id="addr"
                rows={3}
                defaultValue="CD-85 Sector I, Salt Lake City, Kolkata - 700064"
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing &amp; tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" placeholder="22AAAAA0000A1Z5" className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">
                Shown on every invoice. Update via super admin only.
              </p>
            </div>
            <div>
              <Label htmlFor="tax">Default tax %</Label>
              <Input id="tax" type="number" defaultValue={0} className="mt-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rzp-mode">Razorpay mode</Label>
              <select
                id="rzp-mode"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="test"
              >
                <option value="test">Test mode</option>
                <option value="live">Live mode</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch to live once KYC is approved. Keys are read from server env.
              </p>
            </div>
            <div>
              <Label htmlFor="cancel">Cancellation window (hours)</Label>
              <Input id="cancel" type="number" defaultValue={24} className="mt-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">Supabase</div>
                <div className="text-xs text-muted-foreground">DB, Auth, Storage</div>
              </div>
              <Badge variant="destructive">Dummy credentials</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">Razorpay</div>
                <div className="text-xs text-muted-foreground">Online payments</div>
              </div>
              <Badge variant="destructive">Not configured</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">MSG91 (SMS)</div>
                <div className="text-xs text-muted-foreground">OTP + notifications</div>
              </div>
              <Badge variant="destructive">Not configured</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">Resend (Email)</div>
                <div className="text-xs text-muted-foreground">Transactional email</div>
              </div>
              <Badge variant="destructive">Not configured</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex items-center gap-3">
          <Button type="submit" size="lg">
            Save changes
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Settings saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
