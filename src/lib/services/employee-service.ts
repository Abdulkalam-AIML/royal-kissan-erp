import { createClient } from '@/lib/supabase/client'
import { emitDataChange } from '@/lib/events/data-sync'
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  EmployeeAdvance,
  SalaryPaymentRecord
} from '@/lib/types/database'

/**
 * ---------------------------------------------------------------------------
 * ATTENDANCE MANAGEMENT
 * ---------------------------------------------------------------------------
 */

export interface DailyAttendanceEntry {
  employee_id: string
  date: string
  status: AttendanceStatus
  check_in_time?: string | null
  check_out_time?: string | null
  working_hours?: number | null
  remarks?: string | null
}

export async function saveDailyAttendance(
  entries: DailyAttendanceEntry[]
): Promise<{ success: boolean; count?: number; message?: string }> {
  if (!entries || entries.length === 0) {
    return { success: false, message: 'No attendance entries provided.' }
  }

  const supabase = createClient()
  try {
    const payload = entries.map(e => ({
      employee_id: e.employee_id,
      date: e.date,
      status: e.status,
      check_in_time: e.check_in_time || null,
      check_out_time: e.check_out_time || null,
      working_hours: e.working_hours ?? (e.status === 'present' ? 8 : e.status === 'half_day' ? 4 : 0),
      remarks: e.remarks || null,
      notes: e.remarks || null
    }))

    const { error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'employee_id,date' })

    if (error) {
      return { success: false, message: `Failed to save attendance: ${error.message}` }
    }

    emitDataChange('attendance')
    emitDataChange('employees')

    return {
      success: true,
      count: entries.length,
      message: `Successfully recorded daily attendance for ${entries.length} employees.`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error saving attendance: ${err?.message || err}` }
  }
}

export async function getDailyAttendance(
  date: string
): Promise<Record<string, AttendanceRecord>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)

    if (error || !data) return {}

    const map: Record<string, AttendanceRecord> = {}
    for (const row of data) {
      map[row.employee_id] = row as AttendanceRecord
    }
    return map
  } catch {
    return {}
  }
}

export async function getMonthlyAttendance(
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  const supabase = createClient()
  try {
    const startMonth = String(month).padStart(2, '0')
    const startDate = `${year}-${startMonth}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${startMonth}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error || !data) return []
    return data as AttendanceRecord[]
  } catch {
    return []
  }
}

/**
 * ---------------------------------------------------------------------------
 * EMPLOYEE ADVANCE MANAGEMENT
 * ---------------------------------------------------------------------------
 */

export interface RecordAdvancePayload {
  employee_id: string
  advance_amount: number
  advance_date?: string
  payment_method?: 'cash' | 'upi' | 'bank_transfer' | 'cheque'
  reference_number?: string | null
  remarks?: string | null
  recorded_by?: string
}

export async function recordEmployeeAdvance(
  payload: RecordAdvancePayload
): Promise<{ success: boolean; advance?: any; message?: string }> {
  if (!payload.employee_id || payload.advance_amount <= 0) {
    return { success: false, message: 'Valid employee ID and positive advance amount are required.' }
  }

  const supabase = createClient()
  try {
    // 1. Try atomic database stored procedure first
    const { data, error } = await supabase.rpc('record_employee_advance', {
      p_employee_id: payload.employee_id,
      p_amount: payload.advance_amount,
      p_date: payload.advance_date || new Date().toISOString().split('T')[0],
      p_payment_method: payload.payment_method || 'cash',
      p_reference_number: payload.reference_number || null,
      p_remarks: payload.remarks || null,
      p_recorded_by: payload.recorded_by || 'Admin'
    })

    if (!error && data) {
      emitDataChange('employees')
      return {
        success: true,
        advance: data,
        message: `Advance of ₹${payload.advance_amount} recorded successfully for ${data.employee_name || 'employee'}.`
      }
    }

    // 2. Direct table fallback if RPC is unavailable
    const advanceDate = payload.advance_date || new Date().toISOString().split('T')[0]
    const { data: insertedAdv, error: insErr } = await supabase
      .from('employee_advances')
      .insert([{
        employee_id: payload.employee_id,
        advance_date: advanceDate,
        advance_amount: payload.advance_amount,
        payment_method: payload.payment_method || 'cash',
        reference_number: payload.reference_number || null,
        remarks: payload.remarks || null,
        recorded_by: payload.recorded_by || 'Admin',
        status: 'OUTSTANDING',
        recovered_amount: 0,
        remaining_amount: payload.advance_amount
      }])
      .select()
      .single()

    if (insErr) {
      return { success: false, message: `Failed to insert advance: ${insErr.message}` }
    }

    // Update advance_amount on employee record
    const { data: emp } = await supabase
      .from('employees')
      .select('advance_amount')
      .eq('id', payload.employee_id)
      .single()

    const currentAdv = Number(emp?.advance_amount || 0)
    await supabase
      .from('employees')
      .update({ advance_amount: currentAdv + payload.advance_amount })
      .eq('id', payload.employee_id)

    emitDataChange('employees')

    return {
      success: true,
      advance: insertedAdv,
      message: `Advance of ₹${payload.advance_amount} recorded successfully!`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error recording advance: ${err?.message || err}` }
  }
}

export async function getEmployeeAdvances(
  employeeId?: string,
  status?: string
): Promise<EmployeeAdvance[]> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('employee_advances')
      .select('*')
      .order('advance_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (employeeId) query = query.eq('employee_id', employeeId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error || !data) return []
    return data as EmployeeAdvance[]
  } catch {
    return []
  }
}

/**
 * ---------------------------------------------------------------------------
 * PAYROLL & ADVANCE RECOVERY
 * ---------------------------------------------------------------------------
 */

export interface SettleSalaryPayload {
  employee_id: string
  month: number
  year: number
  base_salary: number
  present_days: number
  absent_days: number
  half_days: number
  calculated_salary: number
  advance_to_deduct: number
  other_deductions?: number
  net_salary: number
  payment_mode?: string
  payment_date?: string
  notes?: string | null
}

export async function settleEmployeeSalary(
  payload: SettleSalaryPayload
): Promise<{ success: boolean; result?: any; message?: string }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.rpc('settle_employee_salary', {
      p_employee_id: payload.employee_id,
      p_month: payload.month,
      p_year: payload.year,
      p_base_salary: payload.base_salary,
      p_present_days: payload.present_days,
      p_absent_days: payload.absent_days,
      p_half_days: payload.half_days,
      p_calculated_salary: payload.calculated_salary,
      p_advance_to_deduct: payload.advance_to_deduct,
      p_other_deductions: payload.other_deductions || 0,
      p_net_salary: payload.net_salary,
      p_payment_mode: payload.payment_mode || 'cash',
      p_payment_date: payload.payment_date || new Date().toISOString().split('T')[0],
      p_notes: payload.notes || null
    })

    if (error) {
      return { success: false, message: `Salary settlement failed: ${error.message}` }
    }

    emitDataChange('employees')
    emitDataChange('salary')

    return {
      success: true,
      result: data,
      message: `Salary for ${payload.month}/${payload.year} settled successfully! Advance deducted: ₹${payload.advance_to_deduct}.`
    }
  } catch (err: any) {
    return { success: false, message: `Unexpected error settling salary: ${err?.message || err}` }
  }
}

/**
 * ---------------------------------------------------------------------------
 * EMPLOYEE 360 PROFILE & DASHBOARD METRICS
 * ---------------------------------------------------------------------------
 */

export interface EmployeeProfileData {
  employee: Employee & {
    driver_id?: string | null
    department?: string | null
    emergency_contact?: string | null
    bank_account?: string | null
    bank_name?: string | null
    ifsc_code?: string | null
    aadhar_number?: string | null
    employee_code?: string | null
  }
  attendanceSummary: {
    totalRecordedDays: number
    presentDays: number
    absentDays: number
    halfDays: number
    leaveDays: number
    weeklyOffDays: number
  }
  monthlyAttendance: AttendanceRecord[]
  allAttendance?: AttendanceRecord[]
  advances: EmployeeAdvance[]
  totalAdvancesOutstanding: number
  salaryPayments: SalaryPaymentRecord[]
  remainingPayableSalary: number
  linkedDriver?: any | null
  driverRoutes?: any[]
  driverActiveRoute?: any | null
}

export async function getEmployee360Profile(
  employeeId: string,
  year?: number,
  month?: number
): Promise<EmployeeProfileData | null> {
  const supabase = createClient()
  const targetYear = year || new Date().getFullYear()
  const targetMonth = month || (new Date().getMonth() + 1)

  try {
    const [
      { data: emp },
      { data: attList },
      { data: advList },
      { data: payList }
    ] = await Promise.all([
      supabase.from('employees').select('*').eq('id', employeeId).single(),
      supabase.from('attendance').select('*').eq('employee_id', employeeId).order('date', { ascending: false }),
      supabase.from('employee_advances').select('*').eq('employee_id', employeeId).order('advance_date', { ascending: false }),
      supabase.from('salary_payments').select('*').eq('employee_id', employeeId).order('year', { ascending: false }).order('month', { ascending: false })
    ])

    if (!emp) return null

    // Check for linked driver record
    let linkedDriver: any = null
    let driverRoutes: any[] = []
    let driverActiveRoute: any = null

    try {
      let dQuery = supabase.from('drivers').select('*')
      if (emp.driver_id) {
        dQuery = dQuery.eq('id', emp.driver_id)
      } else {
        dQuery = dQuery.eq('name', emp.name)
      }
      const { data: dData } = await dQuery.maybeSingle()

      if (dData) {
        linkedDriver = dData
        const [{ data: rList }, { data: actR }] = await Promise.all([
          supabase.from('driver_load_dispatches').select('*').eq('driver_id', dData.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('driver_load_dispatches').select('*').eq('driver_id', dData.id).in('status', ['IN_PROGRESS', 'ISSUED']).maybeSingle()
        ])
        driverRoutes = rList || []
        driverActiveRoute = actR || null
      }
    } catch {
      // Driver link query non-fatal
    }

    const allAtt = (attList || []) as AttendanceRecord[]
    const currentMonthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    const monthlyAtt = allAtt.filter(a => a.date.startsWith(currentMonthPrefix))

    const summary = {
      totalRecordedDays: monthlyAtt.length,
      presentDays: monthlyAtt.filter(a => a.status === 'present').length,
      absentDays: monthlyAtt.filter(a => a.status === 'absent').length,
      halfDays: monthlyAtt.filter(a => a.status === 'half_day').length,
      leaveDays: monthlyAtt.filter(a => a.status === 'leave').length,
      weeklyOffDays: monthlyAtt.filter(a => a.status === 'weekly_off').length
    }

    const advances = (advList || []) as EmployeeAdvance[]
    const totalAdvOutstanding = advances
      .filter(a => a.status === 'OUTSTANDING' || a.status === 'PARTIALLY_RECOVERED')
      .reduce((s, a) => s + Number(a.remaining_amount || 0), 0)

    const baseSalary = Number(emp.salary || 0)
    const remainingPayable = Math.max(0, baseSalary - totalAdvOutstanding)

    return {
      employee: emp as any,
      attendanceSummary: summary,
      monthlyAttendance: monthlyAtt,
      allAttendance: allAtt,
      advances,
      totalAdvancesOutstanding: totalAdvOutstanding,
      salaryPayments: (payList || []) as SalaryPaymentRecord[],
      remainingPayableSalary: remainingPayable,
      linkedDriver,
      driverRoutes,
      driverActiveRoute
    }
  } catch {
    return null
  }
}

export interface EmployeeDashboardStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  onLeaveToday: number
  halfDayToday: number
  totalAdvancesOutstanding: number
  monthlySalaryPayable: number
}

export async function getEmployeeDashboardStats(): Promise<EmployeeDashboardStats> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    const [
      { data: employees },
      { data: todayAttendance },
      { data: advances }
    ] = await Promise.all([
      supabase.from('employees').select('id, salary, advance_amount, is_active').eq('is_active', true),
      supabase.from('attendance').select('status').eq('date', today),
      supabase.from('employee_advances').select('remaining_amount, status').in('status', ['OUTSTANDING', 'PARTIALLY_RECOVERED'])
    ])

    const empList = employees || []
    const attList = todayAttendance || []
    const advList = advances || []

    const totalEmps = empList.length
    const presentCount = attList.filter(a => a.status === 'present').length
    const absentCount = attList.filter(a => a.status === 'absent').length
    const leaveCount = attList.filter(a => a.status === 'leave').length
    const halfDayCount = attList.filter(a => a.status === 'half_day').length

    const totalAdvances = advList.reduce((s, a) => s + (Number(a.remaining_amount) || 0), 0)
    const totalPayroll = empList.reduce((s, e) => s + (Number(e.salary) || 0), 0)
    const monthlyPayable = Math.max(0, totalPayroll - totalAdvances)

    return {
      totalEmployees: totalEmps,
      presentToday: presentCount,
      absentToday: absentCount,
      onLeaveToday: leaveCount,
      halfDayToday: halfDayCount,
      totalAdvancesOutstanding: totalAdvances,
      monthlySalaryPayable: monthlyPayable
    }
  } catch {
    return {
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      onLeaveToday: 0,
      halfDayToday: 0,
      totalAdvancesOutstanding: 0,
      monthlySalaryPayable: 0
    }
  }
}

