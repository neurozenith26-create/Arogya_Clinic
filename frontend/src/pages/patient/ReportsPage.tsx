import { useState } from 'react';
import { Calendar, Download, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { downloadReport, useMyReports } from '../../hooks/queries';
import { getApiErrorMessage } from '../../lib/apiClient';
import { format } from 'date-fns';

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useMyReports();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (reportId: number) => {
    setDownloading(reportId);
    setError(null);
    try {
      await downloadReport(reportId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not get download link'));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : reports.length === 0 ? (
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
                    <div className="text-xs text-muted-foreground">Booking {r.booking_code}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Uploaded {format(new Date(r.uploaded_at), 'd MMM yyyy, h:mm a')}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(r.id)}
                  disabled={downloading === r.id}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  {downloading === r.id ? 'Opening…' : 'Download'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
