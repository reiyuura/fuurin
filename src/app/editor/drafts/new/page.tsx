'use client'

/**
 * New draft form — creates + publishes workflow.
 * Sprint 23.5: autosave via debounce, cover upload via UploadRepository.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Upload } from 'lucide-react'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { getEnvironment } from '@/lib/config/env'
import { useToast } from '@/components/ui/toast'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { FetchUploadRepository } from '@/lib/repositories/upload-repository'
import clsx from 'clsx'

/** Upload responses return a RELATIVE url — the draft schema requires
 *  an absolute URL, so prefix the API origin before saving. */
function absolutize(url: string): string {
  if (!url || url.startsWith('http')) return url
  return `${new URL(getEnvironment().apiBaseUrl).origin}${url}`
}

export default function NewDraftPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [draftSlug, setDraftSlug] = useState<string | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')

  const hasChanges = useCallback(() => {
    const current = JSON.stringify({ title, slug, description, date, coverUrl })
    return current !== lastSaved.current && title.trim().length > 0
  }, [title, slug, description, date, coverUrl])

  // Auto-generate slug.
  const handleTitle = (v: string) => {
    setTitle(v)
    if (!slug || slug === slugify(title)) setSlug(slugify(v))
  }

  // Cover file handler.
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  const handleUploadCover = async () => {
    if (!coverFile) return
    setUploadingCover(true)
    const repo = new FetchUploadRepository(getApiClient())
    const res = await repo.upload(coverFile)
    if (res.ok) {
      // Absolute URL required by the draft schema (z.string().url()).
      setCoverUrl(absolutize(res.data.url))
      setCoverFile(null)
    } else {
      toast('error', `Gagal mengunggah cover: ${res.error.message}`)
    }
    setUploadingCover(false)
  }

  /** The single save path — used by the debounce AND by Ctrl+S. */
  const saveNow = useCallback(async () => {
    if (!title.trim()) return
    setAutosaveStatus('saving')
    try {
      const client = getApiClient()
      const path = draftSlug ? `/drafts/${draftSlug}` : '/drafts'
      const method = draftSlug ? 'PATCH' : 'POST'
      // NB: after creation the slug is server-side state — never send a
      // renamed slug back (the PATCH would move the draft and every
      // later save would 404). Slug edits are locked in the UI instead.
      const body = draftSlug
        ? { title, description, date, cover: coverUrl || undefined }
        : { title, slug: slug || slugify(title), description, date, cover: coverUrl || undefined }

      const res = await client.request({ method, path, body })
      if (res.ok) {
        if (!draftSlug && res.data) setDraftSlug((res.data as { slug: string }).slug)
        lastSaved.current = JSON.stringify({ title, slug, description, date, coverUrl })
        setAutosaveStatus('saved')
        setTimeout(() => setAutosaveStatus('idle'), 1500)
      } else {
        setAutosaveStatus('error')
        toast('error', `Gagal menyimpan: ${res.error.message}`)
      }
    } catch {
      setAutosaveStatus('error')
    }
  }, [title, slug, description, date, coverUrl, draftSlug, toast])

  // Autosave — debounce 2s.
  useEffect(() => {
    if (!hasChanges()) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(saveNow, 2000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [saveNow, hasChanges])

  // Keyboard shortcuts: Ctrl+S force-save now, Ctrl+P scroll to preview.
  useKeyboardShortcut({
    onSave: () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      if (!hasChanges()) return
      void saveNow() // a REAL immediate save, not just a status toggle
    },
    onPreview: () => {
      document.querySelector('[aria-label="Preview"]')?.scrollIntoView({ behavior: 'smooth' })
    },
  })

  // Unsaved changes warning.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges()) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // Publish handler.
  const handlePublish = async () => {
    if (!draftSlug) return
    const client = getApiClient()
    const res = await client.request({ method: 'POST', path: `/drafts/${draftSlug}/publish` })
    if (res.ok) {
      toast('success', 'Draft diterbitkan.')
      router.push('/editor/drafts'); router.refresh()
    } else {
      toast('error', `Gagal menerbitkan: ${res.error.message}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground-strong">Draft Baru</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {autosaveStatus === 'saving' ? 'Menyimpan...' : autosaveStatus === 'saved' ? '✓ Tersimpan' : autosaveStatus === 'error' ? 'Gagal menyimpan' : 'Perubahan disimpan otomatis'}
          </p>
        </div>
        {draftSlug && (
          <button onClick={handlePublish}
            className="rounded-xl bg-[#7A9E7E] px-4 py-2 text-sm font-medium text-white hover:bg-[#7A9E7E]/90">
            Terbitkan
          </button>
        )}
      </div>

      {/* Title */}
      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Judul</span>
        <input type="text" value={title} onChange={(e) => handleTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Contoh: Hanami 2027" />
      </label>

      {/* Slug — locked once the draft exists server-side (renaming it
          would orphan subsequent autosaves → permanent 404s). */}
      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Slug</span>
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
          disabled={!!draftSlug}
          title={draftSlug ? 'Slug terkunci setelah draft dibuat' : undefined}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="hanami-2027" />
        {draftSlug && <span className="mt-1 block text-[11px] text-muted-foreground">Slug terkunci setelah draft dibuat.</span>}
      </label>

      {/* Description */}
      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Deskripsi</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder="Ceritakan tentang album ini..." />
      </label>

      {/* Date */}
      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Tanggal</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </label>

      {/* Cover upload */}
      <div className="space-y-2">
        <span className="text-[13px] font-medium text-foreground-strong">Cover</span>
        <div className="flex gap-4 items-start">
          <label className={clsx('flex aspect-video w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card transition hover:border-primary/40', coverPreview && 'border-solid border-primary/20')}>
            {coverPreview ? <img src={coverPreview} alt="Preview" className="h-full w-full rounded-xl object-cover" /> :
              <><Upload size={20} className="text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Pilih gambar</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
          </label>
          {coverFile && !coverUrl && (
            <button onClick={handleUploadCover} disabled={uploadingCover}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {uploadingCover ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingCover ? 'Mengunggah...' : 'Unggah'}
            </button>
          )}
          {coverUrl && <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#7A9E7E]/10 px-3 py-2 text-[12px] font-medium text-[#7A9E7E]"><Check size={13} />Terunggah</span>}
        </div>
      </div>

      {/* Preview */}
      {(title || description) && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-background/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-subtle-foreground mb-3">Preview</p>
          <h2 className="text-lg font-bold text-foreground-strong">{title || 'Judul Draft'}</h2>
          {description && <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{description}</p>}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-subtle-foreground">
            <span>{date}</span>
            <span>{slug}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}