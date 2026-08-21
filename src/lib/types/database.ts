export interface Product {
  id: string
  name: string
  category?: string
  default_rate: number
  mrp?: number
  gst_rate: number
  hsn_code?: string
  stock_quantity?: number
  unit?: string
  is_active: boolean
}

export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  gstin?: string
  current_due?: number
  route_id?: string
}

export interface Dealer {
  id: string
  name: string
  phone?: string
  address?: string
  current_due?: number
}

export interface Driver {
  id: string
  name: string
  phone?: string
  vehicle_number?: string
}

export interface BillItem {
  id?: string
  bill_id?: string
  product_id?: string
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
}

export interface Bill {
  id?: string
  invoice_number: string
  bill_type: 'counter' | 'wholesale' | 'delivery' | 'dealer' | 'company_sale' | 'gst_invoice' | 'non_gst_invoice' | 'dealer_invoice' | 'driver_sale'
  customer_name: string
  customer_phone?: string | null
  customer_address?: string | null
  customer_gstin?: string | null
  customer_id?: string | null
  dealer_id?: string | null
  driver_id?: string | null
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
  cash_amount: number
  upi_amount: number
  card_amount?: number
  wallet_amount?: number
  bank_amount?: number
  mixed_amount?: number
  paid_amount: number
  due_amount: number
  payment_mode: 'cash' | 'upi' | 'card' | 'wallet' | 'bank' | 'mixed' | 'due'
  payment_status: 'paid' | 'due' | 'partial' | 'cancelled'
  status?: 'active' | 'cancelled' | 'refunded'
  invoice_type?: 'thermal' | 'a4' | '58mm' | '80mm'
  notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  date: string
  created_at?: string
  updated_at?: string
  items?: BillItem[]
}

export interface Collection {
  id?: string
  bill_id?: string
  invoice_number: string
  customer_name: string
  amount: number
  payment_mode: string
  date: string
  notes?: string
}
