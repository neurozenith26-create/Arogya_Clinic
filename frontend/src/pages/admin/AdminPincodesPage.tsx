import { useState } from 'react';
import { Plus, Upload, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { formatCurrencyINR } from '../../lib/utils';

interface Pincode {
  pincode: string;
  city: string;
  zone: string;
  home_visit_charge: number;
  lead_time_hours: number;
  is_active: boolean;
}

const seedPincodes: Pincode[] = [
  { pincode: '700064', city: 'Kolkata', zone: 'zone_a', home_visit_charge: 150, lead_time_hours: 4, is_active: true },
  { pincode: '700091', city: 'Kolkata', zone: 'zone_a', home_visit_charge: 150, lead_time_hours: 4, is_active: true },
  { pincode: '700156', city: 'Kolkata', zone: 'zone_b', home_visit_charge: 250, lead_time_hours: 6, is_active: true },
  { pincode: '700020', city: 'Kolkata', zone: 'zone_a', home_visit_charge: 150, lead_time_hours: 4, is_active: true },
];

export default function AdminPincodesPage() {
  const [pincodes, setPincodes] = useState<Pincode[]>(seedPincodes);
  const [search, setSearch] = useState('');

  const filtered = pincodes.filter((p) =>
    !search ? true : p.pincode.includes(search) || p.city.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<Pincode>[] = [
    { key: 'pin', header: 'Pincode', render: (p) => <span className="font-mono">{p.pincode}</span> },
    { key: 'city', header: 'City', render: (p) => p.city },
    { key: 'zone', header: 'Zone', render: (p) => <Badge variant="outline">{p.zone}</Badge> },
    {
      key: 'charge',
      header: 'Home charge',
      render: (p) => formatCurrencyINR(p.home_visit_charge),
    },
    { key: 'lead', header: 'Lead time', render: (p) => `${p.lead_time_hours}h` },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.is_active ? 'success' : 'destructive'}>
          {p.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: () => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
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
          <h1 className="text-3xl font-bold tracking-tight">Serviceable Pincodes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pincodes.length} pincodes covered for home collection
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-1 h-4 w-4" /> Import CSV
          </Button>
          <Button
            onClick={() =>
              setPincodes((p) => [
                ...p,
                {
                  pincode: '700000',
                  city: 'Kolkata',
                  zone: 'zone_a',
                  home_visit_charge: 150,
                  lead_time_hours: 4,
                  is_active: true,
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add pincode
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search pincode or city..."
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
