import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { AlbumDetail } from '@/components/albums/album-detail'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'
import { getRelatedAlbums } from '@/lib/album-utils'

type AlbumDetailPageProps = {
  params: Promise<{ slug: string }>
}

export default async function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const { slug } = await params
  const albumRes = await repositories.albums.getAlbum(slug)
  if (!albumRes.ok || !albumRes.value) notFound()
  const album = albumRes.value

  const photosRes = await repositories.albums.listPhotos(slug)
  const photos = photosRes.ok ? photosRes.value : []

  const allAlbumsRes = await repositories.albums.listAlbums()
  const allAlbums = allAlbumsRes.ok ? allAlbumsRes.value : []
  const related = getRelatedAlbums(album, allAlbums, 4)

  return (
    <>
      <Header active="/albums" />
      <main className="w-full mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <Suspense
          fallback={
            <div className="space-y-12">
              <div className="shimmer h-[220px] rounded-[2rem] sm:h-[300px]" />
              <PhotoGrid photos={[]} isLoading skeletonCount={8} />
            </div>
          }
        >
          <AlbumDetail album={album} photos={photos} related={related} />
        </Suspense>
      </main>
      <Footer />
      <TabBar active="/albums" />
    </>
  )
}
