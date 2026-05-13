-- 01_clinic_settings.sql
-- Initial clinic-wide configuration. Values populated from the official clinic
-- business card; admin can edit via the /admin/settings page later.

INSERT INTO clinic_settings (key, value, description) VALUES
    ('clinic_name', '"Arogya Diagnostics & Multispeciality Clinic"', 'Full legal name shown on invoices and pages'),
    ('clinic_short_name', '"Arogya Diagnostics"', 'Short name for headers / nav'),
    ('clinic_tagline_en', '"All Specialist Doctors Are Available here By Appointment."', 'Public tagline (English)'),
    ('clinic_tagline_bn', '"সব রকমের বিশেষজ্ঞ ডাক্তার এখানে উপলব্ধ। নির্দিষ্ট দিনে, নির্দিষ্ট সময়ে সাক্ষাৎ-এর জন্য যোগাযোগ করুন।"', 'Public tagline (Bengali)'),
    ('helpline_phone', '"+91 98319 90734"', 'Primary phone for patient calls and WhatsApp'),
    ('helpline_whatsapp', '"+919831990734"', 'WhatsApp number (E.164 format, no spaces)'),
    ('support_email', '"arogyaclinic2025@gmail.com"', 'Patient-facing support email'),
    ('clinic_address', '{"line1": "", "line2": "", "city": "Kolkata", "state": "West Bengal", "pincode": "", "landmark": ""}', 'Full address — fill in via admin once confirmed'),
    ('business_hours', '{"mon": {"start": "09:00", "end": "20:00"}, "tue": {"start": "09:00", "end": "20:00"}, "wed": {"start": "09:00", "end": "20:00"}, "thu": {"start": "09:00", "end": "20:00"}, "fri": {"start": "09:00", "end": "20:00"}, "sat": {"start": "09:00", "end": "20:00"}, "sun": null}', 'Clinic business hours by weekday'),
    ('gstin', '""', 'Clinic GSTIN for invoices — fill via admin before going live with Razorpay'),
    ('default_tax_percent', '0', 'Default tax percent applied to bookings (set 18 for GST when applicable)'),
    ('razorpay_mode', '"test"', 'test or live — Razorpay environment selector'),
    ('report_retention_days', '365', 'How long uploaded reports remain downloadable'),
    ('cancellation_window_hours', '24', 'Patients can cancel up to N hours before slot'),
    ('refund_policy', '{"hours_before_24": 100, "hours_before_12": 50, "hours_before_2": 0}', 'Refund percentage by cancellation window'),
    ('home_collection_schedule', '{"mon": {"start": "07:00", "end": "11:00", "slot_minutes": 30, "max_bookings_per_slot": 5}, "tue": {"start": "07:00", "end": "11:00", "slot_minutes": 30, "max_bookings_per_slot": 5}, "wed": {"start": "07:00", "end": "11:00", "slot_minutes": 30, "max_bookings_per_slot": 5}, "thu": {"start": "07:00", "end": "11:00", "slot_minutes": 30, "max_bookings_per_slot": 5}, "fri": {"start": "07:00", "end": "11:00", "slot_minutes": 30, "max_bookings_per_slot": 5}, "sat": {"start": "07:00", "end": "11:00", "slot_minutes": 30, "max_bookings_per_slot": 5}, "sun": null}', 'Weekly schedule for test home collection — Sun off')
ON CONFLICT (key) DO NOTHING;
