import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  useAdminPaymentsLedger,
  type AdminPaymentLedgerRow,
  type AdminPaymentsLedgerFilters,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { format } from 'date-fns';

const sourceLabel: Record<AdminPaymentLedgerRow['payment_source'], string> = {
  razorpay: 'Razorpay',
  offline: 'Offline',
  upi_manual: 'UPI (manual)',
};

export default function AdminPaymentsPage() {
  const [filters, setFilters] = useState<AdminPaymentsLedgerFilters>({});
  const { data: payments = [], isLoading } = useAdminPaymentsLedger(filters);

  const { totalCollected, bySourceTotals } = useMemo(() => {
    let total = 0;
    const bySource: Record<string, number> = {};
    for (const p of payments) {
      // Only money that actually changed hands counts toward the totals
      // — exclude 'failed', 'created', etc.
      if (p.payment_status !== 'captured' && p.payment_status !== 'authorized') continue;
      const net = Number(p.amount) - Number(p.refunded_amount);
      total += net;
      bySource[p.payment_source] = (bySource[p.payment_source] ?? 0) + net;
    }
    return { totalCollected: total, bySourceTotals: bySource };
  }, [payments]);

  const columns: Column<AdminPaymentLedgerRow>[] = [
    {
      key: 'booking',
      header: 'Booking',
      render: (p) => (
        <Link
          to={`/admin/bookings/${p.booking_id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {p.booking_code}
        </Link>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (p) => {
        const name = [p.patient_snapshot?.first_name, p.patient_snapshot?.last_name]
          .filter(Boolean)
          .join(' ');
        return (
          <div>
            <div className="text-sm">{name || '—'}</div>
            {p.patient_snapshot?.mobile && (
              <div className="text-xs text-muted-foreground">
                {p.patient_snapshot.mobile}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'source',
      header: 'Source',
      render: (p) => (
        <Badge variant={p.payment_source === 'upi_manual' ? 'secondary' : 'outline'}>
          {sourceLabel[p.payment_source]}
        </Badge>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => (
        <span className="text-xs">{(p.payment_method ?? 'unknown').toUpperCase()}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => (
        <div className="text-right">
          <div className="font-semibold">{formatCurrencyINR(Number(p.amount))}</div>
          {Number(p.refunded_amount) > 0 && (
            <div className="text-xs text-destructive">
              −{formatCurrencyINR(Number(p.refunded_amount))} refunded
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        if (p.payment_source === 'upi_manual') {
          return p.verified_at ? (
            <Badge variant="success">re-verified</Badge>
          ) : (
            <Badge variant="secondary">awaiting re-verify</Badge>
          );
        }
        return (
          <Badge
            variant={
              p.payment_status === 'captured'
                ? 'success'
                : p.payment_status === 'refunded'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {p.payment_status}
          </Badge>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (p) => (
        <span className="text-xs">
          {format(new Date(p.created_at), 'd MMM, h:mm a')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live ledger — every row in <code>payments</code> across all sources.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Net captured (filtered)</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrencyINR(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">UPI manual (proof)</div>
            <div className="mt-1 text-2xl font-bold">
              {formatCurrencyINR(bySourceTotals.upi_manual ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Razorpay</div>
            <div className="mt-1 text-2xl font-bold">
              {formatCurrencyINR(bySourceTotals.razorpay ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Offline (cash / swipe / cheque)</div>
            <div className="mt-1 text-2xl font-bold">
              {formatCurrencyINR(bySourceTotals.offline ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_140px_140px]">
            <Input
              placeholder="Search booking code, patient, mobile…"
              value={filters.q ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filters.source ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  source: (e.target.value || undefined) as AdminPaymentsLedgerFilters['source'],
                }))
              }
            >
              <option value="">All sources</option>
              <option value="upi_manual">UPI (manual)</option>
              <option value="razorpay">Razorpay</option>
              <option value="offline">Offline</option>
            </select>
            <Input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
            />
            <Input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
            />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              No payments match the current filters.
            </p>
          ) : (
            <DataTable columns={columns} data={payments} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
