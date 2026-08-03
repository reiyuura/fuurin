'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Root providers may be unavailable here. Keep this boundary
    // standalone and emit only sanitized identifying fields.
    console.error('[global-error]', {
      name: error.name,
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="id">
      <body style={{ margin: 0, background: '#faf7f3', color: '#2f3542', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ maxWidth: 520, padding: 32, border: '1px solid #e9e2da', borderRadius: 24, background: '#fffdfa', textAlign: 'center' }}>
            <p style={{ color: '#9a4a5d', fontWeight: 700, letterSpacing: '.18em', fontSize: 11 }}>500</p>
            <h1 style={{ margin: '8px 0', fontSize: 26 }}>Terjadi kesalahan</h1>
            <p style={{ color: '#6f665f', lineHeight: 1.7 }}>Aplikasi tidak dapat dimuat. Coba ulang atau kembali ke beranda.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={reset} style={{ border: 0, borderRadius: 14, padding: '10px 16px', background: '#c87c8d', color: '#fffdfa', fontWeight: 700 }}>Coba lagi</button>
              <a href="/" style={{ borderRadius: 14, padding: '10px 16px', border: '1px solid #e9e2da', color: '#2f3542', textDecoration: 'none', fontWeight: 700 }}>Beranda</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
