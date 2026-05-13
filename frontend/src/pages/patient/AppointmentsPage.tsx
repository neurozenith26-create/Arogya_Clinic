import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useMyBookings } from '../../hooks/queries';
import { BookingStatusBadge } from '../../components/shared/BookingStatusBadge';
import { formatCurrencyINR } from '../../lib/utils';

export default function AppointmentsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const appointments = bookings.filter((b) => b.booking_type === 'doctor_appointment');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Appointments</CardTitle>
        <Button asChild>
          <Link to="/doctors">Book new</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No appointments yet.
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((b) => (
              <Link
                key={b.id}
                to={`/dashboard/bookings/${b.id}`}
                className="block rounded-md border p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {b.doctor_name ?? 'Doctor consultation'}
                    </div>
                    {b.doctor_speciality && (
                      <div className="text-sm text-muted-foreground">{b.doctor_speciality}</div>
                    )}
                    <div className="mt-1 text-sm">
                      {b.scheduled_date} at {b.scheduled_start_time?.slice(0, 5)}
                      {b.doctor_center && ` · ${b.doctor_center}`}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {b.booking_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <BookingStatusBadge status={b.booking_status} />
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrencyINR(Number(b.total_amount))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
