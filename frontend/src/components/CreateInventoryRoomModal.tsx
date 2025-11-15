import { useEffect, useState } from 'react'
import { Modal, Stack, Group, Text, TextInput, Badge, Avatar, Divider, Button, Paper } from '@mantine/core'
import { IconClipboardList } from '@tabler/icons-react'
import type { InventoryRoom } from '../api/properties'

type Props = {
  opened: boolean
  onClose: () => void
  onCreate: (room: InventoryRoom) => void
}

export default function CreateInventoryRoomModal({ opened, onClose, onCreate }: Props) {
  const [roomName, setRoomName] = useState('')
  const [roomType, setRoomType] = useState<string | null>(null)

  useEffect(() => {
    if (opened) {
      setRoomName('')
      setRoomType(null)
    }
  }, [opened])

  const canSave = roomName.trim().length > 0

  const handleCreate = () => {
    const now = new Date().toISOString()
    const newRoom: InventoryRoom = {
      id: Math.floor(Date.now() / 1000),
      room_name: roomName.trim(),
      room_type: roomType ?? null,
      items: [],
    }
    onCreate(newRoom)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconClipboardList size={18} /></Avatar>
          <Text fw={700}>Add Inventory Room</Text>
        </Group>
      }
      radius="md"
      padding="md"
      centered
      overlayProps={{ opacity: 0.2, blur: 2 }}
      styles={{
        header: { borderBottom: 'none' },
        title: { fontWeight: 700 },
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Premium header accent */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          <Text c="dimmed" size="sm">Create a new room to group inventory items.</Text>
          <Divider my="xs" />
          <TextInput
            label="Room name"
            placeholder="e.g., Master Bedroom"
            value={roomName}
            onChange={(e) => setRoomName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Room type"
            placeholder="e.g., Bedroom, Bathroom (optional)"
            value={roomType ?? ''}
            onChange={(e) => setRoomType(e.currentTarget.value || null)}
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
        <Button onClick={handleCreate} disabled={!canSave}>Create Room</Button>
      </Group>
    </Modal>
  )
}