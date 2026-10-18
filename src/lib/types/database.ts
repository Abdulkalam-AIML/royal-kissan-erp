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
