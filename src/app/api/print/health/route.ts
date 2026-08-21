import { NextResponse } from 'next/server'
import net from 'net'
import { DEFAULT_PRINTER_SETTINGS } from '@/lib/printer/printer-config'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const targetIp = url.searchParams.get('ip') || DEFAULT_PRINTER_SETTINGS.printer_ip
  const targetPort = Number(url.searchParams.get('port')) || DEFAULT_PRINTER_SETTINGS.printer_port

  const startTime = Date.now()

  return new Promise<Response>((resolve) => {
    try {
      const socket = new net.Socket()
      let isResolved = false

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          socket.destroy()
          resolve(
            NextResponse.json({
              status: 'offline',
              online: false,
              message: `Printer ping to ${targetIp}:${targetPort} timed out`,
              latency_ms: Date.now() - startTime,
            })
          )
        }
      }, 2500)

      socket.connect(targetPort, targetIp, () => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timer)
          const latency = Date.now() - startTime
          socket.end()
          resolve(
            NextResponse.json({
              status: 'online',
              online: true,
              message: `✓ TVS RP3230ABW Connected at ${targetIp}:${targetPort}`,
              ip_reachable: true,
              port_open: true,
              latency_ms: latency,
              diagnostics: [
                '✓ Printer Connected',
                `✓ IP Reachable (${targetIp})`,
                `✓ Port ${targetPort} Open`,
                '✓ ESC/POS Protocol Ready'
              ]
            })
          )
        }
      })

      socket.on('error', (err: any) => {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timer)
          socket.destroy()
          resolve(
            NextResponse.json({
              status: 'offline',
              online: false,
              message: `Printer offline at ${targetIp}:${targetPort} (${err.code || err.message})`,
              ip_reachable: false,
              port_open: false,
              latency_ms: Date.now() - startTime,
              diagnostics: [
                `❌ Printer Offline (${targetIp}:${targetPort})`,
                'Check Wi-Fi network and power cable'
              ]
            })
          )
        }
      })
    } catch (err: any) {
      resolve(
        NextResponse.json({
          status: 'error',
          online: false,
          message: err?.message || 'Socket error',
          ip_reachable: false,
          port_open: false,
          latency_ms: Date.now() - startTime,
          diagnostics: [`❌ Socket Error: ${err?.message || 'Network unreachable'}`]
        })
      )
    }
  })
}
