import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { ProtectedShell } from '@/components/auth/protected-shell'
import { AlbumEditor } from '@/components/editor/album-editor'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'
import { getEnvironment } from '@/lib/config/env'
import { Permissions } from '@/types/auth'

type EditAlbumPageProps = {
  params: Promise<{ slug: string }>
}

export default async function EditAlbumPage({ params }: EditAlbumPageProps) {
  const { slug } = await params
  // Mock-mode editor — draft reads are unsupported by the fetch
  // repositories, so this page would 404 in production. The fetch-mode
  // editor lives under /editor/albums/[slug].
  if (getEnvironment().apiMode === 'fetch') redirect(`/editor/albums/${slug}`)
  const draftRes = await repositories.albums.getDraft(slug)
  if (!draftRes.ok) notFound()
  const draft = draftRes.value
  if (!draft) notFound()

  const mediaRes = await repositories.media.list()
  const mediaItems = mediaRes.ok ? mediaRes.value : []

  return (
    <>
      <Header active={`/albums/${slug}/edit`} />
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
          <ProtectedShell permission={Permissions.AlbumEdit}>
            <AlbumEditor initial={draft} mediaItems={mediaItems} isNew={false} />
          </ProtectedShell>
        </Suspense>
      </main>
      <Footer />
      <TabBar active="/albums" />
    </>
  )
}
