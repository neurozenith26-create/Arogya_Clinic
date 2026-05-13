import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useMyBookings } from '../../hooks/queries';
import { BookingStatusBadge } from '../../components/shared/BookingStatusBadge';
import { formatCurrencyINR } from '../../lib/utils';

const collectionLabel: Record<string, string> = {
  not_required: 'In-clinic',
  not_assigned: 'Awaiting staff assignment',
  assigned: 'Staff assigned',
  en_route: 'Staff en route',
  collected: 'Sample collected',
  received_at_lab: 'Received at lab',
};

export default function TestsPage() {
  const { data: bookings = [], isLoading } = useMyBookings();
  const tests = bookings.filter((b) => b.booking_type === 'test_booking');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Test Bookings</CardTitle>
        <Button asChild>
          <Link to="/services">Book new</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No test bookings yet.
          </p>
        ) : (
          <div className="space-y-3">
            {tests.map((b) => (
              <Link
                key={b.id}
                to={`/dashboard/bookings/${b.id}`}
                className="block rounded-md border p-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {b.items_summary ?? 'Test booking'}
                    </div>
                    <div className="mt-1 text-sm">
                      {b.scheduled_date} at {b.scheduled_start_time?.slice(0, 5)} ·{' '}
                      {b.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
                    </div>
                    {b.visit_type === 'home_visit' && (
                      <div className="mt-1 text-xs text-primary">
                        Status: {collectionLabel[b.collection_status] ?? b.collection_status}
                      </div>
                    )}
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
                    {b.reports_count > 0 && (
                      <Badge variant="verified" className="mt-1">
                        {b.reports_count} report(s) ready
                      </Badge>
                    )}
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
