'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDataSyncListener } from '@/lib/events/data-sync'
import UnifiedBillingForm from '@/components/billing/UnifiedBillingForm'
import { UnifiedBillType } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'
import { 
  Receipt, 
  Clock, 
  History, 
  Printer, 
  X, 
  CheckCircle, 
  Sliders, 
  ShieldCheck,
  ChevronRight,
  Eye,
  Building2,
  Users,
  Truck
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import { executePrintJob } from '@/lib/printer/printer'
import { BillData } from '@/lib/printer/receipt'

function BillingContent() {
  const searchParams = useSearchParams()
  const paramType = searchParams.get('type') as UnifiedBillType | null
  const paramCustomerId = searchParams.get('customerId') || undefined
  const paramDealerId = searchParams.get('dealerId') || undefined
  const paramDriverId = searchParams.get('driverId') || undefined
  const paramRouteId = searchParams.get('routeId') || undefined

  const initialType: UnifiedBillType = 
    paramType === 'customer' ? 'customer' :
    paramType === 'dealer' ? 'dealer' :
    paramType === 'route' ? 'route' : 'counter'

  const [currentTime, setCurrentTime] = useState('')
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [previewBill, setPreviewBill] = useState<BillData | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)

  const supabase = createClient()

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    return () => clearInterval(timer)
  }, [])

  // Load Recent Bills
  async function loadRecentBills() {
    try {
      const { data } = await supabase
        .from('bills')
        .select('id, invoice_number, date, customer_name, bill_type, total_amount, paid_amount, due_amount, payment_status, payment_mode, created_at')
        .order('created_at', { ascending: false })
        .limit(25)

      let merged = data || []
      try {
        const rawLocal = localStorage.getItem('rk_local_bills')
        if (rawLocal) {
          const localBills = JSON.parse(rawLocal)
          merged = [...localBills, ...merged.filter((b: any) => !localBills.some((lb: any) => lb.id === b.id || lb.invoice_number === b.invoice_number))]
        }
      } catch (e) {}

      setRecentBills(merged.slice(0, 30))
    } catch (err) {
      console.warn('Error loading recent bills:', err)
      try {
        const rawLocal = localStorage.getItem('rk_local_bills')
        if (rawLocal) setRecentBills(JSON.parse(rawLocal))
      } catch (e) {}
    }
  }

  useEffect(() => {
    loadRecentBills()
  }, [])

  useDataSyncListener(['bills', 'all'], () => {
    loadRecentBills()
  })

  // Quick Reprint Handler
  async function handleReprintBill(bill: any) {
    setPrintingId(bill.id)
    try {
      // Fetch items for bill
      const { data: items } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', bill.id)

      const billData: BillData = {
        id: bill.id,
        invoice_number: bill.invoice_number,
        bill_type: bill.bill_type,
        customer_name: bill.customer_name || 'Customer',
        total_amount: Number(bill.total_amount) || 0,
        paid_amount: Number(bill.paid_amount) || 0,
        due_amount: Number(bill.due_amount) || 0,
        payment_status: bill.payment_status,
        date: bill.date,
        subtotal: Number(bill.total_amount) || 0,
        gst_amount: 0,
        items: (items || []).map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || Number(i.total) || 0
        }))
      }

      const res = await executePrintJob(billData, { copyType: 'customer' })
      if (res.success) {
        alert(`🎉 Invoice ${bill.invoice_number} sent to printer!`)
      } else {
        alert(`❌ Printer Error: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Print Exception: ${err?.message || err}`)
    } finally {
      setPrintingId(null)
    }
  }

  async function handlePreviewBill(bill: any) {
    try {
      const { data: items } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', bill.id)

      setPreviewBill({
        id: bill.id,
        invoice_number: bill.invoice_number,
        bill_type: bill.bill_type,
        customer_name: bill.customer_name || 'Customer',
        total_amount: Number(bill.total_amount) || 0,
        paid_amount: Number(bill.paid_amount) || 0,
        due_amount: Number(bill.due_amount) || 0,
        payment_status: bill.payment_status,
        date: bill.date,
        subtotal: Number(bill.total_amount) || 0,
        gst_amount: 0,
        items: (items || []).map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || Number(i.total) || 0
        }))
      })
    } catch (err) {
      console.warn('Error loading bill items for preview:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Portal Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #fbbf24, #d97706)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
            }}>
              <Receipt style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
                Unified Billing System
              </h1>
              <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                Central sales entry point for Counter, Customer, Dealer & Route deliveries
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Live Clock */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            color: '#fbbf24',
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}>
            <Clock style={{ width: '14px', height: '14px' }} />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Recent Bills Drawer Toggle */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<History style={{ width: '15px', height: '15px', color: '#fbbf24' }} />}
            onClick={() => setIsHistoryOpen(true)}
          >
            Recent Bills ({recentBills.length})
          </Button>
        </div>
      </div>

      {/* Main Canonical Billing Engine */}
      <UnifiedBillingForm
        initialBillType={initialType}
        initialCustomerId={paramCustomerId}
        initialDealerId={paramDealerId}
        initialDriverId={paramDriverId}
        initialRouteId={paramRouteId}
        onSuccess={() => loadRecentBills()}
      />

      {/* Recent Bills Side Drawer / Modal */}
      {isHistoryOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '840px', width: '95%' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History style={{ color: '#fbbf24', width: '20px', height: '20px' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Recent Invoices & Billing Log
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '1rem' }}>
              {recentBills.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>
                  No recent bills found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentBills.map(b => {
                    const isPaid = b.payment_status === 'paid' || (Number(b.due_amount) || 0) <= 0
                    return (
                      <div
                        key={b.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
                              {b.invoice_number}
                            </span>
                            <Badge variant={
                              b.bill_type === 'route' ? 'info' :
                              b.bill_type === 'dealer' ? 'warning' :
                              b.bill_type === 'customer' ? 'info' : 'neutral'
                            }>
                              {(b.bill_type || 'counter').toUpperCase()}
                            </Badge>
                            <Badge variant={isPaid ? 'success' : 'danger'}>
                              {isPaid ? 'PAID' : `DUE ₹${b.due_amount}`}
                            </Badge>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '3px' }}>
                            <strong>{b.customer_name}</strong> &bull; Date: {b.date} &bull; Mode: {b.payment_mode || 'cash'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div className="num" style={{ fontWeight: 800, color: '#f4f4f5', fontSize: '1.05rem' }}>
                              {formatCurrency(Number(b.total_amount) || 0)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#34d399' }}>
                              Paid: {formatCurrency(Number(b.paid_amount) || 0)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePreviewBill(b)}
                              icon={<Eye style={{ width: '13px', height: '13px' }} />}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              loading={printingId === b.id}
                              onClick={() => handleReprintBill(b)}
                              icon={<Printer style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}
                            >
                              Reprint
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewBill && (
        <ReceiptPreviewModal
          isOpen={!!previewBill}
          onClose={() => setPreviewBill(null)}
          bill={previewBill}
        />
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#fbbf24' }}>Loading Unified Billing Engine...</div>}>
      <BillingContent />
    </Suspense>
  )
}
