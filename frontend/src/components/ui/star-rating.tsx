import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function StarRating({
  value,
  max = 5,
  onChange,
  size = 24,
  readOnly = false,
  className,
}: StarRatingProps) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={cn(
              'transition-transform',
              !readOnly && 'hover:scale-110',
              readOnly && 'cursor-default',
            )}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={cn(
                active ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted-foreground/40',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
