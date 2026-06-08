'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Render crash:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '640px', width: '100%' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'hsl(210 40% 98%)', marginBottom: '0.5rem' }}>
          Application Render Crash (HTTP 500)
        </h2>
        <p style={{ color: 'hsl(0 85% 70%)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
          {error.message || 'Something went wrong loading this page'}
        </p>
        
        {error.stack && (
          <pre style={{
            textAlign: 'left',
            background: 'hsl(222 47% 6%)',
            border: '1px solid hsl(217 32% 17%)',
            padding: '1rem',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            overflowX: 'auto',
            maxHeight: '250px',
            color: 'hsl(215 20% 65%)',
            fontFamily: 'monospace',
            marginBottom: '1.5rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {error.stack}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn btn-secondary"
          >
            🏠 Dashboard
          </button>
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

