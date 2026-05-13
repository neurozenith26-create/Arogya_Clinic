import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { DailySchedule, WeeklySchedule } from '../../hooks/queries';

const DAYS: Array<{ key: keyof WeeklySchedule; label: string }> = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

const DEFAULT_DAY: DailySchedule = {
  start: '09:00',
  end: '13:00',
  slot_minutes: 15,
  buffer_minutes: 0,
  lunch_start: null,
  lunch_end: null,
};

interface Props {
  value: WeeklySchedule | null | undefined;
  onChange: (next: WeeklySchedule) => void;
  /** Show the lunch break inputs (defaults to true). */
  showLunch?: boolean;
}

export function WeeklyScheduleEditor({ value, onChange, showLunch = true }: Props) {
  const schedule = value ?? {};

  const setDay = (day: keyof WeeklySchedule, day_schedule: DailySchedule | null) => {
    onChange({ ...schedule, [day]: day_schedule });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick which days the doctor sits, and the working window + slot length per day.
        Patients booking online see slots generated from this schedule live.
      </p>
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key] ?? null;
          const enabled = !!day;
          return (
            <div
              key={key}
              className="grid gap-3 rounded-md border p-3 sm:grid-cols-[160px,1fr] sm:items-center"
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    setDay(key, e.target.checked ? { ...DEFAULT_DAY } : null)
                  }
                />
                {label}
                {!enabled && <span className="text-xs text-muted-foreground">(off)</span>}
              </label>

              {enabled && day && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="time"
                      value={day.start.slice(0, 5)}
                      onChange={(e) => setDay(key, { ...day, start: e.target.value })}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Input
                      type="time"
                      value={day.end.slice(0, 5)}
                      onChange={(e) => setDay(key, { ...day, end: e.target.value })}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slot duration</Label>
                    <select
                      value={day.slot_minutes}
                      onChange={(e) =>
                        setDay(key, { ...day, slot_minutes: Number(e.target.value) })
                      }
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {SLOT_DURATIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Buffer between slots</Label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={day.buffer_minutes ?? 0}
                      onChange={(e) =>
                        setDay(key, {
                          ...day,
                          buffer_minutes: Number(e.target.value) || 0,
                        })
                      }
                      className="mt-1 h-9"
                    />
                  </div>
                  {showLunch && (
                    <>
                      <div>
                        <Label className="text-xs">Lunch start (optional)</Label>
                        <Input
                          type="time"
                          value={day.lunch_start?.slice(0, 5) ?? ''}
                          onChange={(e) =>
                            setDay(key, {
                              ...day,
                              lunch_start: e.target.value || null,
                            })
                          }
                          className="mt-1 h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Lunch end (optional)</Label>
                        <Input
                          type="time"
                          value={day.lunch_end?.slice(0, 5) ?? ''}
                          onChange={(e) =>
                            setDay(key, {
                              ...day,
                              lunch_end: e.target.value || null,
                            })
                          }
                          className="mt-1 h-9"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
