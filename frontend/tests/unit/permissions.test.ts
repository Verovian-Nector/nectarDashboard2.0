import { describe, it, expect } from 'vitest'
import type { UserPermissions } from '../../src/api/users'
import { defaultCRUD, sectionKeys, getCrudFor, withCrudPatch, withCheckbox } from '../../src/utils/permissions'

describe('permissions utils', () => {
  it('defaultCRUD returns read=true, others=false', () => {
    const c = defaultCRUD()
    expect(c.read).toBe(true)
    expect(c.create).toBe(false)
    expect(c.update).toBe(false)
    expect(c.delete).toBe(false)
  })

  it('sectionKeys includes core sections', () => {
    const keys = sectionKeys()
    expect(keys).toContain('users')
    expect(keys).toContain('tenants_group')
  })

  it('getCrudFor returns default when missing', () => {
    const perms: UserPermissions = {}
    const crud = getCrudFor(perms, 'users')
    expect(crud).toEqual(defaultCRUD())
  })

  it('withCrudPatch merges partial updates immutably', () => {
    const perms: UserPermissions = {}
    const next = withCrudPatch(perms, 'users', { update: true })
    expect(next.users?.update).toBe(true)
    // original remains unchanged
    expect(perms.users).toBeUndefined()
  })

  it('withCheckbox toggles a specific field', () => {
    const perms: UserPermissions = {}
    const next = withCheckbox(perms, 'users', 'delete', true)
    expect(next.users?.delete).toBe(true)
  })
})