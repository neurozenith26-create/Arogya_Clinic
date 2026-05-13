import { Helmet } from 'react-helmet-async';
import { CLINIC_FULL_NAME, CLINIC_EMAIL } from '../../config/featureFlags';

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — {CLINIC_FULL_NAME}</title>
        <meta name="description" content="Terms governing the use of our website and services." />
      </Helmet>

      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: 12 May 2026</p>

          <div className="prose prose-sm mt-8 space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. Bookings</h2>
              <p>
                Doctor appointments and diagnostic tests can be booked through this website or by
                phone. A 50% advance payment is required to confirm online bookings. The remaining
                balance is collected at the time of service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. Cancellations &amp; refunds</h2>
              <ul className="ml-5 list-disc space-y-1">
                <li>Cancellations more than 24 hours before your slot — 100% refundable.</li>
                <li>Cancellations 12–24 hours before — 50% refundable.</li>
                <li>Cancellations less than 2 hours before, or no-shows — non-refundable.</li>
              </ul>
              <p>
                Refunds are processed within 5–7 business days to the original payment method.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">3. Home sample collection</h2>
              <p>
                Home collection is available for serviceable pincodes only. Pincode serviceability
                is verified during booking. Additional home-visit charges may apply based on your
                location.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Reports</h2>
              <p>
                Reports are made available via your patient dashboard. Report turnaround times are
                indicative and may vary depending on the test. Reports remain accessible for the
                duration required by medical-records law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Medical disclaimer</h2>
              <p>
                Information shared on this website is for general informational purposes only and
                is not a substitute for professional medical advice. Always consult a qualified
                healthcare provider for personal medical decisions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Limitation of liability</h2>
              <p>
                We strive to provide accurate diagnostics and timely care. We are not liable for
                indirect or consequential damages arising from delays, technical issues, or
                misinterpretation of self-served information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Governing law</h2>
              <p>
                These terms are governed by Indian law. Any disputes are subject to the exclusive
                jurisdiction of the courts in Kolkata, West Bengal.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
              <p>
                Questions about these terms? Write to{' '}
                <a href={`mailto:${CLINIC_EMAIL}`} className="text-primary hover:underline">
                  {CLINIC_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
