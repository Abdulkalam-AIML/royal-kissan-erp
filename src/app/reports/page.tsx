'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const [period, setPeriod] = useState('today')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])
  const supabase = createClient()

  const reportTypes = [
    { id: 'sales', label: 'Sales Report', icon: '📊' },
    { id: 'route_sales', label: 'Route Sales', icon: '🛣️' },
    { id: 'driver_collections', label: 'Driver Collections', icon: '🚛' },
    { id: 'expenses', label: 'Expense Report', icon: '💸' },
    { id: 'dues', label: 'Due Report', icon: '🔴' },
    { id: 'stock', label: 'Stock Report', icon: '📦' },
    { id: 'salary', label: 'Salary Report', icon: '💳' },
  ]

  async function generateReport() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = today.slice(0, 7) + '-01'

      let dateFilter = today
      if (period === 'week') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        dateFilter = d.toISOString().split('T')[0]
      } else if (period === 'month') {
        dateFilter = monthStart
      } else if (period === 'quarter') {
        const d = new Date()
        d.setMonth(d.getMonth() - 3)
        dateFilter = d.toISOString().split('T')[0]
      }

      if (reportType === 'sales') {
        const { data } = await supabase
          .from('sales')
          .select(`*, customers(name)`)
          .gte('sale_date', dateFilter)
          .order('sale_date', { ascending: false })
        setReportData(data || [])
      } else if (reportType === 'route_sales') {
        const { data } = await supabase
          .from('route_sales')
          .select(`*, drivers(name), routes(name)`)
          .gte('sale_date', dateFilter)
          .order('sale_date', { ascending: false })
        setReportData(data || [])
      } else if (reportType === 'driver_collections') {
        const { data } = await supabase
          .from('driver_collections')
          .select(`*, drivers(name), routes(name)`)
          .gte('collection_date', dateFilter)
          .order('collection_date', { ascending: false })
        setReportData(data || [])
      } else if (reportType === 'expenses') {
        const { data } = await supabase
          .from('expenses')
          .select('*')
          .gte('expense_date', dateFilter)
          .order('expense_date', { ascending: false })
        setReportData(data || [])
      } else if (reportType === 'dues') {
        const { data } = await supabase
          .from('customer_dues')
          .select(`*, routes(name), drivers(name)`)
          .gt('due_amount', 0)
          .order('due_amount', { ascending: false })
        setReportData(data || [])
      } else if (reportType === 'stock') {
        const { data } = await supabase
          .from('stock_status')
          .select('*')
        setReportData(data || [])
      } else if (reportType === 'salary') {
        const { data } = await supabase
          .from('salary_payments')
          .select(`*, employees(name)`)
          .gte('payment_date', dateFilter)
          .order('payment_date', { ascending: false })
        setReportData(data || [])
      }
    } catch (err) {
      console.error(err)
      alert('Error generating report')
    } finally {
      setLoading(false)
    }
  }

  function exportToCSV() {
    if (reportData.length === 0) return

    const flattened = reportData.map(row => {
      const copy: Record<string, any> = {}
      Object.entries(row).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          copy[`${k}_name`] = (v as any).name || JSON.stringify(v)
        } else {
          copy[k] = v
        }
      })
      return copy
    })

    const headers = Object.keys(flattened[0]).join(',')
    const rows = flattened.map(row =>
      Object.values(row).map(v => {
        const str = typeof v === 'object' ? JSON.stringify(v) : String(v || '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    ).join('\n')

    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `royal-kissan-${reportType}-${period}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title">📄 ERP Reports Center</h2>
          <p className="page-subtitle">Generate, print, and export daily, monthly, and 3-month performance analyses</p>
        </div>
      </div>

      {/* Report Types selector card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3 className="card-title">Choose Report Module</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {reportTypes.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setReportType(r.id)
                  setReportData([])
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem 0.5rem',
                  background: reportType === r.id ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 9%)',
                  border: `1px solid ${reportType === r.id ? 'hsl(217 91% 60% / 0.4)' : 'hsl(217 32% 17%)'}`,
                  borderRadius: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  color: reportType === r.id ? 'hsl(217 91% 70%)' : 'hsl(215 20% 55%)',
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{r.icon}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: '700', textAlign: 'center' }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period selection & Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3 className="card-title">Select Duration & Options</h3></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'quarter', label: '3 Months Analysis' },
              ].map(p => (
                <button 
                  key={p.id} 
                  onClick={() => {
                    setPeriod(p.id)
                    setReportData([])
                  }} 
                  className={`btn btn-sm ${period === p.id ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
              <button onClick={generateReport} disabled={loading} className="btn btn-primary">
                {loading ? '⏳ Generating...' : '🔍 Generate Report'}
              </button>
              <button onClick={exportToCSV} disabled={reportData.length === 0} className="btn btn-secondary">
                📊 Export Excel (CSV)
              </button>
              <button onClick={() => window.print()} disabled={reportData.length === 0} className="btn btn-secondary">
                🖨️ Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Output table */}
      <div className="card" id="print-report-section">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">
            {reportTypes.find(r => r.id === reportType)?.label} – {period === 'quarter' ? '3 Months Analysis' : period.charAt(0).toUpperCase() + period.slice(1)}
          </h3>
          {reportData.length > 0 && (
            <span className="badge badge-info">{reportData.length} Records</span>
          )}
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          {reportData.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem', fontWeight: '700' }}>No report generated yet</p>
              <p style={{ fontSize: '0.875rem' }}>Select a report type and period, then click **Generate Report**.</p>
            </div>
          ) : reportType === 'sales' ? (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.sale_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: '600', color: 'hsl(217 91% 70%)' }}>{s.invoice_number}</td>
                    <td>{s.customers?.name || 'Walk-In'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{s.total_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }}>₹{s.paid_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: s.due_amount > 0 ? 'red' : 'inherit' }}>₹{s.due_amount.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${s.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                        {s.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'route_sales' ? (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(s.sale_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: '600', color: 'hsl(217 91% 70%)' }}>{s.invoice_number}</td>
                    <td>{s.drivers?.name || '—'}</td>
                    <td>{s.routes?.name || '—'}</td>
                    <td style={{ fontWeight: '600' }}>{s.customer_name}</td>
                    <td style={{ color: 'hsl(215 20% 55%)' }}>{s.product_name}</td>
                    <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{s.total_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }}>₹{(s.cash_paid + s.upi_paid).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: s.due_amount > 0 ? 'red' : 'inherit', fontWeight: s.due_amount > 0 ? '800' : 'inherit' }}>
                      ₹{s.due_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'hsl(222 47% 9%)', fontWeight: '800' }}>
                  <td colSpan={7} style={{ textAlign: 'right' }}>TOTALS</td>
                  <td style={{ textAlign: 'right', color: 'hsl(210 40% 98%)' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.total_amount || 0), 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.cash_paid + r.upi_paid), 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'red' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.due_amount || 0), 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : reportType === 'driver_collections' ? (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Driver</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Cash Collected</th>
                  <th style={{ textAlign: 'right' }}>UPI Collected</th>
                  <th style={{ textAlign: 'right' }}>Dues Unresolved</th>
                  <th style={{ textAlign: 'right' }}>Total Collected</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.collection_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: '600' }}>{c.drivers?.name || '—'}</td>
                    <td>{c.routes?.name || '—'}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }}>₹{c.cash_collected.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(199 89% 48%)' }}>₹{c.upi_collected.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: c.due_outstanding > 0 ? 'red' : 'inherit' }}>₹{c.due_outstanding.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{c.total_collected.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background: 'hsl(222 47% 9%)', fontWeight: '800' }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>TOTALS</td>
                  <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.cash_collected || 0), 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'hsl(199 89% 48%)' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.upi_collected || 0), 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'red' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.due_outstanding || 0), 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'hsl(210 40% 98%)' }}>
                    ₹{reportData.reduce((sum, r) => sum + (r.total_collected || 0), 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : reportType === 'expenses' ? (
            <table className="erp-table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Mode</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {reportData.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                    <td><span className="badge badge-info">{e.category_name}</span></td>
                    <td>{e.description || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{e.payment_mode}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'red' }}>₹{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'dues' ? (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th style={{ textAlign: 'right' }}>Resolved (Paid)</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Due</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '700', color: 'red' }}>{d.customer_name}</td>
                    <td>{d.routes?.name || '—'}</td>
                    <td>{d.drivers?.name || '—'}</td>
                    <td style={{ textAlign: 'right', color: 'green' }}>₹{d.resolved_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'red' }}>₹{d.due_amount.toFixed(2)}</td>
                    <td>{new Date(d.last_updated).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'stock' ? (
            <table className="erp-table">
              <thead><tr><th>Product Name</th><th>Category</th><th>Stock Level</th><th>Low Limit</th><th>Status</th></tr></thead>
              <tbody>
                {reportData.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600' }}>{item.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                    <td style={{ fontWeight: '750', color: item.is_low_stock ? 'red' : 'inherit' }}>{item.current_quantity}</td>
                    <td>{item.low_stock_threshold}</td>
                    <td>
                      <span className={`badge ${item.is_low_stock ? 'badge-danger' : 'badge-success'}`}>
                        {item.is_low_stock ? 'LOW STOCK' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="erp-table">
              <thead><tr><th>Payment Date</th><th>Employee</th><th>Period</th><th>Base Salary</th><th>Net Salary</th><th>Status</th></tr></thead>
              <tbody>
                {reportData.map(p => (
                  <tr key={p.id}>
                    <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ fontWeight: '600' }}>{p.employees?.name}</td>
                    <td>{p.month}/{p.year}</td>
                    <td>₹{p.base_salary.toFixed(2)}</td>
                    <td style={{ fontWeight: '700' }}>₹{p.net_salary.toFixed(2)}</td>
                    <td><span className="badge badge-success">{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
