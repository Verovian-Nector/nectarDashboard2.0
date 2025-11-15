import { api } from './client'

export async function logCheckoutDate(date: string, source?: 'incoming' | 'outgoing') {
  return api.post('/log/checkout-date', { date, source })
}