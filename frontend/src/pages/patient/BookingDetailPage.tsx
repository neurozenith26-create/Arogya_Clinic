import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Home,
  MapPin,
  Microscope,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  downloadReport,
  resolveCollectorPhotoUrl,
  resolvePaymentProofUrl,
  useLiveBookingSync,
  useMyBooking,
} from '../../hooks/queries';
import { BookingStatusBadge } from '../../components/shared/BookingStatusBadge';
import { ProofPreview } from '../../components/payment/ProofPreview';
import { cn, formatCurrencyINR } from '../../lib/utils';

const COLLECTION_LABEL: Record<string, string> = {
  not_required: 'In-clinic visit — no home collection',
  not_assigned: 'Awaiting collector assignment',
  assigned: 'Collector assigned — pickup scheduled',
  en_route: 'Collector is on the way to your home',
  collected: 'Sample collected — on its way to the lab',
  received_at_lab: 'Sample received at the lab',
};

// Linear order of the home-collection workflow — used by the stepper.
const COLLECTION_STAGES = [
  { key: 'assigned', label: 'Assigned', icon: User },
  { key: 'en_route', label: 'En route', icon: Navigation },
  { key: 'collected', label: 'Collected', icon: Truck },
  { key: 'received_at_lab', label: 'At lab', icon: Microscope },
] as const;
const STAGE_INDEX: Record<string, number> = {
  not_assigned: -1,
  assigned: 0,
  en_route: 1,
  collected: 2,
  received_at_lab: 3,
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const { data: booking, isLoading, error } = useMyBooking(id);
  // Refetch this booking the moment a notification for it arrives via the
  // bell poll — so admin status moves (assigned → en_route → collected → at
  // lab) show up on the patient's stepper within a tick of admin clicking
  // each button, no manual refresh.
  useLiveBookingSync(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !booking) {
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{booking.booking_code}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {booking.booking_type === 'doctor_appointment'
                  ? 'Doctor Appointment'
                  : 'Test Booking'}{' '}
                ·{' '}
                {booking.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
              </p>
            </div>
            <BookingStatusBadge
              status={booking.booking_status}
              withDescription
              paymentStatus={booking.payment_status}
              totalAmount={Number(booking.total_amount)}
              advanceAmount={Number(booking.advance_amount)}
              balanceAmount={Number(booking.balance_amount)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Schedule</div>
                <div className="text-sm font-medium">
                  {booking.scheduled_date} at {booking.scheduled_start_time?.slice(0, 5)}
                </div>
              </div>
            </div>
            {booking.doctor_name && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Doctor</div>
                  <div className="text-sm font-medium">{booking.doctor_name}</div>
                  {booking.doctor_speciality && (
                    <div className="text-xs text-muted-foreground">
                      {booking.doctor_speciality}
                    </div>
                  )}
                </div>
              </div>
            )}
            {booking.delivery_address && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Address</div>
                  <div className="text-sm">
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
              </div>
            )}
          </div>

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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyINR(Number(booking.subtotal_amount))}</span>
            </div>
            {Number(booking.home_visit_charge) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Home visit charge</span>
                <span>{formatCurrencyINR(Number(booking.home_visit_charge))}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrencyINR(Number(booking.total_amount))}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Paid</span>
              <span>{formatCurrencyINR(Number(booking.advance_amount))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Balance due</span>
              <span>{formatCurrencyINR(Number(booking.balance_amount))}</span>
            </div>
          </div>

          {booking.visit_type === 'home_visit' && (
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Home collection
              </div>
              <div className="mt-2 rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {COLLECTION_LABEL[booking.collection_status] ?? booking.collection_status}
                  </span>
                </div>

                {/* 4-stage progress stepper — lights up as admin advances
                    each stage. Updates live via useLiveBookingSync. */}
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-1">
                    {COLLECTION_STAGES.map((stage, idx) => {
                      const currentIdx = STAGE_INDEX[booking.collection_status] ?? -1;
                      const done = currentIdx >= idx;
                      const active = currentIdx === idx;
                      const Icon = stage.icon;
                      return (
                        <div key={stage.key} className="flex flex-1 items-center gap-1">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                                done
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted bg-background text-muted-foreground',
                                active && 'ring-2 ring-primary/30',
                              )}
                            >
                              {done && !active ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Icon className="h-4 w-4" />
                              )}
                            </div>
                            <span
                              className={cn(
                                'whitespace-nowrap text-[10px] font-medium',
                                done ? 'text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {stage.label}
                            </span>
                          </div>
                          {idx < COLLECTION_STAGES.length - 1 && (
                            <div
                              className={cn(
                                'mb-4 h-0.5 flex-1 transition-colors',
                                currentIdx > idx ? 'bg-primary' : 'bg-muted',
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {booking.assigned_collector ? (
                  <div className="mt-4 flex items-center gap-3 rounded-md bg-accent/30 p-3">
                    {(() => {
                      const photo = resolveCollectorPhotoUrl(
                        booking.assigned_collector.photo_url,
                      );
                      return photo ? (
                        <img
                          src={photo}
                          alt={booking.assigned_collector.name}
                          className="h-14 w-14 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted text-base font-medium text-muted-foreground">
                          {booking.assigned_collector.name[0]?.toUpperCase() ?? 'C'}
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase text-muted-foreground">
                        Your collector
                      </div>
                      <div className="font-semibold">{booking.assigned_collector.name}</div>
                      {booking.assigned_collector.age != null &&
                        booking.assigned_collector.age > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Age {booking.assigned_collector.age}
                          </div>
                        )}
                      {booking.assigned_collector.mobile && (
                        <a
                          href={`tel:${booking.assigned_collector.mobile}`}
                          className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {booking.assigned_collector.mobile}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    We&apos;ll show your assigned collector&apos;s name, age, phone and
                    photo here as soon as the clinic dispatches them.
                  </p>
                )}
              </div>
            </div>
          )}

          {booking.payments && booking.payments.length > 0 && (
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Payment</div>
              <ul className="mt-2 space-y-2">
                {booking.payments
                  .filter((p) => p.payment_source === 'upi_manual')
                  .map((p) => (
                    <li key={p.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            UPI advance · {formatCurrencyINR(p.amount)}
                          </div>
                          {p.upi_reference && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              UTR:{' '}
                              <code className="rounded bg-muted px-1 font-mono">
                                {p.upi_reference}
                              </code>
                            </div>
                          )}
                          <div className="mt-2 text-xs">
                            {p.verified_at ? (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Re-verified by clinic on{' '}
                                {new Date(p.verified_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Awaiting in-person re-verification by clinic
                              </span>
                            )}
                          </div>
                        </div>
                        <ProofPreview
                          src={resolvePaymentProofUrl(p.proof_url)}
                          mime={p.payment_proof_mime}
                          size="small"
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {booking.reports.length > 0 && (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadReport(r.id).catch((err) => alert((err as Error).message))
                      }
                    >
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
