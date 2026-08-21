'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Check, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function SalaryPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const supabase = createClient()

  useEffect(() => { loadData() }, [selectedMonth, selectedYear])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: emps }, { data: pays }] = await Promise.all([
        supabase.from('employees').select('id, name, role, salary').eq('is_active', true).order('name'),
        supabase.from('salary_payments').select('*').eq('month', selectedMonth).eq('year', selectedYear)
      ])
      setEmployees(emps || [])
      setPayments(pays || [])
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  async function markPaid(emp: any) {
    try {
      await supabase.from('salary_payments').upsert({
        employee_id: emp.id,
        month: selectedMonth,
        year: selectedYear,
        base_salary: emp.salary,
        calculated_salary: emp.salary,
        net_salary: emp.salary,
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'employee_id,month,year' })
      loadData()
    } catch (e: any) {
      alert(`Error marking salary paid: ${e.message}`)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Employee Name',
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
      key: 'status',
      title: 'Payment Status',
      render: (emp) => {
        const pay = payments.find(p => p.employee_id === emp.id)
        const isPaid = pay?.status === 'paid'
        return (
          <Badge variant={isPaid ? 'success' : 'danger'}>
            {isPaid ? 'PAID' : 'PENDING'}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      title: 'Payroll Action',
      align: 'right',
      render: (emp) => {
        const pay = payments.find(p => p.employee_id === emp.id)
        const isPaid = pay?.status === 'paid'
        return (
          <Button
            variant={isPaid ? 'secondary' : 'primary'}
            size="sm"
            disabled={isPaid}
            icon={<Check style={{ width: '14px', height: '14px' }} />}
            onClick={() => markPaid(emp)}
          >
            {isPaid ? 'Paid' : 'Mark Salary Paid'}
          </Button>
        )
      },
    },
  ]

  const totalPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0)
  const paidTotal = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Payroll & Salary Management
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Monthly Payroll: <span className="num" style={{ color: '#fbbf24', fontWeight: 800 }}>{formatCurrency(totalPayroll)}</span> &bull; Paid: <span className="num" style={{ color: '#34d399', fontWeight: 800 }}>{formatCurrency(paidTotal)}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} style={{ marginBottom: 0 }} />
          <Select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))} style={{ marginBottom: 0 }} />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          searchPlaceholder="Search employee name or role..."
          exportFileName={`royal-kissan-payroll-${selectedMonth}-${selectedYear}`}
        />
      )}
    </div>
  )
}
