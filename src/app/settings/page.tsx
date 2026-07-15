'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type AdminSection = 'company' | 'employees' | 'drivers' | 'dealers' | 'routes' | 'system'

export default function AdminMasterControl() {
  const [activeSection, setActiveSection] = useState<AdminSection>('company')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Employees
  const [employees, setEmployees] = useState<any[]>([])
  const [empForm, setEmpForm] = useState({ name: '', role: '', phone: '', salary: '', address: '' })
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [savingEmp, setSavingEmp] = useState(false)

  // Drivers
  const [drivers, setDrivers] = useState<any[]>([])
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', salary: '' })
  const [showDriverForm, setShowDriverForm] = useState(false)
  const [savingDriver, setSavingDriver] = useState(false)

  // Dealers
  const [dealers, setDealers] = useState<any[]>([])
  const [dealerForm, setDealerForm] = useState({ name: '', phone: '', area: '', address: '', credit_limit: '5000' })
  const [showDealerForm, setShowDealerForm] = useState(false)
  const [savingDealer, setSavingDealer] = useState(false)

  // Routes
  const [routes, setRoutes] = useState<any[]>([])
  const [routeForm, setRouteForm] = useState({ name: '', area: '', driver_id: '' })
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [savingRoute, setSavingRoute] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: sData } = await supabase.from('settings').select('key, value')
    const map: Record<string, string> = {}
    for (const s of (sData || [])) map[s.key] = s.value
    setSettings(map)

    const { data: empData } = await supabase.from('employees').select('id, name, role, phone, salary, address, is_active').order('name')
    setEmployees(empData || [])

    const { data: driverData } = await supabase.from('drivers').select('id, name, phone, salary, is_active').order('name')
    setDrivers((driverData || []).filter((d: any) => d.name.toLowerCase().includes('nagaraju') || d.name.toLowerCase().includes('driver-2')))

    const { data: dealerData } = await supabase.from('dealers').select('id, name, phone, area, address, credit_limit, outstanding_amount, is_active').order('name')
    setDealers(dealerData || [])

    const { data: routeData } = await supabase.from('routes').select('id, name, area, driver_id, is_active, drivers(name)').order('name')
    setRoutes(routeData || [])
  }

  async function saveSetting(key: string, value: string) {
    await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaveMsg(`✅ ${key} saved!`)
    setTimeout(() => setSaveMsg(''), 2000)
  }

  async function saveAllCompanySettings() {
    setSaving(true)
    try {
      const fields = ['company_name', 'company_address', 'company_phone', 'company_email', 'company_gst', 'invoice_prefix', 'thermal_printer_width']
      for (const key of fields) {
        if (settings[key] !== undefined) {
          await supabase.from('settings').upsert({ key, value: settings[key] }, { onConflict: 'key' })
        }
      }
      setSaveMsg('✅ All company settings saved!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleAddEmployee() {
    if (!empForm.name) return
    setSavingEmp(true)
    try {
      const { error } = await supabase.from('employees').insert({
        name: empForm.name, role: empForm.role || null,
        phone: empForm.phone || null, salary: Number(empForm.salary) || 0,
        address: empForm.address || null, is_active: true
      })
      if (!error) {
        setEmpForm({ name: '', role: '', phone: '', salary: '', address: '' })
        setShowEmpForm(false)
        loadAll()
      } else { alert(error.message) }
    } finally { setSavingEmp(false) }
  }

  async function handleDeleteEmployee(id: string) {
    if (!confirm('Delete this employee?')) return
    await supabase.from('employees').delete().eq('id', id)
    loadAll()
  }

  async function handleAddDriver() {
    if (!driverForm.name) return
    setSavingDriver(true)
    try {
      const { error } = await supabase.from('drivers').insert({
        name: driverForm.name,
        phone: driverForm.phone || null,
        salary: Number(driverForm.salary) || 0,
        is_active: true
      })
      if (!error) {
        setDriverForm({ name: '', phone: '', salary: '' })
        setShowDriverForm(false)
        loadAll()
      } else { alert(error.message) }
    } finally { setSavingDriver(false) }
  }

  async function handleToggleDriver(id: string, is_active: boolean) {
    await supabase.from('drivers').update({ is_active: !is_active }).eq('id', id)
    loadAll()
  }

  async function handleAddDealer() {
    if (!dealerForm.name) return
    setSavingDealer(true)
    try {
      const { error } = await supabase.from('dealers').insert({
        name: dealerForm.name,
        phone: dealerForm.phone || null,
        area: dealerForm.area || null,
        address: dealerForm.address || null,
        credit_limit: Number(dealerForm.credit_limit) || 5000,
        outstanding_amount: 0,
        is_active: true
      })
      if (!error) {
        setDealerForm({ name: '', phone: '', area: '', address: '', credit_limit: '5000' })
        setShowDealerForm(false)
        loadAll()
      } else { alert(error.message) }
    } finally { setSavingDealer(false) }
  }

  async function handleDeleteDealer(id: string) {
    if (!confirm('Delete this dealer? This will remove all associated records.')) return
    await supabase.from('dealers').delete().eq('id', id)
    loadAll()
  }

  async function handleAddRoute() {
    if (!routeForm.name) return
    setSavingRoute(true)
    try {
      const { error } = await supabase.from('routes').insert({
        name: routeForm.name,
        area: routeForm.area || null,
        driver_id: routeForm.driver_id || null,
        is_active: true
      })
      if (!error) {
        setRouteForm({ name: '', area: '', driver_id: '' })
        setShowRouteForm(false)
        loadAll()
      } else { alert(error.message) }
    } finally { setSavingRoute(false) }
  }

  async function handleDeleteRoute(id: string) {
    if (!confirm('Delete this route?')) return
    await supabase.from('routes').delete().eq('id', id)
    loadAll()
  }

  async function handleBackupDatabase() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { alert('Not authenticated'); return }
    alert('🗄️ To backup your database:\n\n1. Go to Supabase Dashboard → Your Project → Database → Backups\n2. Click "Create Backup" for a full snapshot\n3. Or use "Export Data" from Table Editor for CSV export\n\nYour Supabase project handles automatic daily backups.')
  }

  async function handleResetModule(moduleName: string, label: string) {
    const confirmMsg = `⚠️ This will ARCHIVE all data in the ${label} module and clear the active tables. This is safe, keeps backup data, and can be restored. Do you want to proceed?`;
    if (!confirm(confirmMsg)) return;
    if (!confirm(`FINAL CONFIRMATION: Are you sure you want to archive and reset the ${label} module?`)) return;

    try {
      setSaving(true);
      const { data, error } = await supabase.rpc('archive_and_reset_module', { p_module: moduleName });
      if (error) {
        alert(`❌ Reset failed: ${error.message}`);
      } else {
        alert(`✅ ${label} module successfully archived and reset!`);
        loadAll();
      }
    } catch (e: any) {
      alert(`Error: ${e?.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreModule(moduleName: string, label: string) {
    const confirmMsg = `🔄 This will restore all archived data for the ${label} module back into active tables. Do you want to proceed?`;
    if (!confirm(confirmMsg)) return;

    try {
      setSaving(true);
      const { data, error } = await supabase.rpc('restore_archived_module', { p_module: moduleName });
      if (error) {
        alert(`❌ Restore failed: ${error.message}`);
      } else {
        alert(`✅ ${label} module data successfully restored from archive!`);
        loadAll();
      }
    } catch (e: any) {
      alert(`Error: ${e?.message}`);
    } finally {
      setSaving(false);
    }
  }

  const COMPANY_FIELDS = [
    { key: 'company_name', label: 'Company Name', placeholder: 'ROYAL KISSAN PACKAGED DRINKING WATER', type: 'text' },
    { key: 'company_address', label: 'Address', placeholder: 'Guntur Highway Road, Guntur, AP', type: 'text' },
    { key: 'company_phone', label: 'Phone', placeholder: '81849 18757', type: 'text' },
    { key: 'company_email', label: 'Email', placeholder: 'royalkissan@gmail.com', type: 'email' },
    { key: 'company_gst', label: 'GST Number', placeholder: '37BABS2021G1Z3', type: 'text' },
    { key: 'invoice_prefix', label: 'Invoice Prefix', placeholder: 'RK', type: 'text' },
    { key: 'thermal_printer_width', label: 'Thermal Printer Width (mm)', placeholder: '58', type: 'number' },
  ]

  const NAV_SECTIONS: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'company', label: 'Company Info', icon: '🏢' },
    { id: 'employees', label: 'Employees', icon: '👔' },
    { id: 'drivers', label: 'Drivers', icon: '🚛' },
    { id: 'dealers', label: 'Dealers', icon: '🏪' },
    { id: 'routes', label: 'Routes', icon: '🗺️' },
    { id: 'system', label: 'System Tools', icon: '🔧' },
  ]

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">⚙️ Admin Master Control</h2>
          <p className="page-subtitle">Manage company, employees, drivers, dealers, routes, and system tools</p>
        </div>
        {saveMsg && <span style={{ fontSize: '0.875rem', color: '#34d399', fontWeight: '700' }}>{saveMsg}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
        {/* Left nav */}
        <div className="glass-card-3d" style={{ padding: '0.75rem', height: 'fit-content' }}>
          {NAV_SECTIONS.map(sec => (
            <button key={sec.id} onClick={() => setActiveSection(sec.id)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '0.75rem', background: activeSection === sec.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: activeSection === sec.id ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                color: activeSection === sec.id ? '#93c5fd' : 'hsl(215 20% 65%)', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: activeSection === sec.id ? '700' : '500', transition: 'all 0.15s ease',
                marginBottom: '0.25rem'
              }}>
              <span style={{ fontSize: '1.1rem' }}>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* COMPANY INFO */}
          {activeSection === 'company' && (
            <div className="glass-card-3d" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>🏢 Company Information</h3>
                <button className="btn btn-primary" onClick={saveAllCompanySettings} disabled={saving}>{saving ? 'Saving...' : '💾 Save All'}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {COMPANY_FIELDS.map(field => (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{field.label}</label>
                    <input type={field.type} className="form-input" placeholder={field.placeholder}
                      value={settings[field.key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMPLOYEES */}
          {activeSection === 'employees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">👔 Employee Management</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowEmpForm(!showEmpForm)}>➕ Add Employee</button>
                </div>
                {showEmpForm && (
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.03)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}><label className="form-label">Name *</label><input className="form-input" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} /></div>
                      <div className="form-group" style={{ margin: 0 }}><label className="form-label">Role</label><input className="form-input" placeholder="e.g. Sales Manager" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} /></div>
                      <div className="form-group" style={{ margin: 0 }}><label className="form-label">Phone</label><input className="form-input" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
                      <div className="form-group" style={{ margin: 0 }}><label className="form-label">Salary (₹)</label><input type="number" className="form-input" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} /></div>
                      <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}><label className="form-label">Address</label><input className="form-input" value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleAddEmployee} disabled={savingEmp}>{savingEmp ? 'Saving...' : '💾 Save Employee'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowEmpForm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
                {employees.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>No employees added yet.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="erp-table">
                      <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th style={{ textAlign: 'right' }}>Salary</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
                      <tbody>
                        {employees.map(e => (
                          <tr key={e.id}>
                            <td style={{ fontWeight: '700', color: '#fff' }}>{e.name}</td>
                            <td>{e.role || '—'}</td>
                            <td>{e.phone || '—'}</td>
                            <td style={{ textAlign: 'right' }}>₹{Number(e.salary || 0).toLocaleString('en-IN')}/mo</td>
                            <td style={{ textAlign: 'center' }}><button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.625rem' }} onClick={() => handleDeleteEmployee(e.id)}>🗑️</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DRIVERS */}
          {activeSection === 'drivers' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">🚛 Driver Management</h3>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.125rem 0 0' }}>Active drivers: Nagaraju (Local Route) + Driver-2 (Non-Local Routes)</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDriverForm(!showDriverForm)}>➕ Add Driver</button>
              </div>
              {showDriverForm && (
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Name *</label><input className="form-input" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Phone</label><input className="form-input" value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Salary (₹)</label><input type="number" className="form-input" value={driverForm.salary} onChange={e => setDriverForm({ ...driverForm, salary: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddDriver} disabled={savingDriver}>{savingDriver ? 'Saving...' : '💾 Save Driver'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowDriverForm(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead><tr><th>Name</th><th>Phone</th><th style={{ textAlign: 'right' }}>Salary</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
                  <tbody>
                    {drivers.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{d.name}</td>
                        <td>{d.phone || '—'}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(d.salary || 0).toLocaleString('en-IN')}/mo</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${d.is_active ? 'badge-success' : 'badge-danger'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.625rem', fontSize: '0.7rem' }} onClick={() => handleToggleDriver(d.id, d.is_active)}>
                            {d.is_active ? '⏸ Suspend' : '▶ Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {drivers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(215 20% 45%)' }}>No drivers found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEALERS */}
          {activeSection === 'dealers' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">🏪 Dealer Management</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDealerForm(!showDealerForm)}>➕ Add Dealer</button>
              </div>
              {showDealerForm && (
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Name *</label><input className="form-input" value={dealerForm.name} onChange={e => setDealerForm({ ...dealerForm, name: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Phone</label><input className="form-input" value={dealerForm.phone} onChange={e => setDealerForm({ ...dealerForm, phone: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Area</label><input className="form-input" value={dealerForm.area} onChange={e => setDealerForm({ ...dealerForm, area: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}><label className="form-label">Address</label><input className="form-input" value={dealerForm.address} onChange={e => setDealerForm({ ...dealerForm, address: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Credit Limit (₹)</label><input type="number" className="form-input" value={dealerForm.credit_limit} onChange={e => setDealerForm({ ...dealerForm, credit_limit: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddDealer} disabled={savingDealer}>{savingDealer ? 'Saving...' : '💾 Save Dealer'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowDealerForm(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead><tr><th>Name</th><th>Area</th><th>Phone</th><th style={{ textAlign: 'right' }}>Credit Limit</th><th style={{ textAlign: 'right' }}>Outstanding</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
                  <tbody>
                    {dealers.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{d.name}</td>
                        <td>{d.area || '—'}</td>
                        <td>{d.phone || '—'}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(d.credit_limit || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', color: (d.outstanding_amount || 0) > 0 ? '#f87171' : '#34d399', fontWeight: '700' }}>₹{Number(d.outstanding_amount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'center' }}><button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.625rem' }} onClick={() => handleDeleteDealer(d.id)}>🗑️</button></td>
                      </tr>
                    ))}
                    {dealers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(215 20% 45%)' }}>No dealers found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ROUTES */}
          {activeSection === 'routes' && (
            <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="card-title">🗺️ Route Management</h3>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.125rem 0 0' }}>Local Route → Nagaraju | Non-Local Routes → Driver-2</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowRouteForm(!showRouteForm)}>➕ Add Route</button>
              </div>
              {showRouteForm && (
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Route Name *</label><input className="form-input" value={routeForm.name} onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Area</label><input className="form-input" value={routeForm.area} onChange={e => setRouteForm({ ...routeForm, area: e.target.value })} /></div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Assign Driver</label>
                      <select className="form-input" value={routeForm.driver_id} onChange={e => setRouteForm({ ...routeForm, driver_id: e.target.value })}>
                        <option value="">— No driver —</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddRoute} disabled={savingRoute}>{savingRoute ? 'Saving...' : '💾 Save Route'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowRouteForm(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table className="erp-table">
                  <thead><tr><th>Route Name</th><th>Area</th><th>Driver</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
                  <tbody>
                    {routes.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{r.name}</td>
                        <td>{r.area || '—'}</td>
                        <td>{(Array.isArray(r.drivers) ? r.drivers[0]?.name : (r.drivers as any)?.name) || '—'}</td>
                        <td style={{ textAlign: 'center' }}><span className={`badge ${r.is_active ? 'badge-success' : 'badge-muted'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td style={{ textAlign: 'center' }}><button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.625rem' }} onClick={() => handleDeleteRoute(r.id)}>🗑️</button></td>
                      </tr>
                    ))}
                    {routes.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(215 20% 45%)' }}>No routes found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SYSTEM TOOLS */}
          {activeSection === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-card-3d" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.5rem' }}>🔧 System Utilities</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {[
                    {
                      title: '💾 Backup Database',
                      desc: 'Create a full snapshot of your Supabase database. Includes all sales, bills, dealers, routes, and drivers.',
                      action: handleBackupDatabase,
                      btnLabel: '💾 Open Backup Guide',
                      btnClass: 'btn-secondary',
                    },
                    {
                      title: '📊 Export SQL Migration',
                      desc: 'Open the erp_complete_update.sql file and run it in Supabase SQL Editor to clean duplicates and fix schema.',
                      action: () => alert('Open: /royal-kissan-erp/erp_complete_update.sql\n\nPaste into Supabase → SQL Editor and click Run.'),
                      btnLabel: '📋 View Migration Steps',
                      btnClass: 'btn-secondary',
                    },
                    {
                      title: '🔄 Verify Driver Cleanup',
                      desc: 'Checks that only Nagaraju and Driver-2 exist in the database. Removes Mallaya and duplicates.',
                      action: async () => {
                        const { data } = await supabase.from('drivers').select('id, name').order('name')
                        const names = (data || []).map((d: any) => `• ${d.name}`).join('\n')
                        alert(`Current drivers in DB:\n${names || 'None found'}\n\nIf you see duplicates or Mallaya, run erp_complete_update.sql`)
                      },
                      btnLabel: '✅ Check Drivers',
                      btnClass: 'btn-secondary',
                    }
                  ].map((tool, i) => (
                    <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.875rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem', fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>{tool.title}</h4>
                      <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: 'hsl(215 20% 55%)', lineHeight: 1.5 }}>{tool.desc}</p>
                      <button className={`btn ${tool.btnClass} btn-sm`} onClick={tool.action}>{tool.btnLabel}</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DANGER ZONE: ARCHIVING & RESET SYSTEM */}
              <div className="glass-card-3d" style={{ padding: '2rem', border: '1px solid hsl(0 85% 60% / 0.3)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f87171', marginBottom: '0.25rem' }}>⚠️ System Reset & Archiving Control Panel</h3>
                <p style={{ fontSize: '0.8rem', color: 'hsl(215 20% 55%)', marginBottom: '1.5rem' }}>
                  Archiving moves active module records to historical backup tables. All active records can be restored from the archive at any time.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { id: 'sales', label: 'Sales & Billing Module', desc: 'Archives active sales, items, bills, and route records.' },
                    { id: 'payments', label: 'Payments & Collections Module', desc: 'Archives payments, customer dues, and collections.' },
                    { id: 'expenses', label: 'Expenses Module', desc: 'Archives factory, transport, and route expenses.' },
                    { id: 'attendance', label: 'Attendance & Salaries Module', desc: 'Archives employee attendance and salary payouts.' }
                  ].map(mod => (
                    <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: '700', color: '#fff', fontSize: '0.875rem' }}>{mod.label}</h4>
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'hsl(215 20% 50%)' }}>{mod.desc}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleResetModule(mod.id, mod.label)}>
                          📥 Archive & Reset
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRestoreModule(mod.id, mod.label)}>
                          📤 Restore Data
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
