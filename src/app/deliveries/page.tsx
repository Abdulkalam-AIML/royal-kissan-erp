'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function DeliveriesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  useEffect(() => {
    supabase.from('sales').select('*, sale_items(*)').eq('sale_type', 'delivery').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSales(data || []); setLoading(false) })
  }, [])
  return (
    <div>
      <div className="page-header"><div><h2 className="page-title">📦 Deliveries</h2><p className="page-subtitle">{sales.length} delivery bills</p></div><a href="/billing?type=delivery" className="btn btn-primary">➕ New Delivery Bill</a></div>
      <div className="card">
        {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div> : sales.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}><div style={{ fontSize: '3rem' }}>📦</div><p>No delivery bills yet. <a href="/billing?type=delivery" style={{ color: 'hsl(217 91% 70%)' }}>Create one</a></p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead><tr><th>Date</th><th>Bill No</th><th>Items</th><th style={{ textAlign: 'right' }}>Total</th><th>Mode</th><th>Status</th></tr></thead>
              <tbody>{sales.map(s => (<tr key={s.id}><td style={{ fontSize: '0.8rem' }}>{new Date(s.sale_date).toLocaleDateString('en-IN')}</td><td style={{ fontWeight: '600', color: 'hsl(217 91% 70%)' }}>{s.invoice_number}</td><td>{s.sale_items?.length || 0} items</td><td style={{ textAlign: 'right' }} className="text-money">₹{(s.total_amount||0).toFixed(2)}</td><td style={{ textTransform: 'capitalize' }}>{s.payment_mode}</td><td><span className={`badge ${s.payment_status==='paid'?'badge-success':s.payment_status==='partial'?'badge-warning':'badge-danger'}`} style={{ textTransform: 'capitalize' }}>{s.payment_status}</span></td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
