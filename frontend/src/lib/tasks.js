// ─────────────────────────────────────────────────────────────────────────────
// Tâches du cabinet — real, auto-generated action items derived from live data
// (nothing invented): rendez-vous à confirmer, patients en salle d'attente,
// consultations terminées non encaissées. Manual tasks are stored locally on
// the device (localStorage), per signed-in user.
// ─────────────────────────────────────────────────────────────────────────────
import { moroccoNow, moDateKeyOf, moTime } from './time';

export function autoTasks(state) {
  const todayKey = moroccoNow().dateISO;
  const appts = [...(state?.manualAppts || []), ...(state?.myAppointments || [])];
  const tasks = [];

  appts
    .filter((a) => a.status === 'pending' && moDateKeyOf(a.datetime) >= todayKey)
    .forEach((a) => tasks.push({
      id: `confirm_${a.id}`, apptId: a.id, kind: 'confirm', screen: 'dappts',
      title: `Confirmer le rendez-vous de ${a.patientName || 'Patient'}`,
      sub: `${moDateKeyOf(a.datetime) === todayKey ? "Aujourd'hui" : moDateKeyOf(a.datetime)} · ${moTime(a.datetime)}`,
      cta: 'Confirmer',
    }));

  appts
    .filter((a) => moDateKeyOf(a.datetime) === todayKey && (a.arrivedAt || a.arrived_at) && !(a.inConsultAt || a.in_consultation_at) && a.status !== 'completed' && a.status !== 'no_show' && a.status !== 'cancelled')
    .forEach((a) => tasks.push({
      id: `waiting_${a.id}`, apptId: a.id, kind: 'waiting', screen: 'doctor',
      title: `${a.patientName || 'Patient'} attend en salle`,
      sub: `Arrivé à ${moTime(a.arrivedAt || a.arrived_at)}`,
      cta: 'Faire entrer',
    }));

  appts
    .filter((a) => moDateKeyOf(a.datetime) === todayKey && a.status === 'completed' && !a.paid)
    .forEach((a) => tasks.push({
      id: `pay_${a.id}`, apptId: a.id, kind: 'pay', screen: 'dappts',
      title: `Encaisser la consultation de ${a.patientName || 'Patient'}`,
      sub: `${moTime(a.datetime)} · ${(a.fee || 0).toLocaleString('fr-FR')} MAD attendus`,
      cta: 'Encaisser',
    }));

  return tasks;
}

const storeKey = (state) => `tabibo_tasks_${state?.appUser?.id || 'demo'}`;
export function loadManualTasks(state) {
  try { return JSON.parse(localStorage.getItem(storeKey(state)) || '[]'); } catch { return []; }
}
export function saveManualTasks(state, list) {
  try { localStorage.setItem(storeKey(state), JSON.stringify(list)); } catch { /* private mode */ }
}
export const taskBadge = (state) => autoTasks(state).length + loadManualTasks(state).filter((t) => !t.done).length;
