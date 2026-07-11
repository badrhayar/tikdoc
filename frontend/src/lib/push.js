// Web Push opt-in — subscribes this browser and stores the subscription so
// send-reminder can notify the patient (J-1 reminders, freed slots, confirmations).
// Requires VITE_VAPID_PUBLIC_KEY at build time; without it the UI hides itself.
import { supabase } from './supabaseClient';

const PUB = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export const pushSupported = () =>
  !!PUB && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const b64ToU8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

/** Current permission/subscription state: 'on' | 'off' | 'denied' | 'unsupported' */
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  } catch { return 'off'; }
}

/** Ask permission, subscribe, persist. Returns 'on' | 'denied' | 'error'. */
export async function enablePush(userId) {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(PUB) });
    const j = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: 'endpoint' }
    );
    if (error) throw error;
    return 'on';
  } catch (e) {
    console.warn('[Tabibo] push subscribe failed', e);
    return 'error';
  }
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (_) { /* best effort */ }
  return 'off';
}
