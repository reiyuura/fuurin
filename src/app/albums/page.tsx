import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { AlbumGrid } from '@/components/ui/album-grid'
import { AlbumsExplorer } from '@/components/albums/albums-explorer'

export default function AlbumsPage() {
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
            <AlbumsExplorer />
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/albums" />
    </>
  )
}
