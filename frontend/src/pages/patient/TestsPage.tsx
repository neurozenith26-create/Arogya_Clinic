import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { mockBookings } from '../../lib/mockPhase2';
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
  const user = useAuthStore((s) => s.user);
  const tests = mockBookings.filter(
    (b) => b.patient_user_id === user?.id && b.booking_type === 'test_booking',
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Test Bookings</CardTitle>
        <Button asChild>
          <Link to="/services">Book new</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {b.items.map((i) => i.item_name).join(', ')}
                    </div>
                    <div className="mt-1 text-sm">
                      {b.scheduled_date} at {b.scheduled_start_time} ·{' '}
                      {b.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
                    </div>
                    {b.visit_type === 'home_visit' && (
                      <div className="mt-1 text-xs text-primary">
                        Status: {collectionLabel[b.collection_status]}
                      </div>
                    )}
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {b.booking_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={b.booking_status === 'completed' ? 'success' : 'secondary'}>
                      {b.booking_status.replace('_', ' ')}
                    </Badge>
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrencyINR(b.total_amount)}
                    </div>
                    {(b.reports?.length ?? 0) > 0 && (
                      <Badge variant="verified" className="mt-1">
                        {b.reports!.length} report(s) ready
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
