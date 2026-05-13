-- 04_services.sql
-- Initial services lifted from the clinic's business card.
-- Prices are placeholders — admin will set real prices via /admin/services.

INSERT INTO services (category_id, name, slug, short_description, sample_type, report_turnaround_hours, price, is_active)
SELECT c.id, 'Digital X-Ray', 'digital-x-ray',
       'High-resolution digital X-ray imaging for diagnostic accuracy.',
       NULL, 1, 0, TRUE
FROM service_categories c WHERE c.slug = 'radiology'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, short_description, sample_type, report_turnaround_hours, price, is_active)
SELECT c.id, '3D / 4D Ultrasonography', '3d-4d-ultrasonography',
       'Advanced 3D and 4D ultrasound imaging for diagnostic and obstetric scans.',
       NULL, 2, 0, TRUE
FROM service_categories c WHERE c.slug = 'ultrasonography'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, short_description, sample_type, report_turnaround_hours, price, is_active)
SELECT c.id, 'ECG', 'ecg',
       'Electrocardiogram — quick test to record the electrical activity of the heart.',
       NULL, 1, 0, TRUE
FROM service_categories c WHERE c.slug = 'cardiac-diagnostics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, short_description, sample_type, report_turnaround_hours, price, is_active)
SELECT c.id, 'Halter Monitoring', 'halter-monitoring',
       '24-hour Holter monitoring to track heart rhythm during daily activity.',
       NULL, 48, 0, TRUE
FROM service_categories c WHERE c.slug = 'cardiac-diagnostics'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, short_description, sample_type, report_turnaround_hours, price, is_active)
SELECT c.id, 'Complete Blood Count (CBC)', 'cbc',
       'Comprehensive blood test to evaluate overall health and detect a wide range of disorders.',
       'Blood', 24, 0, TRUE
FROM service_categories c WHERE c.slug = 'pathology'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, slug, short_description, sample_type, report_turnaround_hours, price, is_active)
SELECT c.id, 'Fasting Blood Glucose', 'fasting-blood-glucose',
       'Measures blood sugar after fasting — used to screen for diabetes.',
       'Blood', 12, 0, TRUE
FROM service_categories c WHERE c.slug = 'pathology'
ON CONFLICT (slug) DO NOTHING;
