/**
 * Royal Kissan ERP - Local Print Agent
 * TVS RP3230ABW WiFi Thermal Printer TCP Bridge
 * Port: 3002
 * Stack: Native Node.js (Zero external dependencies)
 */

const http = require('http')
const net = require('net')

const PORT = process.env.PORT || 3002
const DEFAULT_PRINTER_IP = process.env.PRINTER_IP || '192.168.0.2'
const DEFAULT_PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10)
const TIMEOUT_MS = 1500

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function checkTcpStatus(ip, port, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = new net.Socket()
    let isSettled = false

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true
        socket.destroy()
        resolve({ connected: false, error: 'Ping timeout', latency_ms: Date.now() - start })
      }
    }, timeoutMs)

    socket.connect(port, ip, () => {
      if (!isSettled) {
        isSettled = true
        clearTimeout(timer)
        socket.end()
        resolve({ connected: true, latency_ms: Date.now() - start })
      }
    })

    socket.on('error', (err) => {
      if (!isSettled) {
        isSettled = true
        clearTimeout(timer)
        socket.destroy()
        resolve({ connected: false, error: err.message, latency_ms: Date.now() - start })
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health / Printer-Status endpoints
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/' || req.url === '/printer-status')) {
    const status = await checkTcpStatus(DEFAULT_PRINTER_IP, DEFAULT_PRINTER_PORT)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      printer: 'TVS RP3230ABW',
      ip: DEFAULT_PRINTER_IP,
      port: DEFAULT_PRINTER_PORT,
      connected: status.connected,
      latency_ms: status.latency_ms,
      error: status.error || null,
    }))
    return
  }

  // Test print endpoint
  if (req.method === 'POST' && req.url === '/test-print') {
    const status = await checkTcpStatus(DEFAULT_PRINTER_IP, DEFAULT_PRINTER_PORT)
    if (!status.connected) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, message: `Printer offline at ${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}` }))
      return
    }

    // Minimal ESC/POS initialization & test print buffer
    const testBuffer = Buffer.from([
      0x1b, 0x40, // Initialize
      0x1b, 0x61, 0x01, // Center text
      0x1b, 0x21, 0x30, // Double height & width text
      ...Buffer.from('ROYAL KISSAN\n'),
      0x1b, 0x21, 0x00, // Normal text
      ...Buffer.from('Packaged Drinking Water\n'),
      ...Buffer.from('--------------------------------\n'),
      ...Buffer.from('TVS RP3230ABW NETWORK PRINT TEST\n'),
      ...Buffer.from(`IP: ${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}\n`),
      ...Buffer.from(`Date: ${new Date().toLocaleString()}\n`),
      ...Buffer.from('--------------------------------\n\n\n'),
      0x1d, 0x56, 0x41, 0x03 // Partial cut
    ])

    const socket = new net.Socket()
    let isHandled = false

    const timer = setTimeout(() => {
      if (!isHandled) {
        isHandled = true
        socket.destroy()
        res.writeHead(504, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: 'Test print timeout' }))
      }
    }, TIMEOUT_MS)

    socket.connect(DEFAULT_PRINTER_PORT, DEFAULT_PRINTER_IP, () => {
      socket.write(testBuffer, (err) => {
        if (!isHandled) {
          isHandled = true
          clearTimeout(timer)
          socket.end()
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, message: err.message }))
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, message: 'Test print sent successfully' }))
          }
        }
      })
    })

    socket.on('error', (err) => {
      if (!isHandled) {
        isHandled = true
        clearTimeout(timer)
        socket.destroy()
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: err.message }))
      }
    })
    return
  }

  // Print endpoint
  if (req.method === 'POST' && req.url === '/print') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const targetIp = payload.printer_ip || DEFAULT_PRINTER_IP
        const targetPort = payload.printer_port || DEFAULT_PRINTER_PORT
        const base64Data = payload.payload_base64

        if (!base64Data) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, message: 'Missing payload_base64' }))
          return
        }

        const buffer = Buffer.from(base64Data, 'base64')
        const socket = new net.Socket()
        let isHandled = false
        const startTime = Date.now()

        const timer = setTimeout(() => {
          if (!isHandled) {
            isHandled = true
            socket.destroy()
            res.writeHead(504, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, message: `Printer connection timeout at ${targetIp}:${targetPort}` }))
          }
        }, TIMEOUT_MS)

        socket.connect(targetPort, targetIp, () => {
          socket.write(buffer, (err) => {
            if (!isHandled) {
              isHandled = true
              clearTimeout(timer)
              socket.end()
              if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: false, message: `Socket write error: ${err.message}` }))
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  success: true,
                  message: `Printed successfully to ${targetIp}:${targetPort}`,
                  bytes_sent: buffer.length,
                  duration_ms: Date.now() - startTime
                }))
              }
            }
          })
        })

        socket.on('error', (err) => {
          if (!isHandled) {
            isHandled = true
            clearTimeout(timer)
            socket.destroy()
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: false,
              message: `Printer connection failed (${err.code || err.message}) at ${targetIp}:${targetPort}`
            }))
          }
        })
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: `Invalid JSON payload: ${err.message}` }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

server.listen(PORT, () => {
  console.log(`=====================================================================`)
  console.log(` ROYAL KISSAN ERP - LOCAL PRINT AGENT`)
  console.log(` Listening on: http://localhost:${PORT}`)
  console.log(` Default Printer: ${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}`)
  console.log(`=====================================================================`)
})
