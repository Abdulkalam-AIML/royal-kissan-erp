export type UnifiedBillType = 'counter' | 'customer' | 'dealer' | 'route'
export type LegacyBillType = 'wholesale' | 'delivery' | 'company_sale' | 'gst_invoice' | 'non_gst_invoice' | 'dealer_invoice' | 'driver_sale' | 'retail_invoice'
export type AnyBillType = UnifiedBillType | LegacyBillType

export type PaymentMode = 'cash' | 'upi' | 'card' | 'wallet' | 'bank' | 'mixed' | 'due'
export type PaymentStatus = 'paid' | 'due' | 'partial' | 'cancelled'
export type InvoiceFormat = 'thermal' | 'a4' | '58mm' | '80mm'

export interface Product {
  id: string
  name: string
  category?: string
  default_rate: number
  cost_price?: number
  mrp?: number
  gst_rate: number
  hsn_code?: string
  stock_quantity?: number
  unit?: string
  is_active: boolean
  low_stock_threshold?: number
  description?: string
  created_at?: string
  updated_at?: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  mobile?: string
  address?: string
  area?: string
  gstin?: string
  gst_number?: string
  outstanding_amount?: number
  current_due?: number
  credit_limit?: number
  customer_type?: string
  route_id?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Dealer {
  id: string
  name: string
  dealer_code?: string
  phone?: string
  address?: string
  area?: string
  gst_number?: string
  gstin?: string
  is_gst_enabled?: boolean
  default_gst_rate?: number
  state_code?: string
  pan_number?: string
  outstanding_amount?: number
  current_due?: number
  credit_limit?: number
  total_sales?: number
  total_purchases?: number
  last_purchase_date?: string
  route?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Driver {
  id: string
  name: string
  phone?: string
  license_number?: string
  vehicle_number?: string
  salary?: number
  is_active?: boolean
  created_at?: string
}

export interface Route {
  id: string
  name: string
  driver_id?: string
  area?: string
  description?: string
  is_active?: boolean
  created_at?: string
}

export interface RouteCustomer {
  id: string
  route_id: string
  customer_name: string
  name?: string
  section?: string
  default_quantity?: number
  default_qty?: number
  default_rate?: number
  default_product?: string
  product_name?: string
  is_manual_rate?: boolean
  sort_order?: number
  is_active?: boolean
}

export interface BillItem {
  id?: string
  bill_id?: string
  product_id?: string | null
  product_name: string
  quantity: number
  rate: number
  mrp?: number
  item_discount?: number
  discount_type?: 'flat' | 'percent'
  gst_rate?: number
  taxable_amount?: number
  gst_amount?: number
  amount: number
  total?: number
  cost_per_unit_at_sale?: number
  cogs_amount?: number
  rate_source?: string
  rate_rule_id?: string | null
  unit?: string
  is_tax_inclusive?: boolean
  original_rate?: number
  override_reason?: string
  overridden_by?: string
  created_at?: string
}

export interface Bill {
  id?: string
  invoice_number: string
  bill_type: AnyBillType
  customer_name: string
  customer_phone?: string | null
  customer_address?: string | null
  customer_gstin?: string | null
  customer_id?: string | null
  dealer_id?: string | null
  driver_id?: string | null
  route_id?: string | null
  route_customer_id?: string | null
  assignment_id?: string | null
  dispatch_id?: string | null
  items_count: number
  subtotal: number
  taxable_amount?: number
  gst_amount: number
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
  discount_amount?: number
  coupon_code?: string | null
  round_off?: number
  grand_total?: number
  total_amount: number
  total_cogs?: number
  gross_profit?: number
  cash_amount: number
  upi_amount: number
  card_amount?: number
  wallet_amount?: number
  bank_amount?: number
  mixed_amount?: number
  paid_amount: number
  due_amount: number
  payment_mode: PaymentMode
  payment_status: PaymentStatus
  status?: 'active' | 'cancelled' | 'refunded'
  invoice_type?: InvoiceFormat
  notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  date: string
  created_at?: string
  updated_at?: string
  items?: BillItem[]
}

export interface Payment {
  id?: string
  bill_id?: string | null
  sale_id?: string | null
  customer_id?: string | null
  dealer_id?: string | null
  driver_id?: string | null
  amount: number
  payment_mode: string
  payment_date?: string
  reference_number?: string | null
  reference?: string | null
  invoice_number?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  status?: string
}

export interface Collection {
  id?: string
  bill_id?: string | null
  driver_id?: string | null
  route_id?: string | null
  invoice_number?: string | null
  customer_name?: string | null
  amount: number
  payment_mode: string
  date: string
  collection_date?: string
  cash_amount?: number
  upi_amount?: number
  notes?: string | null
  created_at?: string
}

export interface CustomerDue {
  id?: string
  customer_id?: string | null
  dealer_id?: string | null
  driver_id?: string | null
  route_id?: string | null
  customer_name: string
  customer_phone?: string | null
  invoice_number?: string | null
  bill_id?: string | null
  total_amount: number
  paid_amount: number
  due_amount: number
  status?: string
  last_updated?: string
  created_at?: string
}

export interface Supplier {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  gstin?: string | null
  outstanding_balance?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface PurchaseItem {
  id?: string
  purchase_id?: string
  product_id?: string | null
  product_name: string
  quantity: number
  unit: string
  rate: number
  amount: number
  gst_rate?: number
  gst_amount?: number
  created_at?: string
}

export interface Purchase {
  id: string
  purchase_number: string
  supplier_id?: string | null
  supplier_name: string
  supplier_phone?: string | null
  supplier_invoice_number?: string | null
  purchase_date: string
  subtotal: number
  discount_amount: number
  gst_amount: number
  grand_total: number
  paid_amount: number
  due_amount: number
  payment_method: string
  purchase_status: string
  notes?: string | null
  created_by?: string
  created_at?: string
  updated_at?: string
  items?: PurchaseItem[]
  items_count?: number
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[]
}

export interface WhatsAppSettings {
  id?: string
  organization_id?: string
  enabled: boolean
  phone_number_id?: string | null
  whatsapp_business_account_id?: string | null
  access_token?: string | null
  default_recipient_phone: string
  recipient_type: 'owner' | 'admin' | 'supplier' | 'custom'
  send_to_supplier: boolean
  auto_send_invoices?: boolean
  webhook_verify_token?: string | null
  updated_at?: string
}

export type WhatsAppNotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface WhatsAppNotification {
  id: string
  purchase_id?: string | null
  purchase_number?: string | null
  invoice_id?: string | null
  invoice_number?: string | null
  bill_type?: string | null
  pdf_filename?: string | null
  pdf_url?: string | null
  media_id?: string | null
  recipient_phone: string
  recipient_name?: string | null
  recipient_type?: string
  message_type: string
  message_content: string
  status: WhatsAppNotificationStatus
  meta_message_id?: string | null
  idempotency_key?: string | null
  error_message?: string | null
  retry_count: number
  sent_at?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at?: string
}

// ============================================================================
// DEALER DISPATCH, RETURNS & SETTLEMENT TYPES
// ============================================================================

export interface DealerDispatchItem {
  id?: string
  dispatch_id?: string
  product_id?: string | null
  product_name: string
  unit: string
  quantity: number
  rate: number
  amount: number
  returned_quantity?: number
  leaked_quantity?: number
  accepted_quantity?: number
  gst_rate?: number
  gst_amount?: number
  created_at?: string
}

export interface DealerDispatch {
  id: string
  dispatch_number: string
  dealer_id: string
  dealer_name: string
  dealer_gstin?: string | null
  is_gst_enabled: boolean
  is_interstate: boolean
  dispatch_date: string
  total_quantity: number
  subtotal: number
  discount_amount: number
  taxable_amount: number
  gst_rate: number
  gst_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_value: number
  status: 'DISPATCHED' | 'PARTIALLY_RETURNED' | 'SETTLED' | 'CANCELLED'
  responsible_staff?: string
  notes?: string | null
  created_at?: string
  updated_at?: string
  items?: DealerDispatchItem[]
}

export interface DealerDispatchWithItems extends DealerDispatch {
  items: DealerDispatchItem[]
}

export interface DealerReturnItem {
  id?: string
  return_entry_id?: string
  dispatch_item_id?: string | null
  product_id?: string | null
  product_name: string
  unit: string
  original_quantity: number
  previously_returned_qty?: number
  previously_leaked_qty?: number
  returned_quantity: number
  leaked_quantity: number
  original_rate: number
  adjustment_rate: number
  override_reason?: string | null
  return_credit_amount: number
  leakage_credit_amount: number
  condition: 'good' | 'damaged' | 'leaked' | 'unsellable'
  created_at?: string
}

export interface DealerReturnEntry {
  id: string
  return_number: string
  dealer_id: string
  dispatch_id: string
  dispatch_date: string
  return_date: string
  condition: 'good' | 'damaged' | 'leaked' | 'unsellable'
  total_returned_qty: number
  total_leaked_qty: number
  total_credit_amount: number
  notes?: string | null
  recorded_by?: string
  approved_by?: string
  created_at?: string
  items?: DealerReturnItem[]
}

export interface DealerReturnEntryWithItems extends DealerReturnEntry {
  items: DealerReturnItem[]
}

export interface DealerCreditAdjustment {
  id: string
  dealer_id: string
  dispatch_id?: string | null
  return_entry_id?: string | null
  adjustment_date: string
  adjustment_type: 'return_credit' | 'leakage_credit' | 'other'
  amount: number
  status: 'APPROVED' | 'APPLIED'
  description?: string | null
  created_at?: string
}

export interface DealerDailySettlement {
  id: string
  dealer_id: string
  settlement_date: string
  opening_balance: number
  today_dispatches_amount: number
  previous_returns_credit: number
  previous_leakage_credit: number
  collections_received: number
  other_adjustments: number
  closing_balance: number
  status: 'DRAFT' | 'CONFIRMED'
  notes?: string | null
  confirmed_by?: string
  created_at?: string
  updated_at?: string
}

// ============================================================================
// DRIVER LOAD DISPATCH & ROUTE SETTLEMENT TYPES
// ============================================================================

export interface DriverLoadItem {
  id?: string
  load_dispatch_id?: string
  product_id?: string | null
  product_name: string
  unit: string
  loaded_quantity: number
  rate: number
  amount: number
  sold_quantity?: number
  returned_quantity?: number
  leaked_quantity?: number
  created_at?: string
}

export interface DriverLoadDispatch {
  id: string
  dispatch_number: string
  driver_id: string
  driver_name: string
  vehicle_number?: string | null
  route_id?: string | null
  route_name?: string | null
  dispatch_date: string
  total_loaded_qty: number
  total_load_value: number
  status: 'ISSUED' | 'SETTLED' | 'CANCELLED'
  notes?: string | null
  created_by?: string
  created_at?: string
  updated_at?: string
  items?: DriverLoadItem[]
}

export interface DriverLoadDispatchWithItems extends DriverLoadDispatch {
  items: DriverLoadItem[]
}

export interface DriverRouteSettlementItem {
  id?: string
  settlement_id?: string
  product_id?: string | null
  product_name: string
  loaded_qty: number
  sold_qty: number
  returned_good_qty: number
  leaked_damaged_qty: number
  rate: number
  sold_amount: number
  condition?: string
  created_at?: string
}

export interface DriverRouteSettlement {
  id: string
  settlement_number: string
  load_dispatch_id: string
  driver_id: string
  route_id?: string | null
  settlement_date: string
  total_loaded_qty: number
  total_sold_qty: number
  total_returned_qty: number
  total_leaked_qty: number
  unaccounted_qty: number
  cash_collected: number
  upi_collected: number
  credit_sales_amount: number
  route_expenses_amount: number
  expected_collection: number
  actual_collection: number
  collection_difference: number
  bills_generated_count: number
  status: 'CONFIRMED' | 'DRAFT'
  discrepancy_reason?: string | null
  confirmed_by?: string
  created_at?: string
  updated_at?: string
  items?: DriverRouteSettlementItem[]
}

export interface DriverRouteSettlementWithItems extends DriverRouteSettlement {
  items: DriverRouteSettlementItem[]
}
