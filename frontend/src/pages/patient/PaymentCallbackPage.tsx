import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Clock, Download, FileText, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { formatCurrencyINR } from '../../lib/utils';
import { getBookingById, updateBooking } from '../../lib/mockPhase2';
import { CLINIC_FULL_NAME, CLINIC_PHONE } from '../../config/featureFlags';

type Phase = 'processing' | 'success';

export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const bookingId = Number(params.get('booking_id'));
  const booking = getBookingById(bookingId);
  const [phase, setPhase] = useState<Phase>('processing');

  useEffect(() => {
    if (!booking) return;
    // simulate Razorpay payment processing — real flow opens Razorpay Checkout
    // and waits for the webhook to confirm the booking
    const id = setTimeout(() => {
      updateBooking(booking.id, {
        booking_status: 'confirmed',
        payment_status: 'partial',
      });
      setPhase('success');
    }, 1500);
    return () => clearTimeout(id);
  }, [booking]);

  if (!booking) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 animate-pulse text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Processing payment...</h1>
        <p className="mt-2 text-muted-foreground">
          Please don&apos;t close this tab. We&apos;re confirming your booking with our payment
          partner.
        </p>
        <div className="mt-6 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Mock mode: simulating Razorpay webhook. In production this opens the Razorpay Checkout
          modal.
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Booking Confirmed — {CLINIC_FULL_NAME}</title>
      </Helmet>

      <section className="container py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-3 text-2xl font-bold text-green-900">Booking Confirmed!</h1>
            <p className="mt-1 text-sm text-green-800">
              Your booking is confirmed. We&apos;ve sent details to your mobile and email.
            </p>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Booking #{booking.booking_code}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.booking_type === 'doctor_appointment'
                      ? 'Doctor Appointment'
                      : 'Test Booking'}{' '}
                    · {booking.visit_type === 'in_clinic' ? 'In-Clinic' : 'Home Collection'}
                  </p>
                </div>
                <Badge variant="success">Confirmed</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Schedule</div>
                <div className="mt-1 font-semibold">
                  {booking.scheduled_date} at {booking.scheduled_start_time}
                </div>
                {booking.doctor_name && (
                  <div className="text-sm text-muted-foreground">
                    With {booking.doctor_name} · {booking.doctor_center}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Items</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {booking.items.map((item, i) => (
                    <li key={i} className="flex justify-between">
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
                  <span className="text-muted-foreground">Total</span>
                  <span>{formatCurrencyINR(booking.total_amount)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Paid (advance)</span>
                  <span>{formatCurrencyINR(booking.advance_amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance due at visit</span>
                  <span>{formatCurrencyINR(booking.balance_amount)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link to={`/dashboard/bookings/${booking.id}`}>
                    <FileText className="mr-2 h-4 w-4" /> View Booking
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" /> Download Invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Need to change anything? Call us at{' '}
            <a href={`tel:${CLINIC_PHONE.replace(/\s/g, '')}`} className="text-primary">
              <Phone className="inline h-3 w-3" /> {CLINIC_PHONE}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
