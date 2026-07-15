'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
export default function SalaryPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const supabase = createClient()
  useEffect(() => { loadData() }, [selectedMonth, selectedYear])
  async function loadData() {
    const [{ data: emps }, { data: pays }] = await Promise.all([
      supabase.from('employees').select('id, name, role, salary').eq('is_active', true).order('name'),
      supabase.from('salary_payments').select('id, employee_id, status, net_salary, month, year').eq('month', selectedMonth).eq('year', selectedYear)
    ])
    setEmployees(emps || [])
    setPayments(pays || [])
    setLoading(false)
  }
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0)
  const paidTotal = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.net_salary || 0), 0)
  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">💳 Salary Management</h2><p className="page-subtitle">Monthly Payroll: ₹{totalPayroll.toLocaleString('en-IN')}</p></div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="form-input" style={{ width: 'auto' }} value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select>
          <select className="form-input" style={{ width: 'auto' }} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>{[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {[{ label: 'Total Payroll', value: `₹${totalPayroll.toLocaleString('en-IN')}`, icon: '💳', color: 'hsl(217,91%,60%)' }, { label: 'Paid', value: `₹${paidTotal.toLocaleString('en-IN')}`, icon: '✅', color: 'hsl(142,71%,45%)' }, { label: 'Pending', value: `₹${(totalPayroll - paidTotal).toLocaleString('en-IN')}`, icon: '🔴', color: 'hsl(0,85%,60%)' }, { label: 'Employees', value: employees.length.toString(), icon: '👔', color: 'hsl(270,75%,60%)' }].map(s => (<div key={s.label} className="stat-card"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{s.label}</p><p style={{ fontSize: '1.375rem', fontWeight: '800', color: 'hsl(210 40% 98%)' }} className="text-money">{s.value}</p></div><span style={{ fontSize: '1.75rem' }}>{s.icon}</span></div></div>))}
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">{MONTHS[selectedMonth-1]} {selectedYear} – Salary Sheet</h3></div>
        {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><span className="loading-spinner" /></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead><tr><th>#</th><th>Employee</th><th>Role</th><th style={{ textAlign: 'right' }}>Monthly Salary</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{employees.map((e, i) => {
                const payment = payments.find(p => p.employee_id === e.id)
                return (<tr key={e.id}><td style={{ color: 'hsl(215 20% 45%)', fontSize: '0.8rem' }}>{i+1}</td><td style={{ fontWeight: '600', color: 'hsl(210 40% 98%)' }}>{e.name}</td><td><span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{e.role}</span></td><td style={{ textAlign: 'right', fontWeight: '700', color: 'hsl(142 71% 55%)' }} className="text-money">{e.salary > 0 ? `₹${e.salary.toLocaleString('en-IN')}` : <span style={{ color: 'hsl(215 20% 45%)' }}>TBD</span>}</td><td><span className={`badge ${payment?.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>{payment?.status || 'pending'}</span></td><td><button className="btn btn-primary btn-sm" onClick={async () => { await supabase.from('salary_payments').upsert({ employee_id: e.id, month: selectedMonth, year: selectedYear, base_salary: e.salary, calculated_salary: e.salary, net_salary: e.salary, status: 'paid', payment_date: new Date().toISOString().split('T')[0] }, { onConflict: 'employee_id,month,year' }); loadData() }}>💳 Mark Paid</button></td></tr>)
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
