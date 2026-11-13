'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import {
  ShoppingBag,
  Plus,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Settings,
  History,
  FileText,
  IndianRupee,
  Phone,
  Package,
  Layers,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  X,
  Trash2,
  Building2,
  Smartphone
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import {
  PurchaseWithItems,
  Supplier,
  WhatsAppSettings,
  WhatsAppNotification
} from '@/lib/types/database'
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getSuppliers,
  CreatePurchaseItemInput
} from '@/lib/services/purchase-service'
import {
  validateAndFormatIndianPhone,
  formatPurchaseWhatsAppMessage,
  getWhatsAppSettings,
  saveWhatsAppSettings,
  getNotificationHistory
} from '@/lib/services/whatsapp-service'

const STANDARD_UNITS = [
  { value: 'cans', label: 'Cans (20L)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'pkts', label: 'Packets (pkts)' },
  { value: 'cases', label: 'Cases / Cartons' },
  { value: 'rolls', label: 'Rolls' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'bags', label: 'Bags' },
  { value: 'lot', label: 'Lot / Bulk' }
]

const GST_RATES = [
  { value: 0, label: '0% (Exempt)' },
  { value: 5, label: '5% GST' },
  { value: 12, label: '12% GST' },
  { value: 18, label: '18% GST' }
]

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'notifications' | 'settings'>('purchases')
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([])
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null)

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithItems | null>(null)
  const [showMessagePreview, setShowMessagePreview] = useState<string | null>(null)

  // Record Purchase Form State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const [supplierId, setSupplierId] = useState<string>('')
  const [supplierName, setSupplierName] = useState<string>('')
  const [supplierPhone, setSupplierPhone] = useState<string>('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('')
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [purchaseStatus, setPurchaseStatus] = useState<string>('COMPLETED')
  const [notes, setNotes] = useState<string>('')
  const [sendWhatsAppOnCreate, setSendWhatsAppOnCreate] = useState<boolean>(true)
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)

  // Line items in form
  const [items, setItems] = useState<CreatePurchaseItemInput[]>([
    {
      product_id: null,
      product_name: 'Water Can (20L)',
      quantity: 100,
      unit: 'cans',
      rate: 35,
      amount: 3500,
      gst_rate: 0,
      gst_amount: 0
    }
  ])

  // Manual WhatsApp Action State
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [manualWhatsAppStatus, setManualWhatsAppStatus] = useState<{
    success?: boolean
    status?: string
    message?: string
    recipient?: string
  } | null>(null)

  // Settings State
  const [settingsForm, setSettingsForm] = useState<Partial<WhatsAppSettings>>({
    enabled: true,
    default_recipient_phone: '+919347662554',
    recipient_type: 'owner',
    phone_number_id: '',
    access_token: '',
    webhook_verify_token: 'royal_kissan_webhook_token_2026'
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [testPhone, setTestPhone] = useState('+919347662554')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null)

  const supabase = createClient()

  // Real-time listener
  useDataSyncListener(['purchases', 'stock', 'all'], () => {
    loadAllData()
  })

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    try {
      const [purData, notifData, supData, prodData, settData] = await Promise.all([
        getPurchases(100),
        getNotificationHistory(100),
        getSuppliers(),
        supabase.from('products').select('id, name, unit, stock_quantity'),
        getWhatsAppSettings()
      ])

      setPurchases(purData || [])
      setNotifications(notifData || [])
      setSuppliers(supData || [])
      if (prodData.data) {
        setAvailableProducts(prodData.data)
      }
      if (settData) {
        setSettings(settData)
        setSettingsForm(settData)
        if (settData.default_recipient_phone) {
          setTestPhone(settData.default_recipient_phone)
        }
      }
    } catch (err) {
      console.error('Failed to load purchase data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals for create form
  const calculatedSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const calculatedGST = items.reduce((sum, item) => sum + (Number(item.gst_amount) || 0), 0)
  const calculatedGrandTotal = Math.max(0, calculatedSubtotal - (Number(discountAmount) || 0) + calculatedGST)
  const calculatedDue = Math.max(0, calculatedGrandTotal - (Number(paidAmount) || 0))

  // Handle supplier select
  const handleSupplierSelect = (id: string) => {
    setSupplierId(id)
    if (!id) {
      setSupplierName('')
      setSupplierPhone('')
      return
    }
    const sup = suppliers.find(s => s.id === id)
    if (sup) {
      setSupplierName(sup.name)
      setSupplierPhone(sup.phone || '')
    }
  }

  // Handle item update
  const updateItem = (index: number, updates: Partial<CreatePurchaseItemInput>) => {
    setItems(prev => {
      const copy = [...prev]
      const current = { ...copy[index], ...updates }

      // Recalculate amount
      const qty = Number(current.quantity) || 0
      const rate = Number(current.rate) || 0
      const amt = Number((qty * rate).toFixed(2))
      current.amount = amt

      // Recalculate GST
      const gstRate = Number(current.gst_rate) || 0
      const gstAmt = Number(((amt * gstRate) / 100).toFixed(2))
      current.gst_amount = gstAmt

      copy[index] = current
      return copy
    })
  }

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        product_id: null,
        product_name: '',
        quantity: 1,
        unit: 'pcs',
        rate: 0,
        amount: 0,
        gst_rate: 0,
        gst_amount: 0
      }
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Submit new purchase
  const handleSubmitPurchase = async () => {
    setFormError(null)
    setFormSuccess(null)

    if (!supplierName.trim()) {
      setFormError('Supplier Name is required.')
      return
    }

    if (items.length === 0) {
      setFormError('At least one purchase item is required.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].product_name.trim()) {
        setFormError(`Item #${i + 1} requires a product name.`)
        return
      }
      if (items[i].quantity <= 0) {
        setFormError(`Item #${i + 1} (${items[i].product_name}) quantity must be greater than 0.`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const res = await createPurchase({
        supplier_id: supplierId || null,
        supplier_name: supplierName.trim(),
        supplier_phone: supplierPhone.trim() || null,
        supplier_invoice_number: supplierInvoiceNumber.trim() || null,
        purchase_date: purchaseDate,
        subtotal: calculatedSubtotal,
        discount_amount: Number(discountAmount) || 0,
        gst_amount: calculatedGST,
        grand_total: calculatedGrandTotal,
        paid_amount: Number(paidAmount) || 0,
        due_amount: calculatedDue,
        payment_method: paymentMethod,
        purchase_status: purchaseStatus,
        notes: notes.trim() || null,
        items,
        sendWhatsAppNotification: sendWhatsAppOnCreate
      })

      if (!res.success) {
        setFormError(res.message || 'Failed to record purchase.')
        setIsSubmitting(false)
        return
      }

      setFormSuccess(`Purchase recorded successfully! ${res.whatsAppStatus?.triggered ? `WhatsApp Status: ${res.whatsAppStatus.status}` : ''}`)

      // Refresh list
      await loadAllData()

      // Reset form after short delay
      setTimeout(() => {
        setShowCreateModal(false)
        setFormSuccess(null)
        // reset fields
        setSupplierId('')
        setSupplierName('')
        setSupplierPhone('')
        setSupplierInvoiceNumber('')
        setPaidAmount(0)
        setDiscountAmount(0)
        setNotes('')
        setItems([
          {
            product_id: null,
            product_name: 'Water Can (20L)',
            quantity: 100,
            unit: 'cans',
            rate: 35,
            amount: 3500,
            gst_rate: 0,
            gst_amount: 0
          }
        ])
      }, 1200)
    } catch (err: any) {
      setFormError(`Unexpected error: ${err?.message || err}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Trigger manual WhatsApp message
  const handleManualSendWhatsApp = async (purchase: PurchaseWithItems) => {
    setIsSendingWhatsApp(true)
    setManualWhatsAppStatus(null)

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: purchase.id,
          purchaseData: purchase,
          forceResend: true
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setManualWhatsAppStatus({
          success: true,
          status: data.status || 'SENT',
          recipient: data.recipient,
          message: data.message || 'WhatsApp purchase summary successfully delivered!'
        })
      } else {
        setManualWhatsAppStatus({
          success: false,
          status: 'FAILED',
          message: data.error || data.message || 'WhatsApp message dispatch failed.'
        })
      }

      // Refresh notifications & purchase
      const [updatedHistory, updatedPur] = await Promise.all([
        getNotificationHistory(100),
        getPurchaseById(purchase.id)
      ])
      setNotifications(updatedHistory)
      if (updatedPur) setSelectedPurchase(updatedPur)
    } catch (err: any) {
      setManualWhatsAppStatus({
        success: false,
        status: 'FAILED',
        message: `Network error: ${err?.message || err}`
      })
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  // Save WhatsApp settings
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await saveWhatsAppSettings(settingsForm)
      if (res.success) {
        setSettings({ ...settings, ...settingsForm } as WhatsAppSettings)
        alert('WhatsApp settings saved successfully!')
      } else {
        alert(res.message)
      }
    } catch (err: any) {
      alert(`Error saving settings: ${err?.message || err}`)
    } finally {
      setSavingSettings(false)
    }
  }

  // Send Test WhatsApp Message
  const handleSendTestMessage = async () => {
    setIsSendingTest(true)
    setTestFeedback(null)

    const validation = validateAndFormatIndianPhone(testPhone)
    if (!validation.isValid) {
      setTestFeedback({
        success: false,
        message: validation.error || 'Please enter a valid 10-digit Indian phone number (+91)'
      })
      setIsSendingTest(false)
      return
    }

    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestFeedback({
          success: true,
          message: data.message || `Test message sent successfully to ${data.recipient}!`
        })
        const hist = await getNotificationHistory(100)
        setNotifications(hist)
      } else {
        setTestFeedback({
          success: false,
          message: data.error || data.message || 'Failed to send test message.'
        })
      }
    } catch (err: any) {
      setTestFeedback({
        success: false,
        message: `Network error: ${err?.message || err}`
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  // Filtered purchases
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch =
      !searchTerm ||
      p.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DUE' && Number(p.due_amount) > 0) ||
      (statusFilter === 'PAID' && Number(p.due_amount) === 0) ||
      p.purchase_status === statusFilter

    return matchesSearch && matchesStatus
  })

  // KPI calculations
  const totalPurchaseSpend = purchases.reduce((sum, p) => sum + (Number(p.grand_total) || 0), 0)
  const totalSupplierDue = purchases.reduce((sum, p) => sum + (Number(p.due_amount) || 0), 0)
  const totalDeliveredNotifs = notifications.filter(n => n.status === 'DELIVERED' || n.status === 'SENT' || n.status === 'READ').length

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
      case 'READ':
        return <Badge variant="success" icon={<CheckCircle2 style={{ width: 12, height: 12 }} />}>{status}</Badge>
      case 'SENT':
        return <Badge variant="info" icon={<Send style={{ width: 12, height: 12 }} />}>SENT</Badge>
      case 'QUEUED':
        return <Badge variant="warning" icon={<Clock style={{ width: 12, height: 12 }} />}>QUEUED</Badge>
      case 'FAILED':
        return <Badge variant="danger" icon={<XCircle style={{ width: 12, height: 12 }} />}>FAILED</Badge>
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>
      default:
        return <Badge variant="neutral">{status || 'UNKNOWN'}</Badge>
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: '#f4f4f5' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '10px', color: '#fbbf24' }}>
              <ShoppingBag style={{ width: 22, height: 22 }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
              Purchase Management &amp; WhatsApp Notifications
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', margin: 0 }}>
            Procure raw materials, update inventory atomically, and dispatch automated WhatsApp purchase summaries to suppliers and administrators.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={loadAllData} icon={<RefreshCw style={{ width: 15, height: 15 }} />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              // Pre-fill default values
              setPaidAmount(3500)
              setShowCreateModal(true)
            }}
            icon={<Plus style={{ width: 16, height: 16 }} />}
          >
            Record Purchase
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('purchases')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'purchases' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'purchases' ? '#fbbf24' : '#a1a1aa',
            fontWeight: activeTab === 'purchases' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShoppingBag style={{ width: 16, height: 16 }} />
          Purchases Master ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'notifications' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'notifications' ? '#fbbf24' : '#a1a1aa',
            fontWeight: activeTab === 'notifications' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <History style={{ width: 16, height: 16 }} />
          WhatsApp Delivery Audit ({notifications.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid #fbbf24' : '2px solid transparent',
            color: activeTab === 'settings' ? '#fbbf24' : '#a1a1aa',
            fontWeight: activeTab === 'settings' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Settings style={{ width: 16, height: 16 }} />
          WhatsApp Recipient &amp; API Settings
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <CardContent style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Total Purchases</span>
              <div style={{ padding: '0.35rem', background: 'rgba(37, 99, 235, 0.12)', borderRadius: '6px', color: '#60a5fa' }}>
                <ShoppingBag style={{ width: 16, height: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              ₹{totalPurchaseSpend.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              {purchases.length} total orders recorded
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Supplier Balance Due</span>
              <div style={{ padding: '0.35rem', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '6px', color: '#f87171' }}>
                <AlertTriangle style={{ width: 16, height: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalSupplierDue > 0 ? '#f87171' : '#34d399', letterSpacing: '-0.02em' }}>
              ₹{totalSupplierDue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              {purchases.filter(p => Number(p.due_amount) > 0).length} pending payments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>WhatsApp Notifications</span>
              <div style={{ padding: '0.35rem', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '6px', color: '#34d399' }}>
                <MessageSquare style={{ width: 16, height: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
              {totalDeliveredNotifs} Delivered
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              Target: {settings?.default_recipient_phone || '+919347662554'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Registered Suppliers</span>
              <div style={{ padding: '0.35rem', background: 'rgba(251, 191, 36, 0.12)', borderRadius: '6px', color: '#fbbf24' }}>
                <Building2 style={{ width: 16, height: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {suppliers.length} Vendors
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              Caps, Cans, Preforms &amp; Packaging
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TAB 1: PURCHASES MASTER */}
      {activeTab === 'purchases' && (
        <Card>
          <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <CardTitle style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Purchase Orders &amp; Material Receipts
              </CardTitle>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search invoice or supplier..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    minWidth: '220px'
                  }}
                />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="ALL">All Payments</option>
                  <option value="PAID">Fully Paid</option>
                  <option value="DUE">Outstanding Due</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                <RefreshCw className="animate-spin" style={{ width: 24, height: 24, margin: '0 auto 0.75rem' }} />
                Loading purchases from Supabase...
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                <ShoppingBag style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No purchases found.</p>
                <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.8rem', color: '#71717a' }}>Record a new purchase to increment inventory and send automatic WhatsApp notifications.</p>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>Record First Purchase</Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#121215', color: '#a1a1aa' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Purchase #</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Items</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Paid (₹)</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Due (₹)</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>WhatsApp Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((purchase) => {
                      const notif = notifications.find(n => n.purchase_id === purchase.id)
                      const isDue = Number(purchase.due_amount) > 0

                      return (
                        <tr
                          key={purchase.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background-color 150ms'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#18181b')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                            {purchase.purchase_number}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#e4e4e7', whiteSpace: 'nowrap' }}>
                            {purchase.purchase_date}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{purchase.supplier_name}</div>
                            {purchase.supplier_invoice_number && (
                              <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Inv: {purchase.supplier_invoice_number}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                            {purchase.items && purchase.items.length > 0 ? (
                              <span>
                                {purchase.items[0].product_name}
                                {purchase.items.length > 1 ? ` +${purchase.items.length - 1} more` : ''}
                              </span>
                            ) : (
                              '1 Item'
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                            ₹{Number(purchase.grand_total).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#34d399', fontWeight: 600 }}>
                            ₹{Number(purchase.paid_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: isDue ? '#f87171' : '#a1a1aa' }}>
                            ₹{Number(purchase.due_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {notif ? getStatusBadge(notif.status) : <Badge variant="neutral">NOT SENT</Badge>}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedPurchase(purchase)
                                setManualWhatsAppStatus(null)
                              }}
                              icon={<Eye style={{ width: 14, height: 14 }} />}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: WHATSAPP AUDIT TRAIL */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <CardTitle style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  WhatsApp Message Delivery Audit Log
                </CardTitle>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#71717a' }}>
                  Real-time status tracking for every automated &amp; manual WhatsApp purchase summary.
                </p>
              </div>
              <Button variant="secondary" onClick={loadAllData} icon={<RefreshCw style={{ width: 14, height: 14 }} />}>
                Refresh Log
              </Button>
            </div>
          </CardHeader>

          <CardContent style={{ padding: 0 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                <MessageSquare style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No notifications sent yet.</p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#71717a' }}>When a purchase is saved, the WhatsApp message audit will appear here.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#121215', color: '#a1a1aa' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Purchase #</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Recipient Phone</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Sent / Logged At</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Error / Notes</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notif) => (
                      <tr
                        key={notif.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background-color 150ms'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#18181b')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                          {notif.purchase_number || 'TEST-PING'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                          {notif.recipient_phone}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa' }}>
                          {notif.message_type.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {getStatusBadge(notif.status)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                          {new Date(notif.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', maxWidth: '300px', fontSize: '0.75rem' }}>
                          {notif.error_message ? (
                            <span style={{ color: '#f87171' }}>{notif.error_message}</span>
                          ) : notif.meta_message_id ? (
                            <span style={{ color: '#71717a', fontFamily: 'var(--font-mono)' }}>ID: {notif.meta_message_id.slice(0, 18)}...</span>
                          ) : (
                            <span style={{ color: '#71717a' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowMessagePreview(notif.message_content)}
                              icon={<Eye style={{ width: 12, height: 12 }} />}
                            >
                              Message
                            </Button>

                            {notif.purchase_id && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  const p = purchases.find(x => x.id === notif.purchase_id)
                                  if (p) {
                                    handleManualSendWhatsApp(p)
                                  } else {
                                    const fetched = await getPurchaseById(notif.purchase_id!)
                                    if (fetched) handleManualSendWhatsApp(fetched)
                                  }
                                }}
                                icon={<RefreshCw style={{ width: 12, height: 12 }} />}
                              >
                                Retry
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: WHATSAPP SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Main Configuration Card */}
          <Card>
            <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <CardTitle style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                WhatsApp Notification Configuration
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Enable toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#121215', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Automatic Purchase Notifications</div>
                  <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Dispatch WhatsApp messages immediately upon saving purchases</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.enabled !== false}
                  onChange={e => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#fbbf24' }}
                />
              </div>

              {/* Recipient Type */}
              <Select
                label="Notification Recipient Type"
                value={settingsForm.recipient_type || 'owner'}
                onChange={e => setSettingsForm({ ...settingsForm, recipient_type: e.target.value as any })}
                options={[
                  { value: 'owner', label: 'Owner / Administrator (Configured below)' },
                  { value: 'supplier', label: 'Supplier directly (Phone from Purchase Order)' },
                  { value: 'admin', label: 'Internal Operations Manager' },
                  { value: 'custom', label: 'Custom Mobile Number' }
                ]}
              />

              {/* Default Phone */}
              <Input
                label="Default Recipient Mobile Number (+91)"
                placeholder="e.g. +919347662554 or 9347662554"
                value={settingsForm.default_recipient_phone || ''}
                onChange={e => setSettingsForm({ ...settingsForm, default_recipient_phone: e.target.value })}
                helperText="Indian mobile number with +91 country code (Default: +919347662554 - Royal Kissan Owner)"
              />

              {/* Send to supplier copy */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="send_to_supplier"
                  checked={settingsForm.send_to_supplier || false}
                  onChange={e => setSettingsForm({ ...settingsForm, send_to_supplier: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#fbbf24' }}
                />
                <label htmlFor="send_to_supplier" style={{ fontSize: '0.85rem', color: '#e4e4e7', cursor: 'pointer' }}>
                  Also dispatch a copy to the vendor if supplier phone is provided
                </label>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1rem', color: '#fbbf24' }}>
                  Meta Cloud API Credentials (Optional / Production)
                </h4>

                <Input
                  label="WhatsApp Business Phone Number ID"
                  placeholder="e.g. 104829104928102"
                  value={settingsForm.phone_number_id || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, phone_number_id: e.target.value })}
                  helperText="Obtain from Meta App Dashboard > WhatsApp > API Setup"
                />

                <Input
                  label="System User Access Token"
                  type="password"
                  placeholder="EAAG..."
                  value={settingsForm.access_token || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, access_token: e.target.value })}
                  helperText="Permanent System User token. Stored securely on the backend."
                />

                <Input
                  label="Webhook Verify Token"
                  value={settingsForm.webhook_verify_token || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, webhook_verify_token: e.target.value })}
                  helperText="Used by Meta Developer Webhook callback verification"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Button
                  variant="primary"
                  loading={savingSettings}
                  onClick={handleSaveSettings}
                  icon={<CheckCircle2 style={{ width: 16, height: 16 }} />}
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test & Webhook Documentation Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Test WhatsApp Message */}
            <Card>
              <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <CardTitle style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  Send Test WhatsApp Message
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: 0 }}>
                  Verify your WhatsApp configuration by sending an immediate test confirmation to the target mobile number.
                </p>

                <Input
                  label="Test Mobile Number (+91)"
                  placeholder="+919347662554"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />

                <Button
                  variant="secondary"
                  loading={isSendingTest}
                  onClick={handleSendTestMessage}
                  icon={<Send style={{ width: 16, height: 16 }} />}
                >
                  Send Test Ping
                </Button>

                {testFeedback && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      backgroundColor: testFeedback.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${testFeedback.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      color: testFeedback.success ? '#34d399' : '#f87171'
                    }}
                  >
                    {testFeedback.message}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Architecture & Sandbox Mode Notes */}
            <Card>
              <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <CardTitle style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>
                  Integration Architecture &amp; Delivery Tracking
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '1.5rem', fontSize: '0.85rem', color: '#a1a1aa', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 0.75rem' }}>
                  <strong style={{ color: '#fff' }}>1. Atomic Database First:</strong> Purchases and items are stored in PostgreSQL first via <code style={{ color: '#fbbf24' }}>record_purchase_with_inventory</code>. Notifications are never triggered for failed transactions.
                </p>
                <p style={{ margin: '0 0 0.75rem' }}>
                  <strong style={{ color: '#fff' }}>2. Idempotency &amp; Duplicate Prevention:</strong> Requests within a 30-second window for the same purchase and recipient are automatically deduplicated.
                </p>
                <p style={{ margin: '0 0 0.75rem' }}>
                  <strong style={{ color: '#fff' }}>3. Live vs Sandbox:</strong> When Meta API tokens are configured, calls are dispatched to Meta Graph API v21.0. When running in development without credentials, dispatches are simulated and audited safely.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: '#fff' }}>4. Webhook Endpoint:</strong> <code style={{ color: '#60a5fa' }}>/api/whatsapp/webhook</code> handles delivery receipts (<code style={{ color: '#fff' }}>sent &rarr; delivered &rarr; read</code>).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL 1: RECORD NEW PURCHASE */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--surface-2)', zIndex: 10 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Record New Purchase Order
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0.2rem 0 0' }}>
                  Increments product inventory atomically and triggers WhatsApp confirmation
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Feedback messages */}
              {formError && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem' }}>
                  {formSuccess}
                </div>
              )}

              {/* Section 1: Supplier & Metadata */}
              <div style={{ background: '#121215', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Supplier &amp; Invoice Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <Select
                    label="Select Existing Supplier"
                    value={supplierId}
                    onChange={e => handleSupplierSelect(e.target.value)}
                    options={[
                      { value: '', label: '-- Custom / New Supplier --' },
                      ...suppliers.map(s => ({ value: s.id, label: s.name }))
                    ]}
                  />

                  <Input
                    label="Supplier Name *"
                    placeholder="e.g. Balaji Caps & Closures"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                  />

                  <Input
                    label="Supplier Phone (+91)"
                    placeholder="e.g. +919848022338"
                    value={supplierPhone}
                    onChange={e => setSupplierPhone(e.target.value)}
                  />

                  <Input
                    label="Supplier Invoice #"
                    placeholder="e.g. INV-2026-089"
                    value={supplierInvoiceNumber}
                    onChange={e => setSupplierInvoiceNumber(e.target.value)}
                  />

                  <Input
                    label="Purchase Date"
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                  />

                  <Select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    options={[
                      { value: 'CASH', label: 'Cash' },
                      { value: 'UPI', label: 'UPI / PhonePe / GPay' },
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
                      { value: 'CHEQUE', label: 'Cheque' },
                      { value: 'CREDIT_DUE', label: 'Credit / Supplier Due' }
                    ]}
                  />
                </div>
              </div>

              {/* Section 2: Purchased Items */}
              <div style={{ background: '#121215', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Purchased Items &amp; Inventory Stock
                  </h4>
                  <Button variant="secondary" size="sm" onClick={addItemRow} icon={<Plus style={{ width: 14, height: 14 }} />}>
                    Add Product
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {items.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}
                    >
                      {/* Product Name / Selection */}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Product Name</label>
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={e => {
                            const val = e.target.value
                            const matchedProd = availableProducts.find(p => p.name.toLowerCase() === val.toLowerCase())
                            updateItem(index, {
                              product_name: val,
                              product_id: matchedProd?.id || null,
                              unit: matchedProd?.unit || item.unit
                            })
                          }}
                          placeholder="e.g. Water Can (20L)"
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#09090b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem'
                          }}
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(index, { quantity: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#09090b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem'
                          }}
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Unit</label>
                        <select
                          value={item.unit}
                          onChange={e => updateItem(index, { unit: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#09090b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem'
                          }}
                        >
                          {STANDARD_UNITS.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rate */}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={e => updateItem(index, { rate: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#09090b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem'
                          }}
                        />
                      </div>

                      {/* GST */}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>GST %</label>
                        <select
                          value={item.gst_rate || 0}
                          onChange={e => updateItem(index, { gst_rate: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            backgroundColor: '#09090b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem'
                          }}
                        >
                          {GST_RATES.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Line Amount */}
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Total (₹)</label>
                        <div style={{ padding: '0.45rem 0.6rem', fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                          ₹{(item.amount + (item.gst_amount || 0)).toFixed(2)}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItemRow(index)}
                        disabled={items.length <= 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: items.length > 1 ? '#ef4444' : '#71717a',
                          cursor: items.length > 1 ? 'pointer' : 'not-allowed',
                          padding: '0.35rem',
                          marginTop: '1rem'
                        }}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Financial Summary & Automatic WhatsApp Trigger */}
              <div style={{ background: '#121215', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Financial Summary &amp; WhatsApp Trigger
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Subtotal</label>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>₹{calculatedSubtotal.toFixed(2)}</div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        backgroundColor: '#09090b',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>GST Total</label>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>₹{calculatedGST.toFixed(2)}</div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Grand Total</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}>₹{calculatedGrandTotal.toFixed(2)}</div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Paid Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={e => setPaidAmount(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        backgroundColor: '#09090b',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Remaining Due (₹)</label>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: calculatedDue > 0 ? '#f87171' : '#34d399' }}>
                      ₹{calculatedDue.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* WhatsApp Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#18181b', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                  <input
                    type="checkbox"
                    id="wa_trigger"
                    checked={sendWhatsAppOnCreate}
                    onChange={e => setSendWhatsAppOnCreate(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#fbbf24' }}
                  />
                  <label htmlFor="wa_trigger" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare style={{ width: 16, height: 16, color: '#34d399' }} />
                    <span>Automatically send WhatsApp purchase confirmation to configured recipient (<strong>{settings?.default_recipient_phone || '+919347662554'}</strong>)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', position: 'sticky', bottom: 0, backgroundColor: 'var(--surface-2)', zIndex: 10 }}>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                loading={isSubmitting}
                onClick={handleSubmitPurchase}
                icon={<CheckCircle2 style={{ width: 16, height: 16 }} />}
              >
                Save &amp; Record Purchase
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PURCHASE DETAILS & MANUAL WHATSAPP ACTION */}
      {selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                    {selectedPurchase.purchase_number}
                  </h3>
                  <Badge variant="success">{selectedPurchase.purchase_status}</Badge>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
                  Recorded on {selectedPurchase.purchase_date} &bull; Supplier: {selectedPurchase.supplier_name}
                </div>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* WhatsApp Action Banner */}
              <div style={{ padding: '1rem', background: '#121215', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare style={{ width: 16, height: 16, color: '#34d399' }} />
                    WhatsApp Purchase Notification
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
                    Recipient: {settings?.default_recipient_phone || '+919347662554'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowMessagePreview(formatPurchaseWhatsAppMessage(selectedPurchase))}
                    icon={<Eye style={{ width: 14, height: 14 }} />}
                  >
                    View Text
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={isSendingWhatsApp}
                    onClick={() => handleManualSendWhatsApp(selectedPurchase)}
                    icon={<Send style={{ width: 14, height: 14 }} />}
                  >
                    SEND WHATSAPP MESSAGE
                  </Button>
                </div>
              </div>

              {/* Status Feedback banner */}
              {manualWhatsAppStatus && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    backgroundColor: manualWhatsAppStatus.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${manualWhatsAppStatus.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    color: manualWhatsAppStatus.success ? '#34d399' : '#f87171'
                  }}
                >
                  {manualWhatsAppStatus.message}
                </div>
              )}

              {/* Line items table */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#fbbf24', textTransform: 'uppercase' }}>
                  Purchased Items ({selectedPurchase.items?.length || 0})
                </h4>
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#121215', color: '#a1a1aa', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>#</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Item Description</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Qty</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Unit</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Rate (₹)</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPurchase.items || []).map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#71717a' }}>{idx + 1}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#fff' }}>{it.product_name}</td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>{it.quantity}</td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#a1a1aa' }}>{it.unit}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>₹{Number(it.rate).toFixed(2)}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#fff' }}>₹{Number(it.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div style={{ background: '#121215', padding: '1rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>Subtotal</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>₹{Number(selectedPurchase.subtotal).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>Discount</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#a1a1aa' }}>₹{Number(selectedPurchase.discount_amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>GST Total</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#60a5fa' }}>₹{Number(selectedPurchase.gst_amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase' }}>Grand Total</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>₹{Number(selectedPurchase.grand_total).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase' }}>Paid Amount</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>₹{Number(selectedPurchase.paid_amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase' }}>Remaining Due</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: Number(selectedPurchase.due_amount) > 0 ? '#f87171' : '#34d399' }}>
                    ₹{Number(selectedPurchase.due_amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedPurchase(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MESSAGE PREVIEW */}
      {showMessagePreview && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '540px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare style={{ width: 18, height: 18, color: '#34d399' }} />
                WhatsApp Message Content
              </h3>
              <button
                onClick={() => setShowMessagePreview(null)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  color: '#e4e4e7',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {showMessagePreview}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowMessagePreview(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

