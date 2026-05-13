import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Logo } from '../../components/shared/Logo';
import { useAuthStore } from '../../stores/authStore';
import { indianMobileSchema } from '@arogya/shared/schemas/address';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

const signupSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(1).max(100),
  mobile: indianMobileSchema,
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'At least 6 characters').max(128),
});
type SignupInput = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { first_name: '', last_name: '', mobile: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignupInput) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signUp({
        first_name: values.first_name,
        last_name: values.last_name,
        mobile: values.mobile,
        email: values.email || undefined,
        password: values.password,
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not create your account');
        return;
      }
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Create an account — {CLINIC_FULL_NAME}</title>
      </Helmet>
      <div className="container flex min-h-[80vh] items-center justify-center py-12">
        <Card className="w-full max-w-md animate-fade-up">
          <CardHeader className="space-y-3 text-center">
            <Logo size={48} className="mx-auto" />
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>One account for all your bookings and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First name</Label>
                  <Input id="first_name" {...form.register('first_name')} className="mt-1.5" />
                  {form.formState.errors.first_name && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Last name</Label>
                  <Input id="last_name" {...form.register('last_name')} className="mt-1.5" />
                  {form.formState.errors.last_name && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="mobile">Mobile number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  {...form.register('mobile')}
                  className="mt-1.5"
                />
                {form.formState.errors.mobile && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.mobile.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" {...form.register('email')} className="mt-1.5" />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register('password')}
                  className="mt-1.5"
                  placeholder="At least 6 characters"
                />
                {form.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
