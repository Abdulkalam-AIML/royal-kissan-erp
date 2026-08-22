import { PrinterSettings, DEFAULT_PRINTER_SETTINGS, PrintJobOptions, PrintResult } from './printer-config'
import { generateReceiptBuffer, generateTestReceiptBuffer, BillData } from './receipt'

/**
 * Bluetooth Device Caching Helpers
 */
export function getPairedBluetoothDeviceId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('rk_paired_bluetooth_device_id')
}

export function getPairedBluetoothDeviceName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('rk_paired_bluetooth_device_name') || 'TVS RP3230ABW'
}

export function savePairedBluetoothDevice(deviceId: string, deviceName?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('rk_paired_bluetooth_device_id', deviceId)
  if (deviceName) localStorage.setItem('rk_paired_bluetooth_device_name', deviceName)
}

export function clearPairedBluetoothDevice() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('rk_paired_bluetooth_device_id')
  localStorage.removeItem('rk_paired_bluetooth_device_name')
}

/**
 * Execute Bluetooth ESC/POS Printing
 * Primary target: Moto Edge 60 Neo / Android Tablet / Chrome Web Bluetooth
 */
export async function printViaBluetooth(buffer: Uint8Array): Promise<PrintResult> {
  const startTime = Date.now()

  // 1. Android Native App Bridge Check (if embedded in Android WebView bridge)
  if (typeof window !== 'undefined' && (window as any).AndroidPrinter) {
    try {
      let binary = ''
      for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i])
      }
      const base64Data = typeof btoa !== 'undefined' ? btoa(binary) : ''
      const res = (window as any).AndroidPrinter.printBase64(base64Data)
      if (res) {
        return {
          success: true,
          message: 'Printed via Android Bluetooth Bridge',
          duration_ms: Date.now() - startTime,
          bytes_sent: buffer.length,
        }
      }
    } catch (err: any) {
      console.warn('AndroidPrinter bridge failed, falling back to Web Bluetooth:', err)
    }
  }

  // 2. Standard Web Bluetooth API
  try {
    if (typeof window === 'undefined' || !('bluetooth' in navigator)) {
      return {
        success: false,
        message: 'Web Bluetooth API is not supported in this browser. Please use Chrome on Android/Desktop.',
        error_code: 'BLUETOOTH_ERROR',
      }
    }

    const nav = navigator as any
    let device: any = null

    // Attempt to reconnect to saved Bluetooth device
    const savedId = getPairedBluetoothDeviceId()
    if (savedId && nav.bluetooth.getDevices) {
      try {
        const pairedDevices = await nav.bluetooth.getDevices()
        device = pairedDevices.find((d: any) => d.id === savedId)
      } catch {
        // Fallback to requestDevice prompt
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
        savePairedBluetoothDevice(device.id, device.name || 'TVS RP3230ABW')
      }
    }

    if (!device) {
      return {
        success: false,
        message: 'No Bluetooth printer selected.',
        error_code: 'BLUETOOTH_ERROR',
      }
    }

    if (!device.gatt.connected) {
      await device.gatt.connect()
    }

    const server = device.gatt
    let services: any[] = []
    try {
      services = await server.getPrimaryServices()
    } catch {
      return {
        success: false,
        message: `Bluetooth device (${device.name || 'Printer'}) GATT services unavailable. Please ensure printer is paired and powered on.`,
        error_code: 'BLUETOOTH_ERROR',
      }
    }

    let writeChar: any = null
    for (const service of services) {
      try {
        const chars = await service.getCharacteristics()
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char
            break
          }
        }
        if (writeChar) break
      } catch {
        continue
      }
    }

    if (!writeChar) {
      return {
        success: false,
        message: 'No compatible GATT serial print service found on selected Bluetooth printer.',
        error_code: 'BLUETOOTH_ERROR',
      }
    }

    // Send ESC/POS data in chunks of 512 bytes
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
      message: `Printed ${buffer.length} bytes via Bluetooth (${device.name || 'TVS RP3230ABW'})`,
      duration_ms: Date.now() - startTime,
      bytes_sent: buffer.length,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Bluetooth printing error: ${err.message || err}`,
      error_code: 'BLUETOOTH_ERROR',
    }
  }
}

/**
 * Main Print Dispatcher (Bluetooth-Only)
 */
export async function executePrintJob(
  bill: BillData,
  options: PrintJobOptions = {},
  config: PrinterSettings = DEFAULT_PRINTER_SETTINGS
): Promise<PrintResult> {
  const escposBuffer = generateReceiptBuffer(bill, options, config)
  return await printViaBluetooth(escposBuffer)
}

/**
 * Execute Test Print Ticket via Bluetooth
 */
export async function executeTestPrint(config: PrinterSettings = DEFAULT_PRINTER_SETTINGS): Promise<PrintResult> {
  const escposBuffer = generateTestReceiptBuffer(config)
  return await printViaBluetooth(escposBuffer)
}
