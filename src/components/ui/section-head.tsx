'use client'

import { ArrowRight } from 'lucide-react'
import { Blossom } from '@/components/ui/decor'

export function SectionHead({
  title,
  href,
  linkLabel,
  as = 'h2',
}: {
  title: string
  href?: string
  linkLabel?: string
  as?: 'h2' | 'h3'
}) {
  const Tag = as

  return (
    <div className={`flex items-end justify-between gap-3 ${as === 'h2' ? 'mb-5' : 'mb-3.5'}`}>
      {/* h2 (page sections) outranks h3 (sidebar cards) in both size and weight. */}
      <Tag
        className={`flex items-center gap-2 font-jp font-bold tracking-tight text-foreground-strong ${ as === 'h2' ? 'text-[19px]' : 'text-[16px]' }`}
      >
        {title}
        <Blossom size={as === 'h2' ? 15 : 13} className="text-primary" />
      </Tag>
      {href && linkLabel && (
        <a
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] font-semibold tracking-wide text-primary-ink transition duration-300 hover:bg-hover"
        >
          {linkLabel}
          <ArrowRight size={11} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  )
}
