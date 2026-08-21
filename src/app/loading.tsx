export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: '1rem',
        color: '#f4f4f5',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: '#18181b',
          border: '2px solid #fbbf24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
          animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      >
        <span className="loading-spinner" style={{ width: '20px', height: '20px' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
          Loading Royal Kissan ERP...
        </div>
        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
          Initializing module...
        </div>
      </div>
    </div>
  )
}

