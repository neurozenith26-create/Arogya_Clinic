import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { mockBookings } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';
import { format } from 'date-fns';

interface PaymentRow {
  booking_code: string;
  patient: string;
  method: string;
  source: 'razorpay' | 'offline';
  amount: number;
  refunded: number;
  status: 'captured' | 'refunded' | 'failed';
  date: string;
}

export default function AdminPaymentsPage() {
  const payments: PaymentRow[] = mockBookings
    .filter((b) => b.advance_amount > 0)
    .map((b) => ({
      booking_code: b.booking_code,
      patient: `${b.patient_snapshot.first_name} ${b.patient_snapshot.last_name}`,
      method: b.booking_origin === 'walk_in' ? 'cash' : 'upi',
      source: b.booking_origin === 'walk_in' ? 'offline' : 'razorpay',
      amount: b.advance_amount,
      refunded: 0,
      status: 'captured' as const,
      date: b.created_at,
    }));

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const onlineTotal = payments.filter((p) => p.source === 'razorpay').reduce((s, p) => s + p.amount, 0);
  const offlineTotal = totalCollected - onlineTotal;

  const columns: Column<PaymentRow>[] = [
    { key: 'code', header: 'Booking', render: (p) => <span className="font-mono text-xs">{p.booking_code}</span> },
    { key: 'patient', header: 'Patient', render: (p) => p.patient },
    {
      key: 'source',
      header: 'Source',
      render: (p) => (
        <Badge variant={p.source === 'razorpay' ? 'default' : 'outline'}>{p.source}</Badge>
      ),
    },
    { key: 'method', header: 'Method', render: (p) => p.method.toUpperCase() },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => <span className="font-semibold">{formatCurrencyINR(p.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge variant="success">{p.status}</Badge>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (p) => format(new Date(p.date), 'd MMM, h:mm a'),
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <Button variant="outline" size="sm">
          Refund
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Razorpay + offline payment ledger
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Total collected</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrencyINR(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Razorpay (online)</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrencyINR(onlineTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Offline (cash / UPI QR)</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrencyINR(offlineTotal)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All payments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={payments} />
        </CardContent>
      </Card>
    </div>
  );
}
