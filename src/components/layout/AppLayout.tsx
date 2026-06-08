'use client'

import { useState } from 'react'
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(222 47% 5%)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={`main-layout ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <Header onMenuToggle={() => setCollapsed(!collapsed)} userEmail={userEmail} />
        <main style={{
          flex: 1,
          padding: '1.5rem',
          overflowX: 'hidden',
        }}>
          {children}
        </main>
        <footer style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid hsl(217 32% 17%)',
          fontSize: '0.7rem',
          color: 'hsl(215 20% 35%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>Royal Kissan Smart ERP v1.0</span>
          <span>© 2025 Royal Kissan Packaged Drinking Water. All rights reserved.</span>
        </footer>
      </div>
    </div>
  )
}
