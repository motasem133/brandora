import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[image:var(--brand-gradient)] bg-[length:180%_auto] bg-left text-brand-fg shadow-[0_10px_24px_-14px_var(--brand-primary)] transition-[background-position,transform,box-shadow] hover:bg-right hover:shadow-[0_14px_30px_-12px_var(--brand-primary)] duration-500',
        secondary: 'bg-elevated text-fg hover:bg-elevated/70 border border-line',
        outline: 'border border-line-strong text-fg hover:bg-elevated',
        ghost: 'text-fg-secondary hover:bg-elevated hover:text-fg',
        danger: 'bg-danger text-white hover:opacity-90',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
