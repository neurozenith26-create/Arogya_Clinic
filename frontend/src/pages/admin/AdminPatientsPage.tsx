import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { mockBookings } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

interface PatientRow {
  user_id: string | null;
  name: string;
  mobile: string;
  email?: string;
  bookings: number;
  total_spent: number;
  last_booking?: string;
}

export default function AdminPatientsPage() {
  const [search, setSearch] = useState('');

  // Aggregate patients from bookings
  const byMobile = new Map<string, PatientRow>();
  for (const b of mockBookings) {
    const key = b.patient_snapshot.mobile;
    const existing = byMobile.get(key);
    if (existing) {
      existing.bookings += 1;
      existing.total_spent += b.advance_amount;
      if (!existing.last_booking || b.created_at > existing.last_booking) {
        existing.last_booking = b.created_at;
      }
    } else {
      byMobile.set(key, {
        user_id: b.patient_user_id,
        name: `${b.patient_snapshot.first_name} ${b.patient_snapshot.last_name}`,
        mobile: b.patient_snapshot.mobile,
        email: b.patient_snapshot.email,
        bookings: 1,
        total_spent: b.advance_amount,
        last_booking: b.created_at,
      });
    }
  }

  const patients = Array.from(byMobile.values()).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.mobile.includes(q);
  });

  const columns: Column<PatientRow>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (p) => (
        <div>
          <div className="font-medium">{p.name}</div>
          <div className="text-xs text-muted-foreground">
            {p.mobile} {p.email ? `· ${p.email}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <Badge variant={p.user_id ? 'success' : 'outline'}>
          {p.user_id ? 'Registered' : 'Walk-in'}
        </Badge>
      ),
    },
    {
      key: 'bookings',
      header: 'Bookings',
      render: (p) => p.bookings,
    },
    {
      key: 'spent',
      header: 'Total spent',
      render: (p) => formatCurrencyINR(p.total_spent),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {patients.length} unique patients (registered + walk-in)
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
              placeholder="Search name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={patients} />
    </div>
  );
}
