import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { FavoritesGallery } from '@/components/favorites/favorites-gallery'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'

export default async function FavoritesPage() {
  const res = await repositories.media.list()
  const items = res.ok ? res.value : []

  return (
    <>
      <Header active="/favorites" />
      <main className="w-full mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <PageHeader title="Favorit" lead="Foto yang kamu tandai sebagai favorit." />
        <section className="mt-6 sm:mt-10">
          <Suspense
            fallback={
              <div className="space-y-6" aria-busy="true" aria-label="Memuat favorit">
                <PhotoGrid photos={[]} isLoading skeletonCount={8} />
              </div>
            }
          >
            <FavoritesGallery items={items} />
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/favorites" />
    </>
  )
}
