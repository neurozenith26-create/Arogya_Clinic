import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MapPin, Phone, MessageCircle, CheckCircle2 } from 'lucide-react';
import { enquirySchema, type EnquiryInput } from '@arogya/shared/schemas/enquiry';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useSubmitEnquiry } from '../../hooks/queries';
import {
  CLINIC_FULL_NAME,
  CLINIC_ADDRESS,
  CLINIC_EMAIL,
  CLINIC_PHONE,
  CLINIC_PHONE_DIGITS,
  CLINIC_WHATSAPP,
} from '../../config/featureFlags';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const submitMutation = useSubmitEnquiry();

  const form = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  });

  const onSubmit = async (values: EnquiryInput) => {
    await submitMutation.mutateAsync({
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      subject: values.subject || undefined,
      message: values.message,
    });
    setSubmitted(true);
    form.reset();
  };

  const whatsappUrl = `https://wa.me/${CLINIC_WHATSAPP.replace('+', '')}`;

  return (
    <>
      <Helmet>
        <title>Contact Us — {CLINIC_FULL_NAME}</title>
        <meta name="description" content="Get in touch with our clinic — phone, WhatsApp, email, or send a message." />
      </Helmet>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-12 md:py-16">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Contact Us</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Reach us by phone, WhatsApp, or email — or send a message using the form below and
            we&apos;ll get back to you within one working day.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: contact info cards */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Phone className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Phone</div>
                  <a
                    href={`tel:${CLINIC_PHONE_DIGITS}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {CLINIC_PHONE}
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">WhatsApp</div>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Chat with us
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Mail className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Email</div>
                  <a
                    href={`mailto:${CLINIC_EMAIL}`}
                    className="break-all text-sm text-muted-foreground hover:text-primary"
                  >
                    {CLINIC_EMAIL}
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Address</div>
                  <p className="text-sm text-muted-foreground">{CLINIC_ADDRESS}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: enquiry form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <h3 className="mt-3 text-lg font-semibold">Thank you for your message!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We&apos;ll get back to you within one working day.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6"
                      onClick={() => setSubmitted(false)}
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="name">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input id="name" {...form.register('name')} className="mt-1.5" />
                        {form.formState.errors.name && (
                          <p className="mt-1 text-xs text-destructive">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="10-digit mobile"
                          {...form.register('phone')}
                          className="mt-1.5"
                        />
                        {form.formState.errors.phone && (
                          <p className="mt-1 text-xs text-destructive">
                            {form.formState.errors.phone.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...form.register('email')}
                          className="mt-1.5"
                        />
                        {form.formState.errors.email && (
                          <p className="mt-1 text-xs text-destructive">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" {...form.register('subject')} className="mt-1.5" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        rows={5}
                        {...form.register('message')}
                        className="mt-1.5"
                        placeholder="Tell us how we can help..."
                      />
                      {form.formState.errors.message && (
                        <p className="mt-1 text-xs text-destructive">
                          {form.formState.errors.message.message}
                        </p>
                      )}
                    </div>

                    {submitMutation.isError && (
                      <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                        Something went wrong sending your message. Please try again or call us
                        directly at {CLINIC_PHONE}.
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {submitMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
