import net from 'net'
import { PrintResult } from './printer-config'

/**
 * Server-Side TCP Socket Client using Node 'net' module
 * Connects directly to TVS RP3230ABW printer IP:Port
 */
export async function sendToNetworkPrinterServer(
  ip: string,
  port: number,
  buffer: Uint8Array,
  timeoutMs: number = 4000
): Promise<PrintResult> {
  const startTime = Date.now()

  return new Promise<PrintResult>((resolve) => {
    try {
      const socket = new net.Socket()
      let isHandled = false

      const timer = setTimeout(() => {
        if (!isHandled) {
          isHandled = true
          socket.destroy()
          resolve({
            success: false,
            message: `Connection to printer at ${ip}:${port} timed out after ${timeoutMs}ms`,
            error_code: 'TIMEOUT',
            duration_ms: Date.now() - startTime,
          })
        }
      }, timeoutMs)

      socket.connect(port, ip, () => {
        socket.write(Buffer.from(buffer), (err?: Error | null) => {
          if (!isHandled) {
            isHandled = true
            clearTimeout(timer)
            socket.end()
            if (err) {
              resolve({
                success: false,
                message: `Failed to write to printer: ${err.message}`,
                error_code: 'NETWORK_ERROR',
                duration_ms: Date.now() - startTime,
              })
            } else {
              resolve({
                success: true,
                message: `Print command sent successfully to ${ip}:${port}`,
                duration_ms: Date.now() - startTime,
                bytes_sent: buffer.length,
              })
            }
          }
        })
      })

      socket.on('error', (err: any) => {
        if (!isHandled) {
          isHandled = true
          clearTimeout(timer)
          socket.destroy()
          let errorCode: PrintResult['error_code'] = 'NETWORK_ERROR'
          if (err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT') {
            errorCode = 'OFFLINE'
          }
          resolve({
            success: false,
            message: `Printer connection error (${err.code || err.message}): Check IP ${ip}:${port}`,
            error_code: errorCode,
            duration_ms: Date.now() - startTime,
          })
        }
      })
    } catch (err: any) {
      resolve({
        success: false,
        message: `Socket error: ${err?.message || 'Failed to initialize net socket'}`,
        error_code: 'UNKNOWN',
        duration_ms: Date.now() - startTime,
      })
    }
  })
}
