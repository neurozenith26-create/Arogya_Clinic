# Arogya Diagnostics — Clinic Website

Public website + booking platform + admin panel for Arogya Diagnostics (Kolkata).

**Stack:** React (Vite) · Node.js (Express) · Supabase (Postgres + Auth + Storage)

## Folder structure

```
arogya-diagnostics-website/
  frontend/      # React website (public site + patient portal + admin panel)
  backend/       # Node.js API server (bookings, payments, reports, admin)
  shared/        # TypeScript types + zod validation schemas shared between frontend and backend
  supabase/      # Database migrations + seed data + RLS policies
  Docs/          # Original requirements, user stories, DB schema, architecture
```

## Prerequisites

- Node.js v20 or higher (you have v20.20.0 ✓)
- pnpm v9 or higher (you have v10.20.0 ✓)
- A Supabase project (free tier works) — create at https://supabase.com when ready

## First-time setup

```powershell
# 1. Install all dependencies
pnpm install

# 2. Copy environment templates
Copy-Item frontend\.env.example frontend\.env
Copy-Item backend\.env.example backend\.env

# 3. Fill in your Supabase credentials in both .env files
#    (see "Supabase setup" section below)

# 4. Run database migrations
pnpm db:migrate

# 5. Seed initial data (super admin, clinic settings, sample data)
pnpm db:seed
```

## Daily development

```powershell
# Run frontend + backend together
pnpm dev

# Or run them individually
pnpm dev:frontend   # http://localhost:5173
pnpm dev:backend    # http://localhost:3001
```

## Supabase setup

Create a free Supabase project at https://supabase.com, then copy these three values:

| Where to find it | Where to paste it |
|---|---|
| Project Settings → API → Project URL | `SUPABASE_URL` (both .env files) |
| Project Settings → API → anon public key | `SUPABASE_ANON_KEY` (both .env files) |
| Project Settings → API → service_role key | `SUPABASE_SERVICE_ROLE_KEY` (backend/.env only — **never** commit this) |

See `supabase/README.md` for migration order and seed details.

## Project status

This is M0 (Foundations). Plan file: `C:\Users\pradh\.claude\plans\go-through-the-docs-jazzy-origami.md`

Roadmap milestones:
- **M0** — Foundations (current) ✓
- **M1** — Phase 1 public site (Home, About, Services, Doctors, Departments, Contact, Feedback)
- **M2** — Admin shell + catalog management
- **M3** — Patient auth + booking wizards (doctor appointments + test cart)
- **M4** — Razorpay payments + invoices + notifications
- **M5** — Reports + patient dashboard + home collection + walk-in bills
- **M6** — Admin operational tools (calendar, refunds, analytics)
- **M7** — Hardening + launch
# Arogya_Clinic
