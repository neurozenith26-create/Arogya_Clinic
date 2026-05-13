import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Clock, Droplets, Home, ShoppingCart, Search, Tag } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn, formatCurrencyINR } from '../../lib/utils';
import { useServiceCategories, useServices } from '../../hooks/queries';
import { useCartStore } from '../../stores/cartStore';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

export default function ServicesPage() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  // `?mode=home_visit` set by the "Book Home Visit" CTA in Header / Dashboard
  // sidebar. We also check the cart-store preference (which the CTA sets) so
  // a navigation that drops the query string still keeps the mode visible.
  const preferredVisitType = useCartStore((s) => s.preferredVisitType);
  const setPreferredVisitType = useCartStore((s) => s.setPreferredVisitType);
  const homeVisitMode =
    params.get('mode') === 'home_visit' || preferredVisitType === 'home_visit';

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  const { data: categories = [] } = useServiceCategories();
  const { data: services = [], isLoading } = useServices({
    categorySlug: activeCategory,
    q: search || undefined,
  });

  const cartCountFor = (serviceId: number): number =>
    cartItems.find((i) => i.service_id === serviceId)?.quantity ?? 0;

  const handleAddToCart = (service: (typeof services)[number]) => {
    addItem(service);
    setJustAddedId(service.id);
    // Brief "Added ✓" feedback then revert to "Add to cart" label.
    setTimeout(() => {
      setJustAddedId((curr) => (curr === service.id ? null : curr));
    }, 1200);
  };

  return (
    <>
      <Helmet>
        <title>Services & Tests — {CLINIC_FULL_NAME}</title>
        <meta
          name="description"
          content="Browse pathology tests, radiology, ultrasonography, cardiac diagnostics, and health packages."
        />
      </Helmet>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-12 md:py-16">
          {homeVisitMode && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
              <div className="inline-flex items-center gap-2">
                <Home className="h-5 w-5" />
                <span>
                  <strong>Home collection mode.</strong> Add tests to your cart — at
                  checkout you'll enter your pincode to see the home-visit charge and
                  pick a collection slot.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreferredVisitType(undefined);
                  // Strip the URL param so the banner doesn't re-appear on reload.
                  window.history.replaceState({}, '', '/services');
                }}
              >
                Switch to in-clinic
              </Button>
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Services &amp; Tests</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pathology, Radiology, Ultrasonography, Cardiac Diagnostics, and Health Packages —
            transparent pricing, accurate reports.
          </p>

          <div className="mt-6 relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tests or packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      <section className="container py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={!activeCategory ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(undefined)}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c.slug}
              variant={activeCategory === c.slug ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(c.slug)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No services match your filters. Try clearing the search.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Card
                key={s.id}
                className={cn(
                  'flex flex-col transition-all hover:border-primary/40 hover:shadow-md',
                  s.is_package && 'border-primary/30 bg-primary/5',
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="outline" className="text-xs">
                      {s.category_name}
                    </Badge>
                    {s.is_package && <Badge variant="default">Package</Badge>}
                  </div>
                  <CardTitle className="mt-2 text-base">{s.name}</CardTitle>
                  <CardDescription className="text-sm">{s.short_description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {s.sample_type && (
                      <span className="inline-flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5" />
                        {s.sample_type}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {s.report_turnaround_hours}h report
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-lg font-bold text-primary">
                      <Tag className="h-4 w-4" />
                      {formatCurrencyINR(s.price)}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {(() => {
                        const inCart = cartCountFor(s.id);
                        const justAdded = justAddedId === s.id;
                        return (
                          <Button
                            type="button"
                            size="sm"
                            variant={inCart > 0 ? 'default' : 'outline'}
                            onClick={() => handleAddToCart(s)}
                            title={
                              inCart > 0
                                ? `${inCart} in cart — click to add another`
                                : 'Add to cart'
                            }
                          >
                            {justAdded ? (
                              <>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Added
                              </>
                            ) : inCart > 0 ? (
                              <>
                                <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                                In cart ({inCart})
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                                Add to cart
                              </>
                            )}
                          </Button>
                        );
                      })()}
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/services/${s.slug}`}>Details</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
