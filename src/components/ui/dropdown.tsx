'use client'

import type { MouseEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type DropdownProps = {
  children: ReactNode
  className?: string
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  role?: string
  'aria-label'?: string
}

/** Shared popover surface used by header menus. */
export function Dropdown({ children, className, onClick, role, ...rest }: DropdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'card-paper absolute right-0 top-11 rounded-[1.15rem] border border-border p-2 shadow-[0_14px_38px_rgba(160,104,96,0.16)]',
        className,
      )}
      role={role}
      aria-label={rest['aria-label']}
    >
      {children}
    </motion.div>
  )
}
