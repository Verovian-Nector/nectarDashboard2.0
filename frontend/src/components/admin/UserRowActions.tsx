import { useState } from 'react'
import { Tooltip, ActionIcon, Group, Popover, Select, Button } from '@mantine/core'
import { IconPencil, IconTrash, IconUser, IconDeviceFloppy, IconLock, IconUserOff } from '@tabler/icons-react'
import type { User } from '../../api/users'

type Props = {
  user: User
  onEditUser?: (user: User) => void
  onEditPerms: (user: User) => void
  onDeactivate?: (user: User) => void
  onDelete?: (user: User) => void
  onChangeRole?: (user: User, role: string) => void
  roleOptions?: string[]
}

export default function UserRowActions({ user, onEditUser, onEditPerms, onDeactivate, onDelete, onChangeRole, roleOptions }: Props) {
  const [roleOpen, setRoleOpen] = useState(false)
  const [nextRole, setNextRole] = useState<string>(user.role)

  return (
    <Group gap="xs">
      {onEditUser && (
        <Tooltip label="Edit user">
          <ActionIcon variant="light" color="brand" onClick={() => onEditUser(user)}>
            <IconPencil size={16} />
          </ActionIcon>
        </Tooltip>
      )}

      <Tooltip label="Edit permissions">
        <ActionIcon variant="light" color="gray" onClick={() => onEditPerms(user)}>
          <IconLock size={16} />
        </ActionIcon>
      </Tooltip>

      {onChangeRole && roleOptions && roleOptions.length > 0 && (
        <Popover opened={roleOpen} onChange={setRoleOpen} withinPortal>
          <Popover.Target>
            <Tooltip label="Change role">
              <ActionIcon variant="light" color="gray" onClick={() => setRoleOpen((o) => !o)}>
                <IconUser size={16} />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>
          <Popover.Dropdown>
            <Group gap="xs" wrap="nowrap">
              <Select
                value={nextRole}
                onChange={(v) => setNextRole(v || user.role)}
                data={roleOptions.map((r) => ({ value: r, label: r }))}
                size="xs"
                aria-label="Select role"
                style={{ minWidth: 160 }}
              />
              <Button size="xs" variant="light" leftSection={<IconDeviceFloppy size={14} />} onClick={() => { onChangeRole(user, nextRole); setRoleOpen(false) }}>Save</Button>
            </Group>
          </Popover.Dropdown>
        </Popover>
      )}

      {onDeactivate && (
        <Tooltip label="Deactivate user">
          <ActionIcon variant="light" color="orange" onClick={() => onDeactivate(user)}>
            <IconUserOff size={16} />
          </ActionIcon>
        </Tooltip>
      )}

      {onDelete && (
        <Tooltip label="Delete user">
          <ActionIcon variant="light" color="red" onClick={() => onDelete(user)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  )
}