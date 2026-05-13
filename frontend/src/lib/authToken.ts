/**
 * Lightweight JWT storage helper. Persists in localStorage so the session
 * survives page reloads. Used by apiClient (request interceptor) and authStore.
 *
 * Centralising token IO here means swapping to httpOnly cookies later only
 * requires changing this one file.
 */
const TOKEN_KEY = 'arogya-jwt';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage may be unavailable in some browser modes — silently no-op */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
}
