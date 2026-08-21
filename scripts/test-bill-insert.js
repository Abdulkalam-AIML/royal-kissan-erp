const { Client } = require('pg')

async function testInsertDirect() {
  const client = new Client({
    user: 'postgres.oweutcivgpmzldlcmkvd',
    password: '24ME1A42ABDULKALAM',
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Testing real POS bill RPC execution on Supabase...')

    const testBill = {
      invoice_number: `TEST-${Date.now()}`,
      bill_type: 'company_sale',
      customer_name: 'Architect Verification Test',
      customer_phone: '9999999999',
      subtotal: 100,
      taxable_amount: 100,
      gst_amount: 18,
      cgst_amount: 9,
      sgst_amount: 9,
      igst_amount: 0,
      discount_amount: 0,
      round_off: 0,
      grand_total: 118,
      total_amount: 118,
      paid_amount: 118,
      due_amount: 0,
      cash_amount: 118,
      upi_amount: 0,
      card_amount: 0,
      wallet_amount: 0,
      bank_amount: 0,
      mixed_amount: 0,
      payment_mode: 'cash',
      payment_status: 'paid',
      status: 'active',
      invoice_type: 'thermal',
      date: new Date().toISOString().split('T')[0],
      items_count: 1,
      created_by: 'QA Architect'
    }

    const testItems = [
      {
        product_name: 'Water Can 20L Test',
        quantity: 1,
        rate: 100,
        gst_rate: 18,
        gst_amount: 18,
        amount: 118
      }
    ]

    const res = await client.query(
      `SELECT process_pos_bill($1::jsonb, $2::jsonb) AS result`,
      [JSON.stringify(testBill), JSON.stringify(testItems)]
    )

    const result = res.rows[0].result
    console.log('✅ TEST BILL SAVED SUCCESSFULLY!')
    console.log('Inserted Bill ID:', result.id)
    console.log('Invoice Number :', result.invoice_number)
    console.log('Grand Total    :', result.grand_total)
    console.log('Bank Amount    :', result.bank_amount)

    // Cleanup test record
    if (result.id) {
      await client.query(`DELETE FROM public.bills WHERE id = $1`, [result.id])
      console.log('Cleaned up test record from database.')
    }

  } catch (err) {
    console.error('Test insert failed:', err)
  } finally {
    await client.end()
  }
}

testInsertDirect()
