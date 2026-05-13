import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type AuthUser } from '../../stores/authStore';

interface RequireAuthProps {
  children: React.ReactNode;
  roles?: AuthUser['role'][];
  loginPath?: string;
}

export function RequireAuth({ children, roles, loginPath = '/auth/login' }: RequireAuthProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
