'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Truck,
  Plus,
  Play,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  UserCheck,
  Send,
  Phone,
  Edit,
  Eye,
  RefreshCw,
  X,
  Package,
  Layers,
  Search,
  Check,
  Fuel,
  Receipt,
  Download,
  Share2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import WhatsAppShareModal from '@/components/whatsapp/WhatsAppShareModal'
import ReceiptPreviewModal from '@/components/printer/ReceiptPreviewModal'
import {
  getDrivers,
  saveDriver,
  startDriverRoute,
  updateDriverRoute,
  getSavedRoutes,
  getAvailableVehicles,
  getActiveRoutes,
  getCompletedRoutes,
  recordRouteCustomerSale,
  updateRouteReturnsAndLeakage,
  recordRouteExpense,
  finalizeRouteAndGenerateBills,
  getDriverDashboardStats,
  DriverWithStats,
  RouteDispatchRecord,
  RouteLoadItem,
  RouteCustomerSale,
  DriverDashboardStats,
  SavedRoute,
  VehicleOption
} from '@/lib/services/driver-service'
import { generateBillPDF } from '@/lib/utils/pdf-generator'

export default function DriversAndRoutesPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'active_routes' | 'start_route' | 'completed_routes' | 'drivers'>('active_routes')

  // Data States
  const [dashboardStats, setDashboardStats] = useState<DriverDashboardStats>({
    totalDrivers: 0,
    availableDrivers: 0,
    driversOnRoute: 0,
    activeRoutesCount: 0,
    completedRoutesToday: 0,
    todayRouteSales: 0,
    todayCollections: 0,
    pendingSettlements: 0,
    vehiclesInUse: 0
  })
  const [drivers, setDrivers] = useState<DriverWithStats[]>([])
  const [activeRoutes, setActiveRoutes] = useState<RouteDispatchRecord[]>([])
  const [completedRoutes, setCompletedRoutes] = useState<RouteDispatchRecord[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [vehiclesList, setVehiclesList] = useState<VehicleOption[]>([])
  const [routeSearchTerm, setRouteSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Start Route Form State
  const [startRouteForm, setStartRouteForm] = useState({
    route_id: '',
    route_name: '',
    driver_id: '',
    vehicle_id: '',
    vehicle_number: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    start_time: '08:30 AM',
    start_location: 'Main Factory Warehouse',
    destination_areas: '',
    notes: '',
    items: [
      { product_id: '', product_name: 'Water Can (20L)', unit: 'cans', loaded_quantity: 100, rate: 15, amount: 1500 }
    ]
  })
  const [startingRoute, setStartingRoute] = useState(false)

  // Edit Route Modal State
  const [showEditRouteModal, setShowEditRouteModal] = useState(false)
  const [editingRouteDispatch, setEditingRouteDispatch] = useState<RouteDispatchRecord | null>(null)
  const [editRouteForm, setEditRouteForm] = useState({
    dispatch_id: '',
    route_id: '',
    route_name: '',
    driver_id: '',
    vehicle_id: '',
    vehicle_number: '',
    dispatch_date: '',
    start_time: '',
    start_location: '',
    destination_areas: '',
    notes: ''
  })
  const [savingEditRoute, setSavingEditRoute] = useState(false)

  // Active Route Sub-Modals
  const [selectedActiveRoute, setSelectedActiveRoute] = useState<RouteDispatchRecord | null>(null)
  
  // 1. Customer Sale Modal State
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [saleForm, setSaleForm] = useState({
    customer_name: '',
    customer_phone: '',
    product_name: 'Water Can (20L)',
    quantity: 10,
    unit: 'cans',
    rate: 15,
    discount: 0,
    gst_amount: 0,
    payment_type: 'CASH' as 'CASH' | 'UPI' | 'CREDIT',
    cash_paid: 150,
    upi_paid: 0,
    remarks: ''
  })
  const [savingSale, setSavingSale] = useState(false)

  // 2. Returns & Leakage Modal State
  const [showReturnsModal, setShowReturnsModal] = useState(false)
  const [returnsItemsState, setReturnsItemsState] = useState<Array<{ id: string; product_name: string; returned_quantity: number; leaked_quantity: number }>>([])
  const [savingReturns, setSavingReturns] = useState(false)

  // 3. Add Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    fuel_charges: 300,
    driver_bata: 200,
    other_expenses: 0,
    remarks: 'Route transit expenses'
  })
  const [savingExpense, setSavingExpense] = useState(false)

  // 4. End Route Reconciliation Modal State
  const [showReconciliationModal, setShowReconciliationModal] = useState(false)
  const [reconciliationItems, setReconciliationItems] = useState<any[]>([])
  const [discrepancyReason, setDiscrepancyReason] = useState('')
  const [finalizingRoute, setFinalizingRoute] = useState(false)

  // 5. Driver Profile / Add Modal State
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DriverWithStats | null>(null)
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    address: '',
    assigned_vehicle: '',
    vehicle_number: '',
    license_number: '',
    joining_date: new Date().toISOString().split('T')[0],
    salary: 18000,
    employment_status: 'ACTIVE',
    status: 'AVAILABLE' as 'AVAILABLE' | 'ON_ROUTE' | 'INACTIVE'
  })
  const [savingDriver, setSavingDriver] = useState(false)

  // 6. View Route Details / Invoices Modal
  const [viewRouteRecord, setViewRouteRecord] = useState<RouteDispatchRecord | null>(null)

  // WhatsApp and Receipt Modals
  const [whatsAppBill, setWhatsAppBill] = useState<any | null>(null)
  const [previewBill, setPreviewBill] = useState<any | null>(null)

  const supabase = createClient()

  // Live Sync Listeners
  useDataSyncListener(['drivers', 'routes', 'bills', 'sales', 'stock', 'vehicles'], () => {
    loadAllData()
  })

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    try {
      const [stats, drvs, actv, cmpl, { data: prods }, sRoutes, vList] = await Promise.all([
        getDriverDashboardStats(),
        getDrivers(),
        getActiveRoutes(),
        getCompletedRoutes(),
        supabase.from('products').select('id, name, unit, default_rate, stock_quantity').order('name'),
        getSavedRoutes(),
        getAvailableVehicles()
      ])

      setDashboardStats(stats)
      setDrivers(drvs)
      setActiveRoutes(actv)
      setCompletedRoutes(cmpl)
      setProducts(prods || [])
      setSavedRoutes(sRoutes)
      setVehiclesList(vList)
    } catch (err) {
      console.warn('Error loading driver & route data:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- START ROUTE ACTIONS ---
  function handleAddProductRow() {
    const defaultProd = products[0] || { id: null, name: 'Water Can (20L)', unit: 'cans', default_rate: 15 }
    setStartRouteForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: defaultProd.id,
          product_name: defaultProd.name,
          unit: defaultProd.unit || 'cans',
          loaded_quantity: 50,
          rate: Number(defaultProd.default_rate || 15),
          amount: 50 * Number(defaultProd.default_rate || 15)
        }
      ]
    }))
  }

  function handleProductRowChange(index: number, field: string, val: any) {
    setStartRouteForm(prev => {
      const updated = [...prev.items]
      const current = { ...updated[index], [field]: val }
      if (field === 'loaded_quantity' || field === 'rate') {
        current.amount = (Number(current.loaded_quantity) || 0) * (Number(current.rate) || 0)
      }
      if (field === 'product_name') {
        const found = products.find(p => p.name === val)
        if (found) {
          current.product_id = found.id
          current.unit = found.unit || 'cans'
          current.rate = Number(found.default_rate || current.rate)
          current.amount = current.loaded_quantity * current.rate
        }
      }
      updated[index] = current
      return { ...prev, items: updated }
    })
  }

  function handleRemoveProductRow(index: number) {
    if (startRouteForm.items.length <= 1) return
    setStartRouteForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  async function handleStartRouteSubmit() {
    if (!startRouteForm.route_id) {
      alert('Route Name is mandatory. Please select a route from the saved routes list.')
      return
    }
    if (!startRouteForm.driver_id) {
      alert('Please select an assigned driver')
      return
    }
    if (!startRouteForm.dispatch_date) {
      alert('Route Date is required')
      return
    }
    if (!startRouteForm.items || startRouteForm.items.length === 0) {
      alert('At least one product item must be loaded.')
      return
    }

    const selectedDriver = drivers.find(d => d.id === startRouteForm.driver_id)
    if (!selectedDriver) {
      alert('Selected driver not found')
      return
    }

    // Vehicle is optional - do not generate fake vehicle numbers
    const vId = startRouteForm.vehicle_id || null
    let vNum = startRouteForm.vehicle_number?.trim() || null
    if (vNum === 'Not Assigned' || vNum === '' || vNum === 'NONE') {
      vNum = null
    }

    setStartingRoute(true)
    try {
      const res = await startDriverRoute({
        route_id: startRouteForm.route_id,
        route_name: startRouteForm.route_name,
        driver_id: selectedDriver.id,
        driver_name: selectedDriver.name,
        vehicle_id: vId,
        vehicle_number: vNum,
        dispatch_date: startRouteForm.dispatch_date,
        start_time: startRouteForm.start_time,
        start_location: startRouteForm.start_location,
        destination_areas: startRouteForm.destination_areas,
        notes: startRouteForm.notes,
        items: startRouteForm.items
      })

      if (!res.success) {
        alert(res.message || 'Failed to start route')
        return
      }

      alert(`✅ ${res.message}`)
      // Reset form and transition to Active Routes tab
      setStartRouteForm({
        route_id: '',
        route_name: '',
        driver_id: '',
        vehicle_id: '',
        vehicle_number: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        start_time: '08:30 AM',
        start_location: 'Main Factory Warehouse',
        destination_areas: '',
        notes: '',
        items: [
          { product_id: products[0]?.id || null, product_name: products[0]?.name || 'Water Can (20L)', unit: 'cans', loaded_quantity: 100, rate: 15, amount: 1500 }
        ]
      })
      await loadAllData()
      setActiveTab('active_routes')
    } catch (e: any) {
      alert(`Error starting route: ${e?.message || e}`)
    } finally {
      setStartingRoute(false)
    }
  }

  // --- EDIT ROUTE ACTIONS ---
  function openEditRouteModal(route: RouteDispatchRecord) {
    setEditingRouteDispatch(route)
    const matchedVehicle = vehiclesList.find(v => 
      (route.vehicle_id && v.id === route.vehicle_id) || 
      (route.vehicle_number && v.registration_number.toLowerCase() === route.vehicle_number.toLowerCase())
    )

    setEditRouteForm({
      dispatch_id: route.id,
      route_id: route.route_id || '',
      route_name: route.route_name || '',
      driver_id: route.driver_id || '',
      vehicle_id: matchedVehicle?.id || route.vehicle_id || '',
      vehicle_number: route.vehicle_number || '',
      dispatch_date: route.dispatch_date || new Date().toISOString().split('T')[0],
      start_time: route.start_time || '08:30 AM',
      start_location: route.start_location || 'Main Factory Warehouse',
      destination_areas: route.destination_areas || '',
      notes: route.notes || ''
    })
    setShowEditRouteModal(true)
  }

  async function handleEditRouteSubmit() {
    if (!editRouteForm.route_id) {
      alert('Route Name is mandatory from the saved routes list.')
      return
    }
    if (!editRouteForm.driver_id) {
      alert('Driver is required')
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
        dispatch_id: editRouteForm.dispatch_id,
        route_id: editRouteForm.route_id,
        route_name: editRouteForm.route_name,
        driver_id: editRouteForm.driver_id,
        vehicle_id: vId,
        vehicle_number: vNum,
        dispatch_date: editRouteForm.dispatch_date,
        start_time: editRouteForm.start_time,
        start_location: editRouteForm.start_location,
        destination_areas: editRouteForm.destination_areas,
        notes: editRouteForm.notes
      })

      if (!res.success) {
        alert(res.message || 'Failed to update route')
        return
      }

      setShowEditRouteModal(false)
      await loadAllData()
      alert('Route details updated successfully!')
    } catch (err: any) {
      alert('Error updating route: ' + (err?.message || err))
    } finally {
      setSavingEditRoute(false)
    }
  }

  // --- RECORD CUSTOMER SALE ON ACTIVE ROUTE ---
  function openSaleModal(route: RouteDispatchRecord) {
    setSelectedActiveRoute(route)
    const firstItem = route.items?.[0]
    setSaleForm({
      customer_name: '',
      customer_phone: '',
      product_name: firstItem?.product_name || 'Water Can (20L)',
      quantity: 5,
      unit: firstItem?.unit || 'cans',
      rate: Number(firstItem?.rate || 15),
      discount: 0,
      gst_amount: 0,
      payment_type: 'CASH',
      cash_paid: 5 * Number(firstItem?.rate || 15),
      upi_paid: 0,
      remarks: ''
    })
    setShowSaleModal(true)
  }

  async function handleRecordSaleSubmit() {
    if (!selectedActiveRoute) return
    if (!saleForm.customer_name.trim()) {
      alert('Customer Name is required')
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
        dispatch_id: selectedActiveRoute.id,
        driver_id: selectedActiveRoute.driver_id,
        route_id: selectedActiveRoute.route_id,
        customer_name: saleForm.customer_name,
        customer_phone: saleForm.customer_phone,
        product_name: saleForm.product_name,
        quantity: saleForm.quantity,
        unit: saleForm.unit,
        rate: saleForm.rate,
        total_amount: itemTotal,
        discount: saleForm.discount,
        gst_amount: saleForm.gst_amount,
        payment_type: saleForm.payment_type,
        cash_paid: cashPaid,
        upi_paid: upiPaid,
        due_amount: dueAmount,
        remarks: saleForm.remarks
      })

      if (!res.success) {
        alert(res.message || 'Failed to record customer sale')
        return
      }

      alert(`✅ Customer sale recorded for ${saleForm.customer_name}!`)
      setShowSaleModal(false)
      loadAllData()
    } catch (e: any) {
      alert(`Error saving customer sale: ${e?.message || e}`)
    } finally {
      setSavingSale(false)
    }
  }

  // --- RECORD RETURNS & LEAKAGE ON ACTIVE ROUTE ---
  function openReturnsModal(route: RouteDispatchRecord) {
    setSelectedActiveRoute(route)
    setReturnsItemsState(
      (route.items || []).map(it => ({
        id: it.id || '',
        product_name: it.product_name,
        returned_quantity: Number(it.returned_quantity || 0),
        leaked_quantity: Number(it.leaked_quantity || 0)
      }))
    )
    setShowReturnsModal(true)
  }

  async function handleReturnsSubmit() {
    if (!selectedActiveRoute) return
    setSavingReturns(true)
    try {
      const res = await updateRouteReturnsAndLeakage(selectedActiveRoute.id, returnsItemsState)
      if (!res.success) {
        alert(res.message)
        return
      }
      alert('✅ Route returns and leakage updated successfully!')
      setShowReturnsModal(false)
      loadAllData()
    } catch (e: any) {
      alert(`Error updating returns: ${e?.message || e}`)
    } finally {
      setSavingReturns(false)
    }
  }

  // --- RECORD ROUTE EXPENSE ---
  function openExpenseModal(route: RouteDispatchRecord) {
    setSelectedActiveRoute(route)
    setExpenseForm({
      fuel_charges: 300,
      driver_bata: 200,
      other_expenses: 0,
      remarks: 'Route transit expenses'
    })
    setShowExpenseModal(true)
  }

  async function handleExpenseSubmit() {
    if (!selectedActiveRoute) return
    setSavingExpense(true)
    try {
      const res = await recordRouteExpense({
        dispatch_id: selectedActiveRoute.id,
        driver_id: selectedActiveRoute.driver_id,
        route_id: selectedActiveRoute.route_id,
        fuel_charges: Number(expenseForm.fuel_charges || 0),
        driver_bata: Number(expenseForm.driver_bata || 0),
        other_expenses: Number(expenseForm.other_expenses || 0),
        remarks: expenseForm.remarks,
        vehicle_number: selectedActiveRoute.vehicle_number
      })

      if (!res.success) {
        alert(res.message)
        return
      }

      alert('✅ Route expense recorded successfully!')
      setShowExpenseModal(false)
      loadAllData()
    } catch (e: any) {
      alert(`Error recording expense: ${e?.message || e}`)
    } finally {
      setSavingExpense(false)
    }
  }

  // --- END ROUTE & RECONCILIATION ---
  function openReconciliationModal(route: RouteDispatchRecord) {
    setSelectedActiveRoute(route)
    setDiscrepancyReason('')

    // Prepare reconciliation line items based on loaded items vs sales & returns
    const items = (route.items || []).map(it => {
      // Find sold quantity for this product from recorded sales
      const soldQty = (route.sales || [])
        .filter(s => s.product_name === it.product_name)
        .reduce((acc, s) => acc + (Number(s.quantity) || 0), 0)

      const retGood = Number(it.returned_quantity || 0)
      const leaked = Number(it.leaked_quantity || 0)
      const loaded = Number(it.loaded_quantity || 0)
      const accounted = soldQty + retGood + leaked
      const unaccounted = loaded - accounted

      return {
        product_id: it.product_id,
        product_name: it.product_name,
        loaded_qty: loaded,
        sold_qty: soldQty,
        returned_good_qty: retGood,
        leaked_damaged_qty: leaked,
        unaccounted_qty: unaccounted,
        rate: Number(it.rate || 0),
        condition: 'good'
      }
    })

    setReconciliationItems(items)
    setShowReconciliationModal(true)
  }

  async function handleFinalizeRouteSubmit() {
    if (!selectedActiveRoute) return

    // Calculate totals across reconciliation items
    const totalLoaded = reconciliationItems.reduce((acc, it) => acc + Number(it.loaded_qty), 0)
    const totalSold = reconciliationItems.reduce((acc, it) => acc + Number(it.sold_qty), 0)
    const totalReturned = reconciliationItems.reduce((acc, it) => acc + Number(it.returned_good_qty), 0)
    const totalLeaked = reconciliationItems.reduce((acc, it) => acc + Number(it.leaked_damaged_qty), 0)
    const totalUnaccounted = totalLoaded - (totalSold + totalReturned + totalLeaked)

    if (totalUnaccounted !== 0 && !discrepancyReason.trim()) {
      alert(`Discrepancy detected: ${totalUnaccounted} units are unaccounted for. Please provide a discrepancy explanation reason.`)
      return
    }

    const cashCollected = Number(selectedActiveRoute.cash_collected || 0)
    const upiCollected = Number(selectedActiveRoute.upi_collected || 0)
    const creditSales = Number(selectedActiveRoute.credit_amount || 0)
    const expensesAmt = Number(selectedActiveRoute.expenses_amount || 0)
    const totalSalesAmt = Number(selectedActiveRoute.total_sales_amount || 0)

    setFinalizingRoute(true)
    try {
      const res = await finalizeRouteAndGenerateBills({
        load_dispatch_id: selectedActiveRoute.id,
        driver_id: selectedActiveRoute.driver_id,
        route_id: selectedActiveRoute.route_id,
        route_name: selectedActiveRoute.route_name,
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
        items: reconciliationItems,
        customer_sales: selectedActiveRoute.sales || []
      })

      if (!res.success) {
        alert(res.message || 'Route finalization failed')
        return
      }

      alert(`🎉 ${res.message}`)
      setShowReconciliationModal(false)
      await loadAllData()
      setActiveTab('completed_routes')
    } catch (e: any) {
      alert(`Error during route finalization: ${e?.message || e}`)
    } finally {
      setFinalizingRoute(false)
    }
  }

  // --- DRIVER PROFILE ACTIONS ---
  function openAddDriverModal() {
    setEditingDriver(null)
    setDriverForm({
      name: '',
      phone: '',
      address: '',
      assigned_vehicle: '',
      vehicle_number: '',
      license_number: '',
      joining_date: new Date().toISOString().split('T')[0],
      salary: 18000,
      employment_status: 'ACTIVE',
      status: 'AVAILABLE'
    })
    setShowDriverModal(true)
  }

  function openEditDriverModal(drv: DriverWithStats) {
    setEditingDriver(drv)
    setDriverForm({
      name: drv.name,
      phone: drv.phone,
      address: drv.address || '',
      assigned_vehicle: drv.assigned_vehicle || 'Tata Ace 407',
      vehicle_number: drv.vehicle_number || '',
      license_number: drv.license_number || '',
      joining_date: drv.joining_date || new Date().toISOString().split('T')[0],
      salary: drv.salary || 18000,
      employment_status: drv.employment_status || 'ACTIVE',
      status: drv.status || 'AVAILABLE'
    })
    setShowDriverModal(true)
  }

  async function handleDriverFormSubmit() {
    if (!driverForm.name.trim() || !driverForm.phone.trim()) {
      alert('Driver Name and Phone number are required')
      return
    }

    setSavingDriver(true)
    try {
      const res = await saveDriver({
        id: editingDriver?.id,
        ...driverForm
      })

      if (!res.success) {
        alert(res.message)
        return
      }

      alert(res.message)
      setShowDriverModal(false)
      loadAllData()
    } catch (e: any) {
      alert(`Error saving driver: ${e?.message || e}`)
    } finally {
      setSavingDriver(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}>
            <Truck style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f4f4f5', margin: 0 }}>
              Drivers &amp; Route Management
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.82rem', margin: '3px 0 0 0' }}>
              Real-time route lifecycle, inventory reservation, live sales recording, reconciliation &amp; bill generation
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button
            variant="outline"
            onClick={loadAllData}
            icon={<RefreshCw style={{ width: '14px', height: '14px' }} />}
          >
            Refresh Data
          </Button>
          <Button
            variant="primary"
            onClick={() => setActiveTab('start_route')}
            icon={<Play style={{ width: '14px', height: '14px' }} />}
          >
            Start New Route
          </Button>
          <Button
            variant="secondary"
            onClick={openAddDriverModal}
            icon={<Plus style={{ width: '14px', height: '14px' }} />}
          >
            Add Driver
          </Button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('active_routes')}
          style={{
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'active_routes' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'active_routes' ? '#000' : '#d4d4d8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'active_routes' ? '0 4px 14px rgba(251, 191, 36, 0.3)' : 'none'
          }}
        >
          <Truck style={{ width: '16px', height: '16px' }} />
          <span>Active Routes</span>
          {activeRoutes.length > 0 && (
            <span style={{
              backgroundColor: activeTab === 'active_routes' ? '#000' : '#10b981',
              color: activeTab === 'active_routes' ? '#fbbf24' : '#fff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '999px'
            }}>
              {activeRoutes.length} LIVE
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('start_route')}
          style={{
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'start_route' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'start_route' ? '#000' : '#d4d4d8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          <span>Start New Route</span>
        </button>

        <button
          onClick={() => setActiveTab('completed_routes')}
          style={{
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'completed_routes' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'completed_routes' ? '#000' : '#d4d4d8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle style={{ width: '16px', height: '16px' }} />
          <span>Completed Routes</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'drivers' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'drivers' ? '#000' : '#d4d4d8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <UserCheck style={{ width: '16px', height: '16px' }} />
          <span>Driver Directory ({drivers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '0.6rem 1.15rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'dashboard' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'dashboard' ? '#000' : '#d4d4d8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <TrendingUp style={{ width: '16px', height: '16px' }} />
          <span>Dashboard KPIs</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ACTIVE ROUTES DASHBOARD (Persistent until manually ended!)
          ========================================================================= */}
      {activeTab === 'active_routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active Route Notice Banner */}
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              <div style={{ fontSize: '0.85rem', color: '#d4d4d8' }}>
                <strong style={{ color: '#fff' }}>Persistent Route Tracking:</strong> Active routes remain open and visible across browser reloads until an authorized operator clicks <em>END ROUTE</em>.
              </div>
            </div>
            <Badge variant="success">
              {activeRoutes.length} ROUTE{activeRoutes.length !== 1 ? 'S' : ''} IN PROGRESS
            </Badge>
          </div>

          {activeRoutes.length === 0 ? (
            <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center', backgroundColor: '#141417' }}>
              <Truck style={{ width: '48px', height: '48px', color: '#52525b', margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f4f4f5', marginBottom: '0.5rem' }}>
                No Active Routes Right Now
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
                All driver dispatches are currently completed or settled. Click below to load products and start a new delivery run.
              </p>
              <Button
                variant="primary"
                onClick={() => setActiveTab('start_route')}
                icon={<Play style={{ width: '15px', height: '15px' }} />}
              >
                Start New Route
              </Button>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activeRoutes.map((route) => (
                <Card key={route.id} style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '1.25rem' }}>
                  
                  {/* Top Header Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Link
                          href={`/routes/${route.id}`}
                          style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', textDecoration: 'none' }}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {route.route_name || 'Daily Route'}
                        </Link>
                        <Link
                          href={`/routes/${route.id}`}
                          style={{ fontFamily: 'monospace', fontSize: '0.75rem', backgroundColor: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.25)', textDecoration: 'none' }}
                          className="hover:bg-amber-500/20"
                        >
                          {route.dispatch_number}
                        </Link>
                        <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                          IN_PROGRESS
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.45rem', fontSize: '0.8rem', color: '#a1a1aa', flexWrap: 'wrap' }}>
                        <span>👤 Driver: <strong style={{ color: '#fff' }}>{route.driver_name}</strong></span>
                        <span>🚚 Vehicle: <strong style={{ color: route.vehicle_number ? '#fff' : '#a1a1aa' }}>{route.vehicle_number || 'Not Assigned'}</strong></span>
                        <span>📅 Date: <strong style={{ color: '#fff' }}>{route.dispatch_date}</strong></span>
                        <span>⏰ Started: <strong style={{ color: '#fff' }}>{route.start_time || '08:30 AM'}</strong></span>
                        {route.destination_areas && <span>📍 Destination: <strong style={{ color: '#fff' }}>{route.destination_areas}</strong></span>}
                      </div>
                    </div>

                    {/* Prominent Action Button: [ END ROUTE ] */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Button
                        variant="primary"
                        onClick={() => openReconciliationModal(route)}
                        style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 800, boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}
                        icon={<CheckCircle style={{ width: '15px', height: '15px' }} />}
                      >
                        END ROUTE
                      </Button>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', margin: '1rem 0' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Loaded Qty</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
                        {route.total_loaded_qty} units
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Sold Qty</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                        {route.total_sold_qty || 0} units
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Good Returns</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa' }}>
                        {route.total_returned_qty || 0} units
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Damaged / Leaked</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f87171' }}>
                        {route.total_leaked_qty || 0} units
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Live Sales</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                        ₹{route.total_sales_amount?.toLocaleString('en-IN') || '0'}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Collections (Cash+UPI)</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                        ₹{((route.cash_collected || 0) + (route.upi_collected || 0)).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase' }}>Route Expenses</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>
                        ₹{route.expenses_amount?.toLocaleString('en-IN') || '0'}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Route Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                    <Button
                      variant="outline"
                      onClick={() => openSaleModal(route)}
                      icon={<Plus style={{ width: '13px', height: '13px', color: '#34d399' }} />}
                    >
                      Record Customer Sale
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => openReturnsModal(route)}
                      icon={<Package style={{ width: '13px', height: '13px', color: '#60a5fa' }} />}
                    >
                      Record Returns / Leakage
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => openExpenseModal(route)}
                      icon={<Fuel style={{ width: '13px', height: '13px', color: '#f59e0b' }} />}
                    >
                      Add Expenses
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => openEditRouteModal(route)}
                      icon={<Edit style={{ width: '13px', height: '13px', color: '#60a5fa' }} />}
                    >
                      Edit Route
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setViewRouteRecord(route)}
                      icon={<Eye style={{ width: '13px', height: '13px' }} />}
                    >
                      View Live Breakdown ({route.sales?.length || 0} Sales)
                    </Button>

                    <Link href={`/routes/${route.id}`}>
                      <Button
                        variant="secondary"
                        icon={<Eye style={{ width: '13px', height: '13px', color: '#34d399' }} />}
                      >
                        Route Details Page
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: START NEW ROUTE FORM
          ========================================================================= */}
      {activeTab === 'start_route' && (
        <Card style={{ backgroundColor: '#18181b', padding: '1.75rem', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.35rem' }}>
            Start &amp; Assign Delivery Route
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
            Select a saved route and assigned driver. Vehicle assignment is optional. Inventory is reserved and deducted from warehouse stock upon route launch.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* 1. ROUTE NAME - MANDATORY SEARCHABLE DROPDOWN */}
            <div style={{ width: '100%' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.35rem',
                }}
              >
                Route Name * <span style={{ color: '#fbbf24', textTransform: 'none' }}>(Select from Saved Routes)</span>
              </label>

              {/* Quick Search Filter */}
              <div style={{ position: 'relative', marginBottom: '0.35rem' }}>
                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#71717a' }} />
                <input
                  type="text"
                  placeholder="Search saved routes..."
                  value={routeSearchTerm}
                  onChange={(e) => setRouteSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    color: '#f4f4f5',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              {/* Mandatory Dropdown */}
              <select
                value={startRouteForm.route_id}
                onChange={(e) => {
                  const rId = e.target.value
                  const found = savedRoutes.find(r => r.id === rId)
                  if (found) {
                    setStartRouteForm(prev => ({
                      ...prev,
                      route_id: found.id,
                      route_name: found.name,
                      destination_areas: prev.destination_areas || found.area || found.name,
                      driver_id: prev.driver_id || (found.driver_id || '')
                    }))
                  } else {
                    setStartRouteForm(prev => ({
                      ...prev,
                      route_id: '',
                      route_name: ''
                    }))
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: '#09090b',
                  border: `1px solid ${!startRouteForm.route_id ? '#fbbf24' : '#3f3f46'}`,
                  borderRadius: '12px',
                  color: '#f4f4f5',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">-- Select Saved Route (Required) --</option>
                {savedRoutes
                  .filter(r => !routeSearchTerm.trim() || r.name.toLowerCase().includes(routeSearchTerm.toLowerCase()) || (r.area && r.area.toLowerCase().includes(routeSearchTerm.toLowerCase())))
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.area ? `(Area: ${r.area})` : ''}
                    </option>
                  ))}
              </select>
              {!startRouteForm.route_id ? (
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.25rem', display: 'block' }}>
                  * Required: Must be chosen from the saved routes database list.
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.25rem', display: 'block' }}>
                  ✓ Selected: {startRouteForm.route_name}
                </span>
              )}
            </div>

            {/* 2. ASSIGNED DRIVER - MANDATORY DROPDOWN */}
            <Select
              label="Assigned Driver *"
              value={startRouteForm.driver_id}
              onChange={(e) => {
                const dId = e.target.value
                const found = drivers.find(d => d.id === dId)
                // If driver has an assigned vehicle and no vehicle chosen yet, can set it
                const driverVeh = vehiclesList.find(v => v.registration_number === found?.vehicle_number)
                setStartRouteForm({
                  ...startRouteForm,
                  driver_id: dId,
                  vehicle_id: startRouteForm.vehicle_id || driverVeh?.id || '',
                  vehicle_number: startRouteForm.vehicle_number || found?.vehicle_number || ''
                })
              }}
              options={[
                { value: '', label: '-- Select Driver (Required) --' },
                ...drivers.map(d => ({
                  value: d.id,
                  label: `${d.name} (${d.status || 'AVAILABLE'}) - ${d.phone}`
                }))
              ]}
            />

            {/* 3. ASSIGNED VEHICLE - OPTIONAL DROPDOWN */}
            <div style={{ width: '100%' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.35rem',
                }}
              >
                Assigned Vehicle <span style={{ color: '#71717a', textTransform: 'none' }}>(Optional)</span>
              </label>

              <select
                value={startRouteForm.vehicle_id}
                onChange={(e) => {
                  const vId = e.target.value
                  if (!vId) {
                    setStartRouteForm(prev => ({
                      ...prev,
                      vehicle_id: '',
                      vehicle_number: ''
                    }))
                  } else {
                    const found = vehiclesList.find(v => v.id === vId)
                    setStartRouteForm(prev => ({
                      ...prev,
                      vehicle_id: vId,
                      vehicle_number: found?.registration_number || ''
                    }))
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: '#09090b',
                  border: '1px solid #3f3f46',
                  borderRadius: '12px',
                  color: '#f4f4f5',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">-- None (Not Assigned) --</option>
                {vehiclesList.map(v => (
                  <option 
                    key={v.id} 
                    value={v.id}
                    disabled={v.status === 'MAINTENANCE' || v.status === 'INACTIVE'}
                  >
                    {v.registration_number} ({v.vehicle_type || 'Fleet'}) - [{v.status}]
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.25rem', display: 'block' }}>
                Optional. Leave empty to dispatch without a vehicle ("Not Assigned").
              </span>
            </div>

            {/* 4. ROUTE DATE */}
            <Input
              type="date"
              label="Route Date *"
              value={startRouteForm.dispatch_date}
              onChange={(e) => setStartRouteForm({ ...startRouteForm, dispatch_date: e.target.value })}
            />

            {/* 5. STARTING TIME */}
            <Input
              label="Starting Time"
              placeholder="e.g. 08:30 AM"
              value={startRouteForm.start_time}
              onChange={(e) => setStartRouteForm({ ...startRouteForm, start_time: e.target.value })}
            />

            {/* 6. STARTING LOCATION */}
            <Input
              label="Starting Location"
              placeholder="e.g. Main Plant Warehouse"
              value={startRouteForm.start_location}
              onChange={(e) => setStartRouteForm({ ...startRouteForm, start_location: e.target.value })}
            />

            {/* 7. DESTINATION AREAS */}
            <Input
              label="Destination / Route Areas"
              placeholder="e.g. Chintalapudi, Guntur Rural"
              value={startRouteForm.destination_areas}
              onChange={(e) => setStartRouteForm({ ...startRouteForm, destination_areas: e.target.value })}
            />
          </div>

          {/* Products Loaded Section */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Products Loaded on Vehicle
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Specify initial stock loaded onto vehicle before transit
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddProductRow}
                icon={<Plus style={{ width: '13px', height: '13px' }} />}
              >
                Add Another Product
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {startRouteForm.items.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px' }}>
                  <Select
                    label="Product Name"
                    value={row.product_name}
                    onChange={(e) => handleProductRowChange(idx, 'product_name', e.target.value)}
                    options={products.map(p => ({
                      value: p.name,
                      label: `${p.name} (Stock: ${p.stock_quantity})`
                    }))}
                  />

                  <Input
                    type="number"
                    label="Quantity"
                    value={row.loaded_quantity}
                    onChange={(e) => handleProductRowChange(idx, 'loaded_quantity', Number(e.target.value))}
                  />

                  <Input
                    label="Unit"
                    value={row.unit}
                    onChange={(e) => handleProductRowChange(idx, 'unit', e.target.value)}
                  />

                  <Input
                    type="number"
                    label="Rate (₹)"
                    value={row.rate}
                    onChange={(e) => handleProductRowChange(idx, 'rate', Number(e.target.value))}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Load Value</label>
                    <div style={{ padding: '0.55rem', backgroundColor: '#27272a', borderRadius: '4px', color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem' }}>
                      ₹{row.amount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveProductRow(idx)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.5rem' }}
                    title="Remove item"
                  >
                    <X style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Load Summary */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
              <span>Total Units Loaded: <span style={{ color: '#fbbf24' }}>{startRouteForm.items.reduce((s, it) => s + (Number(it.loaded_quantity) || 0), 0)} units</span></span>
              <span>Total Load Value: <span style={{ color: '#10b981' }}>₹{startRouteForm.items.reduce((s, it) => s + (Number(it.amount) || 0), 0).toLocaleString('en-IN')}</span></span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              variant="outline"
              onClick={() => setActiveTab('active_routes')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={startingRoute}
              onClick={handleStartRouteSubmit}
              icon={<Play style={{ width: '15px', height: '15px' }} />}
            >
              {startingRoute ? 'Reserving Stock & Starting...' : 'START ROUTE'}
            </Button>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 3: COMPLETED ROUTES (Settlement History & Customer Invoices)
          ========================================================================= */}
      {activeTab === 'completed_routes' && (
        <Card style={{ backgroundColor: '#18181b', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Completed &amp; Settled Routes
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                Audited route settlements, reconciliations, generated customer bills, collections, and expenses
              </p>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'dispatch_number',
                title: 'Route Reference',
                render: r => (
                  <div>
                    <Link
                      href={`/routes/${r.id}`}
                      style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24', fontSize: '0.85rem', textDecoration: 'none' }}
                      className="hover:underline"
                    >
                      {r.dispatch_number}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{r.route_name || 'Daily Route'}</div>
                  </div>
                )
              },
              {
                key: 'driver_name',
                title: 'Driver & Vehicle',
                render: r => (
                  <div>
                    <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{r.driver_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{r.vehicle_number || 'Not Assigned'}</div>
                  </div>
                )
              },
              {
                key: 'dispatch_date',
                title: 'Date & Time',
                render: r => (
                  <div style={{ fontSize: '0.82rem' }}>
                    <div>{r.dispatch_date}</div>
                    <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>{r.start_time || '08:30 AM'} → {r.end_time || 'Ended'}</div>
                  </div>
                )
              },
              {
                key: 'total_loaded_qty',
                title: 'Quantities',
                render: r => (
                  <div style={{ fontSize: '0.78rem' }}>
                    <div>Loaded: <strong>{r.total_loaded_qty}</strong></div>
                    <div style={{ color: '#34d399' }}>Sold: <strong>{r.total_sold_qty || 0}</strong></div>
                    <div style={{ color: '#60a5fa' }}>Ret: <strong>{r.total_returned_qty || 0}</strong> | Dmg: <strong>{r.total_leaked_qty || 0}</strong></div>
                  </div>
                )
              },
              {
                key: 'total_sales_amount',
                title: 'Financials',
                render: r => (
                  <div style={{ fontSize: '0.8rem' }}>
                    <div>Sales: <strong style={{ color: '#fff' }}>₹{Number(r.total_sales_amount || 0).toLocaleString('en-IN')}</strong></div>
                    <div style={{ color: '#10b981' }}>Coll: <strong>₹{((Number(r.cash_collected || 0)) + (Number(r.upi_collected || 0))).toLocaleString('en-IN')}</strong></div>
                    {Number(r.expenses_amount || 0) > 0 && <div style={{ color: '#f59e0b' }}>Exp: -₹{Number(r.expenses_amount).toFixed(0)}</div>}
                  </div>
                )
              },
              {
                key: 'status',
                title: 'Status',
                render: r => <Badge variant="success">COMPLETED</Badge>
              },
              {
                key: 'actions',
                title: 'Invoices & Reports',
                render: r => (
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <Link href={`/routes/${r.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye style={{ width: '13px', height: '13px', color: '#34d399' }} />}
                      >
                        Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewRouteRecord(r)}
                      icon={<FileText style={{ width: '13px', height: '13px', color: '#fbbf24' }} />}
                    >
                      Settlement ({r.bills_count || (r.generated_bills?.length || 0)} Bills)
                    </Button>
                  </div>
                )
              }
            ]}
            data={completedRoutes}
          />
        </Card>
      )}

      {/* =========================================================================
          TAB 4: DRIVER MANAGEMENT DIRECTORY
          ========================================================================= */}
      {activeTab === 'drivers' && (
        <Card style={{ backgroundColor: '#18181b', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Driver Directory &amp; Profiles
              </h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                Driver profiles, phone contacts, WhatsApp, assigned vehicles, live status and route performance metrics
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openAddDriverModal}
              icon={<Plus style={{ width: '14px', height: '14px' }} />}
            >
              Add New Driver
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'name',
                title: 'Driver Name & Phone',
                render: d => (
                  <div>
                    <div style={{ fontWeight: 800, color: '#f4f4f5', fontSize: '0.9rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone style={{ width: '11px', height: '11px' }} />
                      <span>{d.phone}</span>
                    </div>
                  </div>
                )
              },
              {
                key: 'assigned_vehicle',
                title: 'Vehicle & Reg',
                render: d => (
                  <div>
                    <div style={{ fontWeight: 600, color: '#d4d4d8', fontSize: '0.85rem' }}>{d.assigned_vehicle || 'Not Assigned'}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fbbf24' }}>{d.vehicle_number || 'Not Assigned'}</div>
                  </div>
                )
              },
              {
                key: 'status',
                title: 'Route Status',
                render: d => {
                  const st = (d.status || 'AVAILABLE').toUpperCase()
                  if (st === 'ON_ROUTE') {
                    return <Badge variant="warning">ON_ROUTE</Badge>
                  }
                  if (st === 'INACTIVE') {
                    return <Badge variant="neutral">INACTIVE</Badge>
                  }
                  return <Badge variant="success">AVAILABLE</Badge>
                }
              },
              {
                key: 'salary',
                title: 'Salary & Joining',
                render: d => (
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>₹{d.salary?.toLocaleString('en-IN') || '18,000'} /mo</div>
                    <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Joined: {d.joining_date || '2026-01-15'}</div>
                  </div>
                )
              },
              {
                key: 'total_completed_routes',
                title: 'Lifetime Stats',
                render: d => (
                  <div style={{ fontSize: '0.78rem' }}>
                    <div>Routes: <strong style={{ color: '#fff' }}>{d.total_completed_routes}</strong></div>
                    <div>Sales: <strong style={{ color: '#34d399' }}>₹{d.total_sales.toLocaleString('en-IN')}</strong></div>
                    <div>Coll: <strong style={{ color: '#fbbf24' }}>₹{d.total_collections.toLocaleString('en-IN')}</strong></div>
                  </div>
                )
              },
              {
                key: 'actions',
                title: 'Actions',
                render: d => (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* WhatsApp Action */}
                    <button
                      type="button"
                      title="Chat on WhatsApp"
                      onClick={() => {
                        const cleanPhone = String(d.phone || '').replace(/[^\d]/g, '')
                        const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
                        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(`Hello ${d.name}, message from Royal Kissan Operations desk.`)}`, '_blank')
                      }}
                      style={{
                        backgroundColor: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.3)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.5rem',
                        color: '#25D366',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Send style={{ width: '13px', height: '13px' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>WA</span>
                    </button>

                    {/* Edit Driver */}
                    <button
                      type="button"
                      title="Edit Driver"
                      onClick={() => openEditDriverModal(d)}
                      style={{
                        backgroundColor: '#27272a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.5rem',
                        color: '#d4d4d8',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit style={{ width: '13px', height: '13px' }} />
                    </button>

                    {/* Assign Route */}
                    <button
                      type="button"
                      title="Assign New Route"
                      disabled={d.status === 'ON_ROUTE'}
                      onClick={() => {
                        setStartRouteForm(prev => ({
                          ...prev,
                          driver_id: d.id,
                          vehicle_number: d.vehicle_number || prev.vehicle_number
                        }))
                        setActiveTab('start_route')
                      }}
                      style={{
                        backgroundColor: d.status === 'ON_ROUTE' ? '#27272a' : '#fbbf24',
                        color: d.status === 'ON_ROUTE' ? '#71717a' : '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: d.status === 'ON_ROUTE' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {d.status === 'ON_ROUTE' ? 'Busy' : 'Assign'}
                    </button>
                  </div>
                )
              }
            ]}
            data={drivers}
          />
        </Card>
      )}

      {/* =========================================================================
          TAB 5: ROUTE & DRIVER DASHBOARD KPIS
          ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Metric 1 & 2: Total & Available Drivers */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Total Registered Drivers</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f4f4f5', margin: '0.35rem 0' }}>
                {dashboardStats.totalDrivers}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                {dashboardStats.availableDrivers} Available for Dispatch
              </span>
            </Card>

            {/* Metric 3 & 4: Drivers On Route & Active Runs */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Drivers Currently On Route</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', margin: '0.35rem 0' }}>
                {dashboardStats.driversOnRoute}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                {dashboardStats.activeRoutesCount} Active Live Runs
              </span>
            </Card>

            {/* Metric 5: Active Routes Count */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Active Route Dispatches</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', margin: '0.35rem 0' }}>
                {dashboardStats.activeRoutesCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                Live dispatches in transit
              </span>
            </Card>

            {/* Metric 6: Completed Routes Today */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(96, 165, 250, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Completed Routes Today</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', margin: '0.35rem 0' }}>
                {dashboardStats.completedRoutesToday}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                Closed and reconciled
              </span>
            </Card>

            {/* Metric 7: Today Route Sales */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Today's Route Sales</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '0.35rem 0' }}>
                ₹{dashboardStats.todayRouteSales.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                Gross customer billings
              </span>
            </Card>

            {/* Metric 8: Today Collections */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Collections Collected</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '0.35rem 0' }}>
                ₹{dashboardStats.todayCollections.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                Cash + UPI handed over
              </span>
            </Card>

            {/* Metric 9: Pending Settlements */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Pending Settlements</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', margin: '0.35rem 0' }}>
                {dashboardStats.pendingSettlements}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                Awaiting physical reconciliation
              </span>
            </Card>

            {/* Metric 10: Vehicles In Use */}
            <Card style={{ backgroundColor: '#18181b', padding: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Fleet Vehicles In Use</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa', margin: '0.35rem 0' }}>
                {dashboardStats.vehiclesInUse}
              </div>
              <Link href="/vehicles" style={{ fontSize: '0.75rem', color: '#c4b5fd', textDecoration: 'none' }} className="hover:underline">
                View Fleet Directory →
              </Link>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: RECORD CUSTOMER SALE ON ACTIVE ROUTE
          ========================================================================= */}
      {showSaleModal && selectedActiveRoute && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                Record Customer Sale ({selectedActiveRoute.route_name})
              </h3>
              <button onClick={() => setShowSaleModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <Input
                label="Customer Name *"
                placeholder="e.g. Swagath Restaurant / Ramu Kirana"
                value={saleForm.customer_name}
                onChange={(e) => setSaleForm({ ...saleForm, customer_name: e.target.value })}
              />

              <Input
                label="Customer Phone (WhatsApp)"
                placeholder="e.g. 9391234567"
                value={saleForm.customer_phone}
                onChange={(e) => setSaleForm({ ...saleForm, customer_phone: e.target.value })}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                <Select
                  label="Product"
                  value={saleForm.product_name}
                  onChange={(e) => {
                    const pName = e.target.value
                    const found = selectedActiveRoute.items?.find(it => it.product_name === pName)
                    setSaleForm({
                      ...saleForm,
                      product_name: pName,
                      rate: Number(found?.rate || saleForm.rate),
                      unit: found?.unit || saleForm.unit
                    })
                  }}
                  options={(selectedActiveRoute.items || []).map(it => ({
                    value: it.product_name,
                    label: it.product_name
                  }))}
                />

                <Input
                  type="number"
                  label="Quantity"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: Number(e.target.value) })}
                />

                <Input
                  type="number"
                  label="Rate (₹)"
                  value={saleForm.rate}
                  onChange={(e) => setSaleForm({ ...saleForm, rate: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Select
                  label="Payment Mode"
                  value={saleForm.payment_type}
                  onChange={(e) => setSaleForm({ ...saleForm, payment_type: e.target.value as any })}
                  options={[
                    { value: 'CASH', label: 'Cash Payment' },
                    { value: 'UPI', label: 'UPI / Online' },
                    { value: 'CREDIT', label: 'Credit (Due Bill)' }
                  ]}
                />

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Final Total</label>
                  <div style={{ padding: '0.6rem', backgroundColor: '#27272a', borderRadius: '6px', color: '#10b981', fontWeight: 800 }}>
                    ₹{(saleForm.quantity * saleForm.rate).toFixed(2)}
                  </div>
                </div>
              </div>

              <Input
                label="Remarks"
                placeholder="Optional notes"
                value={saleForm.remarks}
                onChange={(e) => setSaleForm({ ...saleForm, remarks: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="outline" onClick={() => setShowSaleModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={savingSale} onClick={handleRecordSaleSubmit}>
                {savingSale ? 'Saving...' : 'Save Customer Sale'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RECORD RETURNS & LEAKAGE MODAL
          ========================================================================= */}
      {showReturnsModal && selectedActiveRoute && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', width: '100%', maxWidth: '560px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                Record Physical Returns &amp; Leakage
              </h3>
              <button onClick={() => setShowReturnsModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Good unsold returns are returned to warehouse stock upon route finalization. Leaked or damaged goods are recorded as scrap in the leakages registry.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {returnsItemsState.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa' }}>Product</label>
                    <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{it.product_name}</strong>
                  </div>

                  <Input
                    type="number"
                    label="Good Returns Qty"
                    value={it.returned_quantity}
                    onChange={(e) => {
                      const updated = [...returnsItemsState]
                      updated[idx].returned_quantity = Number(e.target.value)
                      setReturnsItemsState(updated)
                    }}
                  />

                  <Input
                    type="number"
                    label="Leaked / Damaged Qty"
                    value={it.leaked_quantity}
                    onChange={(e) => {
                      const updated = [...returnsItemsState]
                      updated[idx].leaked_quantity = Number(e.target.value)
                      setReturnsItemsState(updated)
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="outline" onClick={() => setShowReturnsModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={savingReturns} onClick={handleReturnsSubmit}>
                {savingReturns ? 'Updating...' : 'Update Returns & Leakage'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD ROUTE EXPENSES MODAL
          ========================================================================= */}
      {showExpenseModal && selectedActiveRoute && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                Log Route Transit Expenses
              </h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <Input
                type="number"
                label="Fuel Charges (Diesel/Petrol) (₹)"
                value={expenseForm.fuel_charges}
                onChange={(e) => setExpenseForm({ ...expenseForm, fuel_charges: Number(e.target.value) })}
              />

              <Input
                type="number"
                label="Driver Bata / Food Allowance (₹)"
                value={expenseForm.driver_bata}
                onChange={(e) => setExpenseForm({ ...expenseForm, driver_bata: Number(e.target.value) })}
              />

              <Input
                type="number"
                label="Other Expenses / Tolls (₹)"
                value={expenseForm.other_expenses}
                onChange={(e) => setExpenseForm({ ...expenseForm, other_expenses: Number(e.target.value) })}
              />

              <Input
                label="Remarks"
                value={expenseForm.remarks}
                onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="outline" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={savingExpense} onClick={handleExpenseSubmit}>
                {savingExpense ? 'Logging...' : 'Save Route Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: ROUTE ENDING RECONCILIATION & BILL GENERATION PREVIEW
          ========================================================================= */}
      {showReconciliationModal && selectedActiveRoute && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
                  Route Reconciliation &amp; Bill Finalization
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                  {selectedActiveRoute.route_name} • Driver: {selectedActiveRoute.driver_name} • Ref: {selectedActiveRoute.dispatch_number}
                </span>
              </div>
              <button onClick={() => setShowReconciliationModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Reconciliation Equation Rule Callout */}
            <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#fef08a', marginBottom: '1.25rem' }}>
              <strong>Reconciliation Rule:</strong> Loaded Quantity = Sold Quantity + Good Returns + Leakage/Damage + Other Accounted Quantity.
            </div>

            {/* Physical Inventory Reconciliation Table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                1. Physical Inventory Reconciliation
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '0.5rem' }}>Product</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Loaded</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Sold</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Good Returns</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Leaked/Damage</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Unaccounted</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationItems.map((it, idx) => {
                    const unaccounted = Number(it.loaded_qty) - (Number(it.sold_qty) + Number(it.returned_good_qty) + Number(it.leaked_damaged_qty))
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.55rem', fontWeight: 700, color: '#fff' }}>{it.product_name}</td>
                        <td style={{ padding: '0.55rem', textAlign: 'center', color: '#fbbf24', fontWeight: 800 }}>{it.loaded_qty}</td>
                        <td style={{ padding: '0.55rem', textAlign: 'center', color: '#34d399', fontWeight: 700 }}>{it.sold_qty}</td>
                        <td style={{ padding: '0.55rem', textAlign: 'center', color: '#60a5fa' }}>{it.returned_good_qty}</td>
                        <td style={{ padding: '0.55rem', textAlign: 'center', color: '#f87171' }}>{it.leaked_damaged_qty}</td>
                        <td style={{ padding: '0.55rem', textAlign: 'center', fontWeight: 800, color: unaccounted === 0 ? '#34d399' : '#f87171' }}>
                          {unaccounted === 0 ? '✓ Balanced' : `${unaccounted} units`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Discrepancy Note Input if Mismatch */}
            {reconciliationItems.some(it => (Number(it.loaded_qty) - (Number(it.sold_qty) + Number(it.returned_good_qty) + Number(it.leaked_damaged_qty))) !== 0) && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#fca5a5', marginBottom: '0.35rem' }}>
                  Quantity Discrepancy Explanation (Required for non-zero unaccounted units) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broken in transit / Road accident / Driver shortage logged"
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: '#27272a', border: '1px solid #ef4444', borderRadius: '4px', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
            )}

            {/* 2. Customer Bills to be Generated Preview */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                2. Customer Invoices to be Generated ({(selectedActiveRoute.sales || []).length} Bills)
              </h4>

              {(selectedActiveRoute.sales || []).length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#a1a1aa', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  No customer sales were recorded on this route. If products were sold, record them before finalization.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {(selectedActiveRoute.sales || []).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div>
                        <strong style={{ color: '#fff' }}>{idx + 1}. {s.customer_name}</strong>
                        <span style={{ color: '#a1a1aa', marginLeft: '0.5rem' }}>
                          ({s.quantity} {s.unit || 'cans'} × ₹{s.rate})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{ fontWeight: 800, color: '#fbbf24' }}>₹{Number(s.total_amount).toFixed(2)}</span>
                        <Badge variant={s.payment_type === 'CREDIT' ? 'danger' : 'success'}>
                          {s.payment_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Financial Settlement Summary */}
            <div style={{ backgroundColor: '#27272a', padding: '1rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Total Sales</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>₹{Number(selectedActiveRoute.total_sales_amount || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Cash Collected</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>₹{Number(selectedActiveRoute.cash_collected || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>UPI Collected</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>₹{Number(selectedActiveRoute.upi_collected || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Credit Sales</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>₹{Number(selectedActiveRoute.credit_amount || 0).toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>Route Expenses</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>₹{Number(selectedActiveRoute.expenses_amount || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Confirmation & Finalize Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setShowReconciliationModal(false)}>
                Back to Active Route
              </Button>
              <Button
                variant="primary"
                disabled={finalizingRoute}
                onClick={handleFinalizeRouteSubmit}
                style={{ backgroundColor: '#10b981', color: '#000', fontWeight: 800 }}
                icon={<CheckCircle style={{ width: '15px', height: '15px' }} />}
              >
                {finalizingRoute ? 'Finalizing Bills & Inventory...' : 'FINALIZE ROUTE & GENERATE BILLS'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT ACTIVE ROUTE ASSIGNMENT
          ========================================================================= */}
      {showEditRouteModal && editingRouteDispatch && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                  Edit Route Assignment
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Update route name, assigned vehicle, driver, or timing for dispatch #{editingRouteDispatch.id.slice(0, 8)}
                </span>
              </div>
              <button onClick={() => setShowEditRouteModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Mandatory Route Name Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
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
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    backgroundColor: '#09090b',
                    border: `1px solid ${!editRouteForm.route_id ? '#ef4444' : '#3f3f46'}`,
                    borderRadius: '10px',
                    color: '#f4f4f5',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">-- Select Saved Route (Required) --</option>
                  {savedRoutes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.area ? `(Area: ${r.area})` : ''}
                    </option>
                  ))}
                </select>
                {!editRouteForm.route_id ? (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    * Required: Route Name must be selected from the database list.
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.25rem', display: 'block' }}>
                    ✓ Canonical Route: {editRouteForm.route_name}
                  </span>
                )}
              </div>

              {/* Driver Dropdown */}
              <Select
                label="Assigned Driver *"
                value={editRouteForm.driver_id}
                onChange={(e) => setEditRouteForm({ ...editRouteForm, driver_id: e.target.value })}
                options={[
                  { value: '', label: '-- Select Driver --' },
                  ...drivers.map(d => ({
                    value: d.id,
                    label: `${d.name} (${d.status || 'AVAILABLE'}) - ${d.phone}`
                  }))
                ]}
              />

              {/* Assigned Vehicle (Optional Dropdown) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Assigned Vehicle <span style={{ color: '#71717a', textTransform: 'none' }}>(Optional)</span>
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
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    backgroundColor: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    color: '#f4f4f5',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">-- None (Not Assigned) --</option>
                  {vehiclesList.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} ({v.vehicle_type || 'Fleet'}) - [{v.status}]
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.25rem', display: 'block' }}>
                  Select a vehicle or choose "-- None (Not Assigned) --" to leave vehicle unassigned.
                </span>
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  type="date"
                  label="Route Date *"
                  value={editRouteForm.dispatch_date}
                  onChange={(e) => setEditRouteForm({ ...editRouteForm, dispatch_date: e.target.value })}
                />
                <Input
                  label="Starting Time"
                  placeholder="e.g. 08:30 AM"
                  value={editRouteForm.start_time}
                  onChange={(e) => setEditRouteForm({ ...editRouteForm, start_time: e.target.value })}
                />
              </div>

              {/* Start Location & Destination */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Input
                  label="Start Location"
                  placeholder="e.g. Main Plant"
                  value={editRouteForm.start_location}
                  onChange={(e) => setEditRouteForm({ ...editRouteForm, start_location: e.target.value })}
                />
                <Input
                  label="Destination Areas"
                  placeholder="e.g. Chintalapudi"
                  value={editRouteForm.destination_areas}
                  onChange={(e) => setEditRouteForm({ ...editRouteForm, destination_areas: e.target.value })}
                />
              </div>

              {/* Notes */}
              <Input
                label="Remarks / Notes (Optional)"
                placeholder="Special delivery instructions or remarks"
                value={editRouteForm.notes}
                onChange={(e) => setEditRouteForm({ ...editRouteForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <Button variant="outline" onClick={() => setShowEditRouteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={savingEditRoute || !editRouteForm.route_id}
                onClick={handleEditRouteSubmit}
              >
                {savingEditRoute ? 'Saving Changes...' : 'Save Route Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: ADD / EDIT DRIVER MODAL
          ========================================================================= */}
      {showDriverModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', width: '100%', maxWidth: '540px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                {editingDriver ? 'Edit Driver Profile' : 'Add New Driver Profile'}
              </h3>
              <button onClick={() => setShowDriverModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Driver Name *"
                placeholder="Full name"
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              />

              <Input
                label="Mobile Number (WhatsApp) *"
                placeholder="10-digit mobile"
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
              />

              <Input
                label="Assigned Vehicle Model"
                placeholder="e.g. Tata Ace 407 / Bolero Maxi"
                value={driverForm.assigned_vehicle}
                onChange={(e) => setDriverForm({ ...driverForm, assigned_vehicle: e.target.value })}
              />

              <Input
                label="Vehicle Registration Number (Optional)"
                placeholder="Optional - e.g. AP 16 CD 5678"
                value={driverForm.vehicle_number}
                onChange={(e) => setDriverForm({ ...driverForm, vehicle_number: e.target.value })}
              />

              <Input
                label="Driving License Number"
                placeholder="DL number"
                value={driverForm.license_number}
                onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
              />

              <Input
                type="date"
                label="Joining Date"
                value={driverForm.joining_date}
                onChange={(e) => setDriverForm({ ...driverForm, joining_date: e.target.value })}
              />

              <Input
                type="number"
                label="Monthly Salary (₹)"
                value={driverForm.salary}
                onChange={(e) => setDriverForm({ ...driverForm, salary: Number(e.target.value) })}
              />

              <Select
                label="Current Route Status"
                value={driverForm.status}
                onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value as any })}
                options={[
                  { value: 'AVAILABLE', label: 'AVAILABLE (Ready for Route)' },
                  { value: 'ON_ROUTE', label: 'ON_ROUTE (Currently Dispatched)' },
                  { value: 'INACTIVE', label: 'INACTIVE' }
                ]}
              />

              <div style={{ gridColumn: 'span 2' }}>
                <Input
                  label="Address"
                  placeholder="Driver residence address"
                  value={driverForm.address}
                  onChange={(e) => setDriverForm({ ...driverForm, address: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Button variant="outline" onClick={() => setShowDriverModal(false)}>Cancel</Button>
              <Button variant="primary" disabled={savingDriver} onClick={handleDriverFormSubmit}>
                {savingDriver ? 'Saving...' : 'Save Driver Profile'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: VIEW ROUTE DETAILS & CUSTOMER INVOICES
          ========================================================================= */}
      {viewRouteRecord && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                  Route Details &amp; Bills ({viewRouteRecord.dispatch_number})
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                  {viewRouteRecord.route_name} • Driver: {viewRouteRecord.driver_name} • Date: {viewRouteRecord.dispatch_date}
                </span>
              </div>
              <button onClick={() => setViewRouteRecord(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Generated Customer Bills Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Customer Invoices Generated from this Route ({(viewRouteRecord.generated_bills || []).length})
              </h4>

              {(viewRouteRecord.generated_bills || []).length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#a1a1aa', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  No finalized bills recorded yet. Bills are generated upon route settlement.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {((viewRouteRecord.generated_bills as any[]) || []).map((bill: any, idx: number) => (
                    <div key={idx} style={{ backgroundColor: '#27272a', padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', fontSize: '0.88rem' }}>
                            {bill.invoice_number}
                          </span>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
                            {bill.customer_name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
                          Phone: {bill.customer_phone || 'N/A'} • Paid: ₹{bill.paid_amount || 0} • Due: ₹{bill.due_amount || 0}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95rem', marginRight: '0.5rem' }}>
                          ₹{Number(bill.grand_total || 0).toFixed(2)}
                        </span>

                        {/* Download PDF Button */}
                        <button
                          type="button"
                          onClick={() => generateBillPDF(bill)}
                          style={{
                            backgroundColor: '#3f3f46',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Download style={{ width: '12px', height: '12px' }} />
                          PDF
                        </button>

                        {/* WhatsApp Button: [ SEND BILL ON WHATSAPP ] */}
                        <button
                          type="button"
                          onClick={() => setWhatsAppBill(bill)}
                          style={{
                            backgroundColor: '#25D366',
                            border: 'none',
                            color: '#000',
                            borderRadius: '4px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
                          }}
                        >
                          <Send style={{ width: '12px', height: '12px' }} />
                          SEND ON WHATSAPP
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setViewRouteRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP SHARE MODAL */}
      {whatsAppBill && (
        <WhatsAppShareModal
          isOpen={!!whatsAppBill}
          onClose={() => setWhatsAppBill(null)}
          bill={whatsAppBill}
        />
      )}

      {/* RECEIPT PREVIEW MODAL */}
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
