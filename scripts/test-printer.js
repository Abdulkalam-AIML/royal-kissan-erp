const net = require('net')

const PRINTER_IP = process.env.PRINTER_IP || '192.168.0.2'
const PRINTER_PORT = process.env.PRINTER_PORT || 9100

function generateTestReceipt() {
  const ESC = 0x1B
  const GS = 0x1D
  
  const bytes = []

  // Initialize printer
  bytes.push(ESC, 0x40)

  // Align Center
  bytes.push(ESC, 0x61, 0x01)
  
  // Double height & width for header
  bytes.push(GS, 0x21, 0x11)
  bytes.push(...Buffer.from('ROYAL KISSAN ERP\n', 'ascii'))
  
  // Normal size
  bytes.push(GS, 0x21, 0x00)
  bytes.push(...Buffer.from('================================================\n', 'ascii'))
  bytes.push(...Buffer.from('   TVS RP3230ABW THERMAL TEST PRINT SUCCESS   \n', 'ascii'))
  bytes.push(...Buffer.from('================================================\n', 'ascii'))
  
  // Align Left
  bytes.push(ESC, 0x61, 0x00)
  bytes.push(...Buffer.from(`Printer IP  : ${PRINTER_IP}\n`, 'ascii'))
  bytes.push(...Buffer.from(`TCP Port    : ${PRINTER_PORT}\n`, 'ascii'))
  bytes.push(...Buffer.from(`Date & Time : ${new Date().toLocaleString()}\n`, 'ascii'))
  bytes.push(...Buffer.from(`Status      : ONLINE & READY (ESC/POS)\n`, 'ascii'))
  bytes.push(...Buffer.from('------------------------------------------------\n', 'ascii'))
  bytes.push(...Buffer.from('Items Test:\n', 'ascii'))
  bytes.push(...Buffer.from('1. Water Can 20L      x 2    Rs. 100.00\n', 'ascii'))
  bytes.push(...Buffer.from('2. Mineral Water 1L   x 5    Rs.  100.00\n', 'ascii'))
  bytes.push(...Buffer.from('------------------------------------------------\n', 'ascii'))
  bytes.push(...Buffer.from('Grand Total : Rs. 200.00 (PAID CASH)\n', 'ascii'))
  bytes.push(...Buffer.from('================================================\n', 'ascii'))
  
  // Align Center
  bytes.push(ESC, 0x61, 0x01)
  bytes.push(...Buffer.from('Thank you for choosing Royal Kissan ERP!\n', 'ascii'))
  bytes.push(...Buffer.from('------------------------------------------------\n\n\n\n', 'ascii'))

  // Cut Paper
  bytes.push(GS, 0x56, 0x41, 0x03)

  return Buffer.from(bytes)
}

async function runTestPrint() {
  console.log(`Connecting to TVS Printer at ${PRINTER_IP}:${PRINTER_PORT}...`)
  const client = new net.Socket()
  
  client.setTimeout(5000)

  client.connect(PRINTER_PORT, PRINTER_IP, () => {
    console.log(`✅ Connected successfully to ${PRINTER_IP}:${PRINTER_PORT}!`)
    const payload = generateTestReceipt()
    console.log(`Sending ${payload.length} bytes ESC/POS payload to printer...`)
    
    client.write(payload, (err) => {
      if (err) {
        console.error('❌ Error writing to socket:', err)
      } else {
        console.log('🎉 TEST RECEIPT SENT SUCCESSFULLY TO TVS RP3230ABW PRINTER!')
      }
      client.end()
    })
  })

  client.on('error', (err) => {
    console.error(`❌ Connection failed: ${err.message}`)
  })

  client.on('timeout', () => {
    console.error('❌ Connection timed out')
    client.destroy()
  })
}

runTestPrint()
