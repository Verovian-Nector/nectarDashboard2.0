import { Modal, Stack, Group, TextInput, Button, Divider, Text, Badge, Avatar, Paper, Image, ActionIcon, Tooltip } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { IconPhoto, IconLink, IconTrash, IconArrowUp, IconArrowDown, IconUpload, IconX } from '@tabler/icons-react'
import { uploadFiles } from '../api/upload'
import ConfirmModal from './ConfirmModal'

type Props = {
  opened: boolean
  photos: string[]
  onClose: () => void
  onSave: (updated: string[]) => void
}

export default function EditGalleryModal({ opened, photos, onClose, onSave }: Props) {
  const [items, setItems] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null)

  useEffect(() => {
    setItems(Array.isArray(photos) ? photos : [])
  }, [photos, opened])

  const removeAt = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateAt = (idx: number, value: string) => setItems((prev) => prev.map((v, i) => (i === idx ? value : v)))
  const moveUp = (idx: number) => setItems((prev) => {
    if (idx <= 0) return prev
    const next = [...prev]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    return next
  })
  const moveDown = (idx: number) => setItems((prev) => {
    if (idx >= prev.length - 1) return prev
    const next = [...prev]
    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
    return next
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconPhoto size={18} /></Avatar>
          <Text fw={700}>Edit Gallery</Text>
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
            <Badge variant="light" color="brand">{items.length} photo(s)</Badge>
            <Tooltip label="Saving updates only affects current view (no backend yet)">
              <Text size="xs" c="dimmed">Changes apply to this session and can be persisted later.</Text>
            </Tooltip>
          </Group>

          <Divider my="xs" />

          <Stack gap="xs">
            <Text fw={600}>Add images</Text>
            <Dropzone
              multiple
              accept={[MIME_TYPES.png, MIME_TYPES.jpeg, 'image/svg+xml']}
              maxSize={5 * 1024 ** 2}
              onDrop={async (files) => {
                try {
                  const urls = await uploadFiles(files)
                  if (urls?.length) {
                    setItems((prev) => [...prev, ...urls])
                    notifications.show({ title: 'Images uploaded', message: `Added ${urls.length} image${urls.length > 1 ? 's' : ''}`, color: 'green' })
                  }
                } catch (err: any) {
                  notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                }
              }}
              onReject={() => notifications.show({ title: 'File rejected', message: 'Upload PNG/JPG/SVG ≤5MB', color: 'red' })}
            >
              <Group justify="center" gap="sm" py="sm">
                <Dropzone.Accept>
                  <IconUpload size={18} />
                </Dropzone.Accept>
                <Dropzone.Idle>
                  <IconPhoto size={18} />
                </Dropzone.Idle>
                <Dropzone.Reject>
                  <IconX size={18} />
                </Dropzone.Reject>
                <Text size="sm" c="dimmed">Drag images here, or click to select</Text>
              </Group>
            </Dropzone>
          </Stack>

          <Stack gap="sm">
            {items.length === 0 ? (
              <Text c="dimmed">No photos added.</Text>
            ) : (
              items.map((url, idx) => (
                <Paper key={idx} withBorder radius="md" p="sm">
                  <Group gap="sm" align="end">
                    <Image src={url} alt={`Photo ${idx + 1}`} radius="sm" w={96} h={72} fit="cover" withPlaceholder />
                    <TextInput label={`Photo ${idx + 1}`} value={url} onChange={(e) => updateAt(idx, e.currentTarget.value)} style={{ flex: 1 }} />
                    <Group gap={4}>
                      <ActionIcon variant="light" aria-label="Move up" onClick={() => moveUp(idx)}>
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" aria-label="Move down" onClick={() => moveDown(idx)}>
                        <IconArrowDown size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="red" aria-label="Remove" onClick={() => { setPendingRemoveIndex(idx); setConfirmOpen(true) }}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))
            )}
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
        <Button onClick={() => onSave(items)}>Save Changes</Button>
      </Group>

      {/* Confirm removal of photo */}
      <ConfirmModal
        opened={confirmOpen}
        title="Confirm Deletion"
        message="Remove this photo from the gallery? This action cannot be undone."
        confirmLabel="Remove"
        loading={confirmLoading}
        onCancel={() => { setConfirmOpen(false); setPendingRemoveIndex(null) }}
        onConfirm={() => {
          if (pendingRemoveIndex === null) return
          ;(async () => {
            setConfirmLoading(true)
            try { removeAt(pendingRemoveIndex) } finally { setConfirmLoading(false); setConfirmOpen(false); setPendingRemoveIndex(null) }
          })()
        }}
      />
    </Modal>
  )
}