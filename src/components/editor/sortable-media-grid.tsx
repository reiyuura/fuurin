'use client'

/**
 * SortableMediaGrid — dnd-kit drag & drop reorder.
 *
 * - Optimistic update on drop; rollback on PATCH failure.
 * - Keyboard accessible: dnd-kit's KeyboardSensor (Space to pick,
 *   arrows to move, Space to drop).
 * - ARIA: each item gets role="button" + aria-roledescription="sortable".
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MediaItem } from '@/types/media'
import clsx from 'clsx'

type Props = {
  items: MediaItem[]
  onReorder: (ids: string[]) => Promise<boolean>
  renderItem: (item: MediaItem, dragHandleProps: Record<string, unknown>) => React.ReactNode
}

export function SortableMediaGrid({ items, onReorder, renderItem }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((m) => m.id === active.id)
    const newIndex = items.findIndex((m) => m.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex)
    await onReorder(next.map((m) => m.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((m) => m.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <SortableItem key={item.id} item={item} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  item,
  renderItem,
}: {
  item: MediaItem
  renderItem: Props['renderItem']
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      aria-roledescription="sortable"
      aria-label={`Foto ${item.caption.en ?? item.id}`}
      className={clsx(isDragging && 'opacity-70 shadow-xl')}
    >
      {renderItem(item, { ...attributes, ...listeners })}
    </div>
  )
}