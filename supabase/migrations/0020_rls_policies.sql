-- 0020_rls_policies.sql
-- Enable Row-Level Security on every table and attach policies:
--   - Patients see only their own rows
--   - Admins see everything
--   - Public can read whitelisted columns of doctors/services/categories/departments/reviews
--   - Service-role key bypasses RLS entirely (used by the backend for admin work)

-- ──────────────────────────────────────────────────────────────────────────
-- users
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY users_admin_select_all ON users
    FOR SELECT USING (is_admin());

CREATE POLICY users_public_doctor_select ON users
    FOR SELECT USING (role = 'doctor' AND is_verified = TRUE AND is_active = TRUE);

CREATE POLICY users_self_update ON users
    FOR UPDATE USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- Read-only public catalog
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY departments_public_select ON departments
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY departments_admin_all ON departments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_categories_public_select ON service_categories
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY service_categories_admin_all ON service_categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_public_select ON services
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY services_admin_all ON services FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE doctor_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY doctor_centers_public_select ON doctor_centers
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY doctor_centers_admin_all ON doctor_centers FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE doctor_unavailability ENABLE ROW LEVEL SECURITY;
CREATE POLICY doctor_unavailability_admin_all ON doctor_unavailability FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- Patient-scoped data: patient sees own; admin sees all
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookings_patient_select ON bookings
    FOR SELECT USING (patient_user_id = current_app_user_id());
CREATE POLICY bookings_admin_all ON bookings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY booking_items_patient_select ON booking_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_items.booking_id
              AND b.patient_user_id = current_app_user_id()
        )
    );
CREATE POLICY booking_items_admin_all ON booking_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_patient_select ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = payments.booking_id
              AND b.patient_user_id = current_app_user_id()
        )
    );
CREATE POLICY payments_admin_all ON payments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_patient_select ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = invoices.booking_id
              AND b.patient_user_id = current_app_user_id()
        )
    );
CREATE POLICY invoices_admin_all ON invoices FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_patient_select ON reports
    FOR SELECT USING (patient_user_id = current_app_user_id() AND is_active = TRUE);
CREATE POLICY reports_admin_all ON reports FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- Public submit / admin moderate: enquiries + reviews
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY enquiries_public_insert ON enquiries FOR INSERT WITH CHECK (TRUE);
CREATE POLICY enquiries_admin_all ON enquiries FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_public_select ON reviews
    FOR SELECT USING (status = 'approved');
CREATE POLICY reviews_public_insert ON reviews
    FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY reviews_admin_all ON reviews FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- Admin-only / internal
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_events_admin_select ON webhook_events FOR SELECT USING (is_admin());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_admin_select ON audit_log FOR SELECT USING (is_admin());

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_settings_public_read_some ON clinic_settings
    FOR SELECT USING (key IN ('clinic_name', 'clinic_address', 'helpline_phone',
                              'support_email', 'business_hours'));
CREATE POLICY clinic_settings_admin_all ON clinic_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE serviceable_pincodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY serviceable_pincodes_public_select ON serviceable_pincodes
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY serviceable_pincodes_admin_all ON serviceable_pincodes FOR ALL USING (is_admin()) WITH CHECK (is_admin());
