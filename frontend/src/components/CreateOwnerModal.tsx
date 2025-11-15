import { useEffect, useMemo, useState } from 'react'
import { Modal, Stack, Group, TextInput, Select, Divider, Button, Text, Badge, Avatar, Paper, Tooltip, SegmentedControl, Skeleton } from '@mantine/core'
import { IconUser, IconMail, IconPhone, IconBuilding } from '@tabler/icons-react'
import { listUsersByRole, type User } from '../api/users'

type PropertyOption = { id: number; title: string; address?: string | null }

type ExistingOwnerAssignment = {
  mode: 'existing'
  propertyId: number
  propertyTitle: string
  propertyAddress?: string | null
  ownerId: number
  ownerName?: string
  ownerEmail?: string | null
}

type NewOwnerCreate = {
  mode: 'new'
  name: string
  email: string
  phone?: string | null
  propertyId: number
  propertyTitle: string
  propertyAddress?: string | null
  role: 'propertyowner'
}

type Props = {
  opened: boolean
  properties: PropertyOption[]
  contextProperty?: PropertyOption
  onClose: () => void
  onCreate: (owner: ExistingOwnerAssignment | NewOwnerCreate) => void
}

export default function CreateOwnerModal({ opened, properties, contextProperty, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [propertyIdStr, setPropertyIdStr] = useState<string | null>(null)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [owners, setOwners] = useState<User[]>([])
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownersError, setOwnersError] = useState<string | null>(null)
  const [ownerIdStr, setOwnerIdStr] = useState<string | null>(null)

  useEffect(() => {
    if (opened) {
      setName('')
      setEmail('')
      setPhone('')
      setPropertyIdStr(contextProperty ? String(contextProperty.id) : null)
      setMode('existing')
      setOwnerIdStr(null)
      setOwnersError(null)
      // Attempt to fetch existing owners when modal opens
      setOwnersLoading(true)
      listUsersByRole('propertyowner')
        .then((data) => {
          setOwners(data || [])
          setOwnersError(null)
        })
        .catch((err: any) => {
          const msg = err?.response?.data?.detail || err?.message || 'Unable to load owners'
          setOwnersError(String(msg))
          setOwners([])
        })
        .finally(() => setOwnersLoading(false))
    }
  }, [opened, contextProperty])

  const selectedProperty = useMemo(() => {
    if (contextProperty) return contextProperty
    return properties.find((p) => String(p.id) === String(propertyIdStr ?? ''))
  }, [properties, propertyIdStr, contextProperty])
  const canCreateNew = name.trim().length > 0 && !!selectedProperty && /.+@.+\..+/.test(email.trim())
  const canAssignExisting = !!selectedProperty && !!ownerIdStr

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconUser size={18} /></Avatar>
          <Text fw={700}>Add Owner</Text>
        </Group>
      }
      radius="md"
      padding="md"
      overlayProps={{ opacity: 0.2, blur: 2 }}
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
            <Badge variant="light" color="brand">Property Owner</Badge>
            {selectedProperty && (
              <Group gap={6} align="center">
                <IconBuilding size={16} />
                <Text c="dimmed" size="sm">{selectedProperty.title}</Text>
              </Group>
            )}
          </Group>

          <Divider my="xs" />

          {/* Property on its own dedicated row, first field; hidden in property-context */}
          {!contextProperty && (
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
          )}

          {/* Existing/New owner toggle */}
          <SegmentedControl
            value={mode}
            onChange={(val) => setMode(val as 'existing' | 'new')}
            data={[
              { label: 'Existing Owner', value: 'existing' },
              { label: 'New Owner', value: 'new' },
            ]}
            fullWidth
          />

          {mode === 'existing' ? (
            <Stack gap="sm">
              {ownersLoading ? (
                <Skeleton height={36} radius="md" />
              ) : (
                <Select
                  label="Select Existing Owner"
                  placeholder={ownersError ? ownersError : 'Choose a property owner'}
                  data={owners.map((u) => ({ value: String(u.id), label: `${u.username} — ${u.email}` }))}
                  value={ownerIdStr}
                  onChange={setOwnerIdStr}
                  searchable
                  clearable
                  disabled={!!ownersError || owners.length === 0}
                  leftSection={<IconUser size={16} />}
                />
              )}
              {ownersError && (
                <Text size="xs" c="red">Unable to load owners. Ensure you are an admin and backend is running.</Text>
              )}
            </Stack>
          ) : (
            <Stack gap="sm">
              <Group grow>
                <TextInput
                  label="Full Name"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  leftSection={<IconUser size={16} />}
                />
                <TextInput
                  label="Email"
                  placeholder="e.g. owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  leftSection={<IconMail size={16} />}
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Phone"
                  placeholder="e.g. +44 7700 000000"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  leftSection={<IconPhone size={16} />}
                />
              </Group>

              <Tooltip label="Creating an owner will create a user account with the 'propertyowner' role">
                <Text size="xs" c="dimmed">Backend must be running for user creation.</Text>
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
            if (!selectedProperty) return
            if (mode === 'existing') {
              if (!ownerIdStr) return
              const selectedOwner = owners.find((u) => String(u.id) === String(ownerIdStr))
              const payload: ExistingOwnerAssignment = {
                mode: 'existing',
                propertyId: selectedProperty.id,
                propertyTitle: selectedProperty.title,
                propertyAddress: selectedProperty.address ?? null,
                ownerId: Number(ownerIdStr),
                // Help populate profile on the property page
                ownerName: selectedOwner?.username,
                ownerEmail: selectedOwner?.email ?? null,
              }
              onCreate(payload)
              return
            }
            if (!canCreateNew) return
            const payload: NewOwnerCreate = {
              mode: 'new',
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim() ? phone.trim() : null,
              propertyId: selectedProperty.id,
              propertyTitle: selectedProperty.title,
              propertyAddress: selectedProperty.address ?? null,
              role: 'propertyowner',
            }
            onCreate(payload)
          }}
          disabled={mode === 'existing' ? !canAssignExisting : !canCreateNew}
        >
          {mode === 'existing' ? 'Assign Owner' : 'Add Owner'}
        </Button>
      </Group>
    </Modal>
  )
}