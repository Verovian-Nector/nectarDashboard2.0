import { api } from './client'

export type IntegrationConfig = {
  id: number
  client_id: number
  integration_type: string
  direction: 'inbound' | 'outbound' | 'bidirectional'
  source_of_truth: 'dashboard' | 'external'
  endpoint_url?: string | null
  auth_type?: 'none' | 'basic' | 'bearer' | 'apikey' | 'hmac' | null
  auth_config?: Record<string, any> | null
  field_mappings?: Record<string, any> | null
  transforms?: Record<string, any> | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export type CreateIntegrationPayload = {
  integration_type: string
  direction: 'inbound' | 'outbound' | 'bidirectional'
  source_of_truth?: 'dashboard' | 'external'
  endpoint_url?: string
  auth_type?: 'none' | 'basic' | 'bearer' | 'apikey' | 'hmac'
  auth_config?: Record<string, any>
  field_mappings?: Record<string, any>
  transforms?: Record<string, any>
  enabled?: boolean
}

export type UpdateIntegrationPayload = Partial<Omit<CreateIntegrationPayload, 'client_id'>>

export async function listIntegrations(): Promise<IntegrationConfig[]> {
  const { data } = await api.get<IntegrationConfig[]>('/integrations')
  return data
}

export async function createIntegration(payload: CreateIntegrationPayload): Promise<IntegrationConfig> {
  const { data } = await api.post<IntegrationConfig>('/integrations', payload)
  return data
}

export async function updateIntegration(configId: number, payload: UpdateIntegrationPayload): Promise<IntegrationConfig> {
  const { data } = await api.put<IntegrationConfig>(`/integrations/${configId}`, payload)
  return data
}

export async function importSingle(configId: number, external_id: number, owner_id?: number) {
  const { data } = await api.post(`/integrations/${configId}/import/single`, { external_id, owner_id })
  return data
}

export async function importBulk(configId: number, page = 1, per_page = 20, owner_id?: number) {
  const { data } = await api.post(`/integrations/${configId}/import/bulk`, { page, per_page, owner_id })
  return data
}