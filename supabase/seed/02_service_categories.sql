-- 02_service_categories.sql
-- Top-level service groupings (Pathology, Radiology, Diagnostics, Doctor Consultation).
-- Matches the clinic's actual service offering visible on the business card.

INSERT INTO service_categories (name, slug, display_order, is_active) VALUES
    ('Pathology', 'pathology', 1, TRUE),
    ('Radiology', 'radiology', 2, TRUE),
    ('Ultrasonography', 'ultrasonography', 3, TRUE),
    ('Cardiac Diagnostics', 'cardiac-diagnostics', 4, TRUE),
    ('Health Packages', 'health-packages', 5, TRUE),
    ('Doctor Consultation', 'doctor-consultation', 6, TRUE)
ON CONFLICT (slug) DO NOTHING;
