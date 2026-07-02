import { useEffect, useState } from 'react'
import { disablePush, enablePush, getPushState, isPushSupported } from './push.js'

// Reminders card for the bottom of Profile. Owns the enable/disable toggle for
// THIS device and surfaces the platform caveats honestly (unsupported / blocked
// / iOS-install-required) instead of failing silently.
export default function NotificationSettings({ userId }) {
  const [state, setState] = useState('loading') // loading | unsupported | denied | on | off
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    getPushState().then((s) => active && setState(s))
    return () => {
      active = false
    }
  }, [])

  async function toggle() {
    setError(null)
    setBusy(true)
    try {
      if (state === 'on') {
        await disablePush()
        setState('off')
      } else {
        await enablePush(userId)
        setState('on')
      }
    } catch (err) {
      setError(err.message)
      // Re-read in case permission flipped to 'denied'.
      setState(await getPushState())
    } finally {
      setBusy(false)
    }
  }

  const on = state === 'on'
  const supported = isPushSupported()
  const disabled = busy || state === 'loading' || state === 'unsupported' || state === 'denied'

  return (
    <section className="mt-4 rounded-2xl bg-surface-2 p-5 ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Meal reminders</h2>
          <p className="mt-0.5 text-xs text-muted">
            A nudge to log your food, only when you haven't already.
          </p>
        </div>

        <button
          role="switch"
          aria-checked={on}
          aria-label="Toggle meal reminders"
          disabled={disabled}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
            on ? 'bg-brand' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {state === 'on' && (
        <p className="mt-3 text-xs text-brand">
          On for this device · around 12pm, 4pm & 8pm your time.
        </p>
      )}
      {state === 'unsupported' && (
        <p className="mt-3 text-xs text-muted">
          {/iPad|iPhone|iPod/.test(navigator.userAgent)
            ? 'On iPhone/iPad, add CalTrack to your Home Screen first (Share → Add to Home Screen), then reopen it to enable reminders.'
            : 'This browser doesn’t support push notifications.'}
        </p>
      )}
      {state === 'denied' && (
        <p className="mt-3 text-xs text-danger">
          Notifications are blocked. Re-enable them for this site in your browser settings, then reload.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {!supported && state !== 'unsupported' && state !== 'loading' && (
        <p className="mt-3 text-xs text-muted">Reminders aren't available on this device.</p>
      )}
    </section>
  )
}
