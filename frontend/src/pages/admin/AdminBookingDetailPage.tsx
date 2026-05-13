import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { getBookingById, updateBooking } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

const statusOptions = [
  'draft',
  'pending_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;

const collectionOptions = [
  'not_required',
  'not_assigned',
  'assigned',
  'en_route',
  'collected',
  'received_at_lab',
] as const;

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const [, force] = useState(0);
  const booking = getBookingById(Number(id));

  if (!booking) {
    return (
      <div className="text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-3 text-2xl font-bold">Booking not found</h1>
        <Button asChild className="mt-4">
          <Link to="/admin/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  const handleStatusChange = (status: (typeof statusOptions)[number]) => {
    updateBooking(booking.id, { booking_status: status });
    force((x) => x + 1);
  };

  const handleCollectionChange = (status: (typeof collectionOptions)[number]) => {
    updateBooking(booking.id, { collection_status: status });
    force((x) => x + 1);
  };

  const handleUploadReport = () => {
    const next = {
      id: (booking.reports?.length ?? 0) + 1,
      file_name: `Report_${booking.booking_code}_v${(booking.reports?.length ?? 0) + 1}.pdf`,
      uploaded_at: new Date().toISOString(),
      report_type: 'lab_report',
    };
    updateBooking(booking.id, { reports: [...(booking.reports ?? []), next] });
    force((x) => x + 1);
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/bookings">
          <ArrowLeft className="mr-1 h-4 w-4" /> All bookings
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-mono text-base">{booking.booking_code}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.booking_type === 'doctor_appointment' ? 'Doctor Appointment' : 'Test Booking'} ·{' '}
                    {booking.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'} ·{' '}
                    {booking.booking_origin === 'walk_in' ? 'Walk-in' : 'Online'}
                  </p>
                </div>
                <Badge>{booking.booking_status.replace('_', ' ')}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Patient</div>
                <div className="mt-1 font-medium">
                  {booking.patient_snapshot.first_name} {booking.patient_snapshot.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {booking.patient_snapshot.mobile} · {booking.patient_snapshot.email ?? '—'}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Schedule</div>
                <div className="mt-1 text-sm">
                  {booking.scheduled_date} at {booking.scheduled_start_time}
                </div>
                {booking.doctor_name && (
                  <div className="text-sm text-muted-foreground">
                    {booking.doctor_name} · {booking.doctor_speciality}
                  </div>
                )}
              </div>

              {booking.delivery_address && (
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Address</div>
                  <div className="mt-1 text-sm">
                    {booking.delivery_address.line1}, {booking.delivery_address.line2}
                    {', '}
                    {booking.delivery_address.city} — {booking.delivery_address.pincode}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Items</div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {booking.items.map((item, i) => (
                    <li key={i} className="flex justify-between border-b py-1.5 last:border-0">
                      <span>
                        {item.item_name} × {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrencyINR(item.unit_price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrencyINR(booking.subtotal_amount)}</span>
                </div>
                {booking.home_visit_charge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Home visit charge</span>
                    <span>{formatCurrencyINR(booking.home_visit_charge)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrencyINR(booking.total_amount)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Paid</span>
                  <span>{formatCurrencyINR(booking.advance_amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance</span>
                  <span>{formatCurrencyINR(booking.balance_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Reports</CardTitle>
              <Button size="sm" onClick={handleUploadReport}>
                <Upload className="mr-1 h-3.5 w-3.5" /> Upload report
              </Button>
            </CardHeader>
            <CardContent>
              {(booking.reports?.length ?? 0) === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No reports uploaded yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {booking.reports!.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {r.file_name}
                      </span>
                      <Badge variant="outline">v{r.id}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Booking status</label>
                <select
                  value={booking.booking_status}
                  onChange={(e) => handleStatusChange(e.target.value as never)}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              {booking.visit_type === 'home_visit' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Collection status
                  </label>
                  <select
                    value={booking.collection_status}
                    onChange={(e) => handleCollectionChange(e.target.value as never)}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {collectionOptions.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
