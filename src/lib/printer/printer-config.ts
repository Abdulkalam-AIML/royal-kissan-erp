export type PaperWidth = '80mm' | '58mm'
export type ConnectionType = 'wifi' | 'bluetooth' | 'usb'
export type CopyType = 'customer' | 'dealer' | 'kitchen' | 'office' | 'company' | 'duplicate'

export interface PrinterSettings {
  id?: string
  printer_name: string
  connection_type: ConnectionType
  printer_ip: string
  printer_port: number
  bluetooth_device_name?: string
  usb_vendor_id?: number
  paper_width: PaperWidth
  character_width: number
  auto_cut: boolean
  drawer_enabled: boolean
  is_default: boolean
  local_agent_url: string
  use_local_agent: boolean
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printer_name: 'TVS RP3230ABW',
  connection_type: 'wifi',
  printer_ip: '192.168.0.2',
  printer_port: 9100,
  bluetooth_device_name: 'TVS RP3230ABW',
  paper_width: '80mm',
  character_width: 48,
  auto_cut: true,
  drawer_enabled: true,
  is_default: true,
  local_agent_url: 'http://localhost:3002/print',
  use_local_agent: false,
}

export interface PrintJobOptions {
  copyType?: CopyType
  triggerDrawer?: boolean
  cutPaper?: boolean
  includeLogo?: boolean
  includeQr?: boolean
  customConfig?: Partial<PrinterSettings>
}

export interface PrintResult {
  success: boolean
  message: string
  duration_ms?: number
  bytes_sent?: number
  error_code?: 'OFFLINE' | 'TIMEOUT' | 'BUSY' | 'NETWORK_ERROR' | 'BLUETOOTH_ERROR' | 'USB_ERROR' | 'UNKNOWN'
}
