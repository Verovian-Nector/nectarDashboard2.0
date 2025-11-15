import type { UserPermissions } from '../api/users'

export type Crud = { create: boolean; read: boolean; update: boolean; delete: boolean }

export function defaultCRUD(): Crud {
  return { create: false, read: true, update: false, delete: false }
}

export function sectionKeys(): Array<keyof UserPermissions> {
  return [
    'users',
    'properties',
    'inventory',
    'inspection_group',
    'inventory_group',
    'documents_group',
    'mainenance_group',
    'financial_group',
    'tenants_group',
    'profile_management',
    'profilegroup',
    'gallery_photos',
  ]
}

export function getCrudFor(perms: UserPermissions, key: keyof UserPermissions): Crud {
  const raw = perms[key]
  if (raw && typeof raw === 'object') return raw as Crud
  return defaultCRUD()
}

export function withCrudPatch(perms: UserPermissions, key: keyof UserPermissions, patch: Partial<Crud>): UserPermissions {
  const base = getCrudFor(perms, key)
  return { ...perms, [key]: { ...base, ...patch } }
}

export function withCheckbox(perms: UserPermissions, key: keyof UserPermissions, field: keyof Crud, checked: boolean): UserPermissions {
  return withCrudPatch(perms, key, { [field]: checked } as Partial<Crud>)
}