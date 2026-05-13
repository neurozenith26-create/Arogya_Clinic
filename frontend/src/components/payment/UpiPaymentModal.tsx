import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { buildUpiPaymentLink, useClinicUpi } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { ProofPreview } from './ProofPreview';

const PROOF_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'application/pdf',
];
const PROOF_MAX_BYTES = 5 * 1024 * 1024;

interface UpiPaymentModalProps {
  amount: number;
  bookingRef: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proof: File, upiReference?: string) => Promise<void>;
  submitting?: boolean;
  /**
   * Submit button is hidden when this is true — the parent flow has already
   * navigated away (e.g. to /payment/callback) and the modal is only kept
   * mounted for a moment to avoid layout flash. Optional.
   */
  hideSubmit?: boolean;
}

/**
 * Manual-UPI payment modal. Builds a dynamic UPI deep link, renders it as a
 * QR, lets the patient upload a screenshot or PDF proof, and forwards both
 * the file + an optional UTR to the parent's submit handler.
 */
export function UpiPaymentModal({
  amount,
  bookingRef,
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
  hideSubmit = false,
}: UpiPaymentModalProps) {
  const { data: clinic, isLoading: clinicLoading } = useClinicUpi();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [upiReference, setUpiReference] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when the modal re-opens for a new booking attempt.
  useEffect(() => {
    if (!isOpen) {
      setProofFile(null);
      setProofPreviewUrl(null);
      setUpiReference('');
      setLocalError(null);
      setCopyStatus('idle');
    }
  }, [isOpen]);

  // Build object URL for image preview, cleaned up on change/unmount.
  useEffect(() => {
    if (!proofFile) {
      setProofPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  if (!isOpen) return null;

  const upiLink = clinic ? buildUpiPaymentLink(clinic, amount, bookingRef) : '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    // FileList is a live reference — copy what we need before clearing.
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    const file = files[0];
    if (!file) return;
    if (!PROOF_ALLOWED_MIME.includes(file.type)) {
      setLocalError('Please upload a JPG / PNG / WEBP image or a PDF file.');
      return;
    }
    if (file.size > PROOF_MAX_BYTES) {
      setLocalError('File too large — max 5 MB.');
      return;
    }
    setProofFile(file);
  };

  const handleCopyVpa = async () => {
    if (!clinic) return;
    try {
      await navigator.clipboard.writeText(clinic.upi_id);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      // ignore — fall back to manual selection
    }
  };

  const handleSubmit = async () => {
    if (!proofFile) {
      setLocalError('Please upload your payment screenshot or PDF before submitting.');
      return;
    }
    setLocalError(null);
    try {
      await onSubmit(proofFile, upiReference.trim() || undefined);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : 'Could not submit booking. Please try again.',
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-background shadow-xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">Pay {formatCurrencyINR(amount)} via UPI</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Scan, pay from any UPI app, then upload the confirmation screenshot or PDF.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            {clinicLoading ? (
              <Skeleton className="h-[180px] w-[180px]" />
            ) : clinic && upiLink ? (
              <>
                <div className="rounded-md border bg-white p-3">
                  <QRCode value={upiLink} size={180} level="M" />
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Pay to
                  </div>
                  <div className="text-sm font-semibold">{clinic.upi_display_name}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {clinic.upi_id}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyVpa}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copy UPI ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {copyStatus === 'copied' && (
                    <div className="mt-1 text-xs text-green-600">Copied</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-destructive">UPI is not configured yet. Please contact the clinic.</div>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Open your UPI app (GPay, PhonePe, Paytm, BHIM…).</li>
              <li>Scan the QR or pay to the UPI ID above.</li>
              <li>
                Enter exactly{' '}
                <span className="font-semibold">{formatCurrencyINR(amount)}</span> as the
                amount.
              </li>
              <li>After paying, upload the confirmation screenshot or PDF below.</li>
            </ol>

            <div>
              <Label htmlFor="upi-utr" className="text-xs">
                UPI Transaction ID / UTR (optional)
              </Label>
              <Input
                id="upi-utr"
                value={upiReference}
                onChange={(e) => setUpiReference(e.target.value)}
                placeholder="e.g. 412345678901"
                maxLength={100}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Payment proof (image or PDF, max 5 MB)</Label>
              <div className="mt-1 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  {proofFile ? 'Replace file' : 'Choose file'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {proofFile && (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{proofFile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(proofFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                )}
              </div>
              {proofPreviewUrl && proofFile && (
                <div className="mt-3">
                  <ProofPreview
                    src={proofPreviewUrl}
                    mime={proofFile.type}
                    size="small"
                  />
                </div>
              )}
            </div>

            {localError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {localError}
              </div>
            )}

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
              After upload, your booking is confirmed immediately. Our team will re-verify
              your UPI payment in person before the test / appointment.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 p-4">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {!hideSubmit && (
            <Button onClick={handleSubmit} disabled={!proofFile || submitting || !clinic}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Submit Booking
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
