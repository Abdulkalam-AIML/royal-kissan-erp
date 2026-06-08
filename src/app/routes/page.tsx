'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', area: '', description: '' })
  const supabase = createClient()
  useEffect(() => { loadRoutes() }, [])
  async function loadRoutes() {
    const { data } = await supabase.from('routes').select('*, drivers(name)').order('name')
    setRoutes(data || [])
    setLoading(false)
  }
  async function saveRoute() {
    await supabase.from('routes').insert(form)
    setShowModal(false)
    setForm({ name: '', area: '', description: '' })
    loadRoutes()
  }
  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">🗺️ Route Management</h2><p className="page-subtitle">{routes.length} routes configured</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Route</button>
      </div>
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div> : routes.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}><div style={{ fontSize: '3rem' }}>🗺️</div><p>No routes configured yet.</p></div>
          ) : (
            <table className="erp-table">
              <thead><tr><th>Route Name</th><th>Area</th><th>Driver</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '600', color: 'hsl(210 40% 98%)' }}>{r.name}</td>
                    <td>{r.area ? <span className="badge badge-muted">{r.area}</span> : '—'}</td>
                    <td>{r.drivers?.name || <span style={{ color: 'hsl(215 20% 45%)' }}>Unassigned</span>}</td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td><button className="btn btn-secondary btn-sm">✏️ Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header"><h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(210 40% 98%)', margin: 0 }}>Add Route</h3><button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button></div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group"><label className="form-label">Route Name *</label><input className="form-input" placeholder="e.g. Local Route A" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Area</label><input className="form-input" placeholder="Area covered" value={form.area} onChange={e => setForm({...form, area: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Notes</label><input className="form-input" placeholder="Route notes" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid hsl(217 32% 17%)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveRoute} disabled={!form.name}>✅ Save Route</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
