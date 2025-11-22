import { Title, Text, Card, Stack, Group, TextInput, Badge, ActionIcon, Tooltip, Avatar, ScrollArea, SegmentedControl, Select, Accordion, Button } from '@mantine/core'
import { motion } from 'framer-motion'
import { variants } from '../utils/motion'
import { useQuery } from '@tanstack/react-query'
import { listProperties, type Property, updateProperty } from '../api/properties'
import { IconMail, IconPhone, IconEdit, IconUser, IconSearch, IconExternalLink, IconDownload } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import EditTenantModal from '../components/EditTenantModal'
import CreateTenantModal from '../components/CreateTenantModal'
import { notifications } from '@mantine/notifications'
import { createUser, getMe } from '../api/users'

type TenantPreview = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  employmentStatus?: string | null
  status: 'Verified' | 'Pending' | 'Unknown'
  propertyId: number
  propertyTitle: string
  propertyAddress?: string | null
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ''
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

function extractTenantsFromProperty(p: Property): TenantPreview[] {
  const acf: any = p.acf ?? null
  const tg = acf?.tenants_group
  const list: any[] = Array.isArray(tg) ? tg : (tg && typeof tg === 'object' ? [tg] : [])
  return list.map((t, idx) => {
    const name = (t?.full_name ?? t?.name ?? [t?.first_name, t?.last_name].filter(Boolean).join(' ')).trim() || '—'
    const email = t?.email ?? null
    const phone = t?.phone ?? null
    const employmentStatus = t?.employment_status ?? null
    const verified = !!(t?.proof_of_id || t?.right_to_rent)
    const status: TenantPreview['status'] = verified ? 'Verified' : (email || phone ? 'Pending' : 'Unknown')
    return {
      id: `${p.id}:${idx}`,
      name,
      email,
      phone,
      employmentStatus,
      status,
      propertyId: p.id,
      propertyTitle: p.title,
      propertyAddress: p.address ?? null,
    }
  })
}

const MOCK_TENANTS: TenantPreview[] = [
  { id: '101:0', name: 'John Doe', email: 'john.doe@example.com', phone: '+44 7700 111222', employmentStatus: 'Full-time', status: 'Verified', propertyId: 101, propertyTitle: 'Oak Street Residence', propertyAddress: '12 Oak Street, London' },
  { id: '102:0', name: 'Emily Clark', email: 'emily.clark@example.com', phone: '+44 7700 333444', employmentStatus: 'Part-time', status: 'Pending', propertyId: 102, propertyTitle: 'Maple Court Flats', propertyAddress: '5 Maple Court, Manchester' },
  { id: '103:0', name: 'Mohammed Ali', email: null, phone: '+44 7700 555666', employmentStatus: 'Contractor', status: 'Unknown', propertyId: 103, propertyTitle: 'River View Apartments', propertyAddress: '22 Riverside, Leeds' },
  { id: '104:0', name: 'Sarah Green', email: 'sarah.green@example.com', phone: null, employmentStatus: 'Full-time', status: 'Verified', propertyId: 104, propertyTitle: 'Beech House', propertyAddress: '3 Beech Lane, Bristol' },
  { id: '105:0', name: 'Daniel Wong', email: 'daniel.wong@example.com', phone: '+44 7700 777888', employmentStatus: 'Self-employed', status: 'Pending', propertyId: 105, propertyTitle: 'Cedar Gardens', propertyAddress: '48 Cedar Gardens, London' },
  { id: '101:1', name: 'Jane Doe', email: 'jane.doe@example.com', phone: '+44 7700 999000', employmentStatus: 'Full-time', status: 'Verified', propertyId: 101, propertyTitle: 'Oak Street Residence', propertyAddress: '12 Oak Street, London' },
]

export default function TenantsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [view, setView] = useState<'flat' | 'grouped'>('flat')
  const [editOpen, setEditOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantPreview | null>(null)
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, Partial<TenantPreview>>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createdTenants, setCreatedTenants] = useState<TenantPreview[]>([])
  const { data, isLoading, isError } = useQuery<Property[], Error>({
    queryKey: ['tenants-properties'],
    queryFn: () => listProperties({ page: 1, pageSize: 100, sortBy: 'updated', order: 'desc' }),
    retry: 0,
  })

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const isAdmin = String(me?.role || '').toLowerCase().includes('admin')
  const perms: any = (me as any)?.permissions ?? {}
  const canCreateTenants = isAdmin || !!perms?.tenants_group?.create
  const canEditTenants = isAdmin || !!perms?.tenants_group?.update
  const canCreateUsers = isAdmin || !!perms?.users?.create

  const items = data ?? []
  const extracted = items.flatMap(extractTenantsFromProperty)
  const baseTenants = (isError || extracted.length === 0) ? MOCK_TENANTS : extracted
  const allTenantsBase = [...baseTenants, ...createdTenants]
  const propertyPool = items.length > 0
    ? items.map(p => ({ id: p.id, title: p.title, address: p.address }))
    : Array.from(new Map(baseTenants.map(t => [t.propertyId, { id: t.propertyId, title: t.propertyTitle, address: t.propertyAddress ?? null }])).values())
  const searchTerm = search.trim().toLowerCase()
  const filtered = allTenantsBase.filter((t) => {
    if (!searchTerm) return true
    return (
      t.name.toLowerCase().includes(searchTerm) ||
      t.propertyTitle.toLowerCase().includes(searchTerm) ||
      (t.propertyAddress ?? '').toLowerCase().includes(searchTerm)
    )
  })

  const statusFiltered = filtered.filter((t) => {
    if (statusFilter === 'all') return true
    return t.status.toLowerCase() === statusFilter
  })

  const sorted = [...statusFiltered].sort((a, b) => {
    const av = sortBy === 'name' ? a.name.toLowerCase() : a.propertyTitle.toLowerCase()
    const bv = sortBy === 'name' ? b.name.toLowerCase() : b.propertyTitle.toLowerCase()
    if (av < bv) return order === 'asc' ? -1 : 1
    if (av > bv) return order === 'asc' ? 1 : -1
    return 0
  })

  const tenants = sorted.map((t) => ({ ...t, ...(tenantOverrides[t.id] || {}) }))

  function downloadCsv(rows: TenantPreview[]) {
    const header = ['Name','Email','Phone','Employment','Status','Property','Address']
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v)
      const needsQuotes = s.includes(',') || s.includes('\n') || s.includes('"')
      const q = '"' + s.replace(/"/g, '""') + '"'
      return needsQuotes ? q : s
    }
    const lines = [header.join(',')].concat(rows.map(r => [r.name, r.email ?? '', r.phone ?? '', r.employmentStatus ?? '', r.status, r.propertyTitle, r.propertyAddress ?? ''].map(escape).join(',')))
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tenants.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Title order={2}>Tenants</Title>
          <Text c="dimmed" size="sm">Directory with quick contact and property context.</Text>
        </Stack>
        <Group gap="sm">
          <Badge variant="light" color="gray">Total {allTenantsBase.length}</Badge>
          <Badge style={{ backgroundColor: '#fac13c', color: '#000000', fontWeight: 400 }}>Verified {allTenantsBase.filter(t => t.status === 'Verified').length}</Badge>
          {canCreateTenants && (
            <Button id="open-create-tenant-main" size="xs" variant="light" leftSection={<IconUser size={16} />} onClick={() => setCreateOpen(true)}>Add Tenant</Button>
          )}
          <Tooltip label="Download CSV">
            <ActionIcon variant="light" aria-label="Download CSV" onClick={() => downloadCsv(tenants)}>
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Card withBorder p="md" radius="md" shadow="xs">
        <Group align="end" gap="md" mb="md" wrap="wrap">
          <TextInput
            label="Search"
            placeholder="Search by name or property"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ maxWidth: 360 }}
          />
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All' },
              { value: 'verified', label: 'Verified' },
              { value: 'pending', label: 'Pending' },
              { value: 'unknown', label: 'Unknown' },
            ]}

          />
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(v) => setSortBy(v || 'name')}
            data={[{ value: 'name', label: 'Name' }, { value: 'property', label: 'Property' }]}
            style={{ width: 160 }}
          />
          <Select
            label="Order"
            value={order}
            onChange={(v) => setOrder(((v as any) || 'asc') as 'asc' | 'desc')}
            data={[{ value: 'asc', label: 'Asc' }, { value: 'desc', label: 'Desc' }]}
            style={{ width: 140 }}
          />
          <SegmentedControl
            value={view}
            onChange={(v) => setView(v as 'flat' | 'grouped')}
            data={[{ value: 'flat', label: 'Flat' }, { value: 'grouped', label: 'Grouped' }]}

          />
        </Group>

        {isError ? (
          <Text c="red">Failed to load tenants.</Text>
        ) : isLoading && baseTenants === extracted ? (
          <Group><IconUser size={18} /><Text c="dimmed">Loading tenants…</Text></Group>
        ) : tenants.length === 0 ? (
          <Text c="dimmed">No tenants found.</Text>
        ) : view === 'flat' ? (
          <ScrollArea h={480} type="hover" scrollbarSize={8} offsetScrollbars>
            <Stack gap="sm">
              {tenants.map((t) => (
                <motion.div key={t.id} {...variants.hoverLift}>
                <Card withBorder radius="md" shadow="xs" p="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                  <Group justify="space-between" align="center">
                    {/* Left side: avatar, name, property, status */}
                    <Group gap="sm" align="center">
                      <Avatar radius="xl" color="brand" variant="light"> {initialsFromName(t.name)} </Avatar>
                      <Stack gap={2}>
                        <Group gap={6} align="center">
                          <Text fw={600}>{t.name}</Text>
                          {t.employmentStatus ? (
                            <Badge size="sm" style={{ backgroundColor: '#fac13c', color: '#000000', fontWeight: 400 }}>{t.employmentStatus}</Badge>
                          ) : null}
                        </Group>
                        <Group gap={8} align="center">
                          <Text size="sm" c="dimmed">{t.propertyTitle}</Text>
                          {t.propertyAddress ? <Text size="xs" c="dimmed">· {t.propertyAddress}</Text> : null}
                        </Group>
                        <Badge size="sm" variant={t.status === 'Verified' ? 'filled' : 'light'} color={t.status === 'Verified' ? 'green' : 'gray'}>{t.status}</Badge>
                      </Stack>
                    </Group>

                    {/* Right side: actions */}
                    <Group gap={6} align="center">
                      <Tooltip label={t.email ? t.email : 'No email'}>
                        <ActionIcon component={t.email ? 'a' : 'button'} href={t.email ? `mailto:${t.email}` : undefined} disabled={!t.email} size="md" radius="md" variant="light" color="brand" aria-label="Email tenant">
                          <IconMail size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t.phone ? t.phone : 'No phone'}>
                        <ActionIcon component={t.phone ? 'a' : 'button'} href={t.phone ? `tel:${t.phone}` : undefined} disabled={!t.phone} size="md" radius="md" variant="light" color="brand" aria-label="Call tenant">
                          <IconPhone size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Open property">
                        <ActionIcon component={Link} to={`/properties/${t.propertyId}`} size="md" radius="md" variant="light" color="brand" aria-label="Open property">
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {canEditTenants && (
                        <Tooltip label="Edit tenant">
                          <ActionIcon size="md" radius="md" variant="subtle" color="gray" aria-label="Edit tenant" onClick={() => { setEditingTenant(t); setEditOpen(true) }}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                </Card>
                </motion.div>
              ))}
            </Stack>
          </ScrollArea>
        ) : (
          <Accordion chevronPosition="right" variant="separated">
            {Object.entries(tenants.reduce<Record<string, TenantPreview[]>>((acc, t) => {
              const key = `${t.propertyTitle}|||${t.propertyAddress ?? ''}`
              acc[key] = acc[key] || []
              acc[key].push(t)
              return acc
            }, {})).map(([key, list]) => {
              const [title, addr] = key.split('|||')
              return (
                <Accordion.Item key={key} value={key}>
                  <Accordion.Control>
                    <Group gap={6} align="center">
                      <Text fw={600}>{title}</Text>
                      {addr ? <Text size="xs" c="dimmed">· {addr}</Text> : null}
                      <Badge variant="light" color="gray">{list.length} tenant(s)</Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {list.map((t) => (
                <motion.div key={t.id} {...variants.hoverLift}>
                <Card withBorder radius="md" shadow="xs" p="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                  <Group justify="space-between" align="center">
                            <Group gap="sm" align="center">
                              <Avatar radius="xl" color="brand" variant="light"> {initialsFromName(t.name)} </Avatar>
                              <Stack gap={2}>
                                <Group gap={6} align="center">
                                  <Text fw={600}>{t.name}</Text>
                                  {t.employmentStatus ? (
                                    <Badge size="sm" style={{ backgroundColor: '#fac13c', color: '#000000', fontWeight: 400 }}>{t.employmentStatus}</Badge>
                                  ) : null}
                                </Group>
                                <Badge size="sm" variant={t.status === 'Verified' ? 'filled' : 'light'} color={t.status === 'Verified' ? 'green' : 'gray'}>{t.status}</Badge>
                              </Stack>
                            </Group>
                            <Group gap={6} align="center">
                              <Tooltip label={t.email ? t.email : 'No email'}>
                                <ActionIcon component={t.email ? 'a' : 'button'} href={t.email ? `mailto:${t.email}` : undefined} disabled={!t.email} size="md" radius="md" variant="light" color="brand" aria-label="Email tenant">
                                  <IconMail size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t.phone ? t.phone : 'No phone'}>
                                <ActionIcon component={t.phone ? 'a' : 'button'} href={t.phone ? `tel:${t.phone}` : undefined} disabled={!t.phone} size="md" radius="md" variant="light" color="brand" aria-label="Call tenant">
                                  <IconPhone size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Open property">
                                <ActionIcon component={Link} to={`/properties/${t.propertyId}`} size="md" radius="md" variant="light" color="brand" aria-label="Open property">
                                  <IconExternalLink size={16} />
                                </ActionIcon>
                              </Tooltip>
                              {canEditTenants && (
                                <Tooltip label="Edit tenant">
                                  <ActionIcon size="md" radius="md" variant="subtle" color="gray" aria-label="Edit tenant" onClick={() => { setEditingTenant(t); setEditOpen(true) }}>
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Group>
                        </Card>
                        </motion.div>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )
            })}
          </Accordion>
        )}
      </Card>
      {/* Edit Tenant Modal */}
      <EditTenantModal
        opened={editOpen}
        tenant={editingTenant ? {
          id: editingTenant.id,
          name: editingTenant.name,
          email: editingTenant.email ?? null,
          phone: editingTenant.phone ?? null,
          employmentStatus: editingTenant.employmentStatus ?? null,
          status: editingTenant.status,
          propertyTitle: editingTenant.propertyTitle,
          propertyAddress: editingTenant.propertyAddress ?? null,
        } : null}
        onClose={() => setEditOpen(false)}
        onSave={(u) => {
          setTenantOverrides((prev) => ({
            ...prev,
            [u.id]: {
              name: u.name,
              email: u.email ?? null,
              phone: u.phone ?? null,
              employmentStatus: u.employmentStatus ?? null,
              status: u.status,
            },
          }))
          notifications.show({ title: 'Tenant updated', message: 'Changes saved for this session.', color: 'green' })
          setEditOpen(false)
        }}
      />
      {/* Create Tenant Modal */}
      <CreateTenantModal
        opened={createOpen}
        properties={propertyPool}
        onClose={() => setCreateOpen(false)}
        onCreate={async (nt) => {
          try {
            // Always reflect in local session list
            setCreatedTenants((prev) => [...prev, nt as any])

            if ((nt as any).mode === 'existing') {
              const t = nt as any as { mode: 'existing'; name: string; email?: string | null; propertyId: number; propertyTitle: string; tenantUserId?: number | null }
              await updateProperty(t.propertyId, { acf: { tenants_group: { full_name: t.name, email: t.email ?? null } } })
              notifications.show({ title: 'Tenant assigned', message: `Assigned existing tenant to ${t.propertyTitle}.`, color: 'green' })
            } else {
              const t = nt as any as { mode: 'new'; name: string; email?: string | null; phone?: string | null; employmentStatus?: string | null; status: 'Verified' | 'Pending' | 'Unknown'; propertyId: number; propertyTitle: string }
              // Create tenant user if email provided and permitted
              if (t.email) {
                if (canCreateUsers) {
                  try {
                    const base = t.email.split('@')[0] || t.name.trim().toLowerCase().replace(/\s+/g, '.')
                    const username = `${base}`
                    const tempPassword = `tenant-${Math.random().toString(36).slice(2, 10)}`
                    await createUser({ username, email: t.email, password: tempPassword, role: 'tenant' })
                    notifications.show({ title: 'User created', message: `Tenant user '${username}' created.`, color: 'green' })
                  } catch (err: any) {
                    notifications.show({ title: 'User creation failed', message: 'Could not create tenant user. You can create one manually in Settings.', color: 'red' })
                  }
                } else {
                  notifications.show({ title: 'Insufficient permission', message: 'users.create permission is required to create tenant accounts. Tenant details will still be linked to the property.', color: 'yellow' })
                }
              }
              // Link tenant details to property
              await updateProperty(t.propertyId, { acf: { tenants_group: { full_name: t.name, email: t.email ?? null, phone: t.phone ?? null, employment_status: t.employmentStatus ?? null } } })
              notifications.show({ title: 'Tenant linked', message: `Linked tenant to ${t.propertyTitle}.`, color: 'green' })
            }
          } catch (err: any) {
            notifications.show({ title: 'Tenant update failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
          } finally {
            setCreateOpen(false)
          }
        }}
      />
    </Stack>
  )
}