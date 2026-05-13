import { Link } from 'react-router-dom';
import {
  Calendar,
  IndianRupee,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { mockBookings } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const todaysBookings = mockBookings.filter((b) => b.scheduled_date === today);
  const todaysRevenue = todaysBookings.reduce((sum, b) => sum + b.advance_amount, 0);
  const pendingReports = mockBookings.filter(
    (b) => b.booking_type === 'test_booking' && b.booking_status === 'completed' && (b.reports?.length ?? 0) === 0,
  ).length;
  const newPatients = mockBookings.filter((b) => b.booking_origin === 'online').length;

  const kpis = [
    {
      label: "Today's bookings",
      value: todaysBookings.length,
      icon: Calendar,
      trend: '+12% vs yesterday',
    },
    {
      label: "Today's revenue",
      value: formatCurrencyINR(todaysRevenue),
      icon: IndianRupee,
      trend: '+8% vs yesterday',
    },
    {
      label: 'Pending reports',
      value: pendingReports,
      icon: FileText,
      trend: pendingReports > 0 ? 'Action needed' : 'All clear',
      alert: pendingReports > 0,
    },
    {
      label: 'New patients (week)',
      value: newPatients,
      icon: Users,
      trend: '+5 this week',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A snapshot of today&apos;s clinic operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
                  <div className="mt-2 text-2xl font-bold">{kpi.value}</div>
                  <div
                    className={
                      kpi.alert
                        ? 'mt-1 inline-flex items-center gap-1 text-xs text-destructive'
                        : 'mt-1 inline-flex items-center gap-1 text-xs text-green-700'
                    }
                  >
                    {kpi.alert ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {kpi.trend}
                  </div>
                </div>
                <kpi.icon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today&apos;s schedule</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link to="/admin/bookings">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysBookings.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No bookings scheduled for today.
              </p>
            ) : (
              todaysBookings.slice(0, 5).map((b) => (
                <Link
                  key={b.id}
                  to={`/admin/bookings/${b.id}`}
                  className="block rounded-md border p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {b.scheduled_start_time} —{' '}
                        {b.patient_snapshot.first_name} {b.patient_snapshot.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.doctor_name ?? b.items[0]?.item_name} · {b.booking_code}
                      </div>
                    </div>
                    <Badge variant={b.booking_status === 'confirmed' ? 'success' : 'secondary'}>
                      {b.booking_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

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
                  <div className="text-xs text-muted-foreground">Catalog & pricing</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start py-3">
              <Link to="/admin/home-collections">
                <div className="text-left">
                  <div className="font-medium">Dispatch Board</div>
                  <div className="text-xs text-muted-foreground">Home collections</div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
