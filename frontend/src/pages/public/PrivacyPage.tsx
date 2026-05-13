import { Helmet } from 'react-helmet-async';
import { CLINIC_FULL_NAME, CLINIC_EMAIL } from '../../config/featureFlags';

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — {CLINIC_FULL_NAME}</title>
        <meta name="description" content="Our privacy policy on how we handle patient data." />
      </Helmet>

      <section className="container py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: 12 May 2026</p>

          <div className="prose prose-sm mt-8 space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">1. What we collect</h2>
              <p>
                When you book an appointment or test with us, we collect: your name, mobile number,
                email (optional), date of birth, gender, and home address (only for home visits).
                For test bookings we also store the tests selected, payment details (handled by our
                payment provider), and the resulting reports.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. Why we collect it</h2>
              <ul className="ml-5 list-disc space-y-1">
                <li>To deliver the appointment, sample collection, and reports you booked.</li>
                <li>To send confirmations, reminders, and report-ready alerts via SMS and email.</li>
                <li>To issue invoices required for legal and tax compliance.</li>
                <li>To improve the service, only using anonymised, aggregated data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">3. Who can see your reports</h2>
              <p>
                Only you and authorised clinic staff can see your medical reports. Reports are
                shared via secure, time-limited download links — they are never sent as
                attachments. We never sell, rent, or share your data with third parties for
                marketing.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Payment data</h2>
              <p>
                All online payments are processed by Razorpay. We never store your card number, UPI
                PIN, or banking credentials on our servers — Razorpay handles the entire payment
                transaction under PCI-DSS standards.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Data retention</h2>
              <p>
                Medical reports are retained for as long as required by Indian medical-records law
                (typically 3 years for adult records). Booking and invoice data is retained for tax
                and audit compliance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Your rights</h2>
              <p>
                You can request a copy of all data we hold about you, ask us to correct it, or
                request deletion (subject to legal retention requirements). Write to{' '}
                <a href={`mailto:${CLINIC_EMAIL}`} className="text-primary hover:underline">
                  {CLINIC_EMAIL}
                </a>{' '}
                with your request.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
              <p>
                Privacy questions or concerns? Reach us at{' '}
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
