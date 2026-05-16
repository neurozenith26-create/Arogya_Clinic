import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
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
import { useSelectedBranchId, branchFilterParam } from '../stores/branchFilterStore';

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
  myReports: ['reports', 'mine'] as const,
  myBookings: ['bookings', 'mine'] as const,
  myBooking: (id: string | number) => ['bookings', 'mine', String(id)] as const,
  adminBookings: (filters?: AdminBookingFilters) => ['admin', 'bookings', filters] as const,
  adminBooking: (id: string | number) => ['admin', 'bookings', String(id)] as const,
};

export const BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type EditableBookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<EditableBookingStatus, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

/**
 * Sub-text shown to admins (and patients) explaining what each status means in
 * the day-to-day flow of a clinic visit. Kept short — these are one-liners.
 */
export const BOOKING_STATUS_DESCRIPTIONS: Record<EditableBookingStatus, string> = {
  pending_payment: 'Payment is pending. Booking is held but not yet confirmed.',
  confirmed: 'Payment re-verified in person and slot is locked. Patient is expected.',
  in_progress:
    'Patient uploaded UPI proof — slot is reserved, but admin has not yet re-verified the payment in person. Flips to Confirmed automatically after Re-verify proof.',
  completed: 'Service delivered and reports/invoice are ready.',
  cancelled: 'Booking was cancelled and the slot is released.',
  no_show: 'Patient did not arrive within the scheduled window.',
};

/**
 * Patient-facing wording — slightly softer than admin labels.
 */
export const BOOKING_STATUS_PATIENT_LABELS: Record<EditableBookingStatus, string> = {
  pending_payment: 'Payment pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Missed appointment',
};

export interface AdminBookingFilters {
  type?: 'doctor_appointment' | 'test_booking';
  origin?: 'online' | 'walk_in';
  visit_type?: 'in_clinic' | 'home_visit';
  status?: string;
  q?: string;
}

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

// ─── Admin: bookings + walk-ins + payments + reports (always live API) ──────

export interface AdminBookingRow {
  id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  booking_status: string;
  payment_status: string;
  collection_status: string;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
  } | null;
  doctor_user_id: string | null;
  doctor_name: string | null;
  items_summary: string | null;
}

export interface AdminPaymentRow {
  id: number;
  payment_source: 'razorpay' | 'offline' | 'upi_manual';
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: string;
  payment_type: string;
  captured_at: string | null;
  refunded_amount: number;
  notes: string | null;
  created_at: string;
  // Manual-UPI specifics (NULL on razorpay / offline rows):
  upi_reference: string | null;
  verified_at: string | null;
  verified_by_user_id: string | null;
  verification_notes: string | null;
  payment_proof_mime: string | null;
  proof_url: string | null;
  verified_by_name: string | null;
}

export interface AdminBookingDetail extends AdminBookingRow {
  doctor_speciality: string | null;
  doctor_center: string | null;
  delivery_address: Record<string, string | null> | null;
  reason_for_visit: string | null;
  special_instructions: string | null;
  admin_notes: string | null;
  items: Array<{
    id: number;
    item_type: string;
    service_id: number | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  payments: Array<AdminPaymentRow>;
  reports: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_mime: string | null;
    report_type: string;
    version: number;
    uploaded_at: string;
  }>;
}

export function useAdminBookings(filters?: AdminBookingFilters) {
  const selectedBranch = useSelectedBranchId();
  const branchId = branchFilterParam(selectedBranch);
  return useQuery({
    // Cache per-branch so switching the dropdown doesn't show stale rows
    queryKey: [...qk.adminBookings(filters), 'branch', branchId ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.origin) params.set('origin', filters.origin);
      if (filters?.visit_type) params.set('visit_type', filters.visit_type);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.q) params.set('q', filters.q);
      if (branchId !== undefined) params.set('branch_id', String(branchId));
      const { data } = await api.get<{ data: AdminBookingRow[] }>(
        `/admin/bookings${params.toString() ? `?${params}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useAdminBooking(id: string | number | undefined) {
  return useQuery({
    queryKey: qk.adminBooking(id ?? ''),
    enabled: id !== undefined && id !== '',
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminBookingDetail }>(`/admin/bookings/${id}`);
      return data.data;
    },
  });
}

export interface WalkInBillPayload {
  patient: {
    first_name: string;
    last_name?: string;
    mobile: string;
    age?: number;
    gender?: 'M' | 'F' | 'O';
    email?: string;
  };
  items: Array<
    | { service_id: number; quantity: number }
    | { item_name: string; unit_price: number; quantity: number; item_type: 'custom' }
  >;
  payment?: {
    method: 'cash' | 'upi_qr_offline' | 'card_swipe' | 'cheque';
    amount: number;
    notes?: string;
  };
  patient_user_id?: string;
}

export function useCreateWalkInBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WalkInBillPayload) => {
      const { data } = await api.post<{ data: { id: number; booking_code: string } }>(
        '/admin/walk-in-bills',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
}

export interface RecordPaymentPayload {
  method: 'cash' | 'upi_qr_offline' | 'card_swipe' | 'cheque';
  amount: number;
  notes?: string;
  payment_type?: 'advance' | 'balance' | 'full';
}

// ─── Admin: serviceable pincodes (live, never mocked) ───────────────────

export interface AdminPincodeRow {
  id: number;
  pincode: string;
  city: string | null;
  state: string | null;
  zone: string | null;
  home_visit_charge: string;
  collection_lead_time_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PincodeInput {
  pincode: string;
  city?: string | null;
  state?: string | null;
  zone?: string | null;
  home_visit_charge: number;
  collection_lead_time_hours: number;
  is_active?: boolean;
}

export function useAdminPincodes() {
  const selectedBranch = useSelectedBranchId();
  const branchId = branchFilterParam(selectedBranch);
  return useQuery({
    queryKey: ['admin', 'pincodes', branchId ?? 'all'],
    queryFn: async () => {
      const qs = branchId !== undefined ? `?branch_id=${branchId}` : '';
      const { data } = await api.get<{ data: AdminPincodeRow[] }>(
        `/admin/serviceable-pincodes${qs}`,
      );
      return data.data;
    },
  });
}

export function useCreatePincode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PincodeInput) => {
      const { data } = await api.post<{ data: { id: number } }>(
        '/admin/serviceable-pincodes',
        input,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pincodes'] }),
  });
}

export function useUpdatePincode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: PincodeInput & { id: number }) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/serviceable-pincodes/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pincodes'] }),
  });
}

export function useDeletePincode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/serviceable-pincodes/${id}`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pincodes'] }),
  });
}

// ─── Admin: dashboard + analytics (live aggregations) ────────────────────

export interface DashboardScheduleRow {
  id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_start_time: string | null;
  booking_status: string;
  payment_status: string;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
  } | null;
  doctor_name: string | null;
  items_summary: string | null;
}

export interface DashboardBranchComparisonRow {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  today_bookings: number;
  today_revenue: number;
  pending_reports: number;
}

export interface DashboardPayload {
  today: string;
  kpis: {
    today_bookings: number;
    today_revenue: number;
    yesterday_bookings: number;
    yesterday_revenue: number;
    pending_reports: number;
    new_patients_week: number;
  };
  schedule: DashboardScheduleRow[];
  /**
   * Only populated for super_admin's "All branches" view. Each row is one
   * active branch with today's KPIs. Used for the comparison widget.
   */
  branches_comparison?: DashboardBranchComparisonRow[];
}

export function useAdminDashboard() {
  const selectedBranch = useSelectedBranchId();
  const branchId = branchFilterParam(selectedBranch);
  return useQuery({
    queryKey: ['admin', 'dashboard', branchId ?? 'all'],
    queryFn: async () => {
      const qs = branchId !== undefined ? `?branch_id=${branchId}` : '';
      const { data } = await api.get<{ data: DashboardPayload }>(`/admin/dashboard${qs}`);
      return data.data;
    },
    refetchInterval: 60_000, // keep the dashboard reasonably fresh
  });
}

export interface AnalyticsRevenueByBranchRow {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  bookings_count: number;
  revenue: number;
}

export interface AnalyticsPayload {
  range: { from: string; to: string; days: number };
  kpis: {
    bookings_count: number;
    revenue: number;
    online_count: number;
    walk_in_count: number;
    home_visits_count: number;
    in_clinic_count: number;
    new_patients_count: number;
  };
  revenue_trend: Array<{ date: string; revenue: number; bookings: number }>;
  top_services: Array<{ item_name: string; count: number; revenue: number }>;
  by_type: Array<{ key: string; count: number; revenue: number }>;
  by_origin: Array<{ key: string; count: number; revenue: number }>;
  by_status: Array<{ key: string; count: number }>;
  by_payment_method: Array<{ key: string; count: number; amount: number }>;
  /** Super-admin "All branches" view: per-branch revenue rollup. Empty otherwise. */
  revenue_by_branch: AnalyticsRevenueByBranchRow[];
}

export function useAdminAnalytics(days: number) {
  const selectedBranch = useSelectedBranchId();
  const branchId = branchFilterParam(selectedBranch);
  return useQuery({
    queryKey: ['admin', 'analytics', days, branchId ?? 'all'],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (branchId !== undefined) params.set('branch_id', String(branchId));
      const { data } = await api.get<{ data: AnalyticsPayload }>(
        `/admin/analytics?${params}`,
      );
      return data.data;
    },
  });
}

// ─── Admin: service categories (live, never mocked) ─────────────────────

export interface AdminServiceCategoryRow {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
  banner_url: string | null;
  display_order: number;
  is_active: boolean;
  services_count: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategoryInput {
  name: string;
  slug?: string;
  icon_url?: string | null;
  banner_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export function useAdminServiceCategories() {
  return useQuery({
    queryKey: ['admin', 'service-categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminServiceCategoryRow[] }>(
        '/admin/service-categories',
      );
      return data.data;
    },
  });
}

/**
 * Invalidate BOTH the admin list AND the public `qk.serviceCategories` so the
 * Services form dropdown picks up new categories without a page reload.
 */
function invalidateCategoryCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin', 'service-categories'] });
  qc.invalidateQueries({ queryKey: qk.serviceCategories });
  // The admin services list also embeds category_name — refresh it too.
  qc.invalidateQueries({ queryKey: ['admin', 'services'] });
}

export function useCreateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ServiceCategoryInput) => {
      const { data } = await api.post<{ data: { id: number; slug: string } }>(
        '/admin/service-categories',
        input,
      );
      return data.data;
    },
    onSuccess: () => invalidateCategoryCaches(qc),
  });
}

export function useUpdateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ServiceCategoryInput & { id: number }) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/service-categories/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => invalidateCategoryCaches(qc),
  });
}

export function useDeleteServiceCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/service-categories/${id}`,
      );
      return data.data;
    },
    onSuccess: () => invalidateCategoryCaches(qc),
  });
}

// ─── Admin: services (live, never mocked) ────────────────────────────────

export interface AdminServiceRow {
  id: number;
  name: string;
  slug: string;
  test_key: string | null;
  category_id: number;
  category_name: string;
  category_slug: string;
  price: string;
  short_description: string | null;
  sample_type: string | null;
  report_turnaround_hours: number | null;
  image_url: string | null;
  is_package: boolean;
  package_discount_percent: string | null;
  is_active: boolean;
}

export interface AdminServiceDetail extends AdminServiceRow {
  full_details: string | null;
  prep_instructions: string | null;
  package_service_ids: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceInput {
  name: string;
  slug?: string;
  test_key?: string | null;
  category_id: number;
  price: number;
  short_description?: string | null;
  full_details?: string | null;
  prep_instructions?: string | null;
  sample_type?: string | null;
  report_turnaround_hours?: number | null;
  image_url?: string | null;
  is_package?: boolean;
  package_service_ids?: number[] | null;
  package_discount_percent?: number | null;
  is_active?: boolean;
}

export function useAdminServices(filters?: {
  q?: string;
  category_id?: number;
  is_active?: 'true' | 'false';
  is_package?: 'true' | 'false';
}) {
  return useQuery({
    queryKey: ['admin', 'services', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.set('q', filters.q);
      if (filters?.category_id) params.set('category_id', String(filters.category_id));
      if (filters?.is_active) params.set('is_active', filters.is_active);
      if (filters?.is_package) params.set('is_package', filters.is_package);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminServiceRow[] }>(
        `/admin/services${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ServiceInput) => {
      const { data } = await api.post<{ data: { id: number; slug: string } }>(
        '/admin/services',
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ServiceInput & { id: number }) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/services/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/services/${id}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// ─── Admin: departments (live, never mocked) ─────────────────────────────

export interface AdminDepartmentRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  display_order: number;
  is_active: boolean;
  doctors_count: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentInput {
  name: string;
  slug?: string;
  description?: string | null;
  icon_url?: string | null;
  banner_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export function useAdminDepartments() {
  return useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminDepartmentRow[] }>('/admin/departments');
      return data.data;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DepartmentInput) => {
      const { data } = await api.post<{ data: { id: number; slug: string } }>(
        '/admin/departments',
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: DepartmentInput & { id: number }) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/departments/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/departments/${id}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

// ─── Admin: doctors (live, never mocked) ─────────────────────────────────

export interface AdminDoctorRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  speciality: string;
  qualifications: string[];
  consultation_fee: string;
  profile_photo_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  offers_home_visit: boolean;
  rating_avg: string;
  rating_count: number;
  department_id: number | null;
  department_name: string | null;
  department_slug: string | null;
  centers_count: number;
  /** ISO timestamp; used as cache-bust for the photo URL so a fresh upload renders. */
  updated_at: string;
}

export interface DoctorCenterRow {
  id: number;
  doctor_user_id: string;
  center_name: string;
  address: string;
  phone: string | null;
  map_link: string | null;
  city: string | null;
  pincode: string | null;
  consultation_fee_override: string | null;
  schedule: WeeklySchedule | null;
  home_visit_schedule: WeeklySchedule | null;
  is_active: boolean;
}

export interface AdminDoctorDetail extends Omit<AdminDoctorRow, 'centers_count'> {
  about: string | null;
  education_training: string | null;
  centers: DoctorCenterRow[];
}

export interface DailySchedule {
  start: string;
  end: string;
  slot_minutes: number;
  buffer_minutes?: number;
  lunch_start?: string | null;
  lunch_end?: string | null;
  max_bookings?: number;
}
export type WeeklySchedule = Partial<{
  sun: DailySchedule | null;
  mon: DailySchedule | null;
  tue: DailySchedule | null;
  wed: DailySchedule | null;
  thu: DailySchedule | null;
  fri: DailySchedule | null;
  sat: DailySchedule | null;
}>;

export interface DoctorCenterInput {
  center_name: string;
  address: string;
  phone?: string | null;
  map_link?: string | null;
  city?: string | null;
  pincode?: string | null;
  consultation_fee_override?: number | null;
  schedule?: WeeklySchedule | null;
  home_visit_schedule?: WeeklySchedule | null;
  is_active?: boolean;
}

export interface DoctorCreateInput {
  first_name: string;
  last_name: string;
  email?: string | null;
  mobile?: string | null;
  speciality: string;
  department_id?: number | null;
  qualifications: string[];
  consultation_fee: number;
  about?: string | null;
  education_training?: string | null;
  is_verified?: boolean;
  offers_home_visit?: boolean;
  is_active?: boolean;
  centers?: DoctorCenterInput[];
}

export type DoctorUpdateInput = Partial<Omit<DoctorCreateInput, 'centers'>>;

export function useAdminDoctors(filters?: { q?: string; department_id?: number; is_active?: 'true' | 'false' }) {
  return useQuery({
    queryKey: ['admin', 'doctors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.set('q', filters.q);
      if (filters?.department_id) params.set('department_id', String(filters.department_id));
      if (filters?.is_active) params.set('is_active', filters.is_active);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminDoctorRow[] }>(
        `/admin/doctors${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useAdminDoctor(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'doctors', String(id)],
    enabled: !!id && id !== 'new',
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminDoctorDetail }>(`/admin/doctors/${id}`);
      return data.data;
    },
  });
}

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DoctorCreateInput) => {
      const { data } = await api.post<{ data: { id: string } }>('/admin/doctors', input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

export function useUpdateDoctor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DoctorUpdateInput) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/doctors/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'doctors', id] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
      qc.invalidateQueries({ queryKey: ['doctors', id] });
    },
  });
}

export function useDeleteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(`/admin/doctors/${id}`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
}

export function useUploadDoctorPhoto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ data: { url: string } }>(
        `/admin/doctors/${id}/photo`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'doctors', id] });
      qc.invalidateQueries({ queryKey: ['doctors'] });
      qc.invalidateQueries({ queryKey: ['doctors', id] });
    },
  });
}

export function useUpsertCenter(doctorId: string, centerId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DoctorCenterInput) => {
      if (centerId) {
        const { data } = await api.patch<{ data: { updated: boolean } }>(
          `/admin/centers/${centerId}`,
          input,
        );
        return data.data;
      }
      const { data } = await api.post<{ data: { id: number } }>(
        `/admin/doctors/${doctorId}/centers`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors', doctorId] });
      qc.invalidateQueries({ queryKey: ['doctors', doctorId] });
    },
  });
}

export function useDeleteCenter(doctorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (centerId: number) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/centers/${centerId}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'doctors', doctorId] });
      qc.invalidateQueries({ queryKey: ['doctors', doctorId] });
    },
  });
}

/**
 * Turn a doctor's `profile_photo_url` (relative API path like `/doctors/<id>/photo`)
 * into a fully-qualified browser-loadable URL. Returns null if no photo is set.
 */
export function resolveDoctorPhotoUrl(
  profile_photo_url: string | null | undefined,
  cacheBust?: string | number,
): string | null {
  if (!profile_photo_url) return null;
  const base = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
  const suffix = cacheBust ? `?v=${encodeURIComponent(String(cacheBust))}` : '';
  // Already an absolute URL? Use it as-is (legacy storage-driver URLs).
  if (/^https?:\/\//.test(profile_photo_url)) return profile_photo_url + suffix;
  // Relative API path — join with the API base.
  return `${base}${profile_photo_url.startsWith('/') ? '' : '/'}${profile_photo_url}${suffix}`;
}

export function useUpdateBookingStatus(bookingId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: EditableBookingStatus) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/bookings/${bookingId}/status`,
        { status },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: qk.adminBooking(bookingId) });
      // Patient queries get invalidated too so dashboards reflect the change
      // on next refetch (e.g. when the patient revisits the page).
      qc.invalidateQueries({ queryKey: qk.myBookings });
      qc.invalidateQueries({ queryKey: qk.myBooking(bookingId) });
    },
  });
}

export interface MyBookingRow {
  id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  total_amount: string;
  advance_amount: string;
  balance_amount: string;
  booking_status: EditableBookingStatus | 'draft';
  payment_status: string;
  collection_status: string;
  doctor_user_id: string | null;
  doctor_name: string | null;
  doctor_speciality: string | null;
  doctor_center: string | null;
  items_summary: string | null;
  reports_count: number;
  created_at: string;
}

export interface MyBookingDetail extends MyBookingRow {
  subtotal_amount: string;
  home_visit_charge: string;
  tax_amount: string;
  discount_amount: string;
  reason_for_visit: string | null;
  special_instructions: string | null;
  delivery_address: Record<string, string | null> | null;
  patient_snapshot: Record<string, unknown> | null;
  items: Array<{
    id: number;
    item_type: string;
    service_id: number | null;
    item_name: string;
    quantity: number;
    unit_price: string;
    total_price: string;
  }>;
  reports: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_mime: string | null;
    report_type: string;
    version: number;
    uploaded_at: string;
  }>;
  payments: Array<{
    id: number;
    payment_source: 'razorpay' | 'offline' | 'upi_manual';
    amount: number;
    payment_status: string;
    payment_type: string;
    payment_method: string | null;
    captured_at: string | null;
    upi_reference: string | null;
    verified_at: string | null;
    payment_proof_mime: string | null;
    proof_url: string | null;
  }>;
  assigned_collector: {
    id: string;
    name: string;
    mobile: string | null;
    age: number | null;
    photo_url: string | null;
  } | null;
}

export function useMyBookings() {
  return useQuery({
    queryKey: qk.myBookings,
    queryFn: async () => {
      const { data } = await api.get<{ data: MyBookingRow[] }>('/bookings');
      return data.data;
    },
  });
}

export function useMyBooking(id: string | number | undefined) {
  return useQuery({
    queryKey: qk.myBooking(id ?? ''),
    enabled: id !== undefined && id !== '',
    queryFn: async () => {
      const { data } = await api.get<{ data: MyBookingDetail }>(`/bookings/${id}`);
      return data.data;
    },
  });
}

export function useRecordPayment(bookingId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload) => {
      const { data } = await api.post<{
        data: { paid: number; balance: number; payment_status: string };
      }>(`/admin/bookings/${bookingId}/payments`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: qk.adminBooking(bookingId) });
    },
  });
}

export type ReportTypeValue = 'lab_report' | 'prescription' | 'scan' | 'other';

export function useUploadReport(bookingId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: File | { file: File; report_type?: ReportTypeValue }) => {
      const file = input instanceof File ? input : input.file;
      const report_type =
        input instanceof File ? 'lab_report' : input.report_type ?? 'lab_report';
      const fd = new FormData();
      fd.append('file', file);
      fd.append('report_type', report_type);
      const { data } = await api.post<{
        data: { id: number; file_name: string; file_url: string; version: number };
      }>(`/admin/bookings/${bookingId}/reports`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBooking(bookingId) });
      qc.invalidateQueries({ queryKey: qk.myReports });
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });
}

export interface AdminReportRow {
  id: number;
  file_name: string;
  file_url: string;
  file_mime: string | null;
  file_size_bytes: number | null;
  report_type: string;
  version: number;
  uploaded_at: string;
  booking_id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
  } | null;
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: number) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/reports/${reportId}`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      qc.invalidateQueries({ queryKey: qk.myReports });
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
}

export function useAdminReports(filters?: { q?: string; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.set('q', filters.q);
      if (filters?.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminReportRow[] }>(
        `/admin/reports${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export interface BookingLookupResult {
  id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  booking_status: string;
  payment_status: string;
  patient_user_id: string | null;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
  } | null;
  items_summary: string | null;
  doctor_name: string | null;
}

export async function lookupBookingByCode(code: string): Promise<BookingLookupResult> {
  const { data } = await api.get<{ data: BookingLookupResult }>(
    `/admin/booking-lookup?code=${encodeURIComponent(code.trim())}`,
  );
  return data.data;
}

// ─── Patient: home-collection serviceability + slot picker + booking ─────

export interface PincodeCheckResult {
  serviceable: boolean;
  pincode: string;
  city?: string | null;
  state?: string | null;
  zone?: string | null;
  home_visit_charge?: number;
  collection_lead_time_hours?: number;
}

/**
 * Public pincode check used by the patient booking flow. Returns
 * `serviceable: false` for non-Indian-format pincodes OR pincodes that don't
 * appear in the active `serviceable_pincodes` list — never throws.
 */
export async function checkServiceablePincode(
  pincode: string,
  branchId?: number,
): Promise<PincodeCheckResult> {
  const trimmed = pincode.trim();
  const qs = new URLSearchParams({ pincode: trimmed });
  if (branchId !== undefined) qs.set('branch_id', String(branchId));
  const { data } = await api.get<{ data: PincodeCheckResult }>(
    `/serviceable-pincodes/check?${qs.toString()}`,
  );
  return data.data;
}

export interface SlotRow {
  time: string;
  available: boolean;
  reason?: 'booked' | 'blocked';
}

/**
 * Home-collection slot grid for a given date+pincode. Backend currently
 * returns a hardcoded 8-slot stub; once the real generator is wired against
 * clinic_settings.home_collection_schedule, this hook keeps the same shape.
 */
export function useHomeCollectionSlots(date: string, pincode: string, enabled = true) {
  return useQuery({
    queryKey: ['home-collection-slots', date, pincode],
    enabled: enabled && !!date && /^[1-9]\d{5}$/.test(pincode),
    queryFn: async () => {
      const { data } = await api.get<{ data: { date: string; slots: SlotRow[] } }>(
        `/home-collection/slots?date=${encodeURIComponent(date)}&pincode=${encodeURIComponent(pincode)}`,
      );
      return data.data.slots;
    },
  });
}

/**
 * Live doctor-slot grid for a given date. Backend reads
 * `doctor_centers.schedule` JSONB, subtracts existing bookings, subtracts
 * doctor_unavailability — see modules/phase2/phase2Routes.ts.
 */
export function useDoctorSlots(
  doctorId: string | undefined,
  date: string,
  centerId?: number,
  visitType: 'in_clinic' | 'home_visit' = 'in_clinic',
  enabled = true,
) {
  return useQuery({
    queryKey: ['doctor-slots', doctorId, date, centerId, visitType],
    enabled: enabled && !!doctorId && !!date,
    queryFn: async () => {
      const params = new URLSearchParams({ date, visit_type: visitType });
      if (centerId) params.set('center_id', String(centerId));
      const { data } = await api.get<{ data: { slots: SlotRow[] } }>(
        `/doctors/${doctorId}/slots?${params.toString()}`,
      );
      return data.data.slots;
    },
  });
}

export interface DoctorAppointmentBookingInput {
  doctor_id: string;
  doctor_center_id: number;
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_date: string;
  scheduled_start_time: string;
  patient_snapshot: Record<string, unknown>;
  reason_for_visit?: string;
  /** Branch the patient is booking at. Optional — backend defaults to Main Branch. */
  branch_id?: number;
}

export interface BookingCreatedResponse {
  id: number;
  booking_code: string;
  payment_id?: number;
}

/**
 * Manual-UPI bookings always carry the payment proof (screenshot or PDF) as
 * a multipart `payment_proof` field plus a JSON-string `data` field — the
 * backend rejects the request without it. See migration 0024 / phase2Routes.
 */
export function useCreateDoctorBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      payload: DoctorAppointmentBookingInput;
      proof: File;
      upi_reference?: string;
    }) => {
      const fd = new FormData();
      fd.append(
        'data',
        JSON.stringify({
          ...args.payload,
          upi_reference: args.upi_reference,
        }),
      );
      if (args.upi_reference) fd.append('upi_reference', args.upi_reference);
      fd.append('payment_proof', args.proof);
      const { data } = await api.post<{ data: BookingCreatedResponse }>(
        '/bookings/doctor-appointment',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myBookings });
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['admin', 'payments', 'pending-re-verify'] });
    },
  });
}

export interface TestBookingInput {
  items: Array<{ service_id: number; quantity: number }>;
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_date: string;
  scheduled_start_time: string;
  patient_snapshot: Record<string, unknown>;
  delivery_address?: Record<string, unknown>;
  home_visit_charge?: number;
  special_instructions?: string;
  /** Branch the patient is booking at. Optional — backend defaults to Main Branch. */
  branch_id?: number;
}

export function useCreateTestBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      payload: TestBookingInput;
      proof: File;
      upi_reference?: string;
    }) => {
      const fd = new FormData();
      fd.append(
        'data',
        JSON.stringify({
          ...args.payload,
          upi_reference: args.upi_reference,
        }),
      );
      if (args.upi_reference) fd.append('upi_reference', args.upi_reference);
      fd.append('payment_proof', args.proof);
      const { data } = await api.post<{ data: BookingCreatedResponse }>(
        '/bookings/test',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myBookings });
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['admin', 'payments', 'pending-re-verify'] });
    },
  });
}

// ─── Clinic UPI + manual-UPI proof re-verification ───────────────────────

export interface ClinicUpi {
  upi_id: string;
  upi_display_name: string;
}

export function useClinicUpi() {
  return useQuery({
    queryKey: ['clinic', 'upi'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await api.get<{ data: ClinicUpi }>('/clinic/upi');
      return data.data;
    },
  });
}

/**
 * Build a UPI deep link the patient scans (or taps on mobile) to pay the
 * clinic. Format ref: https://developers.google.com/pay/india/api/web/create-payment-method
 */
export function buildUpiPaymentLink(
  clinic: ClinicUpi,
  amount: number,
  bookingRef: string,
): string {
  const params = new URLSearchParams({
    pa: clinic.upi_id,
    pn: clinic.upi_display_name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: `Arogya-${bookingRef}`.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

export interface PendingReVerifyRow {
  payment_id: number;
  amount: number;
  upi_reference: string | null;
  payment_proof_mime: string | null;
  submitted_at: string;
  booking_id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
  } | null;
  total_amount: string;
  advance_amount: string;
  balance_amount: string;
  booking_status: string;
  payment_status: string;
}

export function usePendingReVerifyPayments() {
  return useQuery({
    queryKey: ['admin', 'payments', 'pending-re-verify'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PendingReVerifyRow[] }>(
        '/admin/payments/pending-re-verify',
      );
      return data.data;
    },
  });
}

export function useReVerifyPayment(paymentId: number, bookingId?: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notes?: string) => {
      const { data } = await api.post<{
        data: {
          id: number;
          booking_id: number;
          verified_at: string | null;
          verified_by_user_id: string | null;
        };
      }>(`/admin/payments/${paymentId}/re-verify`, { notes });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payments', 'pending-re-verify'] });
      if (bookingId !== undefined) {
        qc.invalidateQueries({ queryKey: qk.adminBooking(bookingId) });
        qc.invalidateQueries({ queryKey: qk.myBooking(bookingId) });
      }
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: qk.myBookings });
    },
  });
}

/**
 * Resolve a proof_url returned from the API (e.g. `/api/v1/admin/payments/42/proof`)
 * into a fully-qualified browser-loadable URL that respects VITE_API_URL.
 *
 * NOTE: the resolved URL still requires JWT auth. Browsers cannot attach the
 * Authorization header on `<img src>` requests, so use `useProofBlobUrl()` to
 * fetch through the axios client and render the resulting blob URL instead.
 */
export function resolvePaymentProofUrl(proofUrl: string | null | undefined): string | null {
  if (!proofUrl) return null;
  if (/^https?:\/\//.test(proofUrl)) return proofUrl;
  const apiBase = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
  // proof_url already includes the `/api/v1` prefix on the server. If the
  // dev base is also `/api/v1`, strip the duplicate. If the env points at an
  // absolute origin (`http://localhost:4000/api/v1`), join it cleanly.
  if (proofUrl.startsWith('/api/v1') && apiBase.endsWith('/api/v1')) {
    return apiBase + proofUrl.slice('/api/v1'.length);
  }
  return apiBase + (proofUrl.startsWith('/') ? '' : '/') + proofUrl;
}

/**
 * Fetches an auth-protected file through the axios client (which attaches the
 * JWT via interceptor) and returns a same-origin `blob:` URL the browser can
 * use as an `<img src>` or `<embed src>`. Passes through `blob:`/`data:` URLs
 * untouched (used by UpiPaymentModal for the not-yet-uploaded file preview).
 *
 * Why this hook exists: `<img src="/api/v1/payments/42/proof">` issues an
 * unauthenticated GET — browsers don't attach custom headers to image
 * requests — so the proof streaming endpoint always 401s. Routing through
 * axios fixes that, and the blob URL is then privately scoped to this tab.
 */
export function useProofBlobUrl(apiUrl: string | null | undefined): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!apiUrl) {
      setBlobUrl(null);
      return;
    }
    // Pre-resolved blob (e.g. file picker preview) — use as-is.
    if (apiUrl.startsWith('blob:') || apiUrl.startsWith('data:')) {
      setBlobUrl(apiUrl);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    // Normalise to a path relative to the axios baseURL so the request
    // honours interceptors (which is where Authorization gets attached).
    const apiBase = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '');
    let path = apiUrl;
    if (apiUrl.startsWith(apiBase)) {
      path = apiUrl.slice(apiBase.length) || '/';
    } else if (apiUrl.startsWith('/api/v1') && apiBase.endsWith('/api/v1')) {
      path = apiUrl.slice('/api/v1'.length) || '/';
    }
    api
      .get(path, { responseType: 'blob' })
      .then((resp) => {
        if (cancelled) return;
        created = URL.createObjectURL(resp.data as Blob);
        setBlobUrl(created);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [apiUrl]);
  return blobUrl;
}

/**
 * STUB. Triggers the backend payment-confirmation endpoint that stands in
 * for Razorpay's webhook until that's wired. Idempotent on the backend, so
 * it's safe to fire on every PaymentCallbackPage mount.
 */
export function useConfirmPaymentStub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number | string) => {
      const { data } = await api.post<{
        data: {
          id: number;
          booking_code: string;
          booking_status: string;
          payment_status: string;
        };
      }>(`/bookings/${bookingId}/confirm-payment-stub`);
      return data.data;
    },
    onSuccess: (_, bookingId) => {
      qc.invalidateQueries({ queryKey: qk.myBookings });
      qc.invalidateQueries({ queryKey: qk.myBooking(bookingId) });
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
}

export interface MyReport {
  id: number;
  file_name: string;
  uploaded_at: string;
  report_type: string;
  booking_id: number;
  booking_code: string;
}

export function useMyReports() {
  return useQuery({
    queryKey: qk.myReports,
    queryFn: async () => {
      const { data } = await api.get<{ data: MyReport[] }>('/reports');
      return data.data;
    },
  });
}

/**
 * Fetch a (signed) download URL for a report and open it in a new tab.
 * Works for both admins (any report) and patients (own reports only).
 */
export async function downloadReport(reportId: number): Promise<void> {
  const { data } = await api.get<{ data: { url: string; expires_in: number } }>(
    `/reports/${reportId}/download`,
  );
  window.open(data.data.url, '_blank', 'noopener,noreferrer');
}

/**
 * Admin: fetch the generated invoice PDF for a booking and trigger download.
 * Server returns a PDF stream; we wrap it in a blob URL so the browser uses
 * the proper Content-Type + Content-Disposition headers.
 */
export async function downloadInvoicePdf(bookingId: number | string, bookingCode: string): Promise<void> {
  const resp = await api.get<Blob>(`/admin/bookings/${bookingId}/invoice.pdf`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${bookingCode}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface AdminInvoiceFilters {
  type?: 'doctor_appointment' | 'test_booking';
  origin?: 'online' | 'walk_in';
  visit_type?: 'in_clinic' | 'home_visit';
  from?: string;
  to?: string;
  q?: string;
}

export interface AdminInvoiceRow {
  id: number;
  invoice_number: string;
  total_amount: string;
  generated_at: string;
  booking_id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  visit_type: 'in_clinic' | 'home_visit';
  payment_status: string;
  advance_amount: string;
  balance_amount: string;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
  } | null;
}

export function useAdminInvoices(filters?: AdminInvoiceFilters) {
  return useQuery({
    queryKey: ['admin', 'invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.origin) params.set('origin', filters.origin);
      if (filters?.visit_type) params.set('visit_type', filters.visit_type);
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      if (filters?.q) params.set('q', filters.q);
      const { data } = await api.get<{ data: AdminInvoiceRow[] }>(
        `/admin/invoices${params.toString() ? `?${params}` : ''}`,
      );
      return data.data;
    },
  });
}

/**
 * Patient self-download of own booking invoice. Returns the file as a Blob
 * and triggers a download — same shape as the admin `downloadInvoicePdf`,
 * but hits the patient-scoped endpoint.
 */
export async function downloadMyInvoicePdf(
  bookingId: number | string,
  bookingCode: string,
): Promise<void> {
  const resp = await api.get<Blob>(`/bookings/${bookingId}/invoice.pdf`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${bookingCode}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Admin: patients ledger (live, sourced from users + bookings) ────────

export interface AdminPatientRow {
  mobile: string;
  name: string;
  email: string | null;
  is_registered: boolean;
  user_id: string | null;
  bookings_count: number;
  total_spent: string;
  last_booking_at: string | null;
}

export function useAdminPatients(filters?: { q?: string }) {
  return useQuery({
    queryKey: ['admin', 'patients', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.set('q', filters.q);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminPatientRow[] }>(
        `/admin/patients${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

// ─── Admin: full payments ledger ─────────────────────────────────────────

export interface AdminPaymentsLedgerFilters {
  source?: 'razorpay' | 'offline' | 'upi_manual';
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface AdminPaymentLedgerRow {
  id: number;
  amount: string;
  refunded_amount: string;
  currency: string;
  payment_source: 'razorpay' | 'offline' | 'upi_manual';
  payment_method: string | null;
  payment_status: string;
  payment_type: string;
  captured_at: string | null;
  created_at: string;
  upi_reference: string | null;
  verified_at: string | null;
  booking_id: number;
  booking_code: string;
  booking_type: 'doctor_appointment' | 'test_booking';
  booking_origin: 'online' | 'walk_in';
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
    email?: string | null;
  } | null;
}

export function useAdminPaymentsLedger(filters?: AdminPaymentsLedgerFilters) {
  return useQuery({
    queryKey: ['admin', 'payments-ledger', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.source) params.set('source', filters.source);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      if (filters?.q) params.set('q', filters.q);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminPaymentLedgerRow[] }>(
        `/admin/payments-ledger${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

// ─── Admin: home-collection dispatch board ───────────────────────────────

export type CollectionStatus =
  | 'not_assigned'
  | 'assigned'
  | 'en_route'
  | 'collected'
  | 'received_at_lab';

export interface HomeCollectionRow {
  id: number;
  booking_code: string;
  booking_status: string;
  collection_status: CollectionStatus;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  total_amount: string;
  advance_amount: string;
  balance_amount: string;
  patient_snapshot: {
    first_name?: string;
    last_name?: string;
    mobile?: string;
  } | null;
  delivery_address: { line1?: string; line2?: string; city?: string; pincode?: string } | null;
  assigned_staff_user_id: string | null;
  assigned_staff_name: string | null;
}

export interface CollectionStaff {
  id: string;
  name: string;
  mobile: string | null;
}

export function useHomeCollections() {
  return useQuery({
    queryKey: ['admin', 'home-collections'],
    queryFn: async () => {
      const { data } = await api.get<{ data: HomeCollectionRow[] }>(
        '/admin/home-collections',
      );
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useCollectionStaff() {
  return useQuery({
    queryKey: ['admin', 'collection-staff'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionStaff[] }>(
        '/admin/collection-staff',
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCollection(bookingId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      collection_status?: CollectionStatus;
      assigned_staff_user_id?: string | null;
    }) => {
      const { data } = await api.patch<{
        data: {
          id: number;
          collection_status: CollectionStatus;
          assigned_staff_user_id: string | null;
        };
      }>(`/admin/bookings/${bookingId}/collection`, input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'home-collections'] });
      qc.invalidateQueries({ queryKey: qk.adminBooking(bookingId) });
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
}

// ─── Admin: reviews moderation ───────────────────────────────────────────

export interface AdminReviewRow {
  id: number;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  clinic_reply: string | null;
  replied_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  doctor_user_id: string | null;
  doctor_name: string | null;
  patient_user_id: string | null;
  patient_first_name: string | null;
}

export function useAdminReviews(status?: AdminReviewRow['status']) {
  return useQuery({
    queryKey: ['admin', 'reviews', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminReviewRow[] }>(
        `/admin/reviews${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      status?: AdminReviewRow['status'];
      rejection_reason?: string;
      clinic_reply?: string;
    }) => {
      const { id, ...body } = input;
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/reviews/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      // Public reviews list shows only `approved` — refresh that too.
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

// ─── Admin: enquiries ────────────────────────────────────────────────────

export interface AdminEnquiryRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  responded_at: string | null;
  created_at: string;
}

export function useAdminEnquiries(status?: AdminEnquiryRow['status']) {
  return useQuery({
    queryKey: ['admin', 'enquiries', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminEnquiryRow[] }>(
        `/admin/enquiries${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useUpdateEnquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; status: AdminEnquiryRow['status'] }) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/enquiries/${input.id}`,
        { status: input.status },
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enquiries'] }),
  });
}

// ─── Admin: audit log ────────────────────────────────────────────────────

export interface AdminAuditRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: unknown;
  after_data: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  actor_name: string;
}

export function useAdminAuditLog(limit = 100) {
  return useQuery({
    queryKey: ['admin', 'audit-log', limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminAuditRow[] }>(
        `/admin/audit-log?limit=${limit}`,
      );
      return data.data;
    },
  });
}

// ─── Admin: clinic settings ──────────────────────────────────────────────

export interface AdminSettingRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminSettingRow[] }>('/admin/settings');
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; value: unknown; description?: string }) => {
      const { key, ...body } = input;
      const { data } = await api.put<{ data: { key: string; updated: boolean } }>(
        `/admin/settings/${key}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['clinic', 'upi'] });
    },
  });
}

// ─── Admin: home collectors CRUD ─────────────────────────────────────────
// Stored as admin users with admin_role='lab_tech', is_login_enabled=FALSE.

export interface AdminCollectorRow {
  id: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  date_of_birth: string | null;
  gender: 'M' | 'F' | 'O' | null;
  age: number | null;
  is_active: boolean;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectorInput {
  first_name: string;
  last_name?: string | null;
  mobile: string;
  date_of_birth?: string | null;
  gender?: 'M' | 'F' | 'O' | null;
  is_active?: boolean;
}

export function useAdminCollectors(filters?: { q?: string }) {
  return useQuery({
    queryKey: ['admin', 'collectors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.q) params.set('q', filters.q);
      const qs = params.toString();
      const { data } = await api.get<{ data: AdminCollectorRow[] }>(
        `/admin/collectors${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

function invalidateCollectorCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin', 'collectors'] });
  qc.invalidateQueries({ queryKey: ['admin', 'collection-staff'] });
  qc.invalidateQueries({ queryKey: ['admin', 'home-collections'] });
}

export function useCreateCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CollectorInput) => {
      const { data } = await api.post<{ data: { id: string } }>(
        '/admin/collectors',
        input,
      );
      return data.data;
    },
    onSuccess: () => invalidateCollectorCaches(qc),
  });
}

export function useUpdateCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CollectorInput & { id: string }) => {
      const { data } = await api.patch<{ data: { updated: boolean } }>(
        `/admin/collectors/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: () => invalidateCollectorCaches(qc),
  });
}

export function useDeleteCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ data: { deleted: boolean } }>(
        `/admin/collectors/${id}`,
      );
      return data.data;
    },
    onSuccess: () => invalidateCollectorCaches(qc),
  });
}

export function useUploadCollectorPhoto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ data: { url: string } }>(
        `/admin/collectors/${id}/photo`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => invalidateCollectorCaches(qc),
  });
}

/**
 * Build a fully-qualified photo URL for a collector. The `profile_photo_url`
 * column stores a relative API path like `/collectors/<id>/photo`. Public —
 * no auth required for the read (same as doctor photos).
 */
export function resolveCollectorPhotoUrl(
  profile_photo_url: string | null | undefined,
  cacheBust?: string | number,
): string | null {
  return resolveDoctorPhotoUrl(profile_photo_url, cacheBust);
}

// ─── Notifications (bell icon) ───────────────────────────────────────────

export interface NotificationRow {
  id: number;
  audience: 'admin' | 'patient' | 'collector';
  event: string;
  title: string;
  body: string | null;
  link: string | null;
  booking_id: number | null;
  booking_code: string | null;
  read_at: string | null;
  created_at: string;
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: async () => {
      const { data } = await api.get<{ data: NotificationRow[] }>('/notifications');
      return data.data;
    },
    // Poll every 15s so the bell feels close-to-live without WebSockets.
    refetchInterval: 15_000,
    // Re-fetch when the tab gains focus, so admin sees new bookings as they
    // come in without waiting for the next poll tick — same for patient when
    // they bounce back from another tab.
    refetchOnWindowFocus: true,
    // Keep polling even when the tab isn't focused — the bell badge should
    // still update if the user comes back after a while.
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ data: { id: number; read: boolean } }>(
        `/notifications/${id}/read`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { read_all: boolean } }>(
        `/notifications/read-all`,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
  });
}

/**
 * Mark every unread notification of these event types as read. Used by tab
 * pages to clear their sidebar "NEW" badge as soon as the user visits.
 *
 * The hook is stable across renders so it's safe to call from useEffect with
 * just `events` in the dependency array.
 */
export function useMarkNotificationsReadByEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (events: string[]) => {
      if (events.length === 0) return { read_by_events: true, events };
      const { data } = await api.post<{
        data: { read_by_events: boolean; events: string[] };
      }>('/notifications/read-by-events', { events });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
  });
}

/**
 * Convenience selector used by sidebar badges. Returns the count of currently
 * unread notifications whose `event` matches any of the supplied tags.
 */
export function countUnreadByEvents(
  notifications: NotificationRow[] | undefined,
  events: readonly string[],
): number {
  if (!notifications) return 0;
  const set = new Set(events);
  return notifications.filter((n) => n.read_at === null && set.has(n.event)).length;
}

/**
 * Live-link a single booking's detail cache to the notification stream.
 *
 * The patient's `useMyBooking(id)` is fetched once on mount; it doesn't poll
 * (would be wasteful). But admin status changes / collector assignments /
 * re-verifications always emit a notification carrying the affected
 * `booking_id`. The notification feed IS polled every 15s, so whenever a
 * fresh notification for THIS booking lands, we invalidate the booking's
 * detail cache — which triggers a refetch and updates the UI within a tick.
 *
 * Result: the patient's "Home collection" stepper progresses live as admin
 * marks each stage, with no manual refresh.
 */
export function useLiveBookingSync(bookingId: string | number | undefined) {
  const { data: notifications } = useMyNotifications();
  const qc = useQueryClient();
  // Watch the most recent notification timestamp for this booking. When it
  // changes (a new event arrived), invalidate. The first effect tick after
  // mount is a no-op because no time has changed yet.
  const targetId = bookingId === undefined ? null : Number(bookingId);
  const latestForThis = notifications
    ?.filter((n) => targetId !== null && n.booking_id === targetId)
    .map((n) => n.created_at)[0] ?? null;
  useEffect(() => {
    if (bookingId === undefined) return;
    qc.invalidateQueries({ queryKey: qk.myBooking(bookingId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestForThis]);
}

/**
 * Drop the sidebar "NEW" badge for the tab the user is currently looking at.
 *
 * Calls /notifications/read-by-events whenever the unread count for this
 * page's event set goes above zero — both on initial mount AND when a fresh
 * notification arrives via the bell poll. So the badge disappears within a
 * tick of the user landing on the page, and stays gone for the duration of
 * their visit even if new events fire while they watch.
 *
 * Pass the same event names listed in `badgeEvents` on the sidebar nav item.
 */
export function useClearTabBadges(events: readonly string[]) {
  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationsReadByEvents();
  const unreadCount = countUnreadByEvents(notifications, events);
  // Stringify so the dep array doesn't churn on a new array identity each
  // render — the actual set of events is static per page.
  const eventsKey = events.join(',');
  useEffect(() => {
    if (unreadCount > 0) {
      markRead.mutate(events.slice());
    }
    // markRead is a stable mutation; events comes from a static literal in
    // the page so we hash it for the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, eventsKey]);
}

export type { UseQueryOptions };
