import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Activity,
  CalendarCheck,
  Heart,
  Microscope,
  Phone,
  ScanLine,
  Star,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  Clock,
  Award,
  PlayCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Logo } from '../../components/shared/Logo';
import { MedicalBackdrop } from '../../components/shared/MedicalBackdrop';
import {
  CLINIC_FULL_NAME,
  CLINIC_PHONE,
  CLINIC_PHONE_DIGITS,
  CLINIC_WHATSAPP,
  CLINIC_TAGLINE_EN,
  CLINIC_TAGLINE_BN,
  CLINIC_SERVICES,
  PHASE_2_ENABLED,
} from '../../config/featureFlags';

const serviceIcons: Record<string, typeof Activity> = {
  digital_xray: ScanLine,
  ultrasonography: Activity,
  pathology: Microscope,
  ecg_halter: Heart,
  medical_examination: Stethoscope,
};

const stats = [
  { value: '10K+', label: 'Patients served' },
  { value: '8+', label: 'Specialties' },
  { value: '4.8★', label: 'Avg. rating' },
  { value: '24h', label: 'Report TAT' },
];

// Local media — served from /public/media; MP4s aren't bundled by Vite so
// they don't bloat the JS payload. Every <video> is paired with a poster
// image so the LCP element paints instantly while the clip streams in.
const MEDIA = {
  heroVideo: '/media/217018_medium.mp4',
  heroPoster: '/media/excellentcc-covid-19-5169689_1920.jpg',
  labVideo: '/media/262187_medium.mp4',
  banner: '/media/excellentcc-covid-19-5169689_1920.jpg',
} as const;

const labImages = [
  // Unsplash lab/medical photography — free CDN-hosted, served with format hints
  {
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=70',
    alt: 'Modern pathology lab',
    caption: 'Modern pathology',
  },
  {
    url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&auto=format&fit=crop&q=70',
    alt: 'Doctor consultation',
    caption: 'Expert consultations',
  },
  {
    url: 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=800&auto=format&fit=crop&q=70',
    alt: 'Diagnostic imaging',
    caption: 'Digital diagnostics',
  },
  {
    url: 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?w=800&auto=format&fit=crop&q=70',
    alt: 'Home sample collection',
    caption: 'Home collection',
  },
];

export default function HomePage() {
  const whatsappUrl = `https://wa.me/${CLINIC_WHATSAPP.replace('+', '')}`;

  return (
    <>
      <Helmet>
        <title>{CLINIC_FULL_NAME} — Specialist Doctors &amp; Diagnostic Services</title>
        <meta name="description" content={CLINIC_TAGLINE_EN} />
      </Helmet>

      {/* ── Hero with video background + medical decoration ─────────────── */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        {/* Local background video (~3.4 MB) with preload="metadata" so only
            headers load up-front; the poster image paints first as LCP. */}
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={MEDIA.heroPoster}
          aria-hidden="true"
        >
          <source src={MEDIA.heroVideo} type="video/mp4" />
        </video>

        {/* Medical decoration layer — DNA helix + molecule + EKG line. Pure
            inline SVG with reduced-motion-safe animations, no extra fetch. */}
        <MedicalBackdrop tone="dark" />

        <div className="container relative z-10 grid gap-10 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
              Verified specialists · NABL-grade pathology
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Less of the wait,
              <br />
              <span className="bg-gradient-to-r from-secondary to-white bg-clip-text text-transparent">
                more of your wellbeing.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/90">
              {CLINIC_TAGLINE_EN}
            </p>
            <p className="mt-2 max-w-xl text-base text-white/75" lang="bn">
              {CLINIC_TAGLINE_BN}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {PHASE_2_ENABLED ? (
                <>
                  <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <Link to="/doctors">
                      Book a Doctor <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-primary"
                  >
                    <Link to="/services">Browse Tests</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <a href={`tel:${CLINIC_PHONE_DIGITS}`}>
                      <Phone className="mr-2 h-4 w-4" /> Call {CLINIC_PHONE}
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-primary"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      WhatsApp Booking
                    </a>
                  </Button>
                </>
              )}
            </div>

            <div className="mt-10 grid grid-cols-4 gap-3 sm:gap-5">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`animate-fade-up delay-${(i + 2) * 100}`}
                >
                  <div className="text-xl font-bold sm:text-2xl">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/70 sm:text-xs">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero card — frosted-glass with a subtle live "available now" dot */}
          <div className="animate-scale-in delay-200 lg:justify-self-end">
            <div className="glass-card relative mx-auto max-w-md rounded-2xl p-6 text-foreground shadow-2xl">
              {/* Live availability dot with pulse-ring */}
              <div className="absolute right-4 top-4 flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-secondary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </div>
              <div className="flex items-start gap-3">
                <Logo size={56} />
                <div>
                  <div className="text-xl font-bold leading-tight text-primary">AROGYA DIAGNOSTICS</div>
                  <div className="text-sm font-semibold leading-tight text-secondary-foreground">
                    &amp; MULTISPECIALITY CLINIC
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-gradient-brand-soft p-3 text-center text-sm font-medium">
                All Specialist Doctors Are Available here
                <br />
                <span className="text-primary">By Appointment.</span>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground" lang="bn">
                {CLINIC_TAGLINE_BN}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Phone className="h-5 w-5 text-secondary animate-heartbeat" />
                <a
                  href={`tel:${CLINIC_PHONE_DIGITS}`}
                  className="text-lg font-bold text-primary hover:text-primary/80"
                >
                  {CLINIC_PHONE}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <Badge variant="secondary" className="mb-3">
            Our Services
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Diagnostics &amp; care, <span className="text-gradient-brand">under one roof</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pathology, radiology, cardiac diagnostics, and specialist consultations — designed for accuracy and speed.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CLINIC_SERVICES.map((service, idx) => {
            const Icon = serviceIcons[service.key] ?? Activity;
            return (
              <Card
                key={service.key}
                className={`group border-2 transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-lg animate-fade-up delay-${(idx + 1) * 100}`}
              >
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="mt-4 flex flex-wrap items-center gap-2 text-base">
                    {service.name_en}
                    {service.comingSoon && (
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription lang="bn" className="text-xs">
                    {service.name_bn}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Lab gallery ──────────────────────────────────────────────────── */}
      <section className="bg-muted/40 py-16 md:py-20">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div className="animate-fade-up">
              <Badge variant="secondary" className="mb-3">
                Inside the Clinic
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Calibrated equipment.<br />
                <span className="text-gradient-brand">Trained hands. Reliable reports.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                From digital X-ray to 3D/4D ultrasonography and a fully-equipped pathology lab — our diagnostic suite is built around accuracy and quick turnaround.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Award className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span>
                    <strong className="text-foreground">Certified specialists.</strong>{' '}
                    <span className="text-muted-foreground">
                      All consulting doctors are verified by clinic protocols.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span>
                    <strong className="text-foreground">Quick turnaround.</strong>{' '}
                    <span className="text-muted-foreground">
                      Most reports ready within 24 hours; same-day for ECG &amp; X-ray.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span>
                    <strong className="text-foreground">Secure reports.</strong>{' '}
                    <span className="text-muted-foreground">
                      Time-limited download links — your data stays private.
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* First tile = local lab video, autoplay muted loop. The
                  poster paints first; the MP4 streams in as metadata is
                  resolved. Eye-catching real clinic footage instead of
                  stock. */}
              <div className="hover-lift group relative col-span-2 aspect-[16/10] overflow-hidden rounded-xl bg-card shadow-md animate-fade-up delay-100">
                <video
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={MEDIA.banner}
                  aria-label="Inside the Arogya pathology lab"
                >
                  <source src={MEDIA.labVideo} type="video/mp4" />
                </video>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                  <p className="text-xs font-medium text-white">Inside our lab</p>
                </div>
              </div>
              {labImages.slice(1).map((img, i) => (
                <div
                  key={img.url}
                  className={`hover-lift group relative aspect-square overflow-hidden rounded-xl bg-card shadow-md animate-fade-up delay-${(i + 2) * 100}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                    <p className="text-xs font-medium text-white">{img.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Doctor appointment teaser ─────────────────────────────────────── */}
      <section className="container py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div className="relative order-2 lg:order-1 animate-fade-up">
            <div className="aspect-[5/4] overflow-hidden rounded-2xl shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=75"
                alt="Doctor consulting with a patient"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 hidden rounded-xl border bg-card p-3 shadow-lg sm:block animate-scale-in delay-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Available</div>
                  <div className="text-sm font-bold">8+ specialists</div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 animate-fade-up delay-100">
            <Badge variant="secondary" className="mb-3">
              Doctor Appointments
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              See the right specialist,<br />
              <span className="text-gradient-brand">at a time that suits you.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Skip the queue. Pick a doctor, choose a slot, and confirm with 50% advance — the
              balance is paid at the visit.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {['Cardiology', 'Diabetology', 'Paediatrics', 'Gynaecology', 'Orthopaedics', 'Dermatology'].map((d) => (
                <Link
                  key={d}
                  to="/departments"
                  className="rounded-lg border bg-card px-3 py-2 text-center text-sm font-medium transition-colors hover:border-secondary hover:bg-accent"
                >
                  {d}
                </Link>
              ))}
            </div>
            <Button asChild size="lg" className="mt-6 bg-gradient-brand text-white hover:opacity-95">
              <Link to="/doctors">
                Browse all doctors <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Why choose us ────────────────────────────────────────────────── */}
      <section className="bg-gradient-brand-soft py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center animate-fade-up">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Why patients trust us
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: CalendarCheck,
                title: 'By appointment only',
                text: 'Pick a date and time that works for you — no waiting room queues.',
              },
              {
                icon: Stethoscope,
                title: 'All specialists, one clinic',
                text: 'Multiple departments and verified doctors at a single location.',
              },
              {
                icon: Microscope,
                title: 'Modern diagnostics',
                text: 'Digital X-ray, 3D/4D ultrasonography, pathology, ECG and more.',
              },
            ].map((v, i) => (
              <div
                key={v.title}
                className={`flex gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md animate-fade-up delay-${(i + 1) * 100}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
                  <v.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ──────────────────────────────────────────────────── */}
      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden border-2">
            <CardContent className="grid gap-0 sm:grid-cols-[200px,1fr]">
              <div className="bg-gradient-brand p-6 text-white">
                <PlayCircle className="h-8 w-8" />
                <div className="mt-3 text-sm uppercase tracking-wide opacity-90">Patient story</div>
                <div className="mt-1 text-2xl font-bold leading-tight">
                  &ldquo;Quick, accurate &amp; caring&rdquo;
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mt-3 text-muted-foreground">
                  &ldquo;Booked an ECG and a full blood panel for my father. The home collection
                  was on time, reports were ready the next morning, and the doctor explained
                  everything patiently.&rdquo;
                </p>
                <div className="mt-4 text-sm">
                  <div className="font-semibold">— Sumita Banerjee</div>
                  <div className="text-xs text-muted-foreground">Salt Lake, Kolkata</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-hero py-12 text-white">
        <div className="container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="animate-fade-up">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Ready when you are.
            </h2>
            <p className="mt-1 text-white/80">Specialist appointments and lab tests, by appointment.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row animate-fade-up delay-100">
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <a href={`tel:${CLINIC_PHONE_DIGITS}`}>
                <Phone className="mr-2 h-4 w-4" /> {CLINIC_PHONE}
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white hover:text-primary"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp Us
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
