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
const DEFAULT_PRINTER_PORT = process.env.PRINTER_PORT || 9100

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    const ip = DEFAULT_PRINTER_IP
    const port = DEFAULT_PRINTER_PORT
    const start = Date.now()

    const socket = new net.Socket()
    let responded = false

    const timer = setTimeout(() => {
      if (!responded) {
        responded = true
        socket.destroy()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ agent: 'online', printer: 'offline', printer_ip: ip, message: 'Ping timeout' }))
      }
    }, 2000)

    socket.connect(port, ip, () => {
      if (!responded) {
        responded = true
        clearTimeout(timer)
        socket.end()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ agent: 'online', printer: 'online', printer_ip: ip, latency_ms: Date.now() - start }))
      }
    })

    socket.on('error', (err) => {
      if (!responded) {
        responded = true
        clearTimeout(timer)
        socket.destroy()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ agent: 'online', printer: 'offline', error: err.message }))
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
        }, 4000)

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
