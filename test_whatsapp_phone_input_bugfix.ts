import { validateAndFormatIndianPhone } from './src/lib/services/whatsapp-service'

function runTypingTests() {
  console.log('=================================================================')
  console.log('TEST SUITE: WHATSAPP RECIPIENT PHONE INPUT & AUTOFILL STABILITY')
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

  // SIMULATE React state, DOM ref, and typing/autofill in WhatsAppShareModal
  class MockWhatsAppShareModal {
    recipientPhone = ''
    phoneError: string | null = null
    isOpen = false
    prevIsOpen = false
    bill: any = null
    domInputValue = '' // Simulates native HTMLInputElement.value in DOM

    openModal(bill: any) {
      this.isOpen = true
      this.bill = bill

      // Mirror updated useEffect in WhatsAppShareModal: only initialize on open transition
      if (this.isOpen && !this.prevIsOpen) {
        this.prevIsOpen = true
        const defaultPhone = String(
          bill?.customer_phone ||
          bill?.dealer_phone ||
          bill?.phone ||
          ''
        ).trim()

        this.recipientPhone = defaultPhone
        this.domInputValue = defaultPhone
        this.phoneError = null
      }
    }

    closeModal() {
      this.isOpen = false
      if (!this.isOpen && this.prevIsOpen) {
        this.prevIsOpen = false
        this.phoneError = null
      }
    }

    // Mirrors parent component re-renders (live clocks, polling, etc.)
    parentReRender(newBillObject: any) {
      this.bill = newBillObject
      // Crucial fix: While isOpen is true, parent re-renders NEVER reset recipientPhone!
      if (this.isOpen && !this.prevIsOpen) {
        this.prevIsOpen = true
        this.recipientPhone = String(newBillObject?.customer_phone || '').trim()
        this.domInputValue = this.recipientPhone
      }
    }

    // Keystroke handler
    handlePhoneChange(val: string) {
      this.recipientPhone = val
      this.domInputValue = val
      if (this.phoneError) {
        this.phoneError = null
      }
    }

    // Simulates Chrome native autofill injecting directly into DOM element
    simulateChromeAutofill(autofillValue: string) {
      this.domInputValue = autofillValue
      // In onInput / onAnimationStart / onBlur:
      this.handlePhoneChange(autofillValue)
    }

    // Send action
    handleSendBill(): { success: boolean; formatted?: string; error?: string } {
      const currentInputVal = this.domInputValue || this.recipientPhone
      const trimmed = currentInputVal.trim()

      if (!trimmed) {
        this.phoneError = 'Recipient WhatsApp mobile number is required.'
        return { success: false, error: this.phoneError }
      }

      const validation = validateAndFormatIndianPhone(trimmed)
      if (!validation.isValid) {
        // PRESERVE the entered number in recipientPhone!
        this.recipientPhone = currentInputVal
        this.phoneError = validation.error || 'Please enter a valid 10-digit Indian mobile number.'
        return { success: false, error: this.phoneError }
      }

      this.recipientPhone = currentInputVal
      this.phoneError = null
      return { success: true, formatted: validation.formattedPhone }
    }
  }

  // TEST 1: Typing 9391234567 ONE DIGIT AT A TIME with parent re-renders
  console.log('--- TEST 1: Typing 9391234567 One Digit At A Time (Walk-in Customer) ---')
  const walkinModal = new MockWhatsAppShareModal()
  walkinModal.openModal({ id: 'bill-walkin-1', customer_name: 'Walk-in Customer', customer_phone: null })
  assert('Walk-in Customer starts with empty recipient field', walkinModal.recipientPhone === '')

  const typingSequence = ['9', '93', '939', '9391', '93912', '939123', '9391234', '93912345', '939123456', '9391234567']
  for (const step of typingSequence) {
    walkinModal.handlePhoneChange(step)
    // Interleave with high-frequency parent re-renders
    walkinModal.parentReRender({ id: 'bill-walkin-1', customer_name: 'Walk-in Customer', customer_phone: null, timestamp: Date.now() })
    assert(`Input retains "${step}" after keystroke and parent re-render`, walkinModal.recipientPhone === step)
    assert(`No error displayed while typing "${step}"`, walkinModal.phoneError === null)
  }

  const sendResult1 = walkinModal.handleSendBill()
  assert('Send succeeds for Walk-in Customer with manually entered 9391234567', sendResult1.success && sendResult1.formatted === '+919391234567')

  // TEST 2: +91-prefixed numbers & 91-prefixed numbers
  console.log('\n--- TEST 2: Phone Format Acceptance (10-digit, +91, 91) ---')
  const formats = [
    { input: '9391234567', expected: '+919391234567', desc: 'Standard 10-digit mobile' },
    { input: '+919391234567', expected: '+919391234567', desc: '+91-prefixed mobile' },
    { input: '919391234567', expected: '+919391234567', desc: '91-prefixed mobile without plus' },
    { input: '+91 93912 34567', expected: '+919391234567', desc: '+91 with internal spaces' },
    { input: '91 9391234567', expected: '+919391234567', desc: '91 with space before number' },
    { input: '91-9391234567', expected: '+919391234567', desc: '91 with hyphen' },
    { input: '09391234567', expected: '+919391234567', desc: '11-digit mobile starting with 0' },
    { input: '+91 09391234567', expected: '+919391234567', desc: '+91 followed by 0 and 10 digits' }
  ]

  for (const fmt of formats) {
    const v = validateAndFormatIndianPhone(fmt.input)
    assert(`Format "${fmt.desc}" (${fmt.input}) accepted`, v.isValid && v.formattedPhone === fmt.expected)
  }

  // TEST 3: Chrome Autofill Handling
  console.log('\n--- TEST 3: Chrome Autofill Handling ---')
  const autofillModal = new MockWhatsAppShareModal()
  autofillModal.openModal({ id: 'bill-autofill', customer_name: 'Walk-in Customer' })
  assert('Autofill modal initial phone is empty', autofillModal.recipientPhone === '')

  // Simulate Chrome Autofill suggestion picked by operator
  autofillModal.simulateChromeAutofill('+91 93912 34567')
  assert('Chrome autofill value is captured cleanly into state', autofillModal.recipientPhone === '+91 93912 34567')

  // Simulate parent re-render after autofill
  autofillModal.parentReRender({ id: 'bill-autofill', customer_name: 'Walk-in Customer' })
  assert('Autofilled value is preserved across re-renders', autofillModal.recipientPhone === '+91 93912 34567')

  const autofillSend = autofillModal.handleSendBill()
  assert('Send succeeds with autofilled number', autofillSend.success && autofillSend.formatted === '+919391234567')

  // TEST 4: Validation only on Send click & Preserving input on error
  console.log('\n--- TEST 4: Validation Only on Send Click & Digit Preservation on Error ---')
  const errorModal = new MockWhatsAppShareModal()
  errorModal.openModal({ id: 'bill-err', customer_name: 'Walk-in Customer' })

  // Type incomplete number "939"
  errorModal.handlePhoneChange('939')
  assert('No error while typing incomplete number "939"', errorModal.phoneError === null)

  // Click Send with incomplete number
  const sendIncomplete = errorModal.handleSendBill()
  assert('Send fails for incomplete number "939"', !sendIncomplete.success)
  assert('Entered digits "939" are strictly PRESERVED in input on error', errorModal.recipientPhone === '939')
  assert('Descriptive error shown', Boolean(errorModal.phoneError?.includes('complete 10-digit')))

  // Resuming typing clears error
  errorModal.handlePhoneChange('9391234567')
  assert('Continuing typing clears the validation error immediately', errorModal.phoneError === null)
  assert('Full number visible in state', errorModal.recipientPhone === '9391234567')

  // Invalid starting digit (e.g. 1234567890)
  errorModal.handlePhoneChange('1234567890')
  const sendInvalid = errorModal.handleSendBill()
  assert('Send fails for invalid starting digit', !sendInvalid.success)
  assert('Invalid input "1234567890" is PRESERVED in field on error', errorModal.recipientPhone === '1234567890')
  assert('Error message specifies 6, 7, 8, 9 requirement', Boolean(errorModal.phoneError?.includes('6, 7, 8, or 9')))

  // TEST 5: Dealer Invoice Dialog
  console.log('\n--- TEST 5: Dealer Invoice Dialog ---')
  const dealerModal = new MockWhatsAppShareModal()
  dealerModal.openModal({ id: 'dealer-bill-1', dealer_name: 'Sri Sai Agri Traders', dealer_phone: '9440123456', bill_type: 'dealer' })
  assert('Dealer phone prefilled accurately', dealerModal.recipientPhone === '9440123456')

  // Operator edits dealer phone
  dealerModal.handlePhoneChange('9440999999')
  dealerModal.parentReRender({ id: 'dealer-bill-1', dealer_name: 'Sri Sai Agri Traders', dealer_phone: '9440123456', bill_type: 'dealer' })
  assert('Operator edited dealer phone preserved across re-renders', dealerModal.recipientPhone === '9440999999')

  const dealerSend = dealerModal.handleSendBill()
  assert('Dealer send succeeds with edited phone', dealerSend.success && dealerSend.formatted === '+919440999999')

  // TEST 6: Modal Close and Re-open Lifecycle
  console.log('\n--- TEST 6: Modal Close and Re-open Lifecycle ---')
  dealerModal.closeModal()
  assert('Modal marked closed', !dealerModal.isOpen)

  // Reopen with different customer
  dealerModal.openModal({ id: 'bill-new', customer_name: 'Rajesh Kumar', customer_phone: '9848011223' })
  assert('Reopened modal initializes with new customer phone', dealerModal.recipientPhone === '9848011223')
  assert('No residual error on reopen', dealerModal.phoneError === null)

  console.log('\n=================================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTypingTests()
