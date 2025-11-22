import { useEffect, useState } from 'react'
import { Modal, Stack, Group, Text, Badge, Button, Paper, Select, Divider } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar, IconTools, IconUser } from '@tabler/icons-react'

type Props = {
  opened: boolean
  request: any | null
  assignees: string[]
  priorities: string[]
  onClose: () => void
  onConfirm: (payload: { assignee: string | null; scheduledDate: Date | null; priority: string | null }) => void
}

export default function ScheduleMaintenanceModal({ opened, request, assignees, priorities, onClose, onConfirm }: Props) {
  const [assignee, setAssignee] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
  const [priority, setPriority] = useState<string | null>(null)

  useEffect(() => {
    setAssignee(request?.assignedTo ?? null)
    setScheduledDate(request?.dueDate ?? new Date())
    setPriority(request?.priority ?? null)
  }, [request])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <IconCalendar size={20} />
          <Text fw={700}>Schedule Repair</Text>
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
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-indigo-6), var(--mantine-color-indigo-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          {request && (
            <Group justify="space-between" align="center">
              <Group>
                <Badge variant="light" color="brand" leftSection={<IconTools size={14} />}>{request.propertyName || '—'}</Badge>
                <Text c="dimmed" size="sm">{request.title}</Text>
              </Group>
              <Badge variant="light" color="indigo">{request.status}</Badge>
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

            <DatePickerInput
              label="Scheduled date"
              placeholder="Pick a date"
              value={scheduledDate}
              onChange={(value) => setScheduledDate(value ? new Date(value) : null)}
              leftSection={<IconCalendar size={16} />}
            />

            <Select
              label="Priority"
              placeholder="Select priority"
              data={priorities.map(p => ({ value: p, label: p }))}
              value={priority}
              onChange={setPriority}
              clearable
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
        <Button onClick={() => onConfirm({ assignee, scheduledDate, priority })}>Save Schedule</Button>
      </Group>
    </Modal>
  )
}