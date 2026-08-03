'use client'

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string
  title: string
  lead?: string
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(200,124,141,0.07),transparent_60%)] dark:opacity-40" />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="relative">
          <span className="pointer-events-none absolute -left-4 -top-8 select-none font-jp text-[90px] leading-none text-primary/[.10]" aria-hidden="true">
            桜
          </span>
          {eyebrow && (
            <p className="relative mb-2 text-[10px] font-bold tracking-[.22em] text-primary-ink">{eyebrow}</p>
          )}
          <h1 className="relative font-jp text-[1.9rem] font-semibold leading-tight tracking-tight text-foreground-strong sm:text-4xl">
            {title}
          </h1>
          {lead && (
            <p className="relative mt-3 max-w-xl text-sm leading-7 text-foreground">{lead}</p>
          )}
        </div>
      </div>
    </section>
  )
}
