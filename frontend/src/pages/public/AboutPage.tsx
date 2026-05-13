import { Helmet } from 'react-helmet-async';
import { Target, Eye, Compass, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { CLINIC_FULL_NAME, CLINIC_TAGLINE_BN } from '../../config/featureFlags';

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About — {CLINIC_FULL_NAME}</title>
        <meta
          name="description"
          content={`Learn about ${CLINIC_FULL_NAME} — our mission, vision, and commitment to quality healthcare in Kolkata.`}
        />
      </Helmet>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              About <span className="text-primary">Arogya Diagnostics</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A multispeciality clinic in Kolkata committed to accurate diagnostics and trusted
              specialist care — all under one roof.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4">Our Mission</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                To make quality diagnostic services and specialist consultations accessible,
                affordable, and trustworthy for every patient in our community.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Eye className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4">Our Vision</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                To be Kolkata&apos;s most trusted multispeciality diagnostic centre — where every
                patient is treated with care, dignity, and clinical excellence.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4">Our Objective</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Deliver precise, timely reports backed by experienced specialists, and ensure every
                visit feels reassuring, informed, and respectful.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="bg-secondary/5">
        <div className="container py-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Our Story</h2>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>
                  Arogya Diagnostics &amp; Multispeciality Clinic was founded with a simple promise:
                  bring together accurate diagnostics, experienced doctors, and warm patient care in
                  one location.
                </p>
                <p>
                  Today, we offer Digital X-Ray, 3D/4D Ultrasonography, Pathology, ECG, Halter
                  Monitoring and consultations from specialists across departments — all by
                  appointment so you skip the queue.
                </p>
                <p className="italic" lang="bn">
                  {CLINIC_TAGLINE_BN}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/5 p-6">
                <div className="text-3xl font-bold text-primary">8+</div>
                <div className="mt-1 text-sm text-muted-foreground">Departments &amp; specialties</div>
              </div>
              <div className="rounded-lg bg-primary/5 p-6">
                <div className="text-3xl font-bold text-primary">10K+</div>
                <div className="mt-1 text-sm text-muted-foreground">Patients served</div>
              </div>
              <div className="rounded-lg bg-primary/5 p-6">
                <div className="text-3xl font-bold text-primary">24 hr</div>
                <div className="mt-1 text-sm text-muted-foreground">Standard report turnaround</div>
              </div>
              <div className="rounded-lg bg-primary/5 p-6">
                <div className="text-3xl font-bold text-primary">4.8★</div>
                <div className="mt-1 text-sm text-muted-foreground">Average patient rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">What we stand for</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Accuracy First',
              text:
                'Calibrated equipment and rigorous quality checks on every report. We don\'t take shortcuts on diagnostics.',
            },
            {
              icon: Stethoscope,
              title: 'Specialist-led care',
              text:
                'All consultations are with verified specialists in their field — no general locum stand-ins.',
            },
            {
              icon: Users,
              title: 'Patient dignity',
              text:
                'Clear pricing, prompt service, and staff who listen. You\'re a person, not a queue number.',
            },
          ].map((v) => (
            <div key={v.title} className="rounded-lg border bg-background p-6">
              <v.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
