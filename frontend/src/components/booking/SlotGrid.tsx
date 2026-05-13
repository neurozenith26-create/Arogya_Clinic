import type { MockSlot } from '../../lib/mockPhase2';
import { cn } from '../../lib/utils';

interface SlotGridProps {
  slots: MockSlot[];
  value?: string;
  onChange: (time: string) => void;
}

export function SlotGrid({ slots, value, onChange }: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No slots available for this date.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
      {slots.map((slot) => {
        const selected = slot.time === value;
        return (
          <button
            key={slot.time}
            type="button"
            disabled={!slot.available}
            onClick={() => slot.available && onChange(slot.time)}
            className={cn(
              'rounded-md border px-2 py-2 text-sm font-medium transition-colors',
              !slot.available && 'cursor-not-allowed bg-muted text-muted-foreground line-through',
              slot.available && !selected && 'border-border bg-background hover:border-primary',
              selected && 'border-primary bg-primary text-primary-foreground',
            )}
            title={
              slot.reason === 'booked'
                ? 'Booked'
                : slot.reason === 'blocked'
                  ? 'Unavailable'
                  : undefined
            }
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
