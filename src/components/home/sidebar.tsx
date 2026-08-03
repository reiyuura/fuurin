'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Hash, Heart, Shuffle } from 'lucide-react'
import {
  POPULAR_TAGS,
  TODAY_MEMORY,
  UPCOMING,
  pick,
  type Photo,
  type UpcomingEvent,
} from '@/lib/data'
import { useLocale } from '@/lib/i18n'
import { SectionHead } from '@/components/ui/section-head'
import { Card } from '@/components/ui/card'
import { Blossom, Fuurin } from '@/components/ui/decor'
import { Tag } from '@/components/ui/tag'

type SidebarProps = {
  recentPhotos: Photo[]
}

export function UpcomingCard() {
  const { locale, t } = useLocale()

  return (
    <Card>
      <SectionHead title={t('upcoming.heading')} href="/timeline" linkLabel={t('albums.viewAll')} as="h3" />
      <ul className="space-y-2.5">
        {UPCOMING.map((e) => (
          <UpcomingRow key={e.title.en} event={e} locale={locale} />
        ))}
      </ul>
    </Card>
  )
}

function UpcomingRow({ event, locale }: { event: UpcomingEvent; locale: 'ja' | 'id' | 'en' }) {
  return (
    <li>
      <a
        href="/timeline"
        className="group flex items-center gap-3 rounded-2xl p-2 transition duration-300 hover:translate-x-0.5 hover:bg-hover"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-[0.9rem] bg-primary-subtle leading-none transition-transform duration-300 group-hover:scale-105">
          <span className="font-jp text-[13px] font-bold text-primary-ink">{event.day}</span>
          <span className="text-[8.5px] text-primary-ink">{pick(event.month, locale)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-jp text-[12px] font-semibold leading-snug text-foreground-strong transition-colors group-hover:text-primary">
            {pick(event.title, locale)}
          </span>
          <span className="mt-0.5 block truncate text-[10px] leading-relaxed text-muted-foreground">
            {pick(event.note, locale)}
          </span>
        </span>
        <Image
          src={event.photo}
          alt={pick(event.title, locale)}
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-white/70 dark:ring-white/10"
        />
      </a>
    </li>
  )
}

export function TagsCard() {
  const { t } = useLocale()

  return (
    <Card>
      <h3 className="mb-3.5 flex items-center gap-1.5 font-jp text-[16px] font-bold tracking-tight text-foreground-strong">
        {t('tags.heading')}
        <Blossom size={13} className="text-primary" />
      </h3>
      <ul className="flex flex-wrap gap-2">
        {POPULAR_TAGS.map((tag) => (
          <li key={tag}>
            <Tag href={`/albums?tag=${encodeURIComponent(tag)}`} size="default">
              <Hash size={9} aria-hidden="true" />
              {tag}
            </Tag>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function TodayMemoryCard({ recentPhotos }: SidebarProps) {
  const { locale, t } = useLocale()
  const [idx, setIdx] = useState<number | null>(null)

  const photo = idx === null ? null : recentPhotos[idx]
  const src = photo?.src ?? TODAY_MEMORY.src
  const caption = photo ? pick(photo.caption, locale) : pick(TODAY_MEMORY.caption, locale)
  const likes = photo?.likes ?? TODAY_MEMORY.likes

  return (
    <div
      id="today"
      className="card-paper shadow-paper overflow-hidden rounded-[1.25rem] border border-border/60"
    >
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <h3 className="flex items-center gap-1.5 font-jp text-[16px] font-bold tracking-tight text-foreground-strong">
          {t('today.heading')}
          <Blossom size={13} className="text-primary" />
        </h3>
        <button
          onClick={() => setIdx(Math.floor(Math.random() * recentPhotos.length))}
          aria-label={t('today.shuffle')}
          className="grid size-8 shrink-0 place-items-center rounded-full text-subtle-foreground transition duration-300 hover:scale-110 hover:bg-hover hover:text-primary"
        >
          <Shuffle size={13} aria-hidden="true" />
        </button>
      </div>

      <figure className="photo-print relative mx-5 mt-4 aspect-[3/4] overflow-hidden rounded-[1rem] bg-muted">
        <motion.img
          key={src}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          src={src}
          alt={caption}
          loading="lazy"
          className="size-full object-cover"
        />
        <motion.div
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-2 top-0 origin-top"
        >
          <Fuurin className="scale-[.58]" />
        </motion.div>
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2b211f]/88 via-[#2b211f]/32 to-transparent px-4 pb-4 pt-12">
          <p className="font-jp text-[12px] font-semibold leading-snug text-on-media drop-shadow-sm">{TODAY_MEMORY.quoteJa}</p>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-on-media-muted">{caption}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-on-media">
            <Heart size={10} fill="currentColor" aria-hidden="true" />
            {likes}
            <span className="font-normal text-on-media-muted">{t('today.likes')}</span>
          </p>
        </figcaption>
      </figure>

      <a
        href="/favorites"
        className="flex items-center justify-center gap-1.5 border-t border-border/50 py-3 text-[11.5px] font-medium tracking-wide text-primary transition duration-300 hover:bg-hover dark:text-primary-ink"
      >
        {t('nav.favorites')}
        <ArrowRight size={11} aria-hidden="true" />
      </a>
    </div>
  )
}
