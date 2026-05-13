import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import { ProofPreview } from '../../components/payment/ProofPreview';
import { ReVerifyPaymentModal } from '../../components/admin/ReVerifyPaymentModal';
import {
  resolvePaymentProofUrl,
  usePendingReVerifyPayments,
  type PendingReVerifyRow,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminPaymentVerificationsPage() {
  const { data: rows = [], isLoading } = usePendingReVerifyPayments();
  const [active, setActive] = useState<PendingReVerifyRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment re-verify queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bookings where the patient has uploaded a UPI payment proof but the clinic
            hasn't yet re-verified the transfer in person.
          </p>
        </div>
        {!isLoading && rows.length > 0 && (
          <Badge className="text-sm">{rows.length} pending</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting in-person re-verify</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed p-10 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing to re-verify right now. Patient submissions will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => {
                const patientName = [
                  row.patient_snapshot?.first_name,
                  row.patient_snapshot?.last_name,
                ]
                  .filter(Boolean)
                  .join(' ');
                const proofUrl = resolvePaymentProofUrl(
                  `/api/v1/admin/payments/${row.payment_id}/proof`,
                );
                return (
                  <li key={row.payment_id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setActive(row)}
                        className="rounded-md"
                        aria-label="Open proof for re-verification"
                      >
                        <ProofPreview
                          src={proofUrl}
                          mime={row.payment_proof_mime}
                          size="small"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/admin/bookings/${row.booking_id}`}
                            className="font-mono text-sm font-semibold text-primary hover:underline"
                          >
                            {row.booking_code}
                          </Link>
                          <Badge variant="secondary" className="text-[10px]">
                            {row.booking_type === 'doctor_appointment'
                              ? 'Doctor'
                              : 'Test'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {row.visit_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-medium">{patientName || '—'}</span>
                          {row.patient_snapshot?.mobile && (
                            <span className="ml-2 text-muted-foreground">
                              · {row.patient_snapshot.mobile}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Scheduled {row.scheduled_date ?? '—'}
                          {row.scheduled_start_time &&
                            ` at ${row.scheduled_start_time.slice(0, 5)}`}
                          {' · Submitted '}
                          {new Date(row.submitted_at).toLocaleString()}
                        </div>
                        {row.upi_reference && (
                          <div className="mt-1 text-xs">
                            UTR:{' '}
                            <code className="rounded bg-muted px-1 font-mono">
                              {row.upi_reference}
                            </code>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Advance</div>
                          <div className="text-base font-semibold">
                            {formatCurrencyINR(Number(row.amount))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/admin/bookings/${row.booking_id}`}>
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              Open booking
                            </Link>
                          </Button>
                          <Button size="sm" onClick={() => setActive(row)}>
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            Re-verify
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {active && (
        <ReVerifyPaymentModal
          isOpen
          onClose={() => setActive(null)}
          payment={{
            id: active.payment_id,
            amount: Number(active.amount),
            upi_reference: active.upi_reference,
            proof_url: `/api/v1/admin/payments/${active.payment_id}/proof`,
            payment_proof_mime: active.payment_proof_mime,
            verified_at: null,
          }}
          bookingId={active.booking_id}
          context={{
            booking_code: active.booking_code,
            patient_name: [
              active.patient_snapshot?.first_name,
              active.patient_snapshot?.last_name,
            ]
              .filter(Boolean)
              .join(' ') || null,
            patient_mobile: active.patient_snapshot?.mobile ?? null,
            scheduled_date: active.scheduled_date,
            scheduled_start_time: active.scheduled_start_time,
            booking_type: active.booking_type,
            visit_type: active.visit_type,
          }}
        />
      )}
    </div>
  );
}
