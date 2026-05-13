import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuthStore } from '../../stores/authStore';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            updateProfile({
              first_name: String(data.get('first_name') ?? user.first_name),
              last_name: String(data.get('last_name') ?? user.last_name),
              email: String(data.get('email') ?? '') || user.email,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={user.first_name}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={user.last_name}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email ?? ''}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" defaultValue={user.mobile ?? ''} disabled className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">
                Mobile is verified via OTP and cannot be changed here.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Save changes</Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
