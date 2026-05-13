import { Link } from 'react-router-dom';
import { Calendar, FileText, FlaskConical, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuthStore } from '../../stores/authStore';
import { useMyBookings } from '../../hooks/queries';
import { BookingStatusBadge } from '../../components/shared/BookingStatusBadge';
import { formatCurrencyINR } from '../../lib/utils';

export default function DashboardOverviewPage() {
  const user = useAuthStore((s) => s.user);
  const { data: bookings = [], isLoading } = useMyBookings();

  const upcoming = bookings
    .filter((b) => ['confirmed', 'in_progress', 'pending_payment'].includes(b.booking_status))
    .slice(0, 3);
  const totalReports = bookings.reduce((sum, b) => sum + (b.reports_count ?? 0), 0);
  const completed = bookings.filter((b) => b.booking_status === 'completed').length;

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
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {b.doctor_name ?? b.items_summary ?? 'Booking'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {b.scheduled_date} at {b.scheduled_start_time?.slice(0, 5)} ·{' '}
                      {b.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {b.booking_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <BookingStatusBadge
                      status={b.booking_status}
                      paymentStatus={b.payment_status}
                      totalAmount={Number(b.total_amount)}
                      advanceAmount={Number(b.advance_amount)}
                      balanceAmount={Number(b.balance_amount)}
                    />
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrencyINR(Number(b.total_amount))}
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
