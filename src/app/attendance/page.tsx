'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarCheck, Save, Check, X, RefreshCw } from 'lucide-react'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

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
    try {
      const [{ data: emps }, { data: att }] = await Promise.all([
        supabase.from('employees').select('id, name, role, salary').eq('is_active', true).order('name'),
        supabase.from('attendance').select('id, employee_id, status, date').eq('date', selectedDate),
      ])
      setEmployees(emps || [])
      const attMap: Record<string, AttendanceStatus> = {}
      for (const a of (att || [])) {
        attMap[a.employee_id] = a.status as AttendanceStatus
      }
      setAttendance(attMap)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  function setStatus(empId: string, status: AttendanceStatus) {
    setAttendance(prev => ({ ...prev, [empId]: status }))
  }

  async function saveAttendance() {
    setSaving(true)
    try {
      const records = employees.map(e => ({
        employee_id: e.id,
        date: selectedDate,
        status: attendance[e.id] || 'present',
      }))
      await supabase.from('attendance').upsert(records, { onConflict: 'employee_id,date' })
      alert('✅ Daily attendance saved!')
    } catch (e: any) {
      alert(`Error saving attendance: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Employee Name & Role',
      sortable: true,
      render: (emp) => (
        <div>
          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{emp.name}</div>
          <Badge variant="neutral" style={{ textTransform: 'uppercase', marginTop: '0.2rem' }}>
            {emp.role || 'staff'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Attendance Status Selector',
      align: 'right',
      render: (emp) => {
        const curStatus = attendance[emp.id] || 'present'
        return (
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
            <Button
              variant={curStatus === 'present' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatus(emp.id, 'present')}
            >
              Present
            </Button>
            <Button
              variant={curStatus === 'half_day' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setStatus(emp.id, 'half_day')}
            >
              Half Day
            </Button>
            <Button
              variant={curStatus === 'absent' ? 'danger' : 'outline'}
              size="sm"
              onClick={() => setStatus(emp.id, 'absent')}
            >
              Absent
            </Button>
          </div>
        )
      },
    },
  ]

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarCheck style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Daily Employee Attendance Register
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {employees.length} active staff &bull; Present: <span style={{ color: '#34d399', fontWeight: 800 }}>{presentCount}</span> | Absent: <span style={{ color: '#f87171', fontWeight: 800 }}>{absentCount}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ marginBottom: 0 }} />
          <Button variant="primary" icon={<Save style={{ width: '16px', height: '16px' }} />} loading={saving} onClick={saveAttendance}>
            Save Daily Register
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          searchPlaceholder="Search employee name..."
          exportFileName={`royal-kissan-attendance-${selectedDate}`}
        />
      )}
    </div>
  )
}
