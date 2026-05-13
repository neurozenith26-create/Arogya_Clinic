import { ExternalLink, FileText, ImageOff } from 'lucide-react';
import { useState } from 'react';

interface ProofPreviewProps {
  src: string | null;
  mime: string | null;
  /** large = modal-style full-bleed embed; small = thumbnail/inline */
  size?: 'small' | 'large';
  className?: string;
}

/**
 * Renders a payment-proof artefact stored as BYTEA. Image MIME types use a
 * regular <img>, PDFs use an <embed> for large size and a "Open in new tab"
 * link for small/thumbnail size. Falls back to a generic icon when the URL
 * isn't loadable (e.g. patient hasn't uploaded yet).
 */
export function ProofPreview({ src, mime, size = 'small', className = '' }: ProofPreviewProps) {
  const [errored, setErrored] = useState(false);

  if (!src) {
    return (
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground ${className}`}
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  const isPdf = (mime ?? '').toLowerCase().includes('pdf');

  if (isPdf) {
    if (size === 'large') {
      return (
        <div className={`flex flex-col gap-2 ${className}`}>
          <embed
            src={src}
            type="application/pdf"
            className="h-[60vh] w-full rounded-md border bg-muted"
          />
          <a
            href={src}
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
        href={src}
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
      src={src}
      alt="Payment proof"
      className={`rounded-md border bg-muted ${sizing} ${className}`}
      onError={() => setErrored(true)}
    />
  );
}
