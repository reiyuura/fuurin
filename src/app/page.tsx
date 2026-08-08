import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { HeroSection } from '@/components/home/hero'
import { QuickActions } from '@/components/home/quick-actions'
import { FeaturedAlbums } from '@/components/home/featured-albums'
import { RecentMemories } from '@/components/home/recent-memories'
import { UpcomingCard, TagsCard, TodayMemoryCard } from '@/components/home/sidebar'
import { repositories } from '@/lib/repositories/repository-registry'

export default async function HomePage() {
  const [albumsRes, mediaRes] = await Promise.all([
    repositories.albums.listAlbums(),
    repositories.media.list(),
  ])
  const albums = albumsRes.ok ? albumsRes.value : []
  // Use the first 8 media items as the recent feed for the home hero.
  const recent = (mediaRes.ok ? mediaRes.value : []).slice(0, 8)
  const photos = recent.map((m) => ({
    src: m.src,
    caption: m.caption,
    ago: m.ago,
    album: m.albumSlug,
    tags: m.tags,
    likes: m.likes,
    orientation: m.orientation,
  }))

  return (
    <>
      <Header active="/" />

      <main className="w-full mx-auto max-w-[1400px] px-4 pb-28 pt-24 sm:px-6 md:pb-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-14">
            <HeroSection />
            <QuickActions />
            <FeaturedAlbums albums={albums} />
            <RecentMemories photos={photos} />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <UpcomingCard />
            <TagsCard />
            <TodayMemoryCard recentPhotos={photos} />
          </aside>
        </div>
      </main>

      <Footer />
      <TabBar active="/" />
    </>
  )
}

// Data-driven page — render per request so freshly-created albums/
// photos appear immediately (static prerender would freeze at build time).
export const dynamic = "force-dynamic"
