# Tabibo — Final Pre-Production Security Audit

Full-codebase audit against **OWASP Top 10** and **OWASP ASVS Level 2**, assuming
every previously-reported issue is fixed and hunting only for **new** findings.
Nine independent reviewers swept, in parallel, the surfaces below; each confirmed
finding was then re-verified against source, fixed, and the whole app re-built +
E2E-tested (green).

**Coverage:** every backend edge endpoint · every table's RLS · all SECURITY
DEFINER functions & RPC grants · the auth / role / JWT / email-verification flow
· file upload & storage/signed-URL authz · the WhatsApp/OTP + declared-payment
flows · the appointment workflow · document (PHI) exchange · review integrity ·
PDF/print HTML sinks · infrastructure (CSP/headers/CORS/service-worker/secrets/CI).

**Deploy checklist for this round**
- `supabase db push` → migration `20260729120000_final_audit_fixes.sql`
- redeploy 3 functions: `phone-login`, `guest-booking`, `send-reminder`
- deploy frontend (vercel.json CSP change + 2 JS hardening edits; SW → `tabibo-v88`)

---

## New findings — FIXED

| # | Severity | Component | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | **Critical** | DB / RPC | `claim_by_verified_email(uuid,text)` — introduced by the prior walk-in-takeover fix — was `SECURITY DEFINER` but **never revoked**, so it kept PostgREST's default PUBLIC execute. It takes uid+email as args and verifies neither, so any authenticated user could `rpc('claim_by_verified_email', {p_uid: me, p_email: victim})` and reassign every unclaimed walk-in appointment / doctor-patient row for that email to themselves — **re-opening the exact PHI account-takeover the migration claimed to close** (guard_appt_update doesn't pin `patient_id`; the fn runs as definer so RLS never fires). | `revoke all … from public, anon, authenticated`. Triggers still execute (owner-rights), so the verified-email claim flow is unaffected. |
| 2 | **High** | Storage / documents | The private `documents` bucket's storage-read policy authorizes via `can_read_document_object(name)`, which trusts a row in `public.documents` whose `file_url` the same actor can INSERT unconstrained. A patient could insert `{patient_id: me, file_url: '<victim_uid>/<file>'}` and mint a signed URL to **any** stranger's medical file — repeatable forever, defeating unshare/revocation. | INSERT now requires the referenced object to live in the **caller's own** storage folder (`foldername(file_url)[1] = auth.uid()`); `can_read_document_object` additionally requires the row's declared owner to actually own that folder, so pre-existing forged rows can't match either. |
| 3 | **High** | Appointments / billing | `guard_appt_update` pins the money/status columns for the patient actor **only on UPDATE**. The patient INSERT path (added by the walk-in fix) enforced scheduling only, so a patient calling the REST API directly could create a row with `paid=true, amount_paid=0, status='confirmed'` or an arbitrary/negative `fee` — self-confirming the visit and poisoning cabinet revenue stats. | Patient-branch of `guard_appt_insert_rules` now forces `paid=false`, `amount_paid/pay_method=null`, `status='pending'`, and derives `fee` server-side from the doctor default; a non-negativity CHECK backstops the money columns. |
| 4 | **High** | Edge / guest-booking | Unauthenticated **relationship enumeration oracle**: in `start`, the identity-dependent refusals (existing booking / ≥3 no-shows / blocklist) returned distinct 403 messages **before** any `booking_otps` row was written, so probes never consumed rate-limit quota. With a public `doctorId`, an attacker could iterate phone numbers and learn each one's booking/no-show/blocklist history with that doctor. | Those checks now run **only in `verify`** (after the OTP proves phone ownership — they were already re-run there); `start` performs only the public cabinet-closed check, so every probe now sends an OTP and consumes quota. |
| 5 | **Medium** | Storage / documents | Even with the own-folder fix, `documents_insert` still authorized on `owner_id = app_uid()` alone, letting a patient set an arbitrary (public) `doctor_id` + `notes` on a file they uploaded — **injecting a forged "lab result / prescription"** into the records of a doctor they have no relationship with. | Patient may file a document only to a doctor they have a real **appointment or conversation** with, only attributed to themselves, only from their own folder. Both legitimate flows (patient→doctor with an existing appointment; doctor→patient via `owns_doctor`) still pass. |
| 6 | **Medium** | Edge / phone-login | The brute-force limiter trusted the client-controllable **left-most `X-Forwarded-For`** token and string-interpolated it into a PostgREST `.or()` filter. A crafted header made the count query 400 → supabase-js returns `count:null` → `0 >= 20` false → **the limiter failed open**, enabling unlimited password guessing. | Rewrote to two **parameterized `.eq()`** counts (no interpolation); per-phone count **fails closed**; client IP now taken from the trustworthy last XFF hop and sanitized to IP chars. |
| 7 | **Medium** | Reviews | A doctor could **fabricate reviews on their own profile**: self-book (owns_doctor skips every patient gate), self-complete (owns_doctor unrestricted on update), then insert a 5★ review — repeatable. | `reviews_insert`/`_update` now reject any review whose appointment belongs to a doctor the reviewer owns (`not owns_doctor(a.doctor_id)`). |
| 8 | **Medium→Low** | Edge / IP trust | Rate-limit keys in guest-booking & phone-login used the spoofable first XFF token, so the per-IP cap was defeated by rotating the header (guest-booking: WhatsApp-OTP cost/spam abuse). | Both now derive the client IP from the last XFF hop, sanitized. Non-spoofable phone/identifier limit remains the primary control. |
| 9 | **Low** | Edge / phone-login | Residual **timing oracle**: jitter was applied only to the unknown-number branch; the wrong-password branch did real bcrypt with no jitter, so latency distinguished "registered" from "unknown". | Unknown-number branch now performs an equivalent anon sign-in against a bogus email; uniform jitter on every failure exit. |
| 10 | **Low** | Edge / send-reminder | The top-level catch returned `String(e)` — raw exception text — to the caller (the only function that still did). | Returns generic `"server_error"`; details stay in server logs. |
| 11 | **Low** | Edge / guest-booking | `name`/`reason` were persisted with no upper bound (multi-MB writes per booking). | Capped to 120 / 500 chars, matching `invite-patient`. |
| 12 | **Low** | DB / RPC grants | `promote_to_admin` revoke omitted `PUBLIC` (already unexploitable — `guard_user_role` blocks the role change — but inconsistent); `user_id_for_email` was an email→uuid oracle for any authenticated user. | Revoke `promote_to_admin` from PUBLIC too; restrict `user_id_for_email` to `service_role` (its only real caller). |
| 13 | **Low** | Infra / CSP | CSP had no `frame-ancestors` (only the legacy `X-Frame-Options: DENY`). | Added `frame-ancestors 'none'`. |
| 14 | **Low** | Infra / print sheets | `BookingShare` poster's `esc()` omitted `'` and left `prettyLink` unescaped (self-XSS only — reflects the doctor's own name/slug); `History.jsx` CSV export didn't neutralize leading `= + - @` (spreadsheet formula injection on open). | Full 5-char escape + escaped `prettyLink`; CSV cells starting with a formula char are prefixed with `'`. |
| 15 | **Low** | Infra / hygiene | A full source archive (`tabibo-FULL-project.zip`) sat in the repo root, un-git-ignored (would silently capture secrets if re-exported after wiring env). CI `npm audit` skipped build/dev deps (a real bundler supply-chain gap). | Deleted the archive, added `*.zip` to `.gitignore`; added a second unfiltered `npm audit` step. |

---

## Reviewed — appears secure (with the control that makes it so)

- **Privilege escalation (patient→doctor/admin, doctor self-approve/unban/upgrade):**
  role is server-clamped at signup (`handle_new_user`), pinned on update
  (`guard_user_role`) and insert (`guard_user_insert`); `doctors_insert` requires
  an account already `role='doctor'`; `guard_doctor_status` pins
  moderation/billing/trust columns and forbids self-`approved`; `cnom` frozen
  post-approval. `promote_to_admin` is neutralized by `guard_user_role` regardless
  of grant. **No escalation path found.**
- **Email-verification claim** (`claim_on_email_confirm`/`claim_by_verified_email`):
  fires only on the `null→confirmed` transition, resolves the account by
  `auth_id`, claims strictly by the GoTrue-confirmed address scoped to that user —
  a doctor-typed `patient_email` can be claimed **only** by whoever proves that
  mailbox. (The exposure was the *callability* of the helper — Finding 1 — not its
  logic.)
- **Tenant isolation** on `waitlist`, `patient_relatives`, `doctor_patients`,
  `messages`, `push_subscriptions`, `doctor_staff`, `reminders`, `prescriptions`:
  RLS enabled on **all 26 tables**; every policy scopes to `app_uid()`/`owns_doctor`
  with matching WITH CHECK on writes. No cross-patient or cross-cabinet read; no
  `using(true)` write policy on PHI. `relatives` links are not attacker-assertable.
- **Subscription/billing:** doctor cannot self-grant/extend (all billing columns
  pinned); `declare_payment`/`declare_current_payment` only reach `'declared'`,
  never `'paid'`; activation is admin-only (`admin_renew_subscription`) with a
  server-computed amount; payment approval is `is_admin()`-gated with no IDOR
  (doctor writes scoped by `owns_doctor`).
- **admin-delete-user / notify-verification / send-reminder / invite-patient:**
  every privileged branch re-checks the caller's **DB role** (not a client claim);
  recipients are the caller's own account or DB-derived; all dynamic email/WhatsApp
  values are `esc()`-escaped; the invite link host is all[list]ed; push-endpoint
  **SSRF** is blocked by `isSafePushEndpoint`. CORS `*` is safe (bearer auth, no
  cookies, no `Allow-Credentials`).
- **Guest-booking OTP core:** CSPRNG code, `sha256(code+phone)`, 10-min expiry,
  single-use, 5-attempt cap; phone ownership proven before any appointment;
  double-booking closed by the unique index.
- **Injection/XSS:** every DB call is a parameterized supabase-js builder (no
  string-built SQL); prescriptions/receipts render through jsPDF `doc.text()`
  (glyphs, not markup); the one patient-data HTML sink (day-sheet print) fully
  escapes; no `dangerouslySetInnerHTML` anywhere.
- **Infra:** CSP enforcing (not Report-Only), tight `connect-src`, `object-src
  'none'`, HSTS+preload, XFO DENY, nosniff, Referrer/Permissions-Policy; SW never
  caches Supabase/auth responses and purges on sign-out; no secrets in tracked
  source/bundle (VAPID **private** key not in repo — still must be rotated before
  launch, it was exposed earlier); `parseDeepLink` slug is regex-validated (no open
  redirect); `npm audit` clean; all `target=_blank` carry `rel=noopener`.

---

## Residual / accepted (documented, not fixed this round)

1. **CSP keeps `script-src 'unsafe-inline'`** — required by the inline boot/self-heal
   script and the preview redirect. Moving to per-script SHA-256 hashes is the
   correct next step but needs build-time hash automation to avoid breaking the SPA;
   deferred deliberately. Compensated by zero confirmed injection sinks + React
   auto-escaping.
2. **Rating source of truth is frozen** (correctness, not a vuln): the live-rating
   view was reverted in a later migration, so the headline ★/count show seed values
   and never move with real reviews. This currently *masks* Finding 7's numeric
   impact. Recommendation: restore the live view (now safe — self-review is blocked)
   or add a recompute trigger, and decide on one source of truth before launch.
3. **Reviews are anonymous to the public but not to the reviewed doctor** (inherent:
   the doctor knows their own schedule). If reviewer anonymity is a hard promise,
   drop `appointment_id` from the base table's public SELECT.
4. **Authenticated notification relays** (invite-patient / booked email): content is
   escaped and recipients constrained, so this is spam/cost abuse behind a real
   account — recommend a modest per-caller daily send quota.
5. Pre-existing accepted residuals from the prior review still stand (public
   `avatars` bucket, anonymous `client_errors` insert, no edge WAF).

---

## Verification
`npm run build` ✓ · E2E (all screens @ 1366/390/360 px + demo flows) ✓ · migration
`$$`-balanced, 2 functions + 3 policies + targeted revokes, signatures checked
against source. No functional regressions: every fix was confirmed against the
real call sites (patient booking sends exactly the pinned values; both document
flows are relationship-backed; the deferred guest checks are re-run in `verify`).
