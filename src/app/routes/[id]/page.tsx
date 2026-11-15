'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  RefreshCw,
  Plus,
  DollarSign,
  Receipt,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Printer,
  Share2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Percent,
  X,
  Phone,
  Edit
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import WhatsAppShareModal from '@/components/whatsapp/WhatsAppShareModal'
import {
  getRouteCompleteDetails,
  recordRouteCustomerSale,
  recordRouteExpense,
  finalizeRouteAndGenerateBills,
  getSavedRoutes,
  getAvailableVehicles,
  updateDriverRoute,
  RouteCompleteDetails,
  RouteLoadItem,
  RouteCustomerSale,
  RouteExpenseRecord,
  SavedRoute,
  VehicleOption
} from '@/lib/services/driver-service'

export default function RouteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const routeId = params?.id as string

  const [data, setData] = useState<RouteCompleteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'sales' | 'invoices' | 'expenses' | 'settlement'
  >('inventory')

  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReconcileModal, setShowReconcileModal] = useState(false)
  const [showEditRouteModal, setShowEditRouteModal] = useState(false)
  const [selectedBillForWhatsApp, setSelectedBillForWhatsApp] = useState<any | null>(null)

  // Edit Route State
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [vehiclesList, setVehiclesList] = useState<VehicleOption[]>([])
  const [editRouteForm, setEditRouteForm] = useState({
    route_id: '',
    route_name: '',
    vehicle_id: '',
    vehicle_number: '',
    dispatch_date: '',
    start_time: '',
    start_location: '',
    destination_areas: '',
    notes: ''
  })
  const [savingEditRoute, setSavingEditRoute] = useState(false)

  // Spot Sale form
  const [saleForm, setSaleForm] = useState({
    product_name: '',
    quantity: 1,
    unit: 'Units',
    rate: 0,
    discount: 0,
    payment_type: 'CASH' as 'CASH' | 'UPI' | 'CREDIT',
    customer_name: '',
    customer_phone: '',
    remarks: ''
  })
  const [savingSale, setSavingSale] = useState(false)

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    fuel_charges: 0,
    driver_bata: 0,
    toll_charges: 0,
    maintenance_charges: 0,
    other_expenses: 0,
    notes: ''
  })
  const [savingExpense, setSavingExpense] = useState(false)

  // Reconcile & End Route form
  const [reconcileItems, setReconcileItems] = useState<Array<{
    product_name: string
    loaded_qty: number
    sold_qty: number
    returned_good_qty: number
    leaked_damaged_qty: number
    unaccounted_qty: number
    unit: string
    selling_rate: number
  }>>([])
  const [discrepancyReason, setDiscrepancyReason] = useState('')
  const [finalizingRoute, setFinalizingRoute] = useState(false)

  useEffect(() => {
    if (routeId) {
      loadRouteData()
    }
  }, [routeId])

  async function loadRouteData() {
    setLoading(true)
    try {
      const [res, sRoutes, vList] = await Promise.all([
        getRouteCompleteDetails(routeId),
        getSavedRoutes(),
        getAvailableVehicles()
      ])
      setData(res)
      setSavedRoutes(sRoutes)
      setVehiclesList(vList)

      if (res && res.items) {
        // Initialize reconciliation items based on loaded items and existing sales
        const initRec = res.items.map(item => {
          const itemSales = (res.sales || [])
            .filter(s => s.product_name === item.product_name)
            .reduce((sum, s) => sum + Number(s.quantity || 0), 0)

          const loaded = Number(item.loaded_quantity || 0)
          const sold = itemSales || Number(item.sold_quantity || 0)
          const returned = Number(item.returned_quantity || 0)
          const leaked = Number(item.leaked_quantity || 0)
          const unaccounted = loaded - (sold + returned + leaked)

          return {
            product_name: item.product_name,
            loaded_qty: loaded,
            sold_qty: sold,
            returned_good_qty: returned,
            leaked_damaged_qty: leaked,
            unaccounted_qty: unaccounted,
            unit: item.unit || 'Units',
            selling_rate: Number(item.rate || 0)
          }
        })
        setReconcileItems(initRec)

        // Set default product for spot sale if available
        if (res.items.length > 0 && !saleForm.product_name) {
          setSaleForm(prev => ({
            ...prev,
            product_name: res.items[0].product_name,
            rate: Number(res.items[0].rate || 0),
            unit: res.items[0].unit || 'Units'
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load route details:', err)
    } finally {
      setLoading(false)
    }
  }

  // Edit Route actions
  function openEditRouteModal() {
    if (!data?.dispatch) return
    const d = data.dispatch
    const matchedVehicle = vehiclesList.find(v => 
      (d.vehicle_id && v.id === d.vehicle_id) || 
      (d.vehicle_number && v.registration_number.toLowerCase() === d.vehicle_number.toLowerCase())
    )

    setEditRouteForm({
      route_id: d.route_id || '',
      route_name: d.route_name || '',
      vehicle_id: matchedVehicle?.id || d.vehicle_id || '',
      vehicle_number: d.vehicle_number || '',
      dispatch_date: d.dispatch_date || '',
      start_time: d.start_time || '08:30 AM',
      start_location: d.start_location || 'Main Factory Warehouse',
      destination_areas: d.destination_areas || '',
      notes: d.notes || ''
    })
    setShowEditRouteModal(true)
  }

  async function handleEditRouteSubmit() {
    if (!data?.dispatch) return
    if (!editRouteForm.route_id) {
      alert('Route Name is mandatory. Please select a route from the saved routes database list.')
      return
    }

    setSavingEditRoute(true)
    try {
      const vId = editRouteForm.vehicle_id || null
      let vNum = editRouteForm.vehicle_number?.trim() || null
      if (vNum === 'Not Assigned' || vNum === '') {
        vNum = null
      }

      const res = await updateDriverRoute({
        dispatch_id: data.dispatch.id,
        route_id: editRouteForm.route_id,
        route_name: editRouteForm.route_name,
        driver_id: data.dispatch.driver_id,
        vehicle_id: vId,
        vehicle_number: vNum,
        dispatch_date: editRouteForm.dispatch_date,
        start_time: editRouteForm.start_time,
        start_location: editRouteForm.start_location,
        destination_areas: editRouteForm.destination_areas,
        notes: editRouteForm.notes
      })

      if (!res.success) {
        alert(res.message || 'Failed to update route details')
        return
      }

      setShowEditRouteModal(false)
      await loadRouteData()
      alert('Route details updated successfully!')
    } catch (err: any) {
      alert('Error updating route: ' + (err?.message || err))
    } finally {
      setSavingEditRoute(false)
    }
  }

  // Handle Spot Sale submit
  async function handleRecordSaleSubmit() {
    if (!data?.dispatch) return
    if (!saleForm.customer_name.trim()) {
      alert('Customer Name is required')
      return
    }
    if (saleForm.quantity <= 0) {
      alert('Quantity must be greater than 0')
      return
    }

    const itemTotal = saleForm.quantity * saleForm.rate - (saleForm.discount || 0)
    let cashPaid = 0
    let upiPaid = 0
    let dueAmount = 0

    if (saleForm.payment_type === 'CASH') {
      cashPaid = itemTotal
      upiPaid = 0
      dueAmount = 0
    } else if (saleForm.payment_type === 'UPI') {
      cashPaid = 0
      upiPaid = itemTotal
      dueAmount = 0
    } else {
      // CREDIT
      cashPaid = 0
      upiPaid = 0
      dueAmount = itemTotal
    }

    setSavingSale(true)
    try {
      const res = await recordRouteCustomerSale({
        dispatch_id: data.dispatch.id,
        driver_id: data.dispatch.driver_id,
        route_id: data.dispatch.route_id,
        customer_name: saleForm.customer_name.trim(),
        customer_phone: saleForm.customer_phone.trim() || null,
        product_name: saleForm.product_name,
        quantity: Number(saleForm.quantity),
        unit: saleForm.unit,
        rate: Number(saleForm.rate),
        total_amount: itemTotal,
        discount: Number(saleForm.discount || 0),
        payment_type: saleForm.payment_type,
        cash_paid: cashPaid,
        upi_paid: upiPaid,
        due_amount: dueAmount,
        remarks: saleForm.remarks.trim() || null
      })

      if (res.success) {
        setShowSaleModal(false)
        setSaleForm(prev => ({
          ...prev,
          customer_name: '',
          customer_phone: '',
          quantity: 1,
          discount: 0,
          remarks: ''
        }))
        await loadRouteData()
      } else {
        alert(res.message || 'Failed to record spot sale')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while saving the sale')
    } finally {
      setSavingSale(false)
    }
  }

  // Handle Expense submit
  async function handleExpenseSubmit() {
    if (!data?.dispatch) return
    const totalExp = Number(expenseForm.fuel_charges || 0) +
      Number(expenseForm.driver_bata || 0) +
      Number(expenseForm.toll_charges || 0) +
      Number(expenseForm.maintenance_charges || 0) +
      Number(expenseForm.other_expenses || 0)

    if (totalExp <= 0) {
      alert('Please enter at least one expense amount')
      return
    }

    setSavingExpense(true)
    try {
      const res = await recordRouteExpense({
        dispatch_id: data.dispatch.id,
        driver_id: data.dispatch.driver_id,
        route_id: data.dispatch.route_id,
        fuel_charges: Number(expenseForm.fuel_charges || 0),
        driver_bata: Number(expenseForm.driver_bata || 0),
        other_expenses: Number(expenseForm.other_expenses || 0) + Number(expenseForm.toll_charges || 0) + Number(expenseForm.maintenance_charges || 0),
        remarks: expenseForm.notes.trim() || (expenseForm.toll_charges > 0 ? `Toll: ₹${expenseForm.toll_charges}` : null)
      })

      if (res.success) {
        setShowExpenseModal(false)
        setExpenseForm({
          fuel_charges: 0,
          driver_bata: 0,
          toll_charges: 0,
          maintenance_charges: 0,
          other_expenses: 0,
          notes: ''
        })
        await loadRouteData()
      } else {
        alert(res.message || 'Failed to log expense')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while saving expense')
    } finally {
      setSavingExpense(false)
    }
  }

  // Handle Reconcile and End Route
  async function handleFinalizeRouteSubmit() {
    if (!data?.dispatch) return

    const totalLoaded = reconcileItems.reduce((acc, it) => acc + Number(it.loaded_qty), 0)
    const totalSold = reconcileItems.reduce((acc, it) => acc + Number(it.sold_qty), 0)
    const totalReturned = reconcileItems.reduce((acc, it) => acc + Number(it.returned_good_qty), 0)
    const totalLeaked = reconcileItems.reduce((acc, it) => acc + Number(it.leaked_damaged_qty), 0)
    const totalUnaccounted = totalLoaded - (totalSold + totalReturned + totalLeaked)

    if (totalUnaccounted !== 0 && !discrepancyReason.trim()) {
      alert(`Discrepancy detected: ${totalUnaccounted} units are unaccounted for. Please provide an explanation note.`)
      return
    }

    const cashCollected = Number(data.dispatch.cash_collected || 0)
    const upiCollected = Number(data.dispatch.upi_collected || 0)
    const creditSales = Number(data.dispatch.credit_amount || 0)
    const expensesAmt = Number(data.dispatch.expenses_amount || 0)
    const totalSalesAmt = Number(data.dispatch.total_sales_amount || 0)

    setFinalizingRoute(true)
    try {
      const res = await finalizeRouteAndGenerateBills({
        load_dispatch_id: data.dispatch.id,
        driver_id: data.dispatch.driver_id,
        route_id: data.dispatch.route_id,
        route_name: data.dispatch.route_name,
        settlement_date: new Date().toISOString().split('T')[0],
        end_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        total_loaded_qty: totalLoaded,
        total_sold_qty: totalSold,
        total_returned_qty: totalReturned,
        total_leaked_qty: totalLeaked,
        unaccounted_qty: totalUnaccounted,
        cash_collected: cashCollected,
        upi_collected: upiCollected,
        credit_sales_amount: creditSales,
        route_expenses_amount: expensesAmt,
        expected_collection: totalSalesAmt,
        actual_collection: cashCollected + upiCollected,
        collection_difference: (cashCollected + upiCollected) - totalSalesAmt,
        discrepancy_reason: discrepancyReason || null,
        confirmed_by: 'Operations Supervisor',
        items: reconcileItems.map(it => ({
          product_name: it.product_name,
          loaded_qty: it.loaded_qty,
          sold_qty: it.sold_qty,
          returned_good_qty: it.returned_good_qty,
          leaked_damaged_qty: it.leaked_damaged_qty,
          rate: it.selling_rate
        })),
        customer_sales: data.sales || []
      })

      if (res.success) {
        setShowReconcileModal(false)
        await loadRouteData()
        alert('Route reconciled and closed successfully! Official customer bills generated.')
      } else {
        alert(res.message || 'Route finalization failed')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during route reconciliation')
    } finally {
      setFinalizingRoute(false)
    }
  }

  // WhatsApp summary to driver
  function sendDriverSummaryWhatsApp() {
    if (!data?.driver?.phone) {
      alert('No mobile number found for this driver')
      return
    }
    const d = data.dispatch
    const phone = data.driver.phone.replace(/[^0-9]/g, '')
    const targetPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone}`

    const msg = `*ROYAL KISSAN — ROUTE SUMMARY*\n` +
      `Route: ${d.route_name || d.dispatch_number}\n` +
      `Driver: ${data.driver.name}\n` +
      `Vehicle: ${d.vehicle_number || 'Not Assigned'}\n` +
      `Date: ${d.dispatch_date}\n\n` +
      `*Physical Breakdown:*\n` +
      `• Loaded: ${d.total_loaded_qty} units\n` +
      `• Sold: ${d.total_sold_qty || 0} units\n` +
      `• Good Returns: ${d.total_returned_qty || 0} units\n` +
      `• Damage/Leakage: ${d.total_leaked_qty || 0} units\n\n` +
      `*Collections & Settlement:*\n` +
      `• Total Sales: ₹${Number(d.total_sales_amount || 0).toLocaleString('en-IN')}\n` +
      `• Cash Collected: ₹${Number(d.cash_collected || 0).toLocaleString('en-IN')}\n` +
      `• UPI Collected: ₹${Number(d.upi_collected || 0).toLocaleString('en-IN')}\n` +
      `• Expenses Deducted: ₹${Number(d.expenses_amount || 0).toLocaleString('en-IN')}\n` +
      `• *Net Cash Handover:* ₹${(Number(d.cash_collected || 0) - Number(d.expenses_amount || 0)).toLocaleString('en-IN')}\n\n` +
      `Thank you for delivering with Royal Kissan!`

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/routes')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        </div>
        <SkeletonTable rows={8} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Route Dispatch Not Found</h2>
        <p className="text-sm text-gray-500">
          The route reference {routeId} could not be located in the database.
        </p>
        <Button onClick={() => router.push('/routes')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Routes
        </Button>
      </div>
    )
  }

  const { dispatch, driver, vehicle, items, sales, expenses, settlement, generatedBills } = data
  const isRouteActive = dispatch.status === 'IN_PROGRESS' || dispatch.status === 'ISSUED'

  const totalLoaded = items.reduce((acc, i) => acc + Number(i.loaded_quantity || 0), 0)
  const totalSold = (sales || []).reduce((acc, s) => acc + Number(s.quantity || 0), 0)
  const totalReturns = items.reduce((acc, i) => acc + Number(i.returned_quantity || 0), 0)
  const totalLeakage = items.reduce((acc, i) => acc + Number(i.leaked_quantity || 0), 0)
  const totalUnaccounted = totalLoaded - (totalSold + totalReturns + totalLeakage)

  const totalSalesVal = Number(dispatch.total_sales_amount || 0)
  const cashCollected = Number(dispatch.cash_collected || 0)
  const upiCollected = Number(dispatch.upi_collected || 0)
  const creditSales = Number(dispatch.credit_amount || 0)
  const totalExpenses = Number(dispatch.expenses_amount || 0)
  const netCashHandover = Math.max(0, cashCollected - totalExpenses)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-emerald-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/routes" className="hover:text-emerald-600 transition-colors">
            Routes & Operations
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">
            {dispatch.dispatch_number}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRouteData}
            title="Refresh route details"
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
            Print Summary
          </Button>
          {driver?.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={sendDriverSummaryWhatsApp}
              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              WhatsApp Driver
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <Card className="p-6 border-l-4 border-l-emerald-600 shadow-sm bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-700 dark:text-emerald-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {dispatch.route_name || 'Daily Route Dispatch'}
                  <Badge
                    variant={
                      dispatch.status === 'COMPLETED' || dispatch.status === 'SETTLED'
                        ? 'success'
                        : dispatch.status === 'IN_PROGRESS' || dispatch.status === 'ISSUED'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {dispatch.status}
                  </Badge>
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  Reference: #{dispatch.dispatch_number} • Date: {dispatch.dispatch_date}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons for Active Route */}
          {isRouteActive ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openEditRouteModal}
              >
                <Edit className="w-4 h-4 mr-1.5 text-blue-500" />
                Edit Route
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpenseModal(true)}
              >
                <DollarSign className="w-4 h-4 mr-1.5 text-amber-600" />
                Log Expense
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaleModal(true)}
              >
                <Plus className="w-4 h-4 mr-1.5 text-blue-600" />
                Record Spot Sale
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowReconcileModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Reconcile & End Route
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="px-3 py-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 mr-1 inline" />
                Settled & Invoices Generated ({generatedBills?.length || 0})
              </Badge>
            </div>
          )}
        </div>

        {/* 4 Metadata Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {/* Driver Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Assigned Driver</span>
            <div className="mt-1 flex items-center justify-between">
              {driver ? (
                <Link
                  href={`/drivers/${driver.id}`}
                  className="font-semibold text-gray-900 dark:text-white hover:text-emerald-600 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  {driver.name}
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </Link>
              ) : (
                <span className="font-semibold text-gray-900 dark:text-white">
                  {dispatch.driver_name}
                </span>
              )}
            </div>
            {driver?.phone && (
              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {driver.phone}
              </span>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Assigned Vehicle</span>
            <div className="mt-1 flex items-center justify-between">
              {dispatch.vehicle_number && dispatch.vehicle_number !== 'Not Assigned' ? (
                <Link
                  href="/vehicles"
                  className="font-semibold text-gray-900 dark:text-white hover:text-emerald-600 flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4 text-emerald-600" />
                  {dispatch.vehicle_number}
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </Link>
              ) : (
                <span className="font-semibold text-gray-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-gray-400" />
                  Not Assigned
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">
              {dispatch.vehicle_number && dispatch.vehicle_number !== 'Not Assigned'
                ? `${vehicle?.vehicle_type || 'Commercial Fleet'} • Cap: ${vehicle?.capacity || 'N/A'}`
                : 'No vehicle allocated for this route'}
            </span>
          </div>

          {/* Schedule / Timing */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Route Schedule</span>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              {dispatch.start_time || '08:00 AM'} → {dispatch.end_time || (isRouteActive ? 'In Transit' : 'Completed')}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Date: {dispatch.dispatch_date}
            </span>
          </div>

          {/* Destination Area */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 font-medium">Route Coverage</span>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate" title={dispatch.destination_areas || dispatch.route_name || ''}>
                {dispatch.destination_areas || dispatch.route_name || 'General Distribution Area'}
              </span>
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Origin: {dispatch.start_location || 'Central Warehouse'}
            </span>
          </div>
        </div>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 block">Total Loaded</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">
            {totalLoaded}
          </span>
          <span className="text-[11px] text-gray-400">₹{Number(dispatch.total_load_value || 0).toLocaleString('en-IN')} val</span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 block">Units Sold</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {totalSold}
          </span>
          <span className="text-[11px] text-gray-400">{sales?.length || 0} spot sales</span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 block">Returns (Good)</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
            {totalReturns}
          </span>
          <span className="text-[11px] text-gray-400">Back in inventory</span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 block">Damaged / Leaked</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
            {totalLeakage}
          </span>
          <span className="text-[11px] text-gray-400">Logged to leakages</span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500 block">Total Sales</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">
            ₹{totalSalesVal.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-gray-400">₹{creditSales.toLocaleString('en-IN')} credit</span>
        </Card>

        <Card className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">Net Cash Handover</span>
          <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            ₹{netCashHandover.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-emerald-600">After ₹{totalExpenses.toLocaleString('en-IN')} exp</span>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Loaded Inventory & Balance ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'sales'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Customer Sales ({sales?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Generated Bills ({generatedBills?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Route Expenses ({expenses?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'settlement'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Settlement & Audit
        </button>
      </div>

      {/* Tab 1: Loaded Inventory & Physical Reconciliation */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Physical Equation Banner */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <h4 className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-2">
              Physical Balance Reconciliation Check
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
              <span className="px-2.5 py-1 bg-white dark:bg-gray-800 border rounded font-bold">
                Loaded: {totalLoaded}
              </span>
              <span>=</span>
              <span className="px-2.5 py-1 bg-white dark:bg-gray-800 border rounded font-semibold text-emerald-600">
                Sold: {totalSold}
              </span>
              <span>+</span>
              <span className="px-2.5 py-1 bg-white dark:bg-gray-800 border rounded font-semibold text-blue-600">
                Returns: {totalReturns}
              </span>
              <span>+</span>
              <span className="px-2.5 py-1 bg-white dark:bg-gray-800 border rounded font-semibold text-amber-600">
                Leakage: {totalLeakage}
              </span>
              <span>+</span>
              <span className={`px-2.5 py-1 bg-white dark:bg-gray-800 border rounded font-bold ${
                totalUnaccounted === 0 ? 'text-gray-600' : 'text-red-600'
              }`}>
                Unaccounted: {totalUnaccounted}
              </span>
            </div>
            {settlement?.discrepancy_reason && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
                <strong>Discrepancy Note:</strong> {settlement.discrepancy_reason}
              </p>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Loaded Products Checklist</h3>
              <span className="text-xs text-gray-500 font-mono">Total {items.length} items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3 text-right">Loaded Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Total Value</th>
                    <th className="p-3 text-right">Sold Qty</th>
                    <th className="p-3 text-right">Good Returns</th>
                    <th className="p-3 text-right">Leakage / Damaged</th>
                    <th className="p-3 text-right">Unaccounted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item, idx) => {
                    const itemSales = (sales || [])
                      .filter(s => s.product_name === item.product_name)
                      .reduce((sum, s) => sum + Number(s.quantity || 0), 0)
                    const sold = itemSales || Number(item.sold_quantity || 0)
                    const returned = Number(item.returned_quantity || 0)
                    const leaked = Number(item.leaked_quantity || 0)
                    const loaded = Number(item.loaded_quantity || 0)
                    const unacc = loaded - (sold + returned + leaked)

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          {item.product_name}
                        </td>
                        <td className="p-3 text-gray-500">{item.unit || 'Units'}</td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                          {loaded}
                        </td>
                        <td className="p-3 text-right">₹{Number(item.rate || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-medium">
                          ₹{(loaded * Number(item.rate || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-600">
                          {sold}
                        </td>
                        <td className="p-3 text-right font-semibold text-blue-600">
                          {returned}
                        </td>
                        <td className="p-3 text-right font-semibold text-amber-600">
                          {leaked}
                        </td>
                        <td className={`p-3 text-right font-bold ${unacc === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                          {unacc}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Customer Sales */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Customer Spot Sales on Route
            </h3>
            {isRouteActive && (
              <Button size="sm" onClick={() => setShowSaleModal(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Record Spot Sale
              </Button>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Payment Mode</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sales && sales.length > 0 ? (
                    sales.map((sale, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          {sale.customer_name}
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {sale.customer_phone || 'Walk-in'}
                        </td>
                        <td className="p-3">{sale.product_name}</td>
                        <td className="p-3 text-right font-medium">{sale.quantity} {sale.unit}</td>
                        <td className="p-3 text-right">₹{Number(sale.rate || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">
                          ₹{Number(sale.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              sale.payment_type === 'CASH'
                                ? 'success'
                                : sale.payment_type === 'UPI'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {sale.payment_type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium text-emerald-600">
                          ₹{(Number(sale.cash_paid || 0) + Number(sale.upi_paid || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className={`p-3 text-right font-bold ${Number(sale.due_amount || 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          ₹{Number(sale.due_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400">
                        No customer spot sales recorded for this route yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Generated Bills */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Official Generated Customer Invoices
              </h3>
              <p className="text-xs text-gray-500">
                Official bills stored in billing ledger and linked directly to this route.
              </p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Invoice Number</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Payment Mode</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {generatedBills && generatedBills.length > 0 ? (
                    generatedBills.map((bill, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="p-3 font-mono font-bold text-gray-900 dark:text-white">
                          #{bill.invoice_number}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold block text-gray-900 dark:text-white">
                            {bill.customer_name}
                          </span>
                          <span className="text-xs text-gray-400">{bill.customer_phone}</span>
                        </td>
                        <td className="p-3 text-xs text-gray-500">{bill.date}</td>
                        <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                          ₹{Number(bill.grand_total || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="neutral">{bill.payment_mode || 'CASH'}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={bill.payment_status === 'paid' ? 'success' : 'warning'}
                          >
                            {bill.payment_status || 'PAID'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBillForWhatsApp(bill)}
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            >
                              <Share2 className="w-3.5 h-3.5 mr-1" />
                              WhatsApp Bill
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        {isRouteActive
                          ? 'Official invoices will be generated atomically upon route settlement and reconciliation.'
                          : 'No generated invoices found for this route.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Route Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Route Incidentals & Expenses
            </h3>
            {isRouteActive && (
              <Button size="sm" onClick={() => setShowExpenseModal(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Log Route Expense
              </Button>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Expense Category</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Notes / Voucher Details</th>
                    <th className="p-3 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {expenses && expenses.length > 0 ? (
                    expenses.map((exp, idx) => {
                      const totalLine = Number(exp.fuel_charges || 0) +
                        Number(exp.driver_bata || 0) +
                        Number(exp.other_expenses || 0)

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="p-3">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {Number(exp.fuel_charges || 0) > 0 && `Fuel: ₹${exp.fuel_charges} `}
                              {Number(exp.driver_bata || 0) > 0 && `Bata: ₹${exp.driver_bata} `}
                              {Number(exp.other_expenses || 0) > 0 && `Other/Toll: ₹${exp.other_expenses}`}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-amber-600">
                            ₹{totalLine.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-gray-500 text-xs">{exp.remarks || '—'}</td>
                          <td className="p-3 text-right text-xs text-gray-400">
                            {exp.created_at ? new Date(exp.created_at).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        No expenses logged for this route dispatch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Settlement & Audit */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Reconciliation Breakdown */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Financial Collection Reconciliation
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Gross Sales Value:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{totalSalesVal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Cash Collected:</span>
                  <span className="font-semibold text-emerald-600">
                    + ₹{cashCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">UPI Collected:</span>
                  <span className="font-semibold text-blue-600">
                    + ₹{upiCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Credit / Due from Customers:</span>
                  <span className="font-semibold text-amber-600">
                    ₹{creditSales.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Route Incidentals Deducted:</span>
                  <span className="font-semibold text-red-500">
                    - ₹{totalExpenses.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-lg font-bold text-emerald-800 dark:text-emerald-200">
                  <span>Net Physical Cash Handover to Cashier:</span>
                  <span>₹{netCashHandover.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Card>

            {/* Audit & Settlement Record */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Settlement Status & Record
              </h3>
              {settlement ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Settlement Number:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      #{settlement.settlement_number}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Settled On:</span>
                    <span className="text-gray-900 dark:text-white">
                      {settlement.settlement_date}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Confirmed By:</span>
                    <span className="text-gray-900 dark:text-white">
                      {settlement.confirmed_by || 'Operations Supervisor'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Cash Difference:</span>
                    <span className={`font-bold ${Number(settlement.collection_difference || 0) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{Number(settlement.collection_difference || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Bills Generated:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {settlement.bills_generated_count || generatedBills?.length || 0} bills
                    </span>
                  </div>
                  {settlement.discrepancy_reason && (
                    <div className="pt-2">
                      <span className="text-xs text-gray-500 block mb-1">Supervisor Notes / Discrepancy Reason:</span>
                      <p className="text-xs bg-gray-50 dark:bg-gray-800 p-2.5 rounded text-gray-700 dark:text-gray-300">
                        {settlement.discrepancy_reason}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This route is currently in progress. Final reconciliation and audit numbers will be locked upon route completion.
                  </p>
                  {isRouteActive && (
                    <Button onClick={() => setShowReconcileModal(true)}>
                      Reconcile & Finalize Route Now
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Spot Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Record Customer Spot Sale
              </h3>
              <button onClick={() => setShowSaleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kirana Store"
                  value={saleForm.customer_name}
                  onChange={e => setSaleForm({ ...saleForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={saleForm.customer_phone}
                  onChange={e => setSaleForm({ ...saleForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product *
                </label>
                <select
                  value={saleForm.product_name}
                  onChange={e => {
                    const sel = items.find(i => i.product_name === e.target.value)
                    setSaleForm({
                      ...saleForm,
                      product_name: e.target.value,
                      rate: Number(sel?.rate || 0),
                      unit: sel?.unit || 'Units'
                    })
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                >
                  {items.map((it, idx) => (
                    <option key={idx} value={it.product_name}>
                      {it.product_name} (Loaded: {it.loaded_quantity} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={saleForm.quantity}
                    onChange={e => setSaleForm({ ...saleForm, quantity: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selling Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={saleForm.rate}
                    onChange={e => setSaleForm({ ...saleForm, rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={saleForm.discount}
                    onChange={e => setSaleForm({ ...saleForm, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={saleForm.payment_type}
                    onChange={e => setSaleForm({ ...saleForm, payment_type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CREDIT">CREDIT / DUE</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs flex justify-between font-bold">
                <span>Calculated Total:</span>
                <span className="text-emerald-600">
                  ₹{(saleForm.quantity * saleForm.rate - (saleForm.discount || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowSaleModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRecordSaleSubmit}
                loading={savingSale}
              >
                Save Spot Sale
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Log Route Incidental Expense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fuel Charges (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expenseForm.fuel_charges}
                    onChange={e => setExpenseForm({ ...expenseForm, fuel_charges: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Driver Bata / Food (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expenseForm.driver_bata}
                    onChange={e => setExpenseForm({ ...expenseForm, driver_bata: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Toll Charges (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expenseForm.toll_charges}
                    onChange={e => setExpenseForm({ ...expenseForm, toll_charges: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Other / Repairs (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={expenseForm.other_expenses}
                    onChange={e => setExpenseForm({ ...expenseForm, other_expenses: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Voucher Notes / Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. HP Petrol Pump receipt #1042"
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowExpenseModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExpenseSubmit}
                loading={savingExpense}
              >
                Log Expense
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reconcile & End Route Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <Card className="max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Physical Stock Reconciliation & Final Settlement
                </h3>
                <p className="text-xs text-gray-500">
                  Verify stock returned to warehouse, generate official customer bills, and close the route.
                </p>
              </div>
              <button onClick={() => setShowReconcileModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1">
              {reconcileItems.map((item, idx) => {
                const unacc = item.loaded_qty - (item.sold_qty + item.returned_good_qty + item.leaked_damaged_qty)
                return (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-2 border">
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white text-xs">
                      <span>{item.product_name}</span>
                      <span>Loaded: {item.loaded_qty} {item.unit}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-gray-500 block mb-0.5">Sold Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={item.sold_qty}
                          onChange={e => {
                            const val = Number(e.target.value)
                            const copy = [...reconcileItems]
                            copy[idx].sold_qty = val
                            copy[idx].unaccounted_qty = copy[idx].loaded_qty - (val + copy[idx].returned_good_qty + copy[idx].leaked_damaged_qty)
                            setReconcileItems(copy)
                          }}
                          className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-900 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-0.5">Good Returns</label>
                        <input
                          type="number"
                          min="0"
                          value={item.returned_good_qty}
                          onChange={e => {
                            const val = Number(e.target.value)
                            const copy = [...reconcileItems]
                            copy[idx].returned_good_qty = val
                            copy[idx].unaccounted_qty = copy[idx].loaded_qty - (copy[idx].sold_qty + val + copy[idx].leaked_damaged_qty)
                            setReconcileItems(copy)
                          }}
                          className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-900 text-xs font-semibold text-blue-600"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-0.5">Damage / Leak</label>
                        <input
                          type="number"
                          min="0"
                          value={item.leaked_damaged_qty}
                          onChange={e => {
                            const val = Number(e.target.value)
                            const copy = [...reconcileItems]
                            copy[idx].leaked_damaged_qty = val
                            copy[idx].unaccounted_qty = copy[idx].loaded_qty - (copy[idx].sold_qty + copy[idx].returned_good_qty + val)
                            setReconcileItems(copy)
                          }}
                          className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-900 text-xs font-semibold text-amber-600"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-0.5">Unaccounted</label>
                        <div className={`px-2 py-1 border rounded text-xs font-bold text-center ${
                          unacc === 0 ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {unacc}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Discrepancy Explanation / Supervisor Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Required if any units are unaccounted for"
                  value={discrepancyReason}
                  onChange={e => setDiscrepancyReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>

              {/* Financial Summary */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cash Collected:</span>
                  <span className="font-semibold text-emerald-700">₹{cashCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">UPI Collected:</span>
                  <span className="font-semibold text-blue-700">₹{upiCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Route Expenses:</span>
                  <span className="font-semibold text-red-600">- ₹{totalExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                  <span>Cash Handover to Counter:</span>
                  <span>₹{netCashHandover.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowReconcileModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleFinalizeRouteSubmit}
                loading={finalizingRoute}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirm Settlement & Generate Bills
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Route Assignment Modal */}
      {showEditRouteModal && data?.dispatch && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-amber-500/30">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                  <Edit className="w-5 h-5 text-amber-500" />
                  Edit Route Assignment
                </h3>
                <p className="text-xs text-gray-500">
                  Update route name, assigned vehicle, schedule, or destination
                </p>
              </div>
              <button onClick={() => setShowEditRouteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              {/* Mandatory Route Name Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wider">
                  Route Name * (Mandatory - Select from Saved Routes)
                </label>
                <select
                  value={editRouteForm.route_id}
                  onChange={(e) => {
                    const rId = e.target.value
                    const found = savedRoutes.find(r => r.id === rId)
                    if (found) {
                      setEditRouteForm(prev => ({
                        ...prev,
                        route_id: found.id,
                        route_name: found.name,
                        destination_areas: prev.destination_areas || found.area || found.name
                      }))
                    } else {
                      setEditRouteForm(prev => ({
                        ...prev,
                        route_id: '',
                        route_name: ''
                      }))
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm font-medium ${
                    !editRouteForm.route_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <option value="">-- Select Saved Route (Required) --</option>
                  {savedRoutes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.area ? `(Area: ${r.area})` : ''}
                    </option>
                  ))}
                </select>
                {!editRouteForm.route_id ? (
                  <span className="text-xs text-red-500 mt-1 block">
                    * Required: Route Name must be selected from the database list.
                  </span>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">
                    ✓ Canonical Route: {editRouteForm.route_name}
                  </span>
                )}
              </div>

              {/* Assigned Vehicle (Optional Dropdown) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Assigned Vehicle <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <select
                  value={editRouteForm.vehicle_id}
                  onChange={(e) => {
                    const vId = e.target.value
                    if (!vId) {
                      setEditRouteForm(prev => ({
                        ...prev,
                        vehicle_id: '',
                        vehicle_number: ''
                      }))
                    } else {
                      const found = vehiclesList.find(v => v.id === vId)
                      setEditRouteForm(prev => ({
                        ...prev,
                        vehicle_id: vId,
                        vehicle_number: found?.registration_number || ''
                      }))
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm font-medium"
                >
                  <option value="">-- None (Not Assigned) --</option>
                  {vehiclesList.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} ({v.vehicle_type || 'Fleet'}) - [{v.status}]
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 mt-1 block">
                  Select a vehicle or choose "-- None (Not Assigned) --" to dispatch without a vehicle.
                </span>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                    Route Date *
                  </label>
                  <input
                    type="date"
                    value={editRouteForm.dispatch_date}
                    onChange={(e) => setEditRouteForm({ ...editRouteForm, dispatch_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                    Starting Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:30 AM"
                    value={editRouteForm.start_time}
                    onChange={(e) => setEditRouteForm({ ...editRouteForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Start Location & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                    Start Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Plant"
                    value={editRouteForm.start_location}
                    onChange={(e) => setEditRouteForm({ ...editRouteForm, start_location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                    Destination Areas
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chintalapudi"
                    value={editRouteForm.destination_areas}
                    onChange={(e) => setEditRouteForm({ ...editRouteForm, destination_areas: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or notes"
                  value={editRouteForm.notes}
                  onChange={(e) => setEditRouteForm({ ...editRouteForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t dark:border-gray-800">
              <Button variant="ghost" onClick={() => setShowEditRouteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEditRouteSubmit}
                loading={savingEditRoute}
                disabled={!editRouteForm.route_id || savingEditRoute}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Save Route Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* WhatsApp Invoice Share Modal */}
      {selectedBillForWhatsApp && (
        <WhatsAppShareModal
          isOpen={!!selectedBillForWhatsApp}
          onClose={() => setSelectedBillForWhatsApp(null)}
          bill={selectedBillForWhatsApp}
          onSuccess={() => {
            setSelectedBillForWhatsApp(null)
          }}
        />
      )}
    </div>
  )
}
