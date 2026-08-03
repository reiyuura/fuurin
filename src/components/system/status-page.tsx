import Link from 'next/link'
import { AlertTriangle, LockKeyhole, SearchX, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type StatusKind = 'not-found' | 'error' | 'unauthorized' | 'forbidden'

const PRESENTATION: Record<
  StatusKind,
  { code: string; title: string; description: string; Icon: LucideIcon }
> = {
  'not-found': {
    code: '404',
    title: 'Halaman tidak ditemukan',
    description: 'Halaman atau album yang dicari mungkin sudah dipindahkan.',
    Icon: SearchX,
  },
  error: {
    code: '500',
    title: 'Terjadi kesalahan',
    description: 'Aplikasi tidak dapat menyelesaikan permintaan ini. Coba lagi.',
    Icon: AlertTriangle,
  },
  unauthorized: {
    code: '401',
    title: 'Login diperlukan',
    description: 'Masuk terlebih dahulu untuk membuka halaman ini.',
    Icon: LockKeyhole,
  },
  forbidden: {
    code: '403',
    title: 'Akses ditolak',
    description: 'Akun ini tidak memiliki izin untuk membuka halaman tersebut.',
    Icon: ShieldAlert,
  },
}

export function StatusPage({
  kind,
  description,
  primaryHref,
  primaryLabel,
  secondary,
}: {
  kind: StatusKind
  description?: string
  primaryHref?: string
  primaryLabel?: string
  secondary?: React.ReactNode
}) {
  const item = PRESENTATION[kind]
  const Icon = item.Icon
  const href = primaryHref ?? (kind === 'unauthorized' ? '/login' : '/')
  const label = primaryLabel ?? (kind === 'unauthorized' ? 'Login' : 'Kembali ke beranda')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <section className="card-paper w-full max-w-lg rounded-[1.5rem] border border-border/60 p-7 text-center shadow-paper sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-subtle text-primary-strong" aria-hidden="true">
          <Icon size={24} />
        </span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-primary-ink">
          {item.code}
        </p>
        <h1 className="mt-2 font-jp text-2xl font-bold tracking-tight text-foreground-strong">
          {item.title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
          {description ?? item.description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={href}>{label}</Link>
          </Button>
          {secondary}
        </div>
      </section>
    </main>
  )
}
