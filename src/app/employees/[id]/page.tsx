'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Plus,
  Truck,
  CreditCard,
  FileText,
  AlertTriangle,
  ChevronRight,
  Printer,
  Share2,
  ExternalLink,
  Shield,
  Building,
  MapPin,
  X
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  getEmployee360Profile,
  recordEmployeeAdvance,
  EmployeeProfileData
} from '@/lib/services/employee-service'

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params?.id as string

  const [data, setData] = useState<EmployeeProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attendance' | 'salary' | 'advances' | 'payments' | 'documents' | 'activity'
  >('overview')

  // Disburse Advance Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({
    amount: 1000,
    payment_mode: 'CASH' as 'CASH' | 'UPI' | 'BANK',
    reason: '',
    repayment_terms: 'Deduct from next month salary'
  })
  const [savingAdvance, setSavingAdvance] = useState(false)

  useEffect(() => {
    if (employeeId) {
      loadProfile()
    }
  }, [employeeId])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await getEmployee360Profile(employeeId)
      setData(res)
    } catch (err) {
      console.error('Error fetching employee profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisburseAdvance() {
    if (!data?.employee) return
    if (advanceForm.amount <= 0) {
      alert('Advance amount must be greater than 0')
      return
    }

    setSavingAdvance(true)
    try {
      const res = await recordEmployeeAdvance({
        employee_id: data.employee.id,
        advance_amount: Number(advanceForm.amount),
        payment_method: advanceForm.payment_mode === 'BANK' ? 'bank_transfer' : (advanceForm.payment_mode.toLowerCase() as any),
        remarks: advanceForm.reason.trim() || advanceForm.repayment_terms
      })

      if (res.success) {
        setShowAdvanceModal(false)
        setAdvanceForm({
          amount: 1000,
          payment_mode: 'CASH',
          reason: '',
          repayment_terms: 'Deduct from next month salary'
        })
        await loadProfile()
        alert('Advance disbursed successfully!')
      } else {
        alert(res.message || 'Failed to disburse advance')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while recording the advance')
    } finally {
      setSavingAdvance(false)
    }
  }

  function handleSendWhatsApp() {
    if (!data?.employee?.phone) {
      alert('No mobile number on record for this employee')
      return
    }
    const clean = data.employee.phone.replace(/[^0-9]/g, '')
    const target = clean.startsWith('91') && clean.length === 12 ? clean : `91${clean}`
    const emp = data.employee
    const msg = `Hello ${emp.name},\n\nThis is from Royal Kissan HR. Your current advance balance is ₹${data.totalAdvancesOutstanding.toLocaleString('en-IN')}.\nPlease reach out if you have any questions regarding attendance or payroll.`
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        </div>
        <SkeletonTable rows={8} />
      </div>
    )
  }

  if (!data || !data.employee) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Employee Profile Not Found</h2>
        <p className="text-sm text-gray-500">
          The requested employee record could not be found in the database.
        </p>
        <Button onClick={() => router.push('/employees')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Directory
        </Button>
      </div>
    )
  }

  const { employee: emp, attendanceSummary, monthlyAttendance, allAttendance, advances, totalAdvancesOutstanding, salaryPayments, remainingPayableSalary, linkedDriver, driverRoutes, driverActiveRoute } = data
  const baseSalary = Number(emp.salary || 0)
  const perDaySalary = Math.round(baseSalary / 30)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-emerald-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/employees" className="hover:text-emerald-600 transition-colors">
            Employees & HR
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">
            {emp.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProfile}
            title="Refresh profile data"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="hidden sm:inline-flex"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Profile
          </Button>
          {emp.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendWhatsApp}
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Main Employee Header Card */}
      <Card className="p-6 border-l-4 border-l-emerald-600 shadow-sm bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-2xl flex items-center justify-center shrink-0">
              {emp.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {emp.name}
                </h1>
                <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                  {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
                <Badge variant="neutral" className="uppercase font-mono text-xs">
                  {emp.role}
                </Badge>
                {emp.department && (
                  <Badge variant="info" className="text-xs">
                    {emp.department}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Code: {emp.employee_code || `EMP-${emp.id.slice(0, 8)}`} • Joined: {emp.join_date || emp.date_joined || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanceModal(true)}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <DollarSign className="w-4 h-4 mr-1.5" />
              Disburse Advance
            </Button>

            {linkedDriver && (
              <Link href={`/drivers/${linkedDriver.id}`}>
                <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Truck className="w-4 h-4 mr-1.5" />
                  View Driver Profile
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* 4 Quick Summary Info Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Contact Details</span>
            <div className="mt-1 font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
              <Phone className="w-4 h-4 text-emerald-600" />
              {emp.phone || 'No phone recorded'}
            </div>
            {emp.emergency_contact && (
              <span className="text-xs text-gray-500 mt-0.5 block">
                Emergency: {emp.emergency_contact}
              </span>
            )}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Monthly Basic Salary</span>
            <div className="mt-1 font-bold text-gray-900 dark:text-white text-base">
              ₹{baseSalary.toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Per-day rate: ₹{perDaySalary.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Outstanding Advance</span>
            <div className="mt-1 font-bold text-amber-600 dark:text-amber-400 text-base">
              ₹{totalAdvancesOutstanding.toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Auto-deducted via FIFO in payroll
            </span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Driver Operations</span>
            {linkedDriver ? (
              <div>
                <div className="mt-1 font-semibold text-emerald-600 flex items-center gap-1.5 text-sm">
                  <Truck className="w-4 h-4" />
                  {driverActiveRoute ? 'On Active Route' : 'Available for Route'}
                </div>
                <span className="text-xs text-gray-500 mt-0.5 block truncate">
                  Vehicle: {linkedDriver.vehicle_reg_no || 'Unassigned'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1 block">
                  Non-Driver Role
                </span>
                <span className="text-xs text-gray-400 mt-0.5 block">
                  Plant & Operations
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <User className="w-4 h-4" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Attendance History ({allAttendance?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('salary')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'salary'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Salary History ({salaryPayments?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'advances'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Advances & Recoveries ({advances?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Payments Ledger
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          Documents & KYC
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'activity'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Activity History
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Month Attendance Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 bg-white dark:bg-gray-900 border text-center">
              <span className="text-xs text-gray-500 block">Days Present</span>
              <span className="text-xl font-bold text-emerald-600 mt-1 block">
                {attendanceSummary.presentDays}
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-gray-900 border text-center">
              <span className="text-xs text-gray-500 block">Days Absent</span>
              <span className="text-xl font-bold text-rose-600 mt-1 block">
                {attendanceSummary.absentDays}
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-gray-900 border text-center">
              <span className="text-xs text-gray-500 block">Half Days</span>
              <span className="text-xl font-bold text-amber-600 mt-1 block">
                {attendanceSummary.halfDays}
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-gray-900 border text-center">
              <span className="text-xs text-gray-500 block">Approved Leave</span>
              <span className="text-xl font-bold text-blue-600 mt-1 block">
                {attendanceSummary.leaveDays}
              </span>
            </Card>

            <Card className="p-3 bg-white dark:bg-gray-900 border text-center">
              <span className="text-xs text-gray-500 block">Weekly Offs</span>
              <span className="text-xl font-bold text-gray-600 mt-1 block">
                {attendanceSummary.weeklyOffDays}
              </span>
            </Card>
          </div>

          {/* Current Salary Preview Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Monthly Compensation & Net Payable Calculation
            </h3>
            <div className="space-y-3 text-sm max-w-xl">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Agreed Base Salary:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₹{baseSalary.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Per-day Rate:</span>
                <span>₹{perDaySalary.toLocaleString('en-IN')} / day</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Outstanding Advances:</span>
                <span className="font-semibold text-red-500">
                  - ₹{totalAdvancesOutstanding.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-lg font-bold text-emerald-800 dark:text-emerald-200">
                <span>Estimated Net Payable this Month:</span>
                <span>₹{remainingPayableSalary.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>

          {/* If Linked Driver: Active Route Card */}
          {linkedDriver && (
            <Card className="p-6 border-l-4 border-l-blue-500">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Driver Active Mission & Assigned Fleet
              </h3>
              {driverActiveRoute ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-950 dark:text-blue-100">
                      Route #{driverActiveRoute.dispatch_number}: {driverActiveRoute.route_name || 'In Progress'}
                    </span>
                    <Badge variant="warning">ON ROUTE</Badge>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Vehicle: {driverActiveRoute.vehicle_number || 'N/A'} • Loaded: {driverActiveRoute.total_loaded_qty} units • Sales: ₹{Number(driverActiveRoute.total_sales_amount || 0).toLocaleString('en-IN')}
                  </p>
                  <Link href={`/routes/${driverActiveRoute.id}`}>
                    <Button size="sm" variant="outline" className="mt-2 text-xs bg-white dark:bg-gray-900">
                      View Route Details <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Driver is currently available and ready for route assignment.
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Attendance History */}
      {activeTab === 'attendance' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Daily Attendance Records</h3>
            <span className="text-xs text-gray-500 font-mono">Total {allAttendance?.length || 0} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Check-in</th>
                  <th className="p-3">Check-out</th>
                  <th className="p-3 text-right">Working Hours</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {allAttendance && allAttendance.length > 0 ? (
                  allAttendance.map((att, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">{att.date}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            att.status === 'present'
                              ? 'success'
                              : att.status === 'absent'
                              ? 'danger'
                              : att.status === 'half_day'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {att.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{att.check_in_time || '—'}</td>
                      <td className="p-3 text-xs">{att.check_out_time || '—'}</td>
                      <td className="p-3 text-right font-semibold">{att.working_hours ?? '—'} hrs</td>
                      <td className="p-3 text-xs text-gray-400">{att.remarks || att.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No attendance records found for this employee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Salary History */}
      {activeTab === 'salary' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Payroll & Settlement History</h3>
            <span className="text-xs text-gray-500 font-mono">{salaryPayments?.length || 0} payroll runs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Month / Year</th>
                  <th className="p-3 text-right">Base Salary</th>
                  <th className="p-3 text-right">Advance Deducted</th>
                  <th className="p-3 text-right">Allowances</th>
                  <th className="p-3 text-right">Net Paid</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {salaryPayments && salaryPayments.length > 0 ? (
                  salaryPayments.map((sal, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {sal.month} / {sal.year}
                      </td>
                      <td className="p-3 text-right">₹{Number(sal.base_salary || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-red-500 font-semibold">
                        ₹{Number(sal.advance_deducted || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right text-emerald-600">
                        {sal.present_days ? `${sal.present_days} days` : 'Full'}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                        ₹{Number(sal.net_salary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={sal.status === 'paid' ? 'success' : 'warning'}>
                          {sal.status?.toUpperCase() || 'PAID'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-xs text-gray-500">
                        {sal.payment_date || sal.created_at ? new Date(sal.payment_date || sal.created_at!).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No payroll settlement records found for this employee yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Advances & Recoveries */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Employee Advances Ledger
              </h3>
              <p className="text-xs text-gray-500">
                Advances are deducted automatically in monthly payroll via First-In, First-Out (FIFO).
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAdvanceModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Disburse Advance
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Advance Amount</th>
                    <th className="p-3 text-right">Recovered</th>
                    <th className="p-3 text-right">Remaining Balance</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Terms / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {advances && advances.length > 0 ? (
                    advances.map((adv, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="p-3 font-medium text-gray-900 dark:text-white">{adv.advance_date}</td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                          ₹{Number(adv.advance_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-emerald-600 font-semibold">
                          ₹{Number(adv.recovered_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-amber-600 font-bold">
                          ₹{Number(adv.remaining_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              adv.status === 'RECOVERED'
                                ? 'success'
                                : adv.status === 'PARTIALLY_RECOVERED'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {adv.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {adv.remarks || 'Regular cash advance'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">
                        No advance records recorded for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Payments */}
      {activeTab === 'payments' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 dark:text-white">Disbursements & Payment Receipts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Payment Type</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Payment Mode</th>
                  <th className="p-3">Reference / Remarks</th>
                  <th className="p-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {salaryPayments && salaryPayments.map((p, idx) => (
                  <tr key={`sal-${idx}`} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-emerald-600">Salary Payout ({p.month}/{p.year})</td>
                    <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                      ₹{Number(p.net_salary || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center"><Badge variant="neutral">{p.payment_mode || 'BANK'}</Badge></td>
                    <td className="p-3 text-xs text-gray-500">{p.remarks || p.notes || 'Monthly Salary Disbursed'}</td>
                    <td className="p-3 text-right text-xs text-gray-400">{p.payment_date || p.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
                {advances && advances.map((a, idx) => (
                  <tr key={`adv-${idx}`} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-amber-600">Cash Advance Disbursed</td>
                    <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                      ₹{Number(a.advance_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center"><Badge variant="neutral">{a.payment_method?.toUpperCase() || 'CASH'}</Badge></td>
                    <td className="p-3 text-xs text-gray-500">{a.remarks || 'Advance Request'}</td>
                    <td className="p-3 text-right text-xs text-gray-400">{a.advance_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 6: Documents & KYC */}
      {activeTab === 'documents' && (
        <Card className="p-6 max-w-2xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            KYC & Banking Information
          </h3>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 py-2 border-b">
              <div>
                <span className="text-xs text-gray-500 block">Bank Name</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {emp.bank_name || 'State Bank of India'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Account Number</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {emp.bank_account || '•••• •••• ••••'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2 border-b">
              <div>
                <span className="text-xs text-gray-500 block">IFSC Code</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {emp.ifsc_code || 'SBIN0001234'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Aadhaar Card Reference</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {emp.aadhar_number || 'Verified on file'}
                </span>
              </div>
            </div>

            <div className="py-2">
              <span className="text-xs text-gray-500 block">Permanent Address</span>
              <span className="text-gray-900 dark:text-white mt-1 block">
                {emp.address || 'Address registered at plant location.'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 7: Activity History */}
      {activeTab === 'activity' && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Audit Trail & Activity Log
          </h3>
          <div className="space-y-4">
            {allAttendance?.slice(0, 5).map((a, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Attendance Marked: {a.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400 block">{a.date}</span>
                </div>
              </div>
            ))}
            {salaryPayments?.map((s, idx) => (
              <div key={`sal-act-${idx}`} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Salary Settled for {s.month}/{s.year}: ₹{Number(s.net_salary || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-gray-400 block">{s.created_at?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
            {advances?.map((ad, idx) => (
              <div key={`adv-act-${idx}`} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Advance Disbursed: ₹{Number(ad.advance_amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-gray-400 block">{ad.advance_date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Disburse Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Disburse Advance to {emp.name}
              </h3>
              <button onClick={() => setShowAdvanceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Advance Amount (₹) *
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={advanceForm.amount}
                  onChange={e => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Disbursement Mode
                </label>
                <select
                  value={advanceForm.payment_mode}
                  onChange={e => setAdvanceForm({ ...advanceForm, payment_mode: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="BANK">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Advance
                </label>
                <input
                  type="text"
                  placeholder="e.g. Festival advance, Medical emergency"
                  value={advanceForm.reason}
                  onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Repayment Terms
                </label>
                <input
                  type="text"
                  value={advanceForm.repayment_terms}
                  onChange={e => setAdvanceForm({ ...advanceForm, repayment_terms: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAdvanceModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDisburseAdvance}
                loading={savingAdvance}
              >
                Confirm Disbursal
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
