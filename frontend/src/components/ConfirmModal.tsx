import { Modal, Group, Stack, Text, Button, Paper, Avatar, Badge } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'

type ConfirmModalProps = {
  opened: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmModal({ opened, title = 'Confirm Deletion', message, confirmLabel = 'Delete', onConfirm, onCancel, loading = false }: ConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="red"><IconAlertTriangle size={18} /></Avatar>
          <Text fw={700}>{title}</Text>
        </Group>
      }
      radius="md"
      padding="md"
      overlayProps={{ opacity: 0.2, blur: 2 }}
      styles={{
        header: { borderBottom: 'none' },
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }
      }}
      centered
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-red-6), var(--mantine-color-red-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={600}>This action cannot be undone.</Text>
            <Badge color="red" variant="light">Irreversible</Badge>
          </Group>
          <Text c="dimmed" size="sm">{message}</Text>
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
        <Button variant="light" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button color="red" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </Group>
    </Modal>
  )
}