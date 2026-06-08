'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(222 47% 5%)',
        color: 'hsl(210 40% 98%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'hsl(215 20% 55%)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.5rem',
              background: 'hsl(217 91% 60%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
