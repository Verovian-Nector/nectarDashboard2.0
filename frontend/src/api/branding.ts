import { authApi } from './client'

export type BrandSettingsResponse = {
  id: number
  app_title: string
  logo_url: string | null
  favicon_url: string | null
  font_family: string
  primary_color: string
  brand_palette: string[]
  dark_mode_default: boolean
  theme_overrides: Record<string, any>
  created_at: string
  updated_at: string
}

export type BrandSettingsUpdate = Partial<{
  app_title: string
  logo_url: string | null
  favicon_url: string | null
  font_family: string
  primary_color: string
  brand_palette: string[]
  dark_mode_default: boolean
  theme_overrides: Record<string, any>
}>

export async function getBranding(): Promise<BrandSettingsResponse> {
  const resp = await authApi.get('/branding')
  return resp.data
}

export async function updateBranding(payload: BrandSettingsUpdate): Promise<BrandSettingsResponse> {
  const resp = await authApi.put('/branding', payload)
  return resp.data
}