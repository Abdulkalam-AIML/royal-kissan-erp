'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Menu,
  Search,
  Printer,
  Bluetooth,
  Database,
  User,
  Clock,
  ChevronRight,
} from 'lucide-react'

const breadcrumbMap: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/billing':         'Billing & POS',
  '/sales':           'Sales History',
  '/customers':       'Customers Directory',
  '/dealers':         'Dealers & Ledger',
  '/drivers':         'Drivers & Routes',
  '/routes':          'Routes',
  '/non-local-routes':'Non-Local Routes',
  '/deliveries':      'Deliveries',
  '/stock':           'Stock Management',
  '/products':        'Product Catalog',
  '/expenses':        'Expenses',
  '/collections':     'Collections',
  '/dues':            'Due Management',
  '/profit-loss':     'Profit & Loss',
  '/employees':       'Employees',
  '/attendance':      'Attendance',
  '/salary':          'Salary',
  '/reports':         'Reports & Exports',
  '/analytics':       'Analytics',
  '/ai-assistant':    'AI Assistant',
  '/settings':        'System Settings',
  '/settings/printer':'TVS Thermal Printer Setup',
}

export default function Header({
  onMenuToggle,
  userEmail = 'admin@royalkissan.com',
}: {
  onMenuToggle: () => void
  userEmail?: string
}) {
  const pathname = usePathname()
  const currentPageTitle = breadcrumbMap[pathname] || 'Dashboard'

  const [timeStr, setTimeStr] = useState('')
  const [printerOnline, setPrinterOnline] = useState(true)
  const [dbState, setDbState] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking')

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 5000)

    // Check Printer & DB Health
    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1200)
        const res = await fetch('/api/print/health', { signal: controller.signal })
        clearTimeout(timeoutId)
        const data = await res.json()
        setPrinterOnline(data.online ?? true)
      } catch (e) {
        setPrinterOnline(false)
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1800)
        const res = await fetch('/api/health', { signal: controller.signal })
        clearTimeout(timeoutId)
        const data = await res.json()
        if (data.db === 'connected') {
          setDbState('connected')
        } else if (data.db === 'offline') {
          setDbState('offline')
        } else {
          setDbState('error')
        }
      } catch (e) {
        setDbState('offline')
      }
    }
    checkHealth()
    const healthInterval = setInterval(checkHealth, 15000)

    return () => {
      clearInterval(timer)
      clearInterval(healthInterval)
    }
  }, [])

  return (
    <header className="header no-print">
      {/* Left: Sidebar Toggle + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          onClick={onMenuToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', minWidth: 0 }}>
          <Link href="/dashboard" style={{ color: '#a1a1aa', fontWeight: 500, textDecoration: 'none' }}>
            ERP
          </Link>
          <ChevronRight style={{ width: '12px', height: '12px', color: '#71717a' }} />
          <span style={{ color: '#f4f4f5', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentPageTitle}
          </span>
        </div>
      </div>

      {/* Middle: Global Search bar */}
      <div className="header-search" style={{ flex: 1, maxWidth: '320px', margin: '0 1rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ position: 'absolute', left: '10px', width: '15px', height: '15px', color: '#71717a' }} />
          <input
            type="text"
            placeholder="Search bills, customers, products (Press /)..."
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.2rem',
              backgroundColor: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#f4f4f5',
              fontSize: '0.8rem',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '8px',
              fontSize: '0.65rem',
              color: '#71717a',
              backgroundColor: '#27272a',
              padding: '2px 5px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            /
          </span>
        </div>
      </div>

      {/* Right: Live Status Pills, Clock, User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Status Pills */}
        <div className="header-status-pills" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Bluetooth Thermal Printer Status */}
          <Link
            href="/settings/printer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: printerOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: printerOnline ? '#34d399' : '#f87171',
              border: `1px solid ${printerOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              textDecoration: 'none',
            }}
            title="TVS RP3230ABW Bluetooth Thermal Printer"
          >
            <Bluetooth style={{ width: '13px', height: '13px' }} />
            <span>{printerOnline ? 'BT READY' : 'BT OFFLINE'}</span>
          </Link>

          {/* Real Dynamic Database Health Status */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor:
                dbState === 'connected' ? 'rgba(16, 185, 129, 0.12)' :
                dbState === 'checking' ? 'rgba(245, 158, 11, 0.12)' :
                'rgba(239, 68, 68, 0.12)',
              color:
                dbState === 'connected' ? '#34d399' :
                dbState === 'checking' ? '#fbbf24' :
                '#f87171',
              border: `1px solid ${
                dbState === 'connected' ? 'rgba(16, 185, 129, 0.25)' :
                dbState === 'checking' ? 'rgba(245, 158, 11, 0.25)' :
                'rgba(239, 68, 68, 0.25)'
              }`,
            }}
            title="Real-time Supabase Database Health Check"
          >
            <Database style={{ width: '13px', height: '13px' }} />
            <span>
              {dbState === 'connected' && 'DB CONNECTED'}
              {dbState === 'checking' && 'DB CHECKING'}
              {dbState === 'offline' && 'DB OFFLINE'}
              {dbState === 'error' && 'DB ERROR'}
            </span>
          </div>
        </div>

        {/* Live Clock */}
        <div
          className="header-time"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#a1a1aa',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          }}
        >
          <Clock style={{ width: '14px', height: '14px', color: '#fbbf24' }} />
          <span>{timeStr}</span>
        </div>

        {/* User Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            backgroundColor: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#fbbf24',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {userEmail[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f4f4f5' }}>Admin</span>
        </div>
      </div>
    </header>
  )
}
