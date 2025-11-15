import { useEffect, useMemo, useState } from 'react'
import { Modal, Stack, Group, TextInput, Select, Divider, Button, Text, Badge, Avatar, Paper, Tooltip, SegmentedControl } from '@mantine/core'
import { IconUser, IconMail, IconPhone, IconBuilding } from '@tabler/icons-react'
import { useFieldValues } from '../context/FieldValuesProvider'
import { listUsersByRole, type User } from '../api/users'

type PropertyOption = { id: number; title: string; address?: string | null }

type NewTenant = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  employmentStatus?: string | null
  status: 'Verified' | 'Pending' | 'Unknown'
  propertyId: number
  propertyTitle: string
  propertyAddress?: string | null
  role?: string
}

type Props = {
  opened: boolean
  properties: PropertyOption[]
  onClose: () => void
  onCreate: (tenant: NewTenant) => void
  // When provided, the modal operates in a property-context and hides the property select
  contextProperty?: PropertyOption
}

export default function CreateTenantModal({ opened, properties, onClose, onCreate, contextProperty }: Props) {
  const { getOptions } = useFieldValues()
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState<string | null>(null)
  const [status, setStatus] = useState<'Verified' | 'Pending' | 'Unknown'>('Pending')
  const [propertyIdStr, setPropertyIdStr] = useState<string | null>(null)
  const [existingTenants, setExistingTenants] = useState<User[]>([])
  const [existingTenantIdStr, setExistingTenantIdStr] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [existingError, setExistingError] = useState<string | null>(null)
  const [noExistingTenants, setNoExistingTenants] = useState(false)

  useEffect(() => {
    if (opened) {
      setMode('new')
      setName('')
      setEmail('')
      setPhone('')
      setEmploymentStatus(null)
      setStatus('Pending')
      setPropertyIdStr(contextProperty ? String(contextProperty.id) : null)
      setExistingTenantIdStr(null)
      setExistingError(null)
      // Prefetch existing tenants when modal opens
      setLoadingExisting(true)
      listUsersByRole('tenant')
        .then((users) => {
          setExistingTenants(users)
          setNoExistingTenants(Array.isArray(users) && users.length === 0)
        })
        .catch((err: any) => {
          const status = err?.response?.status
          if (status === 404) {
            // Gracefully treat 404 as "no tenants listed" rather than an error
            setExistingTenants([])
            setNoExistingTenants(true)
            setExistingError(null)
          } else {
            setExistingError('Failed to load tenants')
            setNoExistingTenants(false)
          }
        })
        .finally(() => setLoadingExisting(false))
    }
  }, [opened])

  const selectedProperty = useMemo(() => {
    return contextProperty ?? properties.find((p) => String(p.id) === String(propertyIdStr ?? ''))
  }, [contextProperty, properties, propertyIdStr])
  const canCreate = mode === 'existing'
    ? (!!selectedProperty && !!existingTenantIdStr)
    : (name.trim().length > 0 && !!selectedProperty)

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconUser size={18} /></Avatar>
          <Text fw={700}>Add Tenant</Text>
        </Group>
      }
      radius="md"
      padding="md"
      zIndex={1000}
      overlayProps={{ opacity: 0.2, blur: 3 }}
      styles={{
        header: { borderBottom: 'none' },
        title: { fontWeight: 700 },
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }
      }}
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group>
              {status && (
                <Badge variant="light" color={status === 'Verified' ? 'green' : 'gray'}>{status}</Badge>
              )}
              {employmentStatus && (
                <Badge variant="light" color="brand">{employmentStatus}</Badge>
              )}
            </Group>
            {selectedProperty && (
              <Group gap={6} align="center">
                <IconBuilding size={16} />
                <Text c="dimmed" size="sm">{selectedProperty.title}</Text>
              </Group>
            )}
          </Group>

          <Divider my="xs" />

          {/* Property on its own dedicated row, first field */}
          {!contextProperty ? (
            <Select
              label="Property"
              placeholder="Select property"
              data={properties.map((p) => ({ value: String(p.id), label: p.address ? `${p.title} — ${p.address}` : p.title }))}
              value={propertyIdStr}
              onChange={setPropertyIdStr}
              searchable
              clearable
              leftSection={<IconBuilding size={16} />}
            />
          ) : (
            <Stack gap={4}>
              <Text size="sm" c="dimmed">Property</Text>
              <Group gap={6}>
                <Avatar size={24} radius="xl" color="brand"><IconBuilding size={14} /></Avatar>
                <Badge variant="light" style={{ backgroundColor: '#fac13c', color: '#000000', fontWeight: 500 }}>
                  {contextProperty.address ? `${contextProperty.title} — ${contextProperty.address}` : contextProperty.title}
                </Badge>
              </Group>
            </Stack>
          )}

          {/* Toggle between New vs Existing tenant */}
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode((v as 'new' | 'existing') || 'new')}
            data={[{ value: 'new', label: 'New Tenant' }, { value: 'existing', label: 'Existing Tenant' }]}
          />

          {mode === 'existing' ? (
            <Stack gap="sm">
              <Select
                label="Existing Tenant"
                placeholder={loadingExisting ? 'Loading tenants…' : (noExistingTenants ? 'There are currently no listed tenants' : 'Select tenant user')}
                data={existingTenants.map((u) => ({ value: String(u.id), label: u.email ? `${u.username} — ${u.email}` : u.username }))}
                value={existingTenantIdStr}
                onChange={setExistingTenantIdStr}
                searchable
                clearable
                leftSection={<IconUser size={16} />}
                disabled={loadingExisting || noExistingTenants}
                error={existingError || undefined}
                nothingFoundMessage="There are currently no listed tenants"
              />
              {noExistingTenants && (
                <Text size="sm" c="dimmed">There are currently no listed tenants.</Text>
              )}
              {existingError && !noExistingTenants && (
                <Text size="sm" c="red">{existingError}</Text>
              )}
              <Tooltip label="Assign an existing tenant user to the selected property.">
                <Text size="xs" c="dimmed">This links the tenant in property ACF.</Text>
              </Tooltip>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Group grow>
                <TextInput
                  label="Full Name"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  leftSection={<IconUser size={16} />}
                />
                <Select
                  label="Employment Status"
                  placeholder="Select"
                  data={getOptions('employment_status')}
                  value={employmentStatus}
                  onChange={setEmploymentStatus}
                  allowDeselect
                  clearable
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Email"
                  placeholder="e.g. john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  leftSection={<IconMail size={16} />}
                />
                <TextInput
                  label="Phone"
                  placeholder="e.g. +44 7700 000000"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  leftSection={<IconPhone size={16} />}
                />
              </Group>

              <Group grow>
                <Select
                  label="Status"
                  placeholder="Select"
                  data={[{ value: 'Verified', label: 'Verified' }, { value: 'Pending', label: 'Pending' }, { value: 'Unknown', label: 'Unknown' }]}
                  value={status}
                  onChange={(v) => setStatus(((v as any) || 'Pending') as 'Verified' | 'Pending' | 'Unknown')}
                  allowDeselect={false}
                />
              </Group>

              <Tooltip label="Creating a tenant updates the current view and can link backend.">
                <Text size="xs" c="dimmed">API linking occurs on submit if configured.</Text>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </Paper>

      <Group
        justify="space-between"
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--mantine-color-body)',
          borderTop: '1px solid var(--mantine-color-default-border)',
          padding: '8px',
          zIndex: 10,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}
      >
        <Button variant="light" onClick={onClose}>Close</Button>
        <Button
          onClick={() => {
            if (!canCreate || !selectedProperty) return
            if (mode === 'existing') {
              const selectedUser = existingTenants.find(u => String(u.id) === String(existingTenantIdStr || ''))
              const displayName = selectedUser ? (selectedUser.username || (selectedUser.email?.split('@')[0] || 'Tenant')) : 'Tenant'
              const payload: any = {
                id: `existing:${Date.now()}`,
                name: displayName,
                email: selectedUser?.email ?? null,
                phone: null,
                employmentStatus: null,
                status: (selectedUser?.email ? 'Pending' : 'Unknown') as 'Pending' | 'Unknown',
                propertyId: selectedProperty.id,
                propertyTitle: selectedProperty.title,
                propertyAddress: selectedProperty.address ?? null,
                role: 'tenant',
                mode: 'existing',
                tenantUserId: selectedUser?.id ?? null,
              }
              onCreate(payload)
            } else {
              const payload: any = {
                id: `new:${Date.now()}`,
                name: name.trim(),
                email: email.trim() ? email.trim() : null,
                phone: phone.trim() ? phone.trim() : null,
                employmentStatus: employmentStatus ?? null,
                status,
                propertyId: selectedProperty.id,
                propertyTitle: selectedProperty.title,
                propertyAddress: selectedProperty.address ?? null,
                role: 'tenant',
                mode: 'new',
              }
              onCreate(payload)
            }
          }}
          disabled={!canCreate}
        >
          {mode === 'existing' ? 'Assign Tenant' : 'Add Tenant'}
        </Button>
      </Group>
    </Modal>
  )
}