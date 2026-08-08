'use client'

/**
 * useFocusTrap — focus trap + restore for modal dialogs.
 *
 * On mount: focuses the first focusable element inside the container
 * (or the container itself). Tab cycles inside. On unmount: restores
 * focus to the previously focused element.
 */

import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Initial focus: an element marked [data-autofocus] wins; otherwise
    // the first focusable (which is the CANCEL button in confirm
    // dialogs — making Enter cancel instead of confirm), else container.
    const preferred = container.querySelector<HTMLElement>('[data-autofocus]')
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    ;(preferred ?? focusables[0] ?? container).focus()

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !container) return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement

      if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}