import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * The product's controls, lit from below.
 *
 * The reference's primary control is filled with a gradient that runs darker at
 * the top to lighter at the bottom, and carries a halo wide enough to still be
 * reading at 11px away. Its secondary control does the same thing quietly: a
 * near-black fill with an inner line along the bottom edge, warm where the top
 * edge is not. Both are the arc behind the fold, repeated at control size —
 * which is what makes that page look like one idea rather than a hero and some
 * buttons.
 *
 * The primary no longer pans its fill sideways on hover. That gesture belonged
 * to a 135deg gradient; this one is vertical, so panning it horizontally moves
 * nothing a reader can see. Hover deepens the halo instead, which is the same
 * sentence in the new grammar: the light gets stronger.
 */
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[image:var(--brand-gradient)] text-brand-fg shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_20%,transparent),0_2px_18px_-6px_color-mix(in_srgb,var(--brand-primary)_60%,transparent),0_0_44px_-10px_color-mix(in_srgb,var(--brand-primary)_32%,transparent)] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_32%,transparent),0_2px_22px_-4px_color-mix(in_srgb,var(--brand-primary)_75%,transparent),0_0_64px_-8px_color-mix(in_srgb,var(--brand-primary)_45%,transparent)]',
        secondary: 'control-lit border border-line bg-elevated text-fg hover:bg-elevated/70',
        outline: 'control-lit border border-line-strong text-fg hover:bg-elevated',
        /* No fill at rest, so nothing to light; the moment hover gives it a
           surface, the surface takes the same edges every other control has. */
        ghost: 'text-fg-secondary hover:control-lit hover:bg-elevated hover:text-fg',
        /* Lit from below like everything else, but in its own hue: `--lit-inset`
           tints with the brand, and a violet edge on a red button is a second
           accent arriving through the back door. White at two strengths says
           the same thing — brighter at the bottom, nearer the light — whatever
           colour the fill is. */
        danger:
          'bg-danger text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(255,255,255,0.28)] hover:opacity-90',
        link: 'accent-text underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        icon: 'size-10',
      },
      /*
       * The pill is the control shape, in both worlds.
       *
       * It was the marketing pages' shape only, on the grounds that a full pill
       * already meant "this is a state, not something you operate" — the thing
       * that told a Badge from a Button at a glance. The client asked for the
       * reference's world throughout, and in the reference every control is a
       * pill, so that argument had to be answered rather than repeated: the
       * distinction moved off the shape and onto the light. See the Lit Control
       * Rule in DESIGN.md. A Button always carries a source — a fill with a
       * halo, or the lit inner edges — and a Badge never carries one.
       *
       * `control` survives for the handful of pressable surfaces a pill would
       * misdescribe: a full-width panel, a swatch, a tile with content in it.
       */
      shape: {
        control: 'rounded-control',
        pill: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', shape: 'pill' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, shape, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, shape }), className)} {...props} />
}

export { buttonVariants }
