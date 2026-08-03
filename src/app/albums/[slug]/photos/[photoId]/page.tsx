import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PhotoViewer } from '@/components/photos/photo-viewer'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'

type PhotoPageProps = {
  params: Promise<{ slug: string; photoId: string }>
}

export default async function PhotoPage({ params }: PhotoPageProps) {
  const { slug, photoId } = await params

  const albumRes = await repositories.albums.getAlbum(slug)
  if (!albumRes.ok || !albumRes.value) notFound()
  const album = albumRes.value

  const photosRes = await repositories.albums.listPhotos(slug)
  if (!photosRes.ok) notFound()
  const photos = photosRes.value
  const idx = photos.findIndex((p) => String(photos.indexOf(p)) === photoId)
  if (idx < 0) notFound()
  const prevId = idx > 0 ? String(idx - 1) : null
  const nextId = idx < photos.length - 1 ? String(idx + 1) : null
  const related = idx > 0 ? [photos[idx - 1]] : idx < photos.length - 1 ? [photos[idx + 1]] : []

  return (
    <>
      <Header active="/albums" />
      <main className="w-full mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <Suspense
          fallback={
            <div className="space-y-6" aria-busy="true" aria-label="Memuat foto">
              <div className="shimmer h-[60vh] rounded-[2rem]" />
              <PhotoGrid photos={[]} isLoading skeletonCount={6} />
            </div>
          }
        >
          <PhotoViewer
            slug={slug}
            album={album}
            photos={photos}
            photoId={photoId}
            prevId={prevId}
            nextId={nextId}
            related={related}
          />
        </Suspense>
      </main>
      <Footer />
      <TabBar active="/albums" />
    </>
  )
}
