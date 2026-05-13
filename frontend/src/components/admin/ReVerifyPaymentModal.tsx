import { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ProofPreview } from '../payment/ProofPreview';
import {
  resolvePaymentProofUrl,
  useReVerifyPayment,
  type AdminPaymentRow,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';

interface ReVerifyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Pick<
    AdminPaymentRow,
    'id' | 'amount' | 'upi_reference' | 'proof_url' | 'payment_proof_mime' | 'verified_at'
  >;
  /** Used to invalidate the right booking cache after re-verify. */
  bookingId?: number | string;
  /** Free-form patient + schedule details shown alongside the proof. */
  context: {
    booking_code?: string | null;
    patient_name?: string | null;
    patient_mobile?: string | null;
    scheduled_date?: string | null;
    scheduled_start_time?: string | null;
    booking_type?: string | null;
    visit_type?: string | null;
  };
}

/**
 * Large modal admin opens when the patient arrives at the clinic / before a
 * home-collection dispatches. Shows the proof in a full-bleed view alongside
 * booking metadata so admin can manually compare against their UPI inbox,
 * then click "Re-verified" to stamp `payments.verified_at`.
 */
export function ReVerifyPaymentModal({
  isOpen,
  onClose,
  payment,
  bookingId,
  context,
}: ReVerifyPaymentModalProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reVerify = useReVerifyPayment(payment.id, bookingId);

  if (!isOpen) return null;
  const proofUrl = resolvePaymentProofUrl(payment.proof_url);
  const alreadyVerified = payment.verified_at !== null;

  const handleVerify = async () => {
    setError(null);
    try {
      await reVerify.mutateAsync(notes.trim() || undefined);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not re-verify the payment. Please try again.'));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !reVerify.isPending) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Re-verify UPI payment
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare the patient's proof against your UPI inbox. Click "Re-verified" to
              confirm the payment was received in person.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={reVerify.isPending}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Patient's proof</Label>
            <div className="mt-2">
              <ProofPreview
                src={proofUrl}
                mime={payment.payment_proof_mime}
                size="large"
              />
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Booking
              </div>
              <div className="mt-1 space-y-1">
                <div className="font-mono text-xs">{context.booking_code ?? '—'}</div>
                <div>
                  <span className="text-muted-foreground">Patient: </span>
                  <span className="font-medium">{context.patient_name ?? '—'}</span>
                </div>
                {context.patient_mobile && (
                  <div>
                    <span className="text-muted-foreground">Mobile: </span>
                    <span className="font-mono">{context.patient_mobile}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  {context.booking_type ?? '—'}
                  {context.visit_type && ` · ${context.visit_type.replace('_', ' ')}`}
                </div>
                {context.scheduled_date && (
                  <div>
                    <span className="text-muted-foreground">Scheduled: </span>
                    {context.scheduled_date}
                    {context.scheduled_start_time &&
                      ` at ${context.scheduled_start_time.slice(0, 5)}`}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Payment
              </div>
              <div className="mt-1 space-y-1">
                <div>
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-semibold">{formatCurrencyINR(payment.amount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">UTR / Ref: </span>
                  {payment.upi_reference ? (
                    <code className="rounded bg-muted px-1 font-mono text-xs">
                      {payment.upi_reference}
                    </code>
                  ) : (
                    <span className="text-muted-foreground italic">not provided</span>
                  )}
                </div>
              </div>
            </div>

            {!alreadyVerified && (
              <div>
                <Label htmlFor="reverify-notes" className="text-xs">
                  Notes (optional)
                </Label>
                <Textarea
                  id="reverify-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. UTR matched JioFinance inbox at 14:32"
                  maxLength={500}
                  rows={3}
                  className="mt-1"
                />
              </div>
            )}

            {alreadyVerified && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                Already re-verified on {new Date(payment.verified_at!).toLocaleString()}.
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 p-4">
          <Button variant="ghost" onClick={onClose} disabled={reVerify.isPending}>
            Close
          </Button>
          {!alreadyVerified && (
            <Button onClick={handleVerify} disabled={reVerify.isPending}>
              {reVerify.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-1 h-4 w-4" /> Re-verified
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
