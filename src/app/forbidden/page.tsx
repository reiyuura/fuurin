import type { Metadata } from 'next'
import { StatusPage } from '@/components/system/status-page'

export const metadata: Metadata = {
  title: 'Akses ditolak',
  robots: { index: false, follow: false },
}

export default function ForbiddenPage() {
  return <StatusPage kind="forbidden" />
}
