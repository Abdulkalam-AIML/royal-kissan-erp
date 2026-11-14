'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import {
  UserCheck,
  Plus,
  Phone,
  Calendar,
  DollarSign,
  X,
  Shield,
  Eye,
  CreditCard,
  Printer,
  FileText,
  Clock,
  TrendingDown,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  recordEmployeeAdvance,
  getEmployeeAdvances,
  getEmployee360Profile,
  getEmployeeDashboardStats,
  EmployeeProfileData,
  EmployeeDashboardStats
} from '@/lib/services/employee-service'
import { Employee, EmployeeAdvance } from '@/lib/types/database'

const ROLES = ['worker', 'driver', 'operator', 'manager', 'marketing', 'accountant', 'supervisor']

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'advances'>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([])
  const [dashboardStats, setDashboardStats] = useState<EmployeeDashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    halfDayToday: 0,
    totalAdvancesOutstanding: 0,
    monthlySalaryPayable: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [selectedEmployeeForAdvance, setSelectedEmployeeForAdvance] = useState<Employee | null>(null)
  const [selectedProfileEmployeeId, setSelectedProfileEmployeeId] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<EmployeeProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [printableAdvance, setPrintableAdvance] = useState<any | null>(null)

  // Forms
  const [empForm, setEmpForm] = useState({
    name: '',
    role: 'worker',
    phone: '',
    salary: 12000,
    address: '',
    bank_name: '',
    bank_account: '',
    ifsc_code: '',
    employee_code: ''
  })
  const [savingEmp, setSavingEmp] = useState(false)

  const [advForm, setAdvForm] = useState({
    employee_id: '',
    advance_amount: 3000,
    advance_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
    reference_number: '',
    remarks: 'Salary Advance'
  })
  const [savingAdv, setSavingAdv] = useState(false)

  const supabase = createClient()

  useDataSyncListener(['employees', 'attendance', 'salary'], () => {
    loadAllData()
  })

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    try {
      const [
        { data: emps },
        advsList,
        stats
      ] = await Promise.all([
        supabase.from('employees').select('*').order('created_at', { ascending: false }),
        getEmployeeAdvances(),
        getEmployeeDashboardStats()
      ])

      setEmployees((emps || []) as Employee[])
      setAdvances(advsList)
      setDashboardStats(stats)
    } catch (err) {
      console.warn('Error loading employee directory:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load 360 profile
  async function handleOpenProfile(empId: string) {
    setSelectedProfileEmployeeId(empId)
    setLoadingProfile(true)
    try {
      const prof = await getEmployee360Profile(empId)
      setProfileData(prof)
    } catch (e) {
      console.warn('Error loading employee profile:', e)
    } finally {
      setLoadingProfile(false)
    }
  }

  // Save new employee
  async function handleSaveEmployee() {
    if (!empForm.name.trim()) {
      alert('Employee full name is required.')
      return
    }
    setSavingEmp(true)
    try {
      const code = empForm.employee_code.trim() || `RK-${new Date().getFullYear().toString().slice(-2)}${Math.floor(100 + Math.random() * 900)}`
      const { error } = await supabase.from('employees').insert([{
        name: empForm.name.trim(),
        role: empForm.role,
        phone: empForm.phone.trim() || null,
        salary: Number(empForm.salary) || 0,
        address: empForm.address.trim() || null,
        bank_name: empForm.bank_name.trim() || null,
        bank_account: empForm.bank_account.trim() || null,
        ifsc_code: empForm.ifsc_code.trim() || null,
        employee_code: code,
        is_active: true,
        advance_amount: 0
      }])

      if (error) throw error
      setShowAddEmployeeModal(false)
      setEmpForm({
        name: '',
        role: 'worker',
        phone: '',
        salary: 12000,
        address: '',
        bank_name: '',
        bank_account: '',
        ifsc_code: '',
        employee_code: ''
      })
      emitDataChange('employees')
      loadAllData()
      alert('✅ Employee profile created successfully!')
    } catch (e: any) {
      alert(`Error saving employee: ${e.message}`)
    } finally {
      setSavingEmp(false)
    }
  }

  // Open advance modal for specific employee
  const handleInitiateAdvance = (emp?: Employee) => {
    if (emp) {
      setSelectedEmployeeForAdvance(emp)
      setAdvForm(prev => ({
        ...prev,
        employee_id: emp.id,
        remarks: `Salary Advance for ${emp.name}`
      }))
    } else {
      setSelectedEmployeeForAdvance(null)
      setAdvForm(prev => ({
        ...prev,
        employee_id: employees[0]?.id || '',
        remarks: 'Salary Advance'
      }))
    }
    setShowAdvanceModal(true)
  }

  // Record employee advance
  async function handleRecordAdvance() {
    if (!advForm.employee_id) {
      alert('Please select an employee.')
      return
    }
    if (advForm.advance_amount <= 0) {
      alert('Please enter a valid positive advance amount.')
      return
    }

    setSavingAdv(true)
    try {
      const res = await recordEmployeeAdvance({
        employee_id: advForm.employee_id,
        advance_amount: Number(advForm.advance_amount),
        advance_date: advForm.advance_date,
        payment_method: advForm.payment_method,
        reference_number: advForm.reference_number || null,
        remarks: advForm.remarks || null,
        recorded_by: 'Operations Admin'
      })

      if (res.success) {
        setShowAdvanceModal(false)
        const emp = employees.find(e => e.id === advForm.employee_id)
        setPrintableAdvance({
          ...res.advance,
          employee_name: emp?.name || 'Employee',
          role: emp?.role || 'Staff',
          salary: emp?.salary || 0,
          date: advForm.advance_date,
          amount: advForm.advance_amount,
          mode: advForm.payment_method,
          reference: advForm.reference_number || 'ADV-' + Date.now().toString().slice(-6),
          remarks: advForm.remarks
        })
        emitDataChange('employees')
        loadAllData()
      } else {
        alert(`❌ Failed to record advance: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setSavingAdv(false)
    }
  }

  // Print advance voucher receipt
  const printAdvanceReceipt = (adv: any) => {
    const win = window.open('', '_blank', 'width=700,height=750')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Advance Voucher — Royal Kissan</title>
        <style>
          body { font-family: monospace, sans-serif; padding: 2rem; color: #000; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .row { display: flex; justify-content: space-between; margin: 0.6rem 0; font-size: 14px; }
          .box { border: 1px solid #000; padding: 1rem; margin: 1.5rem 0; background: #fafafa; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 4rem; }
          .sig-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 0.4rem; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin:0;">ROYAL KISSAN BEVERAGES &amp; FOOD PRODUCTS</h2>
          <div style="font-size: 13px; margin-top: 0.2rem;">EMPLOYEE SALARY ADVANCE RECEIPT</div>
          <div style="font-size: 11px; margin-top: 0.2rem;">Voucher No: ${adv.reference || 'ADV-' + Date.now().toString().slice(-6)}</div>
        </div>

        <div class="row">
          <span><strong>Date:</strong> ${adv.date || adv.advance_date}</span>
          <span><strong>Payment Mode:</strong> ${(adv.mode || adv.payment_method || 'CASH').toUpperCase()}</span>
        </div>

        <div class="box">
          <div class="row">
            <span><strong>Employee Name:</strong></span>
            <span>${adv.employee_name || 'Employee'}</span>
          </div>
          <div class="row">
            <span><strong>Designation / Role:</strong></span>
            <span>${(adv.role || 'Staff').toUpperCase()}</span>
          </div>
          <div class="row">
            <span><strong>Monthly Base Salary:</strong></span>
            <span>₹${Number(adv.salary || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="row" style="font-size: 16px; margin-top: 0.8rem; border-top: 1px dashed #000; padding-top: 0.5rem;">
            <span><strong>ADVANCE ISSUED (₹):</strong></span>
            <span><strong>₹${Number(adv.amount || adv.advance_amount || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        <div class="row" style="font-size: 12px;">
          <span><strong>Purpose / Remarks:</strong> ${adv.remarks || 'Salary Advance (To be adjusted in monthly payroll)'}</span>
        </div>

        <div class="sig-row">
          <div class="sig-line">Employee Signature</div>
          <div class="sig-line">Authorized Signatory (Royal Kissan)</div>
        </div>

        <script>
          window.print();
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.phone?.includes(search)
    const matchesRole = roleFilter === 'all' || e.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <UserCheck style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              Employee Management, Advances &amp; Profiles
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0.2rem 0 0 0' }}>
              Employee 360 profiles, biometric attendance metrics, salary advance disbursements &amp; payroll recovery.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="md"
            icon={<CreditCard style={{ width: '15px', height: '15px', color: '#fbbf24' }} />}
            onClick={() => handleInitiateAdvance()}
          >
            Record Advance
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Plus style={{ width: '16px', height: '16px' }} />}
            onClick={() => setShowAddEmployeeModal(true)}
          >
            Add New Employee
          </Button>
        </div>
      </div>

      {/* MODULE 6: EMPLOYEE DASHBOARD STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Total Staff</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>
            {dashboardStats.totalEmployees}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Present Today</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>
            {dashboardStats.presentToday}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Absent Today</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f87171', marginTop: '0.2rem' }}>
            {dashboardStats.absentToday}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>On Leave</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#60a5fa', marginTop: '0.2rem' }}>
            {dashboardStats.onLeaveToday}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Total Advances Outstanding</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
            ₹{dashboardStats.totalAdvancesOutstanding.toLocaleString('en-IN')}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Salary Payable</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#c084fc', marginTop: '0.2rem' }}>
            ₹{dashboardStats.monthlySalaryPayable.toLocaleString('en-IN')}
          </div>
        </Card>
      </div>

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'employees' ? '#fbbf24' : 'transparent',
            color: activeTab === 'employees' ? '#000' : '#a1a1aa'
          }}
        >
          Staff Directory ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('advances')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'advances' ? '#fbbf24' : 'transparent',
            color: activeTab === 'advances' ? '#000' : '#a1a1aa'
          }}
        >
          Salary Advances Register ({advances.length})
        </button>
      </div>

      {/* TAB 1: ALL EMPLOYEES DIRECTORY */}
      {activeTab === 'employees' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          {/* Search & Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Input
                placeholder="Search staff by name, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '260px', marginBottom: 0 }}
              />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
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
                <option value="all">All Roles</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
              Showing {filteredEmployees.length} of {employees.length} staff accounts
            </span>
          </div>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Employee</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Phone</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Base Salary (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Outstanding Advance (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Net Payable (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => {
                    const adv = Number(emp.advance_amount || 0)
                    const base = Number(emp.salary || 0)
                    const netPayable = Math.max(0, base - adv)

                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <Link
                            href={`/employees/${emp.id}`}
                            style={{ fontWeight: 700, color: '#f4f4f5', textDecoration: 'none' }}
                            className="hover:text-emerald-400 transition-colors"
                          >
                            {emp.name}
                          </Link>
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{emp.employee_code || `EMP-${emp.id.slice(0, 4)}`}</div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <Badge variant={emp.role === 'manager' ? 'info' : emp.role === 'driver' ? 'warning' : 'neutral'}>
                            {(emp.role || 'staff').toUpperCase()}
                          </Badge>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                          {emp.phone || '—'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f4f4f5' }}>
                          ₹{base.toLocaleString('en-IN')}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: adv > 0 ? '#fbbf24' : '#71717a' }}>
                          {adv > 0 ? `₹${adv.toLocaleString('en-IN')}` : '₹0'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 900, color: '#34d399' }}>
                          ₹{netPayable.toLocaleString('en-IN')}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <Badge variant={emp.is_active ? 'success' : 'danger'}>
                            {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              title="Message on WhatsApp"
                              onClick={() => {
                                const cleanPhone = String(emp.phone || '').replace(/[^\d]/g, '')
                                const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
                                window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(`Hello ${emp.name}, message from Royal Kissan management.`)}`, '_blank')
                              }}
                              style={{
                                backgroundColor: '#25D366',
                                border: 'none',
                                color: '#000',
                                borderRadius: '6px',
                                padding: '0.35rem 0.65rem',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer'
                              }}
                            >
                              <svg style={{ width: '13px', height: '13px' }} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                              </svg>
                              WhatsApp
                            </button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Eye style={{ width: '13px', height: '13px' }} />}
                              onClick={() => handleOpenProfile(emp.id)}
                            >
                              360 Profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<CreditCard style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}
                              onClick={() => handleInitiateAdvance(emp)}
                            >
                              + Advance
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: SALARY ADVANCES REGISTER */}
      {activeTab === 'advances' && (
        <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Salary Advance Disbursements &amp; Audit Trail
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#a1a1aa', margin: '0.2rem 0 0 0' }}>
                All cash/UPI advances issued to staff. Recoveries are automatically deducted from monthly payroll without double expenses.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus style={{ width: '15px', height: '15px' }} />}
              onClick={() => handleInitiateAdvance()}
            >
              Record New Advance
            </Button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Employee</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mode</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Advance (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Recovered (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Remaining Balance (₹)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Remarks</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#71717a' }}>
                      No employee salary advances recorded yet.
                    </td>
                  </tr>
                ) : (
                  advances.map(adv => {
                    const emp = employees.find(e => e.id === adv.employee_id)
                    return (
                      <tr key={adv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem', color: '#d4d4d8' }}>{adv.advance_date}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{emp?.name || 'Staff'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#71717a' }}>{emp?.role?.toUpperCase() || ''}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <Badge variant="neutral">{adv.payment_method?.toUpperCase()}</Badge>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#fbbf24' }}>
                          ₹{Number(adv.advance_amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#34d399' }}>
                          ₹{Number(adv.recovered_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: (Number(adv.remaining_amount) || 0) > 0 ? '#f87171' : '#34d399' }}>
                          ₹{Number(adv.remaining_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <Badge variant={adv.status === 'RECOVERED' ? 'success' : adv.status === 'PARTIALLY_RECOVERED' ? 'warning' : 'danger'}>
                            {adv.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa', fontSize: '0.78rem' }}>
                          {adv.remarks || adv.reference_number || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Printer style={{ width: '13px', height: '13px' }} />}
                            onClick={() => printAdvanceReceipt({
                              ...adv,
                              employee_name: emp?.name,
                              role: emp?.role,
                              salary: emp?.salary,
                              date: adv.advance_date,
                              amount: adv.advance_amount,
                              mode: adv.payment_method
                            })}
                          >
                            Print Voucher
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: ADD EMPLOYEE */}
      {showAddEmployeeModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{
              padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Add New Staff Profile</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <Input
                label="Full Name *"
                placeholder="e.g. Ramesh Kumar"
                value={empForm.name}
                onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    ROLE DESIGNATION
                  </label>
                  <select
                    value={empForm.role}
                    onChange={e => setEmpForm({ ...empForm, role: e.target.value })}
                    style={{
                      width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                    }}
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Employee Code"
                  placeholder="e.g. EMP-012"
                  value={empForm.employee_code}
                  onChange={e => setEmpForm({ ...empForm, employee_code: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Phone Number"
                  placeholder="10-digit mobile"
                  value={empForm.phone}
                  onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                />
                <Input
                  label="Monthly Base Salary (₹) *"
                  type="number"
                  value={empForm.salary}
                  onChange={e => setEmpForm({ ...empForm, salary: Number(e.target.value) })}
                />
              </div>

              <Input
                label="Residential Address"
                placeholder="Local address"
                value={empForm.address}
                onChange={e => setEmpForm({ ...empForm, address: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Bank Name"
                  placeholder="e.g. SBI, HDFC"
                  value={empForm.bank_name}
                  onChange={e => setEmpForm({ ...empForm, bank_name: e.target.value })}
                />
                <Input
                  label="Account Number"
                  placeholder="Bank account number"
                  value={empForm.bank_account}
                  onChange={e => setEmpForm({ ...empForm, bank_account: e.target.value })}
                />
              </div>
            </div>

            <div style={{
              padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.65rem'
            }}>
              <Button variant="secondary" onClick={() => setShowAddEmployeeModal(false)}>Cancel</Button>
              <Button variant="primary" loading={savingEmp} onClick={handleSaveEmployee}>Create Profile</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD SALARY ADVANCE */}
      {showAdvanceModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{
              padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                Record Salary Advance
              </h3>
              <button onClick={() => setShowAdvanceModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                  SELECT EMPLOYEE *
                </label>
                <select
                  value={advForm.employee_id}
                  disabled={!!selectedEmployeeForAdvance}
                  onChange={e => setAdvForm({ ...advForm, employee_id: e.target.value })}
                  style={{
                    width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                  }}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role?.toUpperCase()}) &mdash; Base: ₹{Number(emp.salary || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Advance Amount (₹) *"
                  type="number"
                  value={advForm.advance_amount}
                  onChange={e => setAdvForm({ ...advForm, advance_amount: Number(e.target.value) })}
                />
                <Input
                  label="Advance Date"
                  type="date"
                  value={advForm.advance_date}
                  onChange={e => setAdvForm({ ...advForm, advance_date: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    PAYMENT METHOD
                  </label>
                  <select
                    value={advForm.payment_method}
                    onChange={e => setAdvForm({ ...advForm, payment_method: e.target.value as any })}
                    style={{
                      width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                    }}
                  >
                    <option value="cash">Cash Handover</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <Input
                  label="Reference # / Transaction ID"
                  placeholder="e.g. UPI-12345"
                  value={advForm.reference_number}
                  onChange={e => setAdvForm({ ...advForm, reference_number: e.target.value })}
                />
              </div>

              <Input
                label="Remarks / Reason"
                placeholder="e.g. Medical emergency, festival advance"
                value={advForm.remarks}
                onChange={e => setAdvForm({ ...advForm, remarks: e.target.value })}
              />

              <div style={{
                padding: '0.75rem', background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '6px',
                fontSize: '0.75rem', color: '#d4d4d8'
              }}>
                <strong>Accounting Note:</strong> Recorded as an employee receivable asset. It will be recovered cleanly during monthly payroll settlement without creating a duplicate expense.
              </div>
            </div>

            <div style={{
              padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.65rem'
            }}>
              <Button variant="secondary" onClick={() => setShowAdvanceModal(false)}>Cancel</Button>
              <Button variant="primary" loading={savingAdv} onClick={handleRecordAdvance}>Disburse Advance</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MODULE 6 — EMPLOYEE 360 PROFILE VIEW */}
      {selectedProfileEmployeeId && profileData && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Profile Header */}
            <div style={{
              padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  backgroundColor: '#fbbf24', color: '#000', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                }}>
                  {profileData.employee.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{profileData.employee.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                    <Badge variant="warning">{profileData.employee.role?.toUpperCase()}</Badge>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                      ID: {profileData.employee.employee_code || profileData.employee.id.slice(0, 8)}
                    </span>
                    <Badge variant={profileData.employee.is_active ? 'success' : 'danger'}>
                      {profileData.employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  title="Message on WhatsApp"
                  onClick={() => {
                    const cleanPhone = String(profileData.employee.phone || '').replace(/[^\d]/g, '')
                    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
                    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(`Hello ${profileData.employee.name}, message from Royal Kissan HR.`)}`, '_blank')
                  }}
                  style={{
                    backgroundColor: '#25D366',
                    border: 'none',
                    color: '#000',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <svg style={{ width: '13px', height: '13px' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  WhatsApp
                </button>
                <button onClick={() => setSelectedProfileEmployeeId(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
            </div>

            {/* Profile Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Financial & Salary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', background: '#27272a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600 }}>MONTHLY BASE SALARY</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>
                    ₹{Number(profileData.employee.salary || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: '#27272a', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>OUTSTANDING ADVANCES</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
                    ₹{profileData.totalAdvancesOutstanding.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: '#27272a', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>REMAINING PAYABLE SALARY</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>
                    ₹{profileData.remainingPayableSalary.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div style={{ padding: '1rem', background: '#121214', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: '#fbbf24' }}>
                  Current Month Attendance Summary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.5rem', background: '#18181b', borderRadius: '6px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>{profileData.attendanceSummary.presentDays}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Present Days</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: '#18181b', borderRadius: '6px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{profileData.attendanceSummary.halfDays}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Half Days</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: '#18181b', borderRadius: '6px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>{profileData.attendanceSummary.absentDays}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Absent Days</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: '#18181b', borderRadius: '6px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>{profileData.attendanceSummary.leaveDays}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Leave Days</div>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Attendance History */}
              <div style={{ padding: '1rem', background: '#121214', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.92rem', color: '#fff' }}>
                  Current Month Daily Attendance History
                </h4>
                {profileData.monthlyAttendance.length === 0 ? (
                  <div style={{ padding: '0.85rem', textAlign: 'center', color: '#71717a', fontSize: '0.8rem', background: '#18181b', borderRadius: '6px' }}>
                    No daily attendance logs recorded for this month.
                  </div>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#09090b', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <tr style={{ color: '#a1a1aa', textAlign: 'left' }}>
                          <th style={{ padding: '0.45rem 0.65rem' }}>Date</th>
                          <th style={{ padding: '0.45rem 0.65rem' }}>Status</th>
                          <th style={{ padding: '0.45rem 0.65rem' }}>Check In</th>
                          <th style={{ padding: '0.45rem 0.65rem' }}>Check Out</th>
                          <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Hours</th>
                          <th style={{ padding: '0.45rem 0.65rem' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.monthlyAttendance.map(att => (
                          <tr key={att.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.45rem 0.65rem', color: '#f4f4f5', fontWeight: 600 }}>{att.date}</td>
                            <td style={{ padding: '0.45rem 0.65rem' }}>
                              <Badge variant={att.status === 'present' ? 'success' : att.status === 'half_day' ? 'warning' : att.status === 'absent' ? 'danger' : 'info'}>
                                {att.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td style={{ padding: '0.45rem 0.65rem', color: '#a1a1aa' }}>{att.check_in_time ? String(att.check_in_time).slice(0, 5) : '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', color: '#a1a1aa' }}>{att.check_out_time ? String(att.check_out_time).slice(0, 5) : '—'}</td>
                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>{att.working_hours ?? 0} hrs</td>
                            <td style={{ padding: '0.45rem 0.65rem', color: '#71717a' }}>{att.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Advance History */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#fff' }}>Salary Advance History</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInitiateAdvance(profileData.employee)}
                  >
                    + Disburse Advance
                  </Button>
                </div>
                {profileData.advances.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#71717a', fontSize: '0.8rem', background: '#121214', borderRadius: '6px' }}>
                    No advances taken by this employee.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <th style={{ padding: '0.4rem' }}>Date</th>
                        <th style={{ padding: '0.4rem', textAlign: 'right' }}>Amount (₹)</th>
                        <th style={{ padding: '0.4rem', textAlign: 'right' }}>Recovered</th>
                        <th style={{ padding: '0.4rem', textAlign: 'right' }}>Remaining</th>
                        <th style={{ padding: '0.4rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.advances.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.4rem', color: '#d4d4d8' }}>{a.advance_date}</td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>
                            ₹{Number(a.advance_amount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', color: '#34d399' }}>
                            ₹{Number(a.recovered_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 800, color: (Number(a.remaining_amount) || 0) > 0 ? '#f87171' : '#34d399' }}>
                            ₹{Number(a.remaining_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.4rem' }}>
                            <Badge variant={a.status === 'RECOVERED' ? 'success' : 'warning'}>{a.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Previous Salary Payments */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#fff' }}>Previous Payroll Settlements</h4>
                {profileData.salaryPayments.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#71717a', fontSize: '0.8rem', background: '#121214', borderRadius: '6px' }}>
                    No payroll settlements recorded yet.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <th style={{ padding: '0.4rem' }}>Month/Year</th>
                        <th style={{ padding: '0.4rem', textAlign: 'right' }}>Calculated</th>
                        <th style={{ padding: '0.4rem', textAlign: 'right' }}>Advance Deducted</th>
                        <th style={{ padding: '0.4rem', textAlign: 'right' }}>Net Paid (₹)</th>
                        <th style={{ padding: '0.4rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.salaryPayments.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.4rem', color: '#d4d4d8' }}>{p.month}/{p.year}</td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', color: '#f4f4f5' }}>
                            ₹{Number(p.calculated_salary || p.base_salary).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', color: '#fbbf24' }}>
                            -₹{Number(p.advance_deducted || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                            ₹{Number(p.net_salary).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.4rem' }}>
                            <Badge variant={p.status === 'paid' ? 'success' : 'neutral'}>{p.status?.toUpperCase()}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{
              padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedProfileEmployeeId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
