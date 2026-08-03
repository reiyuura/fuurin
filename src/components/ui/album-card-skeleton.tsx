'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type AlbumCardSkeletonProps = {
  className?: string
}

/**
 * Skeleton placeholder matching AlbumCard dimensions exactly
 * (p-2.5, aspect-[4/3] photo, same caption band) so grid layout
 * never shifts when real cards replace it.
 */
export function AlbumCardSkeleton({ className }: AlbumCardSkeletonProps) {
  return (
    <div className={cn('shrink-0', className)} aria-hidden="true">
      <Card className="p-1.5 pb-0 sm:p-2.5 sm:pb-0">
        {/* Photo placeholder — 4:3, same as AlbumCard */}
        <div className="shimmer aspect-[4/3] rounded-[0.8rem] sm:rounded-[1rem]" />

        {/* Caption placeholders — same padding as AlbumCard caption band */}
        <div className="space-y-2 px-1 pb-3 pt-2.5 sm:px-1.5 sm:pb-4 sm:pt-3.5">
          {/* Title line */}
          <div className="shimmer h-3.5 w-3/4 rounded-md" />
          {/* Date line — shorter */}
          <div className="shimmer h-2.5 w-1/2 rounded-md" />
        </div>
      </Card>
    </div>
  )
}
