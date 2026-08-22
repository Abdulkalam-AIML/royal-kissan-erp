import { PrinterSettings, DEFAULT_PRINTER_SETTINGS, PrintJobOptions, PrintResult } from './printer-config'
import { generateReceiptBuffer, generateTestReceiptBuffer, BillData } from './receipt'
import { printViaAndroidSPP } from './bluetooth-spp'

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
 * Target Printer: TVS-E RP3230ABW (80mm ESC/POS)
 * Target Device: Moto Pad 60 Neo / Android Tablet / Chrome
 */
export async function printViaBluetooth(buffer: Uint8Array, jobTitle = 'Royal Kissan Receipt'): Promise<PrintResult> {
  const startTime = Date.now()

  // 1. Check for Android Native JS Bridge or Android OS environment
  if (typeof window !== 'undefined') {
    const win = window as any
    const isAndroid = /Android/i.test(navigator.userAgent || '')
    const hasBridge = win.AndroidPrinter || win.AndroidBluetoothPrinter || win.BTPrinter || win.RawBT

    if (hasBridge) {
      const sppRes = await printViaAndroidSPP(buffer, jobTitle)
      return {
        success: sppRes.success,
        message: sppRes.message,
        duration_ms: Date.now() - startTime,
        bytes_sent: buffer.length,
      }
    }

    // 2. Standard Web Bluetooth API Attempt
    if ('bluetooth' in navigator) {
      try {
        const nav = navigator as any
        let device: any = null

        // Attempt to reconnect to saved Bluetooth device
        const savedId = getPairedBluetoothDeviceId()
        if (savedId && nav.bluetooth.getDevices) {
          try {
            const pairedDevices = await nav.bluetooth.getDevices()
            device = pairedDevices.find((d: any) => d.id === savedId)
          } catch {
            // Fallback
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

        if (device) {
          if (!device.gatt.connected) {
            await device.gatt.connect()
          }

          const server = device.gatt
          const services = await server.getPrimaryServices()

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

          if (writeChar) {
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
          }
        }
      } catch (err: any) {
        console.warn('Web Bluetooth GATT service discovery failed (Classic SPP device detected):', err)
        // If GATT fails on Classic Bluetooth SPP device like RP3230ABW ("No Services found in device"), fall back to Android Classic SPP Intent Handler!
        if (isAndroid || typeof window !== 'undefined') {
          const sppRes = await printViaAndroidSPP(buffer, jobTitle)
          return {
            success: sppRes.success,
            message: sppRes.message,
            duration_ms: Date.now() - startTime,
            bytes_sent: buffer.length,
          }
        }
      }
    }

    // 3. Fallback to Android Classic Bluetooth SPP Handler for Android devices
    if (isAndroid) {
      const sppRes = await printViaAndroidSPP(buffer, jobTitle)
      return {
        success: sppRes.success,
        message: sppRes.message,
        duration_ms: Date.now() - startTime,
        bytes_sent: buffer.length,
      }
    }
  }

  return {
    success: false,
    message: 'Bluetooth printer connection unavailable. Ensure TVS-E RP3230ABW is powered ON and paired in Android Bluetooth Settings.',
    error_code: 'BLUETOOTH_ERROR',
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
  const title = `Bill ${bill.invoice_number} - Royal Kissan`
  return await printViaBluetooth(escposBuffer, title)
}

/**
 * Execute Test Print Ticket via Bluetooth
 */
export async function executeTestPrint(config: PrinterSettings = DEFAULT_PRINTER_SETTINGS): Promise<PrintResult> {
  const escposBuffer = generateTestReceiptBuffer(config)
  return await printViaBluetooth(escposBuffer, 'Test Ticket - TVS RP3230ABW')
}
