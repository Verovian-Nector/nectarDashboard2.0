import { useEffect, useState } from 'react'
import { Modal, Stack, Group, Text, Badge, Button, Paper, Divider, Textarea, TextInput } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconCircleCheck, IconTools, IconCalendar, IconCurrencyPound } from '@tabler/icons-react'

type Props = {
  opened: boolean
  request: any | null
  onClose: () => void
  onConfirm: (payload: { completedDate: Date | null; actualCost: number | null; notes: string | null }) => void
}

export default function CompleteMaintenanceModal({ opened, request, onClose, onConfirm }: Props) {
  const [completedDate, setCompletedDate] = useState<Date | null>(new Date())
  const [actualCost, setActualCost] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    setCompletedDate(new Date())
    setActualCost(request?.estimatedCost ? String(request.estimatedCost) : '')
    setNotes('')
  }, [request])

  const parsedCost = (() => {
    const n = Number(actualCost)
    return Number.isFinite(n) ? n : null
  })()

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <IconCircleCheck size={20} />
          <Text fw={700}>Complete Work</Text>
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
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-green-6), var(--mantine-color-green-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          {request && (
            <Group justify="space-between" align="center">
              <Group>
                <Badge variant="light" color="brand" leftSection={<IconTools size={14} />}>{request.propertyName || '—'}</Badge>
                <Text c="dimmed" size="sm">{request.title}</Text>
              </Group>
              <Badge variant="light" color="green">{request.status}</Badge>
            </Group>
          )}

          <Divider my="xs" />

          <Stack gap="sm">
            <DatePickerInput
              label="Completion date"
              placeholder="Pick a date"
              value={completedDate ? completedDate.toISOString().split('T')[0] : null}
              onChange={(dateString) => setCompletedDate(dateString ? new Date(dateString) : null)}
              leftSection={<IconCalendar size={16} />}
            />

            <TextInput
              label="Actual cost"
              placeholder="e.g. 120"
              type="number"
              leftSection={<IconCurrencyPound size={16} />}
              value={actualCost}
              onChange={(e) => setActualCost(e.currentTarget.value)}
            />

            <Textarea
              label="Notes (optional)"
              placeholder="Add completion details and remarks"
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
        <Button onClick={() => onConfirm({ completedDate, actualCost: parsedCost, notes: notes.trim() || null })}>Mark Completed</Button>
      </Group>
    </Modal>
  )
}