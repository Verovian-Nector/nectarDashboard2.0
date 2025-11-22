import { api } from './client'
import { getDynamicSubdomain } from '../config'

export type TokenResponse = {
  access_token: string
  token_type: string
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const subdomain = typeof window !== 'undefined' ? getDynamicSubdomain() : 'localhost'
  if (subdomain === 'localhost') {
    const params = new URLSearchParams()
    params.set('username', username)
    params.set('password', password)
    const { data } = await api.post<TokenResponse>('/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  }
  const payload = { email: username, password }
  const { data } = await api.post<TokenResponse>('/auth/login', payload)
  return data
}