import { createContext, useContext, type ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';

/**
 * Are we showing the admin panel to a super admin (= read-only across every
 * branch screen)? Branch admins can still write.
 *
 * Provided once at the AdminLayout level so every nested page/component can
 * call `useReadOnlyAdmin()` and gate its create/edit/delete buttons via
 * `<WriteAction>` without prop-drilling.
 */

const ReadOnlyAdminContext = createContext<boolean>(false);

export function ReadOnlyAdminProvider({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <ReadOnlyAdminContext.Provider value={role === 'super_admin'}>
      {children}
    </ReadOnlyAdminContext.Provider>
  );
}

export function useReadOnlyAdmin(): boolean {
  return useContext(ReadOnlyAdminContext);
}
