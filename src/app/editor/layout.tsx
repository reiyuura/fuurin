/**
 * Editor layout — sidebar + content area.
 *
 * Protected: requires admin/editor role.
 */

import { type Metadata } from 'next'
import { Suspense } from 'react'
import { EditorSidebar } from '@/components/editor/sidebar'
import { EditSkeleton as Skeleton } from '@/components/editor/skeleton'
import { ProtectedShell } from '@/components/auth/protected-shell'
import { Roles } from '@/types/auth'

export const metadata: Metadata = {
  title: 'Editor — Fuurin',
  robots: 'noindex, nofollow',
}

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    // Suspense must wrap ProtectedShell: useRequireAuth reads
    // useSearchParams, which bails out of prerendering without a
    // boundary (Next.js 16 missing-suspense-with-csr-bailout).
    <Suspense fallback={<Skeleton />}>
      {/* Role gate for the ENTIRE editor shell (sidebar included) — the
          proxy only checks cookie presence, and individual pages used to
          render for guests/viewers until a mutation 401'd. */}
      <ProtectedShell roles={[Roles.Admin, Roles.Editor]}>
        <div className="flex min-h-screen">
          {/* Sidebar — fixed on desktop, collapsible on mobile. */}
          <EditorSidebar />

          {/* Main content area. */}
          <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl">
            {children}
          </main>
        </div>
      </ProtectedShell>
    </Suspense>
  )
}