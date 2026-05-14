import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import {
  useAdminBookings,
  useClearTabBadges,
  type AdminBookingRow,
} from '../../hooks/queries';

const BOOKINGS_BADGE_EVENTS = ['proof_submitted'] as const;
import { BookingStatusSelect } from '../../components/admin/BookingStatusSelect';
import { BookingOriginPill } from '../../components/shared/BookingOriginPill';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'doctor_appointment' | 'test_booking'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'online' | 'walk_in'>('all');
  const [filterVisit, setFilterVisit] = useState<'all' | 'in_clinic' | 'home_visit'>('all');

  // Clear the sidebar NEW badge whenever a new patient submission lands on
  // this page. Same event as Payment re-verify, since a fresh booking row is
  // also "new info on the Bookings tab".
  useClearTabBadges(BOOKINGS_BADGE_EVENTS);

  const { data: bookings = [], isLoading } = useAdminBookings({
    type: filterType === 'all' ? undefined : filterType,
    origin: filterOrigin === 'all' ? undefined : filterOrigin,
    visit_type: filterVisit === 'all' ? undefined : filterVisit,
    status: filterStatus === 'all' ? undefined : filterStatus,
    q: search || undefined,
  });

  const columns: Column<AdminBookingRow>[] = [
    {
      key: 'code',
      header: 'Booking',
      render: (b) => (
        <div>
          <div className="font-mono text-xs">{b.booking_code}</div>
          <div className="mt-1">
            <BookingOriginPill
              origin={b.booking_origin}
              visitType={b.visit_type}
              compact
            />
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (b) => {
        const snap = b.patient_snapshot ?? {};
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
      key: 'service',
      header: 'Service',
      render: (b) => (
        <div className="max-w-xs">
          <div className="truncate">
            {b.booking_type === 'doctor_appointment'
              ? b.doctor_name ?? '—'
              : b.items_summary ?? '—'}
          </div>
          <div className="text-xs text-muted-foreground">
            {b.visit_type === 'home_visit' ? 'Home Collection' : 'In-Clinic'}
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (b) => (
        <div className="text-sm">
          {b.scheduled_date ?? '—'}
          <div className="text-xs text-muted-foreground">
            {b.scheduled_start_time?.slice(0, 5) ?? ''}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <BookingStatusSelect
          bookingId={b.id}
          value={b.booking_status}
          variant="compact"
        />
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (b) => (
        <div className="text-right">
          <div className="font-semibold">{formatCurrencyINR(Number(b.total_amount))}</div>
          <div className="text-xs text-muted-foreground">
            {b.payment_status === 'paid'
              ? 'Paid'
              : `${formatCurrencyINR(Number(b.advance_amount))} paid`}
          </div>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${bookings.length} booking(s) shown`}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/walk-in-bills/new')}>+ New Walk-in Bill</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Search code, name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as never)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="doctor_appointment">Doctor appointments</option>
            <option value="test_booking">Test bookings</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending_payment">Pending payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No show</option>
          </select>
          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value as never)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All origins</option>
            <option value="online">Online (pre-booked)</option>
            <option value="walk_in">Walk-in only</option>
          </select>
          <select
            value={filterVisit}
            onChange={(e) => setFilterVisit(e.target.value as never)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All visit types</option>
            <option value="in_clinic">In-clinic only</option>
            <option value="home_visit">Home collection only</option>
          </select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={bookings}
          emptyMessage="No bookings yet — create your first walk-in bill or wait for online bookings."
          onRowClick={(b) => navigate(`/admin/bookings/${b.id}`)}
        />
      )}
    </div>
  );
}
