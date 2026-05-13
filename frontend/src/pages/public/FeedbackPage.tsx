import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Star } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { StarRating } from '../../components/ui/star-rating';
import { useReviews, useSubmitReview } from '../../hooks/queries';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

const feedbackFormSchema = z.object({
  guest_name: z.string().min(2, 'Please enter your name').max(100),
  rating: z.number().int().min(1, 'Please give a rating').max(5),
  comment: z.string().min(5, 'Please share a bit more about your experience').max(2000),
});
type FeedbackFormInput = z.infer<typeof feedbackFormSchema>;

export default function FeedbackPage() {
  const [submitted, setSubmitted] = useState(false);
  const submitMutation = useSubmitReview();
  const { data: reviews = [] } = useReviews();

  const form = useForm<FeedbackFormInput>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: { guest_name: '', rating: 0, comment: '' },
  });

  const rating = form.watch('rating');

  const onSubmit = async (values: FeedbackFormInput) => {
    await submitMutation.mutateAsync({
      rating: values.rating,
      comment: values.comment,
      guest_name: values.guest_name,
    });
    setSubmitted(true);
    form.reset({ guest_name: '', rating: 0, comment: '' });
  };

  return (
    <>
      <Helmet>
        <title>Share Your Feedback — {CLINIC_FULL_NAME}</title>
        <meta name="description" content="Help us improve — leave your experience and rating." />
      </Helmet>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-12 md:py-16">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Share Your Feedback</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Your experience helps other patients and helps us serve better. All reviews are
            moderated before being published.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Leave a Review</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <h3 className="mt-3 text-lg font-semibold">Thank you for your feedback!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your review is pending moderation and will appear on the site shortly.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
                      Submit another review
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                      <Label htmlFor="guest_name">
                        Your name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="guest_name"
                        {...form.register('guest_name')}
                        className="mt-1.5"
                      />
                      {form.formState.errors.guest_name && (
                        <p className="mt-1 text-xs text-destructive">
                          {form.formState.errors.guest_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>
                        Your rating <span className="text-destructive">*</span>
                      </Label>
                      <div className="mt-2">
                        <StarRating
                          value={rating}
                          onChange={(v) => form.setValue('rating', v, { shouldValidate: true })}
                          size={32}
                        />
                      </div>
                      {form.formState.errors.rating && (
                        <p className="mt-1 text-xs text-destructive">
                          {form.formState.errors.rating.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="comment">
                        Your experience <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="comment"
                        rows={5}
                        {...form.register('comment')}
                        className="mt-1.5"
                        placeholder="Tell us about your visit — what worked, what could be better..."
                      />
                      {form.formState.errors.comment && (
                        <p className="mt-1 text-xs text-destructive">
                          {form.formState.errors.comment.message}
                        </p>
                      )}
                    </div>

                    {submitMutation.isError && (
                      <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                        Something went wrong submitting your review. Please try again.
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.patient_first_name}</div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={
                              i < r.rating
                                ? 'h-3.5 w-3.5 fill-yellow-400 text-yellow-400'
                                : 'h-3.5 w-3.5 fill-muted text-muted-foreground/40'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
