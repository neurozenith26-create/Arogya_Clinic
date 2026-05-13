import {
  BOOKING_STATUS_DESCRIPTIONS,
  BOOKING_STATUS_PATIENT_LABELS,
  type EditableBookingStatus,
} from '../../hooks/queries';
import { Badge } from '../ui/badge';
import { formatCurrencyINR } from '../../lib/utils';

interface BookingStatusBadgeProps {
  status: string;
  /** Show the sub-line description under the badge. */
  withDescription?: boolean;
  /**
   * Optional payment context — when present, the badge sub-line replaces the
   * generic status description with the patient's actual payment progress
   * ("Advance ₹100 paid · Balance ₹100 due at visit"). This keeps the badge
   * honest: no more "Payment pending" appearing alongside a ₹100 paid line.
   */
  paymentStatus?: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
}

const variantFor = (status: string): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'completed':
    case 'confirmed':
      return 'success';
    case 'cancelled':
    case 'no_show':
      return 'destructive';
    case 'in_progress':
      return 'verified';
    default:
      return 'secondary';
  }
};

function paymentSubLine(
  paymentStatus: string | undefined,
  total: number | undefined,
  advance: number | undefined,
  balance: number | undefined,
): string | null {
  if (paymentStatus === undefined || total === undefined) return null;
  const adv = advance ?? 0;
  const bal = balance ?? Math.max(0, total - adv);
  if (paymentStatus === 'paid' || (adv > 0 && adv >= total)) {
    return `Fully paid (${formatCurrencyINR(adv)})`;
  }
  if (paymentStatus === 'partial' || adv > 0) {
    return `Advance ${formatCurrencyINR(adv)} paid · Balance ${formatCurrencyINR(bal)} due at visit`;
  }
  if (paymentStatus === 'refunded') return 'Refunded';
  if (paymentStatus === 'failed') return 'Payment failed — please retry';
  // pending: no money received yet
  if (total <= 0) return 'No payment required';
  return `${formatCurrencyINR(total)} due — payment not yet received`;
}

export function BookingStatusBadge({
  status,
  withDescription,
  paymentStatus,
  totalAmount,
  advanceAmount,
  balanceAmount,
}: BookingStatusBadgeProps) {
  const label =
    BOOKING_STATUS_PATIENT_LABELS[status as EditableBookingStatus] ??
    status.replace('_', ' ');
  const description = BOOKING_STATUS_DESCRIPTIONS[status as EditableBookingStatus];
  const paymentLine = paymentSubLine(paymentStatus, totalAmount, advanceAmount, balanceAmount);
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={variantFor(status)}>{label}</Badge>
      {/* Payment progress is the higher-signal sub-line — show it when we
          have payment info, otherwise fall back to the generic status copy. */}
      {paymentLine ? (
        <span className="text-right text-[10px] text-muted-foreground">{paymentLine}</span>
      ) : (
        withDescription &&
        description && (
          <span className="text-right text-[10px] text-muted-foreground">{description}</span>
        )
      )}
    </div>
  );
}
