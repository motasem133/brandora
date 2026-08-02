import { Card } from '@/components/ui/card'

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'danger' | 'success'
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-fg-secondary">{label}</p>
      <p
        className={
          tone === 'danger'
            ? 'mt-1 font-display text-2xl font-semibold text-danger'
            : tone === 'success'
              ? 'mt-1 font-display text-2xl font-semibold text-success'
              : 'mt-1 font-display text-2xl font-semibold'
        }
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
    </Card>
  )
}
