import { Modal, Stack, Group, TextInput, Select, Button, Text, Avatar, Paper, Tooltip } from '@mantine/core'
import { IconUserPlus, IconUser, IconMail, IconLock } from '@tabler/icons-react'
import { useMemo } from 'react'

interface CreateUserPayload {
  username: string
  email: string
  password: string
  role: string
}

interface CreateUserModalProps {
  opened: boolean
  payload: CreateUserPayload
  setPayload: React.Dispatch<React.SetStateAction<CreateUserPayload>>
  creating: boolean
  roles: string[]
  onCreate: () => void
  onClose: () => void
}

export default function CreateUserModal({ opened, payload, setPayload, creating, roles, onCreate, onClose }: CreateUserModalProps) {
  const roleOptions = (roles || []).map((r) => ({ value: r, label: r }))
  const canCreate = useMemo(() => Boolean(payload.username && payload.email && payload.password && payload.role), [payload])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconUserPlus size={18} /></Avatar>
          <Text fw={700}>Create User</Text>
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
            placeholder="e.g. john.doe"
            value={payload.username}
            onChange={(e) => setPayload((p) => ({ ...p, username: e.currentTarget.value }))}
            leftSection={<IconUser size={16} />}
          />
          <TextInput
            label="Email"
            placeholder="e.g. john@example.com"
            value={payload.email}
            onChange={(e) => setPayload((p) => ({ ...p, email: e.currentTarget.value }))}
            leftSection={<IconMail size={16} />}
          />
          <TextInput
            label="Password"
            placeholder="Enter a temporary password"
            type="password"
            value={payload.password}
            onChange={(e) => setPayload((p) => ({ ...p, password: e.currentTarget.value }))}
            leftSection={<IconLock size={16} />}
          />
          <Select
            label="Role"
            placeholder="Select a role"
            value={payload.role}
            onChange={(v) => setPayload((p) => ({ ...p, role: v || p.role }))}
            data={roleOptions}
            allowDeselect={false}
          />
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
        <Button variant="light" onClick={onClose} disabled={creating}>Close</Button>
        <Tooltip label={!canCreate ? 'Please complete all fields' : ''} disabled={canCreate}>
          <Button onClick={onCreate} loading={creating} disabled={!canCreate}>Create</Button>
        </Tooltip>
      </Group>
    </Modal>
  )
}