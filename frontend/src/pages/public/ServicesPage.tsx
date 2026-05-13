import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Clock, Droplets, Tag } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn, formatCurrencyINR } from '../../lib/utils';
import { useServiceCategories, useServices } from '../../hooks/queries';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | undefined>();

  const { data: categories = [] } = useServiceCategories();
  const { data: services = [], isLoading } = useServices({
    categorySlug: activeCategory,
    q: search || undefined,
  });

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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-lg font-bold text-primary">
                      <Tag className="h-4 w-4" />
                      {formatCurrencyINR(s.price)}
                    </div>
                    <Button asChild size="sm">
                      <Link to={`/services/${s.slug}`}>View details</Link>
                    </Button>
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
