'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Users,
  Store,
  Truck,
  MapPin,
  Package,
  Boxes,
  DollarSign,
  CreditCard,
  AlertCircle,
  BarChart3,
  UserCheck,
  CalendarCheck,
  Wallet,
  FileText,
  PieChart,
  Bot,
  Printer,
  Settings,
  ChevronLeft,
  ChevronRight,
  Droplet,
} from 'lucide-react'

const navGroups = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Sales & Billing',
    items: [
      { href: '/billing',   label: 'Billing & POS', icon: Receipt },
      { href: '/sales',     label: 'Sales History',  icon: TrendingUp },
      { href: '/customers', label: 'Customers',      icon: Users },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/dealers',    label: 'Dealers',          icon: Store },
      { href: '/drivers',    label: 'Drivers & Routes', icon: Truck },
      { href: '/deliveries', label: 'Deliveries',       icon: MapPin },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { href: '/stock',    label: 'Stock Control',   icon: Boxes },
      { href: '/products', label: 'Products',        icon: Package },
    ],
  },
  {
    group: 'Finance',
    items: [
      { href: '/expenses',    label: 'Expenses',     icon: DollarSign },
      { href: '/collections', label: 'Collections',  icon: CreditCard },
      { href: '/dues',        label: 'Due Balances', icon: AlertCircle },
      { href: '/profit-loss', label: 'Profit & Loss',icon: BarChart3 },
    ],
  },
  {
    group: 'HR & Payroll',
    items: [
      { href: '/employees',  label: 'Employees',  icon: UserCheck },
      { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/salary',     label: 'Salary',     icon: Wallet },
    ],
  },
  {
    group: 'Analytics & AI',
    items: [
      { href: '/reports',      label: 'Reports',      icon: FileText },
      { href: '/analytics',    label: 'Analytics',    icon: PieChart },
      { href: '/ai-assistant', label: 'AI Assistant', icon: Bot },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/settings/printer', label: 'TVS Printer Setup', icon: Printer },
      { href: '/settings',         label: 'System Settings',   icon: Settings },
    ],
  },
]

export default function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState(0)

  // Maintain scroll position across navigation clicks
  const handleScroll = () => {
    if (sidebarRef.current) {
      setScrollPos(sidebarRef.current.scrollTop)
    }
  }

  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = scrollPos
    }
  }, [pathname, scrollPos])

  return (
    <aside
      ref={sidebarRef}
      onScroll={handleScroll}
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        backgroundColor: '#121215',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Sidebar Header / Logo */}
      <div
        style={{
          height: '64px',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
        }}
      >
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#18181b',
              border: '1px solid #fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Droplet style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                ROYAL KISSAN
              </div>
              <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.05em' }}>
                ENTERPRISE ERP
              </div>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
            title="Collapse Sidebar"
          >
            <ChevronLeft style={{ width: '18px', height: '18px' }} />
          </button>
        )}
      </div>

      {/* Navigation Links Scroll Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {navGroups.map((group) => (
          <div key={group.group} style={{ marginBottom: '1.25rem' }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0 0.75rem 0.35rem 0.75rem',
                }}
              >
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const IconComp = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.55rem 0.75rem',
                    margin: '2px 0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#000000' : '#a1a1aa',
                    backgroundColor: isActive ? '#fbbf24' : 'transparent',
                    boxShadow: isActive ? '0 4px 14px rgba(251, 191, 36, 0.25)' : 'none',
                    transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textDecoration: 'none',
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <IconComp style={{ width: '18px', height: '18px', flexShrink: 0, color: isActive ? '#000' : '#a1a1aa' }} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Expand Button for Collapsed Mode */}
      {collapsed && (
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer',
              padding: '6px',
            }}
            title="Expand Sidebar"
          >
            <ChevronRight style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      )}
    </aside>
  )
}
