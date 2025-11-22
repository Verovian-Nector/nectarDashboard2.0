import { useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  ScrollArea,
  Table,
  Text,
  Tooltip,
  TextInput,
  Select,
  SegmentedControl,
  Checkbox,
} from "@mantine/core";
import { IconLock, IconPlus, IconSearch } from "@tabler/icons-react";
import { IconTrash } from "@tabler/icons-react";
import { type User, type UserPermissions } from "../../api/users";
import UsersPermissionsEditor from "./UsersPermissionsEditor";
import CreateUserModal from "./CreateUserModal";
import UserRowActions from "./UserRowActions";

export interface Crud {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

type CreatePayload = {
  username: string;
  email: string;
  password: string;
  role: string;
};

export type UsersFilters = {
  roles: string[];
  active: 'all' | 'active' | 'inactive';
  search: string;
}

interface UsersTabProps {
  users: User[];
  usersLoading?: boolean;
  onOpenCreate: () => void;
  openEditPerms: (u: User) => void;
  editUser: User | null;
  editPerms: UserPermissions;
  setEditPerms: React.Dispatch<React.SetStateAction<UserPermissions>>;
  saveEditPerms: () => void;
  onCloseEdit: () => void;
  createOpen: boolean;
  createPayload: CreatePayload;
  setCreatePayload: React.Dispatch<React.SetStateAction<CreatePayload>>;
  creating?: boolean;
  roleOptions: string[];
  createUserSubmit: () => void;
  onCloseCreate: () => void;
  // Filters & actions
  filters: UsersFilters;
  onFiltersChange: (f: UsersFilters) => void;
  onEditUser?: (u: User) => void;
  onDeactivateUser?: (u: User) => void;
  onDeleteUser?: (u: User) => void;
  onChangeRole?: (u: User, role: string) => void;
  // Selection
  selectedIds?: Array<string | number>;
  onToggleRow?: (id: string | number, checked: boolean) => void;
  onToggleAll?: (checked: boolean) => void;
  onDeleteSelected?: () => void;
  onHardDeleteSelected?: () => void;
}

export default function UsersTab(props: UsersTabProps) {
  const {
    users,
    usersLoading = false,
    onOpenCreate,
    openEditPerms,
    editUser,
    editPerms,
    setEditPerms,
    saveEditPerms,
    onCloseEdit,
    createOpen,
    createPayload,
    setCreatePayload,
    creating = false,
    roleOptions,
    createUserSubmit,
    onCloseCreate,
    filters,
    onFiltersChange,
    onEditUser,
    onDeactivateUser,
    onDeleteUser,
    onChangeRole,
    selectedIds = [],
    onToggleRow,
    onToggleAll,
    onDeleteSelected,
    onHardDeleteSelected,
  } = props;

  const allSelected = users.length > 0 && selectedIds.length === users.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < users.length;

  const rows = useMemo(
    () =>
      users.map((u) => (
        <Table.Tr key={u.id}>
          <Table.Td width={44}>
            <Checkbox
              aria-label={`Select ${u.username}`}
              checked={selectedIds.includes(u.id)}
              onChange={(e) => onToggleRow && onToggleRow(u.id, e.currentTarget.checked)}
            />
          </Table.Td>
          <Table.Td>
            <Group gap="xs" align="center">
              <Text fw={500}>{u.username}</Text>
              {u.role && <Badge variant="light">{u.role}</Badge>}
            </Group>
          </Table.Td>
          <Table.Td>
            {u.email ? (
              <Text c="dimmed" size="sm">{u.email}</Text>
            ) : (
              <Text c="dimmed" size="sm">No email</Text>
            )}
          </Table.Td>
          <Table.Td>
            <Group justify="flex-end">
              <UserRowActions
                user={u}
                onEditPerms={openEditPerms}
                onEditUser={onEditUser}
                onDeactivate={onDeactivateUser}
                onDelete={onDeleteUser}
                onChangeRole={onChangeRole}
                roleOptions={roleOptions}
              />
            </Group>
          </Table.Td>
        </Table.Tr>
      )),
    [users, selectedIds, onToggleRow, openEditPerms, onEditUser, onDeleteUser, onChangeRole, roleOptions]
  );

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Group>
          <Badge variant="light" leftSection={<IconLock size={14} />}>Users & Permissions</Badge>
          {usersLoading && <Text size="sm" c="dimmed">Loading users…</Text>}
        </Group>
        <Group>
          {selectedIds.length > 0 && (
            <Button color="orange" variant="light" onClick={onDeleteSelected}>
              Deactivate selected ({selectedIds.length})
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={onHardDeleteSelected}>
              Delete selected ({selectedIds.length})
            </Button>
          )}
          <Button leftSection={<IconPlus size={16} />} onClick={onOpenCreate}>
            Create user
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Group mb="sm" wrap="wrap" gap="sm">
        <TextInput
          placeholder="Search username or email"
          leftSection={<IconSearch size={16} />}
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.currentTarget.value })}
          style={{ minWidth: 240 }}
        />
        <Select
          label="Role"
          placeholder="Filter by role"
          data={roleOptions}
          value={filters.roles?.[0] || null}
          onChange={(val) => onFiltersChange({ ...filters, roles: val ? [val] : [] })}
          clearable
          style={{ minWidth: 220 }}
        />
        <SegmentedControl
          value={filters.active}
          onChange={(val) => onFiltersChange({ ...filters, active: val as UsersFilters['active'] })}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
        />
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 44 }}>
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => onToggleAll && onToggleAll(e.currentTarget.checked)}
                />
              </Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>

      {/* Edit permissions modal */}
      <UsersPermissionsEditor
        opened={!!editUser}
        editUser={editUser}
        editPerms={editPerms}
        setEditPerms={setEditPerms}
        onSave={saveEditPerms}
        onClose={onCloseEdit}
      />

      {/* Create user modal */}
      <CreateUserModal
        opened={createOpen}
        payload={createPayload}
        setPayload={setCreatePayload}
        creating={creating}
        roles={roleOptions}
        onCreate={createUserSubmit}
        onClose={onCloseCreate}
      />
    </div>
  );
}