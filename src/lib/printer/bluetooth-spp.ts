/**
 * Royal Kissan ERP — Classic Bluetooth SPP / RFCOMM Android Thermal Printing Engine
 * Target Printer: TVS-E RP3230ABW (80mm ESC/POS, Protocol: RAW TCP / Classic Bluetooth SPP)
 * Target Device: Moto Pad 60 Neo / Android Tablet / Chrome Android
 */

export interface AndroidSPPPrintResult {
  success: boolean
  message: string
  error_code?: 'BLUETOOTH_ERROR' | 'DEVICE_NOT_FOUND' | 'SPP_FAILED'
}

/**
 * Encodes Uint8Array into a Base64 string suitable for Android Intent payload
 */
export function bufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  const len = buffer.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : ''
}

/**
 * Execute Classic Bluetooth SPP / RFCOMM Direct Thermal Print on Android
 */
export async function printViaAndroidSPP(
  buffer: Uint8Array,
  jobTitle = 'Royal Kissan Thermal Receipt'
): Promise<AndroidSPPPrintResult> {
  if (typeof window === 'undefined') {
    return {
      success: false,
      message: 'Printing is only supported in browser environment.',
      error_code: 'SPP_FAILED',
    }
  }

  const base64Data = bufferToBase64(buffer)

  // 1. Android Native Web Bridge Check (If running in Android WebView app wrapper or PWA bridge)
  const win = window as any
  const bridge = win.AndroidPrinter || win.AndroidBluetoothPrinter || win.BTPrinter || win.RawBT
  if (bridge) {
    try {
      if (typeof bridge.printBase64 === 'function') {
        const res = bridge.printBase64(base64Data, jobTitle)
        if (res !== false) {
          return {
            success: true,
            message: 'Printed via Android Native Bluetooth Bridge',
          }
        }
      } else if (typeof bridge.printRaw === 'function') {
        const res = bridge.printRaw(base64Data)
        if (res !== false) {
          return {
            success: true,
            message: 'Printed via Android Native Raw Bridge',
          }
        }
      }
    } catch (err: any) {
      console.warn('Android Native Bridge call failed, using Android Direct Intent:', err)
    }
  }

  // 2. Android Direct SPP Intent Protocol (RawBT / Thermal Bluetooth Intent Handler)
  try {
    const isAndroid = /Android/i.test(navigator.userAgent || '')
    
    // Construct RawBT / Android SPP Thermal Print Intent URLs
    const rawbtUri = `rawbt:base64,${base64Data}`
    const intentUri = `intent://base64,${base64Data}#Intent;scheme=rawbt;package=ru.a404.rawbt;S.title=${encodeURIComponent(jobTitle)};end`

    if (isAndroid) {
      // Create a hidden anchor element to trigger the Android SPP Bluetooth Print Intent
      const link = document.createElement('a')
      link.href = intentUri
      link.target = '_self'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Secondary fallback trigger for older Android WebViews
      setTimeout(() => {
        try {
          window.location.href = rawbtUri
        } catch {
          // Intent launched
        }
      }, 300)

      return {
        success: true,
        message: 'Receipt sent to Android Bluetooth SPP Thermal Printer (TVS RP3230ABW).',
      }
    } else {
      // Desktop / Non-Android fallback link trigger
      window.location.href = rawbtUri
      return {
        success: true,
        message: 'Receipt sent to Classic Bluetooth SPP Print Handler.',
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Android Bluetooth SPP Intent failed: ${err?.message || err}`,
      error_code: 'SPP_FAILED',
    }
  }
}
