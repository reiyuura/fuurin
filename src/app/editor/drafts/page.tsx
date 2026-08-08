'use client'

/**
 * Drafts list — editor overview of all drafts.
 * Sprint 23: create, edit, publish, archive, delete.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { getApiClient } from '@/lib/repositories/api-client-provider'
import { useSession } from '@/components/auth/session-provider'
import { useAuthReady } from '@/hooks/use-auth-ready'
import { useToast } from '@/components/ui/toast'

type Draft = {
  slug: string
  title: string
  description: string | null
  date: string | null
  visibility: string
  cover: string | null
  updatedAt: string
}

export default function DraftsPage() {
  const { user } = useSession()
  const authReady = useAuthReady()
  const { toast } = useToast()
  const router = useRouter()
  const isEditor = user?.role === 'admin' || user?.role === 'editor'
  const isAdmin = user?.role === 'admin'

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const client = getApiClient()
      const res = await client.request<Draft[]>({ method: 'GET', path: '/drafts' })
      if (res.ok) setDrafts(res.data)
      else setError(res.error.message)
    } catch {
      setError('Gagal memuat draft.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (authReady) fetchDrafts() }, [fetchDrafts, authReady])

  const handlePublish = async (slug: string) => {
    setPublishing(slug)
    const client = getApiClient()
    const res = await client.request({ method: 'POST', path: `/drafts/${slug}/publish` })
    setPublishing(null)
    if (res.ok) {
      toast('success', `Draft "${slug}" diterbitkan.`)
      fetchDrafts()
      router.refresh()
    } else {
      toast('error', `Gagal menerbitkan draft: ${res.error.message}`)
    }
  }

  const handleArchive = async (slug: string) => {
    if (!confirm('Arsipkan draft ini?')) return
    const client = getApiClient()
    const res = await client.request({ method: 'POST', path: `/drafts/${slug}/archive` })
    if (res.ok) {
      toast('success', 'Draft diarsipkan.')
      fetchDrafts()
    } else {
      toast('error', `Gagal mengarsipkan draft: ${res.error.message}`)
    }
  }

  const handleDelete = async (slug: string) => {
    if (!confirm('Hapus permanen draft ini?')) return
    const client = getApiClient()
    const res = await client.request({ method: 'DELETE', path: `/drafts/${slug}` })
    if (res.ok) {
      toast('success', 'Draft dihapus.')
      fetchDrafts()
    } else {
      toast('error', `Gagal menghapus draft: ${res.error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-32 rounded-xl bg-hover" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-hover" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground-strong">Drafts</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{drafts.length} draft</p>
        </div>
        {isEditor && (
          <Link href="/editor/drafts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90">
            <Plus size={15} />Draft Baru
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[13px] text-error">
          {error}
          <button onClick={fetchDrafts} className="ml-3 font-medium underline">Coba lagi</button>
        </div>
      )}

      {!loading && !error && drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16">
          <FileText size={28} className="text-subtle-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground-strong">Belum ada draft</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Buat draft untuk mulai menulis.</p>
        </div>
      )}

      <div className="space-y-2">
        {drafts.map((d) => (
          <div key={d.slug} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <Link href={`/editor/drafts/${d.slug}`} className="text-sm font-semibold text-foreground-strong hover:text-primary">
                {d.title || d.slug}
              </Link>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {d.visibility === 'published' ? 'Diterbitkan' : 'Draft'} ·{' '}
                {new Date(d.updatedAt).toLocaleDateString('id-ID')}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {isEditor && d.visibility !== 'published' && (
                <button onClick={() => handlePublish(d.slug)} disabled={publishing === d.slug}
                  className="rounded-lg bg-[#7A9E7E] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#7A9E7E]/90 disabled:opacity-50">
                  {publishing === d.slug ? <Loader2 size={12} className="animate-spin" /> : 'Terbitkan'}
                </button>
              )}
              {isEditor && (
                <button onClick={() => handleArchive(d.slug)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-hover">
                  Arsip
                </button>
              )}
              {isAdmin && (
                <button onClick={() => handleDelete(d.slug)}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-error/10 hover:text-error">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}