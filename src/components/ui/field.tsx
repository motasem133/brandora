'use client'

import * as React from 'react'

import { FieldError } from '@/components/ui/field-error'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * A labelled control, wired to its own error and hint.
 *
 * The pieces all existed — `Label`, `Input`, `FieldError` — and the wiring
 * between them did not: 23 error messages rendered as bare paragraphs with no
 * `id`, so nothing could point at them, and the repository contained zero
 * `aria-describedby` and zero `role="alert"`. A screen-reader user who
 * submitted an invalid form heard nothing change, and focusing the field told
 * them nothing about why it was refused.
 *
 * Rather than ask 35 call sites to remember four attributes, the relationship
 * lives here and the controls read it from context. An explicit `id` or
 * `aria-describedby` on the control still wins, so existing markup keeps
 * working unchanged.
 */
type FieldContextValue = {
  id: string
  describedBy?: string
  invalid: boolean
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

/**
 * Generic over the control's own prop type, so `aria-invalid`'s full set of
 * values — it also accepts `"grammar"` and `"spelling"` — survives the wiring
 * rather than being narrowed to what this file happens to set.
 */
export function useFieldProps<
  P extends {
    id?: string
    'aria-describedby'?: string
    'aria-invalid'?: React.AriaAttributes['aria-invalid']
  },
>(props: P): P {
  const field = React.useContext(FieldContext)
  if (!field) return props

  return {
    ...props,
    id: props.id ?? field.id,
    'aria-describedby': props['aria-describedby'] ?? field.describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid ? true : undefined),
  }
}

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode
  /** Constraints stated before the control is used, not after it is refused. */
  hint?: React.ReactNode
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  const reactId = React.useId()
  const id = `field-${reactId}`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <FieldContext.Provider
      value={{ id, describedBy: describedBy || undefined, invalid: Boolean(error) }}
    >
      <div className={cn('block', className)}>
        <Label htmlFor={id}>
          {label}
          {/*
            The asterisk is decoration; the requirement is the attribute. Both
            are here because sighted users read the mark and assistive tech
            reads `required` on the control itself.
          */}
          {required && (
            <span aria-hidden className="ms-0.5 text-danger">
              *
            </span>
          )}
        </Label>

        {hint && (
          <p id={hintId} className="mb-1.5 text-xs text-fg-muted">
            {hint}
          </p>
        )}

        {children}

        <FieldError id={errorId} message={error} />
      </div>
    </FieldContext.Provider>
  )
}
