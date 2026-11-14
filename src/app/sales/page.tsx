'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, RefreshCw, Printer, Download, Eye, FileText, CheckCircle, Plus, Receipt, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import WhatsAppShareModal from '@/components/whatsapp/WhatsAppShareModal'
import { BillData } from '@/lib/printer/receipt'
import { CopyType } from '@/lib/printer/printer-config'
import { useDataSyncListener } from '@/lib/events/data-sync'

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [previewBill, setPreviewBill] = useState<any | null>(null)
  const [whatsAppBill, setWhatsAppBill] = useState<any | null>(null)
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [previewMessageText, setPreviewMessageText] = useState<string | null>(null)
  const supabase = createClient()

  useDataSyncListener(['bills', 'all'], () => { 
    loadSales() 
    if (selectedType === 'whatsapp_log') loadWhatsAppLogs()
  })

  useEffect(() => { 
    loadSales() 
  }, [])

  useEffect(() => {
    if (selectedType === 'whatsapp_log') {
      loadWhatsAppLogs()
    }
  }, [selectedType])

  async function loadWhatsAppLogs() {
    setLoadingLogs(true)
    try {
      const { data } = await supabase
        .from('whatsapp_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setWhatsappLogs(data || [])
    } catch (err) {
      console.warn(err)
    } finally {
      setLoadingLogs(false)
    }
  }

  async function loadSales() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('bills')
        .select('id, invoice_number, date, customer_name, customer_phone, customer_address, customer_gstin, dealer_id, bill_type, total_amount, paid_amount, due_amount, payment_mode, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      let merged = data || []
      try {
        const rawLocal = localStorage.getItem('rk_local_bills')
        if (rawLocal) {
          const localBills = JSON.parse(rawLocal)
          merged = [...localBills, ...merged.filter((b: any) => !localBills.some((lb: any) => lb.id === b.id || lb.invoice_number === b.invoice_number))]
        }
      } catch (e) {}

      setSales(merged)
    } catch {
      try {
        const rawLocal = localStorage.getItem('rk_local_bills')
        setSales(rawLocal ? JSON.parse(rawLocal) : [])
      } catch {
        setSales([])
      }
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

    // System print dialog is handled cleanly by ReceiptPreviewModal
    console.log(`Print job initiated for ${copyType} copy: ${billData.invoice_number}`)
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
      render: (b) => {
        const t = (b.bill_type || 'counter').toLowerCase()
        const variant = t.includes('route') ? 'info' : t.includes('dealer') ? 'warning' : t.includes('customer') ? 'info' : 'neutral'
        return <Badge variant={variant}>{t.replace(/_/g, ' ').toUpperCase()}</Badge>
      },
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
          <Button
            variant="secondary"
            size="sm"
            style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
              </svg>
            }
            onClick={async () => {
              const { data: itemRows } = await supabase.from('bill_items').select('*').eq('bill_id', b.id)
              const items = itemRows && itemRows.length > 0 ? itemRows : [
                { product_name: 'Water Can 20L', quantity: 1, rate: Number(b.total_amount) || 0, amount: Number(b.total_amount) || 0 }
              ]
              setWhatsAppBill({ ...b, items })
            }}
          >
            WhatsApp
          </Button>
        </div>
      ),
    },
  ]

  const filteredSales = selectedType === 'all' 
    ? sales 
    : sales.filter(s => (s.bill_type || '').toLowerCase().includes(selectedType))

  const totalSalesVal = filteredSales.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Sales History & Billing Audit
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {filteredSales.length} of {sales.length} transactions &bull; Total Sales: {' '}
            <span className="num" style={{ color: '#fbbf24', fontWeight: 800 }}>
              {formatCurrency(totalSalesVal)}
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a href="/billing">
            <Button variant="primary" icon={<Plus style={{ width: '15px', height: '15px' }} />}>
              Create New Bill
            </Button>
          </a>
          <Button variant="secondary" size="sm" icon={<RefreshCw style={{ width: '14px', height: '14px' }} />} onClick={loadSales}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Bill Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
        {[
          { key: 'all', label: 'All Invoices' },
          { key: 'counter', label: 'Counter Bills' },
          { key: 'customer', label: 'Customer Bills' },
          { key: 'dealer', label: 'Dealer Bills' },
          { key: 'route', label: 'Route Bills' },
          { key: 'whatsapp_log', label: '💬 WhatsApp Delivery Audit Log' }
        ].map(tab => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setSelectedType(tab.key)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: `1px solid ${selectedType === tab.key ? (tab.key === 'whatsapp_log' ? '#25D366' : '#fbbf24') : 'rgba(255,255,255,0.08)'}`,
              background: selectedType === tab.key ? (tab.key === 'whatsapp_log' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(251, 191, 36, 0.12)') : 'rgba(255,255,255,0.02)',
              color: selectedType === tab.key ? (tab.key === 'whatsapp_log' ? '#25D366' : '#fbbf24') : '#a1a1aa',
              fontSize: '0.8rem',
              fontWeight: selectedType === tab.key ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedType === 'whatsapp_log' ? (
        loadingLogs ? (
          <SkeletonTable rows={8} />
        ) : (
          <Card style={{ padding: '1.25rem', backgroundColor: '#141417', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.223-.559-1.848-.767-3.037-2.656-3.129-2.78-.093-.123-.746-.991-.746-1.888 0-.898.469-1.339.636-1.52.167-.182.366-.228.487-.228.121 0 .243.002.348.006.111.005.26-.042.407.311.152.365.518 1.265.564 1.357.045.092.076.2.015.322-.061.122-.092.199-.183.307-.091.107-.191.24-.273.322-.091.091-.186.19-.08.373.106.183.473.78 1.016 1.263.699.623 1.288.816 1.472.907.183.092.29.077.397-.046.107-.123.456-.533.578-.716.121-.183.243-.153.407-.092.164.061 1.042.492 1.22.583.178.091.297.137.34.213.045.076.045.441-.099.846z"/>
                  </svg>
                  WhatsApp Invoice &amp; Document Delivery Log
                </h3>
                <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                  Live delivery audit trail, document attachment history &amp; retry options
                </p>
              </div>

              <Button variant="secondary" size="sm" icon={<RefreshCw style={{ width: 13, height: 13 }} />} onClick={loadWhatsAppLogs}>
                Refresh Log
              </Button>
            </div>

            {whatsappLogs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#71717a' }}>
                No WhatsApp invoice messages logged yet. Use [ SEND BILL ON WHATSAPP ] from any bill preview or history row.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#a1a1aa' }}>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Invoice / Reference</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Recipient</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>PDF Filename</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Status</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Dispatched At</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Delivery Notes</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsappLogs.map(log => {
                      const isSuccess = log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ'
                      const isFailed = log.status === 'FAILED'
                      return (
                        <tr
                          key={log.id}
                          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                        >
                          <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24' }}>
                            {log.invoice_number || log.purchase_number || 'SYSTEM'}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#fff', whiteSpace: 'nowrap' }}>
                            <div>{log.recipient_phone}</div>
                            {log.recipient_name && (
                              <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>{log.recipient_name}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#93c5fd', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {log.pdf_filename || (log.message_type === 'invoice_document' ? 'Invoice.pdf' : '—')}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <Badge variant={isSuccess ? 'success' : isFailed ? 'danger' : 'warning'}>
                              {log.status}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#a1a1aa', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                            {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', maxWidth: '220px', fontSize: '0.75rem' }}>
                            {log.error_message ? (
                              <span style={{ color: '#f87171' }}>{log.error_message}</span>
                            ) : log.meta_message_id ? (
                              <span style={{ color: '#71717a', fontFamily: 'monospace' }}>ID: {log.meta_message_id.slice(0, 16)}...</span>
                            ) : (
                              <span style={{ color: '#71717a' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPreviewMessageText(log.message_content)}
                                icon={<Eye style={{ width: 12, height: 12 }} />}
                              >
                                Text
                              </Button>
                              {log.invoice_id && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  style={{ color: '#25D366' }}
                                  onClick={async () => {
                                    const { data: billRow } = await supabase.from('bills').select('*').eq('id', log.invoice_id).maybeSingle()
                                    if (billRow) {
                                      const { data: itemRows } = await supabase.from('bill_items').select('*').eq('bill_id', billRow.id)
                                      setWhatsAppBill({ ...billRow, items: itemRows || [] })
                                    }
                                  }}
                                  icon={<RefreshCw style={{ width: 12, height: 12 }} />}
                                >
                                  Resend
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
        )
      ) : loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredSales}
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

      {/* WhatsApp Invoice Document Share Modal */}
      {whatsAppBill && (
        <WhatsAppShareModal
          isOpen={!!whatsAppBill}
          onClose={() => setWhatsAppBill(null)}
          bill={whatsAppBill}
        />
      )}

      {/* Message Text Preview Modal */}
      {previewMessageText && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#18181b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>WhatsApp Message Body</h4>
              <button
                type="button"
                onClick={() => setPreviewMessageText(null)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <pre style={{ backgroundColor: '#111', padding: '1rem', borderRadius: '6px', color: '#25D366', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto', fontFamily: 'monospace' }}>
              {previewMessageText}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
