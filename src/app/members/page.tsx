/**
 * Members page — displays class members from API.
 */

import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { MemberCardSkeleton, MemberGrid } from '@/components/members/member-grid'
import { repositories } from '@/lib/repositories/repository-registry'
import type { Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[]>>
}

function getLocale(sp: Record<string, string | string[]>): Locale {
  const v = Array.isArray(sp.locale) ? sp.locale[0] : sp.locale
  if (v === 'ja' || v === 'en') return v
  return 'id'
}

export default async function MembersPage({ searchParams }: Props) {
  const sp = await searchParams
  const locale = getLocale(sp)
  const res = await repositories.users.listMembers()
  const members = res.ok ? res.value : []
  if (!res.ok) {
    console.error('[members] listMembers failed:', res.error?.code, res.error?.message)
  }

  return (
    <>
      <Header active="/members" />
      <main className="w-full mx-auto max-w-[1100px] px-4 pb-24 pt-5 sm:px-6 sm:pt-24 lg:px-8">
        <PageHeader
          title="Anggota Kelas"
          lead="Kenali orang-orang yang membuat kenangan ini bermakna."
        />
        <section className="mt-6 sm:mt-10">
          <Suspense fallback={<MemberCardSkeleton count={6} />}>
            {members.length > 0 ? (
              <MemberGrid members={members} locale={locale} />
            ) : (
              <p className="text-center text-[13px] text-muted-foreground py-20">
                Belum ada data anggota.
              </p>
            )}
          </Suspense>
        </section>
      </main>
      <Footer />
      <TabBar active="/members" />
    </>
  )
}
