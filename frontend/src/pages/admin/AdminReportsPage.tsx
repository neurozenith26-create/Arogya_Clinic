import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FileImage, Upload, Search, X, Download, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  downloadReport,
  lookupBookingByCode,
  useAdminReports,
  useDeleteReport,
  useUploadReport,
  type AdminReportRow,
  type BookingLookupResult,
  type ReportTypeValue,
} from '../../hooks/queries';
import { getApiErrorMessage } from '../../lib/apiClient';

const REPORT_TYPES: Array<{ value: ReportTypeValue; label: string }> = [
  { value: 'lab_report', label: 'Lab report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'scan', label: 'Scan / Imaging' },
  { value: 'other', label: 'Other' },
];

export default function AdminReportsPage() {
  const [search, setSearch] = useState('');
  const { data: reports = [], isLoading } = useAdminReports({ q: search || undefined });

  // Lookup-then-upload flow
  const [code, setCode] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingLookupResult | null>(null);
  const [reportType, setReportType] = useState<ReportTypeValue>('lab_report');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  // Files the admin has *staged* for upload — they appear in a confirmable
  // list under the booking card. Nothing actually hits the network until the
  // admin clicks "Upload N file(s)".
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Stable blob-URL cache for image previews — same File ref ↔ same URL,
  // so re-renders don't leak. Cleaned up on remove and on unmount.
  const urlCacheRef = useRef(new Map<File, string>());

  // Revoke any object URLs we created when the component unmounts.
  useEffect(() => {
    const cache = urlCacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const previewUrlFor = (file: File): string | null => {
    if (!file.type.startsWith('image/')) return null;
    let url = urlCacheRef.current.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      urlCacheRef.current.set(file, url);
    }
    return url;
  };

  const dropFromCache = (file: File) => {
    const url = urlCacheRef.current.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      urlCacheRef.current.delete(file);
    }
  };

  // useUploadReport is keyed on a fixed bookingId. The lookup result drives
  // it; if there's no booking yet, we pass '0' just so the hook can build —
  // the upload button is disabled until a real booking is loaded.
  const uploadMutation = useUploadReport(booking?.id ?? 0);

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLookupError(null);
    setUploadError(null);
    setBooking(null);
    const trimmed = code.trim();
    if (trimmed.length < 3) {
      setLookupError('Enter the full booking code (e.g. AROGYA-TEST-202605-000007).');
      return;
    }
    setLooking(true);
    try {
      const result = await lookupBookingByCode(trimmed);
      setBooking(result);
    } catch (err) {
      setLookupError(getApiErrorMessage(err, 'Booking not found'));
    } finally {
      setLooking(false);
    }
  };

  const clearPending = () => {
    pendingFiles.forEach(dropFromCache);
    setPendingFiles([]);
  };

  const clearLookup = () => {
    setCode('');
    setBooking(null);
    setLookupError(null);
    setUploadError(null);
    clearPending();
  };

  const handlePickFile = () => fileRef.current?.click();

  // Picking files does NOT trigger an upload anymore. It just stages the
  // selection so the admin can verify the list before clicking Upload.
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    // IMPORTANT: copy the FileList to a plain array BEFORE clearing the
    // input. `e.target.files` is a live reference — setting value='' wipes
    // it, and any access after that returns 0 files.
    const newFiles = Array.from(fileList);
    e.target.value = ''; // allow re-picking the same files later

    // Any file type is allowed. Only the 25 MB size cap is enforced.
    for (const f of newFiles) {
      if (f.size > 25 * 1024 * 1024) {
        setUploadError(`"${f.name}" is over 25 MB.`);
        return;
      }
    }
    setUploadError(null);
    // Append, don't replace — picking again adds to the staged list so the
    // admin can build up a multi-file batch in steps.
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const removePending = (index: number) => {
    const file = pendingFiles[index];
    if (file) dropFromCache(file);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!booking || pendingFiles.length === 0) return;
    setUploadError(null);
    setUploadProgress({ done: 0, total: pendingFiles.length });
    // Sequential — backend computes version = MAX+1 per insert; parallel
    // uploads could collide on the same version. Sequential also gives a
    // clean N/M progress count.
    const failures: string[] = [];
    const completed: File[] = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const f = pendingFiles[i];
      try {
        await uploadMutation.mutateAsync({ file: f, report_type: reportType });
        completed.push(f);
      } catch (err) {
        failures.push(`${f.name}: ${getApiErrorMessage(err)}`);
      }
      setUploadProgress({ done: i + 1, total: pendingFiles.length });
    }
    setUploadProgress(null);
    // Drop successfully-uploaded files from the staged list; keep failures
    // so the admin can retry them after fixing whatever was wrong.
    completed.forEach(dropFromCache);
    setPendingFiles((prev) => prev.filter((f) => !completed.includes(f)));
    if (failures.length > 0) {
      setUploadError(`Some files failed:\n${failures.join('\n')}`);
      return;
    }
    // Full success — clear the form for the next booking.
    setBooking(null);
    setCode('');
  };

  const totalPendingSize = pendingFiles.reduce((sum, f) => sum + f.size, 0);
  const formatBytes = (n: number): string => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const patientName = booking?.patient_snapshot
    ? [booking.patient_snapshot.first_name, booking.patient_snapshot.last_name]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload PDFs / images against a booking. The patient sees them
          automatically on their dashboard.
        </p>
      </div>

      {/* ── Upload card ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload a report</CardTitle>
          <p className="text-xs text-muted-foreground">
            Type or paste the patient's <span className="font-mono">booking code</span> —
            the unique ID printed on every invoice / walk-in receipt (e.g.{' '}
            <span className="font-mono">AROGYA-TEST-202605-000007</span>).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-end gap-2" onSubmit={handleLookup}>
            <div className="flex-1 min-w-[240px]">
              <Label htmlFor="booking-code">Booking code</Label>
              <Input
                id="booking-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AROGYA-TEST-202605-000007"
                className="mt-1.5 font-mono"
              />
            </div>
            <Button type="submit" disabled={looking || !code.trim()}>
              <Search className="mr-1 h-4 w-4" />
              {looking ? 'Looking up…' : 'Look up'}
            </Button>
            {(booking || lookupError) && (
              <Button type="button" variant="ghost" onClick={clearLookup}>
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </form>

          {lookupError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {lookupError}
            </div>
          )}

          {booking && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {booking.booking_code}
                  </div>
                  <div className="text-base font-semibold">{patientName || '—'}</div>
                  {booking.patient_snapshot?.mobile && (
                    <div className="text-xs text-muted-foreground">
                      {booking.patient_snapshot.mobile}
                      {booking.patient_snapshot.email && ` · ${booking.patient_snapshot.email}`}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{booking.booking_type === 'doctor_appointment' ? 'Doctor appt.' : 'Test booking'}</div>
                  {booking.scheduled_date && (
                    <div>
                      {booking.scheduled_date}
                      {booking.scheduled_start_time && ` · ${booking.scheduled_start_time.slice(0, 5)}`}
                    </div>
                  )}
                </div>
              </div>
              {booking.items_summary && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Items: </span>
                  {booking.items_summary}
                </div>
              )}
              {booking.doctor_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Doctor: </span>
                  {booking.doctor_name}
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label htmlFor="report-type">Report type</Label>
                    <select
                      id="report-type"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as ReportTypeValue)}
                      className="mt-1.5 flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {REPORT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePickFile}
                    disabled={uploadMutation.isPending}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    {pendingFiles.length > 0 ? 'Add more files' : 'Choose files'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Any file type · max 25&nbsp;MB each · pick multiple at once
                  </span>
                </div>

                {/* Staged files — admin can review/remove before uploading. */}
                {pendingFiles.length > 0 && (
                  <div className="mt-3 rounded-md border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'} ready to upload
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({formatBytes(totalPendingSize)} total)
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={clearPending}
                        disabled={uploadMutation.isPending}
                      >
                        Clear all
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {pendingFiles.map((f, i) => {
                        const url = previewUrlFor(f);
                        const isImage = f.type.startsWith('image/');
                        return (
                          <li
                            key={`${f.name}-${i}-${f.lastModified}`}
                            className="flex items-center gap-3 rounded-md border p-2"
                          >
                            {url ? (
                              <img
                                src={url}
                                alt={f.name}
                                className="h-10 w-10 shrink-0 rounded border object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground">
                                {isImage ? (
                                  <FileImage className="h-5 w-5" />
                                ) : (
                                  <FileText className="h-5 w-5" />
                                )}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{f.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatBytes(f.size)}
                                {f.type && ` · ${f.type}`}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removePending(i)}
                              disabled={uploadMutation.isPending}
                              aria-label="Remove this file"
                              title="Remove from upload list"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending || pendingFiles.length === 0}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        {uploadProgress
                          ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
                          : `Upload ${pendingFiles.length} file${pendingFiles.length === 1 ? '' : 's'}`}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Files are saved as separate reports on this booking.
                      </span>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-2 whitespace-pre-line rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                    {uploadError}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Each file is saved as a separate report on this booking — the
                  patient sees all of them on their dashboard. Use this when one
                  booking covers multiple tests (CBC + Lipid + ECG, etc.).
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recently uploaded list ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Recently uploaded</CardTitle>
            <p className="text-xs text-muted-foreground">
              Across all bookings. Click a row to open the booking detail page.
            </p>
          </div>
          <Input
            placeholder="Search by code, patient name, mobile, filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reports uploaded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onDownload={() =>
                    downloadReport(r.id).catch((err) =>
                      setUploadError((err as Error).message),
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Single report row with thumbnail + preview + download + delete ──── */

function ReportRow({
  report,
  onDownload,
}: {
  report: AdminReportRow;
  onDownload: () => void;
}) {
  const deleteMutation = useDeleteReport();
  const snap = report.patient_snapshot ?? {};
  const name = [snap.first_name, snap.last_name].filter(Boolean).join(' ') || '—';
  const isImage = report.file_mime?.startsWith('image/') ?? false;
  const isPdf = report.file_mime === 'application/pdf';

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete "${report.file_name}"? The patient will no longer see it on their dashboard. (The file stays on the server for audit.)`,
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(report.id);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Could not delete report'));
    }
  };

  // file_url stored at upload time is already the publicly-accessible URL
  // for local storage (Express serves /uploads statically). For images,
  // embed as a thumbnail; for everything else, show a file icon.
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <a
        href={report.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-80"
        title="Preview"
      >
        {isImage ? (
          <img
            src={report.file_url}
            alt={report.file_name}
            className="h-12 w-12 shrink-0 rounded-md border object-cover bg-muted"
            loading="lazy"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-medium">{report.file_name}</div>
          <div className="text-xs text-muted-foreground">
            {name} · <span className="font-mono">{report.booking_code}</span>
            {snap.mobile && ` · ${snap.mobile}`}
          </div>
          <div className="text-[10px] text-muted-foreground">
            v{report.version} · {format(new Date(report.uploaded_at), 'd MMM, h:mm a')}
            {report.file_mime && ` · ${report.file_mime}`}
          </div>
        </div>
      </a>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="verified">{report.report_type.replace('_', ' ')}</Badge>
        <Link
          to={`/admin/bookings/${report.booking_id}`}
          className="text-xs text-muted-foreground underline hover:text-primary"
        >
          View booking
        </Link>
        {(isImage || isPdf) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(report.file_url, '_blank', 'noopener,noreferrer')}
            title="Preview in new tab"
          >
            <Eye className="mr-1 h-3.5 w-3.5" /> Preview
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onDownload}>
          <Download className="mr-1 h-3.5 w-3.5" /> Download
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          title="Delete (soft-delete; hides from patient)"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
