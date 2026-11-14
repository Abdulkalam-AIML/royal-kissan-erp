import { Pool } from 'pg'
import {
  validateAndFormatIndianPhone,
  formatInvoiceWhatsAppMessage,
} from './src/lib/services/whatsapp-service'
import {
  buildBillPDFDoc,
  generateBillPDFBlob
} from './src/lib/utils/pdf-generator'

const pool = new Pool({
  connectionString: 'postgres://postgres.oweutcivgpmzldlcmkvd:24ME1A42ABDULKALAM@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function runTests() {
  console.log('========================================================')
  console.log('ROYAL KISSAN ERP — WHATSAPP INVOICE INTEGRATION VERIFIER')
  console.log('========================================================\n')

  let passed = 0
  let failed = 0

  function assert(desc: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${desc}`, extra || '')
      failed++
    }
  }

  // TEST 1: Indian Phone Number Validation & Formatting (+91)
  console.log('\n--- TEST SUITE 1: Indian Phone Validation (+91) ---')
  const valid10 = validateAndFormatIndianPhone('9347662554')
  assert('10-digit number formatted with +91', valid10.isValid && valid10.formattedPhone === '+919347662554' && valid10.e164Digits === '919347662554')

  const validWithPlus = validateAndFormatIndianPhone('+919347662554')
  assert('+91 prefix handled cleanly', validWithPlus.isValid && validWithPlus.formattedPhone === '+919347662554' && validWithPlus.e164Digits === '919347662554')

  const validWithSpaces = validateAndFormatIndianPhone('  93476 62554  ')
  assert('Whitespace within phone removed', validWithSpaces.isValid && validWithSpaces.formattedPhone === '+919347662554')

  const invalidDigits = validateAndFormatIndianPhone('1234567890')
  assert('Rejects invalid mobile not starting with 6-9', !invalidDigits.isValid)

  const shortPhone = validateAndFormatIndianPhone('934766')
  assert('Rejects incomplete phone number', !shortPhone.isValid)

  // TEST 2: Customer Invoice Message Formatting
  console.log('\n--- TEST SUITE 2: Customer Invoice WhatsApp Message ---')
  const customerBill = {
    id: 'b1111111-2222-3333-4444-555555555555',
    invoice_number: 'RK-2026-CUST-101',
    customer_name: 'Venkata Reddy',
    date: '2026-11-14',
    subtotal: 500,
    total_amount: 500,
    paid_amount: 400,
    due_amount: 100,
    payment_mode: 'upi',
    items: [
      { product_name: 'Water Can (20L)', quantity: 10, rate: 50, amount: 500 }
    ]
  }

  const custMsg = formatInvoiceWhatsAppMessage(customerBill)
  assert('Customer message contains invoice number', custMsg.includes('RK-2026-CUST-101'))
  assert('Customer message contains recipient name', custMsg.includes('Venkata Reddy'))
  assert('Customer message contains total amount ₹500', custMsg.includes('500.00'))
  assert('Customer message contains amount paid ₹400', custMsg.includes('400.00'))
  assert('Customer message contains remaining due ₹100', custMsg.includes('100.00'))
  assert('Customer message states PDF invoice attached', custMsg.includes('attached as a PDF'))

  // TEST 3: Dealer GST Invoice Message & PDF Generation
  console.log('\n--- TEST SUITE 3: Dealer GST Invoice Message & PDF Document ---')
  const dealerBill = {
    id: 'd9999999-8888-7777-6666-555555555555',
    invoice_number: 'RK-2026-DLR-888',
    dealer_name: 'Sri Lakshmi Enterprises',
    dealer_gstin: '37AAAAA0000A1Z5',
    dealer_phone: '9876543210',
    date: '2026-11-14',
    subtotal: 7000,
    taxable_amount: 7000,
    gst_amount: 1260,
    cgst_amount: 630,
    sgst_amount: 630,
    grand_total: 8260,
    total_amount: 8260,
    paid_amount: 8260,
    due_amount: 0,
    payment_mode: 'bank_transfer',
    previous_balance: 1500,
    items: [
      { product_name: 'Water Bags 250ml (Box)', quantity: 100, unit: 'box', rate: 70, gst_amount: 12.6, amount: 8260 }
    ]
  }

  const dealerMsg = formatInvoiceWhatsAppMessage(dealerBill)
  assert('Dealer message contains dealer name', dealerMsg.includes('Sri Lakshmi Enterprises'))
  assert('Dealer message contains GST breakdown', dealerMsg.includes('GST Included: ₹1260.00'))
  assert('Dealer message contains previous outstanding', dealerMsg.includes('Previous Outstanding: ₹1500.00'))
  assert('Dealer message contains total outstanding calculation', dealerMsg.includes('Total Outstanding: ₹9760.00'))

  // Generate Actual PDF
  const { doc, filename } = buildBillPDFDoc(dealerBill)
  assert('PDF filename formatted correctly', filename === 'Royal_Kissan_Invoice_RK-2026-DLR-888.pdf')
  assert('PDF doc generated successfully', doc !== null && typeof doc.output === 'function')

  const pdfBlobResult = generateBillPDFBlob(dealerBill)
  assert('PDF Blob created', pdfBlobResult.blob instanceof Blob && pdfBlobResult.blob.size > 1000)
  assert('PDF Base64 string generated', pdfBlobResult.base64.length > 500)

  // TEST 4: Dispatch Note Warning & Non-Sales Invoice Differentiation
  console.log('\n--- TEST SUITE 4: Dealer Load Dispatch Note Distinction ---')
  const dispatchNote = {
    id: 'disp-777',
    invoice_number: 'DISP-2026-0042',
    bill_type: 'LOAD DISPATCH NOTE (NOT A SALES INVOICE)',
    dealer_name: 'Krishna Traders',
    dispatch_date: '2026-11-14',
    total_quantity: 100,
    total_amount: 7000,
    grand_total: 7000
  }

  const dispMsg = formatInvoiceWhatsAppMessage(dispatchNote)
  assert('Dispatch note has distinct header', dispMsg.includes('*ROYAL KISSAN — LOAD DISPATCH NOTE*'))
  assert('Dispatch note contains explicit non-sales invoice notice', dispMsg.includes('NOT a finalized sales tax invoice'))

  const dispPdf = buildBillPDFDoc(dispatchNote)
  assert('Dispatch note PDF filename generated', dispPdf.filename.includes('DISP-2026-0042'))

  // TEST 5: Database Schema & Audit Trail Verification
  console.log('\n--- TEST SUITE 5: Database Schema & Notification Audit Trail ---')
  const testIdempotencyKey = `test_wa_inv_${Date.now()}`
  const insertRes = await pool.query(`
    INSERT INTO whatsapp_notifications (
      invoice_number,
      bill_type,
      pdf_filename,
      recipient_phone,
      recipient_name,
      recipient_type,
      message_type,
      message_content,
      status,
      idempotency_key
    ) VALUES (
      'TEST-INV-001',
      'dealer_invoice',
      'Royal_Kissan_Invoice_TEST-INV-001.pdf',
      '+919347662554',
      'Verification Test Recipient',
      'dealer',
      'invoice_document',
      'Test invoice message verification',
      'SENT',
      $1
    ) RETURNING id, invoice_number, pdf_filename, status;
  `, [testIdempotencyKey])

  assert('Successfully logged invoice WhatsApp notification in DB', insertRes.rows.length === 1 && insertRes.rows[0].invoice_number === 'TEST-INV-001')
  assert('Stored PDF filename in audit record', insertRes.rows[0].pdf_filename === 'Royal_Kissan_Invoice_TEST-INV-001.pdf')

  // Clean up test record
  await pool.query('DELETE FROM whatsapp_notifications WHERE idempotency_key = $1', [testIdempotencyKey])

  // Check columns exist on tables
  const colsRes = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'whatsapp_notifications' AND column_name IN ('invoice_id', 'invoice_number', 'pdf_filename', 'bill_type');
  `)
  assert('All required columns exist on whatsapp_notifications', colsRes.rows.length === 4)

  const settColRes = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'whatsapp_settings' AND column_name = 'auto_send_invoices';
  `)
  assert('auto_send_invoices column exists on whatsapp_settings', settColRes.rows.length === 1)

  await pool.end()

  console.log('\n========================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(e => {
  console.error('Fatal test error:', e)
  process.exit(1)
})
