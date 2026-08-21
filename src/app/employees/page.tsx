'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCheck, Plus, Phone, Calendar, DollarSign, X, Shield, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

const ROLES = ['worker', 'driver', 'operator', 'manager', 'marketing']

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'worker', phone: '', salary: 12000 })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    setLoading(true)
    try {
      const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
      setEmployees(data || [])
    } catch {
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  async function saveEmployee() {
    if (!form.name.trim()) {
      alert('Employee name is required')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('employees').insert([{ ...form, is_active: true }])
      if (error) throw error
      setShowModal(false)
      setForm({ name: '', role: 'worker', phone: '', salary: 12000 })
      loadEmployees()
    } catch (e: any) {
      alert(`Error saving employee: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Employee Name',
      sortable: true,
      render: (emp) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fbbf24',
              color: '#000',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
            }}
          >
            {(emp.name || 'E')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{emp.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>ID: {emp.employee_code || `EMP-${emp.id.slice(0, 4)}`}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role Designation',
      sortable: true,
      render: (emp) => (
        <Badge variant={emp.role === 'manager' ? 'info' : emp.role === 'driver' ? 'warning' : 'neutral'}>
          {(emp.role || 'staff').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'phone',
      title: 'Phone Number',
      render: (emp) => (
        <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{emp.phone || '—'}</span>
      ),
    },
    {
      key: 'salary',
      title: 'Monthly Salary (₹)',
      align: 'right',
      sortable: true,
      render: (emp) => (
        <span className="num" style={{ fontWeight: 800, color: '#fbbf24' }}>
          {formatCurrency(Number(emp.salary) || 0)}
        </span>
      ),
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (emp) => (
        <Badge variant={emp.is_active !== false ? 'success' : 'danger'}>
          {emp.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Employee Management Directory
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {employees.length} active staff accounts &bull; Monthly Base Payroll: {' '}
            <span className="num" style={{ color: '#fbbf24', fontWeight: 800 }}>
              {formatCurrency(totalMonthlyPayroll)}
            </span>
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowModal(true)}>
          Add New Employee
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          searchPlaceholder="Search employees by name, role, phone..."
          exportFileName="royal-kissan-employees"
        />
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Add New Employee Account</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Full Name" placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Select label="Role Designation" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={ROLES.map(r => ({ value: r, label: r.toUpperCase() }))} />
              <Input label="Phone Number" placeholder="10-digit mobile" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input label="Base Monthly Salary (₹)" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveEmployee}>Create Account</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
