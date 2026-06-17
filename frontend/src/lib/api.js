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
 * Appointments visible to the current user (RLS scopes the rows automatically).
 * Doctor names come from the public `doctor_directory` view because the `users`
 * table is private (RLS = your own row only), so it can't be embedded directly.
 */
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
    patientName: row.patient?.full_name || 'Patient',
    patientPhone: row.patient?.phone || '',
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

/** A doctor's recurring blocked slots: [{ day_of_week, slot }]. Public. */
export async function fetchBlockedSlots(doctorId) {
  const { data, error } = await supabase
    .from('slot_blocks')
    .select('day_of_week, slot')
    .eq('doctor_id', doctorId);
  if (error) throw error;
  return data || [];
}

/** Replace a doctor's whole set of blocked slots. */
export async function saveBlockedSlots(doctorId, rows) {
  const del = await supabase.from('slot_blocks').delete().eq('doctor_id', doctorId);
  if (del.error) throw del.error;
  if (rows.length) {
    const { error } = await supabase
      .from('slot_blocks')
      .insert(rows.map((r) => ({ doctor_id: doctorId, day_of_week: r.day_of_week, slot: r.slot })));
    if (error) throw error;
  }
  return true;
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
