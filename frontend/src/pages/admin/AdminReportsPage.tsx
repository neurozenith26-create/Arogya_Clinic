import { Link } from 'react-router-dom';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { mockBookings } from '../../lib/mockPhase2';
import { format } from 'date-fns';

export default function AdminReportsPage() {
  const completedTests = mockBookings.filter(
    (b) => b.booking_type === 'test_booking' && ['in_progress', 'completed'].includes(b.booking_status),
  );

  const pendingUpload = completedTests.filter((b) => (b.reports?.length ?? 0) === 0);
  const uploaded = completedTests.filter((b) => (b.reports?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage uploaded reports across all bookings
        </p>
      </div>

      {pendingUpload.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Pending uploads ({pendingUpload.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingUpload.map((b) => (
              <Link
                key={b.id}
                to={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between rounded-md border bg-background p-3 transition-colors hover:bg-accent/40"
              >
                <div>
                  <div className="font-mono text-xs">{b.booking_code}</div>
                  <div className="text-sm">
                    {b.patient_snapshot.first_name} {b.patient_snapshot.last_name} ·{' '}
                    {b.items.map((i) => i.item_name).join(', ')}
                  </div>
                </div>
                <Button size="sm">
                  <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recently uploaded</CardTitle>
        </CardHeader>
        <CardContent>
          {uploaded.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reports uploaded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {uploaded.flatMap((b) =>
                (b.reports ?? []).map((r) => (
                  <Link
                    key={r.id}
                    to={`/admin/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{r.file_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.patient_snapshot.first_name} {b.patient_snapshot.last_name} · Booking{' '}
                          {b.booking_code}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Uploaded</Badge>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(r.uploaded_at), 'd MMM, h:mm a')}
                      </div>
                    </div>
                  </Link>
                )),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
