import { Modal, Stack, Group, TextInput, Select, Divider, Button, Text, Badge, Avatar, Paper, Tooltip } from '@mantine/core'
import { useEffect, useState, useMemo } from 'react'
import { useFieldValues } from '../context/FieldValuesProvider'
import { IconHome, IconMapPin, IconCurrencyPound, IconCalendar, IconSofa, IconBed, IconBath, IconCar } from '@tabler/icons-react'

type OverviewData = {
  postcode?: string | null
  house_number?: string | number | null
  location?: string | null
  payment_frequency?: string | null
  price?: string | number | null
  furnished?: string | null
  property_type?: string | null
  marketing_status?: string | null
  categories?: string | null
  beds?: number | null
  bathrooms?: number | null
  living_rooms?: number | null
  parking?: number | null
}

type Props = {
  opened: boolean
  data: OverviewData
  onClose: () => void
  onSave: (updated: OverviewData) => void
}

// Options now sourced from FieldValuesProvider

export default function EditOverviewModal({ opened, data, onClose, onSave }: Props) {
  const [form, setForm] = useState<OverviewData>({})
  const { getOptions, locations } = useFieldValues()

  useEffect(() => {
    setForm({ ...data })
  }, [data, opened])

  const set = (key: keyof OverviewData, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const initial = useMemo(() => (String(form.location || form.postcode || '').trim()[0] || '🏠').toString().toUpperCase(), [form.location, form.postcode])
  const canSave = true

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconHome size={18} /></Avatar>
          <Text fw={700}>Edit Overview</Text>
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
          <Group justify="space-between" align="center">
            <Group>
              {form.property_type && (
                <Badge variant="light" color="brand">{String(form.property_type)}</Badge>
              )}
              {form.marketing_status && (
                <Badge variant="light" color="violet">{String(form.marketing_status)}</Badge>
              )}
              {form.furnished && (
                <Badge variant="light" color="teal">{String(form.furnished)}</Badge>
              )}
            </Group>
            <Group gap="xs">
              {form.price && (
                <Group gap={6}>
                  <IconCurrencyPound size={16} />
                  <Text c="dimmed" size="sm">{String(form.price)}</Text>
                </Group>
              )}
              {form.payment_frequency && (
                <Group gap={6}>
                  <IconCalendar size={16} />
                  <Text c="dimmed" size="sm">{String(form.payment_frequency)}</Text>
                </Group>
              )}
            </Group>
          </Group>

          <Divider my="xs" />

          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="Postcode"
                placeholder="SW1A 1AA"
                value={String(form.postcode ?? '')}
                onChange={(e) => set('postcode', e.currentTarget.value)}
                leftSection={<IconMapPin size={16} />}
              />
              <TextInput
                label="House Number"
                placeholder="e.g. 10A"
                value={String(form.house_number ?? '')}
                onChange={(e) => set('house_number', e.currentTarget.value)}
                leftSection={<IconHome size={16} />}
              />
            </Group>

            <Group grow>
              <Select
                label="Location"
                placeholder="Select"
                data={locations}
                value={form.location ?? null}
                onChange={(v) => set('location', v)}
                allowDeselect
                clearable
                searchable
                leftSection={<IconMapPin size={16} />}
              />
              <Select
                label="Category"
                placeholder="Select"
                data={getOptions('category')}
                value={form.categories ?? null}
                onChange={(v) => set('categories', v)}
                allowDeselect
                clearable
              />
            </Group>

            <Group grow>
              <Select
                label="Payment Frequency"
                placeholder="Select"
                data={getOptions('payment_frequency')}
                value={form.payment_frequency ?? null}
                onChange={(v) => set('payment_frequency', v)}
                allowDeselect
                clearable
              />
              <TextInput
                label="Price (£)"
                placeholder="e.g. 1200"
                value={String(form.price ?? '')}
                onChange={(e) => set('price', e.currentTarget.value)}
                leftSection={<IconCurrencyPound size={16} />}
              />
            </Group>

            <Group grow>
              <Select
                label="Furnish State"
                placeholder="Select"
                data={getOptions('furnish_status')}
                value={form.furnished ?? null}
                onChange={(v) => set('furnished', v)}
                allowDeselect
                clearable
              />
              <Select
                label="Property Type"
                placeholder="Select"
                data={getOptions('property_type')}
                value={form.property_type ?? null}
                onChange={(v) => set('property_type', v)}
                allowDeselect
                clearable
                leftSection={<IconHome size={16} />}
              />
              <Select
                label="Marketing Status"
                placeholder="Select"
                data={getOptions('marketing_status')}
                value={form.marketing_status ?? null}
                onChange={(v) => set('marketing_status', v)}
                allowDeselect
                clearable
              />
            </Group>

            <Group grow>
              <Stack gap={2}>
                <TextInput value={String(form.beds ?? '')} onChange={(e) => set('beds', e.currentTarget.value)} leftSection={<IconBed size={16} />} />
                <Text size="xs" c="dimmed">Beds</Text>
              </Stack>
              <Stack gap={2}>
                <TextInput value={String(form.bathrooms ?? '')} onChange={(e) => set('bathrooms', e.currentTarget.value)} leftSection={<IconBath size={16} />} />
                <Text size="xs" c="dimmed">Bathrooms</Text>
              </Stack>
              <Stack gap={2}>
                <TextInput value={String(form.living_rooms ?? '')} onChange={(e) => set('living_rooms', e.currentTarget.value)} leftSection={<IconSofa size={16} />} />
                <Text size="xs" c="dimmed">Living Rooms</Text>
              </Stack>
              <Stack gap={2}>
                <TextInput value={String(form.parking ?? '')} onChange={(e) => set('parking', e.currentTarget.value)} leftSection={<IconCar size={16} />} />
                <Text size="xs" c="dimmed">Parking</Text>
              </Stack>
            </Group>

            <Tooltip label="Saving updates only affects current view (no backend yet)">
              <Text size="xs" c="dimmed">Changes apply to this session and can be persisted later.</Text>
            </Tooltip>
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
        <Button onClick={() => onSave(form)} disabled={!canSave}>Save Changes</Button>
      </Group>
    </Modal>
  )
}