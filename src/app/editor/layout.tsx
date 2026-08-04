/**
 * Editor layout — sidebar + content area.
 *
 * Protected: requires admin/editor role.
 */

import { type Metadata } from 'next'
import { Suspense } from 'react'
import { EditorSidebar } from '@/components/editor/sidebar'
import { EditSkeleton as Skeleton } from '@/components/editor/skeleton'

export const metadata: Metadata = {
  title: 'Editor — Fuurin',
  robots: 'noindex, nofollow',
}

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — fixed on desktop, collapsible on mobile. */}
      <EditorSidebar />

      {/* Main content area. */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl">
        <Suspense fallback={<Skeleton />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}