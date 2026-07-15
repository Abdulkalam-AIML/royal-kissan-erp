'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['Diesel','Fuel','Electricity','Vehicle Maintenance','Plant Maintenance','Salaries','Marketing','Transport','Office Expenses','Miscellaneous']

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category_name: CATEGORIES[0], amount: '', expense_date: new Date().toISOString().split('T')[0], description: '', payment_mode: 'cash' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => { loadExpenses() }, [])

  async function loadExpenses() {
    const { data } = await supabase.from('expenses').select('id, expense_date, category_name, description, payment_mode, amount').order('expense_date', { ascending: false }).limit(50)
    setExpenses(data || [])
    setLoading(false)
  }

  async function saveExpense() {
    setSaving(true)
    await supabase.from('expenses').insert({ ...form, amount: Number(form.amount) })
    setShowModal(false)
    setForm({ category_name: CATEGORIES[0], amount: '', expense_date: new Date().toISOString().split('T')[0], description: '', payment_mode: 'cash' })
    setSaving(false)
    loadExpenses()
  }

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category_name === filter)
  const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0)
  const today = expenses.filter(e => e.expense_date === new Date().toISOString().split('T')[0]).reduce((sum, e) => sum + (e.amount || 0), 0)
  const thisMonth = expenses.filter(e => e.expense_date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">💸 Expense Management</h2><p className="page-subtitle">Track all business expenses</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Expense</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {[{ label: "Today's Expenses", value: `₹${today.toFixed(0)}`, icon: '📅', color: 'hsl(217,91%,60%)' }, { label: 'This Month', value: `₹${thisMonth.toFixed(0)}`, icon: '📆', color: 'hsl(0,85%,60%)' }, { label: 'Total Expenses', value: `₹${expenses.reduce((s,e)=>s+(e.amount||0),0).toFixed(0)}`, icon: '💸', color: 'hsl(38,92%,50%)' }, { label: 'Categories', value: CATEGORIES.length.toString(), icon: '🏷️', color: 'hsl(270,75%,60%)' }].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p><p style={{ fontSize: '1.375rem', fontWeight: '800', color: 'hsl(210 40% 98%)' }} className="text-money">{s.value}</p></div>
              <span style={{ fontSize: '1.75rem' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All</button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Expense Records</h3>
          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'hsl(0 85% 70%)' }} className="text-money">Total: ₹{total.toFixed(2)}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}><div style={{ fontSize: '3rem' }}>💸</div><p>No expenses recorded yet.</p></div>
          ) : (
            <table className="erp-table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Mode</th><th style={{ textAlign: 'right' }}>Amount</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)' }}>{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                    <td><span className="badge badge-info">{e.category_name}</span></td>
                    <td>{e.description || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{e.payment_mode}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'hsl(0 85% 70%)' }} className="text-money">₹{(e.amount || 0).toFixed(2)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={async () => { if(confirm('Delete?')) { await supabase.from('expenses').delete().eq('id',e.id); loadExpenses() } }}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(210 40% 98%)', margin: 0 }}>Add Expense</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group"><label className="form-label">Category *</label><select className="form-input" value={form.category_name} onChange={e => setForm({...form, category_name: e.target.value})}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" placeholder="What was this expense for?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['cash','upi','bank_transfer','cheque'].map(m => (
                    <button key={m} onClick={() => setForm({...form, payment_mode: m})} className={`btn btn-sm ${form.payment_mode === m ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{m}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid hsl(217 32% 17%)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveExpense} disabled={!form.amount || saving}>{saving ? 'Saving...' : '✅ Save Expense'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
