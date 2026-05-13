import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { mockDepartments, mockDoctors, type MockDepartment } from '../../lib/mockData';
import { Badge } from '../../components/ui/badge';

export default function AdminDepartmentsPage() {
  const columns: Column<MockDepartment>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (d) => (
        <div>
          <div className="font-medium">{d.name}</div>
          <div className="font-mono text-xs text-muted-foreground">/{d.slug}</div>
        </div>
      ),
    },
    {
      key: 'desc',
      header: 'Description',
      render: (d) => <span className="text-sm text-muted-foreground">{d.description}</span>,
    },
    {
      key: 'doctors',
      header: 'Doctors',
      render: (d) => (
        <Badge variant="outline">
          {mockDoctors.filter((doc) => doc.department_id === d.id).length}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="success">Active</Badge>,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockDepartments.length} departments
          </p>
        </div>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Add Department
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All departments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={mockDepartments} />
        </CardContent>
      </Card>
    </div>
  );
}
