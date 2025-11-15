import { Modal, Stack, Group, TextInput, Select, Divider, Button, Text, Switch, Tooltip, Paper, Avatar } from '@mantine/core'
import { IconUser, IconUserCheck } from '@tabler/icons-react'
import { useMemo } from 'react'

export type EditUserPayload = {
  username: string
  email: string
  role: string
  is_active: boolean
}

type Props = {
  opened: boolean
  payload: EditUserPayload
  setPayload: (p: EditUserPayload) => void
  updating: boolean
  roles: string[]
  onSave: () => void
  onClose: () => void
}

export default function EditUserModal({ opened, payload, setPayload, updating, roles, onSave, onClose }: Props) {
  const canSave = useMemo(() => Boolean(payload.username && payload.email && payload.role), [payload])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconUser size={18} /></Avatar>
          <Text fw={700}>Edit User</Text>
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
      {/* Premium header accent */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="sm">
          <TextInput
            label="Username"
            placeholder="john.doe"
            value={payload.username}
            onChange={(e) => setPayload({ ...payload, username: e.currentTarget.value })}
          />
          <TextInput
            label="Email"
            placeholder="john@example.com"
            value={payload.email}
            onChange={(e) => setPayload({ ...payload, email: e.currentTarget.value })}
          />
          <Select
            label="Role"
            placeholder="Select a role"
            data={roles}
            value={payload.role}
            onChange={(val) => setPayload({ ...payload, role: val || '' })}
            allowDeselect={false}
          />
          <Group justify="space-between" align="center">
            <Text>Active</Text>
            <Switch
              checked={payload.is_active}
              onChange={(e) => setPayload({ ...payload, is_active: e.currentTarget.checked })}
              onLabel={<IconUserCheck size={14} />}
            />
          </Group>
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
        <Button variant="light" onClick={onClose} disabled={updating}>Close</Button>
        <Tooltip label={!canSave ? 'Please complete all fields' : ''} disabled={canSave}>
          <Button onClick={onSave} loading={updating} disabled={!canSave}>Save Changes</Button>
        </Tooltip>
      </Group>
    </Modal>
  )
}