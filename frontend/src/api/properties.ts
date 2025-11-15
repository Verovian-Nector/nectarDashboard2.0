import { api } from './client'

export type Property = {
  id: number
  title: string
  address: string
  published: boolean
  owner_id: number
  created_at: string
  updated_at: string
  acf?: Record<string, any> | null
}

export type InventoryItem = {
  id: number
  name: string
  brand?: string | null
  purchase_date?: string | null
  value?: number | null
  condition?: string | null
  owner?: string | null
  notes?: string | null
  photos?: string[] | null
  quantity?: number | null
  created: string
  updated: string
}

export type InventoryRoom = {
  id: number
  room_name: string
  room_type?: string | null
  items: InventoryItem[]
}

export type Inventory = {
  id: number
  property_id: number
  property_name: string
  rooms: InventoryRoom[]
}

export type PropertyDetail = Property & {
  content?: string | null
  tenant_info?: Record<string, any> | null
  financial_info?: Record<string, any> | null
  maintenance_records?: Array<Record<string, any>> | null
  documents?: Array<Record<string, any>> | null
  inspections?: Record<string, any> | null
  inventory?: Inventory | null
}

export type ListPropertiesParams = {
  page?: number
  pageSize?: number
  sortBy?: string | null
  order?: 'asc' | 'desc' | null
  location?: string | null
  beds?: number | null
  bathrooms?: number | null
  property_type?: string | null
  status?: string | null
}

export async function listProperties(params: ListPropertiesParams = {}) {
  const {
    page = 1,
    pageSize = 10,
    sortBy = null,
    order = 'asc',
    location = null,
    beds = null,
    bathrooms = null,
    property_type = null,
    status = null,
  } = params

  const skip = (page - 1) * pageSize
  const limit = pageSize

  const searchParams = new URLSearchParams()
  searchParams.set('skip', String(skip))
  searchParams.set('limit', String(limit))
  if (sortBy) searchParams.set('sort_by', sortBy)
  if (order) searchParams.set('order', order)
  if (location) searchParams.set('location', location)
  if (beds !== null && beds !== undefined) searchParams.set('beds', String(beds))
  if (bathrooms !== null && bathrooms !== undefined) searchParams.set('bathrooms', String(bathrooms))
  if (property_type) searchParams.set('property_type', property_type)
  if (status) searchParams.set('status', status)

  const url = `/properties?${searchParams.toString()}`
  const { data } = await api.get<Property[]>(url)
  return data
}

export async function getProperty(id: number) {
  const { data } = await api.get<PropertyDetail>(`/properties/${id}`)
  return data
}

// Create property payload aligned with backend PropertyCreate schema
export type CreatePropertyPayload = {
  title: string
  content?: string | null
  address?: string | null
  description?: string | null
  acf?: Record<string, any> | null
}

export async function createProperty(payload: CreatePropertyPayload) {
  const { data } = await api.post<Property>('/properties', payload)
  return data
}

// Update property payload aligned with backend PropertyUpdate/ACFUpdate
export type UpdatePropertyPayload = {
  title?: string | null
  content?: string | null
  address?: string | null
  description?: string | null
  owner_id?: number | null
  acf?: {
    financial_group?: {
      // Note: backend schema uses these exact (typoed) keys
      rent_to_landord?: number | string | null
      rent_yeild?: number | string | null
      collection_date?: string | null
      payment_date?: string | null
      payment_method?: string | null
    }
    [key: string]: any
  } | null
}

export async function updateProperty(id: number, payload: UpdatePropertyPayload) {
  const { data } = await api.put<PropertyDetail>(`/properties/${id}`, payload)
  return data
}