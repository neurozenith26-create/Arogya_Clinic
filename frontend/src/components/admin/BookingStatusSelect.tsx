import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  useUpdateBookingStatus,
  type EditableBookingStatus,
} from '../../hooks/queries';
import { cn } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';

interface BookingStatusSelectProps {
  bookingId: number | string;
  value: string;
  /** Compact = small pill-styled select for table rows. */
  variant?: 'compact' | 'default';
  className?: string;
}

const variantClasses: Record<EditableBookingStatus, string> = {
  pending_payment: 'border-amber-300 bg-amber-50 text-amber-800',
  confirmed: 'border-blue-300 bg-blue-50 text-blue-800',
  in_progress: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  completed: 'border-green-400 bg-green-100 text-green-900',
  cancelled: 'border-red-300 bg-red-50 text-red-800',
  no_show: 'border-gray-300 bg-gray-100 text-gray-700',
};

export function BookingStatusSelect({
  bookingId,
  value,
  variant = 'default',
  className,
}: BookingStatusSelectProps) {
  const mutation = useUpdateBookingStatus(bookingId);
  const [error, setError] = useState<string | null>(null);

  // 'draft' is a valid DB value but is not in the editable set — show it
  // read-only by allowing the current value through the labels object.
  const currentLabel =
    BOOKING_STATUS_LABELS[value as EditableBookingStatus] ?? value.replace('_', ' ');
  const tone = variantClasses[value as EditableBookingStatus] ?? 'border-input bg-background';

  const handleChange = async (next: string) => {
    if (next === value) return;
    setError(null);
    try {
      await mutation.mutateAsync(next as EditableBookingStatus);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update status'));
    }
  };

  const compactClass = cn(
    'inline-flex w-auto cursor-pointer appearance-none rounded-full border px-3 py-1 pr-7 text-xs font-semibold capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-wait disabled:opacity-60',
    tone,
  );
  const defaultClass = cn(
    'flex h-9 w-full cursor-pointer appearance-none rounded-md border bg-background px-3 pr-8 text-sm capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-wait disabled:opacity-60',
    tone,
  );

  return (
    <div className={cn('relative inline-block', className)}>
      <select
        aria-label={`Booking status (current: ${currentLabel})`}
        value={value}
        disabled={mutation.isPending}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          void handleChange(e.target.value);
        }}
        className={variant === 'compact' ? compactClass : defaultClass}
      >
        {BOOKING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {BOOKING_STATUS_LABELS[s]}
          </option>
        ))}
        {!BOOKING_STATUSES.includes(value as EditableBookingStatus) && (
          <option value={value} disabled>
            {value}
          </option>
        )}
      </select>
      <span
        className={cn(
          'pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-current',
          variant === 'compact' ? 'text-[10px]' : 'text-xs',
        )}
      >
        {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '▾'}
      </span>
      {error && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-destructive bg-destructive/10 px-2 py-1 text-[10px] text-destructive shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}
