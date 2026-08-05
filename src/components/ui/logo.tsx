import Image from 'next/image'

import { cn } from '@/lib/utils'

/**
 * The Brandora mark: the artwork the client supplied, trimmed and converted.
 *
 * `logo.png` is a four-point star with a four-point star cut out of its centre,
 * hard-edged, sweeping blue to violet, on its own alpha channel. It needs
 * nothing done to it. `scripts/derive-mark.mjs` trims it to the artwork and
 * writes the WebP loaded here; rerun that when the artwork changes.
 *
 * Two wrong turns are recorded in that script rather than here, but the short
 * version belongs with the component: the mark was for a long time a traced "B"
 * from a superseded version of the file, and was then rebuilt by keying a grey
 * background that does not exist — the file was always transparent. That key
 * filled in the centre hole and softened the edges. Read the alpha channel
 * before concluding an image has a background.
 *
 * `.webp` with alpha, at 512px: the mark's largest use is 64px, and Next
 * resizes from here per breakpoint.
 */
export function LogoMark({
  className,
  animated = false,
  alt = 'Brandora',
}: {
  className?: string
  /** A slow breath, about the mark's own centre. For hero use, not a header. */
  animated?: boolean
  /**
   * Empty inside the lockup, where the wordmark beside it already says the
   * name — otherwise every header announces "Brandora Brandora".
   */
  alt?: string
}) {
  return (
    <Image
      src="/brandora-mark.webp"
      alt={alt}
      width={512}
      height={512}
      /*
       * The asset is cropped tight — a 6% margin so the mark is not flush
       * against its box — so a box here draws a star at about 89% of it. That
       * margin is the only reason the lockup below needs any gap at all.
       */
      className={cn('size-12 shrink-0', animated && 'logo-sparkle', className)}
      priority
    />
  )
}

/** Mark plus wordmark, the lockup used in headers and the auth screens. */
export function Logo({
  className,
  markClassName,
  animated = false,
}: {
  className?: string
  markClassName?: string
  animated?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} animated={animated} alt="" />
      <span className="font-display font-bold accent-text">Brandora</span>
    </span>
  )
}
