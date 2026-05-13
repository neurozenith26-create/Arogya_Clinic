import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { mockBookings, type MockBooking } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'doctor_appointment' | 'test_booking'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'online' | 'walk_in'>('all');

  const filtered = mockBookings.filter((b) => {
    if (filterType !== 'all' && b.booking_type !== filterType) return false;
    if (filterStatus !== 'all' && b.booking_status !== filterStatus) return false;
    if (filterOrigin !== 'all' && b.booking_origin !== filterOrigin) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        b.booking_code.toLowerCase().includes(q) ||
        b.patient_snapshot.first_name.toLowerCase().includes(q) ||
        b.patient_snapshot.last_name.toLowerCase().includes(q) ||
        b.patient_snapshot.mobile.includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const columns: Column<MockBooking>[] = [
    {
      key: 'code',
      header: 'Booking',
      render: (b) => (
        <div>
          <div className="font-mono text-xs">{b.booking_code}</div>
          <Badge variant="outline" className="mt-0.5 text-[10px]">
            {b.booking_origin === 'walk_in' ? 'Walk-in' : 'Online'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (b) => (
        <div>
          <div className="font-medium">
            {b.patient_snapshot.first_name} {b.patient_snapshot.last_name}
          </div>
          <div className="text-xs text-muted-foreground">{b.patient_snapshot.mobile}</div>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      render: (b) => (
        <div className="max-w-xs">
          <div className="truncate">
            {b.booking_type === 'doctor_appointment'
              ? b.doctor_name
              : b.items.map((i) => i.item_name).join(', ')}
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
          {b.scheduled_date}
          <div className="text-xs text-muted-foreground">{b.scheduled_start_time}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
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
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (b) => (
        <div className="text-right">
          <div className="font-semibold">{formatCurrencyINR(b.total_amount)}</div>
          <div className="text-xs text-muted-foreground">
            {b.payment_status === 'paid'
              ? 'Paid'
              : `${formatCurrencyINR(b.advance_amount)} paid`}
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
            {filtered.length} of {mockBookings.length} bookings shown
          </p>
        </div>
        <Button onClick={() => navigate('/admin/walk-in-bills/new')}>+ New Walk-in Bill</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <option value="online">Online only</option>
            <option value="walk_in">Walk-in only</option>
          </select>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(b) => navigate(`/admin/bookings/${b.id}`)}
      />
    </div>
  );
}
