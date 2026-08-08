'use client'

/**
 * New album form — title, slug, cover upload, category, season.
 *
 * Cover is uploaded BEFORE album creation; the resulting URL is
 * saved with the album in a single POST /albums call.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { getEnvironment } from '@/lib/config/env'
import { FetchAlbumRepository } from '@/lib/repositories/fetch-album-repository'
import { FetchUploadRepository } from '@/lib/repositories/upload-repository'
import { useToast } from '@/components/ui/toast'
import clsx from 'clsx'

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
const CATEGORIES = ['school', 'festival', 'study', 'travel', 'graduation'] as const

export default function NewAlbumPage() {
  const router = useRouter()
  const { toast } = useToast()
  const env = getEnvironment()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [season, setSeason] = useState<string>('spring')
  const [category, setCategory] = useState<string>('school')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Auto-generate slug from title.
  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(v))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  const handleUploadCover = async () => {
    if (!coverFile) return
    setUploading(true)
    const repo = new FetchUploadRepository(getApiClient())
    const res = await repo.upload(coverFile)
    if (res.ok) {
      // Backend requires z.string().url() — prefix relative path with
      // the API origin (robust regardless of the base URL's path part).
      const rawUrl = res.data.url
      const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${new URL(env.apiBaseUrl).origin}${rawUrl}`
      setCoverUrl(absoluteUrl)
      toast('success', 'Cover terunggah.')
    } else {
      toast('error', res.error.message)
    }
    setUploading(false)
  }

  const handleCreate = async () => {
    if (!title.trim()) { toast('error', 'Judul wajib diisi.'); return }
    if (!slug.trim()) { toast('error', 'Slug wajib diisi.'); return }
    if (!coverUrl) { toast('error', 'Unggah cover terlebih dahulu.'); return }

    setSaving(true)
    const repo = new FetchAlbumRepository(getApiClient())
    const res = await repo.createAlbum({
      slug: slug.trim(),
      title: { en: title.trim(), id: title.trim(), ja: title.trim() },
      cover: coverUrl,
      date: new Date().toISOString().slice(0, 10),
      season: season as 'spring' | 'summer' | 'autumn' | 'winter',
      category,
    })
    if (res.ok) {
      toast('success', `Album "${title.trim()}" dibuat.`)
      router.push('/editor/albums')
      router.refresh()
    } else {
      toast('error', res.error.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground-strong">Album Baru</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Isi detail album lalu simpan.</p>
      </div>

      {/* Title */}
      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Judul</span>
        <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground-strong placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Contoh: Hanami 2026" />
      </label>

      {/* Slug */}
      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Slug</span>
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-mono text-foreground-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="hanami-2026" />
        <p className="mt-1 text-[11px] text-subtle-foreground">Digunakan untuk URL: /albums/hanami-2026</p>
      </label>

      {/* Cover upload */}
      <div className="space-y-2">
        <span className="text-[13px] font-medium text-foreground-strong">Cover</span>
        <div className="flex gap-4 items-start">
          <label className={clsx(
            'flex aspect-video w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card transition hover:border-primary/40',
            coverPreview && 'border-solid border-primary/20',
          )}>
            {coverPreview ? (
              <img src={coverPreview} alt="Preview" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <>
                <Upload size={20} className="text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Pilih gambar</span>
              </>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange}
              className="hidden" />
          </label>

          {coverFile && !coverUrl && (
            <button onClick={handleUploadCover} disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Mengunggah...' : 'Unggah'}
            </button>
          )}
          {coverUrl && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#7A9E7E]/10 px-3 py-2 text-[12px] font-medium text-[#7A9E7E]">
              ✓ Terunggah
            </span>
          )}
        </div>
      </div>

      {/* Season & Category */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[13px] font-medium text-foreground-strong">Musim</span>
          <select value={season} onChange={(e) => setSeason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground-strong focus:outline-none focus:ring-2 focus:ring-primary/30">
            {SEASONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-foreground-strong">Kategori</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground-strong focus:outline-none focus:ring-2 focus:ring-primary/30">
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleCreate} disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Menyimpan...' : 'Simpan Album'}
        </button>
        <button onClick={() => router.back()}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground-strong transition hover:bg-hover">
          Batal
        </button>
      </div>
    </div>
  )
}

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}