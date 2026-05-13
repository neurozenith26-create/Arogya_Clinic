import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '../components/shared/Header';
import { Footer } from '../components/shared/Footer';

export function PublicLayout() {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  // Re-trigger entry animation on route change
  useEffect(() => {
    setKey(location.pathname);
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main key={key} className="flex-1 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
