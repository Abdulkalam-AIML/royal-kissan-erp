'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function ProfitLossPage() {
  const [data, setData] = useState({ sales: 0, expenses: 0, salaries: 0, profit: 0 })
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  useEffect(() => { loadData() }, [period])
  async function loadData() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      let fromDate = today
      if (period === 'week') { const d = new Date(); d.setDate(d.getDate()-7); fromDate = d.toISOString().split('T')[0] }
      else if (period === 'month') { fromDate = today.slice(0,7)+'-01' }
      else if (period === 'quarter') { const d = new Date(); d.setMonth(d.getMonth()-3); fromDate = d.toISOString().split('T')[0] }
      else if (period === 'year') { fromDate = new Date().getFullYear()+'-01-01' }
      const [{ data: sales }, { data: expenses }, { data: salaries }] = await Promise.all([
        supabase.from('sales').select('total_amount').gte('sale_date', fromDate),
        supabase.from('expenses').select('amount').gte('expense_date', fromDate),
        supabase.from('salary_payments').select('net_salary').gte('created_at', fromDate).eq('status', 'paid')
      ])
      const totalSales = (sales||[]).reduce((s,r) => s+(r.total_amount||0), 0)
      const totalExpenses = (expenses||[]).reduce((s,r) => s+(r.amount||0), 0)
      const totalSalaries = (salaries||[]).reduce((s,r) => s+(r.net_salary||0), 0)
      setData({ sales: totalSales, expenses: totalExpenses, salaries: totalSalaries, profit: totalSales - totalExpenses - totalSalaries })
    } catch(err) { console.error(err) } finally { setLoading(false) }
  }
  const rows = [{ label: 'Total Sales (Revenue)', value: data.sales, color: 'hsl(217,91%,60%)', sign: '+', icon: '💰' }, { label: 'Total Expenses', value: data.expenses, color: 'hsl(0,85%,60%)', sign: '-', icon: '💸' }, { label: 'Salary Payments', value: data.salaries, color: 'hsl(38,92%,50%)', sign: '-', icon: '💳' }]
  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">📈 Profit & Loss</h2><p className="page-subtitle">Auto-calculated P&L statement</p></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>{['today','week','month','quarter','year'].map(p => <button key={p} onClick={() => setPeriod(p)} className={`btn btn-sm ${period===p?'btn-primary':'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{p}</button>)}</div>
      </div>
      {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div> : (
        <div style={{ maxWidth: '640px' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">P&L Statement – {period.charAt(0).toUpperCase()+period.slice(1)}</h3></div>
            <div className="card-body">
              {rows.map(row => (<div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid hsl(217 32% 17%)' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ fontSize: '1.375rem' }}>{row.icon}</span><div><div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'hsl(215 20% 70%)' }}>{row.label}</div></div></div><div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.75rem', color: row.sign === '+' ? 'hsl(142 71% 55%)' : 'hsl(0 85% 70%)', fontWeight: '700' }}>{row.sign}</div><div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'hsl(210 40% 98%)' }} className="text-money">₹{row.value.toLocaleString('en-IN')}</div></div></div>))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 0 0', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ fontSize: '1.75rem' }}>📊</span><div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(210 40% 98%)' }}>NET PROFIT / LOSS</div></div>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', color: data.profit >= 0 ? 'hsl(142 71% 55%)' : 'hsl(0 85% 70%)' }} className="text-money">{data.profit >= 0 ? '+' : ''}₹{data.profit.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.875rem', background: data.profit >= 0 ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 85% 60% / 0.1)', border: `1px solid ${data.profit >= 0 ? 'hsl(142 71% 45% / 0.3)' : 'hsl(0 85% 60% / 0.3)'}`, borderRadius: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: data.profit >= 0 ? 'hsl(142 71% 55%)' : 'hsl(0 85% 70%)' }}>{data.profit >= 0 ? '✅ Your business is profitable!' : '⚠️ Business is in loss. Review expenses.'}</div>
                {data.sales > 0 && <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>Profit Margin: {((data.profit/data.sales)*100).toFixed(1)}%</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
