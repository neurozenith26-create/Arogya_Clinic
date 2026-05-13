import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Calendar, FlaskConical, FileText, User, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
  { to: '/dashboard/tests', label: 'Tests', icon: FlaskConical },
  { to: '/dashboard/reports', label: 'Reports', icon: FileText },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
];

export function DashboardLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="container py-6 md:py-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:mb-6 md:text-3xl">My Dashboard</h1>
      <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
        {/* Mobile: horizontal scrolling tabs; desktop: vertical sidebar */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:px-0">
          {navItems.map((item) => (
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
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 animate-fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
