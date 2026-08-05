'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Last resort: an error thrown by a root layout itself, which no nested
 * boundary can catch. Next replaces the whole document here, so this file
 * carries its own <html> — nothing from the app's layouts is available,
 * including fonts, theme variables and translations.
 *
 * The copy is deliberately in English only. Reaching this point means even the
 * locale layout failed, so next-intl cannot be trusted to resolve a message.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100dvh',
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          /*
            The values are inline and literal because this component replaces
            the root layout when the root layout is what failed — there is no
            stylesheet to reach for and no token to resolve. They are still the
            palette's own: Room Black and Paper White, not the framework greys
            that were here, so the last screen a customer sees is recognisably
            this product rather than a default error page.
          */
          background: '#05070f',
          color: '#ffffff',
        }}
      >
        <main style={{ maxWidth: '32rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.5rem', opacity: 0.7, lineHeight: 1.6 }}>
            The error has been reported. Try again, and if it keeps happening, let us know.
          </p>

          {/* The digest is what ties this page to the report Sentry received. */}
          {error.digest && (
            <p style={{ margin: '0 0 1.5rem', fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.5 }}>
              {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.875rem',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              background: '#121a2e',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
