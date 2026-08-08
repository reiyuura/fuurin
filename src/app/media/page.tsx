import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { MediaExplorer } from '@/components/media/media-explorer'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'

export default async function MediaPage() {
  const res = await repositories.media.list()
  const items = res.ok ? res.value : []

  return (
    <>
      <Header active="/media" />
      <main className="w-full mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <PageHeader title="Media Library" lead="Semua foto kelas dalam satu tempat." />

        <section className="mt-6 sm:mt-10">
          <Suspense
            fallback={
              <div className="space-y-6" aria-busy="true" aria-label="Memuat media">
                <div className="flex flex-wrap gap-2">
                  <div className="shimmer h-10 w-32 rounded-full" />
                  <div className="shimmer h-10 w-40 rounded-full" />
                  <div className="shimmer h-10 w-28 rounded-full" />
                </div>
                <PhotoGrid photos={[]} isLoading skeletonCount={12} />
              </div>
            }
          >
            <MediaExplorer items={items} />
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/media" />
    </>
  )
}

// Data-driven page — render per request so freshly-created albums/
// photos appear immediately (static prerender would freeze at build time).
export const dynamic = "force-dynamic"
