# WhatsApp appointment reminders — setup

Everything is built except the parts that need *your* provider account. Follow
these steps to go live.

## 1. Create a WhatsApp Cloud API app (Meta)
1. Go to https://developers.facebook.com → create an app → add **WhatsApp**.
2. Note the **Phone number ID** and generate a **permanent access token**
   (System User token with `whatsapp_business_messaging`).
3. Add and verify your business phone number.

## 2. Create the approved message template
WhatsApp requires a pre-approved template for business-initiated messages.
Create one named **`tabibo_reminder`** (language **French / `fr`**) with a body
that has **4 placeholders in this order**:

> Bonjour {{1}}, rappel de votre rendez-vous le {{2}} à {{3}} avec {{4}}.
> Répondez ANNULER pour annuler. — Tabibo

`{{1}}` patient · `{{2}}` date · `{{3}}` heure · `{{4}}` médecin.

## 3. Set the function secrets
```bash
supabase secrets set \
  WHATSAPP_TOKEN=EAAG...                 \
  WHATSAPP_PHONE_ID=123456789012345      \
  WHATSAPP_TEMPLATE_REMINDER=tabibo_reminder \
  WHATSAPP_LANG=fr
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
```

## 4. Deploy
```bash
supabase functions deploy send-reminder
supabase db push        # applies 20260623160000_reminders.sql
```

## 5. Schedule the hourly dispatch
In the Supabase SQL editor, run the commented block at the bottom of
`20260623160000_reminders.sql`, replacing `<PROJECT_REF>` and
`<SUPABASE_SERVICE_ROLE_KEY>`. It registers a `pg_cron` job that POSTs
`{"type":"dispatch"}` to the function every hour. The function then finds
appointments 24 h / 48 h out, respects each doctor's toggles, skips anything
already sent, and logs the result to `reminder_log`.

## Test it
```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" \
  -d '{"type":"test","to":"+212600000000"}'
```
Or from the app, call `sendReminderTest(phone)` (already exported in `lib/api.js`).

## Modes
| `type`     | What it does                                                    |
|------------|-----------------------------------------------------------------|
| `dispatch` | Hourly scan of the J-1 / J-2 windows (the cron job).            |
| `send`     | One reminder for `{ appointment_id, template }` (e.g. on booking). |
| `test`     | Sends a template message to `{ to }` to verify configuration.   |

If `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` are missing, attempts are logged with
status `failed` and a clear error, so the dashboard tells you it's not yet
configured rather than failing silently.
