'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'


interface RouteStop {
  id: string
  route_id: string
  name: string
  stop_order: number
}

interface StopEntry {
  stopName: string
  productName: string
  quantity: number
  rate: number
  cashPaid: number
  upiPaid: number
  returnedQty: number
  leakedQty: number
}

export default function NonLocalRoutesPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Trip configuration
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [tripDate, setTripDate] = useState(new Date().toLocaleDateString('en-CA'))
  
  // Dynamic Stop entries state
  const [stopEntries, setStopEntries] = useState<Record<string, StopEntry>>({})
  
  // Expenses state
  const [fuelCharges, setFuelCharges] = useState(0)
  const [driverBata, setDriverBata] = useState(0)
  const [otherExpenses, setOtherExpenses] = useState(0)
  const [remarks, setRemarks] = useState('')
  
  // History logs
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  
  // Dispatch configuration state
  const [activeDispatch, setActiveDispatch] = useState<any | null>(null)
  const [dispatchItems, setDispatchItems] = useState<Record<string, number>>({
    'Water Can (20L)': 0,
    'Cooling Can (20L)': 0,
    'Bags (100 Pack)': 0,
    '500ml Bottle Case': 0,
    '1L Bottle Case': 0,
    '2L Bottle Case': 0
  })
  
  // Admin configuration state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [routeStopsList, setRouteStopsList] = useState<RouteStop[]>([])
  const [newStopName, setNewStopName] = useState('')
  const [savingStop, setSavingStop] = useState(false)
  const [savingRoute, setSavingRoute] = useState(false)
  const [newRouteName, setNewRouteName] = useState('')
  const [newRouteArea, setNewRouteArea] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedRoute) {
      loadRouteStops(selectedRoute.id)
      loadRouteHistory(selectedRoute.id)
      loadActiveDispatch(selectedRoute.id, tripDate)
    }
  }, [selectedRoute, tripDate])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [routesRes, driversRes] = await Promise.all([
        supabase.from('routes').select('id, name, driver_id, area').order('name'),
        supabase.from('drivers').select('id, name, phone, salary, is_active').order('name')
      ])

      const dbRoutes = routesRes.data
      const dbDrivers = driversRes.data

      if (dbRoutes) {
        // Filter for Non-Local Routes (does not contain 'local' in the name)
        const nonLocal = dbRoutes.filter(r => !r.name.toLowerCase().includes('local'))
        setRoutes(nonLocal)
        if (nonLocal.length > 0) {
          setSelectedRoute(nonLocal[0])
        }
      }
      
      if (dbDrivers) {
        // Only show Nagaraju & Driver-2
        const filtered = dbDrivers.filter(d => 
          d.name.toLowerCase().includes('nagaraju') || d.name.toLowerCase().includes('driver-2')
        )
        setDrivers(filtered)
        if (filtered.length > 0) {
          setSelectedDriverId(filtered[0].id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveDispatch(routeId: string, date: string) {
    try {
      const { data, error } = await supabase
        .from('route_dispatches')
        .select('*')
        .eq('route_id', routeId)
        .eq('date', date)
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setActiveDispatch(data)
        // Set dispatch items state
        const itemsMap: Record<string, number> = {
          'Water Can (20L)': 0,
          'Cooling Can (20L)': 0,
          'Bags (100 Pack)': 0,
          '500ml Bottle Case': 0,
          '1L Bottle Case': 0,
          '2L Bottle Case': 0
        }
        data.items.forEach((item: any) => {
          itemsMap[item.product_name] = item.quantity
        })
        setDispatchItems(itemsMap)
      } else {
        setActiveDispatch(null)
        setDispatchItems({
          'Water Can (20L)': 0,
          'Cooling Can (20L)': 0,
          'Bags (100 Pack)': 0,
          '500ml Bottle Case': 0,
          '1L Bottle Case': 0,
          '2L Bottle Case': 0
        })
      }
    } catch (e) {
      console.error('loadActiveDispatch error:', e)
    }
  }

  async function handleCreateDispatch() {
    if (!selectedRoute || !selectedDriverId || !vehicleNumber) {
      alert('Please configure Driver and Vehicle Number first!')
      return
    }
    const itemsList = Object.entries(dispatchItems)
      .map(([name, qty]) => ({ product_name: name, quantity: qty }))
      .filter(item => item.quantity > 0)
    
    if (itemsList.length === 0) {
      alert('Please load at least one product with quantity > 0!')
      return
    }

    try {
      const { data, error } = await supabase
        .from('route_dispatches')
        .insert({
          route_id: selectedRoute.id,
          driver_id: selectedDriverId,
          date: tripDate,
          items: itemsList,
          status: 'dispatched',
          issued_by: 'Admin'
        })
        .select()
        .single()

      if (!error && data) {
        setActiveDispatch(data)
        alert('🎉 Route Dispatch Loading Sheet created successfully!')
      } else {
        alert(error?.message || 'Failed to create dispatch.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function loadRouteStops(routeId: string) {
    try {
      const [stopsRes, custsRes] = await Promise.all([
        supabase
          .from('route_stops')
          .select('id, route_id, name, stop_order')
          .eq('route_id', routeId)
          .order('stop_order'),
        supabase
          .from('route_customers')
          .select('name, route_id, product_name, default_qty, default_rate')
          .eq('route_id', routeId)
      ])

      const stops = stopsRes.data
      const custs = custsRes.data

      setRouteStopsList(stops || [])

      // Pre-seed stop inputs
      const initialEntries: Record<string, StopEntry> = {}

      if (stops) {
        stops.forEach(s => {
          // Find if there is customer config for default rates
          const cConf = custs?.find(c => c.name === s.name)
          initialEntries[s.id] = {
            stopName: s.name,
            productName: cConf?.product_name || 'Water Can (20L)',
            quantity: cConf?.default_qty || 0,
            rate: Number(cConf?.default_rate) || 15.00,
            cashPaid: 0,
            upiPaid: 0,
            returnedQty: 0,
            leakedQty: 0
          }
        })
      }
      setStopEntries(initialEntries)
    } catch (e) {
      console.error(e)
    }
  }

  async function loadRouteHistory(routeId: string) {
    try {
      const { data: runs, error } = await supabase
        .from('route_runs')
        .select('*, drivers(name)')
        .eq('route_id', routeId)
        .order('date', { ascending: false })

      if (!error && runs) {
        const formatted = runs.map(r => {
          // Count total quantity sold across all stops
          const totalQty = r.stops ? r.stops.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0) : 0
          return {
            id: r.id,
            date: r.date,
            driver: r.drivers?.name || 'Nagaraju',
            product: r.stops && r.stops.length > 0 ? r.stops[0].productName : 'Multiple',
            qty: totalQty,
            sales: Number(r.total_sales) || 0,
            expenses: Number(r.total_expenses) || 0,
            due: Math.max(0, (Number(r.total_sales) || 0) - ((Number(r.net_collection) || 0) + (Number(r.total_expenses) || 0))),
            netCollection: Number(r.net_collection) || 0
          }
        })
        setHistoryLogs(formatted)
      } else {
        setHistoryLogs([])
      }
    } catch (e) {
      console.error('loadRouteHistory error:', e)
    }
  }

  const updateStopEntry = (stopId: string, field: keyof StopEntry, value: any) => {
    setStopEntries(prev => ({
      ...prev,
      [stopId]: {
        ...prev[stopId],
        [field]: value
      }
    }))
  }

  // Auto Calculations
  const calculateTotals = () => {
    let totalSales = 0
    let totalCollected = 0
    let outstandingDue = 0
    let totalQty = 0

    Object.values(stopEntries).forEach(e => {
      const total = e.quantity * e.rate
      const collected = Number(e.cashPaid) + Number(e.upiPaid)
      const due = Math.max(0, total - collected)

      totalSales += total
      totalCollected += collected
      outstandingDue += due
      totalQty += e.quantity
    })

    const totalExpenses = Number(fuelCharges) + Number(driverBata) + Number(otherExpenses)
    const netCollection = totalCollected - totalExpenses

    return {
      totalSales,
      totalExpenses,
      netCollection,
      outstandingDue,
      totalQty
    }
  }

  const totals = calculateTotals()

  // Save Route Trip Run to Supabase
  const handleSaveTrip = async () => {
    if (!selectedRoute || !selectedDriverId || !vehicleNumber) {
      alert('Please select driver and specify vehicle number!')
      return
    }

    // 1. Crosscheck Dispatch vs Accounted Stop Sheet quantities (Task 2)
    const stopTotals: Record<string, { sold: number; returned: number; leaked: number }> = {}
    Object.values(stopEntries).forEach(e => {
      if (!stopTotals[e.productName]) {
        stopTotals[e.productName] = { sold: 0, returned: 0, leaked: 0 }
      }
      stopTotals[e.productName].sold += Number(e.quantity) || 0
      stopTotals[e.productName].returned += Number(e.returnedQty) || 0
      stopTotals[e.productName].leaked += Number(e.leakedQty) || 0
    })

    const discrepancies: string[] = []
    if (activeDispatch) {
      activeDispatch.items.forEach((item: any) => {
        const totals = stopTotals[item.product_name] || { sold: 0, returned: 0, leaked: 0 }
        const accounted = totals.sold + totals.returned + totals.leaked
        if (accounted !== item.quantity) {
          discrepancies.push(
            `• ${item.product_name}: Dispatched ${item.quantity}, but accounted for ${accounted} (Sold: ${totals.sold}, Returned: ${totals.returned}, Leaked: ${totals.leaked}). Difference of ${item.quantity - accounted}.`
          )
        }
      })
    }

    if (discrepancies.length > 0) {
      const proceed = window.confirm(
        `⚠️ DISPATCH RECONCILIATION MISMATCH:\n\n${discrepancies.join('\n')}\n\nDo you want to proceed and save anyway?`
      )
      if (!proceed) return
    }

    setSavingRoute(true)
    try {
      // 2. Loop and save stop sales
      for (const [stopId, entry] of Object.entries(stopEntries)) {
        if (entry.quantity <= 0) continue // Skip unbilled stops

        const total = entry.quantity * entry.rate
        const due = total - (Number(entry.cashPaid) + Number(entry.upiPaid))
        const invoiceNumber = `RK-NL-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`

        const { error: salesErr } = await supabase
          .from('route_sales')
          .insert({
            invoice_number: invoiceNumber,
            driver_id: selectedDriverId,
            route_id: selectedRoute.id,
            customer_name: entry.stopName,
            product_name: entry.productName,
            quantity: entry.quantity,
            rate: entry.rate,
            total_amount: total,
            cash_paid: Number(entry.cashPaid) || 0,
            upi_paid: Number(entry.upiPaid) || 0,
            due_amount: due > 0 ? due : 0,
            sale_date: tripDate,
            invoice_type: 'driver_sale',
            is_gst: false
          })

        if (salesErr) {
          console.error('Save stop sales error:', salesErr.message)
        }
      }

      // 3. Save Route Expenses
      const totalExpenses = Number(fuelCharges) + Number(driverBata) + Number(otherExpenses)
      if (totalExpenses > 0) {
        const { error: expErr } = await supabase
          .from('route_expenses')
          .insert({
            route_id: selectedRoute.id,
            driver_id: selectedDriverId,
            fuel_charges: Number(fuelCharges) || 0,
            driver_bata: Number(driverBata) || 0,
            other_expenses: Number(otherExpenses) || 0,
            remarks: remarks,
            vehicle_number: vehicleNumber,
            expense_date: tripDate
          })

        if (expErr) {
          console.error('Save route expenses error:', expErr.message)
        }
      }

      // 4. Save Route Run Settlement (Task 2)
      const totalReturned = Object.values(stopEntries).reduce((sum, e) => sum + (Number(e.returnedQty) || 0), 0)
      const totalLeaked = Object.values(stopEntries).reduce((sum, e) => sum + (Number(e.leakedQty) || 0), 0)

      const { error: runError } = await supabase
        .from('route_runs')
        .insert({
          route_id: selectedRoute.id,
          driver_id: selectedDriverId,
          date: tripDate,
          dispatch_id: activeDispatch?.id || null,
          stops: Object.values(stopEntries),
          total_sales: totals.totalSales,
          total_returned: totalReturned,
          total_leaked: totalLeaked,
          total_expenses: totalExpenses,
          net_collection: totals.netCollection
        })

      if (runError) {
        console.error('Save route run settlement error:', runError.message)
      }

      // 5. Update Dispatch Status
      if (activeDispatch) {
        await supabase
          .from('route_dispatches')
          .update({ status: 'reconciled' })
          .eq('id', activeDispatch.id)
      }

      alert('🎉 Route Trip Record Reconciled, Locked & Saved Successfully!')
      // Reset forms
      setFuelCharges(0)
      setDriverBata(0)
      setOtherExpenses(0)
      setRemarks('')
      setVehicleNumber('')
      loadRouteStops(selectedRoute.id)
      loadRouteHistory(selectedRoute.id)
      loadActiveDispatch(selectedRoute.id, tripDate)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingRoute(false)
    }
  }

  // Admin Config: Add new Stop
  const handleAddStop = async () => {
    if (!newStopName || !selectedRoute) return
    setSavingStop(true)
    
    try {
      const nextOrder = routeStopsList.length + 1
      const { error } = await supabase
        .from('route_stops')
        .insert({
          route_id: selectedRoute.id,
          name: newStopName,
          stop_order: nextOrder
        })

      if (!error) {
        setNewStopName('')
        loadRouteStops(selectedRoute.id)
      } else {
        alert(error.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingStop(false)
    }
  }

  // Admin Config: Add new Route
  const handleCreateRoute = async () => {
    if (!newRouteName) return
    setSavingRoute(true)
    
    try {
      const { error } = await supabase
        .from('routes')
        .insert({
          name: newRouteName + ' Route',
          area: newRouteArea,
          is_active: true
        })

      if (!error) {
        setNewRouteName('')
        setNewRouteArea('')
        loadInitialData()
      } else {
        alert(error.message)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingRoute(false)
    }
  }

  // Admin Config: Delete Stop
  const handleDeleteStop = async (stopId: string) => {
    if (!confirm('Are you sure you want to delete this stop?')) return
    
    try {
      await supabase.from('route_stops').delete().eq('id', stopId)
      loadRouteStops(selectedRoute.id)
    } catch (e) {
      console.error(e)
    }
  }

  // PDF Export using jsPDF
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`ROYAL KISSAN - ${selectedRoute?.name?.toUpperCase()} SHEET`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Date: ${tripDate} | Vehicle: ${vehicleNumber} | Driver: ${drivers.find(d => d.id === selectedDriverId)?.name || 'Nagaraju'}`, 14, 26)

    const tableRows = Object.entries(stopEntries).map(([id, e]) => {
      const total = e.quantity * e.rate
      const collected = Number(e.cashPaid) + Number(e.upiPaid)
      const due = Math.max(0, total - collected)
      return [
        e.stopName,
        e.productName,
        e.quantity.toString(),
        `Rs.${e.rate}`,
        `Rs.${total}`,
        `Rs.${collected}`,
        `Rs.${due}`
      ]
    })

    ;(doc as any).autoTable({
      head: [['Stop Name', 'Product', 'Quantity', 'Rate', 'Total', 'Collected', 'Due']],
      body: tableRows,
      startY: 32,
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.text(`Summary:`, 14, finalY)
    doc.text(`Total Sales: Rs.${totals.totalSales}`, 14, finalY + 6)
    doc.text(`Total Expenses: Rs.${totals.totalExpenses}`, 14, finalY + 12)
    doc.text(`Net Collection: Rs.${totals.netCollection}`, 14, finalY + 18)
    doc.text(`Outstanding Due: Rs.${totals.outstandingDue}`, 14, finalY + 24)

    doc.save(`${selectedRoute?.name}_RouteSheet_${tripDate}.pdf`)
  }

  // CSV Export
  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Stop Name,Product,Quantity,Rate,Total,Cash Collected,UPI Collected,Due\n'

    Object.values(stopEntries).forEach(e => {
      const total = e.quantity * e.rate
      const collected = Number(e.cashPaid) + Number(e.upiPaid)
      const due = Math.max(0, total - collected)
      csvContent += `"${e.stopName}","${e.productName}",${e.quantity},${e.rate},${total},${e.cashPaid},${e.upiPaid},${due}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${selectedRoute?.name}_RouteSheet_${tripDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="animate-fade-in" style={{ padding: '0.25rem' }}>
      
      {/* HEADER SECTION WITH ROUTE SELECTOR */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 className="page-title">🛣️ Non-Local Route Management</h2>
          <p className="page-subtitle">Configure stop sheets, log trip sales & expenses, and audit history</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowAdminPanel(!showAdminPanel)}>
            ⚙️ {showAdminPanel ? 'Close Admin Panel' : 'Open Route Settings'}
          </button>
        </div>
      </div>

      {/* ADMIN PANEL: CREATE ROUTES & ADD STOPS */}
      {showAdminPanel && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Add Stop to Route */}
          <div className="glass-card-3d" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>
              Add Stops to: {selectedRoute?.name}
            </h3>
            <div className="form-group">
              <label className="form-label">Stop / Store Name *</label>
              <input className="form-input" placeholder="e.g. Balaji Wine Shop" value={newStopName} onChange={e => setNewStopName(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddStop} disabled={savingStop || !newStopName}>
              {savingStop ? 'Saving...' : '➕ Add Stop'}
            </button>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'hsl(215 20% 60%)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Stops List</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {routeStopsList.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#fff' }}>{s.stop_order}. {s.name}</span>
                    <button className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleDeleteStop(s.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create New Highway Route */}
          <div className="glass-card-3d" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>
              Create New Route
            </h3>
            <div className="form-group">
              <label className="form-label">Route Name *</label>
              <input className="form-input" placeholder="e.g. Dammapeta" value={newRouteName} onChange={e => setNewRouteName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Area covered</label>
              <input className="form-input" placeholder="Area description" value={newRouteArea} onChange={e => setNewRouteArea(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateRoute} disabled={savingRoute || !newRouteName}>
              {savingRoute ? 'Saving...' : '🗺️ Create Route'}
            </button>
          </div>

        </div>
      )}

      {/* TRIP SETTINGS CONFIGURATOR */}
      <div className="glass-card-3d" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Route Selected</label>
            <select className="form-input" value={selectedRoute?.id || ''} onChange={e => setSelectedRoute(routes.find(r => r.id === e.target.value))}>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Driver Assigned</label>
            <select className="form-input" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vehicle Number *</label>
            <input className="form-input" placeholder="AP-07-XX-9999" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={tripDate} onChange={e => setTripDate(e.target.value)} />
          </div>

        </div>
      </div>

      {/* ROUTE DISPATCH CONFIGURATOR PANEL (Task 1) */}
      <div className="glass-card-3d" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
              {activeDispatch ? '✅ Dispatch Issued' : '📦 Route Dispatch Loading Config'}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'hsl(215 20% 65%)' }}>
              {activeDispatch ? 'Stock is dispatched and loaded onto vehicle.' : 'Configure quantities issued to driver before route start.'}
            </p>
          </div>
          {activeDispatch && (
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              🖨️ Print Dispatch Loading Sheet
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {Object.entries(dispatchItems).map(([prodName, qty]) => (
            <div key={prodName} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>{prodName}</label>
              {activeDispatch ? (
                <div className="form-input font-mono" style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                  {qty} units
                </div>
              ) : (
                <input 
                  type="number" 
                  className="form-input font-mono" 
                  placeholder="0" 
                  value={qty === 0 ? '' : qty} 
                  onChange={e => setDispatchItems(prev => ({
                    ...prev,
                    [prodName]: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                  }))} 
                />
              )}
            </div>
          ))}
        </div>

        {!activeDispatch && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleCreateDispatch}>
              📦 Save & Issue Dispatch Sheet
            </button>
          </div>
        )}
      </div>

      {/* DAILY STOP SHEET INVOICING PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">📖 Daily Stop Invoicing Sheet: {selectedRoute?.name}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={exportCSV}>CSV Export</button>
              <button className="btn btn-secondary btn-sm" onClick={exportPDF}>PDF Export</button>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            {routeStopsList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(215 20% 45%)' }}>
                <p>No stops configured. Open Route Settings to configure stops for this route.</p>
              </div>
            ) : (
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Stop Name</th>
                    <th>Product description</th>
                    <th style={{ width: '100px' }}>Quantity</th>
                    <th style={{ width: '100px' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ width: '110px' }}>Cash Paid (₹)</th>
                    <th style={{ width: '110px' }}>UPI Paid (₹)</th>
                    <th style={{ width: '100px' }}>Returned</th>
                    <th style={{ width: '100px' }}>Leaked</th>
                    <th style={{ textAlign: 'right' }}>Dues (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {routeStopsList.map(s => {
                    const entry = stopEntries[s.id] || {
                      stopName: s.name,
                      productName: 'Water Can (20L)',
                      quantity: 0,
                      rate: 15,
                      cashPaid: 0,
                      upiPaid: 0,
                      returnedQty: 0,
                      leakedQty: 0
                    }
                    const total = entry.quantity * entry.rate
                    const collected = Number(entry.cashPaid) + Number(entry.upiPaid)
                    const due = Math.max(0, total - collected)

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: '700', color: '#fff' }}>{s.name}</td>
                        <td>
                          <select className="form-input" style={{ padding: '0.4rem 0.625rem', minWidth: '150px' }} value={entry.productName} onChange={e => updateStopEntry(s.id, 'productName', e.target.value)}>
                            <option value="Water Can (20L)">Water Can (20L)</option>
                            <option value="Cooling Can (20L)">Cooling Can (20L)</option>
                            <option value="Bags (100 Pack)">Bags (100 Pack)</option>
                            <option value="500ml Bottle Case">500ml Bottle Case</option>
                            <option value="1L Bottle Case">1L Bottle Case</option>
                            <option value="2L Bottle Case">2L Bottle Case</option>
                          </select>
                        </td>
                        <td>
                          <input type="number" className="form-input" style={{ padding: '0.4rem 0.625rem' }} value={entry.quantity === 0 ? '' : entry.quantity} placeholder="0" onChange={e => updateStopEntry(s.id, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input type="number" className="form-input" style={{ padding: '0.4rem 0.625rem' }} value={entry.rate === 0 ? '' : entry.rate} placeholder="0" onChange={e => updateStopEntry(s.id, 'rate', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{total}</td>
                        <td>
                          <input type="number" className="form-input" style={{ padding: '0.4rem 0.625rem', borderColor: 'rgba(52,211,153,0.3)' }} value={entry.cashPaid === 0 ? '' : entry.cashPaid} placeholder="0" onChange={e => updateStopEntry(s.id, 'cashPaid', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input type="number" className="form-input" style={{ padding: '0.4rem 0.625rem', borderColor: 'rgba(96,165,250,0.3)' }} value={entry.upiPaid === 0 ? '' : entry.upiPaid} placeholder="0" onChange={e => updateStopEntry(s.id, 'upiPaid', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input type="number" className="form-input" style={{ padding: '0.4rem 0.625rem' }} value={entry.returnedQty === 0 ? '' : entry.returnedQty} placeholder="0" onChange={e => updateStopEntry(s.id, 'returnedQty', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td>
                          <input type="number" className="form-input" style={{ padding: '0.4rem 0.625rem' }} value={entry.leakedQty === 0 ? '' : entry.leakedQty} placeholder="0" onChange={e => updateStopEntry(s.id, 'leakedQty', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
                        </td>
                        <td style={{ textAlign: 'right', color: due > 0 ? '#f87171' : '#34d399', fontWeight: '700' }}>
                          ₹{due}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* EXPENSES & AUTO CALCULATIONS BOTTOM PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Expenses entry card */}
        <div className="glass-card-3d" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '1.25rem' }}>Log Route Expenses</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Fuel Charges (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={fuelCharges === 0 ? '' : fuelCharges} onChange={e => setFuelCharges(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
            </div>
            <div className="form-group">
              <label className="form-label">Driver Bata (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={driverBata === 0 ? '' : driverBata} onChange={e => setDriverBata(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
            </div>
            <div className="form-group">
              <label className="form-label">Other Expenses (₹)</label>
              <input type="number" className="form-input" placeholder="0" value={otherExpenses === 0 ? '' : otherExpenses} onChange={e => setOtherExpenses(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Trip Remarks / Description</label>
            <input className="form-input" placeholder="Fuel receipts or Bata notes" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </div>

        {/* Dynamic calculations card */}
        <div className="glass-card-3d" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>Dynamic Summary</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'hsl(215 20% 55%)' }}>Total Sales Amount:</span>
              <span style={{ fontWeight: '700', color: '#fff' }}>₹{totals.totalSales}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'hsl(215 20% 55%)' }}>Total Qty Loaded:</span>
              <span style={{ fontWeight: '700', color: '#fff' }}>{totals.totalQty} cases/cans</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'hsl(215 20% 55%)' }}>Trip Expenses Logged:</span>
              <span style={{ fontWeight: '700', color: '#f87171' }}>- ₹{totals.totalExpenses}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
              <span>Outstanding Route Due:</span>
              <span style={{ fontWeight: '800' }}>₹{totals.outstandingDue}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', fontWeight: '600' }}>NET TRIP COLLECTION</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: totals.netCollection >= 0 ? '#34d399' : '#f87171', marginTop: '0.125rem' }}>
                ₹{totals.netCollection}
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.75rem 1.75rem', borderRadius: '0.75rem' }} 
              onClick={handleSaveTrip}
              disabled={savingRoute || totals.totalQty === 0}
            >
              {savingRoute ? 'Locking...' : '💾 Lock & Lock Route Run'}
            </button>
          </div>
        </div>

      </div>

      {/* TRIP HISTORY LOG TABLE */}
      <div className="glass-card-3d" style={{ overflow: 'hidden' }}>
        <div className="card-header"><h3 className="card-title">📖 Permanent Route Run History Logs</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver Name</th>
                <th>Product Type</th>
                <th style={{ textAlign: 'center' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Total Sales</th>
                <th style={{ textAlign: 'right' }}>Trip Expenses</th>
                <th style={{ textAlign: 'right' }}>Route Due</th>
                <th style={{ textAlign: 'right' }}>Net Collection</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: '600' }}>{h.date}</td>
                  <td style={{ fontWeight: '600', color: '#fff' }}>{h.driver}</td>
                  <td>{h.product}</td>
                  <td style={{ textAlign: 'center' }}>{h.qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{h.sales}</td>
                  <td style={{ textAlign: 'right', color: '#f87171' }}>₹{h.expenses}</td>
                  <td style={{ textAlign: 'right', color: h.due > 0 ? '#f87171' : 'inherit' }}>₹{h.due}</td>
                  <td style={{ textAlign: 'right', color: '#34d399', fontWeight: '700' }}>₹{h.netCollection}</td>
                </tr>
              ))}
              {historyLogs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(215 20% 45%)' }}>
                    No route runs logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE DISPATCH SHEET TEMPLATE (Task 1) */}
      {activeDispatch && (
        <div id="printable-dispatch" className="print-a4" style={{ display: 'none', background: '#fff', color: '#000', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#000' }}>ROYAL KISSAN</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}>PACKAGED DRINKING WATER</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '0.4rem 0', margin: '1rem 0', color: '#000' }}>
              ROUTE DISPATCH LOADING SHEET
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', fontSize: '0.95rem', color: '#000' }}>
            <div>
              <strong>Route Name:</strong> {selectedRoute?.name}<br />
              <strong>Driver Assigned:</strong> {drivers.find(d => d.id === activeDispatch.driver_id)?.name || 'Nagaraju'}<br />
            </div>
            <div>
              <strong>Date:</strong> {activeDispatch.date}<br />
              <strong>Vehicle Number:</strong> {vehicleNumber || '—'}<br />
              <strong>Issued By:</strong> {activeDispatch.issued_by || 'Admin'}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem', color: '#000' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Product description</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Quantity Loaded</th>
              </tr>
            </thead>
            <tbody>
              {activeDispatch.items.map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={{ padding: '0.75rem 0' }}>{item.product_name}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0', fontWeight: '700' }}>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginTop: '4rem', color: '#000' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
              Driver Signature
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
              Authorized Issuer Signature
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
