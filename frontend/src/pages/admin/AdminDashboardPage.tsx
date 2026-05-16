import { Link } from 'react-router-dom';
import {
  Calendar,
  IndianRupee,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Minus,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAdminDashboard, type DashboardScheduleRow } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { WriteAction } from '../../components/admin/WriteAction';
import { useReadOnlyAdmin } from '../../components/admin/ReadOnlyAdminContext';

function pctChange(curr: number, prev: number): { label: string; dir: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { label: 'No change', dir: 'flat' };
  if (prev === 0) return { label: `+${curr} new today`, dir: 'up' };
  const diff = curr - prev;
  const pct = Math.round((diff / prev) * 100);
  if (pct === 0) return { label: 'Flat vs yesterday', dir: 'flat' };
  return {
    label: `${pct > 0 ? '+' : ''}${pct}% vs yesterday`,
    dir: pct > 0 ? 'up' : 'down',
  };
}

function TrendBadge({ dir, label }: { dir: 'up' | 'down' | 'flat'; label: string }) {
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const color =
    dir === 'up'
      ? 'text-green-700'
      : dir === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';
  return (
    <div className={`mt-1 inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A snapshot of today&apos;s clinic operations.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { kpis, schedule, today, branches_comparison } = data;
  const bookingsTrend = pctChange(kpis.today_bookings, kpis.yesterday_bookings);
  const revenueTrend = pctChange(kpis.today_revenue, kpis.yesterday_revenue);
  const isReadOnly = useReadOnlyAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A snapshot of clinic operations for {today}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Today&apos;s bookings
                </div>
                <div className="mt-2 text-2xl font-bold">{kpis.today_bookings}</div>
                <TrendBadge dir={bookingsTrend.dir} label={bookingsTrend.label} />
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Today&apos;s revenue
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {formatCurrencyINR(kpis.today_revenue)}
                </div>
                <TrendBadge dir={revenueTrend.dir} label={revenueTrend.label} />
              </div>
              <IndianRupee className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Pending reports</div>
                <div className="mt-2 text-2xl font-bold">{kpis.pending_reports}</div>
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-xs ${
                    kpis.pending_reports > 0 ? 'text-destructive' : 'text-green-700'
                  }`}
                >
                  {kpis.pending_reports > 0 ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {kpis.pending_reports > 0 ? 'Action needed' : 'All clear'}
                </div>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  New patients (7 days)
                </div>
                <div className="mt-2 text-2xl font-bold">{kpis.new_patients_week}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Registered this week
                </div>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {branches_comparison && branches_comparison.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Branches comparison — today</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                      Today bookings
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                      Today revenue
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                      Pending reports
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {branches_comparison.map((b) => (
                    <tr key={b.branch_id} className="border-b last:border-b-0 hover:bg-accent/30">
                      <td className="px-3 py-2">
                        <div className="font-medium">{b.branch_name}</div>
                        <div className="text-xs text-muted-foreground">{b.branch_code}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.today_bookings}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatCurrencyINR(b.today_revenue)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {b.pending_reports > 0 ? (
                          <Badge variant="destructive">{b.pending_reports}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={isReadOnly ? '' : 'grid gap-6 lg:grid-cols-2'}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today&apos;s schedule</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link to="/admin/bookings">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No bookings scheduled for today.
              </p>
            ) : (
              schedule.map((b) => <ScheduleRow key={b.id} b={b} />)
            )}
          </CardContent>
        </Card>

        <WriteAction>
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-auto justify-start py-3">
                <Link to="/admin/walk-in-bills/new">
                  <div className="text-left">
                    <div className="font-medium">Walk-in Bill</div>
                    <div className="text-xs text-muted-foreground">For in-person patients</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start py-3">
                <Link to="/admin/doctors/new">
                  <div className="text-left">
                    <div className="font-medium">Add Doctor</div>
                    <div className="text-xs text-muted-foreground">New specialist</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start py-3">
                <Link to="/admin/services">
                  <div className="text-left">
                    <div className="font-medium">Manage Tests</div>
                    <div className="text-xs text-muted-foreground">Catalog &amp; pricing</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start py-3">
                <Link to="/admin/reports">
                  <div className="text-left">
                    <div className="font-medium">Upload Reports</div>
                    <div className="text-xs text-muted-foreground">PDFs &amp; images</div>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </WriteAction>
      </div>
    </div>
  );
}

function ScheduleRow({ b }: { b: DashboardScheduleRow }) {
  const snap = b.patient_snapshot ?? {};
  const name = [snap.first_name, snap.last_name].filter(Boolean).join(' ') || '—';
  const what =
    b.booking_type === 'doctor_appointment'
      ? b.doctor_name ?? 'Doctor consultation'
      : b.items_summary ?? 'Test booking';
  return (
    <Link
      to={`/admin/bookings/${b.id}`}
      className="block rounded-md border p-3 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {b.scheduled_start_time?.slice(0, 5) ?? '—'} — {name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {what} · <span className="font-mono">{b.booking_code}</span>
          </div>
        </div>
        <Badge
          variant={
            b.booking_status === 'confirmed' || b.booking_status === 'completed'
              ? 'success'
              : b.booking_status === 'cancelled'
                ? 'destructive'
                : 'secondary'
          }
        >
          {b.booking_status.replace('_', ' ')}
        </Badge>
      </div>
    </Link>
  );
}
