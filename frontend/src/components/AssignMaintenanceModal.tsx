import { useEffect, useState } from 'react'
import { Modal, Stack, Group, Text, Badge, Button, Paper, Select, Divider } from '@mantine/core'
import { IconTools, IconUser } from '@tabler/icons-react'

type Props = {
  opened: boolean
  request: any | null
  assignees: string[]
  priorities: string[]
  onClose: () => void
  onConfirm: (payload: { assignee: string | null; priority: string | null }) => void
}

export default function AssignMaintenanceModal({ opened, request, assignees, priorities, onClose, onConfirm }: Props) {
  const [assignee, setAssignee] = useState<string | null>(null)
  const [priority, setPriority] = useState<string | null>(null)

  useEffect(() => {
    setAssignee(request?.assignedTo ?? null)
    setPriority(request?.priority ?? null)
  }, [request])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <IconTools size={20} />
          <Text fw={700}>Assign Contractor</Text>
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
          overflow: 'hidden',
        }
      }}
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-orange-6), var(--mantine-color-orange-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          {request && (
            <Group justify="space-between" align="center">
              <Group>
                <Badge variant="light" color="brand">{request.propertyName || '—'}</Badge>
                <Text c="dimmed" size="sm">{request.title}</Text>
              </Group>
              <Badge variant="light" color="orange">{request.status}</Badge>
            </Group>
          )}

          <Divider my="xs" />

          <Stack gap="sm">
            <Select
              label="Assign to"
              placeholder="Select contractor"
              data={assignees.map(a => ({ value: a, label: a }))}
              value={assignee}
              onChange={setAssignee}
              leftSection={<IconUser size={16} />}
              clearable
            />
            <Select
              label="Priority"
              placeholder="Select priority"
              data={priorities.map(p => ({ value: p, label: p }))}
              value={priority}
              onChange={setPriority}
            />
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
        <Button onClick={() => onConfirm({ assignee, priority })}>Assign</Button>
      </Group>
    </Modal>
  )
}