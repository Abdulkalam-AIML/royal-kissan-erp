'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_collapsed')
    if (savedState !== null) {
      setCollapsed(savedState === 'true')
    }
  }, [])

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Sidebar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
      <div className={`main-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onMenuToggle={handleToggleCollapse} userEmail={userEmail} />
        <main className="page-content">{children}</main>
        <footer
          className="no-print"
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#71717a',
            flexWrap: 'wrap',
            gap: '0.5rem',
            backgroundColor: '#09090b',
          }}
        >
          <span>Royal Kissan Enterprise ERP v1.0 &bull; TVS RP3230ABW Printing Ready</span>
          <span>&copy; {new Date().getFullYear()} Royal Kissan Packaged Drinking Water</span>
        </footer>
      </div>
    </div>
  )
}
