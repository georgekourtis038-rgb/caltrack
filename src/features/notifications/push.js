// Client-side Web Push plumbing: capability checks, (un)subscribe, and syncing
// the subscription to Supabase so the server-side cron (api/send-reminders) can
// reach this device. All functions are safe to call on unsupported browsers —
// they resolve to a sensible state rather than throwing.

import { supabase } from '../../lib/supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Default reminder slots (local hours). Kept in sync with api/send-reminders.js.
const DEFAULT_SLOTS = [12, 16, 20]

// True when this browser can actually do Web Push. iOS only qualifies once the
// PWA is installed to the Home Screen (standalone), which this correctly gates
// on because the Push API isn't exposed in a plain iOS Safari tab.
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  )
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

// Current on/off state for THIS device, from the browser's own record of truth.
// Returns 'unsupported' | 'denied' | 'on' | 'off'.
export async function getPushState() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Ask permission (if needed), subscribe this device, and store the subscription
 * in Supabase. Must be called from a user gesture (the permission prompt only
 * appears in response to one). Throws with a friendly message on failure.
 */
export async function enablePush(userId) {
  if (!isPushSupported()) throw new Error('Notifications are not supported on this device.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Enable them for this site in your browser settings.'
        : 'Notification permission was dismissed.'
    )
  }

  const reg = await navigator.serviceWorker.ready
  // Reuse an existing subscription if the browser already has one.
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      timezone,
      enabled: true,
      slots: DEFAULT_SLOTS,
    },
    { onConflict: 'endpoint' }
  )
  if (error) {
    // Roll back the browser subscription so state stays consistent.
    await sub.unsubscribe().catch(() => {})
    throw new Error('Could not save your reminder settings. Please try again.')
  }

  return true
}

/**
 * Turn reminders off for this device: unsubscribe in the browser and drop the
 * row so the server stops targeting it.
 */
export async function disablePush() {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
