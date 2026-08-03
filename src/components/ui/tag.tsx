'use client'

import { cn } from '@/lib/utils'

const sizeStyles = {
  sm: 'px-2.5 py-1 text-[11px] font-medium gap-1',
  default: 'px-3 py-1.5 text-[10.5px] font-semibold tracking-wide gap-0.5',
} as const

const variantStyles = {
  pill: 'border border-primary/20 text-primary-strong hover:border-primary hover:bg-primary-strong hover:text-primary-foreground hover:shadow-[0_4px_12px_rgba(200,124,141,0.24)] dark:text-primary-ink dark:hover:bg-primary dark:hover:text-primary-foreground',
  chip: 'text-primary hover:bg-primary-subtle-strong dark:text-primary-ink dark:hover:bg-primary/25',
} as const

type TagProps = {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  size?: keyof typeof sizeStyles
  variant?: keyof typeof variantStyles
  className?: string
}

/**
 * Tag pill — used in sidebar popular tags and search palette results.
 * Renders as <a> if `href` is provided, <button> if `onClick`, otherwise <span>.
 */
export function Tag({ children, href, onClick, size = 'default', variant = 'pill', className = '' }: TagProps) {
  const shared = cn(
    'inline-flex items-center rounded-full bg-primary-subtle transition duration-300 hover:-translate-y-0.5 dark:bg-primary/15',
    sizeStyles[size],
    variantStyles[variant],
    href || onClick ? 'cursor-pointer' : '',
    className,
  )

  if (href) {
    return (
      <a href={href} className={shared}>
        {children}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} type="button" className={shared}>
        {children}
      </button>
    )
  }

  return <span className={shared}>{children}</span>
}
