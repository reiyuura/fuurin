/**
 * Album list — editor overview.
 */

import Link from 'next/link'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { repositories } from '@/lib/repositories/repository-registry'
import { DeleteAlbumButton } from '@/components/editor/delete-dialog'

export default async function AlbumListPage() {
  // Default limit is 20 — the editor needs the whole collection (a class
  // album realistically stays well under 100; add a pager if it grows).
  const result = await repositories.albums.listAlbums({ pagination: { page: 0, size: 100 } })

  if (!result.ok) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-foreground-strong">Gagal memuat album.</p>
        <p className="mt-1 text-xs text-muted-foreground">{result.error.message}</p>
      </div>
    )
  }

  const albums = result.value

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground-strong">Albums</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {albums.length} album
          </p>
        </div>
        <Link
          href="/editor/albums/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90"
        >
          <Plus size={15} aria-hidden="true" />
          Album Baru
        </Link>
      </div>

      {albums.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <p className="text-sm font-medium text-foreground-strong">Belum ada album.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Klik &quot;Album Baru&quot; untuk membuat album pertama.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <div key={album.slug} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
            <Link href={`/editor/albums/${album.slug}`} className="block">
              <div className="aspect-video overflow-hidden bg-hover">
                {album.cover ? (
                  <Image src={album.cover} alt={album.title.en ?? album.slug}
                    width={400} height={225}
                    className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-subtle-foreground">No cover</div>
                )}
              </div>
            </Link>
            <Link href={`/editor/albums/${album.slug}`} className="block p-4">
              <h2 className="text-sm font-semibold text-foreground-strong line-clamp-1">
                {album.title.en ?? album.title.ja ?? album.slug}
              </h2>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{album.count} foto</span>
                <span>{album.views} dilihat</span>
                <span className="capitalize">{album.season}</span>
              </div>
            </Link>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
              <DeleteAlbumButton slug={album.slug} title={album.title.en ?? album.slug} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'