import { ExternalLink, FileText, ImageOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useProofBlobUrl } from '../../hooks/queries';

interface ProofPreviewProps {
  /** Either an API path (`/api/v1/payments/42/proof`) — which will be fetched
   *  with auth headers — or a local `blob:` / `data:` URL which is used as-is. */
  src: string | null;
  mime: string | null;
  /** large = modal-style full-bleed embed; small = thumbnail/inline */
  size?: 'small' | 'large';
  className?: string;
}

/**
 * Renders a payment-proof artefact stored as BYTEA. The proof endpoint
 * requires JWT auth which a plain `<img src>` can't supply, so this component
 * routes the request through axios (via `useProofBlobUrl`) and renders the
 * resulting blob URL. Image MIME types use `<img>`; PDFs use `<embed>` for
 * size=large and a "View PDF" link for size=small.
 */
export function ProofPreview({ src, mime, size = 'small', className = '' }: ProofPreviewProps) {
  const [errored, setErrored] = useState(false);
  const blobUrl = useProofBlobUrl(src);

  if (!src) {
    return (
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground ${className}`}
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  // Still fetching the blob — show a spinner. blobUrl becomes null again
  // every time `src` changes (effect re-runs), so we land here briefly.
  if (!blobUrl) {
    return (
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const isPdf = (mime ?? '').toLowerCase().includes('pdf');

  if (isPdf) {
    if (size === 'large') {
      return (
        <div className={`flex flex-col gap-2 ${className}`}>
          <embed
            src={blobUrl}
            type="application/pdf"
            className="h-[60vh] w-full rounded-md border bg-muted"
          />
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open PDF in new tab
          </a>
        </div>
      );
    }
    return (
      <a
        href={blobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm hover:bg-muted ${className}`}
      >
        <FileText className="h-4 w-4 text-primary" />
        <span>View PDF</span>
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </a>
    );
  }

  if (errored) {
    return (
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-md border bg-muted/30 text-xs text-muted-foreground ${className}`}
      >
        Preview unavailable
      </div>
    );
  }

  const sizing =
    size === 'large'
      ? 'max-h-[70vh] w-full object-contain'
      : 'h-24 w-24 object-cover';
  return (
    <img
      src={blobUrl}
      alt="Payment proof"
      className={`rounded-md border bg-muted ${sizing} ${className}`}
      onError={() => setErrored(true)}
    />
  );
}
