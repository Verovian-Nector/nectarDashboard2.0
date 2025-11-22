import { useEffect, useState } from 'react'
import { Modal, Stack, Group, Text, Badge, Button, Paper, Select, Divider, Textarea } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconPlayerPlay, IconTools, IconCalendar, IconUser } from '@tabler/icons-react'

type Props = {
  opened: boolean
  request: any | null
  assignees: string[]
  priorities: string[]
  onClose: () => void
  onConfirm: (payload: { assignee: string | null; startDate: Date | null; priority: string | null; notes: string | null }) => void
}

export default function StartMaintenanceModal({ opened, request, assignees, priorities, onClose, onConfirm }: Props) {
  const [assignee, setAssignee] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [priority, setPriority] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    setAssignee(request?.assignedTo ?? null)
    setStartDate(new Date())
    setPriority(request?.priority ?? null)
    setNotes('')
  }, [request])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <IconPlayerPlay size={20} />
          <Text fw={700}>Start Work</Text>
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
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-teal-6), var(--mantine-color-teal-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          {request && (
            <Group justify="space-between" align="center">
              <Group>
                <Badge variant="light" color="brand" leftSection={<IconTools size={14} />}>{request.propertyName || '—'}</Badge>
                <Text c="dimmed" size="sm">{request.title}</Text>
              </Group>
              <Badge variant="light" color="teal">{request.status}</Badge>
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
              label="Start date"
              placeholder="Pick a date"
              value={startDate}
              onChange={(value) => setStartDate(value ? new Date(value) : null)}
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

            <Textarea
              label="Notes (optional)"
              placeholder="Add context for the contractor"
              autosize
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
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
        <Button onClick={() => onConfirm({ assignee, startDate, priority, notes: notes.trim() || null })}>Begin Work</Button>
      </Group>
    </Modal>
  )
}