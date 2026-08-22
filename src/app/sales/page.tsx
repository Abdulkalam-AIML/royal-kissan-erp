'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, RefreshCw, Printer, Download, Eye, FileText, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { executePrintJob } from '@/lib/printer/printer'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import { BillData } from '@/lib/printer/receipt'
import { CopyType } from '@/lib/printer/printer-config'
import { useDataSyncListener } from '@/lib/events/data-sync'

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [previewBill, setPreviewBill] = useState<any | null>(null)
  const supabase = createClient()

  useDataSyncListener(['bills', 'all'], () => { loadSales() })

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('bills')
        .select('id, invoice_number, date, customer_name, customer_phone, customer_address, customer_gstin, dealer_id, bill_type, total_amount, paid_amount, due_amount, payment_mode, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      setSales(data || [])
    } catch {
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  async function handleReprint(bill: any, copyType: CopyType = 'customer') {
    const total = Number(bill.total_amount) || 0
    const billData: BillData = {
      invoice_number: bill.invoice_number || `INV-${bill.id}`,
      date: bill.date || new Date().toISOString().split('T')[0],
      customer_name: bill.customer_name || 'Walk-in Customer',
      customer_phone: bill.customer_phone || '',
      customer_address: bill.customer_address || '',
      customer_gstin: bill.customer_gstin || '',
      dealer_id: bill.dealer_id || null,
      dealer_name: bill.dealer_id ? bill.customer_name : null,
      dealer_phone: bill.dealer_id ? bill.customer_phone : null,
      dealer_address: bill.dealer_id ? bill.customer_address : null,
      dealer_gstin: bill.dealer_id ? bill.customer_gstin : null,
      items: bill.items && bill.items.length > 0 ? bill.items : [
        {
          product_name: bill.product_name || 'Water Can (20L)',
          quantity: Number(bill.quantity) || 1,
          rate: Number(bill.rate) || total,
          amount: total,
        },
      ],
      subtotal: total,
      gst_amount: 0,
      total_amount: total,
      paid_amount: Number(bill.paid_amount) || total,
      due_amount: Number(bill.due_amount) || 0,
      payment_method: bill.payment_mode || 'cash',
    }

    const res = await executePrintJob(billData, { copyType })
    if (res.success) {
      alert(`🎉 ${copyType.toUpperCase()} COPY ${billData.invoice_number} sent to printer!`)
    } else {
      alert(`Print Error: ${res.message}`)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'invoice_number',
      title: 'Invoice No',
      sortable: true,
      render: (b) => (
        <span style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
          {b.invoice_number || `INV-${b.id}`}
        </span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (b) => <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{b.date}</span>,
    },
    {
      key: 'customer_name',
      title: 'Customer',
      sortable: true,
      render: (b) => <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{b.customer_name}</span>,
    },
    {
      key: 'bill_type',
      title: 'Type',
      render: (b) => <Badge variant="neutral">{(b.bill_type || 'Sale').replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'total_amount',
      title: 'Total (₹)',
      align: 'right',
      sortable: true,
      render: (b) => (
        <span className="num" style={{ fontWeight: 800, color: '#f4f4f5' }}>
          {formatCurrency(Number(b.total_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      title: 'Paid (₹)',
      align: 'right',
      render: (b) => (
        <span className="num" style={{ color: '#34d399', fontWeight: 600 }}>
          {formatCurrency(Number(b.paid_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'due_amount',
      title: 'Due (₹)',
      align: 'right',
      render: (b) => (
        <span className="num" style={{ color: Number(b.due_amount) > 0 ? '#f87171' : '#a1a1aa' }}>
          {formatCurrency(Number(b.due_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'payment_status',
      title: 'Status',
      render: (b) => (
        <Badge variant={b.payment_status === 'paid' ? 'success' : b.payment_status === 'partial' ? 'warning' : 'danger'}>
          {b.payment_status || 'Paid'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      render: (b) => (
        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Eye style={{ width: '13px', height: '13px' }} />}
            onClick={async () => {
              // Fetch bill items if not present
              const { data: itemRows } = await supabase.from('bill_items').select('*').eq('bill_id', b.id)
              const items = itemRows && itemRows.length > 0 ? itemRows : [
                { product_name: 'Water Can 20L', quantity: 1, rate: Number(b.total_amount) || 0, amount: Number(b.total_amount) || 0 }
              ]
              setPreviewBill({ ...b, items })
            }}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer style={{ width: '13px', height: '13px' }} />}
            onClick={() => handleReprint(b)}
          >
            Print
          </Button>
        </div>
      ),
    },
  ]

  const totalSalesVal = sales.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Sales History & Billing Audit
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {sales.length} transactions recorded &bull; Total Sales Value: {' '}
            <span className="num" style={{ color: '#fbbf24', fontWeight: 800 }}>
              {formatCurrency(totalSalesVal)}
            </span>
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={<RefreshCw style={{ width: '14px', height: '14px' }} />} onClick={loadSales}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={sales}
          searchPlaceholder="Search invoices, customer names, bill types..."
          exportFileName="royal-kissan-sales-history"
        />
      )}

      {/* Bill Preview & Reprint Modal (A4, 80mm, 58mm formats) */}
      <ReceiptPreviewModal
        isOpen={!!previewBill}
        bill={previewBill}
        onClose={() => setPreviewBill(null)}
        onPrint={async (copyType) => {
          if (previewBill) {
            await handleReprint(previewBill)
          }
        }}
      />
    </div>
  )
}
