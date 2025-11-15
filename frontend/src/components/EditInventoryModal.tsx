import { Modal, Stack, Group, TextInput, Divider, Button, Text, Avatar, Paper } from '@mantine/core'
import { IconClipboardList } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

type Props = {
  opened: boolean
  roomName?: string | null
  onClose: () => void
  onSave: (updatedRoomName: string | null) => void
}

export default function EditInventoryModal({ opened, roomName, onClose, onSave }: Props) {
  const [name, setName] = useState<string>('')
  useEffect(() => { setName(String(roomName ?? '')) }, [roomName, opened])

  const canSave = true

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconClipboardList size={18} /></Avatar>
          <Text fw={700}>Edit Inventory</Text>
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
          <Text c="dimmed" size="sm">Update the room name used to group inventory items.</Text>
          <Divider my="xs" />
          <TextInput
            label="Room name"
            placeholder="e.g., Master Bedroom"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
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
        <Button variant="light" onClick={onClose}>Close</Button>
        <Button onClick={() => onSave(name || null)} disabled={!canSave}>Save Changes</Button>
      </Group>
    </Modal>
  )
}