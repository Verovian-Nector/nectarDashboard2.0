export type PaymentColorKey = 'incomingRent' | 'incomingCharge' | 'outgoingRent' | 'outgoingCharge'

export const PAYMENT_COLORS: Record<PaymentColorKey, { color: string; background: string }> = {
  incomingRent: { color: '#1eb5fd', background: '#b9e3f7' },
  incomingCharge: { color: '#fff82a', background: '#fcfabb' },
  outgoingRent: { color: '#ff4cc8', background: '#f9abe0' },
  outgoingCharge: { color: '#ca5cf4', background: '#edc3fd' },
}

export function colorsForIncoming(type: 'Rent' | 'Charge') {
  return type === 'Rent' ? PAYMENT_COLORS.incomingRent : PAYMENT_COLORS.incomingCharge
}

export function colorsForOutgoing(type: 'Rent' | 'Charge') {
  return type === 'Rent' ? PAYMENT_COLORS.outgoingRent : PAYMENT_COLORS.outgoingCharge
}