import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Logo } from '../../components/shared/Logo';
import { MedicalBackdrop } from '../../components/shared/MedicalBackdrop';
import { useAuthStore, DEMO_CREDENTIALS } from '../../stores/authStore';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

type Mode = 'email' | 'mobile';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const sendOtpAction = useAuthStore((s) => s.sendOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const goToTarget = (role: string) => {
    if (role === 'admin' || role === 'super_admin') {
      navigate('/admin', { replace: true });
      return;
    }
    const to = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';
    navigate(to, { replace: true });
  };

  const fillDemoPatient = () => {
    setMode('email');
    setEmail(DEMO_CREDENTIALS.PATIENT_EMAIL);
    setPassword(DEMO_CREDENTIALS.PASSWORD);
    setError(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Sign in failed');
        return;
      }
      goToTarget(result.user.role);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await sendOtpAction(mobile);
      if (!result.ok) {
        setError(result.error ?? 'Could not send OTP');
        return;
      }
      setDebugOtp(result.debugCode ?? null);
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp(mobile, otp);
      if (!result.ok || !result.user) {
        setError(result.error ?? 'OTP verification failed');
        return;
      }
      goToTarget(result.user.role);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign in — {CLINIC_FULL_NAME}</title>
      </Helmet>
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden py-8">
        {/* Soft brand-tinted backdrop — patient login uses the light tone so
            text stays readable while still feeling modern. */}
        <MedicalBackdrop tone="light" minimal />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/40 via-background to-background" />
        <Card className="relative z-10 w-full max-w-md animate-fade-up shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <Logo size={48} className="mx-auto" />
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage bookings and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-md border border-secondary/40 bg-accent p-3 text-xs">
              <div className="font-semibold text-accent-foreground">
                <ShieldCheck className="mb-0.5 inline h-3.5 w-3.5" /> Demo accounts
              </div>
              <div className="mt-1 space-y-0.5 text-accent-foreground/90">
                <div>
                  Patient: <span className="font-mono">{DEMO_CREDENTIALS.PATIENT_EMAIL}</span> /{' '}
                  <span className="font-mono">{DEMO_CREDENTIALS.PASSWORD}</span>
                </div>
                <div>
                  Admin: <span className="font-mono">{DEMO_CREDENTIALS.ADMIN_EMAIL}</span> /{' '}
                  <span className="font-mono">{DEMO_CREDENTIALS.PASSWORD}</span>{' '}
                  <Link to="/admin/login" className="underline">
                    (admin login →)
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={fillDemoPatient}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Auto-fill patient demo
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 rounded-md border p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('email');
                  setError(null);
                }}
                className={
                  mode === 'email'
                    ? 'rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                    : 'rounded px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent'
                }
              >
                <Mail className="mr-1 inline h-3.5 w-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('mobile');
                  setError(null);
                }}
                className={
                  mode === 'mobile'
                    ? 'rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                    : 'rounded px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent'
                }
              >
                <Phone className="mr-1 inline h-3.5 w-3.5" /> Mobile OTP
              </button>
            </div>

            {mode === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                {error && (
                  <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            )}

            {mode === 'mobile' && (
              <form onSubmit={handleOtpLogin} className="space-y-4">
                <div>
                  <Label htmlFor="mobile">Mobile number</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10-digit mobile"
                      disabled={otpSent}
                    />
                    {!otpSent && (
                      <Button type="button" onClick={sendOtp} disabled={loading}>
                        {loading ? 'Sending...' : 'Send OTP'}
                      </Button>
                    )}
                  </div>
                </div>
                {otpSent && (
                  <div>
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="mt-1.5 text-center text-lg tracking-widest"
                    />
                    {debugOtp && (
                      <p className="mt-2 rounded bg-accent p-2 text-center text-xs text-accent-foreground">
                        Demo OTP: <span className="font-mono font-bold">{debugOtp}</span>
                      </p>
                    )}
                  </div>
                )}
                {error && (
                  <p className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                  </p>
                )}
                {otpSent && (
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>
                )}
              </form>
            )}

            <div className="mt-6 space-y-2 border-t pt-4 text-center text-sm text-muted-foreground">
              <div>
                New patient?{' '}
                <Link to="/auth/signup" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </div>
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to home page
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
