import {
  BOOKING_STATUS_DESCRIPTIONS,
  BOOKING_STATUS_PATIENT_LABELS,
  type EditableBookingStatus,
} from '../../hooks/queries';
import { Badge } from '../ui/badge';

interface BookingStatusBadgeProps {
  status: string;
  /** Show the sub-line description under the badge. */
  withDescription?: boolean;
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

export function BookingStatusBadge({ status, withDescription }: BookingStatusBadgeProps) {
  const label =
    BOOKING_STATUS_PATIENT_LABELS[status as EditableBookingStatus] ??
    status.replace('_', ' ');
  const description = BOOKING_STATUS_DESCRIPTIONS[status as EditableBookingStatus];
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={variantFor(status)}>{label}</Badge>
      {withDescription && description && (
        <span className="text-right text-[10px] text-muted-foreground">{description}</span>
      )}
    </div>
  );
}
