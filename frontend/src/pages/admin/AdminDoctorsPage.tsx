import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BadgeCheck, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { DoctorAvatar } from '../../components/shared/DoctorAvatar';
import {
  useAdminDoctors,
  useDeleteDoctor,
  type AdminDoctorRow,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';

export default function AdminDoctorsPage() {
  const [search, setSearch] = useState('');
  const { data: doctors = [], isLoading } = useAdminDoctors({ q: search || undefined });
  const deleteMutation = useDeleteDoctor();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const departmentCount = new Set(
    doctors.map((d) => d.department_name).filter(Boolean),
  ).size;

  const handleDelete = async (doctor: AdminDoctorRow) => {
    if (
      !window.confirm(
        `Deactivate Dr. ${doctor.first_name} ${doctor.last_name}? They will be hidden from the public site. Their historical bookings stay intact.`,
      )
    ) {
      return;
    }
    setError(null);
    setDeletingId(doctor.id);
    try {
      await deleteMutation.mutateAsync(doctor.id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete doctor'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<AdminDoctorRow>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (d) => (
        <div className="flex items-center gap-3">
          <DoctorAvatar
            firstName={d.first_name}
            lastName={d.last_name}
            profilePhotoUrl={d.profile_photo_url}
            size={36}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-medium">
              Dr. {d.first_name} {d.last_name}
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
      render: (d) =>
        d.department_name ? (
          <Badge variant="outline">{d.department_name}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (d) => formatCurrencyINR(Number(d.consultation_fee)),
    },
    {
      key: 'centers',
      header: 'Centers',
      render: (d) => `${d.centers_count} center(s)`,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (d) => `${Number(d.rating_avg).toFixed(1)} (${d.rating_count})`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) =>
        d.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Delete"
            disabled={deletingId === d.id}
            onClick={() => handleDelete(d)}
          >
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
            {isLoading
              ? 'Loading…'
              : `${doctors.length} doctor(s) across ${departmentCount} department(s)`}
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

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={doctors}
          emptyMessage="No doctors yet — click Add Doctor to create your first one."
        />
      )}
    </div>
  );
}
