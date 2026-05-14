import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, AlertCircle, ArrowLeft, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Logo } from '../../components/shared/Logo';
import { useAuthStore, DEMO_CREDENTIALS } from '../../stores/authStore';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.ADMIN_EMAIL);
    setPassword(DEMO_CREDENTIALS.PASSWORD);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Sign in failed');
        return;
      }
      if (result.user.role !== 'admin' && result.user.role !== 'super_admin') {
        setError('This account is not an admin account.');
        return;
      }
      const to = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/admin';
      navigate(to, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Sign in — Arogya</title>
      </Helmet>
      <div className="bg-gradient-hero flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md animate-fade-up shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <Logo size={48} className="mx-auto" />
            <CardTitle className="text-2xl">Admin Sign in</CardTitle>
            <CardDescription>
              <ShieldCheck className="mb-0.5 inline h-4 w-4 text-primary" /> Staff access only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-md border border-secondary/40 bg-accent p-3 text-xs">
              <div className="font-semibold text-accent-foreground">Demo admin account</div>
              <div className="mt-1 text-accent-foreground/90">
                <span className="font-mono">{DEMO_CREDENTIALS.ADMIN_EMAIL}</span> /{' '}
                <span className="font-mono">{DEMO_CREDENTIALS.PASSWORD}</span>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Auto-fill demo admin
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  required
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
                  required
                />
              </div>
              {error && (
                <p className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 space-y-2 border-t pt-4 text-center text-xs">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <User className="h-3.5 w-3.5" />
                Are you a patient? Sign in here
              </Link>
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
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
