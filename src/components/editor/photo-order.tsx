'use client'

/**
 * PhotoOrder — render-only ordered list with HTML5 drag & drop
 * plus keyboard up/down/remove buttons. The parent owns the array.
 */

import { memo, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pick } from '@/lib/data'
import { useLocale } from '@/lib/i18n'
import type { MediaItem } from '@/types/media'

export type PhotoOrderProps = {
  photos: MediaItem[]
  coverMediaId: string | null
  onReorder: (from: number, to: number) => void
  onRemove: (id: string) => void
}

export function PhotoOrder({ photos, coverMediaId, onReorder, onRemove }: PhotoOrderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <div
        className="rounded-[1.5rem] border border-dashed border-border/70 bg-card/40 p-8 text-center"
        role="status"
      >
        <p className="text-[13px] text-muted-foreground">
          Belum ada foto. Buka &quot;Pilih Foto&quot; untuk menambahkan.
        </p>
      </div>
    )
  }

  return (
    <ol
      aria-label="Urutan foto album"
      className="flex flex-col gap-2"
    >
      {photos.map((photo, idx) => (
        <PhotoOrderRow
          key={photo.id}
          photo={photo}
          index={idx}
          total={photos.length}
          isCover={photo.id === coverMediaId}
          dragIndex={dragIndex}
          overIndex={overIndex}
          onDragStart={setDragIndex}
          onDragEnter={setOverIndex}
          onDragEnd={() => {
            setDragIndex(null)
            setOverIndex(null)
          }}
          onDrop={(target) => {
            if (dragIndex !== null && dragIndex !== target) {
              onReorder(dragIndex, target)
            }
            setDragIndex(null)
            setOverIndex(null)
          }}
          onMoveUp={() => idx > 0 && onReorder(idx, idx - 1)}
          onMoveDown={() => idx < photos.length - 1 && onReorder(idx, idx + 1)}
          onRemove={() => onRemove(photo.id)}
        />
      ))}
    </ol>
  )
}

type PhotoOrderRowProps = {
  photo: MediaItem
  index: number
  total: number
  isCover: boolean
  dragIndex: number | null
  overIndex: number | null
  onDragStart: (i: number) => void
  onDragEnter: (i: number) => void
  onDragEnd: () => void
  onDrop: (target: number) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

const PhotoOrderRow = memo(function PhotoOrderRow({
  photo,
  index,
  total,
  isCover,
  dragIndex,
  overIndex,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PhotoOrderRowProps) {
  const { locale } = useLocale()
  const dragging = dragIndex === index
  const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
  const dragRef = useRef<HTMLLIElement>(null)

  return (
    <li
      ref={dragRef}
      data-index={index}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
        onDragStart(index)
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        onDragEnter(index)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(index)
      }}
      onDragEnd={onDragEnd}
      aria-label={`Foto ${index + 1} dari ${total}`}
      className={
        'flex items-center gap-3 rounded-[1rem] border bg-card/80 p-2.5 shadow-[0_4px_14px_rgba(160,104,96,0.08)] transition ' +
        (dragging ? 'opacity-60 ' : '') +
        (isOver ? 'border-primary/60 ring-2 ring-primary/30 ' : 'border-border/60 ')
      }
    >
      <span
        aria-hidden="true"
        className="grid cursor-grab place-items-center text-muted-foreground/70 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </span>
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground"
      >
        {index + 1}
      </span>
      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[8px] border border-border/50">
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-foreground-strong">
          {pick(photo.caption, locale) || pick(photo.caption, 'en')}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="truncate">{photo.id}</span>
          {isCover && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-bold text-primary">
              cover
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Pindah ke atas ${pick(photo.caption, locale) || photo.id}`}
        >
          <ChevronUp size={14} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Pindah ke bawah ${pick(photo.caption, locale) || photo.id}`}
        >
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label={`Hapus ${pick(photo.caption, locale) || photo.id}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <X size={14} aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
})
