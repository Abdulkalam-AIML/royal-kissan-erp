'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type ReportType = 'daily' | 'driver' | 'route' | 'monthly'

interface DailyReport {
  date: string
  totalSales: number
  totalCollection: number
  cashCollection: number
  upiCollection: number
  totalDue: number
  driverSales: number
  dealerSales: number
  companySales: number
  localRouteSales: number
  nonLocalRouteSales: number
}

interface DriverReport {
  name: string
  totalSales: number
  totalCollection: number
  cashCollection: number
  upiCollection: number
  totalDue: number
  routeName: string
  salesCount: number
}

interface RouteReport {
  routeName: string
  driver: string
  totalSales: number
  cashCollection: number
  upiCollection: number
  totalDue: number
  customerCount: number
  cansQty: number
  bagsQty: number
  bottlesQty: number
}

const NAGARAJU_ID = 'b097b6a9-8395-4eb8-a720-3057e07662c1'
const DRIVER2_ID  = '70c293e7-bae8-4de2-a505-edccfd35f761'
const LOCAL_ROUTE_ID = 'a1111111-1111-1111-1111-111111111111'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)

  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [driverReports, setDriverReports] = useState<DriverReport[]>([])
  const [routeReports, setRouteReports] = useState<RouteReport[]>([])
  const [monthlyData, setMonthlyData] = useState<DailyReport[]>([])
  const [monthSummary, setMonthSummary] = useState({ totalSales: 0, totalCollection: 0, totalDue: 0, cashCollection: 0, upiCollection: 0 })

  const supabase = createClient()

  useEffect(() => { generateReport() }, [reportType, selectedDate, selectedMonth])

  async function generateReport() {
    setLoading(true)
    try {
      if (reportType === 'daily') await loadDailyReport(selectedDate)
      else if (reportType === 'driver') await loadDriverReport(selectedDate)
      else if (reportType === 'route') await loadRouteReport(selectedDate)
      else if (reportType === 'monthly') await loadMonthlyReport(selectedMonth)
    } catch (e) {
      console.error('Report generation error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadDailyReport(date: string) {
    const [routeSalesRes, billsRes] = await Promise.all([
      supabase.from('route_sales').select('total_amount, cash_paid, upi_paid, due_amount, route_id').eq('sale_date', date),
      supabase.from('bills').select('total_amount, cash_amount, upi_amount, paid_amount, due_amount, bill_type').eq('date', date)
    ])
    const routeSales = routeSalesRes.data
    const bills = billsRes.data

    let totalSales = 0, totalCollection = 0, cashCollection = 0, upiCollection = 0, totalDue = 0
    let driverSales = 0, dealerSales = 0, companySales = 0, localRouteSales = 0, nonLocalRouteSales = 0

    routeSales?.forEach(s => {
      const t = Number(s.total_amount) || 0
      const cash = Number(s.cash_paid) || 0
      const upi = Number(s.upi_paid) || 0
      const due = Number(s.due_amount) || 0
      totalSales += t; totalDue += due; cashCollection += cash; upiCollection += upi; totalCollection += cash + upi
      driverSales += t
      if (s.route_id === LOCAL_ROUTE_ID) localRouteSales += t
      else nonLocalRouteSales += t
    })

    bills?.forEach(b => {
      const t = Number(b.total_amount) || 0
      const cash = Number(b.cash_amount) || 0
      const upi = Number(b.upi_amount) || 0
      const due = Number(b.due_amount) || 0
      const paid = Number(b.paid_amount) || 0
      totalSales += t; totalDue += due; cashCollection += cash; upiCollection += upi; totalCollection += paid
      if (b.bill_type === 'dealer_invoice') dealerSales += t
      else companySales += t
    })

    setDailyReport({ date, totalSales, totalCollection, cashCollection, upiCollection, totalDue, driverSales, dealerSales, companySales, localRouteSales, nonLocalRouteSales })
  }

  async function loadDriverReport(date: string) {
    const [routeSalesRes, billsRes] = await Promise.all([
      supabase.from('route_sales').select('total_amount, cash_paid, upi_paid, due_amount, driver_id, routes(name)').eq('sale_date', date),
      supabase.from('bills').select('total_amount, cash_amount, upi_amount, paid_amount, due_amount, driver_id').eq('date', date)
    ])
    const routeSales = routeSalesRes.data
    const bills = billsRes.data

    const driverMap: Record<string, DriverReport> = {
      [NAGARAJU_ID]: { name: 'Nagaraju', totalSales: 0, totalCollection: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, routeName: 'Local Route', salesCount: 0 },
      [DRIVER2_ID]: { name: 'Driver-2', totalSales: 0, totalCollection: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, routeName: 'Non-Local Routes', salesCount: 0 }
    }

    routeSales?.forEach(s => {
      const dId = s.driver_id || NAGARAJU_ID
      if (!driverMap[dId]) return
      const t = Number(s.total_amount) || 0
      const cash = Number(s.cash_paid) || 0
      const upi = Number(s.upi_paid) || 0
      const due = Number(s.due_amount) || 0
      driverMap[dId].totalSales += t
      driverMap[dId].cashCollection += cash
      driverMap[dId].upiCollection += upi
      driverMap[dId].totalCollection += cash + upi
      driverMap[dId].totalDue += due
      driverMap[dId].salesCount += 1
      if (s.routes) {
        const routeName = Array.isArray(s.routes) ? s.routes[0]?.name : (s.routes as any)?.name
        if (routeName) driverMap[dId].routeName = routeName
      }
    })

    bills?.forEach(b => {
      const dId = b.driver_id
      if (!dId || !driverMap[dId]) return
      const t = Number(b.total_amount) || 0
      const cash = Number(b.cash_amount) || 0
      const upi = Number(b.upi_amount) || 0
      const due = Number(b.due_amount) || 0
      driverMap[dId].totalSales += t
      driverMap[dId].cashCollection += cash
      driverMap[dId].upiCollection += upi
      driverMap[dId].totalCollection += Number(b.paid_amount) || 0
      driverMap[dId].totalDue += due
      driverMap[dId].salesCount += 1
    })

    setDriverReports(Object.values(driverMap))
  }

  async function loadRouteReport(date: string) {
    const { data: routeSales } = await supabase
      .from('route_sales')
      .select('total_amount, cash_paid, upi_paid, due_amount, quantity, product_name, routes(name, driver_id), drivers(name)')
      .eq('sale_date', date)

    const routeMap: Record<string, RouteReport> = {}

    routeSales?.forEach(s => {
      const rName = (Array.isArray(s.routes) ? s.routes[0]?.name : (s.routes as any)?.name) || 'Unknown'
      const dName = (Array.isArray(s.drivers) ? s.drivers[0]?.name : (s.drivers as any)?.name) || 'Unknown'
      if (!routeMap[rName]) {
        routeMap[rName] = { routeName: rName, driver: dName, totalSales: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, customerCount: 0, cansQty: 0, bagsQty: 0, bottlesQty: 0 }
      }
      routeMap[rName].totalSales += Number(s.total_amount) || 0
      routeMap[rName].cashCollection += Number(s.cash_paid) || 0
      routeMap[rName].upiCollection += Number(s.upi_paid) || 0
      routeMap[rName].totalDue += Number(s.due_amount) || 0
      routeMap[rName].customerCount += 1
      const pName = (s.product_name || '').toLowerCase()
      if (pName.includes('can')) routeMap[rName].cansQty += Number(s.quantity) || 0
      else if (pName.includes('bag')) routeMap[rName].bagsQty += Number(s.quantity) || 0
      else if (pName.includes('bottle') || pName.includes('ml') || pName.includes('1l') || pName.includes('2l')) routeMap[rName].bottlesQty += Number(s.quantity) || 0
    })

    // Fallback if no data
    if (Object.keys(routeMap).length === 0) {
      setRouteReports([
        { routeName: 'Local Route', driver: 'Nagaraju', totalSales: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, customerCount: 0, cansQty: 0, bagsQty: 0, bottlesQty: 0 },
        { routeName: 'Raghavapuram Route', driver: 'Driver-2', totalSales: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, customerCount: 0, cansQty: 0, bagsQty: 0, bottlesQty: 0 },
        { routeName: 'Makkinavarigudem Route', driver: 'Driver-2', totalSales: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, customerCount: 0, cansQty: 0, bagsQty: 0, bottlesQty: 0 },
        { routeName: 'Dammapeta Route', driver: 'Driver-2', totalSales: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, customerCount: 0, cansQty: 0, bagsQty: 0, bottlesQty: 0 }
      ])
    } else {
      setRouteReports(Object.values(routeMap))
    }
  }

  async function loadMonthlyReport(month: string) {
    const [year, mon] = month.split('-')
    const firstDay = `${year}-${mon}-01`
    const lastDay = new Date(Number(year), Number(mon), 0).toISOString().split('T')[0]

    const [routeSalesRes, billsRes] = await Promise.all([
      supabase.from('route_sales').select('sale_date, total_amount, cash_paid, upi_paid, due_amount, route_id').gte('sale_date', firstDay).lte('sale_date', lastDay),
      supabase.from('bills').select('date, total_amount, cash_amount, upi_amount, paid_amount, due_amount, bill_type').gte('date', firstDay).lte('date', lastDay)
    ])
    const routeSales = routeSalesRes.data
    const bills = billsRes.data

    // Group by day
    const dayMap: Record<string, DailyReport> = {}

    routeSales?.forEach(s => {
      const d = s.sale_date
      if (!dayMap[d]) dayMap[d] = { date: d, totalSales: 0, totalCollection: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, driverSales: 0, dealerSales: 0, companySales: 0, localRouteSales: 0, nonLocalRouteSales: 0 }
      const t = Number(s.total_amount) || 0
      const cash = Number(s.cash_paid) || 0
      const upi = Number(s.upi_paid) || 0
      dayMap[d].totalSales += t
      dayMap[d].cashCollection += cash
      dayMap[d].upiCollection += upi
      dayMap[d].totalCollection += cash + upi
      dayMap[d].totalDue += Number(s.due_amount) || 0
      dayMap[d].driverSales += t
      if (s.route_id === LOCAL_ROUTE_ID) dayMap[d].localRouteSales += t
      else dayMap[d].nonLocalRouteSales += t
    })

    bills?.forEach(b => {
      const d = b.date
      if (!dayMap[d]) dayMap[d] = { date: d, totalSales: 0, totalCollection: 0, cashCollection: 0, upiCollection: 0, totalDue: 0, driverSales: 0, dealerSales: 0, companySales: 0, localRouteSales: 0, nonLocalRouteSales: 0 }
      const t = Number(b.total_amount) || 0
      const cash = Number(b.cash_amount) || 0
      const upi = Number(b.upi_amount) || 0
      const paid = Number(b.paid_amount) || 0
      dayMap[d].totalSales += t
      dayMap[d].cashCollection += cash
      dayMap[d].upiCollection += upi
      dayMap[d].totalCollection += paid
      dayMap[d].totalDue += Number(b.due_amount) || 0
      if (b.bill_type === 'dealer_invoice') dayMap[d].dealerSales += t
      else dayMap[d].companySales += t
    })

    const rows = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))
    setMonthlyData(rows)

    // Monthly totals
    const ms = rows.reduce((acc, r) => ({
      totalSales: acc.totalSales + r.totalSales,
      totalCollection: acc.totalCollection + r.totalCollection,
      totalDue: acc.totalDue + r.totalDue,
      cashCollection: acc.cashCollection + r.cashCollection,
      upiCollection: acc.upiCollection + r.upiCollection,
    }), { totalSales: 0, totalCollection: 0, totalDue: 0, cashCollection: 0, upiCollection: 0 })
    setMonthSummary(ms)
  }

  const reportTabs = [
    { id: 'daily', label: 'Daily Report', icon: '📅' },
    { id: 'driver', label: 'Driver Report', icon: '🚛' },
    { id: 'route', label: 'Route Report', icon: '🗺️' },
    { id: 'monthly', label: 'Monthly Report', icon: '📈' },
  ] as const

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">📄 Reports & Analytics</h2>
          <p className="page-subtitle">Daily, Driver, Route, and Monthly reports</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Print Report</button>
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {reportTabs.map(tab => (
          <button key={tab.id} onClick={() => setReportType(tab.id)}
            className={reportType === tab.id ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontWeight: '700', borderRadius: '0.75rem' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Date Pickers */}
      <div className="glass-card-3d" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {(reportType === 'daily' || reportType === 'driver' || reportType === 'route') && (
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
            <label className="form-label">Select Date</label>
            <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        )}
        {reportType === 'monthly' && (
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
            <label className="form-label">Select Month</label>
            <input type="month" className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
        )}
        <button className="btn btn-primary" onClick={generateReport} disabled={loading} style={{ alignSelf: 'flex-end', marginBottom: '1px' }}>
          {loading ? '⏳ Loading...' : '🔄 Generate Report'}
        </button>
      </div>

      {loading && <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loading-spinner" /></div>}

      {/* ===================== DAILY REPORT ===================== */}
      {!loading && reportType === 'daily' && dailyReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Total Sales', value: formatCurrency(dailyReport.totalSales), color: '#fff', icon: '🧾' },
              { label: 'Total Collection', value: formatCurrency(dailyReport.totalCollection), color: '#34d399', icon: '💰' },
              { label: 'Cash Collection', value: formatCurrency(dailyReport.cashCollection), color: '#34d399', icon: '💵' },
              { label: 'UPI Collection', value: formatCurrency(dailyReport.upiCollection), color: '#a78bfa', icon: '📱' },
              { label: 'Total Due', value: formatCurrency(dailyReport.totalDue), color: dailyReport.totalDue > 0 ? '#f87171' : '#34d399', icon: '🔴' },
              { label: 'Driver Sales', value: formatCurrency(dailyReport.driverSales), color: '#60a5fa', icon: '🚛' },
              { label: 'Dealer Sales', value: formatCurrency(dailyReport.dealerSales), color: '#f59e0b', icon: '🏪' },
              { label: 'Company Sales', value: formatCurrency(dailyReport.companySales), color: '#06b6d4', icon: '🏢' },
              { label: 'Local Route Sales', value: formatCurrency(dailyReport.localRouteSales), color: '#10b981', icon: '🗺️' },
              { label: 'Non-Local Route Sales', value: formatCurrency(dailyReport.nonLocalRouteSales), color: '#e879f9', icon: '🛣️' },
            ].map((kpi, i) => (
              <div key={i} className="glass-card-3d" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '700' }}>{kpi.label}</span>
                  <span>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="glass-card-3d" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', marginBottom: '1rem' }}>📅 Daily Summary for {new Date(dailyReport.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              {[
                ['Sales - Local Route (Nagaraju)', formatCurrency(dailyReport.localRouteSales)],
                ['Sales - Non-Local Routes (Driver-2)', formatCurrency(dailyReport.nonLocalRouteSales)],
                ['Sales - Dealer Invoices', formatCurrency(dailyReport.dealerSales)],
                ['Sales - Company Direct', formatCurrency(dailyReport.companySales)],
                ['Cash Collected', formatCurrency(dailyReport.cashCollection)],
                ['UPI Collected', formatCurrency(dailyReport.upiCollection)],
                ['Outstanding Due', formatCurrency(dailyReport.totalDue)],
              ].map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem', background: 'rgba(255,255,255,0.01)', borderRadius: '0.5rem' }}>
                  <span style={{ color: 'hsl(215 20% 55%)' }}>{label}</span>
                  <span style={{ fontWeight: '700', color: '#fff' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== DRIVER REPORT ===================== */}
      {!loading && reportType === 'driver' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {driverReports.map((dr, i) => (
              <div key={i} className="glass-card-3d" style={{ padding: '2rem', border: `1px solid ${i === 0 ? 'rgba(59,130,246,0.2)' : 'rgba(232,121,249,0.2)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>🚛 {dr.name}</h3>
                    <span className="badge badge-muted" style={{ marginTop: '0.375rem' }}>{dr.routeName}</span>
                  </div>
                  <span className="badge badge-info">{dr.salesCount} Sales</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { label: 'Total Sales', value: formatCurrency(dr.totalSales), color: '#fff' },
                    { label: 'Total Collection', value: formatCurrency(dr.totalCollection), color: '#34d399' },
                    { label: 'Cash', value: formatCurrency(dr.cashCollection), color: '#10b981' },
                    { label: 'UPI', value: formatCurrency(dr.upiCollection), color: '#a78bfa' },
                    { label: 'Outstanding Due', value: formatCurrency(dr.totalDue), color: dr.totalDue > 0 ? '#f87171' : '#34d399' },
                  ].map((stat, j) => (
                    <div key={j} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '0.625rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>{stat.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== ROUTE REPORT ===================== */}
      {!loading && reportType === 'route' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {routeReports.map((rr, i) => (
            <div key={i} className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">🗺️ {rr.routeName}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)' }}>Driver: {rr.driver} | {rr.customerCount} customers</span>
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#60a5fa' }}>{formatCurrency(rr.totalSales)}</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Cash', value: formatCurrency(rr.cashCollection), color: '#10b981' },
                    { label: 'UPI', value: formatCurrency(rr.upiCollection), color: '#a78bfa' },
                    { label: 'Due', value: formatCurrency(rr.totalDue), color: rr.totalDue > 0 ? '#f87171' : '#34d399' },
                    { label: 'Cans (20L)', value: `${rr.cansQty} cans`, color: '#fff' },
                    { label: 'Bags (100pk)', value: `${rr.bagsQty} pkts`, color: '#fff' },
                    { label: 'Bottles', value: `${rr.bottlesQty} cs`, color: '#fff' },
                  ].map((s, j) => (
                    <div key={j} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '0.625rem', padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '700' }}>{s.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: s.color, marginTop: '0.125rem' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================== MONTHLY REPORT ===================== */}
      {!loading && reportType === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Month Sales', value: formatCurrency(monthSummary.totalSales), color: '#fff', icon: '📊' },
              { label: 'Month Collection', value: formatCurrency(monthSummary.totalCollection), color: '#34d399', icon: '💰' },
              { label: 'Cash Collection', value: formatCurrency(monthSummary.cashCollection), color: '#10b981', icon: '💵' },
              { label: 'UPI Collection', value: formatCurrency(monthSummary.upiCollection), color: '#a78bfa', icon: '📱' },
              { label: 'Month Due', value: formatCurrency(monthSummary.totalDue), color: monthSummary.totalDue > 0 ? '#f87171' : '#34d399', icon: '🔴' },
            ].map((kpi, i) => (
              <div key={i} className="glass-card-3d" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontWeight: '700' }}>{kpi.label}</span>
                  <span>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Day-by-day table */}
          <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
            <div className="card-header"><h3 className="card-title">📅 Day-by-Day Breakdown — {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</h3></div>
            {monthlyData.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>No data found for this month.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Total Sales</th>
                      <th style={{ textAlign: 'right' }}>Cash</th>
                      <th style={{ textAlign: 'right' }}>UPI</th>
                      <th style={{ textAlign: 'right' }}>Collection</th>
                      <th style={{ textAlign: 'right' }}>Due</th>
                      <th style={{ textAlign: 'right' }}>Driver Sales</th>
                      <th style={{ textAlign: 'right' }}>Dealer Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row, i) => (
                      <tr key={i}>
                        <td>{new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#fff' }}>{formatCurrency(row.totalSales)}</td>
                        <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(row.cashCollection)}</td>
                        <td style={{ textAlign: 'right', color: '#a78bfa' }}>{formatCurrency(row.upiCollection)}</td>
                        <td style={{ textAlign: 'right', color: '#34d399', fontWeight: '700' }}>{formatCurrency(row.totalCollection)}</td>
                        <td style={{ textAlign: 'right', color: row.totalDue > 0 ? '#f87171' : '#34d399', fontWeight: '700' }}>{formatCurrency(row.totalDue)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(row.driverSales)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(row.dealerSales)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: '800' }}>
                      <td>TOTAL</td>
                      <td style={{ textAlign: 'right', color: '#fff' }}>{formatCurrency(monthSummary.totalSales)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(monthSummary.cashCollection)}</td>
                      <td style={{ textAlign: 'right', color: '#a78bfa' }}>{formatCurrency(monthSummary.upiCollection)}</td>
                      <td style={{ textAlign: 'right', color: '#34d399' }}>{formatCurrency(monthSummary.totalCollection)}</td>
                      <td style={{ textAlign: 'right', color: '#f87171' }}>{formatCurrency(monthSummary.totalDue)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
