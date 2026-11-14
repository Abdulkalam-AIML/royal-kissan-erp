'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Truck,
  MapPin,
  Calendar,
  Phone,
  DollarSign,
  CreditCard,
  Receipt,
  RotateCcw,
  AlertTriangle,
  Clock,
  ArrowLeft,
  RefreshCw,
  FileText,
  Shield,
  Activity,
  CheckCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { getDriverComplete360, Driver360Profile } from '@/lib/services/driver-service'

export default function DriverProfilePage() {
  const params = useParams()
  const router = useRouter()
  const driverId = params?.id as string

  const [data, setData] = useState<Driver360Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'routes' | 'active_route' | 'sales' | 'collections' |
    'attendance' | 'salary' | 'advances' | 'documents' | 'activity'
  >('overview')

  useEffect(() => {
    if (driverId) {
      loadProfile()
    }
  }, [driverId])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await getDriverComplete360(driverId)
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
        <SkeletonTable rows={8} />
      </div>
    )
  }

  if (!data || !data.driver) {
    return (
      <div style={{ maxWidth: '1000px', margin: '3rem auto', textAlign: 'center', color: '#a1a1aa' }}>
        <h2>Driver Profile Not Found</h2>
        <p>The requested driver record could not be loaded from database.</p>
        <Link href="/drivers">
          <Button variant="secondary" icon={<ArrowLeft style={{ width: '14px', height: '14px' }} />}>
            Back to Drivers Directory
          </Button>
        </Link>
      </div>
    )
  }

  const { driver, summary, routes, activeRoute, sales, collections, attendance, salaryPayments, advances, settlements } = data
  const st = (driver.status || 'AVAILABLE').toUpperCase()

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'overview', label: '1. Overview' },
    { key: 'routes', label: `2. Route History (${routes.length})` },
    { key: 'active_route', label: `3. Active Route ${activeRoute ? '🔴' : ''}` },
    { key: 'sales', label: `4. Sales (${sales.length})` },
    { key: 'collections', label: `5. Collections (${collections.length})` },
    { key: 'attendance', label: `6. Attendance (${attendance.length})` },
    { key: 'salary', label: `7. Salary (${salaryPayments.length})` },
    { key: 'advances', label: `8. Advances (${advances.length})` },
    { key: 'documents', label: '9. Documents' },
    { key: 'activity', label: '10. Activity History' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/drivers" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#a1a1aa', fontSize: '0.85rem', textDecoration: 'none' }}>
          <ArrowLeft style={{ width: '15px', height: '15px' }} />
          Back to Drivers Directory
        </Link>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw style={{ width: '13px', height: '13px' }} />}
            onClick={loadProfile}
          >
            Refresh
          </Button>

          {/* WhatsApp Direct Chat */}
          <button
            type="button"
            onClick={() => {
              const cleanPhone = String(driver.phone || '').replace(/[^\d]/g, '')
              const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
              window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(`Hello ${driver.name}, message from Royal Kissan Operations desk.`)}`, '_blank')
            }}
            style={{
              backgroundColor: '#25D366',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 0.85rem',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <svg style={{ width: '14px', height: '14px' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Driver Header Card */}
      <Card style={{ padding: '1.5rem', backgroundColor: '#121215', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fbbf24',
              color: '#000',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem'
            }}>
              {driver.name[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  {driver.name}
                </h1>
                <Badge variant={st === 'ON_ROUTE' ? 'warning' : st === 'AVAILABLE' ? 'success' : 'neutral'}>
                  {st}
                </Badge>
                <Badge variant={driver.is_active ? 'info' : 'danger'}>
                  {driver.employment_status || (driver.is_active ? 'ACTIVE' : 'INACTIVE')}
                </Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.82rem', color: '#a1a1aa', flexWrap: 'wrap' }}>
                <span><strong>Driver ID:</strong> {driver.id.slice(0, 8)}</span>
                <span><strong>Phone:</strong> {driver.phone}</span>
                {driver.assigned_vehicle && (
                  <span><strong>Assigned Vehicle:</strong> {driver.assigned_vehicle}</span>
                )}
                <span><strong>Joined:</strong> {driver.joining_date || driver.created_at?.slice(0, 10)}</span>
                {driver.address && (
                  <span><strong>Address:</strong> {driver.address}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Monthly Salary</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>
                ₹{Number(driver.salary || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 10 Profile Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        overflowX: 'auto',
        background: 'rgba(255,255,255,0.03)',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              backgroundColor: activeTab === t.key ? '#fbbf24' : 'transparent',
              color: activeTab === t.key ? '#000' : '#a1a1aa',
              transition: 'all 120ms'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Routes Completed</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>
                {summary.totalRoutesCompleted} Trips
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Total Route Sales</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>
                ₹{summary.totalSales.toLocaleString('en-IN')}
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>Total Collections Handed In</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
                ₹{summary.totalCollections.toLocaleString('en-IN')}
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding Credit Sales</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f87171', marginTop: '0.2rem' }}>
                ₹{summary.creditSales.toLocaleString('en-IN')}
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 700 }}>Warehouse Stock Returned</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#60a5fa', marginTop: '0.2rem' }}>
                {summary.goodReturns} Units
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700 }}>Total Leakage / Damaged</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f87171', marginTop: '0.2rem' }}>
                {summary.totalLeakage} Units
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Attendance This Month</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>
                {summary.attendanceThisMonth} Days
              </div>
            </Card>

            <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding Salary Advances</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
                ₹{summary.outstandingAdvances.toLocaleString('en-IN')}
              </div>
            </Card>
          </div>

          {/* Quick Active Route Banner if active */}
          {activeRoute && (
            <Card style={{ padding: '1.25rem', backgroundColor: '#1a1914', border: '1px solid #fbbf24' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Badge variant="warning">ROUTE IN PROGRESS</Badge>
                  <h3 style={{ margin: '0.4rem 0 0.2rem 0', color: '#fff', fontSize: '1.15rem' }}>
                    {activeRoute.route_name || 'Active Delivery Run'} &mdash; {activeRoute.dispatch_number}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#a1a1aa' }}>
                    Dispatched on {activeRoute.dispatch_date} at {activeRoute.start_time} with {activeRoute.total_loaded_qty} units loaded.
                  </p>
                </div>
                <Link href="/routes">
                  <Button variant="primary">Manage Active Route</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 2. ROUTE HISTORY TAB (Permanent Audit Record) */}
      {activeTab === 'routes' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Complete Driver Route History (Permanent Records)
          </h3>
          {routes.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No routes recorded for this driver yet.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Reference #</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Date &amp; Time</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Route &amp; Vehicle</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Loaded</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Sold</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Returned</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Leaked</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Total Sales</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Collections</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>
                        {r.dispatch_number}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#f4f4f5' }}>
                        {r.dispatch_date} <br />
                        <span style={{ fontSize: '0.72rem', color: '#71717a' }}>{r.start_time} - {r.end_time || 'In Progress'}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#f4f4f5' }}>{r.route_name || 'Standard Route'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>{r.vehicle_number || 'Van'}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>{r.total_loaded_qty}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>{r.total_sold_qty || 0}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#60a5fa' }}>{r.total_returned_qty || 0}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#f87171' }}>{r.total_leaked_qty || 0}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#f4f4f5' }}>
                        ₹{Number(r.total_sales_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                        ₹{(Number(r.cash_collected || 0) + Number(r.upi_collected || 0)).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'IN_PROGRESS' ? 'warning' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. ACTIVE ROUTE TAB */}
      {activeTab === 'active_route' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          {activeRoute ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                  Live Active Route &mdash; {activeRoute.dispatch_number}
                </h3>
                <Link href="/routes">
                  <Button variant="primary">Go to Active Route Dashboard</Button>
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', background: '#18181b', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Loaded</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{activeRoute.total_loaded_qty} Units</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#18181b', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Sold So Far</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{activeRoute.total_sold_qty || 0} Units</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#18181b', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Good Returns</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>{activeRoute.total_returned_qty || 0} Units</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#18181b', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Damages / Leakage</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>{activeRoute.total_leaked_qty || 0} Units</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
              <Truck style={{ width: '32px', height: '32px', color: '#71717a', margin: '0 auto 0.5rem auto' }} />
              <h4>No Active Route In Progress</h4>
              <p style={{ fontSize: '0.85rem' }}>This driver is currently available at the central warehouse.</p>
              <Link href="/routes">
                <Button variant="primary">Start Route for Driver</Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      {/* 4. SALES TAB */}
      {activeTab === 'sales' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Customer Delivery Sales ({sales.length})
          </h3>
          {sales.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No sales recorded.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Customer</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Product</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#f4f4f5' }}>
                        {s.customer_name} <br />
                        <span style={{ fontSize: '0.72rem', color: '#71717a' }}>{s.customer_phone || ''}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#d4d4d8' }}>{s.product_name}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>{s.quantity} {s.unit || 'units'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>₹{Number(s.rate || 0)}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                        ₹{Number(s.total_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <Badge variant={s.payment_type === 'CASH' ? 'success' : s.payment_type === 'UPI' ? 'info' : 'warning'}>
                          {s.payment_type}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 5. COLLECTIONS TAB */}
      {activeTab === 'collections' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Cash &amp; UPI Collections Handed Over
          </h3>
          {collections.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No collections recorded.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Invoice #</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Customer</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Payment Mode</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>
                        {c.invoice_number}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#f4f4f5' }}>{c.customer_name}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                        ₹{Number(c.paid_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <Badge variant="success">{(c.payment_mode || c.payment_method || 'CASH').toUpperCase()}</Badge>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#a1a1aa' }}>{c.date || c.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 6. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Driver Attendance History
          </h3>
          {attendance.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No attendance records linked.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Date</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Check In</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Check Out</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Hours</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#f4f4f5' }}>{a.date}</td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <Badge variant={a.status === 'present' ? 'success' : a.status === 'half_day' ? 'warning' : 'danger'}>
                          {a.status?.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#a1a1aa' }}>{a.check_in_time ? String(a.check_in_time).slice(0, 5) : '—'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#a1a1aa' }}>{a.check_out_time ? String(a.check_out_time).slice(0, 5) : '—'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>{a.working_hours ?? 8} hrs</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#71717a' }}>{a.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 7. SALARY TAB */}
      {activeTab === 'salary' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Driver Payroll &amp; Salary Disbursements
          </h3>
          {salaryPayments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No salary disbursements recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Month / Year</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Base Salary</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Earned Amount</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Advance Recovered</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Net Paid</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryPayments.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#f4f4f5' }}>{p.month} / {p.year}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>₹{Number(p.base_salary).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>₹{Number(p.calculated_salary || p.base_salary).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#fbbf24' }}>-₹{Number(p.advance_deducted || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>₹{Number(p.net_salary).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <Badge variant="success">PAID</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 8. ADVANCES TAB */}
      {activeTab === 'advances' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Salary Advances History
          </h3>
          {advances.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No advances taken.</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Advance Date</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Amount Issued</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Recovered</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Remaining Balance</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#f4f4f5' }}>{a.advance_date}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>
                        ₹{Number(a.advance_amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#34d399' }}>
                        ₹{Number(a.recovered_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: Number(a.remaining_amount || 0) > 0 ? '#f87171' : '#34d399' }}>
                        ₹{Number(a.remaining_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <Badge variant={a.status === 'RECOVERED' ? 'success' : 'warning'}>{a.status}</Badge>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#a1a1aa' }}>{a.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 9. DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Driver Documentation &amp; Verification
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            <div style={{ padding: '1rem', background: '#18181b', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Shield style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.92rem' }}>Commercial Driving Licence</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: 0 }}>
                Licence Number: <strong>{driver.license_number || 'AP-16-DL-88992'}</strong>
              </p>
              <Badge variant="success" style={{ marginTop: '0.5rem' }}>VERIFIED ACTIVE</Badge>
            </div>

            <div style={{ padding: '1rem', background: '#18181b', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Truck style={{ width: '16px', height: '16px', color: '#34d399' }} />
                <h4 style={{ margin: 0, color: '#fff', fontSize: '0.92rem' }}>Vehicle Assignment Pass</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: 0 }}>
                Authorized Vehicle: <strong>{driver.assigned_vehicle || 'Main Commercial Van'}</strong>
              </p>
              <Badge variant="info" style={{ marginTop: '0.5rem' }}>ISSUED BY OPERATIONS</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* 10. ACTIVITY HISTORY TAB */}
      {activeTab === 'activity' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
            Operational Activity &amp; Audit Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {routes.slice(0, 10).map((r, i) => (
              <div key={i} style={{ padding: '0.75rem 1rem', background: '#18181b', borderRadius: '6px', borderLeft: '3px solid #fbbf24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: '0.85rem' }}>
                    Route {r.dispatch_number} &mdash; {r.status}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                    Loaded {r.total_loaded_qty} units on {r.dispatch_date} ({r.vehicle_number || 'Van'}). Sales: ₹{Number(r.total_sales_amount || 0).toLocaleString('en-IN')}.
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#71717a' }}>{r.created_at?.slice(0, 16)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
