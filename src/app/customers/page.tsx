'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', area: '', gst_number: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('id, name, address, phone, area, gst_number, outstanding_amount, is_active')
      .order('name')
    setCustomers(data || [])
    setLoading(false)
  }

  async function saveCustomer() {
    setSaving(true)
    await supabase.from('customers').insert(form)
    setShowModal(false)
    setForm({ name: '', phone: '', address: '', area: '', gst_number: '' })
    setSaving(false)
    loadCustomers()
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.area?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 Customers</h2>
          <p className="page-subtitle">{customers.length} total customers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Customer</button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <input className="form-input" placeholder="🔍 Search customers by name, phone, or area..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
              <div style={{ fontSize: '3rem' }}>👥</div>
              <p>No customers found.<br />Add your first customer to get started.</p>
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Area</th>
                  <th>GST No</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: 'hsl(215 20% 45%)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{c.name}</div>
                      {c.address && <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 45%)' }}>{c.address}</div>}
                    </td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.area ? <span className="badge badge-muted">{c.area}</span> : '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)' }}>{c.gst_number || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {c.outstanding_amount > 0
                        ? <span className="due-amount text-money">₹{c.outstanding_amount?.toFixed(2)}</span>
                        : <span style={{ color: 'hsl(142 71% 55%)' }}>₹0.00</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <a href={`/billing?customer=${c.name}`} className="btn btn-secondary btn-sm">🧾 Bill</a>
                        <button className="btn btn-ghost btn-sm">✏️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(210 40% 98%)', margin: 0 }}>Add New Customer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" placeholder="Customer Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Area</label>
                  <input className="form-input" placeholder="Area / Locality" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="Full Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-input" placeholder="GST Registration Number" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid hsl(217 32% 17%)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveCustomer} disabled={!form.name || saving}>
                  {saving ? 'Saving...' : '✅ Save Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
