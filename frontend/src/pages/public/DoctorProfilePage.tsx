import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  BadgeCheck,
  GraduationCap,
  Home,
  MapPin,
  Phone,
  Star,
  Stethoscope,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useDoctor, useReviews } from '../../hooks/queries';
import { DoctorAvatar } from '../../components/shared/DoctorAvatar';
import { formatCurrencyINR } from '../../lib/utils';
import {
  CLINIC_FULL_NAME,
  CLINIC_PHONE,
  CLINIC_PHONE_DIGITS,
  CLINIC_WHATSAPP,
  PHASE_2_ENABLED,
} from '../../config/featureFlags';

export default function DoctorProfilePage() {
  const { id } = useParams();
  const { data: doctor, isLoading } = useDoctor(id);
  const { data: reviews = [] } = useReviews(id);

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-32 w-full" />
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

  const whatsappUrl = `https://wa.me/${CLINIC_WHATSAPP.replace(
    '+',
    '',
  )}?text=${encodeURIComponent(
    `Hi, I'd like to book an appointment with ${doctor.display_name}.`,
  )}`;

  return (
    <>
      <Helmet>
        <title>
          {doctor.display_name} — {doctor.speciality} | {CLINIC_FULL_NAME}
        </title>
        <meta name="description" content={`${doctor.display_name} — ${doctor.speciality}. ${doctor.about}`} />
      </Helmet>

      <section className="container py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/doctors">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to doctors
          </Link>
        </Button>
      </section>

      <section className="container pb-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="flex flex-col items-start gap-6 p-6 md:flex-row">
                <DoctorAvatar
                  firstName={doctor.first_name}
                  lastName={doctor.last_name}
                  profilePhotoUrl={doctor.profile_photo_url}
                  cacheBust={(doctor as unknown as { updated_at?: string }).updated_at}
                  size={128}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">
                      {doctor.display_name ?? `Dr. ${doctor.first_name} ${doctor.last_name}`}
                    </h1>
                    {doctor.is_verified && (
                      <BadgeCheck className="h-6 w-6 text-blue-600" aria-label="Verified" />
                    )}
                  </div>
                  <p className="mt-1 text-lg text-primary font-medium">{doctor.speciality}</p>
                  <Link
                    to={`/departments/${doctor.department_slug}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    {doctor.department_name}
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(doctor.qualifications ?? []).map((q) => (
                      <Badge key={q} variant="outline">
                        {q}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{Number(doctor.rating_avg).toFixed(1)}</span>
                      <span className="text-muted-foreground">({doctor.rating_count} ratings)</span>
                    </div>
                    {doctor.offers_home_visit && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Home className="h-4 w-4" /> Home visit available
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{doctor.about}</p>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" /> Education &amp; Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {doctor.education_training}
                </p>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-primary" /> Consulting Centers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(doctor.centers ?? []).map((c) => (
                  <div key={c.id} className="rounded-md border p-3">
                    <div className="font-medium">{c.center_name}</div>
                    <div className="text-sm text-muted-foreground">{c.address}</div>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone.replace(/\s/g, '')}`}
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" /> {c.phone}
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {reviews.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Patient Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{r.patient_first_name}</div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={
                                i < r.rating
                                  ? 'h-4 w-4 fill-yellow-400 text-yellow-400'
                                  : 'h-4 w-4 fill-muted text-muted-foreground/40'
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <div className="text-sm text-muted-foreground">Consultation fee</div>
                <div className="text-4xl font-bold text-primary">
                  {formatCurrencyINR(doctor.consultation_fee)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {PHASE_2_ENABLED ? (
                  <Button asChild className="w-full" size="lg">
                    <Link to={`/book/doctor/${doctor.id}`}>Book Appointment</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild className="w-full" size="lg">
                      <a href={`tel:${CLINIC_PHONE_DIGITS}`}>
                        <Phone className="mr-2 h-4 w-4" /> Call {CLINIC_PHONE}
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        Book on WhatsApp
                      </a>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Online booking opens soon. Call us to confirm your appointment.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
