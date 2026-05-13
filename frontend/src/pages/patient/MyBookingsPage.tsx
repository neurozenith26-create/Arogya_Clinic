import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  FileText,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Input } from '../../components/ui/input';
import { BookingStatusBadge } from '../../components/shared/BookingStatusBadge';
import { useMyBookings } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';

type Tab = 'all' | 'doctor_appointment' | 'test_booking';

export default function MyBookingsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (tab !== 'all' && b.booking_type !== tab) return false;
      if (!q) return true;
      return (
        b.booking_code.toLowerCase().includes(q) ||
        (b.doctor_name?.toLowerCase().includes(q) ?? false) ||
        (b.items_summary?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [bookings, tab, search]);

  const counts = useMemo(
    () => ({
      all: bookings.length,
      doctor_appointment: bookings.filter((b) => b.booking_type === 'doctor_appointment').length,
      test_booking: bookings.filter((b) => b.booking_type === 'test_booking').length,
    }),
    [bookings],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All your appointments and test bookings, with payment proof + report status.
          Click a row for full details.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {(
                [
                  { key: 'all' as const, label: 'All' },
                  { key: 'doctor_appointment' as const, label: 'Appointments' },
                  { key: 'test_booking' as const, label: 'Tests' },
                ]
              ).map((t) => (
                <Button
                  key={t.key}
                  variant={tab === t.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTab(t.key)}
                >
                  {t.label} ({counts[t.key]})
                </Button>
              ))}
            </div>
            <Input
              placeholder="Search booking ID, doctor or test…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {bookings.length === 0 ? (
              <>
                You haven&apos;t booked anything yet.{' '}
                <Link to="/services" className="text-primary hover:underline">
                  Browse tests
                </Link>{' '}
                or{' '}
                <Link to="/doctors" className="text-primary hover:underline">
                  see a doctor
                </Link>
                .
              </>
            ) : (
              'No bookings match your search.'
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Link
              key={b.id}
              to={`/dashboard/bookings/${b.id}`}
              className="block rounded-md border p-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {b.booking_type === 'doctor_appointment' ? (
                      <Stethoscope className="h-4 w-4 text-primary" />
                    ) : (
                      <FlaskConical className="h-4 w-4 text-primary" />
                    )}
                    <span className="truncate font-semibold">
                      {b.doctor_name ?? b.items_summary ?? 'Booking'}
                    </span>
                  </div>
                  {b.doctor_speciality && (
                    <div className="ml-6 text-xs text-muted-foreground">
                      {b.doctor_speciality}
                    </div>
                  )}
                  <div className="ml-6 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {b.scheduled_date} at {b.scheduled_start_time?.slice(0, 5)}
                    </span>
                    <span>
                      {b.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
                    </span>
                  </div>
                  <div className="ml-6 mt-1 flex flex-wrap gap-2 text-[11px]">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                      {b.booking_code}
                    </code>
                    {b.reports_count > 0 && (
                      <Badge variant="verified" className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {b.reports_count} report{b.reports_count > 1 ? 's' : ''} ready
                      </Badge>
                    )}
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
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Tap for proof + reports
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">
            <CheckCircle2 className="mr-1 inline h-4 w-4 text-primary" />
            How to view your payment proof & reports
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tap a booking above.</li>
            <li>
              The detail page shows your UPI payment screenshot/PDF + a status line:
              &ldquo;Awaiting in-person re-verification&rdquo; until the clinic checks it,
              then &ldquo;Re-verified by clinic on …&rdquo;.
            </li>
            <li>
              Any reports the clinic uploads against this booking appear in the
              <strong> Reports </strong>
              section on the same page, and also in the top-level{' '}
              <Link to="/dashboard/reports" className="text-primary hover:underline">
                My Reports
              </Link>{' '}
              tab.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
