import { Modal, Stack, Group, Divider, Button, Text, Select, Avatar, Paper, Tooltip, NumberInput, Badge } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useEffect, useMemo, useState } from 'react'
import { IconCalendar, IconUser, IconClipboardList } from '@tabler/icons-react'
import { useFieldValues } from '../context/FieldValuesProvider'
import { listUsersByRole } from '../api/users'
import dayjs from 'dayjs'

type Inspection = {
  count?: number | null
  frequency?: string | null
  start_date?: string | null
  next_inspection_date?: string | null
  inspector_id?: number | null
  inspector_name?: string | null
  status?: string | null
}

type Props = {
  opened: boolean
  data: Inspection
  onClose: () => void
  onSave: (updated: Inspection) => void
}

const STATUSES = ['Scheduled', 'Completed', 'Missed', 'Rescheduled']

export default function EditInspectionsModal({ opened, data, onClose, onSave }: Props) {
  const [form, setForm] = useState<Inspection>({})
  useEffect(() => { setForm({ ...data }) }, [data, opened])
  const set = (key: keyof Inspection, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  // Frequency options from Field Values (Settings)
  const { getOptions } = useFieldValues()
  const frequencyOptions = useMemo(() => getOptions('payment_frequency'), [getOptions])

  // Property managers list for Inspector dropdown
  const [managers, setManagers] = useState<Array<{ id: number; label: string }>>([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function fetchManagers() {
      setLoadingManagers(true)
      try {
        const users = await listUsersByRole('propertymanager')
        if (!cancelled) {
          const mapped = users.map((u: any) => ({ id: u.id, label: u.username || u.email || `User ${u.id}` }))
          setManagers(mapped)
        }
      } catch {
        // Graceful fallback: no managers if backend not running
        if (!cancelled) setManagers([])
      } finally {
        if (!cancelled) setLoadingManagers(false)
      }
    }
    if (opened) fetchManagers()
    return () => { cancelled = true }
  }, [opened])

  // Recompute next inspection date when start date, frequency, or count changes
  useEffect(() => {
    const next = computeNextDate(form.start_date ?? null, form.frequency ?? null, form.count ?? null)
    if (next !== (form.next_inspection_date ?? null)) {
      set('next_inspection_date', next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_date, form.frequency, form.count])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconClipboardList size={18} /></Avatar>
          <Text fw={700}>Edit Inspections</Text>
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
      size="lg"
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="sm">
          <Tooltip label="Edit the scheduled date, assigned inspector, and inspection status.">
            <Text c="dimmed" size="sm">Update upcoming inspection details and status.</Text>
          </Tooltip>

          <Divider my="xs" />

          <Group grow>
            <DateInput
              label="Start date"
              placeholder="Select date"
              value={useMemo(() => {
                const s = form.start_date
                if (!s) return null
                const d = dayjs(s, 'YYYY-MM-DD', true)
                return d.isValid() ? d.toDate() : null
              }, [form.start_date])}
              onChange={(val) => set('start_date', val ? dayjs(val).format('YYYY-MM-DD') : null)}
              valueFormat="DD MMM YYYY"
              clearable
            />
            <NumberInput
              label="Number of inspections"
              placeholder="Enter count"
              value={typeof form.count === 'number' ? form.count : undefined}
              onChange={(val) => set('count', typeof val === 'number' ? val : null)}
              min={1}
            />
            <Select
              label="Frequency"
              placeholder="Select frequency"
              data={frequencyOptions}
              value={form.frequency ?? null}
              onChange={(v) => set('frequency', v)}
              allowDeselect
              clearable
            />
          </Group>

          <Group grow>
            <Select
              label="Inspector"
              placeholder={loadingManagers ? 'Loading…' : 'Select property manager'}
              data={managers.map((m) => ({ value: String(m.id), label: m.label }))}
              value={form.inspector_id ? String(form.inspector_id) : null}
              onChange={(v) => {
                const id = v ? Number(v) : null
                const found = managers.find((m) => m.id === id) || null
                set('inspector_id', id)
                set('inspector_name', found ? found.label : null)
              }}
              leftSection={<IconUser size={16} />}
              searchable
              clearable
            />
          </Group>

          {/* Computed next inspection helper (shown under Inspector field) */}
          <Group gap="xs" align="center">
            <Badge variant="light" color="brand">Next Inspection</Badge>
            <Text size="sm" fw={600}>
              {form.next_inspection_date
                ? dayjs(form.next_inspection_date, 'YYYY-MM-DD', true).isValid()
                  ? dayjs(form.next_inspection_date).format('DD MMM YYYY')
                  : String(form.next_inspection_date)
                : '—'}
            </Text>
          </Group>

          {/* Computed schedule helper */}
          <Group gap="xs" align="center">
            <Badge variant="light" color="brand">Schedule</Badge>
            <Text size="sm" fw={600}>
              {typeof form.count === 'number' && form.frequency
                ? `${form.count} time${form.count === 1 ? '' : 's'} every ${String(form.frequency).toLowerCase()}`
                : '—'}
            </Text>
          </Group>

          <Select
            label="Status"
            placeholder="Select"
            data={STATUSES}
            value={form.status ?? null}
            onChange={(v) => set('status', v)}
            allowDeselect
            clearable
          />

          <Tooltip label="Saving updates affects current view only (no backend yet).">
            <Text size="xs" c="dimmed">Changes apply to this session and can be persisted later.</Text>
          </Tooltip>
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

// Internal helper to compute the next inspection date
function computeNextDate(startDate: string | null, frequency: string | null, count: number | null): string | null {
  if (!startDate || !frequency) return null
  if (typeof count === 'number' && count <= 1) return null
  const base = dayjs(startDate, 'YYYY-MM-DD', true)
  if (!base.isValid()) return null
  const f = String(frequency).toLowerCase()
  if (f === 'daily') return base.add(1, 'day').format('YYYY-MM-DD')
  if (f === 'weekly') return base.add(1, 'week').format('YYYY-MM-DD')
  if (f === 'monthly') return base.add(1, 'month').format('YYYY-MM-DD')
  if (f === 'quarterly') return base.add(3, 'month').format('YYYY-MM-DD')
  if (f === 'yearly') return base.add(1, 'year').format('YYYY-MM-DD')
  return null
}