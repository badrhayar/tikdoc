# Tabibo — Production-Readiness Security Review

Full-codebase review (frontend, edge functions, SQL/RLS, storage, scripts,
infra config) against OWASP Top 10 / ASVS L2. Three parallel audits (database
layer, server layer, frontend+infra) followed by fixes, a regression pass
(build + full E2E green), and this report.

**Deploy checklist for this review:** `supabase db push` (migration
`20260727120000_security_hardening_2.sql`) · redeploy **all 5 functions**
(`invite-patient notify-verification send-reminder guest-booking phone-login`)
· deploy frontend (vercel.json header change requires a redeploy).

---

## Issues found & FIXED

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **High** | Patients could rewrite cabinet-owned columns of their own appointment (`paid`, `amount_paid`, `fee`, `consult_note`, `notes`, `datetime`, `duration_minutes`…) — payment-record and clinical-note tampering, and self-reschedule bypassing booking guards. | `guard_appt_update` now pins every cabinet-owned column for the patient actor; a patient can *only* cancel. Doctors/staff/admin unrestricted; service-role (reminder dispatcher) escapes via `auth.uid() is null`. Verified: patient UI only ever cancels → no behavior change. |
| 2 | **High** | CSP shipped as `Content-Security-Policy-Report-Only` — browser blocked nothing. | Switched to an enforcing `Content-Security-Policy` in `vercel.json` (same policy, plus map-tile hosts in `img-src`). All other headers (HSTS+preload, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy) were already enforced. |
| 3 | **High** | `invite-patient` accepted any caller-supplied `https://…` link — the branded trilingual email/WhatsApp became a phishing relay for any doctor account. | Link host allowlisted (`tabibo.ma`, `www.tabibo.ma`, `APP_URL` host); anything else falls back to the canonical origin. |
| 4 | **Medium** | `notify-verification`: rejection `reason` interpolated into email HTML **unescaped**; approval CTA `href` was caller-controlled (`p.appUrl`). | `esc(reason)`; CTA pinned to the `APP_URL` env. |
| 5 | **Medium** | Guest-booking OTP generated with `Math.random()` (predictable PRNG). | `crypto.getRandomValues` (verified range 100000–999999). Hashing, 5-attempt cap, 10-min expiry, single-use, per-phone/IP limits were already in place. |
| 6 | **Medium** | `phone-login`: no rate limit; unknown-number vs wrong-password timing difference = phone-enumeration oracle. | New service-only `login_throttle` table (RLS default-deny) — max 20 attempts / phone or IP / 10 min, uniform response; random 180–400 ms jitter flattens the unknown-number path. Limiter is fail-open so an outage can never block logins. |
| 7 | **Medium** | `notify-verification`: `new_registration` and `payment_declared` were callable by ANY authenticated user → admin spam / social-engineering channel. | Both branches now require the `doctor` role (or admin/service). All legitimate callers verified to be authenticated doctors. |
| 8 | **Medium** | Blind SSRF: web-push endpoints (client-supplied at subscribe time) were fetched server-side unvalidated → probes at cloud metadata / intranet. | `isSafePushEndpoint()`: https-only, default port, no IP literals / localhost / `.local`/`.internal`; unsafe rows are pruned. Tested against 11 cases incl. `169.254.169.254`. |
| 9 | **Low** | A `patient` account could insert a stray `doctors` row for itself. | `doctors_insert` policy now requires `role='doctor'` (or admin). |
| 10 | **Low** | Doctor's verified `cnom` (Ordre des Médecins number) editable after approval → credential fraud. | `guard_doctor_status` freezes `cnom` once `verification_status='approved'` (admin can still correct; pre-approval typo fixes still work). |
| 11 | **Low** | Raw exception text (`String(e)`, DB `error.message`) returned in 500s → internals disclosure. | Generic `"server_error"` to clients; details go to server logs only. (Kept: admin-gated `admin-delete-user` messages — recipient is the operator; and intentional French 4xx validation messages.) |
| 12 | **Low** | Resend error responses (may contain recipient emails) logged in full. | Log status code only. |
| 13 | **Low** | Unauthenticated `ping` on send-reminder leaked a version fingerprint. | `version` removed; config booleans kept (needed by the smoke test; no secret values were ever exposed). |
| 14 | **Low** | `client_errors` monitor stored `location.href` — the invite flow's `/pregister?email=…` would put patient emails in an ops table. | Store `origin + pathname` only, query string stripped. |
| 15 | **Low** | Prescription `ref` was time-derived (~guessable) — `verify_prescription` is a public RPC, so refs must be unguessable. | Crypto-random 10-char reference (no ambiguous chars; ~50 bits). |
| 16 | **Low** | Uploads: no client-side type/size checks; `uploadDocument` used the raw filename in the storage key. | Extension allowlists (images-only for avatar/chat; +pdf/doc/xls/txt for documents), size caps (5/8/15 MB), and filename sanitization. Storage RLS remains the authoritative gate. |
| 17 | **Low** | Print-sheet `esc()` only escaped `&` and `<` (fragile if a value moves into an attribute). | Full 5-char HTML escaping. |
| 18 | **Low** | Backup dumps (patient data) written with default umask. | `umask 077` at the top of `scripts/backup.sh`. |
| 19 | **Low** | No CI security gates. | `.github/workflows/security.yml`: `npm audit` (fail on high) + gitleaks secret scan, active once the repo is on GitHub. |
| 20 | **Info** | `notify-verification` parsed JSON without `.catch` (500 on malformed body); `invite-patient` passed unchecked `p.name` to the WhatsApp API. | `.catch(() => ({}))`; `String(p.name ?? "").slice(0,120)`. |

## Verified SAFE (no action needed)

- **RLS enabled on all 25 tables**; tenant isolation verified table-by-table
  (appointments, messages, documents, prescriptions, payments, staff,
  reminders, waitlist, relatives, push subscriptions…). No `using (true)`
  write policies (one intentional: `client_errors` insert — see residual).
- **Privilege escalation closed**: users cannot change their own `role`
  (signup clamp + update guard + insert clamp); doctors cannot self-approve,
  un-block, extend their subscription, or fake `rating`/`reviews_count`
  (trigger guards on UPDATE and INSERT). `promote_to_admin` and the dispatcher
  RPC revoked from anon/authenticated.
- **All SECURITY DEFINER functions pin `search_path`**; admin-only RPCs
  re-check `is_admin()` internally; `email_for_phone` restricted to
  service_role (no phone→email oracle).
- **Public views** (`doctor_directory`, `doctor_reviews`, `company_contact`)
  expose only intended columns; reviewer identity anonymized.
- **Storage**: `documents`, `credentials`, `chat-media` private with
  owner/participant-scoped policies; writes folder-scoped to `auth.uid()`.
- **No SQL string-building, no shell exec, no eval / dangerouslySetInnerHTML**
  anywhere; React auto-escaping covers all render paths.
- **No secrets committed** (anon key + Turnstile site key are public by
  design); `.gitignore` covers `.env*`, backups, keystores; TWA config holds
  no key material.
- **Service worker** never caches Supabase/API responses; runtime caches are
  purged on sign-out; navigations are network-first.
- **Auth**: Turnstile CAPTCHA on register/login; passwords never persisted or
  logged; uniform `invalid_credentials` on phone login.
- **CORS `*` on functions is safe** — bearer-token auth, no cookies, no
  `Allow-Credentials` (browsers never auto-attach the token cross-origin).
  CSRF does not apply (no cookie-based sessions).
- **Reviews**: only patients with a `completed` appointment can review;
  patients cannot self-complete (guard); doctor replies column-limited.
- **`npm audit`: 0 known vulnerabilities** (prod + dev); lockfile present.
- **All `target="_blank"` links carry `rel="noopener"`/`noreferrer`.**

## Residual risks (accepted, documented)

1. **`avatars` bucket is public-read** — needed for the public doctor
   directory, but patient avatars share it. *Future:* split patient avatars
   into a private bucket served via signed URLs.
2. **`client_errors` accepts anonymous inserts** — by design (errors from
   logged-out visitors matter); rows are length-capped, deduped client-side,
   admin-read-only. *Future:* per-IP cap in an edge function.
3. **CSP keeps `'unsafe-inline'`** for scripts/styles — required by the inline
   boot script and inline-style architecture. Compensated by zero injection
   sinks + React escaping. *Future:* hash the boot script, move styles.
4. **Rate limiting relies on function-level counters + Supabase Auth limits**;
   there is no WAF/edge rate limit in front of Vercel/Supabase. *Future:*
   enable Vercel WAF / Supabase rate-limit settings for defense-in-depth.
5. **`accountExists` (invite) scans up to 2000 user phones in memory** —
   service-side performance concern, not a vulnerability. *Future:* store a
   normalized `phone_key` column and query it directly.
6. **Push endpoint allowlist is deny-list-based** (blocks private/metadata
   hosts) rather than a strict allowlist of known push services — chosen to
   avoid breaking niche browsers. Payloads are encrypted; residual is minimal.

## Recommended future improvements

- Enable **Supabase Auth leaked-password protection** and MFA for admin
  accounts (dashboard settings — outside the repo).
- **pgAudit / access logging** for reads of medical data (compliance-grade
  audit trail).
- Periodic key rotation (service key, VAPID pair — the old exposed VAPID key
  must be treated as burned and regenerated before launch).
- Add the **security workflow to a real GitHub repo** so the CI gates run.
- Consider Sentry-style scrubbing rules if `client_errors` grows into a
  full telemetry pipeline.
