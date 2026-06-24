# Tabibo — Deploy Runbook (this release)

This release adds five things on top of the existing app:

1. **Doctor↔patient roster** (`doctor_patients` table + directory view)
2. **Security / RLS hardening** (locked `doctors` table, appointment-edit guard, RIB read restricted)
3. **Live messaging + notifications** (Supabase Realtime)
4. **WhatsApp appointment reminders** (Edge Function + tables + hourly cron)
5. **Confirmation-at-booking + patient live chat thread**

Do the steps **in this order**. The database migrations must run before you deploy the frontend.

---

## 0. Prerequisites
- Supabase CLI logged in and linked to your project: `supabase link --project-ref <PROJECT_REF>`
- The four new migration files are already in `supabase/migrations/` and named so they sort **after** all existing ones.

---

## 1. Apply database migrations  ← do this FIRST

### 1a. First, check which migrations are already applied
**CLI (recommended):**
```bash
supabase migration list
```
You get a table with **Local** (files on disk) and **Remote** (applied to your DB).
A row that has a timestamp under **Remote** is already applied. Any row that shows
under Local but **blank under Remote** is *not yet applied* — those are the ones
`db push` will run. The four new ones below should currently show as Local-only.

**Or via SQL** (Supabase Dashboard → SQL editor):
```sql
select version
from supabase_migrations.schema_migrations
order by version;
```
This lists every applied migration's timestamp. If `20260623120000`, `20260623140000`,
`20260623150000`, `20260623160000` are **missing** from that list, they haven't run yet.

### 1b. Apply them
```bash
supabase db push
```
This applies only the migrations missing from **Remote**, in timestamp order — already-applied
ones are skipped automatically, so it's safe even though you've run earlier ones before.

> **If `supabase migration list` shows the base 18 migrations as Local-only too** (blank Remote) —
> meaning your DB was built by hand, not tracked by the CLI — do **not** run `db push` (it would try to
> recreate everything and error on "already exists"). Instead, open the SQL editor and paste **only these
> four files**, in order: `doctor_patients` → `rls_hardening` → `realtime` → `reminders`. They're written
> to be safe on a DB that already has the base schema, and each one is re-runnable (guarded with
> `if exists` / `if not exists`), so running one twice won't error.

The four new migrations are:

| File | What it creates |
|------|-----------------|
| `20260623120000_doctor_patients.sql` | `doctor_patients` roster table + `doctor_patient_directory` view + RLS |
| `20260623140000_rls_hardening.sql`   | locks `doctors` SELECT to owner/admin, appointment-update guard trigger, restricts `app_settings` (RIB) to signed-in users |
| `20260623150000_realtime.sql`        | publishes `messages` + `appointments` on `supabase_realtime` |
| `20260623160000_reminders.sql`       | `reminder_settings` + `reminder_log` tables + RLS (+ commented cron block) |

> ⚠️ **Test on staging first.** The `rls_hardening` migration changes who can read the `doctors` table. Public browsing/booking still works (it goes through the `doctor_directory` view), but verify it before production.

**Verify after push:**
- Dashboard → Database → Replication → `supabase_realtime` lists **messages** and **appointments**.
- Dashboard → Database → Tables shows `doctor_patients`, `reminder_settings`, `reminder_log`.

---

## 2. WhatsApp reminders (Edge Function)  — only if you want reminders/confirmations
Full detail in `supabase/functions/send-reminder/README.md`. Short version:

1. Create a **WhatsApp Cloud API** app in Meta → get **Phone number ID** + a **permanent token**.
2. Create & get approved a template named **`tabibo_reminder`** (lang `fr`) with 4 body placeholders:
   `{{1}}` patient · `{{2}}` date · `{{3}}` heure · `{{4}}` médecin.
3. Set secrets:
   ```bash
   supabase secrets set \
     WHATSAPP_TOKEN=...           \
     WHATSAPP_PHONE_ID=...        \
     WHATSAPP_TEMPLATE_REMINDER=tabibo_reminder \
     WHATSAPP_LANG=fr
   ```
4. Deploy:
   ```bash
   supabase functions deploy send-reminder
   ```
5. Schedule the hourly dispatch — in the Supabase **SQL editor**, run the commented
   `pg_cron` + `pg_net` block at the bottom of `20260623160000_reminders.sql`,
   replacing `<PROJECT_REF>` and `<SUPABASE_SERVICE_ROLE_KEY>`.

> Until WhatsApp secrets are set, confirmations/reminders are **logged as `failed`** with a
> clear "WhatsApp non configuré" message — nothing breaks, the dashboard just shows it's not live yet.

**Test it:**
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" \
  -d '{"type":"test","to":"+212600000000"}'
```

---

## 3. Frontend
No new environment variables — it uses the existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
(see `frontend/.env.example`).

```bash
cd frontend
npm install
npm run build      # must succeed before deploying
```
Deploy to Vercel as described in `DEPLOY.md` (Root Directory = `frontend`, Framework = Vite).

---

## 4. Unchanged but required
The pre-existing `notify-verification` Edge Function is **not** part of this release but must stay
deployed (needs `RESEND_API_KEY`). If it's already live, leave it.

---

## Order at a glance
```
1. supabase db push                       # migrations  (REQUIRED, first)
2. supabase secrets set WHATSAPP_*        # only for reminders
3. supabase functions deploy send-reminder
4. run the pg_cron block (SQL editor)     # hourly reminder dispatch
5. cd frontend && npm install && npm run build && deploy
```

---

## Smoke test after deploy
- **Roster:** doctor → Patients screen lists their patients.
- **RLS:** as an anonymous/other user in the browser console, `supabase.from('doctors').select('*')`
  returns only your own row or nothing (not every doctor's billing/coords). Patients can still browse & book.
- **Realtime chat:** open the doctor Messages screen and the patient Messagerie at once — a sent
  message appears on the other side instantly.
- **Booking:** create an appointment → a `confirmation` row appears in the doctor's
  "Rappels & Notifications" log (status `sent` if WhatsApp configured, else `failed` with a clear reason).
- **Toggles:** flip a reminder toggle, refresh — it persists.
</content>
