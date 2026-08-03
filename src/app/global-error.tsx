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
          background: '#0b0b0f',
          color: '#f4f4f5',
        }}
      >
        <main style={{ maxWidth: '32rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>Something went wrong</h1>
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
              borderRadius: '0.5rem',
              border: '1px solid #3f3f46',
              background: '#18181b',
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
