'use client'

import { useState, useEffect } from 'react'
import { 
  Printer, 
  Bluetooth, 
  Wifi, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Send, 
  Clock, 
  Settings, 
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Radio,
  FileText
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  getRecentPrintJobs, 
  getPrinterDevices, 
  enqueueThermalPrintJob, 
  getBridgeWorkerStatus,
  getPrinterSettings,
  savePrinterSettings,
  PrintJobRecord, 
  PrinterDeviceRecord,
  PrintBridgeWorkerRecord,
  savePrinterDevice
} from '@/lib/services/print-job-service'
import { BillData } from '@/lib/printer/receipt'

export default function PrinterManagementPage() {
  const [devices, setDevices] = useState<PrinterDeviceRecord[]>([])
  const [jobs, setJobs] = useState<PrintJobRecord[]>([])
  const [bridgeWorker, setBridgeWorker] = useState<PrintBridgeWorkerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [preferredTransport, setPreferredTransport] = useState<'bluetooth' | 'wifi'>('wifi')
  const [wifiIp, setWifiIp] = useState('192.168.1.1')
  const [wifiPort, setWifiPort] = useState('9100')
  const [btMac, setBtMac] = useState('2B:04:E1:72:1B:54')
  const [btName, setBtName] = useState('RP3230ABW-1B54')
  const [testingPrint, setTestingPrint] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
    // Poll bridge worker status every 6 seconds for real-time heartbeat monitoring
    const interval = setInterval(async () => {
      const worker = await getBridgeWorkerStatus()
      setBridgeWorker(worker)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [devList, jobList, worker, settings] = await Promise.all([
        getPrinterDevices(),
        getRecentPrintJobs(30),
        getBridgeWorkerStatus(),
        getPrinterSettings()
      ])
      setDevices(devList)
      setJobs(jobList)
      setBridgeWorker(worker)

      if (settings?.preferred_connection) {
        setPreferredTransport(settings.preferred_connection === 'bluetooth' ? 'bluetooth' : 'wifi')
      }

      const wifiDev = devList.find(d => d.connection_type === 'wifi')
      if (wifiDev?.wifi_ip) {
        setWifiIp(wifiDev.wifi_ip)
        setWifiPort(String(wifiDev.wifi_port || 9100))
      }

      const btDev = devList.find(d => d.connection_type === 'bluetooth')
      if (btDev?.bluetooth_mac) {
        setBtMac(btDev.bluetooth_mac)
        setBtName(btDev.bluetooth_device_name || 'RP3230ABW-1B54')
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  async function handleSetTransport(transport: 'wifi' | 'bluetooth') {
    setPreferredTransport(transport)
    await savePrinterSettings({ preferred_connection: transport })
    await savePrinterDevice({
      device_name: 'TVS RP 3230 ABW (Wi-Fi)',
      connection_type: 'wifi',
      is_default: transport === 'wifi'
    })
    await savePrinterDevice({
      device_name: 'TVS RP 3230 ABW (Bluetooth)',
      connection_type: 'bluetooth',
      is_default: transport === 'bluetooth'
    })
    setStatusMsg({
      type: 'success',
      text: `Preferred transport updated to ${transport === 'wifi' ? 'Wi-Fi RAW Socket' : 'Bluetooth SPP'} and saved to cloud.`
    })
  }

  async function handleSaveDeviceConfigs() {
    setStatusMsg(null)
    const successWifi = await savePrinterDevice({
      device_name: 'TVS RP 3230 ABW (Wi-Fi)',
      connection_type: 'wifi',
      wifi_ip: wifiIp.trim(),
      wifi_port: Number(wifiPort) || 9100,
      is_default: preferredTransport === 'wifi',
      is_active: true,
      registered_device_id: 'tvs-rp3230-wifi-primary'
    })

    const successBt = await savePrinterDevice({
      device_name: 'TVS RP 3230 ABW (Bluetooth)',
      connection_type: 'bluetooth',
      bluetooth_mac: btMac.trim().toUpperCase(),
      bluetooth_device_name: btName.trim(),
      is_default: preferredTransport === 'bluetooth',
      is_active: true,
      registered_device_id: 'tvs-rp3230-bt-primary'
    })

    await savePrinterSettings({ preferred_connection: preferredTransport })

    if (successWifi || successBt) {
      setStatusMsg({ type: 'success', text: '✅ TVS RP 3230 ABW configuration saved successfully!' })
      loadData()
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to update printer settings. Check Supabase connection.' })
    }
  }

  async function handleSendTestPrint() {
    setTestingPrint(true)
    setStatusMsg(null)

    const dummyBill: BillData = {
      invoice_number: `TEST-${Date.now().toString().slice(-4)}`,
      bill_type: 'counter',
      customer_name: 'Wi-Fi Thermal Queue Verification',
      subtotal: 100,
      gst_amount: 18,
      total_amount: 118,
      paid_amount: 118,
      due_amount: 0,
      payment_method: 'CASH',
      date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_name: '20L Water Can (Wi-Fi Test)',
          quantity: 2,
          rate: 50,
          amount: 100
        }
      ]
    }

    try {
      const res = await enqueueThermalPrintJob(dummyBill, 'customer', preferredTransport)
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: `✅ Test print job queued (#${dummyBill.invoice_number}) via ${preferredTransport.toUpperCase()}. Android Print Bridge will claim and transmit.`
        })
        loadData()
      } else {
        setStatusMsg({ type: 'error', text: res.message })
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e?.message || 'Error queueing test print' })
    } finally {
      setTestingPrint(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            HARDWARE INTEGRATION & DISPATCH
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Printer style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            TVS RP 3230 ABW Thermal Printer Management
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: 0 }}>
            Configure Bluetooth Classic SPP and Wi-Fi RAW Socket transports. Manage print queue dispatched to Royal Kissan Print Bridge.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Button variant="secondary" icon={<RefreshCw style={{ width: '15px', height: '15px' }} />} onClick={loadData}>
            Refresh Queue
          </Button>
          <Button variant="primary" icon={<Send style={{ width: '15px', height: '15px' }} />} loading={testingPrint} onClick={handleSendTestPrint}>
            Send 80mm Test Print
          </Button>
        </div>
      </div>

      {statusMsg && (
        <Card style={{
          padding: '1rem',
          backgroundColor: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: statusMsg.type === 'success' ? '#34d399' : '#f87171' }}>
            {statusMsg.text}
          </span>
        </Card>
      )}

      {/* Live Android Bridge Worker Status Banner */}
      <Card style={{
        padding: '1.25rem',
        background: bridgeWorker?.isOnline ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.08)',
        border: bridgeWorker?.isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: bridgeWorker?.isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Radio style={{ width: '22px', height: '22px', color: bridgeWorker?.isOnline ? '#34d399' : '#f87171' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                  Android Print Bridge Status
                </span>
                <Badge variant={bridgeWorker?.isOnline ? 'success' : 'danger'}>
                  {bridgeWorker?.isOnline ? '● ONLINE' : '● OFFLINE'}
                </Badge>
                {bridgeWorker?.preferred_transport && (
                  <Badge variant="neutral">
                    {bridgeWorker.preferred_transport.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0.25rem 0 0 0' }}>
                {bridgeWorker?.isOnline ? (
                  <>Active Worker: <strong style={{ color: '#fbbf24' }}>{bridgeWorker.worker_id}</strong> &bull; Device: {bridgeWorker.device_name} &bull; Last Heartbeat: {Math.max(1, Math.round((Date.now() - new Date(bridgeWorker.last_heartbeat).getTime()) / 1000))}s ago</>
                ) : (
                  <>No heartbeat in the last 30s. Jobs will wait in PENDING state until the Royal Kissan Print Bridge app is active on the Android POS device.</>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#71717a' }}>Preferred Mode:</span>
            <Badge variant={preferredTransport === 'wifi' ? 'success' : 'warning'}>
              {preferredTransport === 'wifi' ? 'Wi-Fi RAW (Preferred)' : 'Bluetooth SPP'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Architecture Overview Banner */}
      <Card style={{ padding: '1.25rem', background: '#121214', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Smartphone style={{ width: '22px', height: '22px', color: '#fbbf24' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.95rem' }}>
              Dual-Mode Printing: Wi-Fi RAW Socket (9100) & Bluetooth Classic SPP
            </div>
            <div style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: '0.35rem', lineHeight: 1.5 }}>
              The ERP queues print jobs in the cloud. The dedicated counter Android device running <strong>Royal Kissan Print Bridge</strong> polls or listens to the queue, atomically claims pending jobs, and transmits ESC/POS commands directly to the TVS RP 3230 ABW via <strong>Wi-Fi TCP port 9100</strong> (preferred) or Bluetooth.
            </div>
          </div>
        </div>
      </Card>

      {/* Configuration Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        
        {/* Wi-Fi RAW Socket Configuration (PRIMARY / PREFERRED) */}
        <Card style={{ padding: '1.25rem', border: preferredTransport === 'wifi' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              <Wifi style={{ color: '#10b981', width: '20px', height: '20px' }} />
              Wi-Fi RAW Socket (Preferred Transport)
            </div>
            <Badge variant={preferredTransport === 'wifi' ? 'success' : 'neutral'}>
              {preferredTransport === 'wifi' ? 'Active Default' : 'Standby'}
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Printer IP Address"
              value={wifiIp}
              onChange={e => setWifiIp(e.target.value)}
              helperText="Default: 192.168.1.1 (or Office Router Subnet IP)"
            />

            <Input
              label="RAW Socket Port"
              value={wifiPort}
              onChange={e => setWifiPort(e.target.value)}
              helperText="Standard ESC/POS RAW Port: 9100"
            />

            <div style={{ fontSize: '0.78rem', color: '#71717a', lineHeight: 1.4 }}>
              Fastest transmission mode. Ensures multiple billing operators can dispatch to the TVS RP 3230 ABW simultaneously over the local network.
            </div>

            <Button
              variant={preferredTransport === 'wifi' ? 'primary' : 'secondary'}
              onClick={() => handleSetTransport('wifi')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {preferredTransport === 'wifi' ? '✓ Currently Preferred (Wi-Fi)' : 'Switch to Wi-Fi Transport'}
            </Button>
          </div>
        </Card>

        {/* Bluetooth Configuration (SECONDARY / STANDBY) */}
        <Card style={{ padding: '1.25rem', border: preferredTransport === 'bluetooth' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              <Bluetooth style={{ color: '#3b82f6', width: '20px', height: '20px' }} />
              Bluetooth Classic SPP (Fallback)
            </div>
            <Badge variant={preferredTransport === 'bluetooth' ? 'warning' : 'neutral'}>
              {preferredTransport === 'bluetooth' ? 'Active Default' : 'Standby'}
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Bluetooth Device Name"
              value={btName}
              onChange={e => setBtName(e.target.value)}
              helperText="Default: RP3230ABW-1B54"
            />

            <Input
              label="Bluetooth MAC Address"
              value={btMac}
              onChange={e => setBtMac(e.target.value.toUpperCase())}
              helperText="Default: 2B:04:E1:72:1B:54"
            />

            <div style={{ fontSize: '0.78rem', color: '#71717a', lineHeight: 1.4 }}>
              Protocol: RFCOMM SPP UUID: <code style={{ color: '#fbbf24' }}>00001101-0000-1000-8000-00805F9B34FB</code>.<br/>
              Pairing PIN: <code style={{ color: '#fbbf24' }}>1234</code> or <code style={{ color: '#fbbf24' }}>0000</code>.
            </div>

            <Button
              variant={preferredTransport === 'bluetooth' ? 'primary' : 'secondary'}
              onClick={() => handleSetTransport('bluetooth')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {preferredTransport === 'bluetooth' ? '✓ Currently Preferred (Bluetooth)' : 'Switch to Bluetooth Transport'}
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" icon={<CheckCircle style={{ width: '16px', height: '16px' }} />} onClick={handleSaveDeviceConfigs}>
          Save Hardware Endpoints & Preferences
        </Button>
      </div>

      {/* Live Print Queue Monitor Table */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              Active Print Jobs & Queue History
            </h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
              Real-time audit log of thermal tickets dispatched to the TVS RP 3230 ABW
            </p>
          </div>

          <Badge variant="neutral">
            {jobs.length} Recent Events
          </Badge>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.88rem' }}>
            No print jobs in the queue yet. Click &quot;Send 80mm Test Print&quot; above to submit the first job!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#71717a' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Invoice No</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Customer / Dealer</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Transport</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Copy</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Queued Time</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Outcome / Worker</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => {
                  const payload = j.payload_json
                  const isSuccess = j.status === 'SENT' || j.status === 'COMPLETED'
                  const isPending = j.status === 'PENDING'
                  const isClaimed = j.status === 'CLAIMED' || j.status === 'SENDING'
                  const isWifi = j.connection_type === 'wifi'

                  let outcomeText = 'Pending Pickup'
                  if (j.error_message) {
                    outcomeText = `Error: ${j.error_message}`
                  } else if (j.claimed_by) {
                    outcomeText = `Worker: ${j.claimed_by}`
                  } else if (isPending) {
                    outcomeText = bridgeWorker?.isOnline 
                      ? 'Waiting for Bridge Claim' 
                      : 'Bridge Offline (Queued in Cloud)'
                  }

                  return (
                    <tr key={j.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24' }}>
                        {j.invoice_number}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#f4f4f5' }}>
                        {payload?.customer_name || 'Customer'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#a1a1aa' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isWifi ? <Wifi style={{ width: '13px', height: '13px', color: '#10b981' }} /> : <Bluetooth style={{ width: '13px', height: '13px', color: '#3b82f6' }} />}
                          <strong style={{ color: isWifi ? '#34d399' : '#60a5fa' }}>{j.connection_type.toUpperCase()}</strong>
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <Badge variant={isSuccess ? 'success' : isPending ? 'warning' : isClaimed ? 'info' : 'danger'}>
                          {j.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#a1a1aa', textTransform: 'uppercase' }}>
                        {j.copy_type}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#71717a' }}>
                        {new Date(j.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: j.error_message ? '#ef4444' : isPending ? '#fbbf24' : '#a1a1aa', fontSize: '0.78rem' }}>
                        {outcomeText}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

