import { useEffect, useMemo, useState } from 'react'
import { Title, Text, Stack, Card, Tabs, Group, Button, Table, Badge, Modal, Checkbox, Divider, TextInput, ActionIcon, Tooltip, Select, SimpleGrid, Loader, Switch, ColorInput, Image, ThemeIcon } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash, IconPencil, IconDeviceFloppy, IconRefresh, IconWorldWww, IconUpload, IconPhoto, IconX } from '@tabler/icons-react'
import { listUsers, updateUserPermissions, createUser, updateUser, deleteUser, hardDeleteUser, type User, type UserPermissions } from '../api/users'
import { getDefaultRooms, createDefaultRoom, updateDefaultRoom, deleteDefaultRoom, getDefaultItems, createDefaultItem, deleteDefaultItem, updateDefaultItem, type DefaultRoom, type DefaultItem } from '../api/defaults'
import { listIntegrations, updateIntegration, importSingle, importBulk, createIntegration, type IntegrationConfig } from '../api/integrations'
import { listClients, createClient } from '../api/clients'
import { SINGLE_SITE_MODE } from '../config'
import { useBranding } from '../context/BrandingProvider'
import { useContractors } from '../context/ContractorsProvider'
import { useFieldValues } from '../context/FieldValuesProvider'
import { uploadFiles } from '../api/upload'
import { deriveBrandPalette } from '../utils/color'
import { defaultCRUD, sectionKeys } from '../utils/permissions'
import { FIELD_DEFAULTS, FIELD_USAGE_NOTES } from '../config/fieldDefaults'
import UsersPermissionsEditor from '../components/admin/UsersPermissionsEditor'
import BrandPalettePreview from '../components/BrandPalettePreview'
import CreateUserModal from '../components/admin/CreateUserModal'
import EditUserModal from '../components/admin/EditUserModal'
import UserRowActions from '../components/admin/UserRowActions'
import UsersTab from '../components/admin/UsersTab'
import FieldValuesTab from '../components/admin/FieldValuesTab'
import ConfirmModal from '../components/ConfirmModal'

// sectionKeys and defaultCRUD moved to ../utils/permissions

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<string>('users')

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editPerms, setEditPerms] = useState<UserPermissions>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createPayload, setCreatePayload] = useState({ username: '', email: '', password: '', role: 'propertymanager' })
  const [creating, setCreating] = useState(false)
  const [userFilters, setUserFilters] = useState<{ roles: string[]; active: 'all' | 'active' | 'inactive'; search: string }>({ roles: [], active: 'all', search: '' })
  const visibleUsers = useMemo(() => {
    const q = userFilters.search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
  }, [users, userFilters.search])
  const [editUserDetails, setEditUserDetails] = useState<User | null>(null)
  const [editUserPayload, setEditUserPayload] = useState<{ username: string; email: string; role: string; is_active: boolean }>({ username: '', email: '', role: 'propertymanager', is_active: true })
  const [updatingUserBase, setUpdatingUserBase] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Array<number | string>>([])

  // Reusable confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState<string>('Confirm Deletion')
  const [confirmMessage, setConfirmMessage] = useState<string>('Are you sure? This action cannot be undone.')
  const [confirmLabel, setConfirmLabel] = useState<string>('Delete')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)

  // Defaults state
  const [rooms, setRooms] = useState<DefaultRoom[]>([])
  const [items, setItems] = useState<DefaultItem[]>([])
  const [defaultsLoading, setDefaultsLoading] = useState(true)
  const [newRoomName, setNewRoomName] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  // Add Item modal state
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [newItemRoom, setNewItemRoom] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<{ name: string; brand?: string; condition?: string; value?: string; owner?: string; notes?: string }>({ name: '', brand: '', condition: '', value: '', owner: '', notes: '' })
  const [creatingItem, setCreatingItem] = useState(false)
  // Edit Room modal state
  const [editRoomOpen, setEditRoomOpen] = useState(false)
  const [editingRoomTarget, setEditingRoomTarget] = useState<DefaultRoom | null>(null)
  const [editRoomPayload, setEditRoomPayload] = useState<{ room_name: string; order: number }>({ room_name: '', order: 0 })
  const [editingRoom, setEditingRoom] = useState(false)
  // Edit Item modal state
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editItemTarget, setEditItemTarget] = useState<DefaultItem | null>(null)
  const [editItemFields, setEditItemFields] = useState<{ name: string; brand?: string; condition?: string; value?: string; owner?: string; notes?: string; order?: number }>({ name: '', brand: '', condition: '', value: '', owner: '', notes: '', order: undefined })
  const [updatingItem, setUpdatingItem] = useState(false)
  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, DefaultItem[]>>((acc, it) => {
      (acc[it.room_name] = acc[it.room_name] || []).push(it)
      return acc
    }, {})
  }, [items])

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState(true)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null)
  const activeIntegration = useMemo(() => integrations.find(i => i.id === selectedIntegrationId) || integrations[0] || null, [integrations, selectedIntegrationId])
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [scenario, setScenario] = useState<string>('wp_outbound')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [publicApiKey, setPublicApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [importExternalId, setImportExternalId] = useState('')
  const [importPage, setImportPage] = useState('1')
  const [importPerPage, setImportPerPage] = useState('20')

  // Branding state
  const { branding, updateBranding, updating } = useBranding()
  const [appTitle, setAppTitle] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [fontFamily, setFontFamily] = useState('')
  const [primaryColorHex, setPrimaryColorHex] = useState('#2A7B88')
  const [paletteStr, setPaletteStr] = useState('')
  const [darkModeDefault, setDarkModeDefault] = useState(false)
  const [buttonBgHex, setButtonBgHex] = useState('#2A7B88')
  const [buttonTextHex, setButtonTextHex] = useState('#ffffff')
  const [badgeBgHex, setBadgeBgHex] = useState('#eaf4f6')
  const [badgeTextHex, setBadgeTextHex] = useState('#1f2937')
  const [iconBgHex, setIconBgHex] = useState('#eaf4f6')
  const [iconColorHex, setIconColorHex] = useState('#15414b')

  // Contractors state (admin-managed list for maintenance assignment)
  const { contractors, setContractors, addContractor, removeContractor, moveUp } = useContractors()
  const [newContractor, setNewContractor] = useState('')

  // Field values (consolidated settings)
  const { fieldValues: fvCtx, setFieldValues: setFvCtx, locations: locCtx, setLocations: setLocCtx } = useFieldValues()
  const [fieldValues, setFieldValues] = useState<Record<string, string[]>>(FIELD_DEFAULTS)
  const [fvTab, setFvTab] = useState<string>('locations')
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [editValueOpen, setEditValueOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<string>('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState<string>('')

  // Initialize field values from integration transforms if present
  useEffect(() => {
    const t = (activeIntegration?.transforms || {}) as Record<string, any>
    const storedFv = (t.field_values || {}) as Record<string, string[]>
    // Merge stored values over defaults
    setFieldValues((prev) => {
      const next: Record<string, string[]> = { ...prev }
      for (const key of Object.keys(FIELD_DEFAULTS)) {
        const arr = storedFv[key]
        if (Array.isArray(arr)) next[key] = arr
      }
      return next
    })
    // Keep locations in its dedicated state but mirror into fieldValues for display only
    if (Array.isArray((t as any).location_options)) {
      setLocationOptions((t as any).location_options)
    }
    // Update global context for immediate dropdown availability
    try {
      if (storedFv && Object.keys(storedFv).length) setFvCtx({ ...fvCtx, ...storedFv })
      if (Array.isArray((t as any).location_options)) setLocCtx((t as any).location_options)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIntegration?.id])

  function addFieldValue(category: string) {
    const v = (newValues[category] || '').trim()
    if (!v) return
    if (category === 'locations') {
      setLocationOptions((prev) => (prev.includes(v) ? prev : [...prev, v]))
    } else if (category === 'contractors') {
      addContractor(v)
    } else {
      setFieldValues((prev) => {
        const arr = prev[category] || []
        return { ...prev, [category]: arr.includes(v) ? arr : [...arr, v] }
      })
    }
    setNewValues((p) => ({ ...p, [category]: '' }))
  }

  function moveUpFieldValue(category: string, index: number) {
    if (category === 'locations') {
      setLocationOptions((prev) => {
        const arr = [...prev]
        if (index > 0) { const tmp = arr[index-1]; arr[index-1] = arr[index]; arr[index] = tmp }
        return arr
      })
    } else if (category === 'contractors') {
      moveUp(index)
    } else {
      setFieldValues((prev) => {
        const arr = [...(prev[category] || [])]
        if (index > 0) { const tmp = arr[index-1]; arr[index-1] = arr[index]; arr[index] = tmp }
        return { ...prev, [category]: arr }
      })
    }
  }

  function removeFieldValue(category: string, index: number) {
    if (category === 'locations') {
      setLocationOptions((prev) => prev.filter((_, i) => i !== index))
    } else if (category === 'contractors') {
      removeContractor(index)
    } else {
      setFieldValues((prev) => {
        const arr = [...(prev[category] || [])]
        arr.splice(index, 1)
        return { ...prev, [category]: arr }
      })
    }
  }

  function openEditFieldValue(category: string, index: number, current: string) {
    setEditCategory(category)
    setEditIndex(index)
    setEditText(current)
    setEditValueOpen(true)
  }

  function submitEditFieldValue() {
    const text = editText.trim()
    if (!text || editIndex === null) return
    const idx = editIndex
    if (editCategory === 'locations') {
      setLocationOptions((prev) => prev.map((v, i) => (i === idx ? text : v)))
    } else if (editCategory === 'contractors') {
      setContractors((prev) => prev.map((v, i) => (i === idx ? text : v)))
    } else {
      setFieldValues((prev) => ({
        ...prev,
        [editCategory]: (prev[editCategory] || []).map((v, i) => (i === idx ? text : v)),
      }))
    }
    setEditValueOpen(false)
    setEditCategory('')
    setEditIndex(null)
    setEditText('')
  }

  async function saveFieldValues() {
    if (!activeIntegration) {
      notifications.show({ title: 'No integration', message: 'Create integration in Integrations tab', color: 'red' })
      return
    }
    try {
      const transforms = { ...(activeIntegration.transforms || {}) }
      const fvPayload: Record<string, string[]> = {}
      for (const key of Object.keys(FIELD_DEFAULTS)) {
        fvPayload[key] = fieldValues[key] || []
      }
      const updated = await updateIntegration(activeIntegration.id, {
        transforms: { ...transforms, location_options: locationOptions, field_values: fvPayload },
      })
      setIntegrations((prev) => prev.map(i => (i.id === updated.id ? updated : i)))
      // Update global context so forms use latest options immediately
      setFvCtx(fvPayload)
      setLocCtx(locationOptions)
      notifications.show({ title: 'Field values saved', message: 'All options updated', color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to save', message: err?.message || 'Error', color: 'red' })
    }
  }

  useEffect(() => {
    if (!branding) return
    setAppTitle(branding.app_title || '')
    setLogoUrl(branding.logo_url || '')
    setFaviconUrl(branding.favicon_url || '')
    setFontFamily(branding.font_family || '')
    setPrimaryColorHex((branding.primary_color && branding.primary_color.startsWith('#')) ? branding.primary_color : '#2A7B88')
    setPaletteStr((branding.brand_palette || []).join(','))
    setDarkModeDefault(!!branding.dark_mode_default)
    const ov = (branding.theme_overrides || {}) as Record<string, any>
    setButtonBgHex((ov.button_bg_hex as string) || (branding.primary_color || '#2A7B88'))
    setButtonTextHex((ov.button_text_hex as string) || '#ffffff')
    setBadgeBgHex((ov.badge_bg_hex as string) || ((branding.brand_palette && branding.brand_palette[1]) || '#eaf4f6'))
    setBadgeTextHex((ov.badge_text_hex as string) || '#1f2937')
    setIconBgHex((ov.icon_bg_hex as string) || ((branding.brand_palette && branding.brand_palette[1]) || '#eaf4f6'))
    setIconColorHex((ov.icon_color_hex as string) || ((branding.brand_palette && branding.brand_palette[9]) || '#15414b'))
  }, [branding?.id])

  // Derive brand palette automatically from primary color hex
  useEffect(() => {
    const derived = deriveBrandPalette(primaryColorHex).join(',')
    setPaletteStr(derived)
  }, [primaryColorHex])

  // Font stacks for dropdown selection
  const fontStacks: Record<string, string> = {
    'Asap': 'Asap, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'System UI': 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Inter': 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Roboto': 'Roboto, system-ui, -apple-system, Segoe UI, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Open Sans': 'Open Sans, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Montserrat': 'Montserrat, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Lato': 'Lato, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Poppins': 'Poppins, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Work Sans': 'Work Sans, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Nunito': 'Nunito, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Noto Sans': 'Noto Sans, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Source Sans 3': 'Source Sans 3, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    'Segoe UI': 'Segoe UI, system-ui, -apple-system, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
  }
  const fontOptions = Object.keys(fontStacks).map((k) => ({ value: k, label: k }))

  // Load users
  useEffect(() => {
    let mounted = true
    async function loadUsers() {
      setUsersLoading(true)
      try {
        const rolesParam = userFilters.roles.length ? userFilters.roles.join(',') : undefined
        const activeParam = userFilters.active === 'all' ? undefined : (userFilters.active === 'active')
        const data = await listUsers({ roles: rolesParam, active: activeParam })
        if (!mounted) return
        setUsers(data)
      } catch (err: any) {
        notifications.show({ title: 'Failed to load users', message: err?.message || 'Error', color: 'red' })
      } finally {
        if (mounted) setUsersLoading(false)
      }
    }
    loadUsers()
    return () => { mounted = false }
  }, [userFilters.roles.join(','), userFilters.active])

  function openEditUserDetails(u: User) {
    setEditUserDetails(u)
    setEditUserPayload({ username: u.username, email: u.email || '', role: u.role || 'propertymanager', is_active: (u as any).is_active ?? true })
  }

  async function saveEditUserDetails() {
    if (!editUserDetails) return
    try {
      setUpdatingUserBase(true)
      const updated = await updateUser(editUserDetails.id as number, { ...editUserPayload })
      setUsers((prev) => prev.map(u => (u.id === updated.id ? updated : u)))
      setEditUserDetails(null)
      notifications.show({ title: 'User updated', message: updated.username, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to update user', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    } finally {
      setUpdatingUserBase(false)
    }
  }

  async function changeUserRole(u: User, role: string) {
    try {
      const updated = await updateUser(u.id as number, { role })
      setUsers((prev) => prev.map(x => (x.id === updated.id ? updated : x)))
      notifications.show({ title: 'Role updated', message: `${updated.username}: ${updated.role}`, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to change role', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    }
  }

  async function deactivateUserHandler(u: User) {
    try {
      const updated = await deleteUser(u.id as number)
      setUsers((prev) => prev.map(x => (x.id === updated.id ? updated : x)))
      notifications.show({ title: 'User deactivated', message: updated.username, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to deactivate user', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    }
  }

  function promptDeactivateUser(u: User) {
    setConfirmTitle('Confirm Deactivation')
    setConfirmMessage(`Deactivate user "${u.username}"? They will not be able to sign in until reactivated.`)
    setConfirmLabel('Deactivate')
    setConfirmAction(() => async () => {
      await deactivateUserHandler(u)
    })
    setConfirmOpen(true)
  }

  async function hardDeleteUserHandler(u: User) {
    try {
      await hardDeleteUser(u.id as number)
      setUsers((prev) => prev.filter(x => x.id !== u.id))
      notifications.show({ title: 'User deleted', message: u.username, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to delete user', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    }
  }

  function promptDeleteUser(u: User) {
    setConfirmTitle('Confirm Permanent Deletion')
    setConfirmMessage(`Permanently delete user "${u.username}"? This removes the account and associated data. This action cannot be undone.`)
    setConfirmLabel('Delete')
    setConfirmAction(() => async () => {
      await hardDeleteUserHandler(u)
    })
    setConfirmOpen(true)
  }

  function toggleUserRow(id: number | string, checked: boolean) {
    setSelectedUserIds((prev) => checked ? [...prev, id] : prev.filter(x => x !== id))
  }

  function toggleAllUsers(checked: boolean) {
    if (checked) setSelectedUserIds(visibleUsers.map(u => u.id))
    else setSelectedUserIds([])
  }

  function promptDeleteSelectedUsers() {
    if (selectedUserIds.length === 0) return
    setConfirmTitle('Confirm Bulk Deactivation')
    setConfirmMessage(`Deactivate ${selectedUserIds.length} selected user(s)? They will not be able to sign in until reactivated.`)
    setConfirmLabel('Deactivate Selected')
    setConfirmAction(() => async () => {
      try {
        const updates = await Promise.all(selectedUserIds.map(id => deleteUser(Number(id))))
        setUsers((prev) => prev.map(u => {
          const up = updates.find(x => x.id === u.id)
          return up ? up : u
        }))
        setSelectedUserIds([])
        notifications.show({ title: 'Users deactivated', message: `${updates.length} user(s)`, color: 'green' })
      } catch (err: any) {
        notifications.show({ title: 'Failed to deactivate users', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
      }
    })
    setConfirmOpen(true)
  }

  function promptHardDeleteSelectedUsers() {
    if (selectedUserIds.length === 0) return
    setConfirmTitle('Confirm Bulk Permanent Deletion')
    setConfirmMessage(`Permanently delete ${selectedUserIds.length} selected user(s)? This removes the accounts and associated data. This action cannot be undone.`)
    setConfirmLabel('Delete Selected')
    setConfirmAction(() => async () => {
      try {
        await Promise.all(selectedUserIds.map(id => hardDeleteUser(Number(id))))
        setUsers((prev) => prev.filter(u => !selectedUserIds.includes(u.id as any)))
        setSelectedUserIds([])
        notifications.show({ title: 'Users deleted', message: `${selectedUserIds.length} user(s)`, color: 'green' })
      } catch (err: any) {
        notifications.show({ title: 'Failed to delete users', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
      }
    })
    setConfirmOpen(true)
  }

  // Load defaults
  useEffect(() => {
    let mounted = true
    async function loadDefaults() {
      setDefaultsLoading(true)
      try {
        const [dr, di] = await Promise.all([getDefaultRooms(), getDefaultItems()])
        if (!mounted) return
        setRooms(dr)
        setItems(di)
      } catch (err: any) {
        notifications.show({ title: 'Failed to load defaults', message: err?.message || 'Error', color: 'red' })
      } finally {
        if (mounted) setDefaultsLoading(false)
      }
    }
    loadDefaults()
    return () => { mounted = false }
  }, [])

  // Load integrations
  useEffect(() => {
    let mounted = true
    async function loadIntegrations() {
      setIntegrationsLoading(true)
      try {
        const data = await listIntegrations()
        if (!mounted) return
        setIntegrations(data)
        // Initialize location options from transforms.location_options
        const cfg = data[0]
        if (cfg) {
          const opts = (cfg.transforms && Array.isArray((cfg.transforms as any).location_options)) ? (cfg.transforms as any).location_options : []
          setLocationOptions(opts)
          setSelectedIntegrationId(cfg.id)
          const isWP = (cfg.integration_type || '').toLowerCase() === 'wordpress'
          const dir = (cfg.direction || '').toLowerCase()
          const src = (cfg.source_of_truth || '').toLowerCase()
          const scen = isWP && dir === 'inbound' && src === 'external' ? 'wp_inbound'
            : isWP && dir === 'outbound' && src === 'dashboard' ? 'wp_outbound'
            : !isWP && dir === 'inbound' && src === 'external' ? 'external_inbound'
            : 'external_outbound'
          setScenario(scen)
          setEndpointUrl(cfg.endpoint_url || '')
          const apiKey = (cfg.auth_config || {})['api_key'] || ''
          setPublicApiKey(apiKey)
          const secret = (cfg.auth_config || {})['webhook_secret'] || (cfg.auth_config || {})['hmac_secret'] || (cfg.auth_config || {})['secret'] || ''
          setWebhookSecret(secret)
        }
      } catch (err: any) {
        notifications.show({ title: 'Failed to load integrations', message: err?.message || 'Error', color: 'red' })
      } finally {
        if (mounted) setIntegrationsLoading(false)
      }
    }
    loadIntegrations()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!activeIntegration) return
    setEndpointUrl(activeIntegration.endpoint_url || '')
    const apiKey = (activeIntegration.auth_config || {})['api_key'] || ''
    setPublicApiKey(apiKey)
    const secret = (activeIntegration.auth_config || {})['webhook_secret'] || (activeIntegration.auth_config || {})['hmac_secret'] || (activeIntegration.auth_config || {})['secret'] || ''
    setWebhookSecret(secret)
    const isWP = (activeIntegration.integration_type || '').toLowerCase() === 'wordpress'
    const dir = (activeIntegration.direction || '').toLowerCase()
    const src = (activeIntegration.source_of_truth || '').toLowerCase()
    const scen = isWP && dir === 'inbound' && src === 'external' ? 'wp_inbound'
      : isWP && dir === 'outbound' && src === 'dashboard' ? 'wp_outbound'
      : !isWP && dir === 'inbound' && src === 'external' ? 'external_inbound'
      : 'external_outbound'
    setScenario(scen)
  }, [activeIntegration?.id])

  // Edit permissions open
  function openEditPerms(u: User) {
    setEditUser(u)
    const base: UserPermissions = {}
    for (const key of sectionKeys()) {
      const raw = (u.permissions || {})[key as string]
      if (raw && typeof raw === 'object') base[key] = raw as any
      else base[key] = defaultCRUD()
    }
    setEditPerms(base)
  }

  async function saveEditPerms() {
    if (!editUser) return
    try {
      const updated = await updateUserPermissions(editUser.id, editPerms)
      setUsers((prev) => prev.map(u => (u.id === updated.id ? updated : u)))
      notifications.show({ title: 'Permissions updated', message: `Saved for ${updated.username}`, color: 'green' })
      setEditUser(null)
    } catch (err: any) {
      notifications.show({ title: 'Failed to save', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    }
  }

  async function addRoom() {
    const name = newRoomName.trim()
    if (!name) return
    try {
      const nextOrder = (rooms.reduce((max, r) => Math.max(max, r.order), 0) || 0) + 1
      const created = await createDefaultRoom({ room_name: name, order: nextOrder })
      setRooms((prev) => [...prev, created])
      setNewRoomName('')
      notifications.show({ title: 'Room added', message: name, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to add room', message: err?.message || 'Error', color: 'red' })
    }
  }

  async function removeRoom(id: number) {
    try {
      await deleteDefaultRoom(id)
      setRooms((prev) => prev.filter(r => r.id !== id))
      notifications.show({ title: 'Room removed', message: `Removed`, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to remove room', message: err?.message || 'Error', color: 'red' })
    }
  }

  function promptRemoveRoom(id: number) {
    setConfirmTitle('Confirm Deletion')
    setConfirmMessage('Delete this default room? This action cannot be undone.')
    setConfirmLabel('Delete Room')
    setConfirmAction(() => async () => { await removeRoom(id) })
    setConfirmOpen(true)
  }

  async function saveRoomOrder(sorted: DefaultRoom[]) {
    setSavingOrder(true)
    try {
      // Persist order for each room
      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i]
        await updateDefaultRoom(r.id, { order: r.order })
      }
      setRooms(sorted)
      notifications.show({ title: 'Room order saved', message: 'Order updated', color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to save order', message: err?.message || 'Error', color: 'red' })
    } finally {
      setSavingOrder(false)
    }
  }

  function openEditRoom(r: DefaultRoom) {
    setEditingRoomTarget(r)
    setEditRoomPayload({ room_name: r.room_name, order: r.order })
    setEditRoomOpen(true)
  }

  async function submitEditRoom() {
    if (!editingRoomTarget) return
    const name = editRoomPayload.room_name.trim()
    if (!name) {
      notifications.show({ title: 'Room name required', message: 'Please enter a name', color: 'red' })
      return
    }
    try {
      setEditingRoom(true)
      const updated = await updateDefaultRoom(editingRoomTarget.id, { room_name: name, order: Number(editRoomPayload.order || 0) })
      setRooms((prev) => prev.map(r => (r.id === updated.id ? updated : r)))
      setEditRoomOpen(false)
      notifications.show({ title: 'Room updated', message: updated.room_name, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to update room', message: err?.message || 'Error', color: 'red' })
    } finally {
      setEditingRoom(false)
    }
  }

  function addDefaultItem(roomName: string) {
    setNewItemRoom(roomName)
    setNewItem({ name: '', brand: '', condition: '', value: '', owner: '', notes: '' })
    setAddItemOpen(true)
  }

  function openEditItem(it: DefaultItem) {
    setEditItemTarget(it)
    setEditItemFields({
      name: it.name,
      brand: it.brand || '',
      condition: it.condition || '',
      value: typeof it.value === 'number' ? String(it.value) : '',
      owner: it.owner || '',
      notes: it.notes || '',
      order: typeof it.order === 'number' ? it.order : undefined,
    })
    setEditItemOpen(true)
  }

  async function submitEditItem() {
    if (!editItemTarget) return
    const name = editItemFields.name.trim()
    if (!name) {
      notifications.show({ title: 'Item name required', message: 'Please enter a name', color: 'red' })
      return
    }
    try {
      setUpdatingItem(true)
      const payload = {
        room_name: editItemTarget.room_name,
        name,
        brand: (editItemFields.brand || '').trim() || undefined,
        condition: (editItemFields.condition || '').trim() || undefined,
        value: editItemFields.value ? Number(editItemFields.value) : undefined,
        owner: (editItemFields.owner || '').trim() || undefined,
        notes: (editItemFields.notes || '').trim() || undefined,
        order: typeof editItemFields.order === 'number' ? editItemFields.order : editItemTarget.order,
      }
      const updated = await updateDefaultItem(editItemTarget.id, payload as any)
      setItems((prev) => prev.map(it => (it.id === updated.id ? updated : it)))
      setEditItemOpen(false)
      notifications.show({ title: 'Item updated', message: updated.name, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to update item', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    } finally {
      setUpdatingItem(false)
    }
  }

  async function submitNewItem() {
    if (!newItemRoom) return
    if (!newItem.name || !newItem.name.trim()) {
      notifications.show({ title: 'Name required', message: 'Please enter an item name.', color: 'red' })
      return
    }
    setCreatingItem(true)
    try {
      const payload: any = {
        room_name: newItemRoom,
        name: newItem.name.trim(),
        order: (groupedItems[newItemRoom]?.length || 0),
      }
      if (newItem.brand) payload.brand = newItem.brand
      if (newItem.condition) payload.condition = newItem.condition
      if (newItem.value) {
        const val = Number(newItem.value)
        if (!isNaN(val)) payload.value = val
      }
      if (newItem.owner) payload.owner = newItem.owner
      if (newItem.notes) payload.notes = newItem.notes

      const created = await createDefaultItem(payload)
      setItems((prev) => [...prev, created])
      notifications.show({ title: 'Item added', message: `${newItemRoom}: ${created.name}` , color: 'green' })
      setAddItemOpen(false)
      setNewItemRoom(null)
    } catch (err: any) {
      notifications.show({ title: 'Failed to add item', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    } finally {
      setCreatingItem(false)
    }
  }

  async function removeDefaultItem(id: number) {
    try {
      await deleteDefaultItem(id)
      setItems((prev) => prev.filter(it => it.id !== id))
      notifications.show({ title: 'Item removed', message: `Removed`, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to remove item', message: err?.message || 'Error', color: 'red' })
    }
  }

  function promptRemoveDefaultItem(id: number) {
    setConfirmTitle('Confirm Deletion')
    setConfirmMessage('Delete this default item? This action cannot be undone.')
    setConfirmLabel('Delete Item')
    setConfirmAction(() => async () => { await removeDefaultItem(id) })
    setConfirmOpen(true)
  }

  async function saveLocations() {
    if (!activeIntegration) return
    try {
      const transforms = { ...(activeIntegration.transforms || {}), location_options: locationOptions }
      const updated = await updateIntegration(activeIntegration.id, { transforms })
      setIntegrations((prev) => prev.map(i => (i.id === updated.id ? updated : i)))
      setLocCtx(locationOptions)
      notifications.show({ title: 'Locations saved', message: `${locationOptions.length} options`, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to save locations', message: err?.message || 'Error', color: 'red' })
    }
  }

  async function createUserSubmit() {
    setCreating(true)
    try {
      const user = await createUser({ ...createPayload, permissions: {} })
      setUsers((prev) => [...prev, user])
      setCreateOpen(false)
      setCreatePayload({ username: '', email: '', password: '', role: 'propertymanager' })
      notifications.show({ title: 'User created', message: user.username, color: 'green' })
    } catch (err: any) {
      notifications.show({ title: 'Failed to create user', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Stack p="md" gap="md">
      <Stack gap={2}>
        <Title order={2}>Admin Settings</Title>
        <Text c="dimmed" size="sm">Manage users, defaults, locations, and integrations.</Text>
      </Stack>

      <Card withBorder p="md" radius="md" shadow="xs">
        <Tabs value={tab} onChange={(v) => setTab(String(v))} variant="pills">
          <Tabs.List>
            <Tabs.Tab value="users">Users & Permissions</Tabs.Tab>
            <Tabs.Tab value="field_values">Field values</Tabs.Tab>
            <Tabs.Tab value="defaults">Default Inventory</Tabs.Tab>
            <Tabs.Tab value="integrations">Integrations</Tabs.Tab>
            <Tabs.Tab value="customization">Customization</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="users" pt="md">
            <UsersTab
              users={visibleUsers}
              usersLoading={usersLoading}
              onOpenCreate={() => setCreateOpen(true)}
              openEditPerms={openEditPerms}
              editUser={editUser}
              editPerms={editPerms}
              setEditPerms={setEditPerms}
              saveEditPerms={saveEditPerms}
              onCloseEdit={() => setEditUser(null)}
              createOpen={createOpen}
              createPayload={createPayload}
              setCreatePayload={setCreatePayload}
              creating={creating}
              roleOptions={(fieldValues['role'] || [])}
              createUserSubmit={createUserSubmit}
              onCloseCreate={() => setCreateOpen(false)}
              filters={userFilters}
              onFiltersChange={setUserFilters}
              onEditUser={openEditUserDetails}
              onDeactivateUser={promptDeactivateUser}
              onDeleteUser={promptDeleteUser}
              onChangeRole={changeUserRole}
              selectedIds={selectedUserIds}
              onToggleRow={toggleUserRow}
              onToggleAll={toggleAllUsers}
              onDeleteSelected={promptDeleteSelectedUsers}
              onHardDeleteSelected={promptHardDeleteSelectedUsers}
            />

            <EditUserModal
              opened={!!editUserDetails}
              payload={editUserPayload}
              setPayload={(p) => setEditUserPayload(p)}
              updating={updatingUserBase}
              roles={(fieldValues['role'] || [])}
              onSave={saveEditUserDetails}
              onClose={() => setEditUserDetails(null)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="field_values" pt="md">
              <FieldValuesTab
                fvTab={fvTab}
                setFvTab={setFvTab}
                integrations={integrations}
                activeIntegration={activeIntegration}
                selectedIntegrationId={selectedIntegrationId}
                setSelectedIntegrationId={setSelectedIntegrationId}
                saveFieldValues={saveFieldValues}
                locationOptions={locationOptions}
                contractors={contractors}
                fieldValues={fieldValues}
                newValues={newValues}
                setNewValues={setNewValues}
                setContractors={setContractors}
                openEditFieldValue={openEditFieldValue}
                moveUpFieldValue={moveUpFieldValue}
                removeFieldValue={(category, index) => {
                  setConfirmTitle('Confirm Deletion')
                  setConfirmMessage(`Remove this value from "${category}"? This action cannot be undone.`)
                  setConfirmLabel('Remove Value')
                  setConfirmAction(() => async () => { removeFieldValue(category, index) })
                  setConfirmOpen(true)
                }}
                addFieldValue={addFieldValue}
              />

            {/* Edit value modal */}
            <Modal opened={editValueOpen} onClose={() => setEditValueOpen(false)} title={`Edit ${editCategory.replace('_',' ')}`} centered>
              <Stack gap="sm">
                <TextInput label="Value" value={editText} onChange={(e) => setEditText(e.currentTarget.value)} />
                <Group justify="flex-end" mt="sm">
                  <Button variant="light" onClick={() => setEditValueOpen(false)}>Cancel</Button>
                  <Button leftSection={<IconDeviceFloppy size={16} />} onClick={submitEditFieldValue}>Save</Button>
                </Group>
              </Stack>
            </Modal>
          </Tabs.Panel>


          <Tabs.Panel value="defaults" pt="md">
            {defaultsLoading ? (
              <Loader />
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder p="md" radius="md" shadow="xs">
                  <Group justify="space-between" align="center" mb="xs">
                    <Title order={4}>Default Rooms</Title>
                    <Group gap="xs">
                      <TextInput placeholder="Room name" value={newRoomName} onChange={(e) => setNewRoomName(e.currentTarget.value)} />
                      <Button leftSection={<IconPlus size={16} />} onClick={addRoom}>Add</Button>
                    </Group>
                  </Group>
                  <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Room</Table.Th>
                        <Table.Th>Order</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rooms.sort((a,b) => a.order - b.order).map((r, idx) => (
                        <Table.Tr key={r.id}>
                          <Table.Td>{r.room_name}</Table.Td>
                          <Table.Td>{r.order}</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Edit"><ActionIcon variant="light" color="brand" onClick={() => openEditRoom(r)}><IconPencil size={16} /></ActionIcon></Tooltip>
                              <Tooltip label="Move up"><ActionIcon variant="light" onClick={() => {
                                const arr = [...rooms].sort((a,b)=>a.order-b.order)
                                if (idx > 0) {
                                  const prev = arr[idx-1]
                                  const curr = arr[idx]
                                  const prevOrder = prev.order
                                  prev.order = curr.order
                                  curr.order = prevOrder
                                  saveRoomOrder(arr)
                                }
                              }}><IconRefresh size={16} /></ActionIcon></Tooltip>
                        <Tooltip label="Remove"><ActionIcon variant="light" color="red" onClick={() => promptRemoveRoom(r.id)}><IconTrash size={16} /></ActionIcon></Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  <Group justify="flex-end" mt="sm">
                    <Button loading={savingOrder} leftSection={<IconDeviceFloppy size={16} />} onClick={() => saveRoomOrder([...rooms])}>Save Order</Button>
                  </Group>
                </Card>

                <Card withBorder p="md" radius="md" shadow="xs">
                  <Group justify="space-between" align="center" mb="xs">
                    <Title order={4}>Default Items</Title>
                    <Text c="dimmed" size="sm">Seeded into new rooms on property creation.</Text>
                  </Group>
                  {rooms.length === 0 ? (
                    <Text c="dimmed">No default rooms configured.</Text>
                  ) : (
                    <Stack gap="sm">
                      {[...rooms].sort((a, b) => a.order - b.order).map((r) => {
                        const list = groupedItems[r.room_name] || []
                        return (
                          <Card key={r.id} withBorder p="sm" radius="md">
                            <Group justify="space-between" align="center">
                              <Text fw={600}>{r.room_name}</Text>
                              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => addDefaultItem(r.room_name)}>Add Item</Button>
                            </Group>
                            {list.length === 0 ? (
                              <Text c="dimmed" size="sm" mt="xs">No items yet.</Text>
                            ) : (
                              <Table withTableBorder withColumnBorders mt="sm">
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Brand</Table.Th>
                                    <Table.Th>Condition</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {list.map((it) => (
                                    <Table.Tr key={it.id}>
                                      <Table.Td>{it.name}</Table.Td>
                                      <Table.Td>{it.brand || '-'}</Table.Td>
                                      <Table.Td>{it.condition || '-'}</Table.Td>
                                      <Table.Td>
                                        <Group gap="xs">
                                          <Tooltip label="Edit"><ActionIcon variant="light" color="brand" onClick={() => openEditItem(it)}><IconPencil size={16} /></ActionIcon></Tooltip>
                        <Tooltip label="Remove"><ActionIcon variant="light" color="red" onClick={() => promptRemoveDefaultItem(it.id)}><IconTrash size={16} /></ActionIcon></Tooltip>
                                        </Group>
                                      </Table.Td>
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            )}
                          </Card>
                        )
                      })}
                    </Stack>
                  )}
                </Card>
                <Modal opened={editRoomOpen} onClose={() => setEditRoomOpen(false)} title={`Edit Room${editingRoomTarget ? ` — ${editingRoomTarget.room_name}` : ''}`} centered>
                  <Stack gap="sm">
                    <TextInput label="Room Name" value={editRoomPayload.room_name} onChange={(e) => setEditRoomPayload((p) => ({ ...p, room_name: e.currentTarget.value }))} required />
                    <TextInput label="Order" type="number" value={String(editRoomPayload.order)} onChange={(e) => setEditRoomPayload((p) => ({ ...p, order: Number(e.currentTarget.value) }))} />
                    <Group justify="flex-end" mt="sm">
                      <Button variant="light" onClick={() => setEditRoomOpen(false)}>Cancel</Button>
                      <Button loading={editingRoom} leftSection={<IconDeviceFloppy size={16} />} onClick={submitEditRoom}>Save</Button>
                    </Group>
                  </Stack>
                </Modal>
                <Modal opened={editItemOpen} onClose={() => setEditItemOpen(false)} title={`Edit Item${editItemTarget ? ` — ${editItemTarget.name}` : ''}`} centered>
                  <Stack gap="sm">
                    <TextInput label="Name" value={editItemFields.name} onChange={(e) => setEditItemFields((p) => ({ ...p, name: e.currentTarget.value }))} required />
                    <TextInput label="Brand" value={editItemFields.brand || ''} onChange={(e) => setEditItemFields((p) => ({ ...p, brand: e.currentTarget.value }))} />
                    <Select label="Condition" placeholder="Select" value={editItemFields.condition || null} onChange={(v) => setEditItemFields((p) => ({ ...p, condition: v || '' }))} data={(fieldValues['conditions'] || []).map((v) => ({ value: v, label: v }))} />
                    <TextInput label="Value" placeholder="e.g., 1200" value={editItemFields.value || ''} onChange={(e) => setEditItemFields((p) => ({ ...p, value: e.currentTarget.value }))} />
                    <Select label="Owner" placeholder="Select" value={editItemFields.owner || null} onChange={(v) => setEditItemFields((p) => ({ ...p, owner: v || '' }))} data={(fieldValues['owner'] || []).map((v) => ({ value: v, label: v }))} />
                    <TextInput label="Notes" value={editItemFields.notes || ''} onChange={(e) => setEditItemFields((p) => ({ ...p, notes: e.currentTarget.value }))} />
                    <TextInput label="Order" type="number" value={String(typeof editItemFields.order === 'number' ? editItemFields.order : (editItemTarget?.order || 0))} onChange={(e) => setEditItemFields((p) => ({ ...p, order: Number(e.currentTarget.value) }))} />
                    <Group justify="flex-end" mt="sm">
                      <Button variant="light" onClick={() => setEditItemOpen(false)}>Cancel</Button>
                      <Button loading={updatingItem} leftSection={<IconDeviceFloppy size={16} />} onClick={submitEditItem}>Save</Button>
                    </Group>
                  </Stack>
                </Modal>
                <Modal opened={addItemOpen} onClose={() => setAddItemOpen(false)} title={`Add Item${newItemRoom ? ` to ${newItemRoom}` : ''}`} centered>
                  <Stack gap="sm">
                    <TextInput label="Name" placeholder="e.g., Queen Bed" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.currentTarget.value }))} required />
                    <TextInput label="Brand" placeholder="e.g., IKEA" value={newItem.brand || ''} onChange={(e) => setNewItem((p) => ({ ...p, brand: e.currentTarget.value }))} />
                    <Select label="Condition" placeholder="Select" value={newItem.condition || null} onChange={(v) => setNewItem((p) => ({ ...p, condition: v || '' }))} data={(fieldValues['conditions'] || []).map((v) => ({ value: v, label: v }))} />
                    <TextInput label="Value" placeholder="e.g., 1200" value={newItem.value || ''} onChange={(e) => setNewItem((p) => ({ ...p, value: e.currentTarget.value }))} />
                    <Select label="Owner" placeholder="Select" value={newItem.owner || null} onChange={(v) => setNewItem((p) => ({ ...p, owner: v || '' }))} data={(fieldValues['owner'] || []).map((v) => ({ value: v, label: v }))} />
                    <TextInput label="Notes" placeholder="Optional notes" value={newItem.notes || ''} onChange={(e) => setNewItem((p) => ({ ...p, notes: e.currentTarget.value }))} />
                    <Group justify="flex-end" mt="sm">
                      <Button variant="light" onClick={() => setAddItemOpen(false)}>Cancel</Button>
                      <Button loading={creatingItem} leftSection={<IconPlus size={16} />} onClick={submitNewItem}>Add</Button>
                    </Group>
                  </Stack>
                </Modal>
              </SimpleGrid>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="integrations" pt="md">
            {integrationsLoading ? (
              <Loader />
            ) : (
              <Stack gap="sm">
                <Text c="dimmed" size="sm">{SINGLE_SITE_MODE ? 'Single-site mode: configure the primary integration.' : 'Configure sync direction, source-of-truth, and auth.'}</Text>
                {!SINGLE_SITE_MODE && (
                  <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Direction</Table.Th>
                        <Table.Th>Source</Table.Th>
                        <Table.Th>Enabled</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {integrations.map((cfg) => (
                        <Table.Tr key={cfg.id}>
                          <Table.Td>{cfg.id}</Table.Td>
                          <Table.Td>{cfg.integration_type}</Table.Td>
                          <Table.Td>{cfg.direction}</Table.Td>
                          <Table.Td>{cfg.source_of_truth}</Table.Td>
                          <Table.Td>
                            <Badge variant={cfg.enabled ? 'filled' : 'light'} color={cfg.enabled ? 'green' : 'gray'} style={{ textTransform: 'none' }}>{cfg.enabled ? 'Enabled' : 'Disabled'}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="Toggle enabled">
                                <ActionIcon variant="light" onClick={async () => {
                                  try {
                                    const updated = await updateIntegration(cfg.id, { enabled: !cfg.enabled })
                                    setIntegrations((prev) => prev.map(i => (i.id === updated.id ? updated : i)))
                                    notifications.show({ title: 'Integration updated', message: `Enabled: ${updated.enabled}`, color: 'green' })
                                  } catch (err: any) {
                                    notifications.show({ title: 'Failed to update', message: err?.message || 'Error', color: 'red' })
                                  }
                                }}><IconWorldWww size={16} /></ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
                <Card withBorder p="md" radius="md" shadow="xs">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Title order={4}>Scenario Configuration</Title>
                        <Badge variant="light" style={{ textTransform: 'none' }}>{activeIntegration ? `Integration #${activeIntegration.id}` : 'No integration yet'}</Badge>
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        <Select label="Scenario" value={scenario} onChange={(v) => setScenario(v || 'wp_outbound')} data={[
                          { value: 'wp_inbound', label: 'Scenario 1: WordPress → Dashboard (Inbound)' },
                          { value: 'wp_outbound', label: 'Scenario 2: Dashboard → WordPress (Outbound)' },
                          { value: 'external_inbound', label: 'Scenario 3: External → Dashboard (Inbound)' },
                          { value: 'external_outbound', label: 'Scenario 4: Dashboard → Public API (Outbound)' },
                        ]} />
                        <TextInput label="Endpoint URL" placeholder="https://site.example/wp-json or external API base" value={endpointUrl} onChange={(e) => setEndpointUrl(e.currentTarget.value)} />
                      </SimpleGrid>
                      <Group justify="flex-end">
                        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={async () => {
                          try {
                            const isWP = scenario.startsWith('wp_')
                            const next: any = {
                              integration_type: isWP ? 'wordpress' : 'external',
                              direction: scenario.endsWith('inbound') ? 'inbound' : 'outbound',
                              source_of_truth: scenario.endsWith('inbound') ? 'external' : 'dashboard',
                              endpoint_url: endpointUrl || null,
                            }
                            if (scenario === 'external_outbound') {
                              next.auth_type = 'apikey'
                              next.auth_config = { api_key: publicApiKey || (activeIntegration?.auth_config || {}).api_key || '' }
                            } else if (scenario === 'external_inbound') {
                              next.auth_type = 'hmac'
                              next.auth_config = { webhook_secret: webhookSecret || (activeIntegration?.auth_config || {}).webhook_secret || '' }
                            } else {
                              next.auth_type = activeIntegration?.auth_type || null
                              next.auth_config = activeIntegration?.auth_config || null
                            }
                            if (activeIntegration) {
                              const updated = await updateIntegration(activeIntegration.id, next)
                              setIntegrations((prev) => prev.map(i => (i.id === updated.id ? updated : i)))
                              notifications.show({ title: 'Scenario saved', message: `${updated.integration_type} / ${updated.direction} / ${updated.source_of_truth}`, color: 'green' })
                            } else {
                              // Create integration on first save (single-site mode)
                              let clientId: number | null = null
                              try {
                                const clients = await listClients()
                                clientId = clients[0]?.id || null
                              } catch {}
                              if (!clientId) {
                                try {
                                  const createdClient = await createClient({ name: 'Default Client' })
                                  clientId = createdClient.id
                                } catch (err: any) {
                                  notifications.show({ title: 'Failed to create client', message: err?.message || 'Error', color: 'red' })
                                  return
                                }
                              }
                              try {
                                const created = await createIntegration({ client_id: clientId!, ...next })
                                setIntegrations((prev) => [...prev, created])
                                setSelectedIntegrationId(created.id)
                                notifications.show({ title: 'Integration created', message: `${created.integration_type} / ${created.direction}`, color: 'green' })
                              } catch (err: any) {
                                notifications.show({ title: 'Failed to create integration', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                              }
                            }
                          } catch (err: any) {
                            notifications.show({ title: 'Failed to save scenario', message: err?.message || 'Error', color: 'red' })
                          }
                        }}>Save Scenario</Button>
                      </Group>
                      <Divider my="xs" />
                      {activeIntegration && scenario === 'wp_inbound' && (
                        <Stack>
                          <Text fw={600}>Inbound Import (WordPress → Dashboard)</Text>
                          <Group gap="sm">
                            <TextInput label="External ID" placeholder="e.g. WP post ID" value={importExternalId} onChange={(e) => setImportExternalId(e.currentTarget.value)} />
                            <Button onClick={async () => {
                              const idNum = Number(importExternalId)
                              if (!idNum) return notifications.show({ title: 'Invalid External ID', message: 'Enter a numeric ID', color: 'red' })
                              try {
                                await importSingle(activeIntegration.id, idNum)
                                notifications.show({ title: 'Imported', message: `Imported external ID ${idNum}`, color: 'green' })
                              } catch (err: any) {
                                notifications.show({ title: 'Import failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                              }
                            }}>Import Single</Button>
                          </Group>
                          <Group gap="sm">
                            <TextInput label="Page" value={importPage} onChange={(e) => setImportPage(e.currentTarget.value)} />
                            <TextInput label="Per Page" value={importPerPage} onChange={(e) => setImportPerPage(e.currentTarget.value)} />
                            <Button onClick={async () => {
                              const p = Number(importPage) || 1
                              const pp = Number(importPerPage) || 20
                              try {
                                await importBulk(activeIntegration.id, p, pp)
                                notifications.show({ title: 'Bulk import started', message: `Page ${p}, per page ${pp}`, color: 'green' })
                              } catch (err: any) {
                                notifications.show({ title: 'Bulk import failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                              }
                            }}>Import Bulk</Button>
                          </Group>
                        </Stack>
                      )}
                      {activeIntegration && scenario === 'external_outbound' && (
                        <Stack>
                          <Text fw={600}>Public Feed API (Dashboard → External)</Text>
                          <Text c="dimmed" size="sm">Feed URL: <code>/public/properties</code> — requires `X-API-Key` header.</Text>
                          <TextInput label="Public API Key" placeholder="Enter API key consumers must send" value={publicApiKey} onChange={(e) => setPublicApiKey(e.currentTarget.value)} />
                          <Group justify="flex-end">
                            <Button onClick={async () => {
                              try {
                                const updated = await updateIntegration(activeIntegration.id, { auth_type: 'apikey', auth_config: { api_key: publicApiKey } })
                                setIntegrations((prev) => prev.map(i => (i.id === updated.id ? updated : i)))
                                notifications.show({ title: 'Public API Key saved', message: 'Clients must send X-API-Key', color: 'green' })
                              } catch (err: any) {
                                notifications.show({ title: 'Failed to save key', message: err?.message || 'Error', color: 'red' })
                              }
                            }}>Save API Key</Button>
                          </Group>
                        </Stack>
                      )}
                      {activeIntegration && scenario === 'external_inbound' && (
                        <Stack>
                          <Text fw={600}>Webhook Ingestion (External → Dashboard)</Text>
                          <Text c="dimmed" size="sm">Webhook URL: <code>/integrations/{activeIntegration.id}/ingest</code> — requires HMAC header.</Text>
                          <TextInput
                            label="Webhook Secret"
                            placeholder="Shared secret used to sign requests"
                            description={
                              "Add a header 'X-Signature' containing the SHA-256 HMAC of the exact request body using this secret (hex digest; 'sha256=' prefix is accepted). 'X-Hub-Signature' also works. Optionally include 'X-Timestamp' (Unix seconds) and compute the signature over 'timestamp.body' for extra replay protection."
                            }
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.currentTarget.value)}
                          />
                          <Group justify="flex-end">
                            <Button onClick={async () => {
                              try {
                                const updated = await updateIntegration(activeIntegration.id, { auth_type: 'hmac', auth_config: { webhook_secret: webhookSecret } })
                                setIntegrations((prev) => prev.map(i => (i.id === updated.id ? updated : i)))
                                notifications.show({ title: 'Webhook secret saved', message: 'HMAC verification enabled', color: 'green' })
                              } catch (err: any) {
                                notifications.show({ title: 'Failed to save secret', message: err?.message || 'Error', color: 'red' })
                              }
                            }}>Save Secret</Button>
                          </Group>
                        </Stack>
                      )}
                      {activeIntegration && scenario === 'wp_outbound' && (
                        <Stack>
                          <Text fw={600}>WordPress Outbound Sync (Dashboard → WP)</Text>
                          <Text c="dimmed" size="sm">Properties created/updated in dashboard are synced to WordPress. Configure endpoint and auth in integration settings if needed.</Text>
                        </Stack>
                      )}
                    </Stack>
                  </Card>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="customization" pt="md">
            <Stack gap="sm">
              <Text c="dimmed" size="sm">Instance-wide branding. Changes apply across the app.</Text>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder p="md" radius="md" shadow="xs">
                  <Title order={4}>Brand Identity</Title>
                  <Divider my="xs" />
                  <TextInput label="App Title" value={appTitle} onChange={(e) => setAppTitle(e.currentTarget.value)} placeholder="Nectar Dashboard" />
                  <Text fw={600}>Logo</Text>
                  <Dropzone
                    accept={[MIME_TYPES.png, MIME_TYPES.jpeg, 'image/svg+xml']}
                    maxSize={5 * 1024 ** 2}
                    onDrop={async (files) => {
                      try {
                        const urls = await uploadFiles(files)
                        if (urls[0]) setLogoUrl(urls[0])
                        notifications.show({ title: 'Logo uploaded', message: 'Using new logo', color: 'green' })
                      } catch (err: any) {
                        notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                      }
                    }}
                    onReject={() => notifications.show({ title: 'File rejected', message: 'Upload a PNG/JPG/SVG ≤5MB', color: 'red' })}
                  >
                    <Group justify="center" gap="sm" py="sm">
                      <Dropzone.Accept>
                        <IconUpload size={18} />
                      </Dropzone.Accept>
                      <Dropzone.Idle>
                        <IconPhoto size={18} />
                      </Dropzone.Idle>
                      <Dropzone.Reject>
                        <IconX size={18} />
                      </Dropzone.Reject>
                      <Text size="sm" c="dimmed">Drop logo image here, or click to select</Text>
                    </Group>
                  </Dropzone>
                  <Image src={logoUrl || '/logo.png'} h={34} fit="contain" radius="md" alt="Logo preview" mt="xs"/>

                  <Divider my="sm" />
                  <Text fw={600}>Favicon</Text>
                  <Dropzone
                    accept={[MIME_TYPES.png, 'image/x-icon', 'image/svg+xml']}
                    maxSize={2 * 1024 ** 2}
                    onDrop={async (files) => {
                      try {
                        const urls = await uploadFiles(files)
                        if (urls[0]) setFaviconUrl(urls[0])
                        notifications.show({ title: 'Favicon uploaded', message: 'Using new favicon', color: 'green' })
                      } catch (err: any) {
                        notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                      }
                    }}
                    onReject={() => notifications.show({ title: 'File rejected', message: 'Upload a PNG/ICO/SVG ≤2MB', color: 'red' })}
                  >
                    <Group justify="center" gap="sm" py="sm">
                      <Dropzone.Accept>
                        <IconUpload size={18} />
                      </Dropzone.Accept>
                      <Dropzone.Idle>
                        <IconPhoto size={18} />
                      </Dropzone.Idle>
                      <Dropzone.Reject>
                        <IconX size={18} />
                      </Dropzone.Reject>
                      <Text size="sm" c="dimmed">Drop favicon here, or click to select</Text>
                    </Group>
                  </Dropzone>
                  <Group gap="xs" align="center" mt="xs">
                    <Text size="sm" c="dimmed">Favicon preview</Text>
                    <Image src={faviconUrl || '/favicon.ico'} h={24} w={24} radius="xs" fit="contain" alt="Favicon preview"/>
                  </Group>
                  <Divider my="sm" />
                  <Switch label="Default Dark Mode" checked={darkModeDefault} onChange={(e) => setDarkModeDefault(e.currentTarget.checked)} mt="md" />
                </Card>

                <Card withBorder p="md" radius="md" shadow="xs">
                  <Title order={4}>Theme</Title>
                  <Divider my="xs" />
                  <Select label="Font Family" data={fontOptions} value={Object.keys(fontStacks).find((k) => (fontFamily || '').toLowerCase().includes(k.toLowerCase())) || 'Asap'} onChange={(v) => setFontFamily(v ? fontStacks[v] : fontStacks['Asap'])} />
                  <ColorInput label="Primary Color" value={primaryColorHex} onChange={setPrimaryColorHex} format="hex" withPreview />
                  <TextInput label="Brand Palette (derived)" value={paletteStr} readOnly description="Automatically generated from the primary color; saved on update." />
                  <BrandPalettePreview palette={deriveBrandPalette(primaryColorHex)} />
                  <Divider my="sm" />
                  <Group grow>
                    <ColorInput label="Button Background" value={buttonBgHex} onChange={setButtonBgHex} format="hex" withPreview />
                    <ColorInput label="Button Text" value={buttonTextHex} onChange={setButtonTextHex} format="hex" withPreview />
                  </Group>
                  <Group grow mt="xs">
                    <ColorInput label="Badge Background" value={badgeBgHex} onChange={setBadgeBgHex} format="hex" withPreview />
                    <ColorInput label="Badge Text" value={badgeTextHex} onChange={setBadgeTextHex} format="hex" withPreview />
                  </Group>
                  <Group grow mt="xs">
                    <ColorInput label="Icon Background" value={iconBgHex} onChange={setIconBgHex} format="hex" withPreview />
                    <ColorInput label="Icon Color" value={iconColorHex} onChange={setIconColorHex} format="hex" withPreview />
                  </Group>
                  <Group mt="md" gap="sm">
                    <Button style={{ backgroundColor: buttonBgHex, color: buttonTextHex }}>Preview Button</Button>
                    <Badge style={{ backgroundColor: badgeBgHex, color: badgeTextHex, border: 'none', textTransform: 'none' }}>Preview Badge</Badge>
                    <ThemeIcon size={28} radius="md" style={{ backgroundColor: iconBgHex, color: iconColorHex }}>
                      <IconWorldWww size={16} />
                    </ThemeIcon>
                  </Group>
                  <Group mt="xs">
                    <Text size="sm" c="dimmed" style={{ fontFamily }}>Sample text preview: The quick brown fox jumps over the lazy dog.</Text>
                  </Group>
                </Card>
              </SimpleGrid>

              <Group justify="flex-end">
                <Button loading={updating} leftSection={<IconDeviceFloppy size={16} />} onClick={async () => {
                  try {
                    const palette = deriveBrandPalette(primaryColorHex)
                    const payload: any = {
                      app_title: appTitle,
                      logo_url: logoUrl || null,
                      favicon_url: faviconUrl || null,
                      font_family: fontFamily,
                      primary_color: primaryColorHex,
                      brand_palette: palette,
                      dark_mode_default: darkModeDefault,
                      theme_overrides: {
                        button_bg_hex: buttonBgHex,
                        button_text_hex: buttonTextHex,
                        badge_bg_hex: badgeBgHex,
                        badge_text_hex: badgeTextHex,
                        icon_bg_hex: iconBgHex,
                        icon_color_hex: iconColorHex,
                      },
                    }
                    await updateBranding(payload)
                    notifications.show({ title: 'Branding saved', message: 'Customization updated', color: 'green' })
                  } catch (err: any) {
                    notifications.show({ title: 'Failed to save', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                  }
                }}>Save</Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>
    {/* Global irreversible confirmation modal */}
    <ConfirmModal
      opened={confirmOpen}
      title={confirmTitle}
      message={confirmMessage}
      confirmLabel={confirmLabel}
      onConfirm={() => {
        if (!confirmAction) return
        ;(async () => {
          setConfirmLoading(true)
          try { await confirmAction() } finally { setConfirmLoading(false); setConfirmOpen(false) }
        })()
      }}
      onCancel={() => setConfirmOpen(false)}
      loading={confirmLoading}
    />
    </Stack>
  )
}