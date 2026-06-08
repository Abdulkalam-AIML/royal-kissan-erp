'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROLE_COLORS: Record<string, string> = { 
  manager: 'badge-info', 
  worker: 'badge-muted', 
  driver: 'badge-success', 
  operator: 'badge-warning', 
  marketing: 'badge-info' 
}

const ROLE_ICONS: Record<string, string>  = { 
  manager: '👩‍💼', 
  worker: '👷', 
  driver: '🚛', 
  operator: '⚙️', 
  marketing: '📢' 
}

const ROLE_GRADIENT: Record<string, string> = {
  manager:   'linear-gradient(135deg, hsl(217 91% 40%), hsl(270 75% 50%))',
  worker:    'linear-gradient(135deg, hsl(217 32% 20%), hsl(217 32% 12%))',
  driver:    'linear-gradient(135deg, hsl(142 60% 30%), hsl(142 60% 15%))',
  operator:  'linear-gradient(135deg, hsl(35 80% 35%), hsl(35 80% 20%))',
  marketing: 'linear-gradient(135deg, hsl(199 89% 35%), hsl(199 89% 20%))',
}

function generateBabsId(index: number): string {
  return `BABS2021${String(index).padStart(2, '0')}`
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'salary'>('overview')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [form, setForm] = useState({ name: '', role: 'worker', phone: '', salary: 0 })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { 
    loadEmployees() 
  }, [])

  async function loadEmployees() {
    try {
      const { data } = await supabase.from('employees').select('*').order('created_at')
      setEmployees(data || [])
    } catch { 
      setEmployees([]) 
    }
    setLoading(false)
  }

  async function saveEmployee() {
    setSaving(true)
    try {
      const { error } = await supabase.from('employees').insert({
        name: form.name,
        role: form.role,
        phone: form.phone,
        salary: form.salary,
        is_active: true,
      })
      if (!error) {
        setShowModal(false)
        setForm({ name: '', role: 'worker', phone: '', salary: 0 })
        loadEmployees()
      } else {
        alert(error.message)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    }
    setSaving(false)
  }

  function openProfile(emp: any) {
    setSelectedEmployee(emp)
    setProfileTab('overview')
    setShowProfile(true)
  }

  // Assign BABS IDs based on order (use stored employee_code or fallback to index)
  const employeesWithIds = employees.map((e, i) => ({
    ...e,
    babs_id: e.employee_code || generateBabsId(i + 1),
  }))

  const filtered = employeesWithIds.filter(e =>
    (filterRole === 'all' || e.role === filterRole) &&
    (e.name?.toLowerCase().includes(search.toLowerCase()) || 
     e.role?.toLowerCase().includes(search.toLowerCase()) || 
     e.babs_id?.toLowerCase().includes(search.toLowerCase()))
  )
  
  const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0)

  const roleCounts = ['manager', 'worker', 'driver', 'operator', 'marketing'].map(role => ({
    role, 
    icon: ROLE_ICONS[role], 
    count: employees.filter(e => e.role === role).length
  }))

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">👔 Employee Management</h2>
          <p className="page-subtitle">{employees.length} registered employees · Monthly Payroll: <span style={{ color: '#34d399', fontWeight: '800' }}>₹{totalSalary.toLocaleString('en-IN')}</span></p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Register Employee
        </button>
      </div>

      {/* ROLE DISTRIBUTION KPI BOARD */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {roleCounts.map(({ role, icon, count }) => (
          <div 
            key={role} 
            className="stat-card" 
            style={{ 
              cursor: 'pointer', 
              borderColor: filterRole === role ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255,255,255,0.06)',
              background: filterRole === role ? 'rgba(59, 130, 246, 0.05)' : undefined 
            }} 
            onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.75rem' }}>{icon}</span>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'hsl(215 20% 60%)', textTransform: 'uppercase', marginBottom: '0.125rem' }}>{role}s</p>
                <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: 0 }}>{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH CARD */}
      <div className="glass-card-3d" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <input 
          className="form-input" 
          placeholder="🔍 Search employee name, role, or BABS ID..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* EMPLOYEE CARDS GRID */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((emp) => (
            <div 
              key={emp.id} 
              className="glass-card-3d" 
              style={{ cursor: 'pointer', padding: '1.5rem' }}
              onClick={() => openProfile(emp)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '14px', 
                  background: ROLE_GRADIENT[emp.role] || 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '1.5rem', 
                  flexShrink: 0 
                }}>
                  {ROLE_ICONS[emp.role] || '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', color: '#fff', fontSize: '1.1rem', marginBottom: '0.125rem' }}>{emp.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '700', fontFamily: 'monospace' }}>{emp.babs_id}</div>
                </div>
                <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-danger'}`}>{emp.is_active ? 'Active' : 'Off'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.625rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Role</div>
                  <span className={`badge ${ROLE_COLORS[emp.role] || 'badge-muted'}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>{emp.role}</span>
                </div>
                <div style={{ padding: '0.625rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'hsl(215 20% 55%)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Salary</div>
                  <div style={{ fontSize: '0.925rem', fontWeight: '800', color: '#34d399' }} className="text-money">
                    {emp.salary > 0 ? `₹${emp.salary.toLocaleString('en-IN')}` : <span style={{ color: 'hsl(215 20% 45%)' }}>TBD</span>}
                  </div>
                </div>
              </div>

              {emp.phone && (
                <div style={{ fontSize: '0.8125rem', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '0.375rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                  <span>📞</span> {emp.phone}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'hsl(215 20% 45%)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}>No employees found.</div>
          )}
        </div>
      )}

      {/* EMPLOYEE DETAIL PROFILE MODAL */}
      {showProfile && selectedEmployee && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowProfile(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: ROLE_GRADIENT[selectedEmployee.role] || 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  {ROLE_ICONS[selectedEmployee.role] || '👤'}
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: '#fff', fontSize: '1.2rem' }}>{selectedEmployee.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontFamily: 'monospace', fontWeight: '700' }}>{selectedEmployee.babs_id}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                {(['overview', 'attendance', 'salary'] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setProfileTab(tab)} 
                    className={profileTab === tab ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} 
                    style={{ textTransform: 'capitalize', fontWeight: '700' }}
                  >
                    {tab === 'overview' ? '👤 Overview' : tab === 'attendance' ? '📅 Attendance' : '💳 Salary'}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {profileTab === 'overview' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Employee ID', val: selectedEmployee.babs_id, mono: true },
                      { label: 'Role Assigned', val: selectedEmployee.role },
                      { label: 'Base Salary', val: selectedEmployee.salary > 0 ? `₹${selectedEmployee.salary.toLocaleString('en-IN')}` : 'TBD' },
                      { label: 'Mobile Phone', val: selectedEmployee.phone || '—' },
                      { label: 'Status', val: selectedEmployee.is_active ? 'Active on payroll' : 'Off-duty' },
                      { label: 'Date Joined', val: selectedEmployee.join_date || selectedEmployee.date_joined || selectedEmployee.created_at?.split('T')[0] || '—' },
                    ].map(({ label, val, mono }) => (
                      <div key={label} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontWeight: '700', color: '#fff', fontFamily: mono ? 'monospace' : undefined, textTransform: 'capitalize' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                    <a href={`/attendance?employee=${selectedEmployee.id}`} className="btn btn-secondary" style={{ flex: 1 }}>📅 View Attendance Logs</a>
                    <a href={`/salary?employee=${selectedEmployee.id}`} className="btn btn-secondary" style={{ flex: 1 }}>💳 Open Salary Ledger</a>
                  </div>
                </div>
              )}

              {/* ATTENDANCE TAB */}
              {profileTab === 'attendance' && (
                <div className="animate-fade-in">
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
                    <h4 style={{ margin: 0, fontWeight: '700', color: '#fff' }}>Calendar Logs</h4>
                    <p style={{ margin: '0.25rem 0 1.25rem' }}>View complete attendance calendar sheet</p>
                    <a href={`/attendance?employee=${selectedEmployee.id}`} className="btn btn-primary">Open Attendance Board</a>
                  </div>
                </div>
              )}

              {/* SALARY TAB */}
              {profileTab === 'salary' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Base Salary', val: `₹${(selectedEmployee.salary || 0).toLocaleString('en-IN')}`, color: '#34d399' },
                      { label: 'Advance Cash', val: `₹${(selectedEmployee.advance_amount || 0).toLocaleString('en-IN')}`, color: '#f87171' },
                      { label: 'Bonus / Bata', val: `₹${(selectedEmployee.bonus_amount || 0).toLocaleString('en-IN')}`, color: '#fbbf24' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 55%)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{label}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color }} className="text-money">{val}</div>
                      </div>
                    ))}
                  </div>
                  <a href={`/salary?employee=${selectedEmployee.id}`} className="btn btn-primary" style={{ width: '100%' }}>💳 Generate Salary slips & Pay slips</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW EMPLOYEE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#fff', margin: 0 }}>Register New Employee</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Employee Name *</label>
                <input className="form-input" placeholder="First Name & Last Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Role Category</label>
                  <select className="form-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                    <option value="driver">Driver</option>
                    <option value="operator">Operator</option>
                    <option value="marketing">Marketing Representative</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Salary (₹/month)</label>
                  <input className="form-input" type="number" placeholder="15000" value={form.salary || ''} onChange={e => setForm({...form, salary: Number(e.target.value)})} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Mobile</label>
                <input className="form-input" placeholder="Phone mobile" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEmployee} disabled={!form.name || saving}>
                  {saving ? 'Registering...' : '💾 Register Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
