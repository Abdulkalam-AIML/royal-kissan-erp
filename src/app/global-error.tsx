'use client'

import Image from 'next/image'

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
        color: 'var(--text-1)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <Image src="/branding/royal-kissan-logo.png" alt="Royal Kissan Logo" width={140} height={56} style={{ objectFit: 'contain', marginBottom: '1.25rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            System Error
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
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
