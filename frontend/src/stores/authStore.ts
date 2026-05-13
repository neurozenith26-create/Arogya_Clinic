import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, getApiErrorMessage } from '../lib/apiClient';
import { clearToken, setToken } from '../lib/authToken';
import { USE_MOCK_DATA } from '../lib/mockData';

export interface AuthUser {
  id: string;
  role: 'patient' | 'doctor' | 'admin' | 'super_admin';
  email: string | null;
  mobile: string | null;
  first_name: string;
  last_name: string;
}

interface ApiAuthResponse {
  token: string;
  user: { id: string; role: AuthUser['role']; email: string | null; mobile: string | null };
}

interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

interface AuthState {
  user: AuthUser | null;
  /** Email + password sign-in. Works against both mock store and live API. */
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  /** Trigger OTP send to the given mobile number. */
  sendOtp: (mobile: string) => Promise<{ ok: boolean; debugCode?: string; error?: string }>;
  /** Verify OTP + complete sign-in. */
  verifyOtp: (mobile: string, code: string, firstName?: string) => Promise<AuthResult>;
  /** Self-service signup (creates a patient account). */
  signUp: (input: {
    first_name: string;
    last_name: string;
    mobile: string;
    email?: string;
    password: string;
  }) => Promise<AuthResult>;
  /** Refresh the cached user object from /auth/me. */
  refresh: () => Promise<void>;
  /** Local-only convenience setter (used by mock mode and to hydrate from /me). */
  setUser: (user: AuthUser | null) => void;
  /** Local profile patch — does NOT round-trip to the server. */
  updateProfile: (patch: Partial<AuthUser>) => void;
  /** Sign out: clears local user + token. */
  logout: () => void;
}

/**
 * Demo credentials baked into mock mode (and into the database seed for live).
 *   admin@gmail.com   / 123  → super_admin
 *   patient@gmail.com / 123  → patient
 *
 * In mock mode (VITE_USE_MOCK_DATA=true) these match locally without any HTTP.
 * In live mode they match the rows inserted by supabase/seed/05_super_admin.sql.
 */
export const DEMO_CREDENTIALS = {
  ADMIN_EMAIL: 'admin@gmail.com',
  PATIENT_EMAIL: 'patient@gmail.com',
  PASSWORD: '123',
} as const;

function buildMockUser(email: string, role: AuthUser['role']): AuthUser {
  if (role === 'patient') {
    return {
      id: 'patient-demo',
      role,
      email,
      mobile: '9999900000',
      first_name: 'Demo',
      last_name: 'Patient',
    };
  }
  return {
    id: 'admin-demo',
    role,
    email,
    mobile: '+919831990734',
    first_name: 'Arogya',
    last_name: 'Admin',
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      setUser: (user) => set({ user }),

      logout: () => {
        clearToken();
        set({ user: null });
        // Best-effort server logout (stateless JWT — fine if it fails)
        if (!USE_MOCK_DATA) {
          api.post('/auth/logout').catch(() => {});
        }
      },

      signInWithEmail: async (email, password) => {
        const e = email.trim().toLowerCase();
        if (USE_MOCK_DATA) {
          if (password.trim() !== DEMO_CREDENTIALS.PASSWORD) {
            return { ok: false, error: 'Invalid credentials' };
          }
          if (e === DEMO_CREDENTIALS.ADMIN_EMAIL) {
            const user = buildMockUser(e, 'super_admin');
            set({ user });
            return { ok: true, user };
          }
          if (e === DEMO_CREDENTIALS.PATIENT_EMAIL) {
            const user = buildMockUser(e, 'patient');
            set({ user });
            return { ok: true, user };
          }
          return { ok: false, error: 'Use one of the demo accounts in mock mode' };
        }

        try {
          const { data } = await api.post<{ data: ApiAuthResponse }>('/auth/login', {
            email: e,
            password,
          });
          setToken(data.data.token);
          await get().refresh();
          return { ok: true, user: get().user ?? undefined };
        } catch (err) {
          return { ok: false, error: getApiErrorMessage(err, 'Sign in failed') };
        }
      },

      sendOtp: async (mobile) => {
        if (USE_MOCK_DATA) {
          const code = String(Math.floor(100000 + Math.random() * 900000));
          // Store the code on window so the LoginPage can read it back in mock mode
          (window as unknown as { __MOCK_OTP__?: Record<string, string> }).__MOCK_OTP__ = {
            ...(window as unknown as { __MOCK_OTP__?: Record<string, string> }).__MOCK_OTP__,
            [mobile]: code,
          };
          return { ok: true, debugCode: code };
        }
        try {
          const { data } = await api.post<{ data: { sent: boolean; debug_code?: string } }>(
            '/auth/otp/send',
            { mobile },
          );
          return { ok: !!data.data.sent, debugCode: data.data.debug_code };
        } catch (err) {
          return { ok: false, error: getApiErrorMessage(err, 'Could not send OTP') };
        }
      },

      verifyOtp: async (mobile, code, firstName) => {
        if (USE_MOCK_DATA) {
          const store = (window as unknown as { __MOCK_OTP__?: Record<string, string> }).__MOCK_OTP__;
          if (!store || store[mobile] !== code) {
            return { ok: false, error: 'Incorrect OTP' };
          }
          delete store[mobile];
          const user: AuthUser = {
            id: 'patient-demo',
            role: 'patient',
            email: 'demo@patient.test',
            mobile,
            first_name: firstName ?? 'Demo',
            last_name: 'Patient',
          };
          set({ user });
          return { ok: true, user };
        }
        try {
          const { data } = await api.post<{ data: ApiAuthResponse }>('/auth/otp/verify', {
            mobile,
            code,
            first_name: firstName,
          });
          setToken(data.data.token);
          await get().refresh();
          return { ok: true, user: get().user ?? undefined };
        } catch (err) {
          return { ok: false, error: getApiErrorMessage(err, 'OTP verification failed') };
        }
      },

      signUp: async (input) => {
        if (USE_MOCK_DATA) {
          const user: AuthUser = {
            id: 'patient-demo',
            role: 'patient',
            email: input.email ?? null,
            mobile: input.mobile,
            first_name: input.first_name,
            last_name: input.last_name,
          };
          set({ user });
          return { ok: true, user };
        }
        try {
          const { data } = await api.post<{ data: ApiAuthResponse }>('/auth/signup', input);
          setToken(data.data.token);
          await get().refresh();
          return { ok: true, user: get().user ?? undefined };
        } catch (err) {
          return { ok: false, error: getApiErrorMessage(err, 'Signup failed') };
        }
      },

      refresh: async () => {
        if (USE_MOCK_DATA) return;
        try {
          const { data } = await api.get<{
            data: {
              id: string;
              role: AuthUser['role'];
              email: string | null;
              mobile: string | null;
              first_name: string | null;
              last_name: string | null;
            };
          }>('/auth/me');
          set({
            user: {
              id: data.data.id,
              role: data.data.role,
              email: data.data.email,
              mobile: data.data.mobile,
              first_name: data.data.first_name ?? '',
              last_name: data.data.last_name ?? '',
            },
          });
        } catch {
          set({ user: null });
        }
      },

      updateProfile: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
    }),
    { name: 'arogya-auth' },
  ),
);
