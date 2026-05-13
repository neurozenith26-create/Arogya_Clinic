import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, FileText, MapPin, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { getBookingById } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

export default function BookingDetailPage() {
  const { id } = useParams();
  const booking = getBookingById(Number(id));

  if (!booking) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Booking not found</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{booking.booking_code}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {booking.booking_type === 'doctor_appointment' ? 'Doctor Appointment' : 'Test Booking'} ·{' '}
                {booking.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
              </p>
            </div>
            <Badge variant={booking.booking_status === 'confirmed' || booking.booking_status === 'completed' ? 'success' : 'secondary'}>
              {booking.booking_status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Schedule</div>
                <div className="text-sm font-medium">
                  {booking.scheduled_date} at {booking.scheduled_start_time}
                </div>
              </div>
            </div>
            {booking.doctor_name && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Doctor</div>
                  <div className="text-sm font-medium">{booking.doctor_name}</div>
                  <div className="text-xs text-muted-foreground">{booking.doctor_speciality}</div>
                </div>
              </div>
            )}
            {booking.delivery_address && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Address</div>
                  <div className="text-sm">
                    {booking.delivery_address.line1}, {booking.delivery_address.line2}
                    {', '}
                    {booking.delivery_address.city} — {booking.delivery_address.pincode}
                  </div>
                </div>
              </div>
            )}
          </div>

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
              <span>Balance due</span>
              <span>{formatCurrencyINR(booking.balance_amount)}</span>
            </div>
          </div>

          {booking.reports && booking.reports.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Reports</div>
              <ul className="mt-2 space-y-2">
                {booking.reports.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {r.file_name}
                    </span>
                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-3.5 w-3.5" /> Download
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
