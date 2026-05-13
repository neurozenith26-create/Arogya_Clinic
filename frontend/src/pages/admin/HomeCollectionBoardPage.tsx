import { Link } from 'react-router-dom';
import { MapPin, Phone, User } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { mockBookings, updateBooking } from '../../lib/mockPhase2';
import { useState } from 'react';
import { formatCurrencyINR } from '../../lib/utils';

const stages = [
  { key: 'not_assigned', label: 'Awaiting assignment', tone: 'destructive' as const },
  { key: 'assigned', label: 'Assigned', tone: 'secondary' as const },
  { key: 'en_route', label: 'En route', tone: 'default' as const },
  { key: 'collected', label: 'Collected', tone: 'success' as const },
  { key: 'received_at_lab', label: 'At lab', tone: 'verified' as const },
];

const staffNames = ['Rajesh (Lab Tech)', 'Priya (Lab Tech)', 'Amit (Sr. Phlebotomist)'];

export default function HomeCollectionBoardPage() {
  const [, force] = useState(0);
  const homeBookings = mockBookings.filter(
    (b) =>
      b.booking_type === 'test_booking' &&
      b.visit_type === 'home_visit' &&
      ['confirmed', 'in_progress'].includes(b.booking_status),
  );

  const byStage = stages.map((stage) => ({
    ...stage,
    bookings: homeBookings.filter((b) => b.collection_status === stage.key),
  }));

  const handleAssign = (id: number, staff: string) => {
    updateBooking(id, { assigned_staff_name: staff, collection_status: 'assigned' });
    force((x) => x + 1);
  };

  const handleAdvance = (id: number, next: string) => {
    updateBooking(id, { collection_status: next as never });
    force((x) => x + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Home Collection Dispatch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {homeBookings.length} active home-collection booking(s)
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {byStage.map((column) => (
          <div key={column.key}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{column.label}</h3>
              <Badge variant={column.tone}>{column.bookings.length}</Badge>
            </div>
            <div className="space-y-2">
              {column.bookings.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Empty
                </div>
              ) : (
                column.bookings.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="space-y-2 p-3 text-xs">
                      <Link
                        to={`/admin/bookings/${b.id}`}
                        className="font-mono text-[11px] text-primary hover:underline"
                      >
                        {b.booking_code}
                      </Link>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {b.patient_snapshot.first_name} {b.patient_snapshot.last_name}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {b.patient_snapshot.mobile}
                      </div>
                      <div className="flex items-start gap-1 text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          {b.delivery_address?.line1} — {b.delivery_address?.pincode}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {b.scheduled_date} {b.scheduled_start_time}
                      </div>
                      <div className="font-semibold">{formatCurrencyINR(b.total_amount)}</div>

                      {column.key === 'not_assigned' && (
                        <select
                          onChange={(e) => handleAssign(b.id, e.target.value)}
                          defaultValue=""
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="">Assign staff...</option>
                          {staffNames.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      )}
                      {column.key !== 'not_assigned' && b.assigned_staff_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {b.assigned_staff_name}
                        </Badge>
                      )}
                      {column.key === 'assigned' && (
                        <Button size="sm" className="w-full" onClick={() => handleAdvance(b.id, 'en_route')}>
                          Mark en route
                        </Button>
                      )}
                      {column.key === 'en_route' && (
                        <Button size="sm" className="w-full" onClick={() => handleAdvance(b.id, 'collected')}>
                          Mark collected
                        </Button>
                      )}
                      {column.key === 'collected' && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleAdvance(b.id, 'received_at_lab')}
                        >
                          Received at lab
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
