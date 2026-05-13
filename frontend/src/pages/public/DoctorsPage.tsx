import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Star, BadgeCheck, MapPin, Home } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useDepartments, useDoctors } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

export default function DoctorsPage() {
  const [search, setSearch] = useState('');
  const [activeDept, setActiveDept] = useState<string | undefined>();

  const { data: departments = [] } = useDepartments();
  const { data: doctors = [], isLoading } = useDoctors({
    departmentId: activeDept,
    q: search || undefined,
  });

  return (
    <>
      <Helmet>
        <title>Our Doctors — {CLINIC_FULL_NAME}</title>
        <meta
          name="description"
          content="Browse verified specialist doctors across multiple departments."
        />
      </Helmet>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-12 md:py-16">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Our Doctors</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Verified specialists across {departments.length}+ departments. Filter by department or
            search by name &amp; speciality.
          </p>

          <div className="mt-6 relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or speciality..."
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
            variant={!activeDept ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveDept(undefined)}
          >
            All Departments
          </Button>
          {departments.map((d) => (
            <Button
              key={d.id}
              variant={activeDept === String(d.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveDept(String(d.id))}
            >
              {d.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No doctors match your filters.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <Card key={d.id} className="overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                <div className="flex flex-col items-center bg-accent/40 p-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                    {d.first_name.charAt(0)}
                    {d.last_name.charAt(0)}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <h3 className="font-semibold">{d.display_name}</h3>
                    {d.is_verified && <BadgeCheck className="h-4 w-4 text-blue-600" aria-label="Verified" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{d.speciality}</p>
                </div>

                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap gap-1.5">
                    {d.qualifications.slice(0, 3).map((q) => (
                      <Badge key={q} variant="outline" className="text-xs">
                        {q}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{d.rating_avg.toFixed(1)}</span>
                      <span className="text-muted-foreground">({d.rating_count})</span>
                    </div>
                    <div className="font-semibold text-primary">
                      {formatCurrencyINR(d.consultation_fee)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {d.centers[0]?.city ?? 'Kolkata'}
                    </span>
                    {d.offers_home_visit && (
                      <span className="inline-flex items-center gap-1">
                        <Home className="h-3 w-3" /> Home visit
                      </span>
                    )}
                  </div>

                  <Button asChild className="w-full">
                    <Link to={`/doctors/${d.id}`}>View profile</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
