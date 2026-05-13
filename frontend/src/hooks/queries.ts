import { useQuery, useMutation, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import {
  USE_MOCK_DATA,
  mockDepartments,
  mockDoctors,
  mockServiceCategories,
  mockServices,
  mockReviews,
  type MockDoctor,
  type MockService,
} from '../lib/mockData';

/**
 * Centralised query keys — used for cache invalidation.
 */
export const qk = {
  services: ['services'] as const,
  service: (slug: string) => ['services', slug] as const,
  serviceCategories: ['service-categories'] as const,
  doctors: (filters?: { departmentId?: string; q?: string }) => ['doctors', filters] as const,
  doctor: (id: string) => ['doctors', id] as const,
  departments: ['departments'] as const,
  department: (slug: string) => ['departments', slug] as const,
  reviews: (doctorId?: string) => ['reviews', doctorId] as const,
};

// ─── Helper: returns mock OR fetches from API ────────────────────────────────

function mockOrFetch<T>(mock: T, fetcher: () => Promise<T>): () => Promise<T> {
  return USE_MOCK_DATA
    ? () => new Promise((resolve) => setTimeout(() => resolve(mock), 200))
    : fetcher;
}

// ─── Services ────────────────────────────────────────────────────────────────

export function useServices(filters?: { categorySlug?: string; q?: string }) {
  return useQuery({
    queryKey: [...qk.services, filters],
    queryFn: mockOrFetch(
      mockServices.filter((s) => {
        if (filters?.categorySlug && s.category_slug !== filters.categorySlug) return false;
        if (filters?.q && !s.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
        return true;
      }),
      async () => {
        const params = new URLSearchParams();
        if (filters?.categorySlug) params.set('category_slug', filters.categorySlug);
        if (filters?.q) params.set('q', filters.q);
        const { data } = await api.get<{ data: MockService[] }>(`/services?${params}`);
        return data.data;
      },
    ),
  });
}

export function useService(slug: string | undefined) {
  return useQuery({
    queryKey: qk.service(slug ?? ''),
    enabled: !!slug,
    queryFn: mockOrFetch(
      mockServices.find((s) => s.slug === slug) ?? null,
      async () => {
        const { data } = await api.get<{ data: MockService }>(`/services/${slug}`);
        return data.data;
      },
    ),
  });
}

export function useServiceCategories() {
  return useQuery({
    queryKey: qk.serviceCategories,
    queryFn: mockOrFetch(mockServiceCategories, async () => {
      const { data } = await api.get<{ data: typeof mockServiceCategories }>('/service-categories');
      return data.data;
    }),
  });
}

// ─── Doctors ─────────────────────────────────────────────────────────────────

export function useDoctors(filters?: { departmentId?: string; q?: string }) {
  return useQuery({
    queryKey: qk.doctors(filters),
    queryFn: mockOrFetch(
      mockDoctors.filter((d) => {
        if (filters?.departmentId && String(d.department_id) !== filters.departmentId) return false;
        if (filters?.q) {
          const q = filters.q.toLowerCase();
          if (
            !d.display_name.toLowerCase().includes(q) &&
            !d.speciality.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
      async () => {
        const params = new URLSearchParams();
        if (filters?.departmentId) params.set('department_id', filters.departmentId);
        if (filters?.q) params.set('q', filters.q);
        const { data } = await api.get<{ data: MockDoctor[] }>(`/doctors?${params}`);
        return data.data;
      },
    ),
  });
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: qk.doctor(id ?? ''),
    enabled: !!id,
    queryFn: mockOrFetch(
      mockDoctors.find((d) => d.id === id) ?? null,
      async () => {
        const { data } = await api.get<{ data: MockDoctor }>(`/doctors/${id}`);
        return data.data;
      },
    ),
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useDepartments() {
  return useQuery({
    queryKey: qk.departments,
    queryFn: mockOrFetch(mockDepartments, async () => {
      const { data } = await api.get<{ data: typeof mockDepartments }>('/departments');
      return data.data;
    }),
  });
}

export function useDepartment(slug: string | undefined) {
  return useQuery({
    queryKey: qk.department(slug ?? ''),
    enabled: !!slug,
    queryFn: mockOrFetch(
      mockDepartments.find((d) => d.slug === slug) ?? null,
      async () => {
        const { data } = await api.get<{ data: (typeof mockDepartments)[number] }>(
          `/departments/${slug}`,
        );
        return data.data;
      },
    ),
  });
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export function useReviews(doctorId?: string) {
  return useQuery({
    queryKey: qk.reviews(doctorId),
    queryFn: mockOrFetch(
      doctorId ? mockReviews.filter((r) => r.doctor_user_id === doctorId) : mockReviews,
      async () => {
        const params = new URLSearchParams();
        if (doctorId) params.set('doctor_id', doctorId);
        const { data } = await api.get<{ data: typeof mockReviews }>(`/reviews?${params}`);
        return data.data;
      },
    ),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export interface EnquiryPayload {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
}

export function useSubmitEnquiry() {
  return useMutation({
    mutationFn: async (payload: EnquiryPayload) => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 600));
        return { id: Math.floor(Math.random() * 10000) };
      }
      const { data } = await api.post<{ data: { id: number } }>('/enquiries', payload);
      return data.data;
    },
  });
}

export interface ReviewPayload {
  doctor_id?: string;
  rating: number;
  comment: string;
  guest_name?: string;
}

export function useSubmitReview() {
  return useMutation({
    mutationFn: async (payload: ReviewPayload) => {
      if (USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 600));
        return { id: Math.floor(Math.random() * 10000), status: 'pending_moderation' as const };
      }
      const { data } = await api.post<{
        data: { id: number; status: string };
      }>('/reviews', payload);
      return data.data;
    },
  });
}

export type { UseQueryOptions };
