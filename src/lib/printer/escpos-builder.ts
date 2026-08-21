/**
 * ESC/POS Command Builder for TVS-E RP3230ABW Thermal Printer
 * Protocol: ESC/POS
 * Width: 80mm (48 columns CP437)
 */

export class EscPosBuilder {
  private buffer: number[] = []
  private width: number

  constructor(characterWidth: number = 48) {
    this.width = characterWidth
    this.init()
  }

  /** Initialize printer */
  public init(): this {
    this.buffer.push(0x1b, 0x40) // ESC @
    this.setCodePage(0) // CP437
    return this
  }

  /** Set Code Page (0 = CP437 Standard USA) */
  public setCodePage(codePage: number = 0): this {
    this.buffer.push(0x1b, 0x74, codePage) // ESC t n
    return this
  }

  /** Align text: 'left' | 'center' | 'right' */
  public align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0
    this.buffer.push(0x1b, 0x61, val) // ESC a n
    return this
  }

  /** Bold text toggle */
  public bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0) // ESC E n
    return this
  }

  /** Underline text toggle */
  public underline(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x2d, enable ? 1 : 0) // ESC - n
    return this
  }

  /** Set font size: normal, double_width, double_height, double_both */
  public size(mode: 'normal' | 'double_width' | 'double_height' | 'double_both'): this {
    let val = 0x00
    if (mode === 'double_width') val = 0x10
    else if (mode === 'double_height') val = 0x01
    else if (mode === 'double_both') val = 0x11
    this.buffer.push(0x1d, 0x21, val) // GS ! n
    return this
  }

  /** Print raw text string encoded in CP437 */
  public text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      // Basic ASCII / CP437 conversion
      if (code < 128) {
        this.buffer.push(code)
      } else if (str[i] === '₹') {
        // Rs symbol fallback for thermal printers without Unicode: "Rs." or CP437
        this.buffer.push(0x52, 0x73, 0x2e) // "Rs."
      } else {
        this.buffer.push(0x3f) // '?'
      }
    }
    return this
  }

  /** Print text with newline */
  public line(str: string = ''): this {
    this.text(str)
    this.buffer.push(0x0a) // \n
    return this
  }

  /** Print horizontal divider line (e.g. 48 '-' dashes) */
  public divider(char: string = '-'): this {
    const dash = char[0] || '-'
    this.line(dash.repeat(this.width))
    return this
  }

  /** Print two-column row (Left aligned item, Right aligned price/value) */
  public twoColumn(left: string, right: string, charWidth?: number): this {
    const totalWidth = charWidth || this.width
    const rightLen = right.length
    const maxLeftLen = Math.max(1, totalWidth - rightLen - 1)
    
    let trimmedLeft = left
    if (left.length > maxLeftLen) {
      trimmedLeft = left.slice(0, maxLeftLen)
    }

    const spaces = Math.max(1, totalWidth - trimmedLeft.length - rightLen)
    const formatted = trimmedLeft + ' '.repeat(spaces) + right
    this.line(formatted)
    return this
  }

  /** Print multi-column table row (e.g. Item (24), Qty (6), Rate (8), Total (10)) */
  public tableRow(cols: { text: string; width: number; align?: 'left' | 'right' | 'center' }[]): this {
    let rowStr = ''
    for (const col of cols) {
      const colText = col.text || ''
      const w = col.width
      const a = col.align || 'left'
      let formatted = ''

      if (colText.length >= w) {
        formatted = colText.slice(0, w)
      } else if (a === 'right') {
        formatted = ' '.repeat(w - colText.length) + colText
      } else if (a === 'center') {
        const leftSpaces = Math.floor((w - colText.length) / 2)
        const rightSpaces = w - colText.length - leftSpaces
        formatted = ' '.repeat(leftSpaces) + colText + ' '.repeat(rightSpaces)
      } else {
        formatted = colText + ' '.repeat(w - colText.length)
      }
      rowStr += formatted
    }
    this.line(rowStr)
    return this
  }

  /** Line feed n lines */
  public feed(lines: number = 2): this {
    this.buffer.push(0x1b, 0x64, Math.max(1, lines)) // ESC d n
    return this
  }

  /**
   * Add 1-bit Monochrome Raster Image Bitmap (GS v 0)
   * widthDots must be multiple of 8
   */
  public rasterImage(widthDots: number, heightDots: number, data: Uint8Array): this {
    const xL = Math.floor((widthDots / 8) % 256)
    const xH = Math.floor((widthDots / 8) / 256)
    const yL = Math.floor(heightDots % 256)
    const yH = Math.floor(heightDots / 256)

    // GS v 0 0 xL xH yL yH
    this.buffer.push(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH)
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data[i])
    }
    this.buffer.push(0x0a)
    return this
  }

  /**
   * Native ESC/POS QR Code command (GS ( k)
   */
  public qrCode(content: string, moduleSize: number = 6): this {
    const dataBytes: number[] = []
    for (let i = 0; i < content.length; i++) {
      dataBytes.push(content.charCodeAt(i) & 0xff)
    }

    // 1. Select QR Model (Model 2)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)

    // 2. Set Module Size
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, moduleSize)))

    // 3. Set Error Correction Level (Level M)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31)

    // 4. Store Data
    const len = dataBytes.length + 3
    const pL = len % 256
    const pH = Math.floor(len / 256)
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...dataBytes)

    // 5. Print Stored QR Code
    this.align('center')
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30)
    this.line()
    this.align('left')
    return this
  }

  /** Trigger cash drawer kick (pin 2 pulse 50ms) */
  public cashDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa) // ESC p 0 25 250
    return this
  }

  /** Cut paper (GS V 66 3 or GS V 0) */
  public cut(mode: 'full' | 'partial' = 'full'): this {
    this.feed(3)
    if (mode === 'partial') {
      this.buffer.push(0x1d, 0x56, 0x01) // GS V 1
    } else {
      this.buffer.push(0x1d, 0x56, 0x42, 0x03) // GS V 66 3 (Feed & Cut)
    }
    return this
  }

  /** Build binary Buffer / Uint8Array */
  public build(): Uint8Array {
    return new Uint8Array(this.buffer)
  }
}
