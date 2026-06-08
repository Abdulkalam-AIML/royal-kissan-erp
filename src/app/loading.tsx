export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '0.75rem',
    }}>
      <span className="loading-spinner" style={{ width: '24px', height: '24px' }} />
      <span style={{ color: 'hsl(215 20% 55%)', fontSize: '0.875rem', fontWeight: '500' }}>
        Loading...
      </span>
    </div>
  )
}
