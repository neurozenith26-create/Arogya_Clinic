import { Building2, Home, UserCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  origin: 'online' | 'walk_in';
  visitType: 'in_clinic' | 'home_visit';
  /** Compact pill for table rows. */
  compact?: boolean;
  className?: string;
}

/**
 * Single source of truth for how we visualise the combination of
 * `bookings.booking_origin` × `bookings.visit_type` across the app.
 *
 * The four meaningful combinations:
 *  - walk_in   + in_clinic   →  "Walk-in (clinic)"     — admin-created bill on the spot
 *  - online    + in_clinic   →  "Pre-booked clinic"    — patient self-booked, will walk in
 *  - online    + home_visit  →  "Pre-booked home"      — patient self-booked, sample collected at home
 *  - walk_in   + home_visit  →  "Admin home visit"     — rare, admin scheduling a home collection
 */
export function BookingOriginPill({ origin, visitType, compact, className }: Props) {
  const config = describe(origin, visitType);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.tone,
        className,
      )}
      title={config.tooltip}
    >
      <config.Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {compact ? config.short : config.label}
    </span>
  );
}

function describe(origin: 'online' | 'walk_in', visitType: 'in_clinic' | 'home_visit') {
  if (origin === 'walk_in' && visitType === 'in_clinic') {
    return {
      Icon: UserCheck,
      short: 'Walk-in',
      label: 'Walk-in (clinic)',
      tooltip: 'Admin-created bill for a patient who came in person.',
      tone: 'border-amber-300 bg-amber-50 text-amber-800',
    };
  }
  if (origin === 'online' && visitType === 'in_clinic') {
    return {
      Icon: Building2,
      short: 'Pre-booked clinic',
      label: 'Pre-booked clinic',
      tooltip: 'Patient self-booked online and will walk into the clinic at the scheduled time.',
      tone: 'border-blue-300 bg-blue-50 text-blue-800',
    };
  }
  if (origin === 'online' && visitType === 'home_visit') {
    return {
      Icon: Home,
      short: 'Pre-booked home',
      label: 'Pre-booked home collection',
      tooltip: 'Patient self-booked a home sample collection.',
      tone: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    };
  }
  // walk_in + home_visit — rare but valid.
  return {
    Icon: Home,
    short: 'Admin home',
    label: 'Admin-scheduled home visit',
    tooltip: 'Admin scheduled a home sample collection for the patient.',
    tone: 'border-purple-300 bg-purple-50 text-purple-800',
  };
}
