/**
 * timeout-controller — wraps AbortController with a timeout.
 *
 * Aborts after `ms` with reason `'timeout'`. Caller MUST invoke
 * `cancel()` in the response/finally block so the timer is cleared
 * even on success.
 */

export type TimeoutHandle = {
  signal: AbortSignal
  cancel: () => void
}

export function withTimeout(ms: number, external?: AbortSignal): TimeoutHandle {
  const ctl = new AbortController()
  const timer = setTimeout(() => {
    try {
      ctl.abort('timeout')
    } catch {
      // ignore
    }
  }, ms)

  let externalListener: (() => void) | undefined
  if (external) {
    if (external.aborted) {
      // external already aborted; cancel ours immediately
      clearTimeout(timer)
      try {
        ctl.abort(external.reason)
      } catch {
        // ignore
      }
    } else {
      externalListener = () => {
        clearTimeout(timer)
        try {
          ctl.abort(external.reason)
        } catch {
          // ignore
        }
      }
      external.addEventListener('abort', externalListener, { once: true })
    }
  }

  // Compose both signals into one for fetch().
  const composed =
    external && !external.aborted
      ? composeSignals(ctl.signal, external)
      : ctl.signal

  return {
    signal: composed,
    cancel: () => {
      clearTimeout(timer)
      if (external && externalListener) {
        external.removeEventListener('abort', externalListener)
      }
      if (!ctl.signal.aborted) {
        try {
          ctl.abort()
        } catch {
          // ignore
        }
      }
    },
  }
}

function composeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([a, b])
  const ctl = new AbortController()
  const onAbort = () => {
    try {
      ctl.abort((a.aborted ? a.reason : undefined) ?? b.reason)
    } catch {
      // ignore
    }
  }
  a.addEventListener('abort', onAbort, { once: true })
  b.addEventListener('abort', onAbort, { once: true })
  if (a.aborted || b.aborted) onAbort()
  return ctl.signal
}
