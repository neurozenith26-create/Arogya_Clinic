import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WizardStepsProps {
  steps: string[];
  currentStep: number; // 1-indexed
}

export function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  return (
    <ol className="flex w-full items-center">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < currentStep;
        const active = n === currentStep;
        return (
          <li
            key={label}
            className={cn(
              'flex flex-1 items-center',
              i < steps.length - 1 && 'after:mx-2 after:h-0.5 after:flex-1 after:bg-border md:after:mx-4',
              done && i < steps.length - 1 && 'after:bg-primary',
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span
                className={cn(
                  'hidden text-sm font-medium md:block',
                  active && 'text-foreground',
                  !active && 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
