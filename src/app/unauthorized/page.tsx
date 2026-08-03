import type { Metadata } from 'next'
import { StatusPage } from '@/components/system/status-page'

export const metadata: Metadata = {
  title: 'Login diperlukan',
  robots: { index: false, follow: false },
}

export default function UnauthorizedPage() {
  return <StatusPage kind="unauthorized" />
}
