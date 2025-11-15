import { Modal, Stack, Group, Textarea, Divider, Button, Text, Select, Avatar, Paper, Tooltip } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { useFieldValues } from '../context/FieldValuesProvider'
import { IconTools, IconMapPin, IconClipboardList, IconUser } from '@tabler/icons-react'
import type { InventoryRoom } from '../api/properties'

type Maintenance = {
  where?: string | null
  what?: string | null
  payable_by?: string | null
  contractor_supplied_by?: string | null
  priority?: string | null
  notes?: string | null
}

type Props = {
  opened: boolean
  data: Maintenance
  rooms?: InventoryRoom[]
  onClose: () => void
  onSave: (updated: Maintenance) => void
}

const PRIORITIES = ['Low', 'Medium', 'High']

export default function EditMaintenanceModal({ opened, data, rooms = [], onClose, onSave }: Props) {
  const [form, setForm] = useState<Maintenance>({})
  const { getOptions } = useFieldValues()

  useEffect(() => { setForm({ ...data }) }, [data, opened])
  const set = (key: keyof Maintenance, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const roomOptions = useMemo(() => (rooms || []).map(r => ({ value: r.room_name, label: r.room_name })), [rooms])
  const selectedRoom = useMemo(() => (rooms || []).find(r => r.room_name === form.where), [rooms, form.where])
  const applianceOptions = useMemo(() => (selectedRoom?.items || []).map(i => ({ value: i.name, label: i.name })), [selectedRoom])

  const payeeOptions = getOptions('payee')

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconTools size={18} /></Avatar>
          <Text fw={700}>Edit Maintenance</Text>
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
        <Stack gap="sm">
          <Tooltip label="Select room and appliance; payee and contractor values come from Settings → Field Values.">
            <Text c="dimmed" size="sm">Configure where and what, who pays, and contractor.</Text>
          </Tooltip>

          <Divider my="xs" />

          <Group grow>
            <Select
              label="Where (Room)"
              placeholder="Select"
              data={roomOptions}
              value={form.where ?? null}
              onChange={(v) => {
                set('where', v)
                // Reset appliance if room changes
                if (v !== selectedRoom?.room_name) set('what', null)
              }}
              allowDeselect
              clearable
              searchable
              leftSection={<IconMapPin size={16} />}
            />
            <Select
              label="What (Appliance)"
              placeholder={form.where ? 'Select' : 'Select a room first'}
              data={applianceOptions}
              value={form.what ?? null}
              onChange={(v) => set('what', v)}
              allowDeselect
              clearable
              searchable
              disabled={!form.where}
              leftSection={<IconClipboardList size={16} />}
            />
          </Group>

          <Group grow>
            <Select
              label="Payable by"
              placeholder="Select"
              data={payeeOptions}
              value={form.payable_by ?? null}
              onChange={(v) => set('payable_by', v)}
              allowDeselect
              clearable
              leftSection={<IconUser size={16} />}
            />
            <Select
              label="Contractor supplied by"
              placeholder="Select"
              data={payeeOptions}
              value={form.contractor_supplied_by ?? null}
              onChange={(v) => set('contractor_supplied_by', v)}
              allowDeselect
              clearable
              leftSection={<IconUser size={16} />}
            />
          </Group>

          <Select label="Priority" data={PRIORITIES} value={form.priority ?? null} onChange={(v) => set('priority', v)} allowDeselect clearable />
          <Textarea label="Notes" minRows={4} value={String(form.notes ?? '')} onChange={(e) => set('notes', e.currentTarget.value)} />

          <Tooltip label="Saves maintenance details to property and adds a 'New' request to Repairs & Maintenance for this session.">
            <Text size="xs" c="dimmed">Submission appears under Repairs → New and in property maintenance records.</Text>
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