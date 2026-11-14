'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import {
  CalendarCheck,
  Save,
  Check,
  X,
  RefreshCw,
  Clock,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  Filter,
  Search,
  Eye,
  Award
} from 'lucide-react'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  saveDailyAttendance,
  getDailyAttendance,
  getMonthlyAttendance,
  DailyAttendanceEntry
} from '@/lib/services/employee-service'
import { AttendanceStatus, Employee } from '@/lib/types/database'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface RowAttendanceState {
  status: AttendanceStatus
  check_in_time: string
  check_out_time: string
  working_hours: number
  remarks: string
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly_summary'>('daily')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceState, setAttendanceState] = useState<Record<string, RowAttendanceState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Monthly summary tab states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<Employee | null>(null)

  const supabase = createClient()

  useDataSyncListener(['employees', 'attendance'], () => {
    loadData()
    if (activeTab === 'monthly_summary') loadMonthly()
  })

  useEffect(() => {
    loadData()
  }, [selectedDate])

  useEffect(() => {
    if (activeTab === 'monthly_summary') {
      loadMonthly()
    }
  }, [activeTab, selectedMonth, selectedYear])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: emps }, attMap] = await Promise.all([
        supabase.from('employees').select('*').eq('is_active', true).order('name'),
        getDailyAttendance(selectedDate)
      ])

      const empList = (emps || []) as Employee[]
      setEmployees(empList)

      const stateMap: Record<string, RowAttendanceState> = {}
      for (const e of empList) {
        const existing = attMap[e.id]
        if (existing) {
          stateMap[e.id] = {
            status: existing.status,
            check_in_time: existing.check_in_time ? String(existing.check_in_time).slice(0, 5) : '08:30',
            check_out_time: existing.check_out_time ? String(existing.check_out_time).slice(0, 5) : '17:30',
            working_hours: Number(existing.working_hours ?? (existing.status === 'present' ? 8 : existing.status === 'half_day' ? 4 : 0)),
            remarks: existing.remarks || existing.notes || ''
          }
        } else {
          // Default initial state
          stateMap[e.id] = {
            status: 'present',
            check_in_time: '08:30',
            check_out_time: '17:30',
            working_hours: 8,
            remarks: ''
          }
        }
      }
      setAttendanceState(stateMap)
    } catch (err) {
      console.warn('Error loading attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMonthly() {
    setLoadingMonthly(true)
    try {
      const records = await getMonthlyAttendance(selectedYear, selectedMonth)
      setMonthlyRecords(records)
    } catch (err) {
      console.warn('Error loading monthly attendance:', err)
    } finally {
      setLoadingMonthly(false)
    }
  }

  const updateRowState = (empId: string, updates: Partial<RowAttendanceState>) => {
    setAttendanceState(prev => {
      const current = prev[empId] || {
        status: 'present',
        check_in_time: '08:30',
        check_out_time: '17:30',
        working_hours: 8,
        remarks: ''
      }
      const next = { ...current, ...updates }

      // Auto update working hours if status changed
      if (updates.status && updates.working_hours === undefined) {
        if (updates.status === 'present') next.working_hours = 8
        else if (updates.status === 'half_day') next.working_hours = 4
        else next.working_hours = 0
      }

      return { ...prev, [empId]: next }
    })
  }

  const handleMarkAll = (status: AttendanceStatus) => {
    setAttendanceState(prev => {
      const next = { ...prev }
      for (const e of employees) {
        next[e.id] = {
          ...next[e.id],
          status,
          working_hours: status === 'present' ? 8 : status === 'half_day' ? 4 : 0
        }
      }
      return next
    })
  }

  async function handleSaveAttendance() {
    setSaving(true)
    try {
      const entries: DailyAttendanceEntry[] = employees.map(e => {
        const st = attendanceState[e.id] || {
          status: 'present',
          check_in_time: '08:30',
          check_out_time: '17:30',
          working_hours: 8,
          remarks: ''
        }
        return {
          employee_id: e.id,
          date: selectedDate,
          status: st.status,
          check_in_time: st.status === 'present' || st.status === 'half_day' ? st.check_in_time : null,
          check_out_time: st.status === 'present' || st.status === 'half_day' ? st.check_out_time : null,
          working_hours: st.working_hours,
          remarks: st.remarks
        }
      })

      const res = await saveDailyAttendance(entries)
      if (res.success) {
        alert(`✅ Daily attendance saved successfully for ${selectedDate}!`)
        emitDataChange('attendance')
        emitDataChange('employees')
      } else {
        alert(`❌ Failed to save: ${res.message}`)
      }
    } catch (e: any) {
      alert(`Error saving attendance: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Daily Stats calculations
  const presentCount = Object.values(attendanceState).filter(s => s.status === 'present').length
  const halfDayCount = Object.values(attendanceState).filter(s => s.status === 'half_day').length
  const absentCount = Object.values(attendanceState).filter(s => s.status === 'absent').length
  const leaveCount = Object.values(attendanceState).filter(s => s.status === 'leave').length
  const weeklyOffCount = Object.values(attendanceState).filter(s => s.status === 'weekly_off').length

  const filteredEmployees = employees.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.role?.toLowerCase().includes(search.toLowerCase())
  )

  // Compute monthly metrics per employee
  const monthlyMetrics = employees.map(emp => {
    const empRecords = monthlyRecords.filter(r => r.employee_id === emp.id)
    const p = empRecords.filter(r => r.status === 'present').length
    const h = empRecords.filter(r => r.status === 'half_day').length
    const a = empRecords.filter(r => r.status === 'absent').length
    const l = empRecords.filter(r => r.status === 'leave').length
    const w = empRecords.filter(r => r.status === 'weekly_off').length
    const totalDaysRecorded = empRecords.length
    const effectivePresent = p + (h * 0.5)

    return {
      employee: emp,
      presentDays: p,
      halfDays: h,
      absentDays: a,
      leaveDays: l,
      weeklyOffDays: w,
      totalRecorded: totalDaysRecorded,
      effectivePresent,
      records: empRecords
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <CalendarCheck style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Employee Daily Attendance &amp; Timesheets
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0.2rem 0 0 0' }}>
                Daily biometric &amp; manual attendance tracking with working hours, check-in times &amp; monthly attendance roll.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls & Primary Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeTab === 'daily' ? '#fbbf24' : 'transparent',
                color: activeTab === 'daily' ? '#000' : '#a1a1aa',
                transition: 'all 120ms'
              }}
            >
              Daily Register
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monthly_summary')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeTab === 'monthly_summary' ? '#fbbf24' : 'transparent',
                color: activeTab === 'monthly_summary' ? '#000' : '#a1a1aa',
                transition: 'all 120ms'
              }}
            >
              Monthly Summary &amp; Roll
            </button>
          </div>

          {activeTab === 'daily' && (
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSaveAttendance}
              icon={<Save style={{ width: '16px', height: '16px' }} />}
            >
              Save Daily Attendance
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      {activeTab === 'daily' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Total Active Staff</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>{employees.length}</div>
          </Card>

          <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Present Today</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>{presentCount}</div>
          </Card>

          <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Half Day</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>{halfDayCount}</div>
          </Card>

          <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Absent</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f87171', marginTop: '0.2rem' }}>{absentCount}</div>
          </Card>

          <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>On Leave</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#60a5fa', marginTop: '0.2rem' }}>{leaveCount}</div>
          </Card>

          <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(161, 161, 170, 0.3)' }}>
            <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Weekly Off</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a1a1aa', marginTop: '0.2rem' }}>{weeklyOffCount}</div>
          </Card>
        </div>
      )}

      {/* TAB 1: DAILY REGISTER */}
      {activeTab === 'daily' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            {/* Date Picker & Quick Jump */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.25rem' }}>
                  ATTENDANCE DATE
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{
                    backgroundColor: '#1f1f23',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                >
                  Today
                </Button>
              </div>
            </div>

            {/* Quick Bulk Action Buttons & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Input
                placeholder="Search staff by name or role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '240px', marginBottom: 0 }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#71717a', marginRight: '0.25rem' }}>Bulk:</span>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')}>All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll('weekly_off')}>Weekly Off</Button>
              </div>
            </div>
          </div>

          {/* Attendance Daily Entry Table */}
          {loading ? (
            <SkeletonTable rows={6} />
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Employee Name &amp; Role</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-In</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-Out</th>
                    <th style={{ padding: '0.75rem 1rem', width: '100px' }}>Hours</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>
                        No employees found matching &quot;{search}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const cur = attendanceState[emp.id] || {
                        status: 'present',
                        check_in_time: '08:30',
                        check_out_time: '17:30',
                        working_hours: 8,
                        remarks: ''
                      }

                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          {/* Name & Role */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{emp.name}</div>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.2rem' }}>
                              <Badge variant="neutral" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                                {emp.role || 'staff'}
                              </Badge>
                              {emp.employee_code && (
                                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>{emp.employee_code}</span>
                              )}
                            </div>
                          </td>

                          {/* Status Action Buttons */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {(['present', 'half_day', 'absent', 'leave', 'weekly_off'] as AttendanceStatus[]).map(st => {
                                const isSelected = cur.status === st
                                let activeBg = '#10b981'
                                let activeColor = '#fff'
                                if (st === 'half_day') { activeBg = '#fbbf24'; activeColor = '#000' }
                                if (st === 'absent') { activeBg = '#ef4444'; activeColor = '#fff' }
                                if (st === 'leave') { activeBg = '#3b82f6'; activeColor = '#fff' }
                                if (st === 'weekly_off') { activeBg = '#71717a'; activeColor = '#fff' }

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => updateRowState(emp.id, { status: st })}
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      borderRadius: '5px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                      backgroundColor: isSelected ? activeBg : 'transparent',
                                      color: isSelected ? activeColor : '#a1a1aa',
                                      cursor: 'pointer',
                                      textTransform: 'uppercase',
                                      transition: 'all 100ms'
                                    }}
                                  >
                                    {st.replace('_', ' ')}
                                  </button>
                                )
                              })}
                            </div>
                          </td>

                          {/* Check In Time */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <input
                              type="time"
                              disabled={cur.status === 'absent' || cur.status === 'leave' || cur.status === 'weekly_off'}
                              value={cur.check_in_time}
                              onChange={e => updateRowState(emp.id, { check_in_time: e.target.value })}
                              style={{
                                backgroundColor: '#18181b',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '5px',
                                color: '#fff',
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.8rem',
                                outline: 'none',
                                opacity: cur.status === 'absent' || cur.status === 'leave' ? 0.3 : 1
                              }}
                            />
                          </td>

                          {/* Check Out Time */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <input
                              type="time"
                              disabled={cur.status === 'absent' || cur.status === 'leave' || cur.status === 'weekly_off'}
                              value={cur.check_out_time}
                              onChange={e => updateRowState(emp.id, { check_out_time: e.target.value })}
                              style={{
                                backgroundColor: '#18181b',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '5px',
                                color: '#fff',
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.8rem',
                                outline: 'none',
                                opacity: cur.status === 'absent' || cur.status === 'leave' ? 0.3 : 1
                              }}
                            />
                          </td>

                          {/* Working Hours */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={cur.working_hours}
                              onChange={e => updateRowState(emp.id, { working_hours: Number(e.target.value) })}
                              style={{
                                width: '60px',
                                backgroundColor: '#18181b',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '5px',
                                color: '#fbbf24',
                                fontWeight: 700,
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.82rem',
                                textAlign: 'center',
                                outline: 'none'
                              }}
                            />
                          </td>

                          {/* Remarks */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <input
                              type="text"
                              placeholder="e.g. Late by 15m, on-site route"
                              value={cur.remarks}
                              onChange={e => updateRowState(emp.id, { remarks: e.target.value })}
                              style={{
                                width: '100%',
                                backgroundColor: '#18181b',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '5px',
                                color: '#fff',
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.8rem',
                                outline: 'none'
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: MONTHLY SUMMARY & ROLL */}
      {activeTab === 'monthly_summary' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Monthly Attendance Muster Roll
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#a1a1aa', margin: '0.2rem 0 0 0' }}>
                Summary of days worked, leaves taken, and effective days for monthly payroll calculation.
              </p>
            </div>

            {/* Month & Year Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{
                  backgroundColor: '#1f1f23',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                style={{
                  backgroundColor: '#1f1f23',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw style={{ width: '14px', height: '14px' }} />}
                onClick={loadMonthly}
              >
                Refresh
              </Button>
            </div>
          </div>

          {loadingMonthly ? (
            <SkeletonTable rows={6} />
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Employee Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Present</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Half Days</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Absent</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Leave</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Weekly Off</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Effective Present</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyMetrics.map(m => (
                    <tr key={m.employee.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{m.employee.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{m.employee.role?.toUpperCase() || 'STAFF'}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <Badge variant="success">{m.presentDays} Days</Badge>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <Badge variant="warning">{m.halfDays} Days</Badge>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <Badge variant={m.absentDays > 0 ? 'danger' : 'neutral'}>{m.absentDays} Days</Badge>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <Badge variant={m.leaveDays > 0 ? 'info' : 'neutral'}>{m.leaveDays} Days</Badge>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ color: '#a1a1aa' }}>{m.weeklyOffDays} Days</span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 900, color: '#fbbf24', fontSize: '0.95rem' }}>
                        {m.effectivePresent.toFixed(1)} Days
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye style={{ width: '13px', height: '13px' }} />}
                          onClick={() => setSelectedEmployeeForDetail(m.employee)}
                        >
                          View Log
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Individual Detailed Attendance Log Modal */}
          {selectedEmployeeForDetail && (
            <div className="modal-overlay" style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}>
              <div style={{
                backgroundColor: '#18181b',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '650px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '1.25rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                      {selectedEmployeeForDetail.name} &mdash; Attendance Log
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#a1a1aa' }}>
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEmployeeForDetail(null)}
                    style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
                  >
                    <X style={{ width: '20px', height: '20px' }} />
                  </button>
                </div>

                <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
                  {monthlyRecords.filter(r => r.employee_id === selectedEmployeeForDetail.id).length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>
                      No attendance entries recorded for this month.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Date</th>
                          <th style={{ padding: '0.5rem' }}>Status</th>
                          <th style={{ padding: '0.5rem' }}>Check In</th>
                          <th style={{ padding: '0.5rem' }}>Check Out</th>
                          <th style={{ padding: '0.5rem' }}>Hours</th>
                          <th style={{ padding: '0.5rem' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyRecords
                          .filter(r => r.employee_id === selectedEmployeeForDetail.id)
                          .map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f4f4f5' }}>{r.date}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <Badge variant={r.status === 'present' ? 'success' : r.status === 'half_day' ? 'warning' : 'danger'}>
                                  {r.status?.toUpperCase()}
                                </Badge>
                              </td>
                              <td style={{ padding: '0.5rem', color: '#d4d4d8' }}>{r.check_in_time || '—'}</td>
                              <td style={{ padding: '0.5rem', color: '#d4d4d8' }}>{r.check_out_time || '—'}</td>
                              <td style={{ padding: '0.5rem', color: '#fbbf24', fontWeight: 700 }}>{r.working_hours ?? '—'}</td>
                              <td style={{ padding: '0.5rem', color: '#a1a1aa' }}>{r.remarks || r.notes || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedEmployeeForDetail(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
