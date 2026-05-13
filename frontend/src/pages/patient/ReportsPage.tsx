import { Download, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import { mockBookings } from '../../lib/mockPhase2';
import { format } from 'date-fns';

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const reports = mockBookings
    .filter((b) => b.patient_user_id === user?.id)
    .flatMap((b) =>
      (b.reports ?? []).map((r) => ({
        ...r,
        booking_code: b.booking_code,
        items: b.items.map((i) => i.item_name).join(', '),
      })),
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No reports uploaded yet. Once a test is completed, your reports will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{r.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.items} · Booking {r.booking_code}
                    </div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Uploaded {format(new Date(r.uploaded_at), 'd MMM yyyy, h:mm a')}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
