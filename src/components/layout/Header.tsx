'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/billing': 'Billing',
  '/sales': 'Sales History',
  '/customers': 'Customers',
  '/dealers': 'Dealers',
  '/drivers': 'Drivers',
  '/routes': 'Routes',
  '/non-local-routes': 'Non Local Routes',
  '/deliveries': 'Deliveries',
  '/stock': 'Stock Management',
  '/products': 'Products',
  '/expenses': 'Expenses',
  '/collections': 'Collections',
  '/dues': 'Due Management',
  '/profit-loss': 'Profit & Loss',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/salary': 'Salary',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/ai-assistant': 'AI Assistant',
  '/settings': 'Settings',
}

export default function Header({
  onMenuToggle,
  userEmail,
}: {
  onMenuToggle: () => void
  userEmail?: string
}) {
  const pathname = usePathname()
  const pageTitle = breadcrumbMap[pathname] || 'Royal Kissan ERP'
  
  // Real-time Clock
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')
  
  // Status check state
  const [isOnline, setIsOnline] = useState(true)
  const [supabaseConnected, setSupabaseConnected] = useState(true)
  const [firebaseConnected, setFirebaseConnected] = useState(false)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const [searchVal, setSearchVal] = useState('')

  useEffect(() => {
    // Ticking clock
    const updateTime = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDateStr(now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }))
    }
    
    updateTime()
    const timer = setInterval(updateTime, 1000)
    
    // Online check
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header className="header" style={{
      background: 'rgba(10, 18, 36, 0.45)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      gap: '1.25rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      justifyContent: 'space-between',
      height: 'var(--header-height)',
    }}>
      {/* LEFT: Toggle, Title, & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={onMenuToggle}
          className="btn btn-ghost btn-sm"
          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Toggle Sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: '#fff',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            {pageTitle}
          </h1>
          <span style={{
            fontSize: '0.65rem',
            color: '#60a5fa',
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Royal Kissan Premium ERP
          </span>
        </div>
      </div>

      {/* MIDDLE: Global Quick Search */}
      <div style={{ flex: 1, maxWidth: '280px', margin: '0 1rem', display: 'none', md: 'block' } as any} className="no-print">
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Quick search command..."
            style={{
              padding: '0.45rem 1rem 0.45rem 2.25rem',
              fontSize: '0.8125rem',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '0.625rem',
            }}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
          <span style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            ⌘K
          </span>
        </div>
      </div>

      {/* RIGHT: Status Indicators, Clock, Theme Toggle, Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        
        {/* System Health Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.06)' }} className="no-print">
          {/* Internet Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            fontWeight: '600',
            color: 'hsl(215 20% 65%)'
          }} title={isOnline ? 'Internet: Online' : 'Internet: Offline'}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOnline ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            }} className={isOnline ? 'animate-pulse' : ''} />
            <span>NET: {isOnline ? 'ON' : 'OFF'}</span>
          </div>

          {/* Supabase Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            fontWeight: '600',
            color: 'hsl(215 20% 65%)'
          }} title={supabaseConnected ? 'Supabase Database: Online' : 'Supabase Database: Offline'}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: supabaseConnected ? '#0ea5e9' : '#ef4444',
              display: 'inline-block',
              boxShadow: supabaseConnected ? '0 0 8px #0ea5e9' : '0 0 8px #ef4444',
            }} />
            <span>DB: {supabaseConnected ? 'OK' : 'ERR'}</span>
          </div>

          {/* Firebase Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            fontFamily: 'monospace',
            fontSize: '0.68rem',
            fontWeight: '600',
            color: 'hsl(215 20% 65%)'
          }} title="Firebase Sync: Inactive / Local storage fallback">
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'inline-block',
              boxShadow: '0 0 8px #f59e0b',
            }} />
            <span>SYNC: LOC</span>
          </div>
        </div>

        {/* Real-time Clock / Calendar widget */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          lineHeight: 1.2,
          paddingRight: '0.5rem',
        }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: '700',
            color: '#fff',
            fontFamily: 'monospace',
          }}>
            {timeStr || '--:--:--'}
          </span>
          <span style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.4)',
            fontWeight: '600',
          }}>
            {dateStr || '...'}
          </span>
        </div>

        {/* Theme Toggle Icon */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '0.4rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}
          onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
          title="Toggle UI Aesthetics"
        >
          {themeMode === 'dark' ? '🌙' : '☀️'}
        </button>

        {/* Notifications */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '0.4rem', position: 'relative', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}
          title="System Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="notification-dot" style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '6px',
            height: '6px',
            background: '#38bdf8',
            borderRadius: '50%',
            boxShadow: '0 0 6px #38bdf8',
          }} />
        </button>

        {/* User Card with Role Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.3rem 0.625rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0.75rem',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: '800',
            color: 'white',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
          }}>
            {userEmail ? userEmail[0].toUpperCase() : 'A'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }} className="no-print">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff', lineHeight: 1.1 }}>
              Admin
            </span>
            <span className="badge badge-info" style={{
              fontSize: '0.55rem',
              padding: '1px 4px',
              marginTop: '2px',
              letterSpacing: '0.02em',
              fontWeight: '800',
            }}>
              MASTER OWNER
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
