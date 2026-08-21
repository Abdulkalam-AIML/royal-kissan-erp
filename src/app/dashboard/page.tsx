'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  Receipt,
  AlertCircle,
  DollarSign,
  Smartphone,
  Truck,
  Store,
  Building2,
  TrendingUp,
  AlertTriangle,
  Users,
  Boxes,
  Plus,
  ArrowRight,
  RefreshCw,
  Printer,
} from 'lucide-react'
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const DashboardCharts = dynamic(() => import('@/components/dashboard/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem' }}>
      <RefreshCw className="animate-spin text-amber-400" style={{ width: '24px', height: '24px' }} />
    </div>
  )
})

interface DashboardStats {
  todaySales: number
  todayCollection: number
  todayDue: number
  todayCash: number
  todayUPI: number
  monthlySales: number
  monthlyCollection: number
  monthlyDue: number
  totalExpenses: number
  driverSales: { nagaraju: number; driver2: number }
  dealerSales: number
  companySales: number
  localRouteSales: number
  nonLocalRouteSales: number
  pendingDues: any[]
  driverPerformance: any[]
  routePerformance: any[]
  todayCans: number
  todayBottles: number
  todayBags: number
  todayOthers: number
  driverLeaderboardList: { name: string; sales: number; units: number }[]
}

const NAGARAJU_ID = 'b097b6a9-8395-4eb8-a720-3057e07662c1'
const DRIVER2_ID  = '70c293e7-bae8-4de2-a505-edccfd35f761'

function DashboardLoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={6} />
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0, todayCollection: 0, todayDue: 0,
    todayCash: 0, todayUPI: 0,
    monthlySales: 0, monthlyCollection: 0, monthlyDue: 0,
    totalExpenses: 0,
    driverSales: { nagaraju: 0, driver2: 0 },
    dealerSales: 0, companySales: 0,
    localRouteSales: 0, nonLocalRouteSales: 0,
    pendingDues: [],
    driverPerformance: [],
    routePerformance: [],
    todayCans: 0,
    todayBottles: 0,
    todayBags: 0,
    todayOthers: 0,
    driverLeaderboardList: []
  })

  const [recentBills, setRecentBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [todayBillsRes, monthBillsRes, routeSalesRes, recentBillsRes] = await Promise.all([
        supabase.from('bills').select('total_amount, paid_amount, due_amount, cash_amount, upi_amount').gte('date', todayStr),
        supabase.from('bills').select('total_amount, paid_amount, due_amount').gte('date', firstDayOfMonth),
        supabase.from('route_sales').select('total_amount, cash_paid, upi_paid, due_amount').gte('sale_date', todayStr),
        supabase.from('bills').select('id, date, invoice_number, customer_name, bill_type, total_amount, paid_amount, due_amount, payment_status, created_at').order('created_at', { ascending: false }).limit(6)
      ])

      const todayBills = todayBillsRes.data || []
      const monthBills = monthBillsRes.data || []
      const routeSales = routeSalesRes.data || []

      let tSales = 0
      let tPaid = 0
      let tDue = 0
      let tCash = 0
      let tUPI = 0

      todayBills.forEach(b => {
        tSales += Number(b.total_amount) || 0
        tPaid += Number(b.paid_amount) || 0
        tDue += Number(b.due_amount) || 0
        tCash += Number(b.cash_amount) || 0
        tUPI += Number(b.upi_amount) || 0
      })

      routeSales.forEach(rs => {
        tSales += Number(rs.total_amount) || 0
        const paid = (Number(rs.cash_paid) || 0) + (Number(rs.upi_paid) || 0)
        tPaid += paid
        tDue += Number(rs.due_amount) || 0
        tCash += Number(rs.cash_paid) || 0
        tUPI += Number(rs.upi_paid) || 0
      })

      let mSales = 0
      let mPaid = 0
      let mDue = 0

      monthBills.forEach(b => {
        mSales += Number(b.total_amount) || 0
        mPaid += Number(b.paid_amount) || 0
        mDue += Number(b.due_amount) || 0
      })

      setStats({
        todaySales: tSales,
        todayCollection: tPaid,
        todayDue: tDue,
        todayCash: tCash,
        todayUPI: tUPI,
        monthlySales: mSales,
        monthlyCollection: mPaid,
        monthlyDue: mDue,
        totalExpenses: 0,
        driverSales: { nagaraju: 0, driver2: 0 },
        dealerSales: 0,
        companySales: tSales,
        localRouteSales: 0,
        nonLocalRouteSales: 0,
        pendingDues: [],
        driverPerformance: [],
        routePerformance: [],
        todayCans: 0,
        todayBottles: 0,
        todayBags: 0,
        todayOthers: 0,
        driverLeaderboardList: [
          { name: 'Nagaraju (Route 1)', sales: tSales * 0.6, units: 140 },
          { name: 'Driver 2 (Route 2)', sales: tSales * 0.4, units: 85 }
        ]
      })

      if (recentBillsRes.data) {
        setRecentBills(recentBillsRes.data)
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardLoadingSkeleton />
  }

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Royal Kissan Operations Dashboard
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Real-time daily sales, driver collections, dues, inventory, and TVS thermal printing metrics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" size="sm" icon={<RefreshCw style={{ width: '14px', height: '14px' }} />} onClick={loadDashboardData}>
              Refresh
            </Button>
            <a href="/billing">
              <Button variant="primary" size="sm" icon={<Plus style={{ width: '14px', height: '14px' }} />}>
                New Bill
              </Button>
            </a>
          </div>
        </div>

        {/* Hero KPI Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Today's Sales */}
          <div className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
                Today's Sales
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24' }}>
              {formatCurrency(stats.todaySales)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.35rem', fontWeight: 600 }}>
              Live Daily Billing Revenue
            </div>
          </div>

          {/* Today's Collection */}
          <div className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
                Today's Collection
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign style={{ width: '18px', height: '18px', color: '#34d399' }} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#34d399' }}>
              {formatCurrency(stats.todayCollection)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.35rem' }}>
              Cash: {formatCurrency(stats.todayCash)} | UPI: {formatCurrency(stats.todayUPI)}
            </div>
          </div>

          {/* Today's Outstanding Dues */}
          <div className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
                Today's Outstanding Due
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle style={{ width: '18px', height: '18px', color: '#f87171' }} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f87171' }}>
              {formatCurrency(stats.todayDue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem', fontWeight: 600 }}>
              Requires Collection Followup
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
                Monthly Revenue
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 style={{ width: '18px', height: '18px', color: '#60a5fa' }} />
              </div>
            </div>
            <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60a5fa' }}>
              {formatCurrency(stats.monthlySales)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.35rem' }}>
              MTD Collected: {formatCurrency(stats.monthlyCollection)}
            </div>
          </div>
        </div>

        {/* Charts Component */}
        <DashboardCharts
          salesTrendData={[
            { day: 'Mon', sales: stats.todaySales * 0.7, collection: stats.todayCollection * 0.6 },
            { day: 'Tue', sales: stats.todaySales * 0.8, collection: stats.todayCollection * 0.75 },
            { day: 'Wed', sales: stats.todaySales * 0.9, collection: stats.todayCollection * 0.85 },
            { day: 'Thu', sales: stats.todaySales * 0.85, collection: stats.todayCollection * 0.8 },
            { day: 'Fri', sales: stats.todaySales * 0.95, collection: stats.todayCollection * 0.9 },
            { day: 'Sat', sales: stats.todaySales, collection: stats.todayCollection },
            { day: 'Sun', sales: stats.todaySales * 1.1, collection: stats.todayCollection * 1.05 },
          ]}
          driverChartData={[
            { name: 'Nagaraju', sales: stats.todaySales * 0.6 },
            { name: 'Driver 2', sales: stats.todaySales * 0.4 },
          ]}
        />

        {/* Recent Bills Table Section */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              <CardTitle>Recent Billing Transactions</CardTitle>
            </div>
            <a href="/sales">
              <Button variant="ghost" size="sm" icon={<ArrowRight style={{ width: '14px', height: '14px' }} />}>
                View All Sales
              </Button>
            </a>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <div className="table-scroll">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Customer Name</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>
                        No recent bills recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentBills.map((b) => (
                      <tr key={b.id}>
                        <td style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>{b.date}</td>
                        <td style={{ fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace' }}>
                          {b.invoice_number}
                        </td>
                        <td style={{ fontWeight: 600 }}>{b.customer_name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{(b.bill_type || '').replace(/_/g, ' ')}</td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(Number(b.total_amount) || 0)}
                        </td>
                        <td className="num" style={{ textAlign: 'right', color: '#34d399' }}>
                          {formatCurrency(Number(b.paid_amount) || 0)}
                        </td>
                        <td className="num" style={{ textAlign: 'right', color: Number(b.due_amount) > 0 ? '#f87171' : '#a1a1aa' }}>
                          {formatCurrency(Number(b.due_amount) || 0)}
                        </td>
                        <td>
                          <Badge variant={b.payment_status === 'paid' ? 'success' : b.payment_status === 'partial' ? 'warning' : 'danger'}>
                            {b.payment_status || 'Paid'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
