'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { pick, type Photo } from '@/lib/data'
import { useFavorites } from '@/lib/favorites'
import { useLocale } from '@/lib/i18n'
import { SectionHead } from '@/components/ui/section-head'

type RecentMemoriesProps = {
  photos: Photo[]
}

export function RecentMemories({ photos }: RecentMemoriesProps) {
  const { locale, t } = useLocale()
  const cards = photos.slice(0, 4)
  const wide = photos[4]

  if (!wide) {
    return (
      <section>
        <SectionHead title={t('recent.latest')} href="/albums" linkLabel={t('albums.viewAll')} />
        <p className="text-[12.5px] text-muted-foreground">Belum ada foto terbaru.</p>
      </section>
    )
  }

  return (
    <section>
      <SectionHead title={t('recent.latest')} href="/albums" linkLabel={t('albums.viewAll')} />

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.25fr]">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {cards.map((p) => (
            <Card key={p.src} photo={p} caption={pick(p.caption, locale)} ago={pick(p.ago, locale)} />
          ))}
        </div>

        <Card
          photo={wide}
          caption={pick(wide.caption, locale)}
          ago={pick(wide.ago, locale)}
          className="min-h-[190px] lg:min-h-full"
        />
      </div>
    </section>
  )
}

function Card({
  photo,
  caption,
  ago,
  className = '',
}: {
  photo: Photo
  caption: string
  ago: string
  className?: string
}) {
  const { isFavorite, toggle, ready } = useFavorites()
  const { t } = useLocale()
  const fav = ready && isFavorite(photo.src)

  return (
    <motion.figure
      whileHover={{ y: -6, rotate: -0.4 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      className={`card-paper shadow-paper group relative overflow-hidden rounded-[1.5rem] border border-border/50 p-2.5 transition-shadow duration-300 hover:border-primary/25 hover:shadow-[0_18px_40px_rgba(200,124,141,0.20)] ${className || 'aspect-[4/3]'}`}
    >
      <span className="photo-print absolute inset-2.5 block overflow-hidden rounded-[1rem] bg-muted">
        <Image
          src={photo.src}
          alt={caption}
          fill
          sizes="(max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.08]"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 block bg-gradient-to-t from-[#2b211f]/94 via-[#2b211f]/48 to-transparent pt-14" />
      </span>
      <figcaption className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <span className="block truncate font-jp text-[12px] font-semibold leading-normal tracking-tight text-on-media drop-shadow-[0_1px_4px_rgba(43,33,31,0.92)]">{caption}</span>
        <span className="mt-1 block truncate text-[10px] font-medium leading-normal text-on-media-muted drop-shadow-[0_1px_4px_rgba(43,33,31,0.92)]">{ago}</span>
      </figcaption>

      <button
        onClick={() => toggle(photo.src)}
        aria-label={fav ? t('favorites.remove') : t('favorites.add')}
        aria-pressed={fav}
        className={`absolute right-5 top-5 grid size-9 place-items-center rounded-full backdrop-blur-md transition duration-300 hover:scale-110 ${ fav ? 'bg-card/92 text-primary shadow-[0_3px_12px_rgba(200,124,141,0.32)] dark:bg-[#2a2624]/88 dark:text-primary-ink' : 'bg-card/65 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 dark:bg-[#2a2624]/60 ' }`}
      >
        <Heart size={14} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </motion.figure>
  )
}
