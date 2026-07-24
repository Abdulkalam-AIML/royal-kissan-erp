'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    setLoading(true)
    setError(null)
    try {
      // Parallel fetch from both bills and route_sales
      const [billsRes, routeSalesRes] = await Promise.all([
        supabase.from('bills').select('id, invoice_number, bill_type, customer_name, total_amount, paid_amount, due_amount, payment_status, date, payment_method').order('created_at', { ascending: false }).limit(50),
        supabase.from('route_sales').select('id, invoice_number, customer_name, product_name, quantity, total_amount, cash_paid, upi_paid, due_amount, payment_status, sale_date').order('created_at', { ascending: false }).limit(50)
      ])

      const combined: any[] = []
      
      if (billsRes.data) {
        billsRes.data.forEach((b: any) => {
          combined.push({
            id: `bill-${b.id}`,
            invoice_number: b.invoice_number || 'INV-BILL',
            type: b.bill_type || 'Company Invoice',
            customer: b.customer_name || 'Direct Customer',
            total: Number(b.total_amount) || 0,
            paid: Number(b.paid_amount) || 0,
            due: Number(b.due_amount) || 0,
            status: b.payment_status || 'paid',
            date: b.date || new Date().toISOString().split('T')[0],
            payment_mode: b.payment_method || 'cash'
          })
        })
      }

      if (routeSalesRes.data) {
        routeSalesRes.data.forEach((rs: any) => {
          const paid = (Number(rs.cash_paid) || 0) + (Number(rs.upi_paid) || 0)
          combined.push({
            id: `rs-${rs.id}`,
            invoice_number: rs.invoice_number || 'INV-ROUTE',
            type: 'Route Sale',
            customer: rs.customer_name || 'Route Stop',
            total: Number(rs.total_amount) || 0,
            paid: paid,
            due: Number(rs.due_amount) || 0,
            status: rs.payment_status || ((Number(rs.due_amount) || 0) > 0 ? 'due' : 'paid'),
            date: rs.sale_date || new Date().toISOString().split('T')[0],
            payment_mode: (Number(rs.cash_paid) || 0) > 0 ? 'cash' : 'upi'
          })
        })
      }

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setSales(combined)
    } catch (err: any) {
      console.error('Error loading sales history:', err)
      setError(err?.message || 'Failed to load sales history records')
    } finally {
      setLoading(false)
    }
  }

  const filtered = sales.filter(s =>
    s.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.customer?.toLowerCase().includes(search.toLowerCase()) ||
    s.status?.toLowerCase().includes(search.toLowerCase())
  )

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0)
  const totalCollected = sales.reduce((sum, s) => sum + s.paid, 0)
  const totalDue = sales.reduce((sum, s) => sum + s.due, 0)

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
            📋 Sales History
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#a39f93', marginTop: '0.25rem' }}>
            {sales.length} transactions recorded • Total Revenue: <span className="tabular-nums" style={{ color: '#dfb638', fontWeight: '700' }}>{formatCurrency(totalSales)}</span>
          </p>
        </div>
        <a href="/billing" className="btn btn-primary" style={{ borderRadius: '0.75rem' }}>
          ➕ New Bill
        </a>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Sales', value: formatCurrency(totalSales), icon: '📊', color: '#dfb638' },
          { label: 'Collected', value: formatCurrency(totalCollected), icon: '✅', color: '#34d399' },
          { label: 'Outstanding Dues', value: formatCurrency(totalDue), icon: '🔴', color: '#f87171' },
          { label: 'Total Invoices', value: sales.length.toString(), icon: '🧾', color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#a39f93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p>
                <p style={{ fontSize: '1.35rem', fontWeight: '800', color: s.color }} className="tabular-nums">{s.value}</p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <input
          className="form-input"
          style={{ width: '100%' }}
          placeholder="🔍 Search by invoice number, customer name, status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorState title="Sales History Error" message={error} onRetry={loadSales} />}

      {/* SALES TABLE */}
      <div className="glass-card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="loading-spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="No Sales Transactions Found"
              description="No sales or invoices match your search query."
              actionLabel="Create New Bill"
              onAction={() => window.location.href = '/billing'}
            />
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Type</th>
                  <th>Customer</th>
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
                    <td style={{ fontSize: '0.8rem', color: '#a39f93' }}>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: '700', color: '#dfb638' }} className="tabular-nums">{s.invoice_number || '—'}</td>
                    <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{s.type}</span></td>
                    <td style={{ fontWeight: '600' }}>{s.customer}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }} className="tabular-nums">{formatCurrency(s.total)}</td>
                    <td style={{ textAlign: 'right', color: '#34d399', fontWeight: '600' }} className="tabular-nums">{formatCurrency(s.paid)}</td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {s.due > 0
                        ? <span style={{ color: '#f87171', fontWeight: '700' }}>{formatCurrency(s.due)}</span>
                        : <span style={{ color: '#34d399', fontSize: '0.8rem' }}>—</span>
                      }
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '600', color: '#a39f93' }}>{s.payment_mode}</td>
                    <td>
                      <span className={`badge ${s.status === 'paid' ? 'badge-success' : s.status === 'partial' ? 'badge-warning' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => window.print()} title="Print Invoice">
                        🖨️
                      </button>
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
