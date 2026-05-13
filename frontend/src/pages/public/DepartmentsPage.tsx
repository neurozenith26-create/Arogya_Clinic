import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Stethoscope,
  Heart,
  Activity,
  HeartPulse,
  Baby,
  Bone,
  Ear,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useDepartments } from '../../hooks/queries';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

const iconMap: Record<string, LucideIcon> = {
  Stethoscope,
  Heart,
  Activity,
  HeartPulse,
  Baby,
  Bone,
  Ear,
  Sparkles,
};

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments();

  return (
    <>
      <Helmet>
        <title>Departments — {CLINIC_FULL_NAME}</title>
        <meta name="description" content="Clinical departments and specialities at our clinic." />
      </Helmet>

      <section className="bg-gradient-to-b from-accent/40 to-background">
        <div className="container py-12 md:py-16">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Departments</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Comprehensive specialty care under one roof. Explore departments to find the right
            specialist for your needs.
          </p>
        </div>
      </section>

      <section className="container py-12">
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => {
              const Icon = iconMap[d.icon] ?? Stethoscope;
              return (
                <Link key={d.id} to={`/departments/${d.slug}`}>
                  <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                    <CardHeader>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="mt-4">{d.name}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {d.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        View doctors <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
