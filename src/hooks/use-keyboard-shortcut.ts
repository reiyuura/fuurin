'use client'

/**
 * useKeyboardShortcut — editor shortcuts.
 * Ctrl+S → save, Ctrl+P → preview, Esc → close.
 */

import { useEffect } from 'react'

export function useKeyboardShortcut(handlers: {
  onSave?: () => void
  onPreview?: () => void
  onClose?: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 's') { e.preventDefault(); handlers.onSave?.() }
      if (mod && e.key === 'p') { e.preventDefault(); handlers.onPreview?.() }
      if (e.key === 'Escape') handlers.onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}