'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_PRODUCTS = [
  { name: 'Water Can (20L)',   category: 'Can',    unit: 'piece', default_rate: 15,  gst_rate: 18, hsn_code: '2201', is_active: true, manual_price: false },
  { name: 'Cooling Can (20L)', category: 'Can',    unit: 'piece', default_rate: 30,  gst_rate: 18, hsn_code: '2201', is_active: true, manual_price: false },
  { name: 'Water Packets',     category: 'Packet', unit: 'piece', default_rate: 0,   gst_rate: 12, hsn_code: '2201', is_active: true, manual_price: true  },
  { name: '500ml Bottle Case', category: 'Bottle', unit: 'case',  default_rate: 140, gst_rate: 18, hsn_code: '2201', is_active: true, manual_price: false },
  { name: '250ml Bottle Case', category: 'Bottle', unit: 'case',  default_rate: 150, gst_rate: 18, hsn_code: '2201', is_active: true, manual_price: false },
  { name: '1L Bottle Case',    category: 'Bottle', unit: 'case',  default_rate: 120, gst_rate: 18, hsn_code: '2201', is_active: true, manual_price: false },
  { name: '2L Bottle Case',    category: 'Bottle', unit: 'case',  default_rate: 150, gst_rate: 18, hsn_code: '2201', is_active: true, manual_price: false },
]

const CATEGORY_ICONS: Record<string, string> = { Can: '🪣', Packet: '🛍️', Bottle: '🍶' }
const CATEGORY_GRADIENT: Record<string, string> = {
  Can:    'linear-gradient(135deg, hsl(217 91% 30% / 0.4), hsl(217 91% 20% / 0.2))',
  Packet: 'linear-gradient(135deg, hsl(142 60% 25% / 0.4), hsl(142 60% 15% / 0.2))',
  Bottle: 'linear-gradient(135deg, hsl(270 60% 30% / 0.4), hsl(270 60% 20% / 0.2))',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>(DEFAULT_PRODUCTS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: 'Can', unit: 'piece', default_rate: 0, gst_rate: 18, hsn_code: '2201', is_active: true })
  const supabase = createClient()

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    try {
      const { data } = await supabase.from('products').select('id, name, category, default_rate, gst_rate, hsn_code, is_active, unit').order('name')
      if (data && data.length > 0) setProducts(data)
    } catch { /* use defaults */ }
  }

  function startEdit(p: any) {
    setEditingId(p.id || p.name)
    setEditForm({ ...p })
  }

  async function saveEdit() {
    setSaving(true)
    try {
      if (editForm.id) {
        await supabase.from('products').update({
          name: editForm.name,
          default_rate: editForm.default_rate,
          gst_rate: editForm.gst_rate,
          hsn_code: editForm.hsn_code,
          is_active: editForm.is_active,
          category: editForm.category,
        }).eq('id', editForm.id)
      }
      // Update local state optimistically
      setProducts(prev => prev.map(p => (p.id || p.name) === editingId ? { ...p, ...editForm } : p))
    } catch { /* ignore */ }
    setEditingId(null)
    setSaving(false)
  }

  async function saveNewProduct() {
    setSaving(true)
    try {
      const { data } = await supabase.from('products').insert(addForm).select().single()
      if (data) setProducts(prev => [...prev, data])
      else setProducts(prev => [...prev, { ...addForm, id: Date.now().toString() }])
    } catch {
      setProducts(prev => [...prev, { ...addForm, id: Date.now().toString() }])
    }
    setShowAdd(false)
    setAddForm({ name: '', category: 'Can', unit: 'piece', default_rate: 0, gst_rate: 18, hsn_code: '2201', is_active: true })
    setSaving(false)
  }

  async function toggleStatus(p: any) {
    const newStatus = !p.is_active
    if (p.id) {
      await supabase.from('products').update({ is_active: newStatus }).eq('id', p.id)
    }
    setProducts(prev => prev.map(item => (item.id || item.name) === (p.id || p.name) ? { ...item, is_active: newStatus } : item))
  }

  const grouped = products.reduce((acc: Record<string, any[]>, p) => {
    const cat = p.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">💧 Product Master</h2>
          <p className="page-subtitle">{products.length} products · {products.filter(p => p.is_active).length} active</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ Add Product</button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>Total Products</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(210 40% 98%)' }}>{products.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>Active</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(142 71% 55%)' }}>{products.filter(p => p.is_active).length}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>Categories</div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(270 60% 70%)' }}>{Object.keys(grouped).length}</div>
        </div>
      </div>

      {/* Product Cards by Category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{CATEGORY_ICONS[category] || '📦'}</span> {category}s
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {items.map((p) => {
              const isEditing = editingId === (p.id || p.name)
              return (
                <div key={p.id || p.name} className="card" style={{ background: CATEGORY_GRADIENT[category] || 'var(--card-bg)', border: p.is_active ? '1px solid hsl(217 32% 22%)' : '1px solid hsl(0 60% 30% / 0.4)', opacity: p.is_active ? 1 : 0.65 }}>
                  <div className="card-body">
                    {isEditing ? (
                      <div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label">Product Name</label>
                          <input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">Default Rate (₹)</label>
                            <input className="form-input" type="number" value={editForm.default_rate} onChange={e => setEditForm({ ...editForm, default_rate: Number(e.target.value) })} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">GST %</label>
                            <input className="form-input" type="number" value={editForm.gst_rate} onChange={e => setEditForm({ ...editForm, gst_rate: Number(e.target.value) })} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">HSN Code</label>
                            <input className="form-input" value={editForm.hsn_code} onChange={e => setEditForm({ ...editForm, hsn_code: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-input" value={editForm.is_active ? 'active' : 'inactive'} onChange={e => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : '✅ Save'}</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: 'hsl(210 40% 98%)', fontSize: '1rem', marginBottom: '0.25rem' }}>{p.name}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span className="badge badge-muted">{p.category}</span>
                              <span className="badge badge-muted">{p.unit}</span>
                              {p.manual_price && <span className="badge badge-warning">Manual Price</span>}
                            </div>
                          </div>
                          <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ textAlign: 'center', padding: '0.5rem', background: 'hsl(217 32% 10% / 0.5)', borderRadius: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>Rate</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: '800', color: 'hsl(142 71% 55%)' }} className="text-money">
                              {p.default_rate > 0 ? `₹${p.default_rate}` : <span style={{ color: 'hsl(40 90% 60%)' }}>Manual</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0.5rem', background: 'hsl(217 32% 10% / 0.5)', borderRadius: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>GST</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: '800', color: 'hsl(270 60% 70%)' }}>{p.gst_rate}%</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0.5rem', background: 'hsl(217 32% 10% / 0.5)', borderRadius: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>HSN</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(215 20% 70%)' }}>{p.hsn_code}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => startEdit(p)}>✏️ Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(p)}>{p.is_active ? '⏸ Disable' : '▶ Enable'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add Product Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(210 40% 98%)', margin: 0 }}>➕ Add New Product</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" placeholder="e.g. Water Can (20L)" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}>
                    <option>Can</option><option>Packet</option><option>Bottle</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-input" value={addForm.unit} onChange={e => setAddForm({ ...addForm, unit: e.target.value })}>
                    <option value="piece">Piece</option><option value="case">Case</option><option value="pack">Pack</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Default Rate (₹)</label><input className="form-input" type="number" value={addForm.default_rate} onChange={e => setAddForm({ ...addForm, default_rate: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">GST %</label><input className="form-input" type="number" value={addForm.gst_rate} onChange={e => setAddForm({ ...addForm, gst_rate: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">HSN Code</label><input className="form-input" value={addForm.hsn_code} onChange={e => setAddForm({ ...addForm, hsn_code: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid hsl(217 32% 17%)' }}>
                <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveNewProduct} disabled={!addForm.name || saving}>{saving ? 'Saving...' : '✅ Save Product'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
