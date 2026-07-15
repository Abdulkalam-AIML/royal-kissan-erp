'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const STOCK_ITEMS = [
  // Finished Products
  { name: 'Water Cans (20L)',    category: 'product', threshold: 50,   unit: 'cans',  icon: '🪣' },
  { name: 'Cooling Cans (20L)', category: 'product', threshold: 20,   unit: 'cans',  icon: '❄️' },
  { name: 'Water Packets',       category: 'product', threshold: 200,  unit: 'pkts',  icon: '🛍️' },
  { name: '250ml Bottle Case',   category: 'product', threshold: 20,   unit: 'cases', icon: '🍶' },
  { name: '500ml Bottle Case',   category: 'product', threshold: 20,   unit: 'cases', icon: '🍶' },
  { name: '1L Bottle Case',      category: 'product', threshold: 15,   unit: 'cases', icon: '🍶' },
  { name: '2L Bottle Case',      category: 'product', threshold: 10,   unit: 'cases', icon: '🍶' },
  // Raw Materials
  { name: 'Empty Cans',          category: 'raw', threshold: 30,   unit: 'pcs',   icon: '🪣' },
  { name: 'Caps',                category: 'raw', threshold: 1000, unit: 'pcs',   icon: '🔵' },
  { name: 'Labels',              category: 'raw', threshold: 500,  unit: 'pcs',   icon: '🏷️' },
  { name: 'Preforms',            category: 'raw', threshold: 500,  unit: 'pcs',   icon: '🔩' },
  { name: 'Jar Caps',            category: 'raw', threshold: 200,  unit: 'pcs',   icon: '🔘' },
  { name: 'Packaging Materials', category: 'raw', threshold: 10,   unit: 'rolls', icon: '📦' },
]

const CATEGORY_COLOR: Record<string, string> = {
  product: 'linear-gradient(135deg, hsl(217 91% 30% / 0.4), hsl(217 91% 20% / 0.2))',
  raw:     'linear-gradient(135deg, hsl(35 80% 30% / 0.4), hsl(35 80% 20% / 0.2))',
}

type StockData = Record<string, { opening: number; in: number; out: number; current: number }>

export default function StockPage() {
  const [stockData, setStockData] = useState<StockData>({})
  const [transactions, setTransactions] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [txType, setTxType] = useState<'opening' | 'in' | 'out'>('in')
  const [form, setForm] = useState({ item: STOCK_ITEMS[0].name, quantity: 0, notes: '' })
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | 'product' | 'raw'>('all')
  const supabase = createClient()

  useEffect(() => { loadStockData() }, [])

  async function loadStockData() {
    try {
      // Initialize zero state
      const calc: StockData = {}
      STOCK_ITEMS.forEach(item => {
        calc[item.name] = { opening: 0, in: 0, out: 0, current: 0 }
      })

      const { data: allTx } = await supabase.from('stock_transactions').select('transaction_type, quantity, item_name, notes, created_at').order('created_at')
      if (allTx) {
        allTx.forEach(tx => {
          // Find by item_name first, then fall back to note parsing
          const name = tx.item_name || STOCK_ITEMS.find(i => tx.notes?.includes(`[${i.name}]`))?.name
          if (!name || !calc[name]) return
          const qty = tx.quantity || 0
          if (tx.transaction_type === 'opening') {
            calc[name].opening += qty
          } else if (tx.transaction_type === 'in') {
            calc[name].in += qty
          } else if (tx.transaction_type === 'out') {
            calc[name].out += qty
          }
        })
        STOCK_ITEMS.forEach(item => {
          const d = calc[item.name]
          d.current = Math.max(0, d.opening + d.in - d.out)
        })
        setStockData(calc)
      }

      const { data: recent } = await supabase
        .from('stock_transactions')
        .select('id, created_at, transaction_type, item_name, notes, quantity, reference_type')
        .order('created_at', { ascending: false })
        .limit(30)
      setTransactions(recent || [])
    } catch (err) {
      console.error('Stock load error:', err)
    }
  }

  function getStock(name: string) { return stockData[name] || { opening: 0, in: 0, out: 0, current: 0 } }

  async function saveTransaction() {
    setSaving(true)
    try {
      await supabase.from('stock_transactions').insert({
        transaction_type: txType,
        quantity: form.quantity,
        item_name: form.item,
        notes: form.notes ? `${form.notes} [${form.item}]` : `[${form.item}]`,
        reference_type: txType === 'opening' ? 'opening_balance' : 'adjustment',
      })
      setShowModal(false)
      setForm({ item: STOCK_ITEMS[0].name, quantity: 0, notes: '' })
      loadStockData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const visibleItems = STOCK_ITEMS.filter(i => activeCategory === 'all' || i.category === activeCategory)
  const lowStockItems = STOCK_ITEMS.filter(i => getStock(i.name).current <= i.threshold)
  const totalInToday = transactions.filter(t => {
    const today = new Date().toISOString().split('T')[0]
    return t.transaction_type === 'in' && t.created_at?.startsWith(today)
  }).reduce((sum: number, t: any) => sum + (t.quantity || 0), 0)

  const grouped = visibleItems.reduce((acc: Record<string, any[]>, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📦 Stock Management</h2>
          <p className="page-subtitle">{STOCK_ITEMS.length} items · {lowStockItems.length} low stock alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-success btn-sm" onClick={() => { setTxType('opening'); setShowModal(true) }}>📋 Opening Stock</button>
          <button className="btn btn-primary" onClick={() => { setTxType('in'); setShowModal(true) }}>📥 Stock In</button>
          <button className="btn btn-secondary" onClick={() => { setTxType('out'); setShowModal(true) }}>📤 Stock Out</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>Total Items</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(210 40% 98%)' }}>{STOCK_ITEMS.length}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'hsl(0 85% 50% / 0.3)' }}>
          <div style={{ fontSize: '0.8rem', color: 'hsl(0 85% 70%)', fontWeight: '600' }}>⚠️ Low Stock</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: lowStockItems.length > 0 ? 'hsl(0 85% 70%)' : 'hsl(142 71% 55%)' }}>{lowStockItems.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>📥 Today In</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(142 71% 55%)' }}>{totalInToday}</div>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div style={{ padding: '0.875rem 1.25rem', background: 'hsl(0 85% 60% / 0.1)', border: '1px solid hsl(0 85% 60% / 0.3)', borderRadius: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '600', color: 'hsl(0 85% 70%)' }}>Low Stock Alert!</div>
            <div style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)' }}>{lowStockItems.map(i => i.name).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {(['all', 'product', 'raw'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ textTransform: 'capitalize' }}
          >
            {cat === 'all' ? '🗂 All' : cat === 'product' ? '💧 Products' : '🔧 Raw Materials'}
          </button>
        ))}
      </div>

      {/* Stock Cards */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>
            {cat === 'product' ? '💧 Finished Products' : '🔧 Raw Materials'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {items.map(item => {
              const s = getStock(item.name)
              const isLow = s.current <= item.threshold
              const pct = Math.min(100, (s.current / Math.max(item.threshold * 2, 1)) * 100)
              return (
                <div key={item.name} className="card" style={{ background: CATEGORY_COLOR[item.category], border: isLow ? '1px solid hsl(0 85% 60% / 0.5)' : '1px solid hsl(217 32% 22%)' }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'hsl(210 40% 95%)' }}>{item.name}</div>
                      </div>
                      <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>{isLow ? 'LOW' : 'OK'}</span>
                    </div>

                    {/* Stock Numbers Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
                      {[
                        { label: 'Opening', val: s.opening, color: 'hsl(215 20% 70%)' },
                        { label: 'In', val: s.in, color: 'hsl(142 71% 55%)' },
                        { label: 'Out', val: s.out, color: 'hsl(0 85% 70%)' },
                        { label: 'Current', val: s.current, color: isLow ? 'hsl(0 85% 70%)' : 'hsl(210 40% 98%)' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ textAlign: 'center', padding: '0.375rem', background: 'hsl(217 32% 10% / 0.5)', borderRadius: '0.375rem' }}>
                          <div style={{ fontSize: '0.625rem', color: 'hsl(215 20% 55%)', fontWeight: '600', marginBottom: '0.125rem' }}>{label}</div>
                          <div style={{ fontSize: '1rem', fontWeight: '800', color }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: '5px', background: 'hsl(217 32% 15%)', borderRadius: '3px', marginBottom: '0.875rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isLow ? 'hsl(0 85% 60%)' : 'hsl(142 71% 45%)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 45%)', marginBottom: '0.75rem' }}>Min: {item.threshold} {item.unit}</div>

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => { setTxType('in'); setForm({ ...form, item: item.name }); setShowModal(true) }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>📥 In</button>
                      <button onClick={() => { setTxType('out'); setForm({ ...form, item: item.name }); setShowModal(true) }} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>📤 Out</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">📋 Recent Stock Transactions</h3></div>
        <div style={{ overflowX: 'auto' }}>
          {transactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>No transactions yet.</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Item</th>
                  <th style={{ textAlign: 'right' }}>Qty</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(tx.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`badge ${tx.transaction_type === 'in' ? 'badge-success' : tx.transaction_type === 'opening' ? 'badge-info' : 'badge-danger'}`}>
                        {tx.transaction_type === 'in' ? '📥 IN' : tx.transaction_type === 'opening' ? '📋 OPENING' : '📤 OUT'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{tx.item_name || tx.notes}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>{tx.quantity}</td>
                    <td style={{ color: 'hsl(215 20% 45%)', fontSize: '0.8rem' }}>{tx.reference_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(210 40% 98%)', margin: 0 }}>
                {txType === 'opening' ? '📋 Opening Stock' : txType === 'in' ? '📥 Stock In' : '📤 Stock Out'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Transaction Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['opening', 'in', 'out'] as const).map(t => (
                    <button key={t} onClick={() => setTxType(t)} className={txType === t ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ flex: 1, textTransform: 'capitalize' }}>
                      {t === 'opening' ? '📋' : t === 'in' ? '📥' : '📤'} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Select Item</label>
                <select className="form-input" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })}>
                  {STOCK_ITEMS.map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" placeholder="Reason / Source / Batch" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid hsl(217 32% 17%)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveTransaction} disabled={form.quantity <= 0 || saving}>
                  {saving ? 'Saving...' : '✅ Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
