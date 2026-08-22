'use client'

import { useState, useEffect } from 'react'
import {
  Printer,
  Bluetooth,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Activity,
  Unplug,
  Save,
  Tablet,
  Smartphone
} from 'lucide-react'
import { DEFAULT_PRINTER_SETTINGS, PrinterSettings } from '@/lib/printer/printer-config'
import {
  executeTestPrint,
  getPairedBluetoothDeviceId,
  getPairedBluetoothDeviceName,
  savePairedBluetoothDevice,
  clearPairedBluetoothDevice
} from '@/lib/printer/printer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function PrinterSettingsPage() {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS)
  const [pairedId, setPairedId] = useState<string | null>(null)
  const [pairedName, setPairedName] = useState<string>('TVS RP3230ABW')
  const [scanning, setScanning] = useState(false)
  const [testing, setTesting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    refreshBluetoothState()
  }, [])

  function refreshBluetoothState() {
    const id = getPairedBluetoothDeviceId()
    const name = getPairedBluetoothDeviceName()
    setPairedId(id)
    setPairedName(name || 'TVS RP3230ABW')
  }

  async function handleScanAndPair() {
    setScanning(true)
    setStatusMessage(null)
    try {
      if (typeof window === 'undefined' || !('bluetooth' in navigator)) {
        setStatusMessage({
          type: 'error',
          text: 'Web Bluetooth API is not supported in this browser. Please open in Chrome on Android / Moto Edge 60 Neo.',
        })
        setScanning(false)
        return
      }

      const nav = navigator as any
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-41a3-8c46-84940f200d5f',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '00001101-0000-1000-8000-00805f9b34fb'
        ]
      })

      if (device && device.id) {
        savePairedBluetoothDevice(device.id, device.name || 'TVS RP3230ABW')
        refreshBluetoothState()
        setStatusMessage({
          type: 'success',
          text: `🟢 Successfully paired with ${device.name || 'TVS RP3230ABW'}!`,
        })
      }
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') {
        setStatusMessage({
          type: 'error',
          text: `Bluetooth scan error: ${err?.message || err}`,
        })
      }
    } finally {
      setScanning(false)
    }
  }

  function handleDisconnect() {
    clearPairedBluetoothDevice()
    refreshBluetoothState()
    setStatusMessage({
      type: 'success',
      text: 'Disconnected from Bluetooth printer.',
    })
  }

  async function handleTestPrint() {
    setTesting(true)
    setStatusMessage(null)
    try {
      const res = await executeTestPrint(settings)
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `🎉 ${res.message}`,
        })
      } else {
        setStatusMessage({
          type: 'error',
          text: `❌ Test Print Failed: ${res.message}`,
        })
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `❌ Test Print Exception: ${err?.message || err}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Top Title Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
            <Bluetooth style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Bluetooth Thermal Printer Management
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Configure and pair TVS-E RP3230ABW 80mm ESC/POS Thermal Printer for Android / Tablet POS billing.
          </p>
        </div>
      </div>

      {statusMessage && (
        <Card style={{ padding: '1rem 1.25rem', backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusMessage.type === 'success' ? '#34d399' : '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>
            {statusMessage.type === 'success' ? <CheckCircle style={{ width: '18px', height: '18px' }} /> : <AlertTriangle style={{ width: '18px', height: '18px' }} />}
            {statusMessage.text}
          </div>
        </Card>
      )}

      {/* Main Connection Status Card */}
      <Card style={{ padding: '1.5rem', backgroundColor: '#18181b', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: pairedId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bluetooth style={{ width: '24px', height: '24px', color: pairedId ? '#34d399' : '#f87171' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                {pairedName}
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                <Smartphone style={{ width: '14px', height: '14px' }} />
                Target Device: Moto Edge 60 Neo / Android Tablet
              </div>
            </div>
          </div>

          <Badge variant={pairedId ? 'success' : 'danger'} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 800 }}>
            {pairedId ? '🟢 Connected & Paired' : '🔴 Disconnected'}
          </Badge>
        </div>

        {/* Device Information Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#09090b', padding: '1rem', borderRadius: '8px', border: '1px solid #27272a' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#71717a', display: 'block' }}>Connection Protocol</span>
            <strong style={{ fontSize: '0.9rem', color: '#fff' }}>Bluetooth ESC/POS RAW</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#71717a', display: 'block' }}>Paper Format</span>
            <strong style={{ fontSize: '0.9rem', color: '#fbbf24' }}>80mm Thermal Roll</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#71717a', display: 'block' }}>Paired Device ID</span>
            <strong style={{ fontSize: '0.85rem', color: '#a1a1aa', fontFamily: 'monospace' }}>
              {pairedId ? pairedId.slice(0, 18) + '...' : 'Not paired'}
            </strong>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="md"
            icon={<RefreshCw style={{ width: '16px', height: '16px' }} />}
            loading={scanning}
            onClick={handleScanAndPair}
          >
            {scanning ? 'Scanning Nearby Printers...' : 'Scan Bluetooth Printers'}
          </Button>

          {pairedId && (
            <Button
              variant="outline"
              size="md"
              icon={<Unplug style={{ width: '16px', height: '16px' }} />}
              onClick={handleDisconnect}
            >
              Disconnect Printer
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            icon={<Play style={{ width: '16px', height: '16px' }} />}
            loading={testing}
            onClick={handleTestPrint}
          >
            {testing ? 'Sending ESC/POS Test...' : 'Test Print Ticket'}
          </Button>
        </div>
      </Card>

      {/* Android POS Workflow Guide Card */}
      <Card style={{ padding: '1.25rem', backgroundColor: '#09090b', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tablet style={{ width: '18px', height: '18px' }} />
          Android / Tablet POS Setup Guide
        </h4>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#a1a1aa', fontSize: '0.85rem', lineHeight: '1.6' }}>
          <li>Ensure Bluetooth is turned ON in Android System Settings.</li>
          <li>Power ON your <strong>TVS-E RP3230ABW</strong> thermal printer.</li>
          <li>Click <strong style={{ color: '#fff' }}>"Scan Bluetooth Printers"</strong> above and pair with <strong style={{ color: '#fbbf24' }}>TVS RP3230ABW</strong>.</li>
          <li>Click <strong style={{ color: '#fff' }}>"Test Print Ticket"</strong> to verify receipt output.</li>
          <li>In POS Billing, tap <strong style={{ color: '#fff' }}>"Save & Print"</strong> to output thermal receipts automatically.</li>
        </ol>
      </Card>
    </div>
  )
}
