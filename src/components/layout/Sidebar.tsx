'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
    ]
  },
  {
    group: 'Sales & Billing',
    items: [
      { href: '/billing', label: 'Billing', icon: '🧾' },
      { href: '/sales', label: 'Sales History', icon: '📊' },
      { href: '/customers', label: 'Customers', icon: '👥' },
    ]
  },
  {
    group: 'Operations',
    items: [
      { href: '/dealers', label: 'Dealers', icon: '🏪' },
      { href: '/drivers', label: 'Drivers', icon: '🚛' },
      { href: '/routes', label: 'Routes', icon: '🗺️' },
      { href: '/non-local-routes', label: 'Non Local Routes', icon: '🛣️' },
      { href: '/deliveries', label: 'Deliveries', icon: '📦' },
    ]
  },
  {
    group: 'Inventory',
    items: [
      { href: '/stock', label: 'Stock Management', icon: '📦' },
      { href: '/products', label: 'Products', icon: '💧' },
    ]
  },
  {
    group: 'Finance',
    items: [
      { href: '/expenses', label: 'Expenses', icon: '💸' },
      { href: '/collections', label: 'Collections', icon: '💰' },
      { href: '/dues', label: 'Due Management', icon: '🔴' },
      { href: '/profit-loss', label: 'Profit & Loss', icon: '📈' },
    ]
  },
  {
    group: 'HR',
    items: [
      { href: '/employees', label: 'Employees', icon: '👔' },
      { href: '/attendance', label: 'Attendance', icon: '📅' },
      { href: '/salary', label: 'Salary', icon: '💳' },
    ]
  },
  {
    group: 'Reports & AI',
    items: [
      { href: '/reports', label: 'Reports', icon: '📄' },
      { href: '/analytics', label: 'Analytics', icon: '📊' },
      { href: '/ai-assistant', label: 'AI Assistant', icon: '🤖' },
    ]
  },
  {
    group: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ]
  },
]

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navRef = useRef<HTMLElement>(null)

  // Maintained scroll position by not resetting it to 0 on pathname changes.
  useEffect(() => {
    // If the active item is not visible in the viewport, optionally scroll it into view.
    const activeEl = navRef.current?.querySelector('.sidebar-nav-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div style={{
        padding: '1.25rem 1rem',
        borderBottom: '1px solid hsl(217 32% 17%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(199 89% 48%))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
          boxShadow: '0 4px 16px hsl(217 91% 60% / 0.3)',
        }}>
          💧
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
              fontWeight: '800',
              fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #fff, hsl(217 91% 75%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}>
              ROYAL KISSAN
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: 'hsl(215 20% 45%)',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}>
              Smart ERP System
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            marginLeft: 'auto',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid hsl(217 32% 17%)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(215 20% 55%)',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0.5rem 0',
          scrollBehavior: 'smooth',
        }}
      >
        {navItems.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <div style={{
                padding: '0.75rem 1rem 0.25rem',
                fontSize: '0.65rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'hsl(215 20% 35%)',
              }}>
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
            {!collapsed && <div className="divider" style={{ margin: '0.25rem 1rem' }} />}
          </div>
        ))}
      </nav>

      {/* User / Logout */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid hsl(217 32% 17%)',
        flexShrink: 0,
      }}>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item"
          style={{
            width: '100%',
            color: 'hsl(0 85% 65%)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
