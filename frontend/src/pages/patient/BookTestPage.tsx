import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Home, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { WizardSteps } from '../../components/booking/WizardSteps';
import { DateStrip } from '../../components/booking/DateStrip';
import { SlotGrid } from '../../components/booking/SlotGrid';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrencyINR, cn } from '../../lib/utils';
import {
  addBooking,
  checkPincode,
  generateHomeCollectionSlots,
  generateInClinicTestSlots,
  generateBookingCode,
} from '../../lib/mockPhase2';
import { patientInfoSchema } from '@arogya/shared/schemas/booking';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

const stepLabels = ['Patient Info', 'Address & Slot', 'Confirm & Pay'];

export default function BookTestPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);
  const [visitType, setVisitType] = useState<'in_clinic' | 'home_visit'>('in_clinic');
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
  );
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>();
  const [pincodeResult, setPincodeResult] = useState<ReturnType<typeof checkPincode> | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [instructions, setInstructions] = useState('');

  const patientForm = useForm({
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

  const addressForm = useForm({
    defaultValues: {
      line1: '',
      line2: '',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '',
      landmark: '',
    },
  });

  const slots = useMemo(() => {
    if (visitType === 'home_visit') return generateHomeCollectionSlots(selectedDate);
    return generateInClinicTestSlots(selectedDate);
  }, [visitType, selectedDate]);

  const homeVisitCharge = visitType === 'home_visit' ? pincodeResult?.home_visit_charge ?? 0 : 0;
  const total = subtotal + homeVisitCharge;
  const advance = Math.round(total / 2);

  const handlePincodeCheck = () => {
    const p = addressForm.getValues('pincode');
    setPincodeResult(checkPincode(p));
  };

  const goToStep2 = async () => {
    const ok = await patientForm.trigger();
    if (ok) setStep(2);
  };

  const goToStep3 = () => {
    if (!selectedSlot) return;
    if (visitType === 'home_visit') {
      if (!pincodeResult?.serviceable) return;
      if (!addressForm.getValues('line1')) return;
    }
    setStep(3);
  };

  const confirmBooking = () => {
    if (!selectedSlot) return;
    const patient = patientForm.getValues();
    const address = visitType === 'home_visit' ? addressForm.getValues() : undefined;

    const booking = addBooking({
      booking_code: generateBookingCode('test_booking'),
      booking_type: 'test_booking',
      booking_origin: 'online',
      visit_type: visitType,
      patient_user_id: user?.id ?? 'patient-demo',
      patient_snapshot: { ...patient, email: patient.email || undefined },
      items: items.map((i) => ({
        item_name: i.name,
        item_type: i.is_package ? 'package' : 'test',
        unit_price: i.price,
        quantity: i.quantity,
      })),
      scheduled_date: selectedDate,
      scheduled_start_time: selectedSlot,
      delivery_address: address,
      subtotal_amount: subtotal,
      home_visit_charge: homeVisitCharge,
      total_amount: total,
      advance_amount: advance,
      balance_amount: total - advance,
      booking_status: 'pending_payment',
      payment_status: 'pending',
      collection_status: visitType === 'home_visit' ? 'not_assigned' : 'not_required',
      special_instructions: instructions || undefined,
      created_at: new Date().toISOString(),
    });

    clearCart();
    navigate(`/payment/callback?booking_id=${booking.id}`);
  };

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add tests to your cart before booking.</p>
        <Button asChild className="mt-6">
          <Link to="/services">Browse services</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Book Tests — {CLINIC_FULL_NAME}</title>
      </Helmet>

      <section className="container py-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cart">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to cart
          </Link>
        </Button>
      </section>

      <section className="container pb-12">
        <div className="mb-8">
          <WizardSteps steps={stepLabels} currentStep={step} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Patient information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={patientForm.handleSubmit(goToStep2)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="first_name">First name *</Label>
                        <Input
                          id="first_name"
                          {...patientForm.register('first_name')}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last name *</Label>
                        <Input
                          id="last_name"
                          {...patientForm.register('last_name')}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="mobile">Mobile *</Label>
                        <Input
                          id="mobile"
                          {...patientForm.register('mobile')}
                          className="mt-1.5"
                        />
                        {patientForm.formState.errors.mobile && (
                          <p className="mt-1 text-xs text-destructive">
                            {patientForm.formState.errors.mobile.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...patientForm.register('email')}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="date_of_birth">Date of birth *</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          {...patientForm.register('date_of_birth')}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender *</Label>
                        <select
                          id="gender"
                          {...patientForm.register('gender')}
                          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="lg">
                        Continue <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Collection method &amp; slot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setVisitType('in_clinic')}
                      className={cn(
                        'rounded-lg border-2 p-4 text-left transition-colors',
                        visitType === 'in_clinic'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <Building className="h-6 w-6 text-primary" />
                      <div className="mt-2 font-semibold">In-Clinic Visit</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Walk into the clinic at your selected time.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitType('home_visit')}
                      className={cn(
                        'rounded-lg border-2 p-4 text-left transition-colors',
                        visitType === 'home_visit'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <Home className="h-6 w-6 text-primary" />
                      <div className="mt-2 font-semibold">Home Collection</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Our staff collects samples from your home.
                      </p>
                    </button>
                  </div>

                  {visitType === 'home_visit' && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="font-semibold">Collection address</div>
                      <div>
                        <Label htmlFor="pincode">Pincode *</Label>
                        <div className="mt-1.5 flex gap-2">
                          <Input
                            id="pincode"
                            inputMode="numeric"
                            maxLength={6}
                            {...addressForm.register('pincode')}
                          />
                          <Button type="button" onClick={handlePincodeCheck}>
                            Check
                          </Button>
                        </div>
                        {pincodeResult &&
                          (pincodeResult.serviceable ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Available in {pincodeResult.city} · Charge:{' '}
                              {formatCurrencyINR(pincodeResult.home_visit_charge ?? 0)} · Earliest
                              collection in {pincodeResult.lead_time_hours}h
                            </p>
                          ) : (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Not serviceable in this pincode. Please book an in-clinic visit.
                            </p>
                          ))}
                      </div>

                      {pincodeResult?.serviceable && (
                        <>
                          <div>
                            <Label htmlFor="line1">Address line 1 *</Label>
                            <Input id="line1" {...addressForm.register('line1')} className="mt-1.5" />
                          </div>
                          <div>
                            <Label htmlFor="line2">Address line 2</Label>
                            <Input id="line2" {...addressForm.register('line2')} className="mt-1.5" />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="city">City *</Label>
                              <Input id="city" {...addressForm.register('city')} className="mt-1.5" />
                            </div>
                            <div>
                              <Label htmlFor="state">State *</Label>
                              <Input id="state" {...addressForm.register('state')} className="mt-1.5" />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input
                              id="landmark"
                              {...addressForm.register('landmark')}
                              className="mt-1.5"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

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

                  <div>
                    <Label htmlFor="special">Special instructions (optional)</Label>
                    <Textarea
                      id="special"
                      rows={3}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="mt-1.5"
                      placeholder="Any notes for the collection staff..."
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={goToStep3}
                      disabled={
                        !selectedSlot ||
                        (visitType === 'home_visit' &&
                          (!pincodeResult?.serviceable || !addressForm.watch('line1')))
                      }
                    >
                      Continue <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Confirm &amp; pay</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-md bg-muted/40 p-4 text-sm">
                    <div className="font-semibold">Tests &amp; Visit</div>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {items.map((i) => (
                        <li key={i.service_id} className="flex justify-between">
                          <span>
                            {i.name} × {i.quantity}
                          </span>
                          <span>{formatCurrencyINR(i.price * i.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 text-muted-foreground">
                      {visitType === 'home_visit' ? 'Home collection' : 'In-clinic visit'} ·{' '}
                      {selectedDate} at {selectedSlot}
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
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <div className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      disabled={!agreed}
                      onClick={confirmBooking}
                    >
                      Pay {formatCurrencyINR(advance)} Advance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="sticky top-24 h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span>{formatCurrencyINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Home visit charge</span>
                <span>{homeVisitCharge > 0 ? formatCurrencyINR(homeVisitCharge) : '—'}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrencyINR(total)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <Badge>Pay 50% now</Badge>
                  <span className="font-semibold text-primary">{formatCurrencyINR(advance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
