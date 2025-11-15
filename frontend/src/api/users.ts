import { api } from './client'

export type CRUDPermissions = {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export type UserPermissions = Partial<{
  users: CRUDPermissions
  properties: CRUDPermissions
  inventory: CRUDPermissions
  inspection_group: CRUDPermissions
  inventory_group: CRUDPermissions
  documents_group: CRUDPermissions
  mainenance_group: CRUDPermissions
  financial_group: CRUDPermissions
  tenants_group: CRUDPermissions
  profile_management: CRUDPermissions
  profilegroup: CRUDPermissions
  gallery_photos: CRUDPermissions
}>

export type User = {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  permissions?: Record<string, any> | null
}

export type CreateUserPayload = {
  username: string
  email: string
  password: string
  role: string
  permissions?: UserPermissions | null
}
export type UpdateUserPayload = Partial<{
  username: string
  email: string
  role: string
  is_active: boolean
}>

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me')
  return data
}

export async function listUsers(params?: { roles?: string; active?: boolean }): Promise<User[]> {
  const { data } = await api.get<User[]>('/users', { params })
  return data
}

export async function listUsersByRole(roles: string): Promise<User[]> {
  const { data } = await api.get<User[]>('/users', { params: { roles } })
  return data
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>('/users', payload)
  return data
}

export async function updateUserPermissions(userId: number, perms: UserPermissions): Promise<User> {
  // Backend expects the raw permissions object (not wrapped under "permissions").
  const { data } = await api.put<User>(`/users/${userId}/permissions`, perms)
  return data
}
export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<User> {
  const { data } = await api.put<User>(`/users/${userId}`, payload)
  return data
}
export async function deleteUser(userId: number): Promise<User> {
  const { data } = await api.delete<User>(`/users/${userId}`)
  return data
}

export async function hardDeleteUser(userId: number): Promise<{ status: string }> {
  const { data } = await api.delete<{ status: string }>(`/users/${userId}/hard-delete`)
  return data
}