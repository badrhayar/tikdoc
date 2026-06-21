// ─────────────────────────────────────────────────────────────────────────────
// TikDoc data-access layer
// Thin wrappers around Supabase queries. Each function returns plain objects
// shaped the way the existing UI expects (see shared.jsx DOCTORS), so screens
// can switch from mock data to Supabase with minimal changes.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient';

// Map a row from the public `doctor_directory` view to the shape the UI uses.
function mapDoctor(row) {
  return {
    id: row.id,
    name: row.full_name,
    spec: row.specialty,
    city: row.city,
    clinic: row.clinic_address,
    rating: Number(row.rating) || 0,
    reviews: row.reviews_count || 0,
    price: row.fee_mad || 0,
    conv: !!row.cnss_cnopss,
    tele: !!row.teleconsultation,
    langs: row.languages || [],
    exp: row.experience_years || 0,
    bio: row.bio || '',
    next: row.next_available || 'today',
    x: row.map_x ?? 45,
    y: row.map_y ?? 55,
    maxPerDay: row.max_per_day || 0,
    prayerBlock: !!row.prayer_block,
    prayerIds: row.prayer_ids || [],
    services: Array.isArray(row.services) ? row.services : [],
    avatar: row.avatar_url || '',
  };
}

// ── Doctors ──────────────────────────────────────────────────────────────────

/**
 * Fetch the public doctor directory with optional filters/sorting.
 * @param {object} f { q, spec, city, type: 'all'|'cabinet'|'tele', conv, sort }
 */
export async function fetchDoctors(f = {}) {
  let query = supabase.from('doctor_directory').select('*');

  if (f.spec && f.spec !== 'all') query = query.eq('specialty', f.spec);
  if (f.city && f.city !== 'all') query = query.eq('city', f.city);
  if (f.type === 'tele') query = query.eq('teleconsultation', true);
  if (f.conv) query = query.eq('cnss_cnopss', true);
  if (f.q) query = query.or(`full_name.ilike.%${f.q}%,clinic_address.ilike.%${f.q}%`);

  if (f.sort === 'rating') query = query.order('rating', { ascending: false });
  else if (f.sort === 'price_asc') query = query.order('fee_mad', { ascending: true });
  else if (f.sort === 'price_desc') query = query.order('fee_mad', { ascending: false });
  else query = query.order('rating', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  let list = (data || []).map(mapDoctor);
  // 'cabinet' = in-person practices (the inverse filter is left client-side so a
  // doctor offering both still shows under 'tele').
  if (f.type === 'cabinet') list = list.filter((d) => !d.tele);
  return list;
}

export async function fetchDoctorById(id) {
  const { data, error } = await supabase
    .from('doctor_directory')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapDoctor(data);
}

/** A doctor's weekly availability rows (public). */
export async function fetchAvailability(doctorId) {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Appointments ─────────────────────────────────────────────────────────────

/**
 * Book an appointment. Requires an authenticated patient — RLS enforces that
 * patient_id matches the signed-in user, so pass the current app user id.
 * @returns the inserted appointment row
 */
export async function createAppointment({ patientId, doctorId, datetime, reason, notes }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      datetime,
      reason: reason || null,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Doctor-created appointment. The patient may be an existing account
 * (`patientId`) or a walk-in identified by name/phone (no account yet). These
 * persist in the DB so the booking calendar greys the slot out for patients.
 */
export async function createWalkinAppointment({ doctorId, datetime, reason, notes, patientId = null, patientName = null, patientPhone = null }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      doctor_id: doctorId,
      patient_id: patientId,
      datetime,
      reason: reason || null,
      notes: notes || null,
      patient_name: patientName || null,
      patient_phone: patientPhone || null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function fetchMyAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(id, specialty, city, clinic_address, fee_mad), patient:users(full_name, phone)')
    .order('datetime', { ascending: true });
  if (error) throw error;
  const rows = data || [];

  const ids = [...new Set(rows.map((r) => r.doctor_id))];
  let nameById = {};
  if (ids.length) {
    const { data: dir } = await supabase
      .from('doctor_directory')
      .select('id, full_name')
      .in('id', ids);
    nameById = Object.fromEntries((dir || []).map((d) => [d.id, d.full_name]));
  }
  return rows.map((r) => mapAppointment(r, nameById));
}

// Flatten a joined appointment row into the shape the UI consumes.
export function mapAppointment(row, nameById = {}) {
  const d = row.doctor || {};
  return {
    id: row.id,
    datetime: row.datetime,
    status: row.status,
    reason: row.reason,
    notes: row.notes,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    doctorName: nameById[row.doctor_id] || 'Médecin',
    patientName: row.patient?.full_name || row.patient_name || 'Patient',
    patientPhone: row.patient?.phone || row.patient_phone || '',
    spec: d.specialty || '',
    clinic: d.clinic_address || '',
    city: d.city || '',
    fee: d.fee_mad || 0,
  };
}

// French status labels shared across doctor screens.
export const STATUS_FR = {
  pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé',
  cancelled: 'Annulé', no_show: 'Absent',
};

const pad = (n) => String(n).padStart(2, '0');

// Map a DB appointment to the legacy "consultation" shape used by the doctor's
// Calendar / History / Statistics screens, so they all render real data.
export function apptToConsultation(a) {
  const d = new Date(a.datetime);
  const status =
    a.status === 'completed' ? 'Payé'
    : a.status === 'cancelled' || a.status === 'no_show' ? 'Annulé'
    : 'En attente';
  return {
    id: a.id,
    patient: a.patientName || 'Patient',
    age: 0,
    sex: '',
    service: a.reason || 'Consultation générale',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    amount: a.fee || 0,
    pay: '—',
    status,
    notes: a.notes || '',
  };
}

export async function updateAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Create the doctors row for the currently signed-in doctor user. */
export async function createDoctorProfile(appUserId, p) {
  const { data, error } = await supabase
    .from('doctors')
    .insert({
      user_id: appUserId,
      specialty: p.specialty,
      city: p.city,
      clinic_address: p.clinicAddress || null,
      fee_mad: p.feeMad ? Number(p.feeMad) : null,
      languages: p.languages || [],
      cnss_cnopss: !!p.cnssCnopss,
      teleconsultation: !!p.teleconsultation,
      bio: p.bio || null,
      cnom: p.cnom || null,
      verification_status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/** Resolve the current app user's profile row (public.users) from the session. */
export async function getCurrentAppUser() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Bookable slots ────────────────────────────────────────────────────────────
/** Times already booked for a doctor on a given Morocco-local date (HH:MM[]). */
export async function fetchBookedSlots(doctorId, dateISO) {
  const { data, error } = await supabase.rpc('doctor_booked_slots', { d: doctorId, day: dateISO });
  if (error) throw error;
  return (data || []).map((r) => (typeof r === 'string' ? r : r.slot));
}

/** Slots a doctor disabled on a specific date (HH:MM[]). Public. */
export async function fetchBlockedSlots(doctorId, dateISO) {
  const { data, error } = await supabase
    .from('slot_blocks')
    .select('slot')
    .eq('doctor_id', doctorId)
    .eq('block_date', dateISO);
  if (error) throw error;
  return (data || []).map((r) => r.slot);
}

/** Replace the blocked slots for one doctor on one date. */
export async function saveBlockedSlotsForDate(doctorId, dateISO, slots) {
  const del = await supabase
    .from('slot_blocks')
    .delete()
    .eq('doctor_id', doctorId)
    .eq('block_date', dateISO);
  if (del.error) throw del.error;
  if (slots.length) {
    const { error } = await supabase
      .from('slot_blocks')
      .insert(slots.map((s) => ({ doctor_id: doctorId, block_date: dateISO, slot: s })));
    if (error) throw error;
  }
  return true;
}

/** Update a doctor's planning preferences. */
export async function saveDoctorPlanning(doctorId, { maxPerDay, prayerBlock, prayerIds }) {
  const { error } = await supabase
    .from('doctors')
    .update({
      max_per_day: Number(maxPerDay) || 0,
      prayer_block: !!prayerBlock,
      prayer_ids: prayerIds || [],
    })
    .eq('id', doctorId);
  if (error) throw error;
  return true;
}

/** Update arbitrary columns on the current doctor's row (bio, city, …). */
export async function updateDoctorFields(doctorId, fields) {
  const { error } = await supabase.from('doctors').update(fields).eq('id', doctorId);
  if (error) throw error;
  return true;
}

// ── Platform settings (RIB) ───────────────────────────────────────────────────
export async function fetchAppSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data || { rib: '', bank: '' };
}

/** Admin only — update the platform RIB / bank shown on invoices. */
export async function saveAppSettings({ rib, bank }) {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ rib, bank, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Admin: account management ─────────────────────────────────────────────────
export async function fetchAllAccounts() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role, cin_or_inpe, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminDeleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ── Doctor credentialing / verification ──────────────────────────────────────
/** Upload one credential file to the private "credentials" bucket + index it. */
export async function uploadCredential({ file, userId, doctorId, docType }) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  // Storage RLS keys the folder on auth.uid() (the auth user id), NOT the
  // public.users id — they differ, so the folder MUST be auth.uid().
  const { data: auth } = await supabase.auth.getUser();
  const folder = auth?.user?.id || userId;
  const path = `${folder}/${docType}_${Date.now()}.${ext}`;
  const up = await supabase.storage.from('credentials').upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) throw up.error;
  const { error } = await supabase.from('doctor_documents').insert({ doctor_id: doctorId, doc_type: docType, file_url: path });
  if (error) throw error;
  return path;
}

/** Signed URL (1h) to view a private credential file (owner or admin). */
export async function getCredentialUrl(path) {
  const { data, error } = await supabase.storage.from('credentials').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/** Admin: doctors awaiting review (or filtered by status), with their user + docs. */
export async function fetchDoctorsForReview(status = null) {
  // `doctors` has two FKs to users (user_id, reviewed_by) → disambiguate the embed.
  let q = supabase
    .from('doctors')
    .select('id, specialty, city, clinic_address, cnom, verification_status, rejection_reason, rejection_note, submitted_at, reviewed_at, plan, subscription_status, blocked, trial_ends_at, user:users!doctors_user_id_fkey(id, full_name, email, phone, cin_or_inpe), docs:doctor_documents(id, doc_type, file_url), payments:doctor_payments(id, period, amount, status, declared_at, confirmed_at, created_at)')
    .order('submitted_at', { ascending: false });
  if (status) q = q.eq('verification_status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Admin: approve or reject a doctor. */
export async function reviewDoctor(doctorId, { status, reason = null, note = null, reviewerId = null }) {
  const { data, error } = await supabase
    .from('doctors')
    .update({ verification_status: status, rejection_reason: reason, rejection_note: note, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq('id', doctorId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** A rejected doctor resets their own status to 'pending' (secured RPC). */
export async function doctorResubmit() {
  const { error } = await supabase.rpc('doctor_resubmit');
  if (error) throw error;
  return true;
}

// ── Subscriptions & payments ──────────────────────────────────────────────────
/** Payments for a doctor (newest first). */
export async function fetchDoctorPayments(doctorId) {
  const { data, error } = await supabase
    .from('doctor_payments')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Doctor declares a payment as made ("J'ai payé") — secured RPC. */
export async function declarePayment(paymentId) {
  const { error } = await supabase.rpc('declare_payment', { p_id: paymentId });
  if (error) throw error;
  return true;
}

/** Admin: create a due payment for a doctor. */
export async function adminAddPayment(doctorId, { period, amount }) {
  const { data, error } = await supabase
    .from('doctor_payments')
    .insert({ doctor_id: doctorId, period, amount: Number(amount) || 0, status: 'due' })
    .select().single();
  if (error) throw error;
  return data;
}

/** Admin: confirm a payment was received → mark paid + reactivate the doctor. */
export async function adminConfirmPayment(paymentId, doctorId) {
  const { error } = await supabase.from('doctor_payments')
    .update({ status: 'paid', confirmed_at: new Date().toISOString() }).eq('id', paymentId);
  if (error) throw error;
  if (doctorId) {
    await supabase.from('doctors')
      .update({ subscription_status: 'active', blocked: false }).eq('id', doctorId);
  }
  return true;
}

/** Admin: block / unblock a doctor's account. */
export async function adminSetBlocked(doctorId, blocked) {
  const { error } = await supabase.from('doctors').update({ blocked }).eq('id', doctorId);
  if (error) throw error;
  return true;
}

/** Admin: set a doctor's subscription status (e.g. mark expired, reactivate). */
export async function adminSetSubscription(doctorId, status) {
  const patch = { subscription_status: status };
  if (status === 'active') patch.blocked = false;
  const { error } = await supabase.from('doctors').update(patch).eq('id', doctorId);
  if (error) throw error;
  return true;
}

/** Fire a verification email (Edge Function). Resolves quietly if unavailable. */
export async function notifyVerification(payload) {
  try {
    const { data, error } = await supabase.functions.invoke('notify-verification', {
      body: { ...payload, appUrl: (typeof window !== 'undefined' ? window.location.origin : '') },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[TikDoc] notify-verification unavailable', e);
    return { ok: false, pending: true };
  }
}

/** Admin diagnostic: send a test email and surface the real result/error. */
export async function sendTestEmail(to) {
  try {
    const { data, error } = await supabase.functions.invoke('notify-verification', { body: { type: 'test', to } });
    if (error) {
      // Non-2xx or function not deployed — dig the real message out of the response.
      let msg = error.message || 'Fonction injoignable';
      let status = '';
      try {
        const ctx = error.context;
        if (ctx?.status) status = `${ctx.status} `;
        if (ctx && typeof ctx.text === 'function') {
          const t = await ctx.text();
          if (t) { try { const j = JSON.parse(t); msg = j.error || j.message || t; } catch { msg = t; } }
        }
      } catch (_) { /* ignore */ }
      return { ok: false, error: `${status}${msg}` };
    }
    if (data && typeof data === 'object') {
      // The function always includes an error string when ok is false.
      if (data.ok) return data;
      return { ok: false, error: data.error || `Resend status ${data.status ?? '?'} (voir logs de la fonction)` };
    }
    return { ok: false, error: 'Réponse inattendue de la fonction (déployée ?).' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Erreur réseau' };
  }
}

// ── Avatars (profile photos) ──────────────────────────────────────────────────
/** Upload a profile photo and store its public URL on the user row. */
export async function uploadAvatar(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/avatar_${Date.now()}.${ext}`;
  const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;
  const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', userId);
  if (error) throw error;
  return url;
}

// ── Conversations ─────────────────────────────────────────────────────────────
/** Delete a conversation (its messages cascade). */
export async function deleteConversation(id) {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/** Persist a doctor's services list (shared with the patient booking page). */
export async function saveDoctorServices(doctorId, services) {
  const clean = (services || [])
    .filter((s) => (s.name || '').trim())
    .map((s) => ({ name: String(s.name).trim(), price: Number(s.price) || 0, duration: String(s.duration || '20') }));
  const { error } = await supabase
    .from('doctors')
    .update({ services: clean })
    .eq('id', doctorId);
  if (error) throw error;
  return clean;
}

/** The doctors row owned by the current user (or null). */
export async function fetchMyDoctor() {
  const u = await getCurrentAppUser();
  if (!u) return null;
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', u.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Generic appointment update (used by History editing) ──────────────────────
export async function updateAppointment(id, fields) {
  const { data, error } = await supabase
    .from('appointments')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete an appointment (DB-backed; manual/local ones are handled in state). */
export async function deleteAppointment(id) {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Invite a walk-in patient to register via SMS + email with the appointment
// details. Real delivery happens in a Supabase Edge Function named
// `invite-patient` (Twilio for SMS, an email provider) — set it up and deploy it.
// Until then this resolves quietly so the UI flow never breaks.
export async function inviteNewPatient({ name, phone, email, appt = null }) {
  try {
    const { data, error } = await supabase.functions.invoke('invite-patient', {
      body: { name, phone, email, appt, link: (typeof window !== 'undefined' ? window.location.origin : '') },
    });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[TikDoc] invite-patient not available yet — patient added locally only.', e);
    return { ok: false, pending: true };
  }
}

// ── Availability ──────────────────────────────────────────────────────────────
/** Replace a doctor's whole weekly availability with `rows`. */
export async function saveAvailability(doctorId, rows) {
  const del = await supabase.from('availability').delete().eq('doctor_id', doctorId);
  if (del.error) throw del.error;
  if (rows.length) {
    const { error } = await supabase
      .from('availability')
      .insert(rows.map((r) => ({ ...r, doctor_id: doctorId })));
    if (error) throw error;
  }
  return true;
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export async function createReview(appointmentId, rating, comment) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ appointment_id: appointmentId, rating, comment: comment || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Documents (Supabase Storage bucket "documents") ───────────────────────────
const BUCKET = 'documents';

/** Upload a File object and record it in the documents table. */
export async function uploadDocument({ file, ownerId, appointmentId = null, fileType = null }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Non authentifié');
  // Objects must live under the owner's auth-uid folder (storage RLS).
  const path = `${auth.user.id}/${Date.now()}_${file.name}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from('documents')
    .insert({ owner_id: ownerId, appointment_id: appointmentId, file_url: path, file_type: fileType || file.type || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** List documents the current user can see (RLS scopes the rows). */
export async function listDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** A short-lived signed URL to download/preview a private file. */
export async function getDocumentUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ── Chat: conversations + messages ────────────────────────────────────────────
export async function getOrCreateConversation(patientId, doctorId) {
  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .maybeSingle();
  if (existing.data) return existing.data;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ patient_id: patientId, doctor_id: doctorId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Conversations for the current user, with the peer's display name resolved. */
export async function fetchConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, patient:users(full_name), doctor:doctors(id, user:users(full_name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  // Doctor names via the public directory (doctor's users row may be private).
  const docIds = [...new Set(rows.map((r) => r.doctor_id))];
  let docName = {};
  if (docIds.length) {
    const { data: dir } = await supabase.from('doctor_directory').select('id, full_name').in('id', docIds);
    docName = Object.fromEntries((dir || []).map((d) => [d.id, d.full_name]));
  }
  return rows.map((c) => ({
    id: c.id,
    patientId: c.patient_id,
    doctorId: c.doctor_id,
    patientName: c.patient?.full_name || 'Patient',
    doctorName: docName[c.doctor_id] || c.doctor?.user?.full_name || 'Médecin',
  }));
}

export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId, senderId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}
