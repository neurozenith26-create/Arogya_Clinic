import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Calendar,
  CalendarCheck,
  FileText,
  FlaskConical,
  Home,
  LayoutDashboard,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useCartStore } from '../stores/cartStore';
import { countUnreadByEvents, useMyNotifications } from '../hooks/queries';

// Notification event names that should light up a "NEW" badge on each tab.
// Kept here so adding a new event-type to a tab is one line.
const BOOKING_EVENTS = [
  'collector_assigned',
  'collection_status_changed',
  'reverified',
] as const;
const REPORT_EVENTS = ['report_uploaded'] as const;

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  /** Notification event names — when any are unread, a NEW badge shows on this nav item. */
  badgeEvents?: readonly string[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  {
    to: '/dashboard/bookings',
    label: 'My Bookings',
    icon: CalendarCheck,
    badgeEvents: BOOKING_EVENTS,
  },
  {
    to: '/dashboard/appointments',
    label: 'Appointments',
    icon: Calendar,
    badgeEvents: BOOKING_EVENTS,
  },
  {
    to: '/dashboard/tests',
    label: 'Tests',
    icon: FlaskConical,
    badgeEvents: BOOKING_EVENTS,
  },
  {
    to: '/dashboard/reports',
    label: 'Reports',
    icon: FileText,
    badgeEvents: REPORT_EVENTS,
  },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const setPreferredVisitType = useCartStore((s) => s.setPreferredVisitType);
  const { data: notifications } = useMyNotifications();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Same intent as the public Header CTA — mark the cart preference + bounce
  // the patient to /services with home_visit mode active.
  const startHomeVisitBooking = () => {
    setPreferredVisitType('home_visit');
    navigate('/services?mode=home_visit');
  };

  return (
    <div className="container py-6 md:py-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:mb-6 md:text-3xl">My Dashboard</h1>
      <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
        {/* Mobile: horizontal scrolling tabs; desktop: vertical sidebar */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:px-0">
          <button
            type="button"
            onClick={startHomeVisitBooking}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-gradient-to-r from-orange-500 to-orange-400 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 lg:mb-2"
            title="Schedule a sample collection at your home"
          >
            <Home className="h-4 w-4" />
            Book Home Visit
          </button>
          {navItems.map((item) => {
            const newCount = item.badgeEvents
              ? countUnreadByEvents(notifications, item.badgeEvents)
              : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gradient-brand text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {newCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground"
                    title={`${newCount} new update${newCount > 1 ? 's' : ''}`}
                  >
                    {newCount} NEW
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="min-w-0 animate-fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
