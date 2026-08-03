'use client'

/**
 * use-unsaved-guard — feature hook.
 *
 * Two parts:
 *  1. `beforeunload` — browser refresh/close confirmation.
 *  2. Internal link interception — capture clicks inside the editor
 *     container that would navigate away from the editor route.
 *
 * Both are gated on `when` so the guard only fires while dirty.
 * Returns a `confirm(message)` for SPA-style navigations triggered
 * by the page chrome (TabBar, Header).
 */

import { useEffect } from 'react'

export type UnsavedGuardOpts = {
  /** True while there are unsaved changes. */
  when: boolean
  /** Container to scope the click interceptor; defaults to `document`. */
  root?: HTMLElement | null
  /** Locale-aware prompt message. */
  message?: string
}

export function useUnsavedGuard({
  when,
  root,
  message = 'Ada perubahan belum disimpan. Yakin tinggalkan halaman ini?',
}: UnsavedGuardOpts): void {
  useEffect(() => {
    if (!when) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      // Modern browsers ignore the custom string, but the call is required.
      e.returnValue = message
      return message
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when, message])

  useEffect(() => {
    if (!when) return
    const target = root ?? document
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      const path = e.composedPath()
      const anchor = path.find(
        (node): node is HTMLAnchorElement =>
          node instanceof HTMLAnchorElement,
      )
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      // Only intercept same-origin, in-app navigation.
      if (anchor.target && anchor.target !== '_self') return
      if (!window.confirm(message)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    target.addEventListener('click', onClick as EventListener, true)
    return () => target.removeEventListener('click', onClick as EventListener, true)
  }, [when, root, message])
}
