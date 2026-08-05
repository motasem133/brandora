import { TrendingDown, TrendingUp } from 'lucide-react'

import { Eyebrow } from '@/components/ui/eyebrow'
import type { Series } from '@/server/db/queries/dashboard'
import { cn } from '@/lib/utils'

/**
 * A measured figure, in the shape the client's reference opens its dashboard
 * with: a small label, a delta against a named period, a large value and a
 * sparkline.
 *
 * Built to be judged. DESIGN.md names this composition as its anti-reference
 * and removed it once already, so the only useful version to look at is one
 * built as well as it can honestly be — real series from real timestamps, no
 * invented trend, no decorative percentage.
 *
 * Contract, from the visualisation guidance:
 *
 * - The label is sentence case with no trailing colon.
 * - The value uses the font's *proportional* figures. `tabular-nums` gives every
 *   digit the width of a zero, which is right in a column of numbers and looks
 *   gappy on a single large one.
 * - The delta is signed, stated against a named period, and absent rather than
 *   zero where there is no prior period to compare with.
 * - The sparkline is one series, so it needs no legend — the label names it. It
 *   sits in the muted ink with only its final segment in the accent.
 * - Direction and goodness are separate. Credits going down is what credits are
 *   for; only a metric with a real direction gets a colour, and the arrow
 *   carries the direction so the colour is never alone in saying it.
 */

export type Direction = 'up-is-good' | 'neutral'

const percent = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value)

/**
 * The sparkline.
 *
 * A flat series is drawn flat, on the mid-line, rather than being stretched to
 * fill the box — a straight line at full height would read as a value at its
 * maximum, which is the opposite of what a flat series means.
 */
function Sparkline({ points, label }: { points: number[]; label: string }) {
  const W = 88
  const H = 30
  const PAD = 3

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min

  const x = (i: number) => (i / Math.max(points.length - 1, 1)) * W
  const y = (v: number) =>
    span === 0 ? H / 2 : H - PAD - ((v - min) / span) * (H - PAD * 2)

  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
  const lastIndex = points.length - 1

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[30px] w-[88px] shrink-0 overflow-visible"
      role="img"
      aria-label={label}
    >
      <path
        d={path.join(' ')}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The current period, in the accent. One segment, not the whole line. */}
      {points.length > 1 && (
        <path
          d={`M ${x(lastIndex - 1).toFixed(1)} ${y(points[lastIndex - 1]).toFixed(1)} L ${x(
            lastIndex,
          ).toFixed(1)} ${y(points[lastIndex]).toFixed(1)}`}
          fill="none"
          stroke="var(--text-accent)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      <circle cx={x(lastIndex)} cy={y(points[lastIndex])} r={4} fill="var(--text-accent)" />
    </svg>
  )
}

export function StatTile({
  label,
  series,
  direction = 'neutral',
  periodLabel,
  trendLabel,
  locale,
  format,
}: {
  label: string
  series: Series
  direction?: Direction
  /** Names what the delta is measured against, e.g. "vs the six weeks before". */
  periodLabel: string
  /** The sparkline's accessible name. */
  trendLabel: string
  locale: string
  format?: (value: number) => string
}) {
  const { value, delta, points } = series

  /*
   * Flat is its own case, not a fall-through to "down".
   *
   * Written as `delta > 0 ? up : down` this rendered an unchanged week as a red
   * descending arrow — the reader is told the number fell, by a control whose
   * whole job is to say which way it went, when it did not move at all.
   */
  const trend = delta === null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const Arrow = trend === 'up' ? TrendingUp : TrendingDown

  return (
    <div className="lit h-full">
      <div className="lit-inner flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Eyebrow>{label}</Eyebrow>

          {delta !== null && trend !== null && (
            <p
              className={cn(
                'flex shrink-0 items-center gap-1 text-xs font-semibold',
                direction === 'neutral' || trend === 'flat'
                  ? 'text-fg-secondary'
                  : trend === 'up'
                    ? 'text-success'
                    : 'text-danger',
              )}
            >
              {trend !== 'flat' && <Arrow aria-hidden className="size-3.5" />}
              {percent(delta, locale)}
              <span className="sr-only"> {periodLabel}</span>
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className="font-display text-3xl font-semibold leading-none tracking-[-0.02em]">
            {format ? format(value) : new Intl.NumberFormat(locale).format(value)}
          </p>
          <Sparkline points={points} label={trendLabel} />
        </div>
      </div>
    </div>
  )
}
