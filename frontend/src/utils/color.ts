// Simple color utilities to derive a 10-shade palette from a base hex
// Shade index convention matches Mantine: 0 (lightest) → 9 (darkest), with base around 6

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n))
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => {
      const s = Math.round(x).toString(16)
      return s.length === 1 ? '0' + s : s
    })
    .join('')}`
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6})$/.test(hex.trim())
}

// Derive a 10-color palette from a base hex.
// We gently adjust lightness and saturation to produce pleasant tints/shades.
export function deriveBrandPalette(baseHex: string): string[] {
  if (!isValidHex(baseHex)) {
    // Default Nectar palette if base invalid
    return ['#eaf4f6','#d6eaee','#b6d8df','#92c5cf','#6bb0be','#489da9','#2A7B88','#256e79','#1d5863','#15414b']
  }
  const rgb = hexToRgb(baseHex)!
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  // Lighten/darken deltas for indices 0..9 relative to base (index 6)
  const lightnessDeltas = [40, 32, 24, 16, 8, 4, 0, -6, -12, -18]
  const saturationDeltas = [-12, -10, -8, -6, -4, -2, 0, 2, 4, 6]

  const palette: string[] = []
  for (let i = 0; i < 10; i++) {
    const nl = clamp(l + lightnessDeltas[i], 4, 96)
    const ns = clamp(s + saturationDeltas[i], 4, 96)
    const outRgb = hslToRgb(h, ns, nl)
    palette.push(rgbToHex(outRgb.r, outRgb.g, outRgb.b))
  }
  // Ensure index 6 equals the base hex
  palette[6] = baseHex.trim()
  return palette
}