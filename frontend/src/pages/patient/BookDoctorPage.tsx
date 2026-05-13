import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, BadgeCheck, Clock, MapPin, Star } from 'lucide-react';
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
import { useDoctor } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrencyINR } from '../../lib/utils';
import {
  addBooking,
  doctorConsultationItem,
  generateDoctorSlots,
  generateBookingCode,
} from '../../lib/mockPhase2';
import { patientInfoSchema } from '@arogya/shared/schemas/booking';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

const stepLabels = ['Date & Time', 'Patient Info', 'Confirm & Pay'];

export default function BookDoctorPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { data: doctor, isLoading } = useDoctor(doctorId);
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);

  const [selectedDate, setSelectedDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);

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

  const slots = useMemo(
    () => (doctor ? generateDoctorSlots(doctor, selectedDate) : []),
    [doctor, selectedDate],
  );

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

  const confirmBooking = () => {
    if (!doctor || !selectedSlot) return;
    const values = form.getValues();
    const item = doctorConsultationItem(doctor);
    const total = doctor.consultation_fee;
    const advance = Math.round(total / 2);
    const booking = addBooking({
      booking_code: generateBookingCode('doctor_appointment'),
      booking_type: 'doctor_appointment',
      booking_origin: 'online',
      visit_type: 'in_clinic',
      patient_user_id: user?.id ?? 'patient-demo',
      patient_snapshot: { ...values, email: values.email || undefined },
      doctor_user_id: doctor.id,
      doctor_name: doctor.display_name,
      doctor_speciality: doctor.speciality,
      doctor_center: doctor.centers[0]?.center_name,
      items: [item],
      scheduled_date: selectedDate,
      scheduled_start_time: selectedSlot,
      subtotal_amount: total,
      home_visit_charge: 0,
      total_amount: total,
      advance_amount: advance,
      balance_amount: total - advance,
      booking_status: 'pending_payment',
      payment_status: 'pending',
      collection_status: 'not_required',
      reason_for_visit: reason || undefined,
      created_at: new Date().toISOString(),
    });
    navigate(`/payment/callback?booking_id=${booking.id}`);
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

  const center = doctor.centers[0];

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
                {formatCurrencyINR(doctor.consultation_fee)}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {doctor.rating_avg.toFixed(1)} ({doctor.rating_count})
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <SlotGrid slots={slots} value={selectedSlot} onChange={setSelectedSlot} />
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

              <div className="space-y-2 rounded-md border p-4">
                <div className="flex justify-between text-sm">
                  <span>Consultation fee</span>
                  <span>{formatCurrencyINR(doctor.consultation_fee)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrencyINR(doctor.consultation_fee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <Badge variant="default">Pay 50% advance now</Badge>
                  <span className="font-semibold text-primary">
                    {formatCurrencyINR(Math.round(doctor.consultation_fee / 2))}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Remaining {formatCurrencyINR(doctor.consultation_fee - Math.round(doctor.consultation_fee / 2))}{' '}
                  collected at the time of consultation.
                </div>
              </div>

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

              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="button" size="lg" disabled={!agreed} onClick={confirmBooking}>
                  Pay {formatCurrencyINR(Math.round(doctor.consultation_fee / 2))} Advance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}
