'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave'

export default function AttendancePage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [selectedDate])

  async function loadData() {
    setLoading(true)
    const [{ data: emps }, { data: att }] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
      supabase.from('attendance').select('*').eq('date', selectedDate),
    ])
    setEmployees(emps || [])
    const attMap: Record<string, AttendanceStatus> = {}
    for (const a of (att || [])) {
      attMap[a.employee_id] = a.status as AttendanceStatus
    }
    setAttendance(attMap)
    setLoading(false)
  }

  function toggleStatus(empId: string, status: AttendanceStatus) {
    setAttendance(prev => ({ ...prev, [empId]: status }))
  }

  async function saveAttendance() {
    setSaving(true)
    const records = employees.map(e => ({
      employee_id: e.id,
      date: selectedDate,
      status: attendance[e.id] || 'absent',
    }))
    await supabase.from('attendance').upsert(records, { onConflict: 'employee_id,date' })
    setSaving(false)
    alert('Attendance saved successfully!')
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount = employees.length - Object.values(attendance).filter(s => s === 'present' || s === 'half_day').length
  const halfCount = Object.values(attendance).filter(s => s === 'half_day').length

  const STATUS_CONFIG = {
    present: { shortLabel: 'P', color: 'hsl(142 71% 45%)', bg: 'hsl(142 71% 45% / 0.15)', border: 'hsl(142 71% 45% / 0.3)', full: 'Present' },
    half_day: { shortLabel: 'H', color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 50% / 0.15)', border: 'hsl(38 92% 50% / 0.3)', full: 'Half Day' },
    absent: { shortLabel: 'A', color: 'hsl(0 85% 60%)', bg: 'hsl(0 85% 60% / 0.15)', border: 'hsl(0 85% 60% / 0.3)', full: 'Absent' },
    leave: { shortLabel: 'L', color: 'hsl(217 91% 60%)', bg: 'hsl(217 91% 60% / 0.15)', border: 'hsl(217 91% 60% / 0.3)', full: 'Leave' },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📅 Attendance</h2>
          <p className="page-subtitle">Mark daily attendance for all employees</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ width: 'auto' }}
          />
          <button onClick={saveAttendance} disabled={saving} className="btn btn-primary">
            {saving ? '⏳ Saving...' : '💾 Save Attendance'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Present', count: presentCount, ...STATUS_CONFIG.present },
          { label: 'Half Day', count: halfCount, ...STATUS_CONFIG.half_day },
          { label: 'Absent', count: absentCount, ...STATUS_CONFIG.absent },
          { label: 'Total', count: employees.length, color: 'hsl(217 91% 60%)', bg: 'hsl(217 91% 60% / 0.15)', border: 'hsl(217 91% 60% / 0.3)', full: 'Total' },
        ].map(s => (
          <div key={s.label} style={{ padding: '1rem 1.25rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '0.875rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Attendance Sheet */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            📋 {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => employees.forEach(e => toggleStatus(e.id, 'present'))} className="btn btn-secondary btn-sm">✅ All Present</button>
            <button onClick={() => employees.forEach(e => toggleStatus(e.id, 'absent'))} className="btn btn-danger btn-sm">❌ All Absent</button>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Mark Attendance</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => {
                  const status = attendance[emp.id] || 'absent'
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <tr key={emp.id}>
                      <td style={{ color: 'hsl(215 20% 45%)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'hsl(210 40% 98%)' }}>{emp.name}</div>
                        {emp.salary > 0 && <div style={{ fontSize: '0.75rem', color: 'hsl(215 20% 45%)' }}>₹{emp.salary.toLocaleString('en-IN')}/mo</div>}
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{emp.role}</span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          borderRadius: '9999px',
                          color: cfg.color,
                          fontSize: '0.875rem',
                          fontWeight: '700',
                        }}>
                          {cfg.full}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => toggleStatus(emp.id, s)}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                border: `2px solid ${status === s ? STATUS_CONFIG[s].color : 'hsl(217 32% 20%)'}`,
                                background: status === s ? STATUS_CONFIG[s].bg : 'transparent',
                                color: status === s ? STATUS_CONFIG[s].color : 'hsl(215 20% 45%)',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {STATUS_CONFIG[s].shortLabel}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
