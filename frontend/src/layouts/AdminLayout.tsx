import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  FlaskConical,
  FolderTree,
  Building2,
  ScrollText,
  FileText,
  FileDown,
  CreditCard,
  Mail,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  Home,
  ReceiptText,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { Logo } from '../components/shared/Logo';

// Feedback is intentionally hidden from the sidebar. The page and route
// still exist (see App.tsx) — visit /admin/feedback directly to reach it.
// Re-add an item below if/when patient review moderation becomes part of
// the day-to-day admin workflow:
//   { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/bookings', label: 'Bookings', icon: Calendar },
      { to: '/admin/walk-in-bills', label: 'Walk-in Bills', icon: ReceiptText },
      { to: '/admin/home-collections', label: 'Home Collections', icon: Home },
      { to: '/admin/patients', label: 'Patients', icon: Users },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
      { to: '/admin/departments', label: 'Add doctor department', icon: Building2 },
      { to: '/admin/services', label: 'Services', icon: FlaskConical },
      { to: '/admin/service-categories', label: 'add test catagory for service', icon: FolderTree },
      { to: '/admin/pincodes', label: 'Pincodes', icon: MapPin },
    ],
  },
  {
    label: 'Records',
    items: [
      { to: '/admin/invoices', label: 'Invoices', icon: FileDown },
      { to: '/admin/reports', label: 'Reports', icon: FileText },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/enquiries', label: 'Enquiries', icon: Mail },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform border-r bg-card shadow-lg transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b bg-gradient-hero p-4 text-white">
            <Logo size={32} onDark />
            <div className="leading-tight">
              <div className="text-xs font-bold uppercase tracking-tight">Arogya Admin</div>
              <div className="truncate text-[10px] opacity-80">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded p-1 text-white/80 hover:bg-white/10 lg:hidden"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto p-3">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
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
              </div>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 border-t p-3 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b bg-background lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded p-2 hover:bg-accent"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-bold text-primary">Arogya Admin</span>
            </div>
            <button onClick={handleLogout} aria-label="Sign out" className="rounded p-2 hover:bg-accent">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="animate-fade-in p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
