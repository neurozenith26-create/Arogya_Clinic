import { useState } from 'react';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { mockServices, type MockService } from '../../lib/mockData';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminServicesPage() {
  const [search, setSearch] = useState('');
  const filtered = mockServices.filter((s) =>
    !search ? true : s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<MockService>[] = [
    {
      key: 'name',
      header: 'Test / Package',
      render: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-muted-foreground">{s.short_description}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (s) => <Badge variant="outline">{s.category_name}</Badge>,
    },
    {
      key: 'sample',
      header: 'Sample',
      render: (s) => s.sample_type ?? '—',
    },
    {
      key: 'tat',
      header: 'TAT',
      render: (s) => `${s.report_turnaround_hours}h`,
    },
    {
      key: 'price',
      header: 'Price',
      render: (s) => <span className="font-semibold">{formatCurrencyINR(s.price)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (s) => (s.is_package ? <Badge>Package</Badge> : <Badge variant="outline">Test</Badge>),
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit">
            <Edit className="h-3.5 w-3.5" />
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services &amp; Tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockServices.length} services across the catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-1 h-4 w-4" /> Bulk Import
          </Button>
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Add Service
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <DataTable columns={columns} data={filtered} />
    </div>
  );
}
