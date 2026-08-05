'use client'

import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageHeader } from '@/components/ui/page-header'
import { useLocale, type DictKey } from '@/lib/i18n'

const VALUES: { icon: string; titleKey: DictKey; descKey: DictKey }[] = [
  { icon: '🤝', titleKey: 'about.v1', descKey: 'about.v1d' },
  { icon: '😊', titleKey: 'about.v2', descKey: 'about.v2d' },
  { icon: '📸', titleKey: 'about.v3', descKey: 'about.v3d' },
]

export default function AboutPage() {
  const { t } = useLocale()

  return (
    <>
      <Header active="/about" />
      <main className="flex-1 pt-[52px]">
        <PageHeader
          title={t('about.pageTitle')}
          lead={t('about.pageLead')}
        />
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <article className="space-y-12">
              <div>
                <h2 className="font-jp text-xl font-semibold text-foreground-strong">
                  {t('about.storyTitle')}
                </h2>
                <p className="mt-4 text-sm leading-8 text-foreground">
                  {t('about.story')}
                </p>
              </div>

              <div className="relative aspect-[21/9] overflow-hidden rounded-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85"
                  alt=""
                  fill
                  sizes="(max-width: 896px) 100vw, 896px"
                  className="object-cover"
                />
              </div>

              <div>
                <h2 className="font-jp text-xl font-semibold text-foreground-strong">
                  {t('about.valuesTitle')}
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  {VALUES.map((v) => (
                    <div
                      key={v.titleKey}
                      className="rounded-2xl border border-border/50 bg-surface p-5 dark:bg-[#2a2d31]"
                    >
                      <div className="text-2xl" aria-hidden="true">
                        {v.icon}
                      </div>
                      <h3 className="mt-3 font-jp text-sm font-semibold text-foreground-strong">
                        {t(v.titleKey)}
                      </h3>
                      <p className="mt-1.5 text-xs leading-6 text-foreground">
                        {t(v.descKey)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
