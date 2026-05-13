import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  Clock,
  Droplets,
  Phone,
  Info,
  CheckCircle2,
  Copy,
  ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useService } from '../../hooks/queries';
import { useCartStore } from '../../stores/cartStore';
import { formatCurrencyINR } from '../../lib/utils';
import {
  CLINIC_FULL_NAME,
  CLINIC_PHONE,
  CLINIC_PHONE_DIGITS,
  CLINIC_WHATSAPP,
  PHASE_2_ENABLED,
} from '../../config/featureFlags';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: service, isLoading } = useService(slug);
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.find((i) => i.slug === slug)?.quantity ?? 0);
  const [copied, setCopied] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCart = () => {
    if (!service) return;
    addItem(service);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-12 w-2/3" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Service not found</h1>
        <p className="mt-2 text-muted-foreground">
          The test you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild className="mt-6">
          <Link to="/services">Back to services</Link>
        </Button>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/${CLINIC_WHATSAPP.replace(
    '+',
    '',
  )}?text=${encodeURIComponent(`Hi, I'd like to book ${service.name}.`)}`;

  return (
    <>
      <Helmet>
        <title>
          {service.name} — {CLINIC_FULL_NAME}
        </title>
        <meta name="description" content={service.short_description} />
      </Helmet>

      <section className="container py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/services">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to services
          </Link>
        </Button>
      </section>

      <section className="container pb-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            <Badge variant="outline">{service.category_name}</Badge>
            {service.is_package && (
              <Badge variant="default" className="ml-2">
                Health Package
              </Badge>
            )}

            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{service.name}</h1>
            <p className="mt-3 text-muted-foreground">{service.short_description}</p>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">About this test</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{service.full_details}</p>
              </CardContent>
            </Card>

            {service.prep_instructions && (
              <Card className="mt-6 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-5 w-5 text-primary" /> Preparation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{service.prep_instructions}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <div className="text-sm text-muted-foreground">Test price</div>
                <div className="text-4xl font-bold text-primary">
                  {formatCurrencyINR(service.price)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {service.sample_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Droplets className="h-4 w-4 text-primary" />
                      <span>Sample: {service.sample_type}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Report in {service.report_turnaround_hours} hours</span>
                  </div>
                </div>

                {PHASE_2_ENABLED ? (
                  <>
                    <Button className="w-full" size="lg" onClick={handleAddToCart}>
                      {justAdded ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Added to cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {cartCount > 0 ? `Add another (${cartCount} in cart)` : 'Add to Cart'}
                        </>
                      )}
                    </Button>
                    {cartCount > 0 && (
                      <Button variant="outline" className="w-full" onClick={() => navigate('/cart')}>
                        View Cart &amp; Checkout
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full" size="lg">
                      <a href={`tel:${CLINIC_PHONE_DIGITS}`}>
                        <Phone className="mr-2 h-4 w-4" /> Call {CLINIC_PHONE}
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        Book on WhatsApp
                      </a>
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={copyLink}
                  type="button"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-1 h-4 w-4 text-green-600" /> Link copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" /> Copy link to share
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
