import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Download, FileText, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { BookingOriginPill } from '../../components/shared/BookingOriginPill';
import { ProofPreview } from '../../components/payment/ProofPreview';
import { formatCurrencyINR } from '../../lib/utils';
import {
  downloadMyInvoicePdf,
  resolvePaymentProofUrl,
  useMyBooking,
} from '../../hooks/queries';
import { getApiErrorMessage } from '../../lib/apiClient';
import { CLINIC_FULL_NAME, CLINIC_PHONE } from '../../config/featureFlags';

export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id') ?? '';
  const { data: booking, isLoading } = useMyBooking(bookingId || undefined);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!booking) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadMyInvoicePdf(booking.id, booking.booking_code);
    } catch (err) {
      setDownloadError(getApiErrorMessage(err, 'Could not download invoice'));
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container py-12">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  if (!booking) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find this booking under your account.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
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
              Your booking is saved. We&apos;ll text you details on your registered mobile.
            </p>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Booking #{booking.booking_code}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.booking_type === 'doctor_appointment'
                      ? 'Doctor Appointment'
                      : 'Test Booking'}
                  </p>
                </div>
                <BookingOriginPill
                  origin={booking.booking_origin}
                  visitType={booking.visit_type}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Schedule</div>
                <div className="mt-1 font-semibold">
                  {booking.scheduled_date} at {booking.scheduled_start_time?.slice(0, 5)}
                </div>
                {booking.doctor_name && (
                  <div className="text-sm text-muted-foreground">
                    With {booking.doctor_name}
                    {booking.doctor_center && ` · ${booking.doctor_center}`}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Items</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {booking.items.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <span>
                        {item.item_name} × {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrencyINR(Number(item.total_price))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span>{formatCurrencyINR(Number(booking.total_amount))}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Paid (advance)</span>
                  <span>{formatCurrencyINR(Number(booking.advance_amount))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance due at visit</span>
                  <span>{formatCurrencyINR(Number(booking.balance_amount))}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link to={`/dashboard/bookings/${booking.id}`}>
                    <FileText className="mr-2 h-4 w-4" /> View Booking
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? 'Generating PDF…' : 'Download Invoice'}
                </Button>
              </div>
              {downloadError && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                  {downloadError}
                </div>
              )}
            </CardContent>
          </Card>

          {(() => {
            // Surface the manual-UPI proof the patient just uploaded — reassures
            // them the screenshot/PDF is on file with the clinic, and previews
            // the same artefact admin will re-verify in person.
            const manualPayment = booking.payments?.find(
              (p) => p.payment_source === 'upi_manual' && p.proof_url,
            );
            if (!manualPayment) return null;
            const proofUrl = resolvePaymentProofUrl(manualPayment.proof_url);
            return (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Payment proof you uploaded</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ProofPreview src={proofUrl} mime={manualPayment.payment_proof_mime} size="small" />
                  {manualPayment.upi_reference && (
                    <div>
                      <span className="text-muted-foreground">UTR / Ref: </span>
                      <code className="rounded bg-muted px-1 font-mono text-xs">
                        {manualPayment.upi_reference}
                      </code>
                    </div>
                  )}
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    Our team will re-verify your UPI payment in person before the
                    test / appointment.
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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
