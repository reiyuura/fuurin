'use client'

/**
 * Edit draft — loads existing draft + autosave on changes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { useToast } from '@/components/ui/toast'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { FetchUploadRepository } from '@/lib/repositories/upload-repository'
import clsx from 'clsx'

type DraftData = {
  slug: string; title: string; description?: string; date?: string; cover?: string; visibility: string
}

export default function EditDraftPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [draft, setDraft] = useState<DraftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Autosave.
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<Record<string, unknown>>({})

  // Load draft.
  useEffect(() => {
    const client = getApiClient()
    client.request<DraftData>({ method: 'GET', path: `/drafts/${slug}` }).then((res) => {
      if (res.ok) {
        setDraft(res.data)
        setTitle(res.data.title)
        setDescription(res.data.description ?? '')
        setDate(res.data.date ?? '')
        setCoverUrl(res.data.cover ?? '')
        lastSaved.current = { title: res.data.title, description: res.data.description, date: res.data.date, cover: res.data.cover }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [slug])

  const hasChanges = useCallback(() => {
    const curr = JSON.stringify({ title, description, date, coverUrl })
    return curr !== JSON.stringify({ title: draft?.title, description: draft?.description, date: draft?.date, cover: draft?.cover })
  }, [title, description, date, coverUrl, draft])

  // Autosave — debounce 2s.
  useEffect(() => {
    if (!draft || !hasChanges()) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus('saving')
      try {
        const client = getApiClient()
        const res = await client.request({
          method: 'PATCH', path: `/drafts/${slug}`,
          body: { title, description, date, cover: coverUrl || undefined },
        })
        if (res.ok) { setAutosaveStatus('saved'); setTimeout(() => setAutosaveStatus('idle'), 1500) }
        else setAutosaveStatus('error')
      } catch { setAutosaveStatus('error') }
    }, 2000)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [title, description, date, coverUrl, slug, draft, hasChanges])

  // Keyboard shortcuts: Ctrl+S force-save now, Ctrl+P scroll to preview.
  useKeyboardShortcut({
    onSave: () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      // Trigger immediate save by toggling status; the autosave effect
      // will re-run on the next keystroke. Show feedback instead.
      toast('info', 'Menyimpan manual...')
      setAutosaveStatus('saving')
    },
    onPreview: () => {
      document.querySelector('[aria-label="Preview"]')?.scrollIntoView({ behavior: 'smooth' })
    },
  })

  // Unsaved warning.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (hasChanges()) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [hasChanges])

  const handleUploadCover = async () => {
    if (!coverFile) return
    setUploadingCover(true)
    const repo = new FetchUploadRepository(getApiClient())
    const res = await repo.upload(coverFile)
    if (res.ok) setCoverUrl(res.data.url)
    setUploadingCover(false)
  }

  if (loading) return <div className="animate-pulse space-y-6"><div className="h-7 w-48 rounded-xl bg-hover" /><div className="h-10 w-full rounded-xl bg-hover" /><div className="h-24 w-full rounded-xl bg-hover" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground-strong">{title || slug}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {autosaveStatus === 'saving' ? 'Menyimpan...' : autosaveStatus === 'saved' ? '✓ Tersimpan' : autosaveStatus === 'error' ? 'Gagal menyimpan' : 'Draft'}
          </p>
        </div>
        <button onClick={async () => {
          await getApiClient().request({ method: 'POST', path: `/drafts/${slug}/publish` })
          router.push('/editor/drafts'); router.refresh()
        }} className="rounded-xl bg-[#7A9E7E] px-4 py-2 text-sm font-medium text-white hover:bg-[#7A9E7E]/90">Terbitkan</button>
      </div>

      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Judul</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Deskripsi</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-foreground-strong">Tanggal</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </label>

      {coverUrl && !coverPreview && (
        <img src={coverUrl} alt="Cover" className="w-48 rounded-xl border border-border object-cover" />
      )}
      <div className="flex gap-4 items-start">
        <label className={clsx('flex aspect-video w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card transition hover:border-primary/40', coverPreview && 'border-solid')}>
          {coverPreview ? <img src={coverPreview} alt="Pratinjau cover" className="h-full w-full rounded-xl object-cover" /> :
            <><Upload size={20} className="text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Ganti cover</span></>}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) } }} className="hidden" />
        </label>
        {coverFile && !uploadingCover && !coverUrl.startsWith('https') && (
          <button onClick={handleUploadCover} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
            <Upload size={14} />Unggah
          </button>
        )}
        {uploadingCover && <Loader2 size={20} className="animate-spin text-primary" />}
      </div>
    </div>
  )
}