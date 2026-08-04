'use client'

/**
 * Album edit — view fields + inline update + photo list.
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { FetchAlbumRepository } from '@/lib/repositories/fetch-album-repository'
import { useSession } from '@/components/auth/session-provider'
import { useAuthReady } from '@/hooks/use-auth-ready'
import { useToast } from '@/components/ui/toast'
import { DeleteAlbumButton } from '@/components/editor/delete-dialog'
import type { Album } from '@/lib/data'

export default function AlbumEditPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { user } = useSession()
  const authReady = useAuthReady()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editable fields.
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authReady) return
    const repo = new FetchAlbumRepository(getApiClient())
    repo.getAlbum(slug).then((res) => {
      if (res.ok && res.value) {
        setAlbum(res.value)
        setTitle(res.value.title.en ?? res.value.title.ja ?? '')
      } else {
        setError(res.ok ? 'Album tidak ditemukan.' : res.error.message)
      }
      setLoading(false)
    }).catch(() => {
      setError('Gagal memuat album.')
      setLoading(false)
    })
  }, [slug, authReady])

  const handleSave = async () => {
    setSaving(true)
    const repo = new FetchAlbumRepository(getApiClient())
    const res = await repo.updateAlbum(slug, {
      title: { en: title.trim(), id: title.trim(), ja: title.trim() },
    })
    if (res.ok) {
      setAlbum(res.value)
      toast('success', 'Album tersimpan.')
      router.refresh()
    } else {
      toast('error', res.error.message)
    }
    setSaving(false)
  }

  if (loading) {
    return <EditSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-foreground-strong">{error}</p>
        <Link href="/editor/albums" className="mt-2 text-[13px] text-primary hover:underline">
          ← Kembali
        </Link>
      </div>
    )
  }

  if (!album) return null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/editor/albums" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-primary transition">
            <ArrowLeft size={14} aria-hidden="true" /> Albums
          </Link>
          <h1 className="mt-1 text-xl font-bold text-foreground-strong">{album.title.en ?? album.slug}</h1>
        </div>
        {isAdmin && <DeleteAlbumButton slug={album.slug} title={album.title.en ?? album.slug} />}
      </div>

      {/* Cover */}
      {album.cover && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Image src={album.cover} alt={album.title.en ?? album.slug}
            width={800} height={400} className="w-full object-cover" />
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Foto', value: album.count },
          { label: 'Dilihat', value: album.views },
          { label: 'Musim', value: album.season },
          { label: 'Kategori', value: album.category },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-[.14em] text-subtle-foreground">{s.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground-strong capitalize">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Edit title */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground-strong">Edit Judul</h2>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground-strong focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Simpan Perubahan
        </button>
      </div>

      {/* Date & Slug (read-only) */}
      <div className="grid grid-cols-2 gap-4 text-[13px]">
        <div>
          <span className="text-subtle-foreground">Tanggal:</span>{' '}
          <span className="text-foreground-strong font-medium">{album.date}</span>
        </div>
        <div>
          <span className="text-subtle-foreground">Slug:</span>{' '}
          <span className="text-foreground-strong font-mono text-[12px]">{album.slug}</span>
        </div>
      </div>
    </div>
  )
}

function EditSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse space-y-6">
      <div className="h-7 w-48 rounded-xl bg-hover" />
      <div className="h-60 rounded-2xl bg-hover" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 rounded-xl bg-hover" />
        <div className="h-16 rounded-xl bg-hover" />
        <div className="h-16 rounded-xl bg-hover" />
      </div>
    </div>
  )
}