'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    setSales(data || [])
    setLoading(false)
  }

  const filtered = sales.filter(s =>
    s.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.payment_status?.toLowerCase().includes(search.toLowerCase())
  )
  const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  const totalCollected = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0)
  const totalDue = sales.reduce((sum, s) => sum + (s.due_amount || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📋 Sales History</h2>
          <p className="page-subtitle">{sales.length} bills • Total: ₹{totalSales.toFixed(0)}</p>
        </div>
        <a href="/billing" className="btn btn-primary">➕ New Bill</a>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Sales', value: `₹${totalSales.toFixed(0)}`, icon: '📊', color: 'hsl(217,91%,60%)' },
          { label: 'Collected', value: `₹${totalCollected.toFixed(0)}`, icon: '✅', color: 'hsl(142,71%,45%)' },
          { label: 'Outstanding', value: `₹${totalDue.toFixed(0)}`, icon: '🔴', color: 'hsl(0,85%,60%)' },
          { label: 'Bills', value: sales.length.toString(), icon: '🧾', color: 'hsl(270,75%,60%)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
                <p style={{ fontSize: '1.375rem', fontWeight: '800', color: 'hsl(210 40% 98%)' }} className="text-money">{s.value}</p>
              </div>
              <span style={{ fontSize: '1.75rem' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <input className="form-input" placeholder="🔍 Search by invoice number, status..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
              <div style={{ fontSize: '3rem' }}>🧾</div>
              <p>No bills found. <a href="/billing" style={{ color: 'hsl(217 91% 70%)' }}>Create your first bill</a></p>
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)' }}>{new Date(s.sale_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: '700', color: 'hsl(217 91% 70%)' }}>{s.invoice_number || '—'}</td>
                    <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{s.sale_type}</span></td>
                    <td style={{ color: 'hsl(215 20% 55%)', fontSize: '0.8rem' }}>{s.sale_items?.length || 0} items</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }} className="text-money">₹{(s.total_amount || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'hsl(142 71% 55%)' }} className="text-money">₹{(s.paid_amount || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(s.due_amount || 0) > 0
                        ? <span className="due-amount text-money">₹{s.due_amount.toFixed(2)}</span>
                        : <span style={{ color: 'hsl(142 71% 55%)', fontSize: '0.8rem' }}>—</span>
                      }
                    </td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{s.payment_mode}</td>
                    <td>
                      <span className={`badge ${s.payment_status === 'paid' ? 'badge-success' : s.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️</button>
                      </div>
                    </td>
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
