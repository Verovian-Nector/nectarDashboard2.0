export function isEmptyObject(value: any): boolean {
  if (!value) return true
  if (typeof value !== 'object') return false
  return Object.keys(value).length === 0
}