import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { cn } from '../../lib/utils';

interface DateStripProps {
  days?: number;
  value: string;
  onChange: (date: string) => void;
}

export function DateStrip({ days = 14, value, onChange }: DateStripProps) {
  const today = new Date();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {Array.from({ length: days }, (_, i) => {
        const d = addDays(today, i);
        const iso = format(d, 'yyyy-MM-dd');
        const selected = iso === value;
        const label = isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE');
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onChange(iso)}
            className={cn(
              'flex min-w-[72px] flex-col items-center rounded-lg border-2 px-3 py-2 transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/40',
            )}
          >
            <span className="text-xs font-medium uppercase">{label}</span>
            <span className="mt-1 text-lg font-bold">{format(d, 'd')}</span>
            <span className="text-xs">{format(d, 'MMM')}</span>
          </button>
        );
      })}
    </div>
  );
}
