/**
 * Royal Kissan ERP — Shared Formatters
 * Single source of truth for all number/date/currency formatting.
 * Import from here instead of redefining in each page.
 */

/**
 * Format a number as Indian Rupee currency.
 * Uses tabular-numeric aware formatting for financial displays.
 * @param amount - The numeric amount to format
 * @param decimals - Number of decimal places (default 0 for display, 2 for billing)
 */
export function formatCurrency(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount || 0)
}

/**
 * Format currency with 2 decimal places (for billing/invoice use).
 */
export function formatCurrencyBilling(amount: number): string {
  return formatCurrency(amount, 2)
}

/**
 * Format a date string or Date object to Indian locale format.
 * @param date - ISO date string, Date object, or null/undefined
 * @param opts - Optional Intl.DateTimeFormatOptions overrides
 */
export function formatDate(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

/**
 * Format a date as a short DD/MM/YYYY string (used in tables).
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  const day   = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year  = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Format a plain number with Indian locale grouping (e.g., 1,00,000).
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value || 0)
}

/**
 * Convert a number to Indian words (Rupees in words for invoices).
 */
export function numberToWords(num: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero Rupees Only'

  function convert(n: number): string {
    if (n < 20)       return ones[n]
    if (n < 100)      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000)     return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000)   return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }

  const integer = Math.floor(num)
  const decimal = Math.round((num - integer) * 100)
  let result = convert(integer) + ' Rupees'
  if (decimal > 0) result += ' and ' + convert(decimal) + ' Paise'
  return result + ' Only'
}
