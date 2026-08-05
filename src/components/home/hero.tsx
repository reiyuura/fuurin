'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { useStats } from '@/hooks/use-stats'
import { useLocale, type DictKey } from '@/lib/i18n'
import { useSession } from '@/components/auth/session-provider'
import { Fuurin, Petal, Blossom } from '@/components/ui/decor'

function greetKey(hour: number, authenticated: boolean): DictKey {
  const prefix = authenticated ? 'greet.' : 'greet.guest.'
  if (hour < 11) return `${prefix}morning` as DictKey
  if (hour < 18) return `${prefix}day` as DictKey
  return `${prefix}evening` as DictKey
}

export function HeroSection() {
  const stats = useStats()
  const { t } = useLocale()
  const { status } = useSession()
  const authenticated = status === 'authenticated'
  const [key, setKey] = useState<DictKey>(greetKey(12, false))

  useEffect(() => setKey(greetKey(new Date().getHours(), authenticated)), [authenticated])

  return (
    <section className="group relative overflow-hidden rounded-[2rem] border border-white/[0.08] shadow-[0_18px_52px_rgba(0,0,0,0.28)]">
      {/* ── Always-dark background ────────────────────────────────────── */}
      <Image
        src="https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1600&q=85"
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="(max-width: 1024px) 100vw, 1020px"
        className="scale-[1.02] object-cover opacity-85 blur-[0.2px] transition-transform duration-[8s] ease-out group-hover:scale-[1.05]"
      />

      {/* Deep warm scrim — same in both themes so text reads identically */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(44,30,28,0.72)_0%,rgba(48,34,32,0.78)_50%,rgba(40,28,26,0.68)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_12%_8%,rgba(72,48,40,0.45),transparent_68%)]" />

      {/* Soft warm glow behind the greeting */}
      <div className="pointer-events-none absolute left-[5%] top-[15%] size-[420px] rounded-full bg-[radial-gradient(circle,rgba(220,150,130,0.14)_0%,transparent_68%)] blur-3xl" />

      {/* Sakura corner accents — rose on dark, no theme-dependent colours */}
      <Blossom className="pointer-events-none absolute -left-4 -top-4 text-rose-300/[.18]" size={110} />
      <Blossom className="pointer-events-none absolute -bottom-8 right-6 text-rose-300/[.12]" size={88} />

      {/* Floating petals — cinematic drift */}
      {[
        { top: '8%', left: '42%', d: 0, size: 13 },
        { top: '62%', left: '28%', d: 1.8, size: 11 },
        { top: '28%', left: '56%', d: 3.2, size: 12 },
        { top: '18%', left: '68%', d: 4.6, size: 10 },
        { top: '74%', left: '48%', d: 6.0, size: 11 },
        { top: '44%', left: '34%', d: 7.4, size: 12 },
      ].map((p, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute text-rose-300/[0.32]"
          style={{ top: p.top, left: p.left }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: [0.3, 0.6, 0.3], y: [0, 20, 0], rotate: [0, 28, -18, 0] }}
          transition={{ duration: 9, delay: p.d, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Petal size={p.size} />
        </motion.span>
      ))}

      {/* ── Content layer — always white on dark, identical in both themes ── */}
      <div className="relative flex items-center gap-8 px-9 py-16 sm:px-14 sm:py-20 lg:px-16 lg:py-24">
        <div className="min-w-0 flex-1 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3.5"
          >
            {/* Title — always white */}
            <p className="font-jp text-[28px] font-bold leading-[1.28] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:text-[36px] lg:text-[42px]">
              {t(key)}
            </p>
            {/* Subtitle — white 90% */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-[16px] font-medium leading-relaxed text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)] sm:text-[17px]"
            >
              {t(authenticated ? 'greet.welcome' : 'greet.guest.welcome')}
            </motion.p>
            {/* Description — white 70% */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="font-jp text-[13px] italic leading-relaxed text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
            >
              {t('greet.sub')}
            </motion.p>
          </motion.div>

          {/* Stats — labels white 70% */}
          <motion.dl
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="flex flex-wrap gap-x-9 gap-y-3.5"
          >
            {[
              { v: stats.members, k: 'stats.members' as DictKey },
              { v: stats.albums, k: 'stats.albums' as DictKey },
              { v: stats.photos.toLocaleString('en-US'), k: 'stats.photos' as DictKey },
            ].map(({ v, k }, i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.85 + i * 0.1, duration: 0.5 }}
                className="flex items-baseline gap-2"
              >
                <dt className="sr-only">{t(k)}</dt>
                {/* Stat numbers — white, bold */}
                <dd className="font-jp text-[22px] font-bold leading-none tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.30)]">
                  {v}
                </dd>
                {/* Stat labels — white 70% */}
                <span className="text-[11.5px] font-medium uppercase tracking-[.1em] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.20)]">
                  {t(k)}
                </span>
              </motion.div>
            ))}
          </motion.dl>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.7 }}
            className="flex flex-wrap gap-4"
          >
            {/* Primary CTA — sakura pink gradient */}
            <Link
              href="/albums"
              className="group/cta inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#d98fa1] via-[#c87c8d] to-[#ba6d7f] px-7 py-3.5 text-[13.5px] font-semibold tracking-wide text-white shadow-[0_10px_28px_rgba(200,124,141,0.38),0_2px_8px_rgba(200,124,141,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(200,124,141,0.50),0_4px_12px_rgba(200,124,141,0.35)]"
            >
              {t('greet.ctaAlbum')}
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              />
            </Link>
            {/* Secondary CTA — translucent white glass */}
            <Link
              href="/timeline"
              className="group/cta inline-flex items-center gap-2.5 rounded-full border border-white/[0.18] bg-white/[0.10] px-7 py-3.5 text-[13.5px] font-semibold tracking-wide text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.32] hover:bg-white/[0.16] hover:text-white hover:shadow-[0_8px_22px_rgba(0,0,0,0.24)]"
            >
              {t('greet.ctaTimeline')}
              <Clock size={14} aria-hidden="true" />
            </Link>
          </motion.div>
        </div>

        {/* Wind chime — soft pendulum sway */}
        <motion.div
          initial={{ opacity: 0, rotate: -8 }}
          animate={{ opacity: 1, rotate: [-4, 4, -4] }}
          transition={{ opacity: { delay: 1.3, duration: 0.8 }, rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
          className="hidden shrink-0 origin-top sm:block"
        >
          <Fuurin label="風鈴のクラス" />
        </motion.div>
      </div>
    </section>
  )
}
