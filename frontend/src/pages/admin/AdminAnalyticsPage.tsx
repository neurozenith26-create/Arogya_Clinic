import { useMemo, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAdminAnalytics, type AnalyticsPayload } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';

const PERIOD_OPTIONS: Array<{ label: string; days: number }> = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '365 days', days: 365 },
];

// A small palette that reads cleanly on white. Tailwind colours.
const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const TYPE_LABELS: Record<string, string> = {
  doctor_appointment: 'Doctor appointments',
  test_booking: 'Test bookings',
};
const ORIGIN_LABELS: Record<string, string> = {
  online: 'Online',
  walk_in: 'Walk-in',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi_qr_offline: 'UPI (QR)',
  card_swipe: 'Card swipe',
  cheque: 'Cheque',
  upi: 'UPI (online)',
  card: 'Card (online)',
  netbanking: 'Netbanking',
  wallet: 'Wallet',
  emi: 'EMI',
  unknown: 'Unknown',
};

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useAdminAnalytics(days);

  const handleExport = () => {
    if (!data) return;
    downloadAnalyticsCsv(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, bookings, and operational metrics
            {data ? ` · ${data.range.from} → ${data.range.to}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p.days}
              variant={days === p.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <AnalyticsBody data={data} />
      )}
    </div>
  );
}

function AnalyticsBody({ data }: { data: AnalyticsPayload }) {
  const {
    kpis,
    revenue_trend,
    top_services,
    by_type,
    by_origin,
    by_status,
    by_payment_method,
    revenue_by_branch,
  } = data;
  const totalBookings = kpis.bookings_count;
  const onlinePct =
    totalBookings > 0 ? Math.round((kpis.online_count / totalBookings) * 100) : 0;
  const homeVisitPct =
    totalBookings > 0 ? Math.round((kpis.home_visits_count / totalBookings) * 100) : 0;

  // Pre-shape data for the chart components.
  const trendData = useMemo(
    () =>
      revenue_trend.map((r) => ({
        date: r.date.slice(5), // MM-DD for short axis labels
        revenue: r.revenue,
        bookings: r.bookings,
      })),
    [revenue_trend],
  );
  const typeData = by_type.map((r) => ({ name: TYPE_LABELS[r.key] ?? r.key, value: r.count }));
  const originData = by_origin.map((r) => ({
    name: ORIGIN_LABELS[r.key] ?? r.key,
    value: r.count,
  }));
  const statusData = by_status.map((r) => ({
    name: STATUS_LABELS[r.key] ?? r.key,
    value: r.count,
  }));
  const methodData = by_payment_method.map((r) => ({
    name: METHOD_LABELS[r.key] ?? r.key,
    value: r.amount,
  }));
  const topServicesData = top_services.map((r) => ({
    name: r.item_name,
    count: r.count,
    revenue: r.revenue,
  }));

  return (
    <>
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total bookings"
          value={totalBookings.toLocaleString('en-IN')}
          sub={`${kpis.new_patients_count} new patients`}
        />
        <KpiCard
          label="Total revenue"
          value={formatCurrencyINR(kpis.revenue)}
          sub="Captured payments"
        />
        <KpiCard
          label="Online vs walk-in"
          value={`${kpis.online_count}/${kpis.walk_in_count}`}
          sub={`${onlinePct}% online`}
        />
        <KpiCard
          label="Home collections"
          value={kpis.home_visits_count.toLocaleString('en-IN')}
          sub={`${homeVisitPct}% of bookings`}
        />
      </div>

      {/* Super-admin "All branches" view: branch-wise revenue bar + pie.
          Branch admin and per-branch super_admin view never get this array,
          so the section renders nothing for them. */}
      {revenue_by_branch && revenue_by_branch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by branch</CardTitle>
            <p className="text-xs text-muted-foreground">
              Captured payments per branch over the selected period. Each branch's slice
              of the pie is its share of total revenue; the bars compare raw amounts.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenue_by_branch.map((b) => ({
                      name: b.branch_name,
                      revenue: b.revenue,
                      bookings: b.bookings_count,
                    }))}
                    margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${formatCurrencyINR(Number(value))} · ${props.payload.bookings} bookings`,
                        props.payload.name,
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenue_by_branch.map((b) => ({
                        name: b.branch_name,
                        value: b.revenue,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(entry) => `${entry.name}`}
                      labelLine={false}
                      isAnimationActive
                    >
                      {revenue_by_branch.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrencyINR(Number(v ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Tabular fallback / share table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revenue_by_branch.map((b) => {
                    const totalRev = revenue_by_branch.reduce((s, r) => s + r.revenue, 0);
                    const share = totalRev > 0 ? Math.round((b.revenue / totalRev) * 100) : 0;
                    return (
                      <tr key={b.branch_id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <div className="font-medium">{b.branch_name}</div>
                          <div className="text-xs text-muted-foreground">{b.branch_code}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.bookings_count}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {formatCurrencyINR(b.revenue)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{share}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue trend (composed: bars for bookings, line for revenue) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Revenue &amp; bookings trend ({data.range.days} days)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bars = bookings created per day. Line = captured revenue per day.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'revenue'
                      ? [formatCurrencyINR(Number(value)), 'Revenue']
                      : [value, 'Bookings']
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="bookings" fill="#0ea5e9" name="bookings" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="revenue"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top services bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top services / tests</CardTitle>
            <p className="text-xs text-muted-foreground">By booking volume.</p>
          </CardHeader>
          <CardContent>
            {topServicesData.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No bookings in this period yet.
              </p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topServicesData}
                    layout="vertical"
                    margin={{ top: 5, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={140}
                      tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${value} bookings · ${formatCurrencyINR(props.payload.revenue ?? 0)}`,
                        props.payload.name,
                      ]}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking type pie */}
        <PieCard
          title="Booking type"
          subtitle="Doctor consultations vs test bookings."
          data={typeData}
          formatTooltip={(v) => `${v} bookings`}
        />

        {/* Origin pie */}
        <PieCard
          title="Booking origin"
          subtitle="Online (patient self-booked) vs walk-in (admin-created)."
          data={originData}
          formatTooltip={(v) => `${v} bookings`}
        />

        {/* Status pie */}
        <PieCard
          title="Booking status mix"
          subtitle="Where bookings are in their lifecycle."
          data={statusData}
          formatTooltip={(v) => `${v} bookings`}
        />

        {/* Payment methods pie (by amount) */}
        <PieCard
          title="Payment methods (by amount)"
          subtitle="Captured payments only. Refunded amounts subtracted."
          data={methodData}
          formatTooltip={(v) => formatCurrencyINR(v)}
        />

        {/* Status legend / breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings in this period.</p>
            ) : (
              <ul className="space-y-2">
                {by_status.map((s, i) => (
                  <li key={s.key} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {STATUS_LABELS[s.key] ?? s.key}
                    </span>
                    <span className="text-muted-foreground">
                      {s.count} ·{' '}
                      {totalBookings > 0
                        ? `${Math.round((s.count / totalBookings) * 100)}%`
                        : '0%'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> {sub}
        </div>
      </CardContent>
    </Card>
  );
}

function PieCard({
  title,
  subtitle,
  data,
  formatTooltip,
}: {
  title: string;
  subtitle: string;
  data: Array<{ name: string; value: number }>;
  formatTooltip: (v: number) => string;
}) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No data in this period yet.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name} (${entry.value})`}
                  labelLine={false}
                  isAnimationActive
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatTooltip(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function downloadAnalyticsCsv(data: AnalyticsPayload) {
  // One row per day with revenue + bookings — the most useful flat shape.
  // Distributions are appended as sections.
  const lines: string[] = [];
  lines.push(`Arogya Diagnostics — Analytics`);
  lines.push(`Range,${data.range.from},${data.range.to}`);
  lines.push(`Days,${data.range.days}`);
  lines.push('');
  lines.push('KPI,Value');
  lines.push(`Total bookings,${data.kpis.bookings_count}`);
  lines.push(`Total revenue,${data.kpis.revenue}`);
  lines.push(`Online bookings,${data.kpis.online_count}`);
  lines.push(`Walk-in bookings,${data.kpis.walk_in_count}`);
  lines.push(`Home visits,${data.kpis.home_visits_count}`);
  lines.push(`In-clinic visits,${data.kpis.in_clinic_count}`);
  lines.push(`New patients,${data.kpis.new_patients_count}`);
  lines.push('');
  lines.push('Date,Bookings,Revenue (INR)');
  data.revenue_trend.forEach((r) => {
    lines.push(`${r.date},${r.bookings},${r.revenue}`);
  });
  lines.push('');
  lines.push('Top services');
  lines.push('Service,Count,Revenue (INR)');
  data.top_services.forEach((r) => {
    lines.push(`"${r.item_name.replace(/"/g, '""')}",${r.count},${r.revenue}`);
  });
  lines.push('');
  lines.push('Booking status,Count');
  data.by_status.forEach((r) => lines.push(`${r.key},${r.count}`));
  lines.push('');
  lines.push('Payment method,Count,Amount (INR)');
  data.by_payment_method.forEach((r) => lines.push(`${r.key},${r.count},${r.amount}`));
  if (data.revenue_by_branch && data.revenue_by_branch.length > 0) {
    lines.push('');
    lines.push('Branch,Branch code,Bookings,Revenue (INR)');
    data.revenue_by_branch.forEach((r) =>
      lines.push(`"${r.branch_name.replace(/"/g, '""')}",${r.branch_code},${r.bookings_count},${r.revenue}`),
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arogya-analytics-${data.range.from}_${data.range.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
