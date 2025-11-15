import { api } from './client'

export type Client = {
  id: number
  name: string
  created_at: string
}

export type CreateClientPayload = {
  name: string
}

export async function listClients(): Promise<Client[]> {
  const { data } = await api.get<Client[]>('/clients')
  return data
}

export async function createClient(payload: CreateClientPayload): Promise<Client> {
  const { data } = await api.post<Client>('/clients', payload)
  return data
}