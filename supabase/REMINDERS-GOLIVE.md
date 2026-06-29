# Going live with WhatsApp reminders

The reminder engine (Edge Function `send-reminder` + `reminder_settings` /
`reminder_log` tables + the doctor toggles UI) is **code-complete**. To make it
actually send, do these four steps once.

## 1. Create the WhatsApp Cloud API app (Meta)
- developers.facebook.com → create app → add **WhatsApp**.
- Note the **Phone number ID** and generate a **permanent** access token.
- Create & get approved an **fr** message template named `tabibo_reminder` with 4
  body placeholders in order: `{{1}}` patient · `{{2}}` date · `{{3}}` heure · `{{4}}` médecin.
  (Optionally also `tabibo_booked`, `tabibo_confirmed`, `tabibo_cancelled`.)

## 2. Set the function secrets
```bash
supabase secrets set \
  WHATSAPP_TOKEN=EAAG... \
  WHATSAPP_PHONE_ID=123456789012345 \
  WHATSAPP_TEMPLATE_REMINDER=tabibo_reminder \
  WHATSAPP_LANG=fr
supabase functions deploy send-reminder
```

## 3. Verify with a test
From the doctor app (Notifications page) send a test, or:
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" \
  -d '{"type":"test","to":"+2126XXXXXXXX"}'
```

## 4. Schedule the hourly dispatch (no plaintext secret — uses Vault)
Run once in the Supabase SQL editor. Storing the key in Vault keeps it out of the
cron definition and out of git.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the service-role key once (Vault is encrypted at rest).
select vault.create_secret('<SUPABASE_SERVICE_ROLE_KEY>', 'service_role_key');

-- Hourly: POST {"type":"dispatch"} to the function, reading the key from Vault.
select cron.schedule(
  'tabibo-hourly-reminders', '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := jsonb_build_object('type', 'dispatch')
  );
  $$
);
```

The function authorizes that call by recognizing the service-role key (see the
`authorize()` gate). The `dispatch` branch scans the J-1 / J-2 windows, respects
each doctor's toggles, skips anything already sent, and logs to `reminder_log`.

To change cadence or stop: `select cron.unschedule('tabibo-hourly-reminders');`
