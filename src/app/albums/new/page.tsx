import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { ProtectedShell } from '@/components/auth/protected-shell'
import { AlbumEditor } from '@/components/editor/album-editor'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'
import { getEnvironment } from '@/lib/config/env'
import type { AlbumDraft } from '@/types/album-editor'
import { Permissions } from '@/types/auth'

function emptyDraft(): AlbumDraft {
  const today = new Date().toISOString().slice(0, 10)
  return {
    slug: '',
    title: '',
    description: '',
    date: today,
    location: '',
    visibility: 'draft',
    coverMediaId: null,
    photoIds: [],
    updatedAt: Date.now(),
  }
}

export default async function NewAlbumPage() {
  // This page is the mock-mode editor. In fetch mode the draft write API
  // lives behind /editor/* — sending users here would dead-end every
  // save with an "unsupported" error.
  if (getEnvironment().apiMode === 'fetch') redirect('/editor/albums/new')
  const mediaRes = await repositories.media.list()
  const mediaItems = mediaRes.ok ? mediaRes.value : []
  const initial = emptyDraft()

  return (
    <>
      <Header active="/albums/new" />
      <main className="w-full mx-auto max-w-[1100px] px-4 pb-24 pt-5 sm:px-6 sm:pt-24 lg:px-8">
        <Suspense
          fallback={
            <div className="space-y-4" aria-busy="true" aria-label="Memuat editor">
              <div className="shimmer h-24 rounded-[1.5rem]" />
              <div className="shimmer h-72 rounded-[1.5rem]" />
              <PhotoGrid photos={[]} isLoading skeletonCount={6} />
            </div>
          }
        >
          <ProtectedShell permission={Permissions.AlbumCreate}>
            <AlbumEditor initial={initial} mediaItems={mediaItems} isNew />
          </ProtectedShell>
        </Suspense>
      </main>
      <Footer />
      <TabBar active="/albums" />
    </>
  )
}
