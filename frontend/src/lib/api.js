// ─────────────────────────────────────────────────────────────────────────────
// Tabibo data-access layer
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
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    slug: row.slug || '',
  };
}

/** Resolve a vanity slug (dr-aya-chakkour) to a doctor, or null. */
export async function fetchDoctorBySlug(slug) {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('doctor_directory').select('*').eq('slug', slug).maybeSingle();
  if (error || !data) return null;
  return mapDoctor(data);
}

/** Change the signed-in doctor's vanity slug. Returns the saved slug. */
export async function setMySlug(doctorId, slug) {
  const { data, error } = await supabase.rpc('set_my_slug', { p_doctor_id: doctorId, p_slug: slug });
  if (error) throw error;
  return data;
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
  if (f.q) {
    // Strip PostgREST filter metacharacters so user input can't inject
    // additional .or() conditions (defense-in-depth; the view is public-safe).
    const q = String(f.q).replace(/[(),]/g, ' ').trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,clinic_address.ilike.%${q}%`);
  }

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

// ── Congés & absences (doctor_time_off) ─────────────────────────────────────
// Public read: the patient booking calendar needs closed dates. Writes are
// cabinet-only (RLS). Dates are 'YYYY-MM-DD' strings, inclusive.

export async function fetchTimeOff(doctorId, { upcomingOnly = false } = {}) {
  let q = supabase.from('doctor_time_off').select('*')
    .eq('doctor_id', doctorId).order('start_date', { ascending: true });
  if (upcomingOnly) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });
    q = q.gte('end_date', today);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function addTimeOff(doctorId, startDate, endDate, reason = null) {
  const { data, error } = await supabase.from('doctor_time_off')
    .insert({ doctor_id: doctorId, start_date: startDate, end_date: endDate, reason })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteTimeOff(id) {
  const { error } = await supabase.from('doctor_time_off').delete().eq('id', id);
  if (error) throw error;
}

/** Join the freed-slot waitlist for a doctor + date. Returns 'ok' | 'dup'. */
export async function joinWaitlist(doctorId, dateISO, patientId) {
  const { error } = await supabase
    .from('slot_waitlist')
    .insert({ doctor_id: doctorId, date: dateISO, patient_id: patientId });
  if (error) {
    if (error.code === '23505') return 'dup';   // already on this day's list
    throw error;
  }
  return 'ok';
}

/** true if the ISO date ('YYYY-MM-DD') falls inside any time-off range. */
export function isDateOff(timeOffRows, iso) {
  return (timeOffRows || []).some((r) => iso >= r.start_date && iso <= r.end_date);
}

/** Download a mapped appointment as an .ics file ("Ajouter à l'agenda").
 *  Works with Google Agenda, Apple Calendar and Outlook — no backend needed. */
export function downloadICS(a, durationMin = 30) {
  const start = new Date(a.datetime);
  const end = new Date(start.getTime() + durationMin * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tabibo//Rendez-vous//FR', 'BEGIN:VEVENT',
    `UID:tabibo-${a.id}@tabibo.ma`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(`Rendez-vous ${a.doctorName || 'médecin'} — Tabibo`)}`,
    (a.clinic || a.city) ? `LOCATION:${esc([a.clinic, a.city].filter(Boolean).join(', '))}` : null,
    a.reason ? `DESCRIPTION:${esc(a.reason)}` : null,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Rendez-vous médical dans 2 heures')}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = 'rendez-vous-tabibo.ics';
  document.body.appendChild(el);
  el.click();
  el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Appointments ─────────────────────────────────────────────────────────────

/**
 * Book an appointment. Requires an authenticated patient — RLS enforces that
 * patient_id matches the signed-in user, so pass the current app user id.
 * @returns the inserted appointment row
 */
/**
 * Fire-and-forget WhatsApp to the patient for an appointment event.
 * template: 'confirmation' (booked) | 'confirmed' | 'cancelled' | 'rescheduled' | 'j1' | 'j2'.
 * Never throws — UX must not depend on it.
 */
export function sendApptWhatsApp(appointmentId, template) {
  if (!appointmentId) return;
  supabase.functions
    .invoke('send-reminder', { body: { type: 'send', appointment_id: appointmentId, template } })
    .catch((e) => console.warn(`[Tabibo] WhatsApp (${template}) skipped`, e));
}

/**
 * Fire-and-forget email for an appointment event. The Edge Function decides the
 * recipients: the patient (booked/confirmed/cancelled/rescheduled) and the
 * doctor (booked / cancelled_by_patient). Skips anyone without an email.
 */
export function notifyApptEmail(appointmentId, event) {
  if (!appointmentId) return;
  supabase.functions
    .invoke('notify-verification', { body: { type: 'appointment', appointment_id: appointmentId, event } })
    .catch((e) => console.warn(`[Tabibo] appointment email (${event}) skipped`, e));
}

export function sendBookingConfirmation(appointmentId) {
  sendApptWhatsApp(appointmentId, 'confirmation');
}

// Resolve a doctor's default consultation fee (MAD). Best-effort: returns null
// if unavailable so callers can fall back to the DB default / leave it empty.
async function doctorDefaultFee(doctorId) {
  if (!doctorId) return null;
  const { data } = await supabase.from('doctors').select('fee_mad').eq('id', doctorId).maybeSingle();
  const f = data?.fee_mad;
  return f != null ? Number(f) || null : null;
}

export async function createAppointment({ patientId, doctorId, datetime, reason, notes, fee = null }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      datetime,
      reason: reason || null,
      notes: notes || null,
      status: 'pending',
      // Expected price: caller may pass it; otherwise default to the doctor's fee.
      fee: fee != null ? Number(fee) || null : await doctorDefaultFee(doctorId),
    })
    .select()
    .single();
  if (error) throw error;
  sendBookingConfirmation(data.id);   // WhatsApp → patient
  notifyApptEmail(data.id, 'booked'); // Email → patient + doctor
  return data;
}

/**
 * Doctor-created appointment. The patient may be an existing account
 * (`patientId`) or a walk-in identified by name/phone (no account yet). These
 * persist in the DB so the booking calendar greys the slot out for patients.
 */
export async function createWalkinAppointment({ doctorId, datetime, reason, notes, patientId = null, patientName = null, patientPhone = null, fee = null }) {
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
      fee: fee != null ? Number(fee) || null : await doctorDefaultFee(doctorId),
    })
    .select()
    .single();
  if (error) throw error;
  sendBookingConfirmation(data.id);
  notifyApptEmail(data.id, 'booked'); // emails the patient if a linked account exists
  return data;
}
export async function fetchMyAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(id, specialty, city, clinic_address, fee_mad), patient:users(full_name, phone, sex, dob)')
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
    patientSex: normSex(row.patient?.sex),
    patientAge: ageFromDob(row.patient?.dob),
    spec: d.specialty || '',
    clinic: d.clinic_address || '',
    city: d.city || '',
    // Expected price for this visit (its own fee, falling back to the doctor's default).
    fee: row.fee != null ? Number(row.fee) || 0 : (d.fee_mad || 0),
    // Real payment capture (see 20260629180000_appointment_payments.sql).
    paid: !!row.paid,
    amountPaid: row.amount_paid != null ? Number(row.amount_paid) || 0 : 0,
    payMethod: row.pay_method || null,
    // Daily cabinet flow (see 20260707120000_daily_flow.sql).
    arrivedAt: row.arrived_at || null,
    consultNote: row.consult_note || null,
    // Consultation flow (see 20260712120000_consultation_flow.sql).
    inConsultAt: row.in_consultation_at || null,
  };
}

/** Waiting room: mark the patient as arrived (or undo with arrived=false). */
export async function markArrived(id, arrived = true) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ arrived_at: arrived ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Consultation flow: move the patient from waiting into the consultation
 *  ("dans la consultation"), or send them back to the queue with on=false. */
export async function markInConsultation(id, on = true) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ in_consultation_at: on ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// French labels for the captured payment method.
export const PAY_METHOD_FR = { cash: 'Espèces', card: 'CMI', wallet: 'M-Wallet' };
export const PAY_METHOD_FROM_FR = { 'Espèces': 'cash', 'CMI': 'card', 'Carte': 'card', 'M-Wallet': 'wallet', 'Wallet': 'wallet' };

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
  // Payment status comes from the real `paid` flag, not the appointment status:
  // a completed visit that hasn't been settled stays "En attente".
  const status =
    a.paid ? 'Payé'
    : a.status === 'cancelled' || a.status === 'no_show' ? 'Annulé'
    : 'En attente';
  return {
    id: a.id,
    patient: a.patientName || 'Patient',
    age: a.patientAge ?? '—',
    sex: a.patientSex || '',
    service: a.reason || 'Consultation générale',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    // What was actually collected when paid; otherwise the expected fee.
    amount: a.paid ? (a.amountPaid || a.fee || 0) : (a.fee || 0),
    pay: a.paid && a.payMethod ? (PAY_METHOD_FR[a.payMethod] || a.payMethod) : '—',
    status,
    notes: a.notes || '',
    consultNote: a.consultNote || '',
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

/**
 * Record a payment a doctor collected for an appointment.
 * Marks paid + amount + method, and completes the visit (unless it was
 * cancelled/no_show, which stay as-is). amount/method are normalised.
 * @param {object} opts { amount (MAD), method ('cash'|'card'|'wallet') }
 */
export async function markAppointmentPaid(id, { amount, method, consultNote } = {}) {
  // Resolve the current status so we never resurrect a cancelled/no_show visit.
  let nextStatus = 'completed';
  const { data: cur } = await supabase.from('appointments').select('status').eq('id', id).maybeSingle();
  if (cur && (cur.status === 'cancelled' || cur.status === 'no_show')) nextStatus = cur.status;

  const patch = {
    paid: true,
    amount_paid: amount != null ? Number(amount) || 0 : null,
    pay_method: method || null,
    status: nextStatus,
  };
  if (consultNote !== undefined) patch.consult_note = consultNote || null;
  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Doctor statistics (real aggregates) ───────────────────────────────────────
const MA_TZ = 'Africa/Casablanca';
// 'YYYY-MM-DD' for an instant, in Morocco local time.
function moDateKey(d) {
  try {
    const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: MA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
    return dtf.format(d); // en-CA → YYYY-MM-DD
  } catch {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

/**
 * Real aggregates for a doctor's appointments in [from, to] (ISO instants;
 * both optional). All money is MAD. Robust to nulls.
 * @returns {{
 *   revenue, expected, paidCount, avgTicket, newPatients, returningPatients, teleconsultPct,
 *   counts: {total, completed, cancelled, no_show, pending, confirmed},
 *   byDay: [{date, revenue, count}], byService: [{service, count}]
 * }}
 */
export async function fetchDoctorStats(doctorId, { from = null, to = null } = {}) {
  const empty = {
    revenue: 0, expected: 0, paidCount: 0, avgTicket: 0,
    newPatients: 0, returningPatients: 0, teleconsultPct: 0,
    counts: { total: 0, completed: 0, cancelled: 0, no_show: 0, pending: 0, confirmed: 0 },
    byDay: [], byService: [],
  };
  if (!doctorId) return empty;

  let q = supabase
    .from('appointments')
    .select('id, datetime, status, reason, fee, paid, pay_method, amount_paid, patient_id, patient_name')
    .eq('doctor_id', doctorId);
  if (from) q = q.gte('datetime', from);
  if (to) q = q.lte('datetime', to);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];

  const counts = { total: rows.length, completed: 0, cancelled: 0, no_show: 0, pending: 0, confirmed: 0 };
  let revenue = 0, expected = 0, paidCount = 0, teleCount = 0;
  const byDayMap = {};   // dateKey -> { revenue, count }
  const bySvcMap = {};   // service -> count
  const patientCount = {}; // patient key -> visits in window

  for (const r of rows) {
    if (r.status && counts[r.status] != null) counts[r.status] += 1;
    expected += Number(r.fee) || 0;
    if (r.paid) {
      paidCount += 1;
      const got = r.amount_paid != null ? (Number(r.amount_paid) || 0) : (Number(r.fee) || 0);
      revenue += got;
    }
    const svc = (r.reason || 'Consultation générale').trim() || 'Consultation générale';
    bySvcMap[svc] = (bySvcMap[svc] || 0) + 1;
    if (/t[ée]l[ée]/i.test(svc)) teleCount += 1;

    const dk = moDateKey(new Date(r.datetime));
    if (!byDayMap[dk]) byDayMap[dk] = { revenue: 0, count: 0 };
    byDayMap[dk].count += 1;
    if (r.paid) byDayMap[dk].revenue += r.amount_paid != null ? (Number(r.amount_paid) || 0) : (Number(r.fee) || 0);

    const pk = r.patient_id || (r.patient_name ? `name:${String(r.patient_name).toLowerCase()}` : null);
    if (pk) patientCount[pk] = (patientCount[pk] || 0) + 1;
  }

  const distinct = Object.keys(patientCount).length;
  const returningPatients = Object.values(patientCount).filter((n) => n > 1).length;
  const newPatients = distinct - returningPatients;
  const avgTicket = paidCount ? Math.round(revenue / paidCount) : 0;
  const teleconsultPct = counts.total ? Math.round((teleCount / counts.total) * 100) : 0;

  const byDay = Object.entries(byDayMap)
    .map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const byService = Object.entries(bySvcMap)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);

  return { revenue, expected, paidCount, avgTicket, newPatients, returningPatients, teleconsultPct, counts, byDay, byService };
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
      lat: p.lat ?? null,
      lng: p.lng ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/** Resolve the current app user's profile row (public.users) from the session. */
/** Update the signed-in user's own profile (name, phone, cin, sex, dob, medical). */
export async function updateMyProfile(userId, fields) {
  if (!userId) return null;
  const patch = {};
  if ('full_name' in fields) patch.full_name = fields.full_name;
  if ('phone' in fields) patch.phone = fields.phone;
  if ('cin_or_inpe' in fields) patch.cin_or_inpe = fields.cin_or_inpe;
  if ('sex' in fields) patch.sex = fields.sex || null;
  if ('dob' in fields) patch.dob = fields.dob || null;
  if ('blood' in fields) patch.blood = fields.blood || null;
  if ('allergies' in fields) patch.allergies = fields.allergies || null;
  if ('chronic' in fields) patch.chronic = fields.chronic || null;
  const { data, error } = await supabase.from('users').update(patch).eq('id', userId).select().maybeSingle();
  if (error) throw error;
  return data;
}

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

/** Admin only — update platform settings (RIB / bank / company contact). */
export async function saveAppSettings(fields = {}) {
  const patch = { updated_at: new Date().toISOString() };
  if ('rib' in fields) patch.rib = fields.rib;
  if ('bank' in fields) patch.bank = fields.bank;
  if ('contact' in fields) patch.contact = fields.contact;
  const { data, error } = await supabase
    .from('app_settings').update(patch).eq('id', 1).select().single();
  if (error) throw error;
  return data;
}

/** Public — the company contact details for the Contact page (no RIB exposed). */
export async function fetchCompanyContact() {
  const { data, error } = await supabase.from('company_contact').select('contact').maybeSingle();
  if (error || !data) return null;
  return data.contact || null;
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
  // Delete BOTH the auth login and the profile via a secured admin function.
  // Falls back to a profile-only delete if the function isn't deployed yet
  // (better than failing outright, though it leaves the auth login — deploy
  // admin-delete-user to fully remove accounts).
  const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: id } });
  if (!error && data?.ok) return true;
  if (data && data.ok === false && data.error) throw new Error(data.error);
  const { error: delErr } = await supabase.from('users').delete().eq('id', id);
  if (delErr) throw delErr;
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
    .select('id, specialty, city, clinic_address, cnom, verification_status, rejection_reason, rejection_note, submitted_at, reviewed_at, plan, subscription_status, blocked, trial_ends_at, billing_cycle, period_start, current_period_end, user:users!doctors_user_id_fkey(id, full_name, email, phone, cin_or_inpe), docs:doctor_documents(id, doc_type, file_url), payments:doctor_payments(id, period, amount, status, declared_at, confirmed_at, created_at)')
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

/**
 * Doctor declares the CURRENT month's subscription payment ("J'ai payé" on the
 * profile bar). Creates the month's due row if needed and flags it 'declared'.
 * Returns the payment row so the UI can switch the button to "En vérification".
 */
export async function declareCurrentPayment() {
  const { data, error } = await supabase.rpc('declare_current_payment');
  if (error) throw error;
  return data;
}

/** Admin: confirm the transfer + extend the subscription one month (manual renew). */
export async function adminRenewSubscription(doctorId, months = 1) {
  const { error } = await supabase.rpc('admin_renew_subscription', { p_doctor_id: doctorId, p_months: months });
  if (error) throw error;
  return true;
}

/** Admin: stop a doctor's subscription immediately. */
export async function adminStopSubscription(doctorId) {
  const { error } = await supabase.rpc('admin_stop_subscription', { p_doctor_id: doctorId });
  if (error) throw error;
  return true;
}

/** Doctor picks a plan and signals a transfer → creates a 'declared' payment. */
export async function doctorRequestActivation(plan) {
  const { error } = await supabase.rpc('doctor_request_activation', { p_plan: plan });
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
    console.warn('[Tabibo] notify-verification unavailable', e);
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
  // Storage RLS scopes the folder to auth.uid() (NOT the public.users id).
  const { data: auth } = await supabase.auth.getUser();
  const folder = auth?.user?.id || userId;
  const path = `${folder}/avatar_${Date.now()}.${ext}`;
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
    console.warn('[Tabibo] invite-patient not available yet — patient added locally only.', e);
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

// ── Guest booking (phone-verified, no account) ───────────────────────────────
/** Is the OTP channel configured server-side? Cached per session. */
let _guestEnabled = null;
export async function guestBookingEnabled() {
  if (_guestEnabled !== null) return _guestEnabled;
  try {
    const { data } = await supabase.functions.invoke('guest-booking', { body: { action: 'status' } });
    _guestEnabled = !!data?.enabled;
  } catch { _guestEnabled = false; }
  return _guestEnabled;
}

/** Step 1: request the one-time code (sent by WhatsApp/SMS to the phone). */
export async function guestBookingStart({ doctorId, datetime, name, phone, reason }) {
  const { data, error } = await supabase.functions.invoke('guest-booking', {
    body: { action: 'start', doctorId, datetime, name, phone, reason },
  });
  if (error) {
    let msg = 'Envoi du code impossible.';
    try { const t = await error.context?.text?.(); if (t) msg = JSON.parse(t).error || msg; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  if (!data?.ok) throw new Error(data?.error || 'Envoi du code impossible.');
  return data;   // { sent: 'whatsapp'|'sms', phone }
}

/** Step 2: verify the code → the appointment is created. */
export async function guestBookingVerify({ phone, code }) {
  const { data, error } = await supabase.functions.invoke('guest-booking', {
    body: { action: 'verify', phone, code },
  });
  if (error) {
    let msg = 'Vérification impossible.';
    try { const t = await error.context?.text?.(); if (t) msg = JSON.parse(t).error || msg; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  if (!data?.ok) throw new Error(data?.error || 'Vérification impossible.');
  return data;   // { appointmentId }
}

// ── Reviews ───────────────────────────────────────────────────────────────────
/** Public reviews of a doctor (anonymised reviewer), newest first. */
export async function fetchDoctorReviews(doctorId, limit = 10) {
  const { data, error } = await supabase
    .from('doctor_reviews')
    .select('id, rating, comment, created_at, reviewer, reply, replied_at')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** The cabinet answers a patient review (reply columns only — trigger-guarded). */
export async function replyToReview(reviewId, reply) {
  const text = (reply || '').trim();
  const { error } = await supabase
    .from('reviews')
    .update({ reply: text || null, replied_at: text ? new Date().toISOString() : null })
    .eq('id', reviewId);
  if (error) throw error;
}

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

/**
 * Send a document between a doctor and a patient. The file is stored under the
 * uploader's auth folder; the row records patient_id + doctor_id + direction so
 * the recipient can see AND download it (via RLS + the shared-read storage policy).
 * @param direction 'to_patient' (doctor → patient) | 'to_doctor' (patient → doctor)
 */
export async function uploadDocument({ file, ownerId = null, patientId = null, doctorId = null, direction = null, appointmentId = null, fileType = null, notes = null }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Non authentifié');
  const path = `${auth.user.id}/${Date.now()}_${file.name}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (up.error) throw up.error;
  // owner_id MUST equal the caller's app-user id so RLS accepts the insert
  // (owner_id = app_uid()). Callers pass their own appUser.id; resolve it as a
  // fallback only if omitted.
  const owner = ownerId || (await getCurrentAppUser().catch(() => null))?.id || null;
  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id: owner,
      patient_id: patientId, doctor_id: doctorId, direction,
      appointment_id: appointmentId, notes: notes || null,
      file_url: path, file_type: fileType || file.type || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** List documents the current user can see (RLS scopes the rows), newest first. */
export async function listDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, owner_id, patient_id, doctor_id, direction, appointment_id, notes, file_url, file_type, uploaded_at')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * A short-lived signed URL to a private file. Pass a filename to force a
 * download (Content-Disposition: attachment) instead of opening in-tab.
 */
export async function getDocumentUrl(path, downloadName = null) {
  const opts = downloadName ? { download: downloadName } : undefined;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, opts);
  if (error) throw error;
  return data.signedUrl;
}

/** Force-download a private document (fetches the blob so it saves, not opens). */
export async function downloadDocument(path, filename) {
  const url = await getDocumentUrl(path, filename || 'document');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Téléchargement impossible');
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl; a.download = filename || (path.split('/').pop() || 'document');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
}

// ── Chat: conversations + messages ────────────────────────────────────────────
/** Resolve a phone number to the account's login email (for phone-or-email login). */
export async function emailForPhone(phone) {
  if (!phone) return null;
  const { data, error } = await supabase.rpc('email_for_phone', { p: phone });
  if (error) { console.warn('[Tabibo] email_for_phone failed', error); return null; }
  return data || null;
}

/** The existing conversation between a patient and a doctor, or null (no insert). */
export async function findConversation(patientId, doctorId) {
  if (!patientId || !doctorId) return null;
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getOrCreateConversation(patientId, doctorId) {
  if (!patientId || !doctorId) throw new Error('Profil incomplet — impossible de démarrer la conversation.');
  // Look for an existing thread (limit(1) is race/duplicate-safe).
  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (existing.data && existing.data[0]) return existing.data[0];
  const { data, error } = await supabase
    .from('conversations')
    .insert({ patient_id: patientId, doctor_id: doctorId })
    .select()
    .single();
  if (error) {
    // Unique-index race: another tab/click created it first → fetch and return it.
    if (error.code === '23505') {
      const again = await supabase.from('conversations').select('*').eq('patient_id', patientId).eq('doctor_id', doctorId).limit(1);
      if (again.data && again.data[0]) return again.data[0];
    }
    throw error;
  }
  return data;
}

/** Conversations for the current user, with the peer's display name resolved. */
export async function fetchConversations() {
  // NOTE: `doctors` has TWO FKs to `users` (user_id + reviewed_by), so a bare
  // `doctor:doctors(...user:users...)` embed is AMBIGUOUS and errors the whole
  // query (→ the doctor's inbox looked empty). Disambiguate the user embed.
  const { data, error } = await supabase
    .from('conversations')
    .select('*, patient:users(full_name), doctor:doctors(id, user:users!doctors_user_id_fkey(full_name))')
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

/**
 * Compact inbox preview for the dashboard: the current user's most recent
 * conversations with their last message. Two round-trips total.
 */
export async function fetchConversationPreviews(limit = 4) {
  const convs = await fetchConversations().catch(() => []);
  if (!convs.length) return [];
  const ids = convs.map((c) => c.id);
  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, content, sent_at, sender_id')
    .in('conversation_id', ids)
    .order('sent_at', { ascending: false })
    .limit(60);
  const lastByConv = {};
  (msgs || []).forEach((m) => { if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m; });
  return convs
    .map((c) => ({ ...c, last: lastByConv[c.id] || null }))
    .filter((c) => c.last)
    .sort((a, b) => new Date(b.last.sent_at) - new Date(a.last.sent_at))
    .slice(0, limit);
}

/**
 * Upload a chat image to the PRIVATE chat-media bucket. Returns a bucket-scoped
 * token stored as the message body; it's rendered via a short-lived signed URL
 * (getChatMediaUrl), so no world-readable public URL ever exists.
 */
export async function uploadChatImage(file) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Non authentifié');
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${auth.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const up = await supabase.storage.from('chat-media').upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) throw up.error;
  return `chat-media/${path}`;
}

/** True if a message body is an image attachment (token or legacy public URL). */
export function isImageMessage(content) {
  return typeof content === 'string' && /(^chat-media\/|\/chat-media\/).+\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(content);
}

/** Resolve a chat-media token (or legacy URL) to a signed URL for <img src>. */
export async function getChatMediaUrl(content) {
  if (typeof content !== 'string') return '';
  if (/^https?:\/\//i.test(content)) return content;            // legacy public URL
  const path = content.replace(/^chat-media\//, '');
  const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, 3600);
  if (error) return '';
  return data.signedUrl;
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

// ── Realtime ──────────────────────────────────────────────────────────────────
// Postgres-change streams. They respect RLS, so each subscriber only receives
// rows it is allowed to SELECT (a doctor gets their conversations/appointments,
// a patient gets theirs). Every helper returns an unsubscribe function.

/** Live-stream new messages of a single conversation. */
export function subscribeToConversation(conversationId, onMessage) {
  if (!conversationId) return () => {};
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/** Live inbox for the signed-in user: new messages and/or new appointments. */
export function subscribeToInbox({ onMessage, onAppointment, onConversation } = {}) {
  const channel = supabase.channel('inbox-' + Math.random().toString(36).slice(2));
  if (onMessage) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => onMessage(p.new));
  }
  if (onAppointment) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, (p) => onAppointment(p.new));
  }
  if (onConversation) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, (p) => onConversation(p.new));
  }
  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── Reminders (WhatsApp) ──────────────────────────────────────────────────────
const DEFAULT_REMINDER_SETTINGS = { j1: true, j2: false, confirmation: true, followup: false };

/** A doctor's reminder automation toggles (falls back to defaults). */
export async function fetchReminderSettings(doctorId) {
  if (!doctorId) return { ...DEFAULT_REMINDER_SETTINGS };
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('j1, j2, confirmation, followup')
    .eq('doctor_id', doctorId)
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_REMINDER_SETTINGS, ...(data || {}) };
}

/** Persist the reminder toggles (upsert on doctor_id). */
export async function saveReminderSettings(doctorId, settings) {
  if (!doctorId) return;
  const row = { doctor_id: doctorId, ...DEFAULT_REMINDER_SETTINGS, ...settings, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('reminder_settings').upsert(row, { onConflict: 'doctor_id' });
  if (error) throw error;
}

/** Delivery log rows for the reminders dashboard (most recent first). */
export async function fetchReminderLog(doctorId, limit = 100) {
  if (!doctorId) return [];
  const { data, error } = await supabase
    .from('reminder_log')
    .select('id, patient_name, phone, channel, template, body, status, error, created_at, sent_at')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Fire a test WhatsApp message to verify the provider configuration. */
export async function sendReminderTest(phone) {
  const { data, error } = await supabase.functions.invoke('send-reminder', { body: { type: 'test', to: phone } });
  if (error) throw error;
  return data;
}

// ── Doctor patient roster ─────────────────────────────────────────────────────
const PATIENT_COLORS = ['#16A06A', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2', '#854D0E', '#0E7C52'];

function patientInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}
function patientColor(name = '') {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PATIENT_COLORS[h % PATIENT_COLORS.length];
}
function ageFromDob(dob) {
  if (!dob) return '—';
  const d = new Date(dob); if (isNaN(d)) return '—';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : '—';
}
function fmtDateShort(ts) {
  if (!ts) return '—';
  const d = new Date(ts); if (isNaN(d)) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function normSex(s) {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('f')) return 'F';
  if (v.startsWith('m') || v.startsWith('h')) return 'M';
  return s || '';
}

/** Map a doctor_patient_directory row to the shape the UI expects. */
export function mapPatient(row) {
  return {
    id: row.id,
    userId: row.user_id || null,
    name: row.name || '',
    cin: row.cin || '',
    phone: row.phone || '',
    email: row.email || '',
    dob: row.dob || '',
    age: ageFromDob(row.dob),
    sex: normSex(row.sex),
    address: row.address || '',
    city: row.city || '',
    blood: row.blood || '',
    allergies: row.allergies || '',
    chronic: row.chronic || '',
    insurance: row.insurance || '',
    notes: row.notes || '',
    statut: row.status || 'Actif',
    amoNumber: row.amo_number || '',
    initials: patientInitials(row.name),
    color: patientColor(row.name),
    visits: row.visits || 0,
    noShows: row.no_show_count || 0,
    lastVisit: fmtDateShort(row.last_visit),
    nextAppt: fmtDateShort(row.next_appt),
  };
}

/** A doctor's full patient roster (with visit stats). */
export async function fetchMyPatients(doctorId) {
  if (!doctorId) return [];
  const { data, error } = await supabase
    .from('doctor_patient_directory')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPatient);
}

/** Add a patient to the doctor's roster. */
export async function createPatient(doctorId, p) {
  const { data, error } = await supabase
    .from('doctor_patients')
    .insert({
      doctor_id: doctorId,
      name: p.name,
      cin: p.cin || null,
      phone: p.phone || null,
      email: p.email || null,
      dob: p.dob || null,
      sex: p.sex || null,
      address: p.address || null,
      city: p.city || null,
      blood: p.blood || null,
      allergies: p.allergies || null,
      chronic: p.chronic || null,
      insurance: p.insurance || null,
      amo_number: p.amoNumber || p.amo_number || null,
      notes: p.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPatient(data);
}

/** Update roster fields (e.g. archive: { statut: 'Archivé' }). */
export async function updatePatient(id, fields) {
  const patch = { ...fields, updated_at: new Date().toISOString() };
  if ('statut' in patch) { patch.status = patch.statut; delete patch.statut; }
  const { error } = await supabase.from('doctor_patients').update(patch).eq('id', id);
  if (error) throw error;
  return true;
}

/** Remove a patient from the roster. */
export async function deletePatient(id) {
  const { error } = await supabase.from('doctor_patients').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tier-2 · prescriptions, prescription templates, staff (secretary), calls
// ═══════════════════════════════════════════════════════════════════════════

/** Save an ordonnance. items: [{drug,dosage,duration,instructions}]. */
export async function createPrescription(doctorId, { patientId = null, appointmentId = null, patientName = null, items = [], notes = null, ref = null }) {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert({ doctor_id: doctorId, patient_id: patientId, appointment_id: appointmentId, patient_name: patientName, items, notes, ref })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPrescriptions(doctorId, patientId = null) {
  let q = supabase.from('prescriptions').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false });
  if (patientId) q = q.eq('patient_id', patientId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchPrescriptionTemplates(doctorId) {
  const { data, error } = await supabase
    .from('prescription_templates').select('*').eq('doctor_id', doctorId).order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function savePrescriptionTemplate(doctorId, { name, items }) {
  const { data, error } = await supabase
    .from('prescription_templates').insert({ doctor_id: doctorId, name, items }).select().single();
  if (error) throw error;
  return data;
}

export async function deletePrescriptionTemplate(id) {
  const { error } = await supabase.from('prescription_templates').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/** Doctor "sends" an ordonnance to the patient's Tabibo space (marks sent_at). */
export async function sendPrescriptionToPatient(id) {
  const { data, error } = await supabase
    .from('prescriptions').update({ sent_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/** Delete an ordonnance (e.g. a mistake). */
export async function deletePrescription(id) {
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/**
 * Ordonnances the signed-in patient has RECEIVED (sent_at set). Doctor letterhead
 * (name / specialty / city / clinic) is resolved from the public directory so the
 * patient can regenerate the exact same PDF on their side.
 */
export async function fetchMyPrescriptions() {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('id, doctor_id, patient_name, items, notes, ref, created_at, sent_at')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const ids = [...new Set(rows.map((r) => r.doctor_id))];
  let dir = {};
  if (ids.length) {
    const { data: docs } = await supabase
      .from('doctor_directory')
      .select('id, full_name, specialty, city, clinic_address')
      .in('id', ids);
    dir = Object.fromEntries((docs || []).map((d) => [d.id, d]));
  }
  return rows.map((r) => ({ ...r, doctor: dir[r.doctor_id] || null }));
}

/** Public QR verification of an ordonnance reference (no patient / drug data). */
export async function verifyPrescription(ref) {
  if (!ref) return null;
  const { data, error } = await supabase.rpc('verify_prescription', { p_ref: ref });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

// ── Staff (secretary / assistant) ──────────────────────────────────────────
export async function fetchStaff(doctorId) {
  const { data, error } = await supabase
    .from('doctor_staff')
    .select('id, role, active, created_at, user:users!doctor_staff_user_id_fkey(id, full_name, email)')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((s) => ({
    id: s.id, role: s.role, active: s.active,
    name: s.user?.full_name || s.user?.email || '—', email: s.user?.email || '', userId: s.user?.id || null,
  }));
}

/** Invite an EXISTING Tabibo account (by email) as a secretary for this cabinet. */
export async function inviteStaff(doctorId, email) {
  const { data: uid, error: e1 } = await supabase.rpc('user_id_for_email', { p_email: (email || '').trim() });
  if (e1) throw e1;
  if (!uid) { const err = new Error('Aucun compte Tabibo avec cet email. Demandez à la personne de créer un compte, puis réessayez.'); err.code = 'no_user'; throw err; }
  const { error } = await supabase.from('doctor_staff').insert({ doctor_id: doctorId, user_id: uid, role: 'secretary', active: true });
  if (error) {
    if (error.code === '23505') { const err = new Error('Cette personne fait déjà partie de votre équipe.'); err.code = 'dup'; throw err; }
    throw error;
  }
  return true;
}

export async function setStaffActive(id, active) {
  const { error } = await supabase.from('doctor_staff').update({ active }).eq('id', id);
  if (error) throw error;
  return true;
}

export async function removeStaff(id) {
  const { error } = await supabase.from('doctor_staff').delete().eq('id', id);
  if (error) throw error;
  return true;
}

/** For a signed-in user who is NOT a doctor: the cabinet they're staff of (or null). */
export async function fetchMyStaffDoctor() {
  const me = await getCurrentAppUser().catch(() => null);
  if (!me) return null;
  const { data, error } = await supabase
    .from('doctor_staff')
    .select('doctor_id, active')
    .eq('user_id', me.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return fetchDoctorById(data.doctor_id).catch(() => null);
}

// ── Teleconsultation: incoming-call signaling (Realtime broadcast) ───────────
/** Patient subscribes to be "rung" when a doctor starts a teleconsultation. */
export function subscribeToIncomingCalls(userId, onCall) {
  if (!userId) return () => {};
  const ch = supabase
    .channel(`calls:${userId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'incoming' }, (p) => onCall(p.payload))
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch (e) { /* ignore */ } };
}

/** Doctor rings a patient: broadcasts the room to open on their side. */
export async function ringPatient(patientUserId, payload) {
  if (!patientUserId) return;
  const ch = supabase.channel(`calls:${patientUserId}`);
  await new Promise((res) => ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(); }));
  await ch.send({ type: 'broadcast', event: 'incoming', payload });
  setTimeout(() => { try { supabase.removeChannel(ch); } catch (e) { /* ignore */ } }, 3000);
}

// ── Calls (teleconsultation) ────────────────────────────────────────────────
export async function logCall({ conversationId, type = 'video', status = 'completed', startedAt = null, endedAt = null, durationSeconds = null }) {
  if (!conversationId) return null;
  const { data, error } = await supabase
    .from('calls')
    .insert({ conversation_id: conversationId, type, status, started_at: startedAt, ended_at: endedAt, duration_seconds: durationSeconds })
    .select().single();
  if (error) throw error;
  return data;
}
