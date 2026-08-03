'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Upload as UploadIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

type UploadDropzoneProps = {
  onFiles: (files: File[]) => void
  acceptedTypes?: string[]
  maxBytes?: number
  className?: string
}

/**
 * Pure-UI dropzone. Calls `onFiles` with the dropped/picked list.
 * All side effects (object URLs, queue mutation) live in the parent
 * hook — this component only handles DOM events and visual state.
 */
export function UploadDropzone({
  onFiles,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxBytes = 10 * 1024 * 1024,
  className,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [invalidType, setInvalidType] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = acceptedTypes.join(',')
  const acceptLabel = acceptedTypes.map((t) => t.replace('image/', '').toUpperCase()).join(' · ')

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const arr = Array.from(files)
      const filtered = arr.filter((f) => f.type.startsWith('image/'))
      const hasInvalid = arr.length !== filtered.length
      setInvalidType(hasInvalid)
      if (filtered.length > 0) onFiles(filtered)
      window.setTimeout(() => setInvalidType(false), 2200)
    },
    [onFiles],
  )

  /* ── Drag handlers ─────────────────────────────────────────── */

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <Card
      className={`relative overflow-hidden border-2 border-dashed transition ${
        dragOver ? 'border-primary bg-primary-subtle/40' : 'border-border bg-card/70'
      } ${className ?? ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop file di sini, atau tekan Enter untuk memilih file"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 px-6 py-10 text-center outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className={`grid size-14 place-items-center rounded-full transition ${
            dragOver ? 'bg-primary text-primary-foreground' : 'bg-primary-subtle text-primary'
          }`}
          aria-hidden="true"
        >
          {dragOver ? <UploadIcon size={26} /> : <ImagePlus size={26} />}
        </span>
        <div>
          <p className="font-jp text-[15px] font-semibold text-foreground-strong">
            {dragOver ? 'Lepas untuk mengunggah' : 'Tarik foto ke sini'}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            atau{' '}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              pilih file
            </button>{' '}
            dari perangkat
          </p>
          <p className="mt-2 text-[10.5px] uppercase tracking-[.14em] text-subtle-foreground">
            {acceptLabel} · maks {(maxBytes / (1024 * 1024)).toFixed(0)} MB per file
          </p>
        </div>
        {invalidType && (
          <p role="alert" className="text-[11.5px] font-medium text-foreground-strong">
            Hanya file gambar yang didukung.
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={(e) => {
          handleFiles(e.target.files)
          // Allow picking the same file again afterwards.
          e.target.value = ''
        }}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </Card>
  )
}
