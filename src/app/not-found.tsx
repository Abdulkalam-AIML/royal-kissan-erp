import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'hsl(222 47% 5%)',
      color: 'var(--text-1)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <Image src="/branding/royal-kissan-logo.png" alt="Royal Kissan Logo" width={150} height={60} style={{ objectFit: 'contain', marginBottom: '1.5rem' }} />
        <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.03em', color: '#fbbf24' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.5rem',
            background: 'hsl(217 91% 60%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.875rem',
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
