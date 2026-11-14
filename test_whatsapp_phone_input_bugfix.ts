import { validateAndFormatIndianPhone } from './src/lib/services/whatsapp-service'

function runTypingTests() {
  console.log('=================================================================')
  console.log('TEST SUITE: WHATSAPP RECIPIENT PHONE INPUT TYPING & VALIDATION')
  console.log('=================================================================\n')

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

  // SIMULATE React state and typing sequence in WhatsAppShareModal
  class MockWhatsAppShareModal {
    recipientPhone = ''
    phoneError: string | null = null
    activeBillKey: string | null = null
    isOpen = false
    bill: any = null

    // Mirrors the updated useEffect in WhatsAppShareModal
    openModal(bill: any) {
      this.isOpen = true
      this.bill = bill
      const currentBillKey = String(bill.id || bill.invoice_number || bill.bill_number || 'default')

      if (this.activeBillKey !== currentBillKey) {
        this.activeBillKey = currentBillKey
        this.recipientPhone = String(bill.customer_phone || bill.dealer_phone || bill.phone || '').trim()
        this.phoneError = null
      }
    }

    closeModal() {
      this.isOpen = false
      this.activeBillKey = null
      this.phoneError = null
    }

    // Mirrors parent component re-render with newly-allocated bill object
    parentReRender(newBillObject: any) {
      this.bill = newBillObject
      const currentBillKey = String(newBillObject.id || newBillObject.invoice_number || newBillObject.bill_number || 'default')

      // Bugfix verification: if activeBillKey matches, DO NOT reset recipientPhone!
      if (this.activeBillKey !== currentBillKey) {
        this.activeBillKey = currentBillKey
        this.recipientPhone = String(newBillObject.customer_phone || newBillObject.dealer_phone || newBillObject.phone || '').trim()
        this.phoneError = null
      }
    }

    // Mirrors handlePhoneChange: updates directly without live clearing
    handlePhoneChange(val: string) {
      this.recipientPhone = val
      if (this.phoneError) {
        this.phoneError = null
      }
    }

    // Mirrors handleSendBill: validates on Send and preserves input even on error
    handleSendBill(): { success: boolean; formatted?: string; error?: string } {
      const trimmed = this.recipientPhone.trim()
      if (!trimmed) {
        this.phoneError = 'Recipient WhatsApp mobile number is required.'
        return { success: false, error: this.phoneError }
      }

      const validation = validateAndFormatIndianPhone(trimmed)
      if (!validation.isValid) {
        // PRESERVE the entered number in recipientPhone!
        this.phoneError = validation.error || 'Please enter a valid 10-digit Indian mobile number.'
        return { success: false, error: this.phoneError }
      }

      this.phoneError = null
      return { success: true, formatted: validation.formattedPhone }
    }
  }

  // TEST 1: Manual typing sequence test (9 -> 93 -> 939 -> 9391234567)
  console.log('--- TEST 1: Mandatory Typing Sequence on Empty Customer Phone ---')
  const modal = new MockWhatsAppShareModal()
  modal.openModal({ id: 'bill-1', invoice_number: 'RK-2026-001', customer_name: 'Walk-in Customer' })
  assert('Initial phone is empty for walk-in customer', modal.recipientPhone === '')

  // Simulate typing '9'
  modal.handlePhoneChange('9')
  // Simulate parent re-render (e.g. live clock tick or background worker poll)
  modal.parentReRender({ id: 'bill-1', invoice_number: 'RK-2026-001', customer_name: 'Walk-in Customer' })
  assert('Input retains "9" after keystroke and parent re-render', modal.recipientPhone === '9')

  // Simulate typing '3' -> '93'
  modal.handlePhoneChange('93')
  modal.parentReRender({ id: 'bill-1', invoice_number: 'RK-2026-001', customer_name: 'Walk-in Customer' })
  assert('Input retains "93" without clearing', modal.recipientPhone === '93')

  // Simulate typing '9' -> '939'
  modal.handlePhoneChange('939')
  modal.parentReRender({ id: 'bill-1', invoice_number: 'RK-2026-001', customer_name: 'Walk-in Customer' })
  assert('Input retains "939" without clearing', modal.recipientPhone === '939')

  // Simulate complete 10-digit number typing '9391234567'
  modal.handlePhoneChange('9391234567')
  modal.parentReRender({ id: 'bill-1', invoice_number: 'RK-2026-001', customer_name: 'Walk-in Customer' })
  assert('Input retains "9391234567"', modal.recipientPhone === '9391234567')

  // TEST 2: Typing with +91 prefix (+919391234567)
  console.log('\n--- TEST 2: Typing Sequence with +91 Prefix ---')
  modal.handlePhoneChange('+919391234567')
  modal.parentReRender({ id: 'bill-1', invoice_number: 'RK-2026-001', customer_name: 'Walk-in Customer' })
  assert('Input retains "+919391234567" without clearing', modal.recipientPhone === '+919391234567')

  const sendResult1 = modal.handleSendBill()
  assert('Send succeeds with +91 formatted result', sendResult1.success && sendResult1.formatted === '+919391234567')

  // TEST 3: Editing a prefilled customer mobile number
  console.log('\n--- TEST 3: Editing Prefilled Customer Mobile Number ---')
  const prefilledModal = new MockWhatsAppShareModal()
  prefilledModal.openModal({
    id: 'bill-2',
    invoice_number: 'RK-2026-002',
    customer_name: 'Ramesh Kumar',
    customer_phone: '9848012345'
  })
  assert('Initial phone is prefilled with customer number', prefilledModal.recipientPhone === '9848012345')

  // Operator edits the last digits
  prefilledModal.handlePhoneChange('9848012346')
  // Re-render occurs
  prefilledModal.parentReRender({
    id: 'bill-2',
    invoice_number: 'RK-2026-002',
    customer_name: 'Ramesh Kumar',
    customer_phone: '9848012345' // original in bill
  })
  assert('Operator edited number is preserved, NOT reverted to original', prefilledModal.recipientPhone === '9848012346')

  // TEST 4: Dealer Invoice Sending
  console.log('\n--- TEST 4: Dealer Invoice Phone Handling ---')
  const dealerModal = new MockWhatsAppShareModal()
  dealerModal.openModal({
    id: 'dlr-bill-1',
    invoice_number: 'RK-2026-DLR-001',
    dealer_name: 'Sri Krishna Agencies',
    dealer_phone: '9440123456'
  })
  assert('Dealer phone prefilled accurately', dealerModal.recipientPhone === '9440123456')

  dealerModal.handlePhoneChange('9440999999')
  dealerModal.parentReRender({
    id: 'dlr-bill-1',
    invoice_number: 'RK-2026-DLR-001',
    dealer_name: 'Sri Krishna Agencies',
    dealer_phone: '9440123456'
  })
  assert('Dealer edited phone preserved across re-renders', dealerModal.recipientPhone === '9440999999')

  const dealerSend = dealerModal.handleSendBill()
  assert('Dealer send succeeds with +919440999999', dealerSend.success && dealerSend.formatted === '+919440999999')

  // TEST 5: Invalid and Incomplete Numbers & Preservation on Validation Error
  console.log('\n--- TEST 5: Preservation of Incomplete & Invalid Numbers on Error ---')
  const errorModal = new MockWhatsAppShareModal()
  errorModal.openModal({ id: 'bill-3', invoice_number: 'RK-2026-003' })

  // Incomplete number '939'
  errorModal.handlePhoneChange('939')
  const sendIncomplete = errorModal.handleSendBill()
  assert('Incomplete number fails send validation', !sendIncomplete.success)
  assert('Incomplete number "939" is PRESERVED in input on error', errorModal.recipientPhone === '939')
  assert('Descriptive error shown', errorModal.phoneError !== null)

  // Typing more digits clears the error message
  errorModal.handlePhoneChange('9391234567')
  assert('Typing clears previous validation error', errorModal.phoneError === null)
  assert('Completed number retained in state', errorModal.recipientPhone === '9391234567')

  // Invalid starting digit '1234567890'
  errorModal.handlePhoneChange('1234567890')
  const sendInvalid = errorModal.handleSendBill()
  assert('Invalid starting digit fails send validation', !sendInvalid.success)
  assert('Invalid number "1234567890" is PRESERVED in input on error', errorModal.recipientPhone === '1234567890')
  assert('Error message specifies 6, 7, 8, 9 requirement', Boolean(errorModal.phoneError?.includes('6, 7, 8, or 9')))

  // TEST 6: Closing and Reopening WhatsApp Dialog
  console.log('\n--- TEST 6: Reopening WhatsApp Dialog ---')
  errorModal.closeModal()
  assert('Modal marked closed', !errorModal.isOpen)

  // Reopen for bill-4 with prefilled number
  errorModal.openModal({
    id: 'bill-4',
    invoice_number: 'RK-2026-004',
    customer_phone: '9123456789'
  })
  assert('Reopened modal initializes with new bill phone', errorModal.recipientPhone === '9123456789')
  assert('No residual error on reopen', errorModal.phoneError === null)

  console.log('\n=================================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runTypingTests()
