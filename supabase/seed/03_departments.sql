-- 03_departments.sql
-- Initial clinical departments. Admin can add more later via /admin/departments.

INSERT INTO departments (name, slug, description, display_order, is_active) VALUES
    ('General Physician', 'general-physician', 'Primary care and general consultations.', 1, TRUE),
    ('Cardiology', 'cardiology', 'Heart and cardiovascular care.', 2, TRUE),
    ('Diabetology', 'diabetology', 'Diabetes management and endocrine care.', 3, TRUE),
    ('Gynaecology', 'gynaecology', 'Women''s health and pregnancy care.', 4, TRUE),
    ('Paediatrics', 'paediatrics', 'Care for infants, children, and adolescents.', 5, TRUE),
    ('Orthopaedics', 'orthopaedics', 'Bone, joint, and musculoskeletal care.', 6, TRUE),
    ('ENT', 'ent', 'Ear, nose, and throat specialty care.', 7, TRUE),
    ('Dermatology', 'dermatology', 'Skin, hair, and nail conditions.', 8, TRUE)
ON CONFLICT (name) DO NOTHING;
