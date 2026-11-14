import {
  formatInvoiceWhatsAppMessage,
  validateInvoiceDataCompleteness,
  validateAndFormatIndianPhone
} from '../src/lib/services/whatsapp-service'
import { buildBillPDFDoc, generateBillPDFBlob } from '../src/lib/utils/pdf-generator'

console.log('=================================================================')
console.log('ROYAL KISSAN ERP — WHATSAPP BILL PURCHASE DETAILS VERIFICATION')
console.log('=================================================================')

let passedTests = 0
let totalTests = 0

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`✅ [PASS] ${testName}`)
  } else {
    console.error(`❌ [FAIL] ${testName}`)
    if (details) console.error(`   Details: ${details}`)
    process.exitCode = 1
  }
}

// -------------------------------------------------------------
// TEST 1: Customer Invoice WhatsApp Message Formatter
// -------------------------------------------------------------
console.log('\n--- 1. Testing Customer Invoice WhatsApp Message ---')
const customerBill = {
  id: 'cust-bill-101',
  invoice_number: 'RK-2026-001',
  date: '14-11-2026',
  customer_name: 'ABC Customer',
  customer_phone: '9391234567',
  payment_mode: 'CASH',
  subtotal: 310,
  discount_amount: 0,
  gst_amount: 0,
  grand_total: 310,
  previous_balance: 100,
  paid_amount: 200,
  due_amount: 210,
  items: [
    {
      product_name: 'Water Can 20L',
      quantity: 10,
      unit: 'Cans',
      rate: 15,
      amount: 150
    },
    {
      product_name: 'Water Packets',
      quantity: 2,
      unit: 'Boxes',
      rate: 80,
      amount: 160
    }
  ]
}

const custMsg = formatInvoiceWhatsAppMessage(customerBill)
console.log('Customer Message Output:\n', custMsg)

assert(custMsg.includes('Hello ABC Customer'), 'Customer message addresses recipient by name')
assert(custMsg.includes('Invoice No: RK-2026-001'), 'Customer message includes invoice number')
assert(custMsg.includes('Date: 14-11-2026'), 'Customer message includes date')
assert(custMsg.includes('1. Water Can 20L — 10 Cans × ₹15 = ₹150'), 'Customer message has item 1 with qty, unit, rate, amount')
assert(custMsg.includes('2. Water Packets — 2 Boxes × ₹80 = ₹160'), 'Customer message has item 2 with qty, unit, rate, amount')
assert(custMsg.includes('Subtotal: ₹310'), 'Customer message shows subtotal')
assert(custMsg.includes('Previous Outstanding: ₹100'), 'Customer message shows previous balance')
assert(custMsg.includes('Final Payable Amount: ₹410'), 'Customer message calculates final payable amount (310 + 100 = 410)')
assert(custMsg.includes('Amount Paid: ₹200'), 'Customer message shows amount paid')
assert(custMsg.includes('Remaining Due: ₹210'), 'Customer message shows remaining due')
assert(custMsg.includes('Payment Method: CASH'), 'Customer message shows payment method')
assert(custMsg.includes('Please find your detailed invoice attached'), 'Customer message references attached PDF document')

// -------------------------------------------------------------
// TEST 2: Dealer Invoice WhatsApp Message with Next-Day Reconciliation
// -------------------------------------------------------------
console.log('\n--- 2. Testing Dealer Invoice WhatsApp Message with Next-Day Returns ---')
const dealerBill = {
  id: 'dlr-bill-202',
  invoice_number: 'RK-DLR-2026-088',
  date: '14-11-2026',
  dealer_name: 'ABC Dealer',
  dealer_phone: '9848012345',
  dealer_gstin: '37AAAAA0000A1Z5',
  bill_type: 'dealer_invoice',
  payment_mode: 'UPI',
  today_dispatch_quantity: 100,
  original_dispatch_reference: 'RK-DSP-2026-001',
  returned_quantity: 5,
  leaked_quantity: 2,
  return_credit: 350,
  leakage_credit: 140,
  subtotal: 7000,
  discount_amount: 0,
  gst_amount: 0,
  grand_total: 6510,
  previous_balance: 1000,
  paid_amount: 6510,
  due_amount: 1000,
  items: [
    {
      product_name: 'Water Bags',
      quantity: 100,
      unit: 'Bags',
      rate: 70,
      amount: 7000
    }
  ]
}

const dlrMsg = formatInvoiceWhatsAppMessage(dealerBill)
console.log('Dealer Message Output:\n', dlrMsg)

assert(dlrMsg.includes('Hello ABC Dealer'), 'Dealer message addresses dealer by name')
assert(dlrMsg.includes('Invoice No: RK-DLR-2026-088'), 'Dealer message includes dealer invoice number')
assert(dlrMsg.includes('1. Water Bags — 100 Bags × ₹70 = ₹7000'), 'Dealer message has itemized purchase line')
assert(dlrMsg.includes("Today's Dispatch Quantity: 100 Bags"), 'Dealer message shows today dispatch quantity')
assert(dlrMsg.includes('Original Dispatch Ref: RK-DSP-2026-001'), 'Dealer message shows original dispatch reference')
assert(dlrMsg.includes('Previous-Day Returns: 5 Bags (Credit: -₹350)'), 'Dealer message shows previous-day returned qty & credit')
assert(dlrMsg.includes('Previous-Day Leakage: 2 Bags (Credit: -₹140)'), 'Dealer message shows previous-day leaked qty & credit')
assert(dlrMsg.includes('Return Credit Amount: -₹350'), 'Dealer message shows explicit return credit amount')
assert(dlrMsg.includes('Leakage Credit Amount: -₹140'), 'Dealer message shows explicit leakage credit amount')
assert(dlrMsg.includes('Net Amount (After Credits): ₹6510'), 'Dealer message shows net amount after credits')
assert(dlrMsg.includes('Final Payable Amount: ₹7510'), 'Dealer message shows final payable including previous outstanding')
assert(dlrMsg.includes('Amount Paid: ₹6510'), 'Dealer message shows amount paid')
assert(dlrMsg.includes('Payment Method: UPI'), 'Dealer message shows payment method')

// -------------------------------------------------------------
// TEST 3: PDF Document Generation with Vector Logo & Details
// -------------------------------------------------------------
console.log('\n--- 3. Testing PDF Document Generation ---')
const pdfRes = generateBillPDFBlob(dealerBill)

assert(!!pdfRes.doc, 'PDF Document generated successfully')
assert(!!pdfRes.blob, 'PDF Blob generated successfully')
assert(typeof pdfRes.base64 === 'string' && pdfRes.base64.length > 500, 'PDF Base64 string produced (>500 bytes)')
assert(pdfRes.filename.includes('RK-DLR-2026-088') || pdfRes.filename.includes('RK_DLR_2026_088'), `Filename matches invoice format: ${pdfRes.filename}`)

// Also test Customer PDF generation
const custPdfRes = generateBillPDFBlob(customerBill)
assert(!!custPdfRes.doc, 'Customer PDF Document generated successfully')
assert(typeof custPdfRes.base64 === 'string' && custPdfRes.base64.length > 500, 'Customer PDF Base64 string produced')

// -------------------------------------------------------------
// TEST 4: Transaction Data Completeness Validation
// -------------------------------------------------------------
console.log('\n--- 4. Testing Transaction Completeness Validation ---')

// Valid case
const validCheck = validateInvoiceDataCompleteness(customerBill)
assert(validCheck.isValid === true, 'Complete customer bill passes validation')

const validDlrCheck = validateInvoiceDataCompleteness(dealerBill)
assert(validDlrCheck.isValid === true, 'Complete dealer bill passes validation')

// Missing invoice number
const invalidNoInv = validateInvoiceDataCompleteness({
  ...customerBill,
  invoice_number: '',
  bill_number: '',
  id: ''
})
assert(invalidNoInv.isValid === false, 'Rejects invoice with missing invoice number')

// Missing recipient
const invalidNoName = validateInvoiceDataCompleteness({
  ...customerBill,
  customer_name: '',
  dealer_name: '',
  recipient_name: ''
})
assert(invalidNoName.isValid === false, 'Rejects invoice with missing recipient name')

// Empty items array
const invalidNoItems = validateInvoiceDataCompleteness({
  ...customerBill,
  items: []
})
assert(invalidNoItems.isValid === false, 'Rejects invoice with empty items list')

// Negative rate item
const invalidNegRate = validateInvoiceDataCompleteness({
  ...customerBill,
  items: [
    { product_name: 'Water Can', quantity: 5, rate: -20, amount: -100 }
  ]
})
assert(invalidNegRate.isValid === false, 'Rejects invoice with negative line rate')

// Negative grand total
const invalidNegTotal = validateInvoiceDataCompleteness({
  ...customerBill,
  grand_total: -500
})
assert(invalidNegTotal.isValid === false, 'Rejects invoice with negative grand total')

// -------------------------------------------------------------
// TEST 5: Indian Phone Number Validation
// -------------------------------------------------------------
console.log('\n--- 5. Testing Phone Validation ---')
assert(validateAndFormatIndianPhone('9391234567').isValid, 'Validates 10-digit Indian mobile 9391234567')
assert(validateAndFormatIndianPhone('+919391234567').isValid, 'Validates +91-prefixed 10-digit mobile')
assert(validateAndFormatIndianPhone('919391234567').isValid, 'Validates 91-prefixed 10-digit mobile')
assert(!validateAndFormatIndianPhone('12345').isValid, 'Rejects incomplete 5-digit number')
assert(!validateAndFormatIndianPhone('5391234567').isValid, 'Rejects invalid starting digit (starts with 5)')

console.log('\n=================================================================')
console.log(`ALL VERIFICATION TESTS COMPLETED: ${passedTests} / ${totalTests} PASSED`)
console.log('=================================================================')

if (passedTests === totalTests) {
  process.exit(0)
} else {
  process.exit(1)
}
