'use client'

/**
 * AlbumEditor — feature orchestrator.
 *
 * Composes the editor hook with UI components. Holds local state for
 * which drawer is open (cover picker, photo picker, delete dialog).
 * All persistence is delegated to the singleton repository.
 */

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { TabBar } from '@/components/layout/tab-bar'
import { PageHeader } from '@/components/ui/page-header'
import { useAlbumEditor } from '@/hooks/use-album-editor'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { resolveCover, resolvePhotoIds } from '@/lib/album-editor-utils'
import { AlbumFormFields } from '@/components/editor/album-form-fields'
import { CoverPicker } from '@/components/editor/cover-picker'
import { PhotoPicker } from '@/components/editor/photo-picker'
import { PhotoOrder } from '@/components/editor/photo-order'
import { EditorActions } from '@/components/editor/editor-actions'
import { DeleteAlbumDialog } from '@/components/editor/delete-album-dialog'
import type { AlbumDraft } from '@/types/album-editor'
import type { MediaItem } from '@/types/media'

export type AlbumEditorProps = {
  initial: AlbumDraft
  mediaItems: MediaItem[]
  isNew: boolean
}

export function AlbumEditor({ initial, mediaItems, isNew }: AlbumEditorProps) {
  const router = useRouter()
  const editor = useAlbumEditor({ initial, isNew })

  const [photoOpen, setPhotoOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useUnsavedGuard({ when: editor.dirty && !deleteOpen })

  const resolved = resolvePhotoIds(editor.draft, mediaItems)
  const cover = resolveCover(editor.draft, mediaItems)
  const ordered = resolved.ordered

  async function handleSaveDraft() {
    try {
      const result = await editor.saveDraft()
      // After create, route stays on /new but slug is now real.
      if (isNew && result.slug !== initial.slug) {
        router.replace(`/albums/${result.slug}/edit`)
      }
    } catch {
      // status already set by hook
    }
  }

  async function handlePublish() {
    try {
      const result = await editor.publish()
      if (isNew && result.slug !== initial.slug) {
        router.replace(`/albums/${result.slug}/edit`)
      }
    } catch {
      // status already set by hook
    }
  }

  async function handleDelete() {
    setDeleteOpen(false)
    await editor.deleteAlbum()
    router.replace('/albums')
  }

  function handleAddPhotos(ids: string[]) {
    editor.addPhotos(ids)
    setPhotoOpen(false)
  }

  return (
    <>
      <Header active={isNew ? '/albums/new' : `/albums/${initial.slug}/edit`} />
      <main className="w-full mx-auto max-w-[1100px] px-4 pb-24 pt-5 sm:px-6 sm:pt-24 lg:px-8">
        <PageHeader
          title={isNew ? 'Album Baru' : 'Edit Album'}
          lead={
            isNew
              ? 'Buat album dari foto yang sudah ada di Media Library.'
              : 'Perbarui detail album. Cover dan urutan foto mengikuti urutan album.'
          }
        />

        <div className="mt-6 space-y-6 sm:mt-10">
          <AlbumFormFields
            ref={titleInputRef}
            draft={editor.draft}
            errors={editor.errors}
            disabled={editor.status.kind === 'saving'}
            onTitle={editor.setTitle}
            onDescription={editor.setDescription}
            onDate={editor.setDate}
            onLocation={editor.setLocation}
            onVisibility={editor.setVisibility}
          />

          <CoverPicker
            items={mediaItems}
            coverMediaId={editor.draft.coverMediaId}
            onChange={editor.setCover}
            fallbackSrc={cover?.src}
          />

          <section
            aria-labelledby="editor-photos-heading"
            className="card-paper rounded-[1.5rem] border border-border/60 p-5 sm:p-6"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="editor-photos-heading"
                  className="font-jp text-[15px] font-bold tracking-tight text-foreground-strong sm:text-[16px]"
                >
                  Foto Album
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {editor.photoCount} foto · urutan di sini menentukan urutan album.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[12px] border border-border bg-background/60 px-3 py-2 text-[12.5px] font-semibold text-foreground-strong hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                + Pilih Foto
              </button>
            </div>

            <PhotoOrder
              photos={ordered}
              coverMediaId={editor.draft.coverMediaId}
              onReorder={editor.reorderPhotos}
              onRemove={editor.removePhoto}
            />
          </section>

          <EditorActions
            status={editor.status}
            dirty={editor.dirty}
            canPublish={editor.canPublish}
            visibility={editor.draft.visibility}
            isNew={isNew}
            photoCount={editor.photoCount}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            onRequestDelete={() => setDeleteOpen(true)}
          />
        </div>
      </main>
      <Footer />
      <TabBar active="/albums" />

      {photoOpen && (
        <PhotoPicker
          items={mediaItems}
          selectedIds={new Set(editor.draft.photoIds)}
          onPick={handleAddPhotos}
          onClose={() => setPhotoOpen(false)}
        />
      )}

      <DeleteAlbumDialog
        album={editor.draft}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </>
  )
}
