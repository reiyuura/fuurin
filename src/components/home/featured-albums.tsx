'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Images } from 'lucide-react'
import { pick, type Album } from '@/lib/data'
import { useLocale } from '@/lib/i18n'
import { SectionHead } from '@/components/ui/section-head'
import { StatBadge } from '@/components/ui/stat-badge'

type FeaturedAlbumsProps = {
  albums: Album[]
}

export function FeaturedAlbums({ albums }: FeaturedAlbumsProps) {
  const { locale, t } = useLocale()

  return (
    <section>
      <SectionHead title={t('albums.featured')} href="/albums" linkLabel={t('albums.viewAll')} />

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent dark:from-[#1e1b1a]" />
        <ul className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {albums.map((a) => (
          <motion.li
            key={a.slug}
            whileHover={{ y: -7, rotate: -0.6 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="w-[224px] shrink-0 snap-start"
          >
            <Link
              href={`/albums/${a.slug}`}
              className="card-paper shadow-paper group block rounded-[1.5rem] border border-border/50 p-2.5 pb-0 transition duration-300 hover:border-primary/25 hover:shadow-[0_18px_42px_rgba(200,124,141,0.18)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted">
                <Image
                  src={a.cover}
                  alt={pick(a.title, locale)}
                  fill
                  sizes="224px"
                  className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.08]"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-[#2b211f]/78 to-transparent px-3 pb-2.5 pt-9">
                  <StatBadge icon={Images} value={a.count} />
                  <StatBadge icon={Eye} value={a.views >= 1000 ? `${(a.views / 1000).toFixed(1)}k` : a.views} />
                </div>
              </div>
              <div className="px-1.5 pb-4 pt-3.5">
                <h3 className="truncate font-jp text-[13.5px] font-semibold leading-snug tracking-tight text-foreground-strong transition-colors duration-300 group-hover:text-primary-ink dark:group-hover:text-primary-ink">
                  {pick(a.title, locale)}
                </h3>
                <p className="mt-1.5 truncate text-[10.5px] font-medium tracking-[.04em] text-subtle-foreground">
                  {pick(a.period, locale)}
                </p>
              </div>
            </Link>
          </motion.li>
        ))}
        </ul>
      </div>
    </section>
  )
}
