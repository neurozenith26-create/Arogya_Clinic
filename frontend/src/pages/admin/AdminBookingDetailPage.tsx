import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import {
  BOOKING_STATUS_DESCRIPTIONS,
  downloadInvoicePdf,
  downloadReport,
  resolvePaymentProofUrl,
  useAdminBooking,
  useRecordPayment,
  type AdminPaymentRow,
  type EditableBookingStatus,
} from '../../hooks/queries';
import { BookingStatusSelect } from '../../components/admin/BookingStatusSelect';
import { ProofPreview } from '../../components/payment/ProofPreview';
import { ReVerifyPaymentModal } from '../../components/admin/ReVerifyPaymentModal';
import { formatCurrencyINR, cn } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const { data: booking, isLoading } = useAdminBooking(id);
  const paymentMutation = useRecordPayment(id ?? '');

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'upi_qr_offline' | 'card_swipe' | 'cheque'
  >('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reVerifyPayment, setReVerifyPayment] = useState<AdminPaymentRow | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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

  const handleDownloadInvoice = async () => {
    if (!booking) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadInvoicePdf(booking.id, booking.booking_code);
    } catch (err) {
      setDownloadError(getApiErrorMessage(err, 'Could not download invoice'));
    } finally {
      setDownloading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    await paymentMutation.mutateAsync({
      method: paymentMethod,
      amount: amt,
      notes: paymentNotes || undefined,
      payment_type: 'balance',
    });
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const snap = booking.patient_snapshot ?? {};
  const patientLine = [
    snap.mobile,
    // Show email only if present; no lonely em-dash
    snap.email,
  ]
    .filter(Boolean)
    .join(' · ');

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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-mono text-base">{booking.booking_code}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.booking_type === 'doctor_appointment'
                      ? 'Doctor Appointment'
                      : 'Test Booking'}{' '}
                    ·{' '}
                    {booking.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'} ·{' '}
                    {booking.booking_origin === 'walk_in' ? 'Walk-in' : 'Online'}
                  </p>
                </div>
                <BookingStatusSelect
                  bookingId={booking.id}
                  value={booking.booking_status}
                  variant="compact"
                />

              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Patient</div>
                <div className="mt-1 font-medium">
                  {[snap.first_name, snap.last_name].filter(Boolean).join(' ') || '—'}
                </div>
                {patientLine && (
                  <div className="text-sm text-muted-foreground">{patientLine}</div>
                )}
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Schedule</div>
                <div className="mt-1 text-sm">
                  {booking.scheduled_date ?? '—'}
                  {booking.scheduled_start_time && ` at ${booking.scheduled_start_time.slice(0, 5)}`}
                </div>
                {booking.doctor_name && (
                  <div className="text-sm text-muted-foreground">
                    {booking.doctor_name}
                    {booking.doctor_speciality && ` · ${booking.doctor_speciality}`}
                  </div>
                )}
              </div>

              {booking.delivery_address && (
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Address</div>
                  <div className="mt-1 text-sm">
                    {[
                      booking.delivery_address.line1,
                      booking.delivery_address.line2,
                      booking.delivery_address.city,
                      booking.delivery_address.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Items</div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {booking.items.length === 0 ? (
                    <li className="text-muted-foreground">No items</li>
                  ) : (
                    booking.items.map((item) => (
                      <li key={item.id} className="flex justify-between border-b py-1.5 last:border-0">
                        <span>
                          {item.item_name} × {item.quantity}
                        </span>
                        <span className="font-medium">
                          {formatCurrencyINR(Number(item.total_price))}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrencyINR(Number(booking.total_amount))}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Paid</span>
                  <span>{formatCurrencyINR(Number(booking.advance_amount))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance</span>
                  <span>{formatCurrencyINR(Number(booking.balance_amount))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Reports (display only — uploads happen from /admin/reports) ── */}
          {booking.reports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {booking.reports.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{r.file_name}</div>
                          <div className="text-xs text-muted-foreground">
                            v{r.version} · {new Date(r.uploaded_at).toLocaleString()}
                          </div>
                        </div>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadReport(r.id).catch((err) => alert((err as Error).message))
                        }
                      >
                        <Download className="mr-1 h-3.5 w-3.5" /> Download
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* ── Payment ledger ────────────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Payments</CardTitle>
              {booking.balance_amount > 0 && (
                <Button size="sm" onClick={() => setShowPaymentForm((v) => !v)}>
                  <Wallet className="mr-1 h-3.5 w-3.5" /> Record payment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {showPaymentForm && (
                <form
                  onSubmit={handleRecordPayment}
                  className="mb-4 grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2"
                >
                  <div>
                    <Label>Method</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as never)}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi_qr_offline">UPI QR</option>
                      <option value="card_swipe">Card swipe</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={booking.balance_amount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`up to ${formatCurrencyINR(Number(booking.balance_amount))}`}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Cheque #, reference, etc."
                      className="mt-1.5"
                    />
                  </div>
                  {paymentMutation.error && (
                    <div className="sm:col-span-2 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                      {(paymentMutation.error as Error).message}
                    </div>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" disabled={paymentMutation.isPending}>
                      {paymentMutation.isPending ? 'Recording…' : 'Save payment'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowPaymentForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {booking.payments.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {booking.payments.map((p) => {
                    const isManualUpi = p.payment_source === 'upi_manual';
                    const sourceLabel =
                      p.payment_source === 'razorpay'
                        ? 'Razorpay'
                        : p.payment_source === 'upi_manual'
                          ? 'UPI (manual proof)'
                          : 'Offline';
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          'rounded-md border p-3 text-sm',
                          p.payment_status === 'refunded' && 'bg-muted/30',
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {formatCurrencyINR(Number(p.amount))}
                              {Number(p.refunded_amount) > 0 && (
                                <span className="ml-2 text-xs text-destructive">
                                  ({formatCurrencyINR(Number(p.refunded_amount))} refunded)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sourceLabel} · {p.payment_method ?? 'unknown'} ·{' '}
                              {p.payment_type}
                            </div>
                            {p.upi_reference && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">UTR: </span>
                                <code className="rounded bg-muted px-1 font-mono">
                                  {p.upi_reference}
                                </code>
                              </div>
                            )}
                            {p.notes && (
                              <div className="text-xs text-muted-foreground">{p.notes}</div>
                            )}
                            {isManualUpi && (
                              <div className="mt-2 text-xs">
                                {p.verified_at ? (
                                  <span className="inline-flex items-center gap-1 text-green-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Re-verified by{' '}
                                    {p.verified_by_name ?? 'admin'} on{' '}
                                    {new Date(p.verified_at).toLocaleString()}
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setReVerifyPayment(p)}
                                  >
                                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                    Re-verify proof
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            {isManualUpi && p.proof_url && (
                              <button
                                type="button"
                                onClick={() => setReVerifyPayment(p)}
                                className="rounded-md"
                                aria-label="Open proof for re-verification"
                              >
                                <ProofPreview
                                  src={resolvePaymentProofUrl(p.proof_url)}
                                  mime={p.payment_proof_mime}
                                  size="small"
                                />
                              </button>
                            )}
                            <Badge
                              variant={
                                p.payment_status === 'captured'
                                  ? 'success'
                                  : p.payment_status === 'refunded'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {p.payment_status}
                            </Badge>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar (admin actions) ─────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Download the auto-generated tax invoice as a printable PDF.
              </p>
              <Button onClick={handleDownloadInvoice} disabled={downloading} className="w-full">
                <FileDown className="mr-2 h-4 w-4" />
                {downloading ? 'Generating…' : 'Download Invoice'}
              </Button>
              {downloadError && (
                <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                  {downloadError}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BookingStatusSelect
                bookingId={booking.id}
                value={booking.booking_status}
                variant="default"
                className="block w-full"
              />
              {BOOKING_STATUS_DESCRIPTIONS[booking.booking_status as EditableBookingStatus] && (
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {BOOKING_STATUS_DESCRIPTIONS[booking.booking_status as EditableBookingStatus]}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Changes are saved immediately and the patient will see the new status on
                their dashboard.
              </p>
              <div className="text-xs text-muted-foreground">
                Payment: {booking.payment_status} · Collection: {booking.collection_status}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {reVerifyPayment && (
        <ReVerifyPaymentModal
          isOpen
          onClose={() => setReVerifyPayment(null)}
          payment={reVerifyPayment}
          bookingId={booking.id}
          context={{
            booking_code: booking.booking_code,
            patient_name: [
              booking.patient_snapshot?.first_name,
              booking.patient_snapshot?.last_name,
            ]
              .filter(Boolean)
              .join(' ') || null,
            patient_mobile: booking.patient_snapshot?.mobile ?? null,
            scheduled_date: booking.scheduled_date,
            scheduled_start_time: booking.scheduled_start_time,
            booking_type: booking.booking_type,
            visit_type: booking.visit_type,
          }}
        />
      )}
    </div>
  );
}
