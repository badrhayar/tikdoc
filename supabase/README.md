# TikDoc · Supabase backend

SQL migrations and setup for the TikDoc database.

## Migrations (run in order)

| File | Purpose |
|------|---------|
| `20260615120000_schema.sql` | Tables, enums, indexes, helper functions, public `doctor_directory` view |
| `20260615120001_rls.sql`    | Row Level Security policies (patient / doctor / admin) |
| `20260615120002_storage.sql`| Private `documents` bucket + storage policies |
| `20260615120003_seed.sql`   | 20 demo doctors (idempotent; delete once you have real data) |

## How to apply

### Option A — Dashboard (no tooling)
1. Open your project → **SQL Editor**.
2. Paste each file's contents **in order** and click **Run**.

### Option B — Supabase CLI
```bash
npm install -g supabase
supabase link --project-ref <your-project-ref>
supabase db push          # applies everything in supabase/migrations
```

## Auth model
- `public.users.auth_id` links a profile to a Supabase Auth user.
- RLS resolves the current profile via `app_uid()` and role via `is_admin()`
  (both `SECURITY DEFINER` to avoid policy recursion).
- On sign-up, create a matching `public.users` row (handled in the app, or add a
  trigger on `auth.users`).

## Frontend env
Copy `frontend/.env.example` → `frontend/.env` and set:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
