import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BadgeCheck, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { mockDoctors, type MockDoctor } from '../../lib/mockData';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminDoctorsPage() {
  const [search, setSearch] = useState('');
  const filtered = mockDoctors.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.display_name.toLowerCase().includes(q) ||
      d.speciality.toLowerCase().includes(q) ||
      d.department_name.toLowerCase().includes(q)
    );
  });

  const columns: Column<MockDoctor>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (d) => (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {d.first_name.charAt(0)}
            {d.last_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1 font-medium">
              {d.display_name}
              {d.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-600" />}
            </div>
            <div className="text-xs text-muted-foreground">{d.speciality}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'dept',
      header: 'Department',
      render: (d) => <Badge variant="outline">{d.department_name}</Badge>,
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (d) => formatCurrencyINR(d.consultation_fee),
    },
    {
      key: 'centers',
      header: 'Centers',
      render: (d) => `${d.centers.length} center(s)`,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (d) => `${d.rating_avg.toFixed(1)} (${d.rating_count})`,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="success">Active</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to={`/admin/doctors/${d.id}`} aria-label="Edit">
              <Edit className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockDoctors.length} doctors across {new Set(mockDoctors.map((d) => d.department_name)).size} departments
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/doctors/new">
            <Plus className="mr-1 h-4 w-4" /> Add Doctor
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, speciality, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={filtered} />
    </div>
  );
}
