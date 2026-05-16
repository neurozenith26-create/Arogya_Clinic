import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock,
  MapPin,
  Star,
  Building2,
} from 'lucide-react';
import { usePublicBranches } from '../../hooks/useBranches';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { WizardSteps } from '../../components/booking/WizardSteps';
import { DateStrip } from '../../components/booking/DateStrip';
import { SlotGrid } from '../../components/booking/SlotGrid';
import {
  useCreateDoctorBooking,
  useDoctor,
  useDoctorSlots,
} from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrencyINR } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';
import { patientInfoSchema } from '@arogya/shared/schemas/booking';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';
import { UpiPaymentModal } from '../../components/payment/UpiPaymentModal';

const stepLabels = ['Date & Time', 'Patient Info', 'Confirm & Pay'];

export default function BookDoctorPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { data: doctor, isLoading } = useDoctor(doctorId);
  const user = useAuthStore((s) => s.user);
  const { data: branches = [], isLoading: branchesLoading } = usePublicBranches();
  // Multi-branch: patient picks which clinic this appointment is for. Required
  // before the wizard renders.
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>();
  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId],
  );
  const [step, setStep] = useState(1);

  const [selectedDate, setSelectedDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const createBookingMutation = useCreateDoctorBooking();
  // Resolve the doctor's primary center (admin can add more later — for now
  // the booking flow uses the first active center on the profile).
  const primaryCenter = doctor?.centers?.[0];
  const liveSlots = useDoctorSlots(doctor?.id, selectedDate, primaryCenter?.id);

  const form = useForm({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      mobile: user?.mobile?.replace('+91', '') ?? '',
      email: user?.email ?? '',
      date_of_birth: '',
      gender: 'M' as const,
      alternative_number: '',
    },
  });

  const slots = liveSlots.data ?? [];
  const slotsLoading = liveSlots.isLoading;

  // 10-minute slot lock countdown
  useEffect(() => {
    if (!lockExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      setLockRemaining(remaining);
      if (remaining === 0) {
        setSelectedSlot(undefined);
        setLockExpiresAt(null);
        setStep(1);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockExpiresAt]);

  const formatRemaining = () => {
    const m = Math.floor(lockRemaining / 60);
    const s = lockRemaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const goToStep2 = () => {
    if (!selectedSlot) return;
    setLockExpiresAt(Date.now() + 10 * 60 * 1000);
    setStep(2);
  };

  const goToStep3 = async () => {
    const ok = await form.trigger();
    if (ok) setStep(3);
  };

  const openPaymentModal = () => {
    if (!doctor || !selectedSlot || !primaryCenter) return;
    setSubmitError(null);
    setPaymentModalOpen(true);
  };

  const handleProofSubmit = async (proof: File, upiReference?: string) => {
    if (!doctor || !selectedSlot || !primaryCenter) return;
    setSubmitError(null);
    const values = form.getValues();
    try {
      const booking = await createBookingMutation.mutateAsync({
        payload: {
          doctor_id: doctor.id,
          // doctor_centers.id is BIGSERIAL → pg returns it as a string. Coerce
          // at the boundary so the wire type matches the API contract.
          doctor_center_id: Number(primaryCenter.id),
          visit_type: 'in_clinic',
          scheduled_date: selectedDate,
          scheduled_start_time: selectedSlot,
          patient_snapshot: { ...values, email: values.email || undefined },
          reason_for_visit: reason || undefined,
          branch_id: selectedBranchId,
        },
        proof,
        upi_reference: upiReference,
      });
      setPaymentModalOpen(false);
      navigate(`/payment/callback?booking_id=${booking.id}&booking_code=${booking.booking_code}`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Could not create your booking. Please try again.');
      setSubmitError(msg);
      throw new Error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Doctor not found</h1>
        <Button asChild className="mt-6">
          <Link to="/doctors">Back to doctor list</Link>
        </Button>
      </div>
    );
  }

  const center = doctor.centers?.[0];
  // Without a configured consulting center we can't satisfy the backend's
  // doctor_center_id requirement on POST /bookings/doctor-appointment.
  if (!center) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Booking not available</h1>
        <p className="mt-2 text-muted-foreground">
          This doctor has no consulting centers configured yet. Please call us to book.
        </p>
        <Button asChild className="mt-6">
          <Link to={`/doctors/${doctor.id}`}>Back to doctor profile</Link>
        </Button>
      </div>
    );
  }

  // Step 0 — Branch picker. Until a branch is chosen, the wizard stays hidden.
  // Auto-select on single-branch deployments.
  if (!selectedBranchId) {
    if (branches.length === 1 && !branchesLoading) {
      queueMicrotask(() => setSelectedBranchId(branches[0].id));
    }
    return (
      <>
        <Helmet>
          <title>Choose a branch — {CLINIC_FULL_NAME}</title>
        </Helmet>
        <section className="container py-6">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/doctors/${doctor.id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Doctor profile
            </Link>
          </Button>
        </section>
        <section className="container pb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Choose a branch
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick the Arogya clinic where you want to see {doctor.display_name}.
              </p>
            </CardHeader>
            <CardContent>
              {branchesLoading ? (
                <p className="text-sm text-muted-foreground">Loading branches…</p>
              ) : branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No branches are currently available.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranchId(b.id)}
                      className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-0.5 h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="font-semibold">{b.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {b.address_line1}
                            {b.address_line2 ? `, ${b.address_line2}` : ''} · {b.city},{' '}
                            {b.state} {b.pincode}
                          </div>
                          <div className="mt-1.5 text-xs">
                            <span className="font-medium text-foreground">{b.phone}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Book — {doctor.display_name} | {CLINIC_FULL_NAME}</title>
      </Helmet>

      <section className="container py-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/doctors/${doctor.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Doctor profile
          </Link>
        </Button>
      </section>

      <section className="container pb-12">
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {doctor.first_name.charAt(0)}
              {doctor.last_name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold">{doctor.display_name}</h2>
                {doctor.is_verified && <BadgeCheck className="h-4 w-4 text-blue-600" />}
              </div>
              <p className="text-sm text-muted-foreground">{doctor.speciality}</p>
              {center && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {center.center_name}, {center.city}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Consultation fee</div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrencyINR(Number(doctor.consultation_fee))}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {Number(doctor.rating_avg).toFixed(1)} ({doctor.rating_count})
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedBranch && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedBranch.name}</span>
            <span className="text-xs text-muted-foreground">
              · {selectedBranch.city}, {selectedBranch.pincode}
            </span>
            {branches.length > 1 && (
              <button
                type="button"
                className="ml-auto text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setSelectedBranchId(undefined);
                  setStep(1);
                  setSelectedSlot(undefined);
                }}
              >
                Change branch
              </button>
            )}
          </div>
        )}
        <div className="mb-8">
          <WizardSteps steps={stepLabels} currentStep={step} />
        </div>

        {lockExpiresAt && step >= 2 && (
          <div className="mb-4 flex items-center gap-2 rounded-md border-2 border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              Slot held for <strong>{formatRemaining()}</strong> — complete payment to confirm.
            </span>
          </div>
        )}

        {/* Step 1: date & slot */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Pick a date and time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select date</Label>
                <div className="mt-2">
                  <DateStrip value={selectedDate} onChange={setSelectedDate} />
                </div>
              </div>
              <div>
                <Label>Select time slot</Label>
                <div className="mt-2">
                  {slotsLoading ? (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Loading available slots…
                    </p>
                  ) : slots.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No slots available for this date. Try another date.
                    </p>
                  ) : (
                    <SlotGrid slots={slots} value={selectedSlot} onChange={setSelectedSlot} />
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={goToStep2} disabled={!selectedSlot} size="lg">
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: patient info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Patient information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(goToStep3)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="first_name">First name *</Label>
                    <Input id="first_name" {...form.register('first_name')} className="mt-1.5" />
                    {form.formState.errors.first_name && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last name *</Label>
                    <Input id="last_name" {...form.register('last_name')} className="mt-1.5" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input id="mobile" {...form.register('mobile')} className="mt-1.5" />
                    {form.formState.errors.mobile && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.mobile.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...form.register('email')} className="mt-1.5" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="date_of_birth">Date of birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      {...form.register('date_of_birth')}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <select
                      id="gender"
                      {...form.register('gender')}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reason">Reason for visit (optional)</Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1.5"
                    placeholder="Symptoms or specific concerns the doctor should know..."
                  />
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" size="lg">
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: confirm & pay */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm &amp; pay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md bg-muted/40 p-4 text-sm">
                <div className="font-semibold">Appointment</div>
                <div className="mt-1 text-muted-foreground">{doctor.display_name}</div>
                <div className="text-muted-foreground">
                  {selectedDate} at {selectedSlot} · {center?.center_name}
                </div>
              </div>

              <div className="rounded-md bg-muted/40 p-4 text-sm">
                <div className="font-semibold">Patient</div>
                <div className="mt-1 text-muted-foreground">
                  {form.watch('first_name')} {form.watch('last_name')} · {form.watch('mobile')}
                </div>
              </div>

              {(() => {
                const fee = Number(doctor.consultation_fee);
                const advance = Math.round(fee / 2);
                return (
                  <div className="space-y-2 rounded-md border p-4">
                    <div className="flex justify-between text-sm">
                      <span>Consultation fee</span>
                      <span>{formatCurrencyINR(fee)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-semibold">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrencyINR(fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <Badge variant="default">Pay 50% advance now</Badge>
                      <span className="font-semibold text-primary">
                        {formatCurrencyINR(advance)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Remaining {formatCurrencyINR(fee - advance)} collected at the time
                      of consultation.
                    </div>
                  </div>
                );
              })()}

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              {submitError && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={!agreed || createBookingMutation.isPending}
                  onClick={openPaymentModal}
                >
                  {createBookingMutation.isPending
                    ? 'Creating booking…'
                    : `Pay ${formatCurrencyINR(Math.round(Number(doctor.consultation_fee) / 2))} Advance`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <UpiPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        amount={Math.round(Number(doctor.consultation_fee) / 2)}
        bookingRef={`DOC-${selectedDate}-${(selectedSlot ?? '').slice(0, 5)}`}
        onSubmit={handleProofSubmit}
        submitting={createBookingMutation.isPending}
      />
    </>
  );
}
