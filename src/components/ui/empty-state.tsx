import { cn } from '@/lib/utils'

/**
 * Nothing here yet, and what to do about it.
 *
 * Three of these existed — the dashboard, the projects list, the assistant —
 * with the same shape and three different type scales. The action is part of
 * the component because an empty state without one is a dead end: the product's
 * own dashboard answers "no brands yet" with a frame you can press.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  body?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <div aria-hidden className="mb-4 text-fg-muted">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1.5 max-w-[46ch] text-sm text-fg-secondary">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
