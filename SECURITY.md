# Tabibo — Security overview

This document summarises the security model of Tabibo and the controls added
during the security hardening pass. It's meant for whoever deploys or maintains
the app.

## Architecture in one paragraph

The browser talks directly to Supabase using the **public anon key**. That key is
*not* a secret — it is safe to ship. All protection comes from **Row Level
Security (RLS)** on every table, a set of **`SECURITY DEFINER` guard triggers**,
**column-level guards**, and **caller-authorized Edge Functions**. The
**service-role key is never in the frontend**; it lives only in Edge Function
secrets.

## Authentication & abuse protection

- **Email/password** via Supabase Auth. Turn **"Confirm email" ON** in
  Authentication → Providers → Email so fake addresses can't sign in instantly.
- **Phone login** is resolved and authenticated entirely server-side by the
  `phone-login` Edge Function. The account email is never exposed to the client,
  and unknown numbers are indistinguishable from wrong passwords (no enumeration).
- **CAPTCHA** (Cloudflare Turnstile) is wired into all four auth forms and
  enforced server-side by Supabase. The public site key is in
  `VITE_TURNSTILE_SITE_KEY`; the secret key lives in Supabase Auth settings.
  Deploy the frontend with the site key **before** enabling the secret in Supabase.

## Authorization model

- **Roles** (`patient` / `doctor` / `admin`) cannot be self-assigned. Signup can
  only ever produce `patient` or `doctor`; `admin` is mintable only via
  `promote_to_admin('email')` from the SQL editor. A trigger blocks any later
  attempt to change a user's own role.
- **Doctors** can edit only their *profile* columns. Moderation/billing/trust
  columns (`verification_status`, `blocked`, `subscription_status`,
  `trial_ends_at`, `period_start`, `billing_cycle`, `rating`, `reviews_count`)
  are pinned by a column-level guard trigger — only an admin (or the approved
  RPCs) can change them.
- **Appointments**: patients may only cancel; confirming/reassigning is
  doctor/admin only (guard trigger).
- **Public directory** (`doctor_directory` view) exposes only approved, unblocked,
  non-expired doctors and a safe subset of columns. The raw `doctors` table is
  owner/admin only.
- **Reviews** can only be written for the patient's own appointment once it is
  `completed`.
- **Storage**: `credentials` and `documents` buckets are private (owner/admin,
  folder-scoped); only `avatars` is public.

## Edge Functions

All functions use the service-role key, so each one **authorizes the caller** in
code (`authorize()`):

| Function | Who may call it |
|---|---|
| `phone-login` | anyone (it's the login endpoint); returns a uniform error |
| `notify-verification` · `test` / `decision` | admin only |
| `notify-verification` · `new_registration` / `payment_declared` | any logged-in user; confirmation mail goes to the caller's own account email |
| `notify-verification` · `appointment` | a party to the appointment, or admin |
| `send-reminder` · `dispatch` | service key only (pg_cron) |
| `send-reminder` · `send` | a party to the appointment, or admin |
| `send-reminder` · `test` | admin only |
| `invite-patient` | logged-in doctor or admin only |

All dynamic values interpolated into emails are HTML-escaped.

### The "Verify JWT" toggle

Because every function does its own auth, the Supabase "Verify JWT with legacy
secret" gateway toggle is **optional** (Supabase recommends OFF when you have
custom auth logic). Keep `send-reminder` **OFF** so its pg_cron service-role call
is never bounced at the gateway. The protection is the in-code `authorize()`
gate, which works regardless of the toggle.

## Deploy checklist

```bash
# 1. Database
supabase db push

# 2. Edge Functions (must be redeployed for the auth gates to take effect)
supabase functions deploy phone-login
supabase functions deploy notify-verification
supabase functions deploy send-reminder
supabase functions deploy invite-patient

# 3. Frontend  (set VITE_TURNSTILE_SITE_KEY in the host env, then build)
cd frontend && npm run build      # and deploy dist/
```

Dashboard toggles to confirm:
- Authentication → Providers → Email → **Confirm email: ON**
- Authentication → Attack Protection → **CAPTCHA: ON** (Turnstile secret set)
- `send-reminder` → **Verify JWT: OFF**

## Operational notes

- Audit admins periodically: `select email, role from public.users where role='admin';`
- The service-role key and `RESEND_API_KEY` / WhatsApp / Twilio creds live only in
  Supabase Edge Function secrets — never commit them.
- This app handles health data (CIN, medical info). An independent security review /
  penetration test is strongly recommended before scaling real patient usage.

## Reporting

Found a vulnerability? Email security@tabibo.ma (update to your real contact) with
details and reproduction steps. Please don't open a public issue for security bugs.
