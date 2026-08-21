import { PrinterSettings, DEFAULT_PRINTER_SETTINGS, PrintJobOptions, PrintResult } from './printer-config'
import { generateReceiptBuffer, generateTestReceiptBuffer, BillData } from './receipt'

/**
 * Fallback: Send ESC/POS payload to Local Print Agent running at http://localhost:3002/print
 */
export async function sendToLocalPrintAgent(
  agentUrl: string,
  buffer: Uint8Array,
  printerIp: string,
  printerPort: number
): Promise<PrintResult> {
  const startTime = Date.now()
  try {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64Data = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(buffer).toString('base64')

    const res = await fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printer_ip: printerIp,
        printer_port: printerPort,
        payload_base64: base64Data,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return {
        success: false,
        message: `Local Print Agent error (${res.status}): ${errText}`,
        error_code: 'NETWORK_ERROR',
        duration_ms: Date.now() - startTime,
      }
    }

    const data = await res.json()
    return {
      success: true,
      message: data.message || 'Printed via Local Agent successfully',
      duration_ms: Date.now() - startTime,
      bytes_sent: buffer.length,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Local Print Agent not reachable at ${agentUrl}. Ensure node scripts/print-agent.js is running.`,
      error_code: 'OFFLINE',
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Bluetooth Device Caching Helpers
 */
export function getPairedBluetoothDeviceId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('rk_paired_bluetooth_device_id')
}

export function savePairedBluetoothDevice(deviceId: string, deviceName?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('rk_paired_bluetooth_device_id', deviceId)
  if (deviceName) localStorage.setItem('rk_paired_bluetooth_device_name', deviceName)
}

/**
 * Web Bluetooth Direct ESC/POS Printer Execution
 */
export async function printViaBluetooth(buffer: Uint8Array): Promise<PrintResult> {
  const startTime = Date.now()
  try {
    if (typeof window === 'undefined' || !('bluetooth' in navigator)) {
      return {
        success: false,
        message: 'Web Bluetooth API is not supported in this browser. Please use Chrome or Edge.',
        error_code: 'BLUETOOTH_ERROR',
      }
    }

    const nav = navigator as any
    let device: any = null

    // Try reconnecting to previously granted device if available
    const savedId = getPairedBluetoothDeviceId()
    if (savedId && nav.bluetooth.getDevices) {
      try {
        const pairedDevices = await nav.bluetooth.getDevices()
        device = pairedDevices.find((d: any) => d.id === savedId)
      } catch {
        // Fallback to requestDevice
      }
    }

    if (!device) {
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-41a3-8c46-84940f200d5f',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '00001101-0000-1000-8000-00805f9b34fb'
        ]
      })
      if (device && device.id) {
        savePairedBluetoothDevice(device.id, device.name)
      }
    }

    if (!device.gatt.connected) {
      await device.gatt.connect()
    }

    const server = device.gatt
    const services = await server.getPrimaryServices()
    let writeChar: any = null

    for (const service of services) {
      const chars = await service.getCharacteristics()
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char
          break
        }
      }
      if (writeChar) break
    }

    if (!writeChar) {
      return {
        success: false,
        message: 'Bluetooth ESC/POS writable characteristic not found on target printer.',
        error_code: 'BLUETOOTH_ERROR',
      }
    }

    // Write in chunks of 512 bytes
    const chunkSize = 512
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize)
      if (writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk)
      } else {
        await writeChar.writeValue(chunk)
      }
    }

    return {
      success: true,
      message: `Printed ${buffer.length} bytes via Bluetooth (${device.name || 'Thermal Printer'})`,
      duration_ms: Date.now() - startTime,
      bytes_sent: buffer.length,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Bluetooth printing failed: ${err.message || err}`,
      error_code: 'BLUETOOTH_ERROR',
    }
  }
}

/**
 * WebUSB Direct ESC/POS Printer Execution
 */
export async function printViaUSB(buffer: Uint8Array): Promise<PrintResult> {
  const startTime = Date.now()
  try {
    if (typeof window === 'undefined' || !('usb' in navigator)) {
      return {
        success: false,
        message: 'WebUSB API is not supported in this browser. Please use Chrome or Edge.',
        error_code: 'USB_ERROR',
      }
    }

    const nav = navigator as any
    const device = await nav.usb.requestDevice({ filters: [] })
    await device.open()
    await device.selectConfiguration(1)
    await device.claimInterface(0)

    const endpoint = device.configuration.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out')
    const endpointNumber = endpoint ? endpoint.endpointNumber : 1

    await device.transferOut(endpointNumber, buffer)
    await device.close()

    return {
      success: true,
      message: `Printed ${buffer.length} bytes via USB (TVS RP3230ABW)`,
      duration_ms: Date.now() - startTime,
      bytes_sent: buffer.length,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `USB printing failed: ${err.message || err}`,
      error_code: 'USB_ERROR',
    }
  }
}

/**
 * Client Print Dispatcher: Routes print job via WiFi (API/Agent), Bluetooth, or USB
 */
export async function executePrintJob(
  bill: BillData,
  options: PrintJobOptions = {},
  config: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Promise<PrintResult> {
  const escposBuffer = generateReceiptBuffer(bill, options, config)

  // 1. Bluetooth Mode
  if (config.connection_type === 'bluetooth') {
    return await printViaBluetooth(escposBuffer)
  }

  // 2. USB Mode
  if (config.connection_type === 'usb') {
    return await printViaUSB(escposBuffer)
  }

  // 3. WiFi Mode (API Route or Local Agent)
  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bill_data: bill,
        options,
        customConfig: config,
      }),
    })

    const data = await res.json()
    if (data.success) {
      return {
        success: true,
        message: data.message || 'Bill Printed Successfully',
        duration_ms: data.duration_ms,
        bytes_sent: data.bytes_sent,
      }
    }

    // Direct API route printer connection failed -> Fallback to Local Print Agent at localhost:3002
    return await sendToLocalPrintAgent(
      config.local_agent_url || 'http://localhost:3002/print',
      escposBuffer,
      config.printer_ip,
      config.printer_port
    )
  } catch (err: any) {
    return await sendToLocalPrintAgent(
      config.local_agent_url || 'http://localhost:3002/print',
      escposBuffer,
      config.printer_ip,
      config.printer_port
    )
  }
}

/**
 * Execute Test Print Ticket
 */
export async function executeTestPrint(config: PrinterSettings = DEFAULT_PRINTER_SETTINGS): Promise<PrintResult> {
  const escposBuffer = generateTestReceiptBuffer(config)

  if (config.connection_type === 'bluetooth') {
    return await printViaBluetooth(escposBuffer)
  }

  if (config.connection_type === 'usb') {
    return await printViaUSB(escposBuffer)
  }

  try {
    const res = await fetch('/api/print/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customConfig: config }),
    })
    const data = await res.json()
    if (data.success) return data

    return await sendToLocalPrintAgent(
      config.local_agent_url || 'http://localhost:3002/print',
      escposBuffer,
      config.printer_ip,
      config.printer_port
    )
  } catch {
    return await sendToLocalPrintAgent(
      config.local_agent_url || 'http://localhost:3002/print',
      escposBuffer,
      config.printer_ip,
      config.printer_port
    )
  }
}
