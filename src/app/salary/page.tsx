'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import {
  CreditCard,
  Check,
  DollarSign,
  Calendar,
  Printer,
  FileText,
  AlertCircle,
  TrendingDown,
  CheckCircle,
  RefreshCw,
  X
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'
import {
  settleEmployeeSalary,
  getMonthlyAttendance
} from '@/lib/services/employee-service'
import { Employee, SalaryPaymentRecord } from '@/lib/types/database'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function SalaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payments, setPayments] = useState<SalaryPaymentRecord[]>([])
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Settle Modal State
  const [settlingEmp, setSettlingEmp] = useState<Employee | null>(null)
  const [settleForm, setSettleForm] = useState({
    baseSalary: 0,
    presentDays: 30,
    absentDays: 0,
    halfDays: 0,
    calculatedSalary: 0,
    advanceToDeduct: 0,
    otherDeductions: 0,
    netSalary: 0,
    paymentMode: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [submittingSettle, setSubmittingSettle] = useState(false)

  const supabase = createClient()

  useDataSyncListener(['employees', 'salary', 'attendance'], () => {
    loadData()
  })

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  async function loadData() {
    setLoading(true)
    try {
      const [
        { data: emps },
        { data: pays },
        attRecords
      ] = await Promise.all([
        supabase.from('employees').select('*').eq('is_active', true).order('name'),
        supabase.from('salary_payments').select('*').eq('month', selectedMonth).eq('year', selectedYear),
        getMonthlyAttendance(selectedYear, selectedMonth)
      ])

      setEmployees((emps || []) as Employee[])
      setPayments((pays || []) as SalaryPaymentRecord[])
      setMonthlyAttendance(attRecords || [])
    } catch (err) {
      console.warn('Error loading payroll data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open Settle Modal with attendance and advance calculations
  const openSettleModal = (emp: Employee) => {
    const base = Number(emp.salary || 0)
    const empAtt = monthlyAttendance.filter(a => a.employee_id === emp.id)
    const present = empAtt.filter(a => a.status === 'present').length
    const half = empAtt.filter(a => a.status === 'half_day').length
    const absent = empAtt.filter(a => a.status === 'absent').length

    // Pro-rate if attendance is logged, else assume full days
    const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    let calc = base
    if (empAtt.length > 0) {
      const effectiveDays = present + (half * 0.5)
      calc = Math.round((base / totalDaysInMonth) * effectiveDays)
    }

    const currentAdvOutstanding = Number(emp.advance_amount || 0)
    const advToDeduct = Math.min(currentAdvOutstanding, calc)
    const net = Math.max(0, calc - advToDeduct)

    setSettlingEmp(emp)
    setSettleForm({
      baseSalary: base,
      presentDays: present || totalDaysInMonth,
      absentDays: absent,
      halfDays: half,
      calculatedSalary: calc,
      advanceToDeduct: advToDeduct,
      otherDeductions: 0,
      netSalary: net,
      paymentMode: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Payroll for ${MONTHS[selectedMonth - 1]} ${selectedYear}`
    })
  }

  // Update settle form live calculations
  const handleUpdateSettleField = (field: string, val: any) => {
    setSettleForm(prev => {
      const next: any = { ...prev, [field]: val }
      const calc = Number(next.calculatedSalary || 0)
      const adv = Number(next.advanceToDeduct || 0)
      const other = Number(next.otherDeductions || 0)
      next.netSalary = Math.max(0, calc - adv - other)
      return next
    })
  }

  // Confirm settlement
  async function handleConfirmSettlement() {
    if (!settlingEmp) return
    setSubmittingSettle(true)
    try {
      const res = await settleEmployeeSalary({
        employee_id: settlingEmp.id,
        month: selectedMonth,
        year: selectedYear,
        base_salary: settleForm.baseSalary,
        present_days: settleForm.presentDays,
        absent_days: settleForm.absentDays,
        half_days: settleForm.halfDays,
        calculated_salary: settleForm.calculatedSalary,
        advance_to_deduct: settleForm.advanceToDeduct,
        other_deductions: settleForm.otherDeductions,
        net_salary: settleForm.netSalary,
        payment_mode: settleForm.paymentMode,
        payment_date: settleForm.paymentDate,
        notes: settleForm.notes
      })

      if (res.success) {
        alert(`🎉 Salary payment confirmed for ${settlingEmp.name}!\n- Net Paid: ₹${settleForm.netSalary}\n- Advance Deducted: ₹${settleForm.advanceToDeduct}`)
        setSettlingEmp(null)
        emitDataChange('salary')
        emitDataChange('employees')
        loadData()
      } else {
        alert(`❌ Failed to settle: ${res.message}`)
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setSubmittingSettle(false)
    }
  }

  // Print Salary Slip
  const printSalarySlip = (emp: Employee, pay: SalaryPaymentRecord) => {
    const win = window.open('', '_blank', 'width=700,height=750')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Payslip — Royal Kissan</title>
        <style>
          body { font-family: monospace, sans-serif; padding: 2rem; color: #000; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 0.8rem; margin-bottom: 1.2rem; }
          .row { display: flex; justify-content: space-between; margin: 0.5rem 0; font-size: 13px; }
          .box { border: 1px solid #000; padding: 1rem; margin: 1rem 0; background: #fafafa; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 3.5rem; }
          .sig-line { border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 0.4rem; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin:0;">ROYAL KISSAN BEVERAGES &amp; FOOD PRODUCTS</h2>
          <div style="font-size: 13px; margin-top: 0.2rem;">MONTHLY SALARY PAYSLIP &mdash; ${MONTHS[selectedMonth - 1].toUpperCase()} ${selectedYear}</div>
        </div>

        <div class="row">
          <span><strong>Employee:</strong> ${emp.name} (${emp.employee_code || 'EMP'})</span>
          <span><strong>Designation:</strong> ${(emp.role || 'Staff').toUpperCase()}</span>
        </div>
        <div class="row">
          <span><strong>Payment Date:</strong> ${pay.payment_date || new Date().toISOString().split('T')[0]}</span>
          <span><strong>Payment Mode:</strong> ${(pay.payment_mode || 'Cash').toUpperCase()}</span>
        </div>

        <div class="box">
          <div class="row">
            <span>Base Monthly Salary:</span>
            <span>₹${Number(pay.base_salary).toLocaleString('en-IN')}</span>
          </div>
          <div class="row">
            <span>Calculated / Earned Salary:</span>
            <span>₹${Number(pay.calculated_salary || pay.base_salary).toLocaleString('en-IN')}</span>
          </div>
          <div class="row" style="color: #c00;">
            <span>Salary Advance Deducted:</span>
            <span>-₹${Number(pay.advance_deducted || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="row" style="color: #c00;">
            <span>Other Approved Deductions:</span>
            <span>-₹${Number(pay.other_deductions || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="row" style="border-top: 1px dashed #000; padding-top: 0.5rem; font-size: 15px; font-weight: bold;">
            <span>NET SALARY PAID:</span>
            <span>₹${Number(pay.net_salary).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="row" style="font-size: 11px;">
          <span>Status: <strong>PAID</strong> &bull; Notes: ${pay.notes || 'Monthly Payroll Disbursed'}</span>
        </div>

        <div class="sig-row">
          <div class="sig-line">Employee Signature</div>
          <div class="sig-line">Authorized Signatory</div>
        </div>

        <script>
          window.print();
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  // Dashboard Payroll Stats
  const totalBaseSalary = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0)
  const totalPaidNet = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.net_salary) || 0), 0)
  const totalAdvanceDeducted = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.advance_deducted) || 0), 0)
  const pendingCount = employees.filter(e => !payments.some(p => p.employee_id === e.id && p.status === 'paid')).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
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
            <CreditCard style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              Payroll Settlement &amp; Advance Recovery
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0.2rem 0 0 0' }}>
              Monthly salary payments with automatic deduction of salary advances and printable payslips.
            </p>
          </div>
        </div>

        {/* Month & Year Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{
              backgroundColor: '#1f1f23', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', color: '#fff', padding: '0.55rem 0.85rem', fontSize: '0.88rem', outline: 'none'
            }}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{
              backgroundColor: '#1f1f23', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', color: '#fff', padding: '0.55rem 0.85rem', fontSize: '0.88rem', outline: 'none'
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
            onClick={loadData}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Total Base Payroll</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f4f4f5', marginTop: '0.2rem' }}>
            ₹{totalBaseSalary.toLocaleString('en-IN')}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Advances Recovered</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.2rem' }}>
            ₹{totalAdvanceDeducted.toLocaleString('en-IN')}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Net Salary Paid</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>
            ₹{totalPaidNet.toLocaleString('en-IN')}
          </div>
        </Card>

        <Card style={{ padding: '0.85rem 1rem', background: '#121214', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Pending Staff Payments</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f87171', marginTop: '0.2rem' }}>
            {pendingCount} Staff
          </div>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card style={{ padding: '1.25rem', backgroundColor: '#121215' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0' }}>
          Staff Salary Roll &mdash; {MONTHS[selectedMonth - 1]} {selectedYear}
        </h3>

        {loading ? (
          <SkeletonTable rows={6} />
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#09090b', color: '#a1a1aa', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Employee</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Base Salary (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Outstanding Advance (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Advance Deducted (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Net Payable (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Payment Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const pay = payments.find(p => p.employee_id === emp.id)
                  const isPaid = pay?.status === 'paid'
                  const base = Number(emp.salary || 0)
                  const advOutstanding = Number(emp.advance_amount || 0)
                  const advDeducted = isPaid ? Number(pay.advance_deducted || 0) : 0
                  const net = isPaid ? Number(pay.net_salary) : Math.max(0, base - advOutstanding)

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{emp.role?.toUpperCase()} &bull; {emp.employee_code || ''}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f4f4f5' }}>
                        ₹{base.toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: advOutstanding > 0 ? '#fbbf24' : '#71717a' }}>
                        {advOutstanding > 0 ? `₹${advOutstanding.toLocaleString('en-IN')}` : '₹0'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#fbbf24' }}>
                        {isPaid ? `₹${advDeducted.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 900, color: '#34d399', fontSize: '0.95rem' }}>
                        ₹{net.toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <Badge variant={isPaid ? 'success' : 'danger'}>
                          {isPaid ? 'PAID' : 'PENDING'}
                        </Badge>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {isPaid ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Printer style={{ width: '13px', height: '13px' }} />}
                              onClick={() => printSalarySlip(emp, pay)}
                            >
                              Print Slip
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CreditCard style={{ width: '13px', height: '13px' }} />}
                              onClick={() => openSettleModal(emp)}
                            >
                              Settle &amp; Pay
                            </Button>
                          )}
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

      {/* SETTLE SALARY MODAL */}
      {settlingEmp && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
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
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                  Settle Salary &mdash; {settlingEmp.name}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#a1a1aa' }}>
                  {MONTHS[selectedMonth - 1]} {selectedYear} &bull; Outstanding Advance: ₹{Number(settlingEmp.advance_amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <button onClick={() => setSettlingEmp(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Earned / Calculated Salary (₹) *"
                  type="number"
                  value={settleForm.calculatedSalary}
                  onChange={e => handleUpdateSettleField('calculatedSalary', Number(e.target.value))}
                />
                <Input
                  label="Advance to Deduct (₹)"
                  type="number"
                  value={settleForm.advanceToDeduct}
                  onChange={e => handleUpdateSettleField('advanceToDeduct', Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Other Deductions (₹)"
                  type="number"
                  value={settleForm.otherDeductions}
                  onChange={e => handleUpdateSettleField('otherDeductions', Number(e.target.value))}
                />
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#34d399', fontWeight: 800, marginBottom: '0.35rem' }}>
                    NET SALARY PAYABLE (₹)
                  </label>
                  <div style={{
                    padding: '0.55rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px', color: '#34d399', fontWeight: 900, fontSize: '1.2rem'
                  }}>
                    ₹{settleForm.netSalary.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    PAYMENT MODE
                  </label>
                  <select
                    value={settleForm.paymentMode}
                    onChange={e => handleUpdateSettleField('paymentMode', e.target.value)}
                    style={{
                      width: '100%', backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff', padding: '0.55rem', fontSize: '0.88rem', outline: 'none'
                    }}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="bank_transfer">Bank Transfer (NEFT)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <Input
                  label="Payment Date"
                  type="date"
                  value={settleForm.paymentDate}
                  onChange={e => handleUpdateSettleField('paymentDate', e.target.value)}
                />
              </div>

              <Input
                label="Notes / Settlement Reference"
                placeholder="e.g. Cleared via Cash voucher"
                value={settleForm.notes}
                onChange={e => handleUpdateSettleField('notes', e.target.value)}
              />
            </div>

            <div style={{
              padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.65rem'
            }}>
              <Button variant="secondary" onClick={() => setSettlingEmp(null)}>Cancel</Button>
              <Button variant="primary" loading={submittingSettle} onClick={handleConfirmSettlement}>
                Confirm &amp; Disburse
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
