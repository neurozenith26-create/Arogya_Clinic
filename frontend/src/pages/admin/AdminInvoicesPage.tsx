import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  downloadInvoicePdf,
  useAdminInvoices,
  type AdminInvoiceRow,
} from '../../hooks/queries';
import { BookingOriginPill } from '../../components/shared/BookingOriginPill';
import { getApiErrorMessage } from '../../lib/apiClient';
import { formatCurrencyINR } from '../../lib/utils';
import { Download, FileDown } from 'lucide-react';

export default function AdminInvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'doctor_appointment' | 'test_booking'>('all');
  const [origin, setOrigin] = useState<'all' | 'online' | 'walk_in'>('all');
  const [visitType, setVisitType] = useState<'all' | 'in_clinic' | 'home_visit'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useAdminInvoices({
    type: type === 'all' ? undefined : type,
    origin: origin === 'all' ? undefined : origin,
    visit_type: visitType === 'all' ? undefined : visitType,
    from: from || undefined,
    to: to || undefined,
    q: search || undefined,
  });

  const handleDownload = async (inv: AdminInvoiceRow) => {
    setDownloadError(null);
    setDownloadingId(inv.booking_id);
    try {
      await downloadInvoicePdf(inv.booking_id, inv.booking_code);
    } catch (err) {
      setDownloadError(`${inv.invoice_number}: ${getApiErrorMessage(err)}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const total = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const paid = invoices.reduce((s, i) => s + Number(i.advance_amount), 0);
  const balance = invoices.reduce((s, i) => s + Number(i.balance_amount), 0);

  const columns: Column<AdminInvoiceRow>[] = [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (i) => (
        <div>
          <div className="font-mono text-xs font-semibold">{i.invoice_number}</div>
          <div className="text-xs text-muted-foreground">{i.booking_code}</div>
        </div>
      ),
    },
    {
      key: 'origin',
      header: 'Source',
      render: (i) => (
        <div className="space-y-1">
          <BookingOriginPill
            origin={i.booking_origin}
            visitType={i.visit_type}
            compact
          />
          <div className="text-xs text-muted-foreground">
            {i.booking_type === 'doctor_appointment' ? 'Doctor consultation' : 'Test booking'}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (i) => {
        const snap = i.patient_snapshot ?? {};
        const name = [snap.first_name, snap.last_name].filter(Boolean).join(' ') || '—';
        return (
          <div>
            <div className="font-medium">{name}</div>
            {snap.mobile && <div className="text-xs text-muted-foreground">{snap.mobile}</div>}
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (i) => (
        <div className="text-sm">{new Date(i.generated_at).toLocaleDateString('en-IN')}</div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (i) => (
        <div className="text-right">
          <div className="font-semibold">{formatCurrencyINR(Number(i.total_amount))}</div>
          <div className="text-xs text-muted-foreground">
            Paid {formatCurrencyINR(Number(i.advance_amount))}
            {Number(i.balance_amount) > 0 && (
              <span className="ml-1 text-destructive">
                · Due {formatCurrencyINR(Number(i.balance_amount))}
              </span>
            )}
          </div>
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => (
        <Badge
          variant={
            i.payment_status === 'paid'
              ? 'success'
              : i.payment_status === 'refunded'
                ? 'destructive'
                : 'secondary'
          }
        >
          {i.payment_status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (i) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(i);
            }}
            disabled={downloadingId === i.booking_id}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            {downloadingId === i.booking_id ? '…' : 'PDF'}
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All bills generated from online appointments, online test bookings, and walk-in bills.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Total invoiced</div>
            <div className="mt-1 text-2xl font-bold">{formatCurrencyINR(total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Total paid</div>
            <div className="mt-1 text-2xl font-bold text-green-700">{formatCurrencyINR(paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Total outstanding</div>
            <div className="mt-1 text-2xl font-bold text-destructive">
              {formatCurrencyINR(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Search invoice #, name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lg:col-span-2"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as never)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="doctor_appointment">Doctor appointment</option>
            <option value="test_booking">Test booking</option>
          </select>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value as never)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All sources</option>
            <option value="online">Online (pre-booked)</option>
            <option value="walk_in">Walk-in</option>
          </select>
          <select
            value={visitType}
            onChange={(e) => setVisitType(e.target.value as never)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All visit types</option>
            <option value="in_clinic">In-clinic only</option>
            <option value="home_visit">Home collection only</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              title="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              title="To date"
            />
          </div>
        </CardContent>
      </Card>

      {downloadError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          Could not download invoice: {downloadError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileDown className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No invoices yet. Walk-in bills and confirmed online bookings will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          onRowClick={(i) => navigate(`/admin/bookings/${i.booking_id}`)}
        />
      )}
    </div>
  );
}
