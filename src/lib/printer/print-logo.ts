/**
 * Royal Kissan Logo Monochrome Bitmap Generator for Thermal Printing (GS v 0)
 * Scaled for 80mm Thermal Receipt (width: 384 dots, height: 120 dots)
 */

export interface LogoBitmap {
  widthDots: number
  heightDots: number
  data: Uint8Array
}

// Cached logo raster buffer for instant printing (<1ms)
let cachedLogoBitmap: LogoBitmap | null = null

/**
 * Generate 1-bit monochrome raster image byte array for ESC/POS GS v 0
 * 384 dots wide = 48 bytes per line
 */
export function getRoyalKissanLogoRaster(): LogoBitmap {
  if (cachedLogoBitmap) {
    return cachedLogoBitmap
  }

  const widthDots = 384 // 48 bytes * 8 bits = 384 dots (fits 80mm perfectly)
  const heightDots = 80 // 80 rows high
  const bytesPerLine = widthDots / 8
  const totalBytes = bytesPerLine * heightDots
  const data = new Uint8Array(totalBytes)

  // Render stylized "ROYAL KISSAN" crown & drop emblem pattern into 1-bit raster
  // Center emblem drop/crown (rows 0..30)
  const centerX = widthDots / 2

  for (let y = 0; y < heightDots; y++) {
    for (let x = 0; x < widthDots; x++) {
      let isBlack = false

      // Crown / Water Drop geometry calculation
      const dx = Math.abs(x - centerX)
      if (y >= 5 && y <= 35) {
        // Water drop shape
        const dropWidth = (y - 5) * 1.2
        if (dx <= dropWidth && y <= 25) isBlack = true
        if (dx <= (35 - y) * 1.5 && y > 25) isBlack = true
        // Inner white cutout for drop shine
        if (dx >= dropWidth * 0.4 && dx <= dropWidth * 0.7 && y >= 12 && y <= 20) {
          isBlack = false
        }
      }

      // Outer decorative circle accent
      const distFromCenter = Math.sqrt(dx * dx + (y - 20) * (y - 20))
      if (distFromCenter >= 24 && distFromCenter <= 27 && y <= 38) {
        isBlack = true
      }

      // Banner underline (rows 45..48)
      if (y >= 45 && y <= 48 && dx <= 140) {
        isBlack = true
      }

      // Star accents left and right
      if ((y >= 18 && y <= 22) && ((dx >= 50 && dx <= 54) || (dx >= 70 && dx <= 74))) {
        isBlack = true
      }

      if (isBlack) {
        const byteIdx = y * bytesPerLine + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        data[byteIdx] |= 1 << bitIdx
      }
    }
  }

  cachedLogoBitmap = { widthDots, heightDots, data }
  return cachedLogoBitmap
}
