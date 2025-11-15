import { Modal, Stack, Group, Divider, Button, Text, Avatar, Paper, Select, Tooltip, Badge, Anchor, ActionIcon } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { IconFileText, IconUpload, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useFieldValues } from '../context/FieldValuesProvider'
import { uploadFiles } from '../api/upload'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'

type DocumentsData = {
  // Supporting evidence
  support_url?: string | null
  support_name?: string | null
  last_sold?: string | null
  // Landlord contract
  contract_url?: string | null
  contract_name?: string | null
  contract_date?: string | null
  // New document upload fields
  uploaded_url?: string | null
  uploaded_name?: string | null
  uploaded_type?: string | null
  doc_type?: string | null
}

type Props = {
  opened: boolean
  data: DocumentsData
  onClose: () => void
  onSave: (updated: DocumentsData) => void
}

export default function EditDocumentsModal({ opened, data, onClose, onSave }: Props) {
  const [form, setForm] = useState<DocumentsData>({})
  const { getOptions } = useFieldValues()

  useEffect(() => { setForm({ ...data }) }, [data, opened])
  const set = (key: keyof DocumentsData, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const canSave = true

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconFileText size={18} /></Avatar>
          <Text fw={700}>Edit Documents</Text>
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
          overflow: 'auto'
        }
      }}
      size="lg"
      centered
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="sm">
          <Text c="dimmed" size="sm">Update supporting evidence, landlord contract, and upload a new document.</Text>

          <Divider my="xs" />

          {/* Upload new document */}
          <Stack gap={6} style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 12, padding: 12 }}>
            <Group justify="space-between" align="center">
              <Text fw={500}>Document Upload</Text>
              {form.uploaded_url ? <Badge color="green">Ready</Badge> : <Badge color="gray">None</Badge>}
            </Group>
            {form.uploaded_url ? (
              <Group justify="space-between" align="center">
                <Anchor href={form.uploaded_url} target="_blank" rel="noopener noreferrer">Open uploaded document</Anchor>
                <ActionIcon variant="subtle" color="red" aria-label="Clear uploaded document" onClick={() => setForm((prev) => ({ ...prev, uploaded_url: null, uploaded_name: null, uploaded_type: null }))}>
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ) : (
              <Dropzone
                multiple={false}
                accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.svg, 'application/pdf']}
                maxSize={5 * 1024 ** 2}
                onDrop={async (files) => {
                  try {
                    const urls = await uploadFiles(files)
                    if (urls.length) {
                      const f = files[0]
                      setForm((prev) => ({ ...prev, uploaded_url: urls[0], uploaded_name: f?.name || 'Document', uploaded_type: f?.type || null }))
                      notifications.show({ title: 'Uploaded', message: 'Document uploaded', color: 'green' })
                    }
                  } catch (err: any) {
                    notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                  }
                }}
                onReject={(rejections) => {
                  notifications.show({ title: 'Rejected', message: `${rejections.length} file(s) rejected`, color: 'red' })
                }}
              >
                <Group justify="center" mih={84}>
                  <Dropzone.Accept>
                    <Group gap={6}><IconUpload size={16} /><Text size="sm">Drop to upload</Text></Group>
                  </Dropzone.Accept>
                  <Dropzone.Idle>
                    <Text size="sm" c="dimmed">Drag a file here, or click to select</Text>
                  </Dropzone.Idle>
                  <Dropzone.Reject>
                    <Group gap={6} c="red"><IconX size={16} /><Text size="sm">File rejected</Text></Group>
                  </Dropzone.Reject>
                </Group>
              </Dropzone>
            )}
            <Select
              label="Document type"
              placeholder="Select type"
              data={getOptions('doc_types')}
              value={form.doc_type ?? null}
              onChange={(v) => set('doc_type', v)}
              allowDeselect
              clearable
            />
          </Stack>

          <Divider my="xs" />

          {/* Supporting evidence */}
          <Text fw={600} size="sm">Supporting Evidence</Text>
          <Stack gap="sm">
            {/* Land registry upload */}
            <Stack gap={6} style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 12, padding: 12 }}>
              <Group justify="space-between" align="center">
                <Text fw={500}>Land registry</Text>
                {form.support_url ? <Badge color="green">Ready</Badge> : <Badge color="gray">None</Badge>}
              </Group>
              {form.support_url ? (
                <Group justify="space-between" align="center">
                  <Anchor href={form.support_url} target="_blank" rel="noopener noreferrer">Open land registry</Anchor>
                  <ActionIcon variant="subtle" color="red" aria-label="Clear land registry" onClick={() => setForm((prev) => ({ ...prev, support_url: null, support_name: null }))}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              ) : (
                <Dropzone
                  multiple={false}
                  accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.svg, 'application/pdf']}
                  maxSize={5 * 1024 ** 2}
                  onDrop={async (files) => {
                    try {
                      const urls = await uploadFiles(files)
                      if (urls.length) {
                        const f = files[0]
                        setForm((prev) => ({ ...prev, support_url: urls[0], support_name: f?.name || 'Document' }))
                        notifications.show({ title: 'Uploaded', message: 'Land registry uploaded', color: 'green' })
                      }
                    } catch (err: any) {
                      notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                    }
                  }}
                  onReject={(rejections) => {
                    notifications.show({ title: 'Rejected', message: `${rejections.length} file(s) rejected`, color: 'red' })
                  }}
                >
                  <Group justify="center" mih={84}>
                    <Dropzone.Accept>
                      <Group gap={6}><IconUpload size={16} /><Text size="sm">Drop to upload</Text></Group>
                    </Dropzone.Accept>
                    <Dropzone.Idle>
                      <Text size="sm" c="dimmed">Drag a file here, or click to select</Text>
                    </Dropzone.Idle>
                    <Dropzone.Reject>
                      <Group gap={6} c="red"><IconX size={16} /><Text size="sm">File rejected</Text></Group>
                    </Dropzone.Reject>
                  </Group>
                </Dropzone>
              )}
            </Stack>

            {/* Last sold date */}
            <DateInput
              label="Last sold"
              placeholder="Select date"
              value={form.last_sold ? new Date(form.last_sold) : null}
              onChange={(d) => set('last_sold', d ? dayjs(d).format('YYYY-MM-DD') : null)}
              valueFormat="YYYY-MM-DD"
              clearable
            />
          </Stack>

          <Divider my="sm" />

          {/* Landlord Contract */}
          <Text fw={600} size="sm">Landlord Contract</Text>
          <Stack gap="sm">
            {/* Contract upload */}
            <Stack gap={6} style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 12, padding: 12 }}>
              <Group justify="space-between" align="center">
                <Text fw={500}>Contract upload</Text>
                {form.contract_url ? <Badge color="green">Ready</Badge> : <Badge color="gray">None</Badge>}
              </Group>
              {form.contract_url ? (
                <Group justify="space-between" align="center">
                  <Anchor href={form.contract_url} target="_blank" rel="noopener noreferrer">Open contract</Anchor>
                  <ActionIcon variant="subtle" color="red" aria-label="Clear contract" onClick={() => setForm((prev) => ({ ...prev, contract_url: null, contract_name: null }))}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              ) : (
                <Dropzone
                  multiple={false}
                  accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.svg, 'application/pdf']}
                  maxSize={5 * 1024 ** 2}
                  onDrop={async (files) => {
                    try {
                      const urls = await uploadFiles(files)
                      if (urls.length) {
                        const f = files[0]
                        setForm((prev) => ({ ...prev, contract_url: urls[0], contract_name: f?.name || 'Contract' }))
                        notifications.show({ title: 'Uploaded', message: 'Contract uploaded', color: 'green' })
                      }
                    } catch (err: any) {
                      notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                    }
                  }}
                  onReject={(rejections) => {
                    notifications.show({ title: 'Rejected', message: `${rejections.length} file(s) rejected`, color: 'red' })
                  }}
                >
                  <Group justify="center" mih={84}>
                    <Dropzone.Accept>
                      <Group gap={6}><IconUpload size={16} /><Text size="sm">Drop to upload</Text></Group>
                    </Dropzone.Accept>
                    <Dropzone.Idle>
                      <Text size="sm" c="dimmed">Drag a file here, or click to select</Text>
                    </Dropzone.Idle>
                    <Dropzone.Reject>
                      <Group gap={6} c="red"><IconX size={16} /><Text size="sm">File rejected</Text></Group>
                    </Dropzone.Reject>
                  </Group>
                </Dropzone>
              )}
            </Stack>

            {/* Contract date */}
            <DateInput
              label="Date"
              placeholder="Select date"
              value={form.contract_date ? new Date(form.contract_date) : null}
              onChange={(d) => set('contract_date', d ? dayjs(d).format('YYYY-MM-DD') : null)}
              valueFormat="YYYY-MM-DD"
              clearable
            />
          </Stack>

          <Tooltip label="Saving updates persists to backend">
            <Text size="xs" c="dimmed">Changes will be saved to property ACF documents group.</Text>
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
        <Button onClick={() => onSave(form)} disabled={!canSave}>Save Changes</Button>
      </Group>
    </Modal>
  )
}