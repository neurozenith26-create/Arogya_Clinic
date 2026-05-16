import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { RequireAuth } from './components/shared/RequireAuth';
import { PHASE_2_ENABLED } from './config/featureFlags';

// Phase 1 public
const HomePage = lazy(() => import('./pages/public/HomePage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ServicesPage = lazy(() => import('./pages/public/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/public/ServiceDetailPage'));
const DoctorsPage = lazy(() => import('./pages/public/DoctorsPage'));
const DoctorProfilePage = lazy(() => import('./pages/public/DoctorProfilePage'));
const DepartmentsPage = lazy(() => import('./pages/public/DepartmentsPage'));
const DepartmentDetailPage = lazy(() => import('./pages/public/DepartmentDetailPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const FeedbackPage = lazy(() => import('./pages/public/FeedbackPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

// Phase 2 patient
const LoginPage = lazy(() => import('./pages/patient/LoginPage'));
const SignupPage = lazy(() => import('./pages/patient/SignupPage'));
const CartPage = lazy(() => import('./pages/patient/CartPage'));
const BookDoctorPage = lazy(() => import('./pages/patient/BookDoctorPage'));
const BookTestPage = lazy(() => import('./pages/patient/BookTestPage'));
const PaymentCallbackPage = lazy(() => import('./pages/patient/PaymentCallbackPage'));
const DashboardOverviewPage = lazy(() => import('./pages/patient/DashboardOverviewPage'));
const AppointmentsPage = lazy(() => import('./pages/patient/AppointmentsPage'));
const TestsPage = lazy(() => import('./pages/patient/TestsPage'));
const MyBookingsPage = lazy(() => import('./pages/patient/MyBookingsPage'));
const ReportsPage = lazy(() => import('./pages/patient/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/patient/ProfilePage'));
const BookingDetailPage = lazy(() => import('./pages/patient/BookingDetailPage'));

// Phase 2 admin
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminBookingDetailPage = lazy(() => import('./pages/admin/AdminBookingDetailPage'));
const AdminDoctorsPage = lazy(() => import('./pages/admin/AdminDoctorsPage'));
const AdminDoctorEditPage = lazy(() => import('./pages/admin/AdminDoctorEditPage'));
const AdminServicesPage = lazy(() => import('./pages/admin/AdminServicesPage'));
const AdminServiceCategoriesPage = lazy(
  () => import('./pages/admin/AdminServiceCategoriesPage'),
);
const AdminDepartmentsPage = lazy(() => import('./pages/admin/AdminDepartmentsPage'));
const AdminPatientsPage = lazy(() => import('./pages/admin/AdminPatientsPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminFeedbackPage = lazy(() => import('./pages/admin/AdminFeedbackPage'));
const AdminEnquiriesPage = lazy(() => import('./pages/admin/AdminEnquiriesPage'));
const AdminAuditLogPage = lazy(() => import('./pages/admin/AdminAuditLogPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminInvoicesPage = lazy(() => import('./pages/admin/AdminInvoicesPage'));
const AdminPaymentVerificationsPage = lazy(
  () => import('./pages/admin/AdminPaymentVerificationsPage'),
);
const AdminCollectorsPage = lazy(() => import('./pages/admin/AdminCollectorsPage'));
const AdminPincodesPage = lazy(() => import('./pages/admin/AdminPincodesPage'));
const AdminBranchAdminsPage = lazy(() => import('./pages/admin/AdminBranchAdminsPage'));
const WalkInBillPage = lazy(() => import('./pages/admin/WalkInBillPage'));
const HomeCollectionBoardPage = lazy(() => import('./pages/admin/HomeCollectionBoardPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Phase 1: Public website (always available) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id" element={<DoctorProfilePage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:slug" element={<DepartmentDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        {/* Phase 2 (gated) */}
        {PHASE_2_ENABLED && (
          <>
            {/* Patient auth + booking + cart (uses public chrome) */}
            <Route element={<PublicLayout />}>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route
                path="/book/doctor/:doctorId"
                element={
                  <RequireAuth roles={['patient']}>
                    <BookDoctorPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/book/test"
                element={
                  <RequireAuth roles={['patient']}>
                    <BookTestPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/payment/callback"
                element={
                  <RequireAuth roles={['patient']}>
                    <PaymentCallbackPage />
                  </RequireAuth>
                }
              />
            </Route>

            {/* Patient dashboard */}
            <Route element={<PublicLayout />}>
              <Route
                element={
                  <RequireAuth roles={['patient']}>
                    <DashboardLayout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<DashboardOverviewPage />} />
                <Route path="/dashboard/appointments" element={<AppointmentsPage />} />
                <Route path="/dashboard/tests" element={<TestsPage />} />
                <Route path="/dashboard/bookings" element={<MyBookingsPage />} />
                <Route path="/dashboard/reports" element={<ReportsPage />} />
                <Route path="/dashboard/profile" element={<ProfilePage />} />
                <Route path="/dashboard/bookings/:id" element={<BookingDetailPage />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              element={
                <RequireAuth roles={['admin', 'super_admin']} loginPath="/admin/login">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
              <Route path="/admin/bookings/:id" element={<AdminBookingDetailPage />} />
              <Route path="/admin/walk-in-bills" element={<Navigate to="/admin/walk-in-bills/new" replace />} />
              <Route path="/admin/walk-in-bills/new" element={<WalkInBillPage />} />
              <Route path="/admin/home-collections" element={<HomeCollectionBoardPage />} />
              <Route path="/admin/patients" element={<AdminPatientsPage />} />
              <Route path="/admin/doctors" element={<AdminDoctorsPage />} />
              <Route path="/admin/doctors/:id" element={<AdminDoctorEditPage />} />
              <Route path="/admin/services" element={<AdminServicesPage />} />
              <Route
                path="/admin/service-categories"
                element={<AdminServiceCategoriesPage />}
              />
              <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
              <Route path="/admin/pincodes" element={<AdminPincodesPage />} />
              <Route path="/admin/branch-admins" element={<AdminBranchAdminsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route
                path="/admin/payment-verifications"
                element={<AdminPaymentVerificationsPage />}
              />
              <Route path="/admin/collectors" element={<AdminCollectorsPage />} />
              <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
              <Route path="/admin/enquiries" element={<AdminEnquiriesPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </>
        )}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
