'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { AlertCircle, DollarSign, RefreshCw, X, Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function DuesPage() {
  const [dues, setDues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCollectModal, setShowCollectModal] = useState<any | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useDataSyncListener(['dues', 'bills', 'collections', 'all'], () => { loadDues() })

  useEffect(() => { loadDues() }, [])

  async function loadDues() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customer_dues')
        .select('*')
        .gt('due_amount', 0)
        .order('due_amount', { ascending: false })

      if (data && data.length > 0) {
        setDues(data)
      } else {
        // Fallback: fetch bills with due_amount > 0
        const { data: dueBills } = await supabase
          .from('bills')
          .select('id, customer_name, due_amount, date, invoice_number')
          .gt('due_amount', 0)
          .order('due_amount', { ascending: false })

        setDues(
          (dueBills || []).map(b => ({
            id: b.id,
            customer_name: b.customer_name,
            due_amount: b.due_amount,
            date: b.date,
            invoice_number: b.invoice_number,
          }))
        )
      }
    } catch {
      setDues([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCollect() {
    if (!showCollectModal || paymentAmount <= 0) return
    setUpdating(true)
    try {
      const newDue = Math.max(0, (Number(showCollectModal.due_amount) || 0) - paymentAmount)
      const newPaid = (Number(showCollectModal.paid_amount) || 0) + paymentAmount
      const todayDate = new Date().toISOString().split('T')[0]
      const status = newDue === 0 ? 'paid' : 'partial'

      // 1. Update customer_dues row if it exists
      if (showCollectModal.id) {
        const { error: dueErr } = await supabase
          .from('customer_dues')
          .update({ 
            due_amount: newDue, 
            paid_amount: newPaid,
            status: status,
            last_updated: new Date().toISOString()
          })
          .eq('id', showCollectModal.id)
        if (dueErr) console.warn('Customer dues update notice:', dueErr.message)
      }

      // 2. Update canonical bills row if linked
      const billId = showCollectModal.bill_id || (showCollectModal.invoice_number ? null : showCollectModal.id)
      if (billId) {
        const { data: billRow } = await supabase.from('bills').select('id, paid_amount, total_amount, due_amount').eq('id', billId).maybeSingle()
        if (billRow) {
          const updatedBillPaid = (Number(billRow.paid_amount) || 0) + paymentAmount
          const updatedBillDue = Math.max(0, (Number(billRow.due_amount) || 0) - paymentAmount)
          await supabase.from('bills').update({
            paid_amount: updatedBillPaid,
            due_amount: updatedBillDue,
            payment_status: updatedBillDue === 0 ? 'paid' : (updatedBillPaid > 0 ? 'partial' : 'due')
          }).eq('id', billId)
        }
      } else if (showCollectModal.invoice_number) {
        const { data: billRow } = await supabase.from('bills').select('id, paid_amount, total_amount, due_amount').eq('invoice_number', showCollectModal.invoice_number).maybeSingle()
        if (billRow) {
          const updatedBillPaid = (Number(billRow.paid_amount) || 0) + paymentAmount
          const updatedBillDue = Math.max(0, (Number(billRow.due_amount) || 0) - paymentAmount)
          await supabase.from('bills').update({
            paid_amount: updatedBillPaid,
            due_amount: updatedBillDue,
            payment_status: updatedBillDue === 0 ? 'paid' : (updatedBillPaid > 0 ? 'partial' : 'due')
          }).eq('id', billRow.id)
        }
      }

      // 3. Update customer outstanding balance if customer_id linked
      if (showCollectModal.customer_id) {
        const { data: custRow } = await supabase.from('customers').select('outstanding_amount').eq('id', showCollectModal.customer_id).maybeSingle()
        if (custRow) {
          await supabase.from('customers').update({
            outstanding_amount: Math.max(0, (Number(custRow.outstanding_amount) || 0) - paymentAmount),
            updated_at: new Date().toISOString()
          }).eq('id', showCollectModal.customer_id)
        }
      }
      
      // 4. Record collection in general collections
      const { error: colErr } = await supabase.from('collections').insert([{
        bill_id: billId || null,
        invoice_number: showCollectModal.invoice_number || null,
        customer_name: showCollectModal.customer_name || 'Customer',
        amount: paymentAmount,
        payment_mode: 'cash',
        date: todayDate,
        notes: `Due Collection for ${showCollectModal.customer_name || 'Customer'} (Inv: ${showCollectModal.invoice_number || 'N/A'})`
      }])
      if (colErr) console.warn('Collections log warning:', colErr.message)

      // Also record in dealer_collections
      await supabase.from('dealer_collections').insert([{
        amount: paymentAmount,
        collected_date: todayDate,
        date: todayDate,
        payment_mode: 'cash',
        notes: `Due Collection for ${showCollectModal.customer_name || 'Customer'} (Inv: ${showCollectModal.invoice_number || 'N/A'})`,
        collected_by: 'Cashier'
      }])

      emitDataChange('dues')
      emitDataChange('bills')
      emitDataChange('collections')
      emitDataChange('customers')

      setShowCollectModal(null)
      setPaymentAmount(0)
      loadDues()
      alert('✅ Due collection payment recorded successfully in database!')
    } catch (e: any) {
      alert(`Error saving collection: ${e.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'customer_name',
      title: 'Customer Account',
      sortable: true,
      render: (d) => (
        <div>
          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{d.customer_name}</div>
          {d.invoice_number && <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Invoice: {d.invoice_number}</div>}
        </div>
      ),
    },
    {
      key: 'due_amount',
      title: 'Outstanding Due (₹)',
      align: 'right',
      sortable: true,
      render: (d) => (
        <span className="num" style={{ fontWeight: 800, color: '#f87171' }}>
          {formatCurrency(Number(d.due_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Collect Payment',
      align: 'right',
      render: (d) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowCollectModal(d)
            setPaymentAmount(Number(d.due_amount) || 0)
          }}
        >
          Clear / Collect Due
        </Button>
      ),
    },
  ]

  const totalOutstanding = dues.reduce((s, d) => s + (Number(d.due_amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle style={{ color: '#f87171', width: '28px', height: '28px' }} />
            Outstanding Due Balances
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {dues.length} customer accounts with outstanding dues &bull; Total Dues: {' '}
            <span className="num" style={{ color: '#f87171', fontWeight: 800 }}>
              {formatCurrency(totalOutstanding)}
            </span>
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={<RefreshCw style={{ width: '14px', height: '14px' }} />} onClick={loadDues}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={dues}
          searchPlaceholder="Search customer account or invoice number..."
          exportFileName="royal-kissan-outstanding-dues"
        />
      )}

      {/* Modal */}
      {showCollectModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Record Due Collection</h3>
              <button onClick={() => setShowCollectModal(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>Account: <span style={{ color: '#fff', fontWeight: 700 }}>{showCollectModal.customer_name}</span></div>
              <div>Current Due: <span style={{ color: '#f87171', fontWeight: 800 }}>{formatCurrency(showCollectModal.due_amount)}</span></div>
              <Input label="Collection Amount (₹)" type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowCollectModal(null)}>Cancel</Button>
              <Button variant="primary" loading={updating} onClick={handleCollect}>Record Payment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
