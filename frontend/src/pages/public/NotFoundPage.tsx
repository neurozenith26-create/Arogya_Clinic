import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '../../components/ui/button';
import { CLINIC_NAME } from '../../config/featureFlags';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found — {CLINIC_NAME}</title>
      </Helmet>
      <section className="container py-24 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-4 text-xl text-muted-foreground">This page doesn&apos;t exist.</p>
        <Button asChild className="mt-8">
          <Link to="/">Back to Home</Link>
        </Button>
      </section>
    </>
  );
}
