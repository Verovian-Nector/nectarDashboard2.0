import { Modal, Stack, SimpleGrid, Card, Text, Group, Checkbox, Button, Avatar, Paper, ScrollArea } from '@mantine/core'
import { IconDeviceFloppy, IconShield } from '@tabler/icons-react'
import { defaultCRUD, sectionKeys, withCheckbox } from '../../utils/permissions'
import type { User, UserPermissions } from '../../api/users'

interface UsersPermissionsEditorProps {
  opened: boolean
  editUser: User | null
  editPerms: UserPermissions
  setEditPerms: React.Dispatch<React.SetStateAction<UserPermissions>>
  onSave: () => void
  onClose: () => void
}

export default function UsersPermissionsEditor({ opened, editUser, editPerms, setEditPerms, onSave, onClose }: UsersPermissionsEditorProps) {
  // Display label mapping to reduce confusion
  const LABELS: Partial<Record<keyof UserPermissions, string>> = {
    inspection_group: 'inspection',
    inventory_group: 'inventory',
    documents_group: 'documents',
    // Note: key is misspelled as mainenance_group in codebase; map it intentionally
    mainenance_group: 'maintenance',
    financial_group: 'financials',
    tenants_group: 'tenants details',
    profile_management: 'owners profile',
    profilegroup: 'property overview',
    gallery_photos: 'gallery',
    // Leave other core keys as-is
    users: 'users',
    properties: 'properties',
    inventory: 'inventory',
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconShield size={18} /></Avatar>
          <Text fw={700}>Edit Permissions — {editUser?.username}</Text>
        </Group>
      }
      radius="md"
      padding="md"
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
      overlayProps={{ opacity: 0.2, blur: 2 }}
      styles={{
        header: { borderBottom: 'none' },
        title: { fontWeight: 700 },
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          paddingBottom: 72
        }
      }}
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)', paddingBottom: 72 }}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {sectionKeys().map((key) => {
              const crud = editPerms[key] || defaultCRUD()
              const label = LABELS[key] ?? String(key)
              return (
                <Card key={String(key)} withBorder p="sm" radius="md">
                  <Text fw={600} mb="xs" style={{ textTransform: 'none' }}>{label}</Text>
                  <Group gap="sm">
                    <Checkbox label="Read" checked={crud.read} onChange={(e) => setEditPerms((p) => withCheckbox(p, key, 'read', e.currentTarget.checked))} />
                    <Checkbox label="Create" checked={crud.create} onChange={(e) => setEditPerms((p) => withCheckbox(p, key, 'create', e.currentTarget.checked))} />
                    <Checkbox label="Update" checked={crud.update} onChange={(e) => setEditPerms((p) => withCheckbox(p, key, 'update', e.currentTarget.checked))} />
                    <Checkbox label="Delete" checked={crud.delete} onChange={(e) => setEditPerms((p) => withCheckbox(p, key, 'delete', e.currentTarget.checked))} />
                  </Group>
                </Card>
              )
            })}
          </SimpleGrid>
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
        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={onSave}>Save</Button>
      </Group>
    </Modal>
  )
}