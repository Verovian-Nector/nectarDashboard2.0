export function formatDate(val: any): string {
  if (!val) return '-'
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleDateString()
}

export function formatCurrency(val: any, currency: string = 'GBP'): string {
  if (val === null || val === undefined || val === '') return '-'
  const n = typeof val === 'number' ? val : (typeof val === 'string' ? parseFloat(val) : NaN)
  if (!Number.isFinite(n)) return '-'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
  } catch {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n)
  }
}