import { createClient } from '@supabase/supabase-js'
import { enqueueThermalPrintJob, getRecentPrintJobs, getPrinterDevices } from '../src/lib/services/print-job-service'
import { BillData } from '../src/lib/printer/receipt'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyFlow() {
  console.log('--- STEP 1: VERIFY POSTGREST SCHEMA CACHE ---')
  console.log('Connecting to Supabase PostgREST endpoint:', supabaseUrl)

  const { data: devices, error: devErr } = await supabase
    .from('printer_devices')
    .select('*')

  if (devErr) {
    throw new Error(`Failed to query printer_devices via PostgREST: ${devErr.message}`)
  }
  console.log(`✅ PostgREST recognized printer_devices. Found ${devices.length} devices:`)
  devices.forEach(d => console.log(`   - ${d.device_name} [${d.connection_type}] MAC:${d.bluetooth_mac || 'N/A'} IP:${d.wifi_ip || 'N/A'}`))

  const { data: initialJobs, error: jobsErr } = await supabase
    .from('print_jobs')
    .select('id, invoice_number, status')
    .limit(5)

  if (jobsErr) {
    throw new Error(`Failed to query print_jobs via PostgREST: ${jobsErr.message}`)
  }
  console.log(`✅ PostgREST recognized print_jobs. Initial count: ${initialJobs.length}`)

  console.log('\n--- STEP 2: VERIFY ENQUEUE PRINT JOB VIA SERVICE ---')
  const testBill: BillData = {
    id: 'b8c8d8e8-0000-4000-8000-000000000001',
    invoice_number: `RK-VERIFY-${Date.now().toString().slice(-4)}`,
    bill_type: 'counter',
    customer_name: 'Verification Customer',
    customer_phone: '9347662554',
    subtotal: 100,
    gst_amount: 18,
    discount_amount: 0,
    total_amount: 118,
    paid_amount: 118,
    due_amount: 0,
    payment_method: 'CASH',
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        product_name: '20L Water Can (Test Verification)',
        quantity: 2,
        rate: 50,
        amount: 100
      }
    ]
  }

  const enqueueRes = await enqueueThermalPrintJob(testBill, 'customer', 'bluetooth')
  console.log('Enqueue Result:', enqueueRes)
  if (!enqueueRes.success || !enqueueRes.jobId) {
    throw new Error(`Enqueue failed: ${enqueueRes.message}`)
  }
  console.log(`✅ Print job #${testBill.invoice_number} successfully queued with ID: ${enqueueRes.jobId}`)

  console.log('\n--- STEP 3: VERIFY IDEMPOTENCY / ANTI-DUPLICATE PROTECTION ---')
  const dupRes = await enqueueThermalPrintJob(testBill, 'customer', 'bluetooth')
  console.log('Duplicate enqueue attempt result:', dupRes)
  if (!dupRes.isDuplicate) {
    throw new Error('Expected duplicate protection to catch rapid duplicate job submission!')
  }
  console.log('✅ Idempotency protection successfully prevented duplicate print ticket.')

  console.log('\n--- STEP 4: VERIFY ATOMIC CLAIM VIA RPC (ANDORID BRIDGE WORKER) ---')
  const workerId = 'android-bridge-unit-test'
  const { data: claimedRows, error: claimErr } = await supabase.rpc('claim_next_print_job', {
    p_worker_id: workerId,
    p_preferred_transport: 'bluetooth'
  })

  if (claimErr) {
    throw new Error(`claim_next_print_job RPC error: ${claimErr.message}`)
  }
  console.log('Claimed Row:', claimedRows)
  const claimedJob = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows
  if (!claimedJob || claimedJob.id !== enqueueRes.jobId) {
    throw new Error(`Expected claimed job to be ${enqueueRes.jobId}, got ${claimedJob?.id}`)
  }
  console.log(`✅ Job atomically claimed by worker ${claimedJob.claimed_by}. Status is now: ${claimedJob.status}`)

  console.log('\n--- STEP 5: VERIFY JOB STATUS TRANSITION (COMPLETED / SENT) ---')
  const { error: updateErr } = await supabase
    .from('print_jobs')
    .update({
      status: 'SENT',
      completed_at: new Date().toISOString()
    })
    .eq('id', enqueueRes.jobId)

  if (updateErr) {
    throw new Error(`Status update failed: ${updateErr.message}`)
  }
  console.log('✅ Status updated to SENT successfully.')

  console.log('\n--- STEP 6: VERIFY ERP SERVICE AUDIT READ ---')
  const recentJobs = await getRecentPrintJobs(10)
  const verifiedJob = recentJobs.find(j => j.id === enqueueRes.jobId)
  if (!verifiedJob || verifiedJob.status !== 'SENT') {
    throw new Error(`ERP read failed to show updated status 'SENT'. Got: ${verifiedJob?.status}`)
  }
  console.log(`✅ Verified in ERP Queue: Invoice #${verifiedJob.invoice_number} is in status '${verifiedJob.status}'`)
  console.log('\n🎉 ALL DATABASE, RLS, AND QUEUE OPERATIONS VERIFIED END-TO-END WITH ZERO ERRORS!')
}

verifyFlow().catch(err => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})
