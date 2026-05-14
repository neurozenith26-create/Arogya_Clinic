import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, CircleDot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../../lib/utils';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from '../../hooks/queries';

interface NotificationBellProps {
  /** Visual variant — admin pages have a darker hero header */
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Bell icon + popover for the notification feed. Used in both the public
 * Header (patient + visitors) and AdminLayout. Polls /notifications every
 * 30s (see useMyNotifications) and refetches when the tab regains focus.
 *
 * Click a notification → mark it as read AND navigate to its link.
 * "Mark all read" → bulk-mark.
 */
export function NotificationBell({ variant = 'light', className }: NotificationBellProps) {
  const { data: notifications = [] } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Refetch the moment the dropdown opens — guarantees the user sees
    // the very latest, no waiting for the next 15s poll tick.
    qc.invalidateQueries({ queryKey: ['notifications', 'mine'] });
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, qc]);

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          variant === 'dark'
            ? 'text-white/80 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-md border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y">
                {notifications.map((n) => {
                  const unread = n.read_at === null;
                  const item = (
                    <div
                      className={cn(
                        'flex items-start gap-2 px-3 py-3 transition-colors',
                        unread
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-accent/50',
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {unread ? (
                          <CircleDot className="h-3 w-3 text-primary" />
                        ) : (
                          <div className="h-3 w-3" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-sm', unread && 'font-semibold')}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                  const onClick = () => {
                    if (unread) markRead.mutate(n.id);
                    setOpen(false);
                  };
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link to={n.link} onClick={onClick} className="block">
                          {item}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={onClick}
                          className="block w-full text-left"
                        >
                          {item}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
