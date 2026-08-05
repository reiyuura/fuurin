import { Suspense } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { repositories } from '@/lib/repositories/repository-registry'
import { pick } from '@/lib/data'

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default async function TimelinePage() {
  // Timeline entries come from the album repo's mock store via a
  // dedicated endpoint. Falls back to an empty list if the route
  // isn't bound in the current mock store.
  const api = repositories.albums as unknown as {
    listTimelineEntries?: () => Promise<
      { ok: true; value: import('@/lib/data').TimelineEntry[] } | { ok: false }
    >
  }
  const res = api.listTimelineEntries ? await api.listTimelineEntries() : { ok: false as const }
  const entries = res.ok ? res.value : []

  return (
    <>
      <Header active="/timeline" />
      <main className="w-full mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6 sm:pt-24 md:pb-20 lg:px-8">
        <PageHeader title="Timeline" lead="Momen penting kelas, dirangkum berdasarkan tanggal." />
        <section className="mt-6 sm:mt-10">
          <Suspense
            fallback={
              <div className="space-y-6" aria-busy="true" aria-label="Memuat timeline">
                <PhotoGrid photos={[]} isLoading skeletonCount={6} />
              </div>
            }
          >
            <TimelineList entries={entries} />
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/timeline" />
    </>
  )
}

function TimelineList({ entries }: { entries: import('@/lib/data').TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-[12.5px] text-muted-foreground">
        Belum ada entri timeline.
      </p>
    )
  }
  return (
    <ol className="relative ml-3 border-l border-border/60 pl-6">
      {entries.map((entry) => {
        const href = entry.album ? `/albums/${entry.album}` : '/timeline'
        return (
          <li key={`${entry.date}-${entry.title.en}`} className="mb-8 last:mb-0">
            <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
            <time className="mb-1 block text-[10.5px] font-bold uppercase tracking-[.18em] text-muted-foreground">
              {formatDate(entry.date)}
            </time>
            <Link href={href} className="group block">
              <h3 className="font-jp text-[14px] font-semibold text-foreground-strong transition-colors group-hover:text-primary">
                {pick(entry.title, 'id')}
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {pick(entry.body, 'id')}
              </p>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
