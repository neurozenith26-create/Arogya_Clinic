# Supabase setup for Arogya Diagnostics

This folder contains everything the database needs: migrations (schema) and seeds (initial data).

## One-time setup

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. **Copy these three values** from Project Settings → API:
   - `Project URL` → goes into both `frontend/.env` and `backend/.env` as `SUPABASE_URL`
   - `anon public` key → goes into both `.env` files as `SUPABASE_ANON_KEY`
   - `service_role` key → goes into **only `backend/.env`** as `SUPABASE_SERVICE_ROLE_KEY` (this is a secret — never expose to the browser)
3. **Copy the database connection string** from Project Settings → Database → Connection string → URI. Paste it into `backend/.env` as `DATABASE_URL`. The format is:
   ```
   postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres
   ```

## Running migrations

From the repo root:

```powershell
pnpm db:migrate
```

This runs every `.sql` file in `supabase/migrations/` in order. The runner records what's been applied in a `_migrations` table, so it's safe to re-run.

## Seeding initial data

After migrations:

```powershell
pnpm db:seed
```

This runs every `.sql` file in `supabase/seed/` in order:
1. `01_clinic_settings.sql` — GSTIN, helpline, business hours, refund policy, etc.
2. `02_service_categories.sql` — Pathology, Radiology, etc.
3. `03_departments.sql` — General Physician, Cardiology, Diabetology, ...
4. `04_services.sql` — Digital X-Ray, Ultrasonography, ECG, etc. (placeholders — set real prices via admin UI)
5. `05_super_admin.sql` — placeholder super-admin row

## Linking your Supabase Auth account to the super-admin row

The seed inserts a super-admin row but it has no `auth_user_id` yet. To activate it:

1. In Supabase Studio → **Authentication** → **Users**, create yourself a user with email `arogyaclinic2025@gmail.com` (or update the email in `05_super_admin.sql` and re-seed).
2. Then in the SQL editor, run:
   ```sql
   UPDATE users
   SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'arogyaclinic2025@gmail.com')
   WHERE email = 'arogyaclinic2025@gmail.com';
   ```
3. Now you can log in to the admin panel with that Auth account.

## Storage buckets to create

In Supabase Studio → **Storage**, create these buckets:

| Name | Public? | Used for |
|------|---------|----------|
| `reports` | Private | Patient lab reports (PDFs, images). Access via signed URLs only. |
| `doctor-photos` | Public | Doctor profile photos shown on the public site. |
| `invoices` | Private | Generated PDF invoices. |
| `service-images` | Public | Service category banners and test images. |

## Migration list (in order)

| # | File | Purpose |
|---|------|---------|
| 1 | `0001_extensions.sql` | Postgres extensions (pgcrypto, pg_trgm, citext) |
| 2 | `0002_users.sql` | Unified users table (patient + doctor + admin) |
| 3 | `0003_departments.sql` | Clinical departments |
| 4 | `0004_service_categories.sql` | Top-level service groupings |
| 5 | `0005_services.sql` | Tests + health packages |
| 6 | `0006_doctor_centers.sql` | Doctor consulting locations + JSONB schedules |
| 7 | `0007_doctor_unavailability.sql` | Holidays / leaves / slot blocks |
| 8 | `0008_bookings.sql` | The HUB — all bookings (online + walk-in, doctor + test) |
| 9 | `0009_booking_items.sql` | Line items (catalog OR custom) |
| 10 | `0010_payments.sql` | Razorpay + offline payments |
| 11 | `0011_invoices.sql` | Auto-generated invoices |
| 12 | `0012_reports.sql` | Uploaded medical reports |
| 13 | `0013_reviews.sql` | Patient reviews + moderation |
| 14 | `0014_enquiries.sql` | Contact-form submissions |
| 15 | `0015_webhook_events.sql` | Razorpay webhook idempotency log |
| 16 | `0016_audit_log.sql` | Universal audit trail |
| 17 | `0017_clinic_settings.sql` | Key/value clinic config |
| 18 | `0018_serviceable_pincodes.sql` | Home-collection pincode whitelist |
| 19 | `0019_rls_helpers.sql` | `current_app_user_id()`, `is_admin()`, etc. |
| 20 | `0020_rls_policies.sql` | All Row-Level Security policies |

## Adding new migrations

Create a new file `NNNN_description.sql` with the next number. Never edit a migration that's already been applied — write a follow-up migration instead.
