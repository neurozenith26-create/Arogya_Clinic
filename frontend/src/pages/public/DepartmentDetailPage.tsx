import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, BadgeCheck, Star, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useDepartment, useDoctors } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

export default function DepartmentDetailPage() {
  const { slug } = useParams();
  const { data: department, isLoading: deptLoading } = useDepartment(slug);
  const { data: doctors = [], isLoading: docsLoading } = useDoctors(
    department ? { departmentId: String(department.id) } : undefined,
  );

  if (deptLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-16 w-2/3" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Department not found</h1>
        <Button asChild className="mt-6">
          <Link to="/departments">Back to all departments</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {department.name} — {CLINIC_FULL_NAME}
        </title>
        <meta name="description" content={department.description} />
      </Helmet>

      <section className="container py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/departments">
            <ArrowLeft className="mr-1 h-4 w-4" /> All Departments
          </Link>
        </Button>
      </section>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-12">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{department.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{department.description}</p>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-2xl font-bold tracking-tight">
          Doctors in {department.name}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            ({doctors.length})
          </span>
        </h2>

        {docsLoading ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No doctors listed under this department yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <Link key={d.id} to={`/doctors/${d.id}`}>
                <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        {d.first_name.charAt(0)}
                        {d.last_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <div className="font-semibold">{d.display_name}</div>
                          {d.is_verified && <BadgeCheck className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{d.speciality}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {d.qualifications.slice(0, 2).map((q) => (
                        <Badge key={q} variant="outline" className="text-xs">
                          {q}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{d.rating_avg.toFixed(1)}</span>
                      </span>
                      <span className="font-semibold text-primary">
                        {formatCurrencyINR(d.consultation_fee)}
                      </span>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {d.centers[0]?.city ?? 'Kolkata'}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
