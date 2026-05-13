import { Link } from 'react-router-dom';
import { Calendar, FileText, FlaskConical, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../stores/authStore';
import { mockBookings } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

export default function DashboardOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const myBookings = mockBookings.filter((b) => b.patient_user_id === user?.id);
  const upcoming = myBookings
    .filter((b) => ['confirmed', 'in_progress', 'pending_payment'].includes(b.booking_status))
    .slice(0, 3);
  const totalReports = myBookings.reduce((sum, b) => sum + (b.reports?.length ?? 0), 0);
  const completed = myBookings.filter((b) => b.booking_status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-accent/40 p-6">
        <h2 className="text-2xl font-bold">Welcome back, {user?.first_name}!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your bookings, reports, and profile here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Upcoming</div>
                <div className="mt-1 text-2xl font-bold">{upcoming.length}</div>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Completed</div>
                <div className="mt-1 text-2xl font-bold">{completed}</div>
              </div>
              <FlaskConical className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Reports</div>
                <div className="mt-1 text-2xl font-bold">{totalReports}</div>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Family</div>
                <div className="mt-1 text-2xl font-bold">1</div>
              </div>
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming bookings</CardTitle>
          <Button asChild variant="link" size="sm">
            <Link to="/dashboard/appointments">View all →</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No upcoming bookings.{' '}
              <Link to="/services" className="text-primary hover:underline">
                Book a test
              </Link>{' '}
              or{' '}
              <Link to="/doctors" className="text-primary hover:underline">
                see a doctor
              </Link>
              .
            </p>
          ) : (
            upcoming.map((b) => (
              <Link
                key={b.id}
                to={`/dashboard/bookings/${b.id}`}
                className="block rounded-md border p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {b.doctor_name ?? b.items[0]?.item_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {b.scheduled_date} at {b.scheduled_start_time} ·{' '}
                      {b.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
                    </div>
                    <div className="mt-1 text-xs font-mono text-muted-foreground">
                      {b.booking_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={b.booking_status === 'confirmed' ? 'success' : 'secondary'}
                    >
                      {b.booking_status.replace('_', ' ')}
                    </Badge>
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrencyINR(b.total_amount)}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
