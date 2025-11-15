import { Modal, Stack, Group, TextInput, Divider, Button, Text, Badge, Avatar, Paper, Tooltip } from '@mantine/core'
import { useEffect, useState } from 'react'
import { IconUser, IconMail, IconPhone } from '@tabler/icons-react'

type OwnerProfile = {
  firstname?: string | null
  lastname?: string | null
  email?: string | null
  phone?: string | null
}

type Props = {
  opened: boolean
  data: OwnerProfile
  onClose: () => void
  onSave: (updated: OwnerProfile) => void
}

export default function EditOwnerProfileModal({ opened, data, onClose, onSave }: Props) {
  const [form, setForm] = useState<OwnerProfile>({})
  useEffect(() => { setForm({ ...data }) }, [data, opened])
  const set = (key: keyof OwnerProfile, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const fullName = [form.firstname, form.lastname].filter(Boolean).join(' ').trim() || 'Owner'

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconUser size={18} /></Avatar>
          <Text fw={700}>Edit Owner Profile</Text>
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
      centered
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group>
              <Badge variant="light" color="brand">{fullName}</Badge>
              {form.email && (
                <Group gap={6}>
                  <IconMail size={16} />
                  <Text c="dimmed" size="sm">{String(form.email)}</Text>
                </Group>
              )}
            </Group>
            {form.phone && (
              <Group gap={6}>
                <IconPhone size={16} />
                <Text c="dimmed" size="sm">{String(form.phone)}</Text>
              </Group>
            )}
          </Group>

          <Divider my="xs" />

          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="First name"
                placeholder="e.g., Jane"
                value={String(form.firstname ?? '')}
                onChange={(e) => set('firstname', e.currentTarget.value)}
                leftSection={<IconUser size={16} />}
              />
              <TextInput
                label="Last name"
                placeholder="e.g., Doe"
                value={String(form.lastname ?? '')}
                onChange={(e) => set('lastname', e.currentTarget.value)}
                leftSection={<IconUser size={16} />}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Email"
                placeholder="name@example.com"
                value={String(form.email ?? '')}
                onChange={(e) => set('email', e.currentTarget.value)}
                leftSection={<IconMail size={16} />}
              />
              <TextInput
                label="Phone"
                placeholder="e.g., +44 20 7946 0018"
                value={String(form.phone ?? '')}
                onChange={(e) => set('phone', e.currentTarget.value)}
                leftSection={<IconPhone size={16} />}
              />
            </Group>

            <Tooltip label="Saving updates only affects current view (no backend yet)">
              <Text size="xs" c="dimmed">Changes apply to this session and can be persisted later.</Text>
            </Tooltip>
          </Stack>
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
        <Button onClick={() => onSave(form)}>Save Changes</Button>
      </Group>
    </Modal>
  )
}