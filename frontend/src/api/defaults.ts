import { api } from './client'

export type DefaultRoom = {
  id: number
  room_name: string
  order: number
}

export type DefaultItem = {
  id: number
  room_name: string
  name: string
  brand?: string | null
  value?: number | null
  condition?: string | null
  owner?: string | null
  notes?: string | null
  photos?: string[] | null
  order: number
}

export type CreateDefaultRoomPayload = {
  room_name: string
  order: number
}

export type UpdateDefaultRoomPayload = {
  room_name?: string
  order?: number
}

export type CreateDefaultItemPayload = {
  room_name: string
  name: string
  brand?: string
  value?: number
  condition?: string
  owner?: string
  notes?: string
  photos?: string[]
  order?: number
}

export async function getDefaultRooms(): Promise<DefaultRoom[]> {
  const { data } = await api.get<DefaultRoom[]>('/defaults/rooms')
  return data
}

export async function createDefaultRoom(payload: CreateDefaultRoomPayload): Promise<DefaultRoom> {
  const { data } = await api.post<DefaultRoom>('/defaults/rooms', payload)
  return data
}

export async function updateDefaultRoom(roomId: number, payload: UpdateDefaultRoomPayload): Promise<DefaultRoom> {
  const { data } = await api.put<DefaultRoom>(`/defaults/rooms/${roomId}`, payload)
  return data
}

export async function deleteDefaultRoom(roomId: number): Promise<void> {
  await api.delete(`/defaults/rooms/${roomId}`)
}

export async function getDefaultItems(): Promise<DefaultItem[]> {
  const { data } = await api.get<DefaultItem[]>('/defaults/items')
  return data
}

export async function createDefaultItem(payload: CreateDefaultItemPayload): Promise<DefaultItem> {
  const { data } = await api.post<DefaultItem>('/defaults/items', payload)
  return data
}

export async function deleteDefaultItem(itemId: number): Promise<void> {
  await api.delete(`/defaults/items/${itemId}`)
}

export async function updateDefaultItem(itemId: number, payload: CreateDefaultItemPayload): Promise<DefaultItem> {
  const { data } = await api.put<DefaultItem>(`/defaults/items/${itemId}`, payload)
  return data
}