import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  CalendarCheck,
  FileText,
  Home,
  LogOut,
  Menu,
  Phone,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CLINIC_FULL_NAME,
  CLINIC_PHONE,
  CLINIC_PHONE_DIGITS,
  PHASE_2_ENABLED,
} from '../../config/featureFlags';
import { Logo } from './Logo';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/departments', label: 'Departments' },
  { to: '/contact', label: 'Contact' },
];

// Extra tabs surfaced to logged-in patients so they can jump straight to
// "what's happening with my booking" + "are my reports ready" without
// going through the user-menu dropdown.
const patientNavItems = [
  { to: '/dashboard/bookings', label: 'My Bookings', icon: CalendarCheck },
  { to: '/dashboard/reports', label: 'My Reports', icon: FileText },
];

export function Header() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const cartCount = useCartStore((s) => s.count());
  const setPreferredVisitType = useCartStore((s) => s.setPreferredVisitType);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Patient clicks "Book Home Visit" CTA → mark the cart's preference so that
  // when they reach BookTestPage (after adding tests) it starts at the
  // home-collection step instead of in-clinic. Navigates to /services with a
  // banner so they pick tests first.
  const startHomeVisitBooking = () => {
    setPreferredVisitType('home_visit');
    navigate('/services?mode=home_visit');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="hidden bg-gradient-hero text-white md:block">
        <div className="container flex h-9 items-center justify-between text-xs">
          <span className="opacity-90">Specialist consultations &amp; diagnostic services — by appointment</span>
          <a
            href={`tel:${CLINIC_PHONE_DIGITS}`}
            className="inline-flex items-center gap-1.5 font-medium hover:opacity-90"
          >
            <Phone className="h-3.5 w-3.5" />
            {CLINIC_PHONE}
          </a>
        </div>
      </div>

      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <Logo size={36} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-bold tracking-tight text-primary">
              AROGYA DIAGNOSTICS
            </span>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              & Multispeciality Clinic
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={CLINIC_FULL_NAME}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'patient' &&
            patientNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-primary hover:bg-primary/10',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}

          {PHASE_2_ENABLED && (
            <>
              <button
                type="button"
                onClick={startHomeVisitBooking}
                className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-400 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
                title="Schedule a sample collection at your home"
              >
                <Home className="h-4 w-4" />
                Book Home Visit
              </button>
              <Link
                to="/cart"
                className="relative ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <User className="h-4 w-4" />
                    {user.first_name}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 rounded-md border bg-background shadow-md">
                      <Link
                        to={user.role === 'patient' ? '/dashboard' : '/admin'}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm hover:bg-accent"
                      >
                        {user.role === 'patient' ? 'My Dashboard' : 'Admin Panel'}
                      </Link>
                      {user.role === 'patient' && (
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-3 py-2 text-sm hover:bg-accent"
                        >
                          Profile
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          navigate('/');
                        }}
                        className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth/login"
                  className="ml-2 rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-95"
                >
                  Sign in
                </Link>
              )}
            </>
          )}

          {!PHASE_2_ENABLED && (
            <a
              href={`tel:${CLINIC_PHONE_DIGITS}`}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-95"
            >
              <Phone className="h-4 w-4" />
              Book by Phone
            </a>
          )}
        </nav>

        <button
          type="button"
          className="lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t lg:hidden">
          <nav className="container flex flex-col py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user?.role === 'patient' &&
              patientNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-primary hover:bg-primary/10',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            {PHASE_2_ENABLED && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    startHomeVisitBooking();
                  }}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  <Home className="h-4 w-4" />
                  Book Home Visit
                </button>
                <Link
                  to="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  Cart {cartCount > 0 && `(${cartCount})`}
                </Link>
                {user ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    My Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
            <a
              href={`tel:${CLINIC_PHONE_DIGITS}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Phone className="h-4 w-4" />
              {CLINIC_PHONE}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
