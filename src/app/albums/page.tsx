import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { AlbumGrid } from '@/components/ui/album-grid'
import { AlbumsExplorer } from '@/components/albums/albums-explorer'
import { repositories } from '@/lib/repositories/repository-registry'

export default async function AlbumsPage() {
  // Albums list + media feed come from the repository (mock or API —
  // chosen by NEXT_PUBLIC_API_MODE). Tags per album are derived from
  // the media rows so the explorer never touches mock datasets.
  const [albumsRes, mediaRes] = await Promise.all([
    repositories.albums.listAlbums(),
    repositories.media.list(),
  ])
  const albums = albumsRes.ok ? albumsRes.value : []
  const media = mediaRes.ok ? mediaRes.value : []

  const tagsByAlbum: Record<string, string[]> = {}
  for (const item of media) {
    if (!tagsByAlbum[item.albumSlug]) tagsByAlbum[item.albumSlug] = []
    for (const tag of item.tags) {
      if (!tagsByAlbum[item.albumSlug]!.includes(tag)) tagsByAlbum[item.albumSlug]!.push(tag)
    }
  }

  return (
    <>
      <Header active="/albums" />
      <main className="w-full mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <PageHeader
          title="Album"
          lead="Kumpulan kenangan yang tersimpan per musim."
        />

        <section className="mt-6 sm:mt-10">
          {/* AlbumGrid's isLoading state reuses the skeleton rail —
              no duplicated fallback markup here. */}
          <Suspense fallback={<AlbumGrid albums={[]} isLoading />}>
            <AlbumsExplorer albums={albums} tagsByAlbum={tagsByAlbum} />
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/albums" />
    </>
  )
}