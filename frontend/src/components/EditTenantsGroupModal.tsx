import { Modal, Stack, Group, TextInput, Divider, Button, Select, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useFieldValues } from '../context/FieldValuesProvider'

type TenantsGroup = {
  tenants_name?: string | null
  phone?: string | null
  employment_status?: string | null
  agreement_signed_date?: string | null
}

type Props = {
  opened: boolean
  data: TenantsGroup | null
  onClose: () => void
  onSave: (updated: TenantsGroup) => void
}

// Employment status options now sourced from FieldValuesProvider

export default function EditTenantsGroupModal({ opened, data, onClose, onSave }: Props) {
  const [form, setForm] = useState<TenantsGroup>({})
  useEffect(() => { setForm({ ...(data || {}) }) }, [data, opened])
  const set = (key: keyof TenantsGroup, value: any) => setForm((prev) => ({ ...prev, [key]: value }))
  const { getOptions } = useFieldValues()

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Tenant Details" size="lg" centered>
      <Stack gap="md">
        <Text c="dimmed" size="sm">Update key tenant group details.</Text>
        <Divider />
        <TextInput label="Tenant name" value={String(form.tenants_name ?? '')} onChange={(e) => set('tenants_name', e.currentTarget.value)} />
        <Group grow>
          <TextInput label="Phone" value={String(form.phone ?? '')} onChange={(e) => set('phone', e.currentTarget.value)} />
          <Select label="Employment status" data={getOptions('employment_status')} value={form.employment_status ?? null} onChange={(v) => set('employment_status', v)} allowDeselect clearable />
        </Group>
        <TextInput label="Agreement signed date" placeholder="YYYY-MM-DD" value={String(form.agreement_signed_date ?? '')} onChange={(e) => set('agreement_signed_date', e.currentTarget.value)} />

        <Divider />
        <Group justify="space-between">
          <Button variant="light" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  )
}