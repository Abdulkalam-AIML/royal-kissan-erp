'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, Plus, Trash2, Calendar, FileText, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

const CATEGORIES = [
  'Diesel',
  'Fuel',
  'Electricity',
  'Vehicle Maintenance',
  'Plant Maintenance',
  'Salaries',
  'Marketing',
  'Transport',
  'Office Expenses',
  'Miscellaneous',
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    category_name: CATEGORIES[0],
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_mode: 'cash',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(100)
      setExpenses(data || [])
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  async function saveExpense() {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid expense amount')
      return
    }
    setSaving(true)
    try {
      await supabase.from('expenses').insert({
        ...form,
        amount: Number(form.amount),
      })
      setShowModal(false)
      setForm({
        category_name: CATEGORIES[0],
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_mode: 'cash',
      })
      loadExpenses()
    } catch (e: any) {
      alert(`Error saving expense: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Are you sure you want to delete this expense entry?')) return
    try {
      await supabase.from('expenses').delete().eq('id', id)
      loadExpenses()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'expense_date',
      title: 'Expense Date',
      sortable: true,
      render: (e) => <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{e.expense_date}</span>,
    },
    {
      key: 'category_name',
      title: 'Category',
      sortable: true,
      render: (e) => <Badge variant="warning">{e.category_name}</Badge>,
    },
    {
      key: 'description',
      title: 'Description / Notes',
      render: (e) => <span style={{ color: '#f4f4f5' }}>{e.description || '—'}</span>,
    },
    {
      key: 'payment_mode',
      title: 'Payment Mode',
      render: (e) => (
        <Badge variant="neutral" style={{ textTransform: 'uppercase' }}>
          {e.payment_mode || 'cash'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      title: 'Amount (₹)',
      align: 'right',
      sortable: true,
      render: (e) => (
        <span className="num" style={{ fontWeight: 800, color: '#f87171' }}>
          {formatCurrency(Number(e.amount) || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Delete',
      align: 'right',
      render: (e) => (
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 style={{ width: '12px', height: '12px' }} />}
          onClick={() => deleteExpense(e.id)}
        />
      ),
    },
  ]

  const totalExpenseVal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Expense Management Ledger
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {expenses.length} records logged &bull; Total Expenses: {' '}
            <span className="num" style={{ color: '#f87171', fontWeight: 800 }}>
              {formatCurrency(totalExpenseVal)}
            </span>
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowModal(true)}>
          Record New Expense
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={expenses}
          searchPlaceholder="Search expense by category, description, date..."
          exportFileName="royal-kissan-expenses"
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Record New Expense Entry</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Select label="Expense Category" value={form.category_name} onChange={e => setForm({ ...form, category_name: e.target.value })} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              <Input label="Expense Amount (₹)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              <Input label="Expense Date" type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
              <Select label="Payment Mode" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })} options={[{ value: 'cash', label: 'Cash Payment' }, { value: 'upi', label: 'UPI / Online' }, { value: 'bank', label: 'Bank Transfer' }]} />
              <Input label="Description / Notes" placeholder="Details or bill reference..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveExpense}>Save Expense Entry</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
