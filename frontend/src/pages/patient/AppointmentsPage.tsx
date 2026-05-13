import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { mockBookings } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

export default function AppointmentsPage() {
  const user = useAuthStore((s) => s.user);
  const appointments = mockBookings.filter(
    (b) => b.patient_user_id === user?.id && b.booking_type === 'doctor_appointment',
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Appointments</CardTitle>
        <Button asChild>
          <Link to="/doctors">Book new</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
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
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{b.doctor_name}</div>
                    <div className="text-sm text-muted-foreground">{b.doctor_speciality}</div>
                    <div className="mt-1 text-sm">
                      {b.scheduled_date} at {b.scheduled_start_time} · {b.doctor_center}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {b.booking_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={b.booking_status === 'confirmed' ? 'success' : 'secondary'}>
                      {b.booking_status.replace('_', ' ')}
                    </Badge>
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrencyINR(b.total_amount)}
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
