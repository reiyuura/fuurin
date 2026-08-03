'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StatusPage } from './status-page'
import { monitoring } from '@/lib/monitoring/monitoring-provider'

function isChunkError(error: Error): boolean {
  const value = `${error.name} ${error.message}`.toLowerCase()
  return value.includes('chunkloaderror') ||
    value.includes('loading chunk') ||
    value.includes('dynamically imported module')
}

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const chunk = isChunkError(error)

  useEffect(() => {
    monitoring.captureException(error, {
      pathname,
      tags: { category: chunk ? 'chunk-load' : 'runtime' },
      extra: { digest: error.digest ?? null },
    })
  }, [error, pathname, chunk])

  return (
    <StatusPage
      kind="error"
      description={
        chunk
          ? 'Versi aplikasi telah diperbarui. Muat ulang untuk mengambil aset terbaru.'
          : undefined
      }
      secondary={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (chunk) window.location.reload()
            else reset()
          }}
        >
          {chunk ? 'Muat ulang' : 'Coba lagi'}
        </Button>
      }
    />
  )
}
