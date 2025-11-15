import { useEffect, useMemo, useState } from 'react'
import { Modal, Stack, Group, Text, TextInput, Select, Badge, Avatar, Divider, Button, Paper, Tooltip, NumberInput, ActionIcon, Anchor } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { notifications } from '@mantine/notifications'
import { IconClipboardList, IconCalendar, IconUpload, IconX } from '@tabler/icons-react'
import { useFieldValues } from '../context/FieldValuesProvider'
import { type InventoryRoom, type InventoryItem } from '../api/properties'
import { uploadFiles } from '../api/upload'

type Props = {
  opened: boolean
  room: InventoryRoom | null
  item: InventoryItem | null
  onClose: () => void
  onSave: (updated: InventoryItem) => void
}

export default function EditInventoryItemModal({ opened, room, item, onClose, onSave }: Props) {
  const { getOptions } = useFieldValues()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [owner, setOwner] = useState<string | null>(null)
  const [value, setValue] = useState<number | null>(null)
  const [quantity, setQuantity] = useState<number | null>(1)
  const [notes, setNotes] = useState<string | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null)
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    if (!item || !opened) return
    setName(item.name || '')
    setBrand(item.brand ?? null)
    setCondition(item.condition ?? null)
    setOwner(item.owner ?? null)
    setValue(item.value ?? null)
    setQuantity(item.quantity ?? 1)
    setNotes(item.notes ?? null)
    setPurchaseDate(item.purchase_date ? (dayjs(item.purchase_date).isValid() ? dayjs(item.purchase_date).toDate() : null) : null)
    setPhotos(Array.isArray(item.photos) ? item.photos.filter((u): u is string => typeof u === 'string') : [])
  }, [item, opened])

  const initial = useMemo(() => (room?.room_name || 'Item')[0]?.toUpperCase() ?? 'I', [room?.room_name])
  const canSave = name.trim().length > 0 && !!item

  const handleSave = () => {
    if (!item) return
    const nowIso = new Date().toISOString()
    const updated: InventoryItem = {
      ...item,
      name: name.trim(),
      brand: brand || null,
      purchase_date: purchaseDate ? dayjs(purchaseDate).format('YYYY-MM-DD') : null,
      value: value ?? null,
      condition: condition ?? null,
      owner: owner ?? null,
      notes: notes ?? null,
      photos: photos.length ? photos : null,
      quantity: quantity ?? 1,
      updated: nowIso,
    }
    onSave(updated)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconClipboardList size={18} /></Avatar>
          <Text fw={700}>Edit Inventory Item</Text>
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
          overflow: 'hidden'
        }
      }}
    >
      {/* Premium header accent */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          {/* Context */}
          {room && (
            <Group justify="space-between" align="center">
              <Badge variant="light" color="brand">Room: {room.room_name}</Badge>
            </Group>
          )}

          <Divider my="xs" />

          <Stack gap="sm">
            <TextInput
              label="Item name"
              placeholder="e.g., Wardrobe"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
            />

            <Group grow>
              <TextInput label="Brand" placeholder="e.g., IKEA" value={brand ?? ''} onChange={(e) => setBrand(e.currentTarget.value || null)} />
              <Select label="Condition" placeholder="Select" value={condition} onChange={setCondition} allowDeselect clearable data={getOptions('conditions')} />
            </Group>

            <Group grow>
              <NumberInput label="Value (£)" placeholder="e.g., 1200" value={value} onChange={(v) => setValue(typeof v === 'number' ? v : null)} min={0} thousandSeparator />
              <NumberInput label="Quantity" placeholder="e.g., 1" value={quantity} onChange={(v) => setQuantity(typeof v === 'number' ? v : 1)} min={1} />
            </Group>

            <Group grow>
              <Select label="Owner" placeholder="Select" value={owner} onChange={setOwner} allowDeselect clearable data={getOptions('owner')} />
              <DateInput label="Purchase date" placeholder="Select date" value={purchaseDate} onChange={setPurchaseDate} leftSection={<IconCalendar size={16} />} valueFormat="YYYY-MM-DD" />
            </Group>

            <TextInput label="Notes" placeholder="Optional" value={notes ?? ''} onChange={(e) => setNotes(e.currentTarget.value || null)} />

            {/* Stylised Dropzone for photos */}
            <Stack gap={6} style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 12, padding: 12 }}>
              <Text fw={500}>Photos</Text>
              {photos.length > 0 && (
                <Stack gap="xs">
                  {photos.map((url, idx) => (
                    <Group key={idx} justify="space-between" align="center">
                      <Anchor href={url} target="_blank" rel="noopener noreferrer">Photo {idx + 1}</Anchor>
                      <ActionIcon variant="subtle" color="red" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((_, i) => i !== idx))}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
              <Dropzone
                onDrop={async (files) => {
                  try {
                    const urls = await uploadFiles(files)
                    if (urls.length) {
                      setPhotos((prev) => [...prev, ...urls])
                      notifications.show({ title: 'Uploaded', message: 'Photo(s) uploaded', color: 'green' })
                    }
                  } catch (e) {
                    notifications.show({ title: 'Upload failed', message: 'Could not upload file(s)', color: 'red' })
                  }
                }}
                accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.webp]}
              >
                <Group justify="center" align="center" style={{ minHeight: 80 }}>
                  <IconUpload size={20} />
                  <Text size="sm" c="dimmed">Drag images here or click to upload</Text>
                </Group>
              </Dropzone>
            </Stack>
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
        <Button onClick={handleSave} disabled={!canSave}>Save Changes</Button>
      </Group>
    </Modal>
  )
}