import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { useAdminPatients, type AdminPatientRow } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { format } from 'date-fns';

export default function AdminPatientsPage() {
  const [search, setSearch] = useState('');
  const { data: patients = [], isLoading } = useAdminPatients(
    search ? { q: search } : undefined,
  );

  const columns: Column<AdminPatientRow>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (p) => (
        <div>
          <div className="font-medium">{p.name}</div>
          <div className="text-xs text-muted-foreground">
            {p.mobile}
            {p.email && ` · ${p.email}`}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <Badge variant={p.is_registered ? 'success' : 'outline'}>
          {p.is_registered ? 'Registered' : 'Walk-in only'}
        </Badge>
      ),
    },
    {
      key: 'bookings',
      header: 'Bookings',
      render: (p) => p.bookings_count,
    },
    {
      key: 'spent',
      header: 'Total paid (advances)',
      render: (p) => formatCurrencyINR(Number(p.total_spent)),
    },
    {
      key: 'last',
      header: 'Last booking',
      render: (p) =>
        p.last_booking_at ? format(new Date(p.last_booking_at), 'd MMM yyyy') : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Loading patients…'
            : `${patients.length} unique patient(s) — registered users + walk-in snapshots, aggregated by mobile.`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={patients} />
      )}
    </div>
  );
}
