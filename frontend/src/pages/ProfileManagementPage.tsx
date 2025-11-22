import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Box,
  Button,
  CopyButton,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { getMe, type User } from '../api/users'

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString()
}

function PermissionBadge({ allowed }: { allowed?: boolean }) {
  const color = allowed ? 'green' : 'red'
  return <Badge color={color} variant="light">{allowed ? 'Allowed' : 'Denied'}</Badge>
}

export default function ProfileManagementPage() {
  const navigate = useNavigate()
  const { data: me, isLoading, isError } = useQuery<User>({ queryKey: ['me'], queryFn: getMe })

  if (isLoading) {
    return (
      <Container size="lg" p="md">
        <Stack gap="md">
          <Skeleton height={48} radius="md" />
          <Skeleton height={160} radius="md" />
          <Skeleton height={280} radius="md" />
        </Stack>
      </Container>
    )
  }

  if (isError || !me) {
    return (
      <Container size="lg" p="md">
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm" align="start">
            <Title order={3}>Profile</Title>
            <Text c="red">Unable to load your profile. Please try again.</Text>
            <Button variant="light" onClick={() => navigate('/')}>Go to Dashboard</Button>
          </Stack>
        </Paper>
      </Container>
    )
  }

  const initial = (me.username?.[0] ?? '?').toUpperCase()
  const permissions = (me.permissions ?? {}) as Record<string, any>

  return (
    <Container size="lg" p="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Avatar radius="xl" size={48} color="brand">{initial}</Avatar>
            <Stack gap={0}>
              <Title order={3}>{me.username}</Title>
              <Group gap="xs">
                <Badge color="brand" variant="filled">{me.role}</Badge>
                <Badge variant="light" color={me.is_active ? 'green' : 'red'}>
                  {me.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Group>
            </Stack>
          </Group>
          <Group>
            <Button variant="light" onClick={() => navigate('/settings')} disabled={me.role !== 'propertyadmin'}>
              Manage Users
            </Button>
            <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
          </Group>
        </Group>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            {/* Account details */}
            <Paper p="md" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Title order={4}>Account</Title>
                  <CopyButton value={String(me.id)}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied!' : 'Copy user id'}>
                        <Button size="xs" variant="light" onClick={copy}>
                          ID: {me.id}
                        </Button>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
                <Divider my="xs" />
                <Grid>
                  <Grid.Col span={6}>
                    <Text c="dimmed" size="sm">Email</Text>
                    <Text>{me.email || '—'}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text c="dimmed" size="sm">Created</Text>
                    <Text>{formatDateTime(me.created_at)}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text c="dimmed" size="sm">Username</Text>
                    <Text>{me.username}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text c="dimmed" size="sm">Role</Text>
                    <Text>{me.role}</Text>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Paper>

            {/* Permissions matrix */}
            <Paper p="md" radius="md" withBorder mt="md">
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Title order={4}>Permissions</Title>
                  <Text c="dimmed" size="sm">Section-level CRUD access</Text>
                </Group>
                <Divider my="xs" />
                {Object.keys(permissions).length === 0 ? (
                  <Text c="dimmed">No explicit permissions set. Default access applies.</Text>
                ) : (
                  <Box>
                    <Table withTableBorder withColumnBorders striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Section</Table.Th>
                          <Table.Th>Create</Table.Th>
                          <Table.Th>Read</Table.Th>
                          <Table.Th>Update</Table.Th>
                          <Table.Th>Delete</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Object.entries(permissions).map(([section, crud]) => (
                          <Table.Tr key={section}>
                            <Table.Td>
                              <Group gap="xs">
                                <Badge variant="light" color="gray">{section}</Badge>
                              </Group>
                            </Table.Td>
                            <Table.Td><PermissionBadge allowed={crud?.create} /></Table.Td>
                            <Table.Td><PermissionBadge allowed={crud?.read} /></Table.Td>
                            <Table.Td><PermissionBadge allowed={crud?.update} /></Table.Td>
                            <Table.Td><PermissionBadge allowed={crud?.delete} /></Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            {/* Quick actions & Info */}
            <Paper p="md" radius="md" withBorder>
              <Stack gap="sm">
                <Title order={5}>Quick Actions</Title>
                <Group>
                  <Button fullWidth component={Link} to="/properties" variant="light">Manage Properties</Button>
                </Group>
                {me.role === 'propertyadmin' && (
                  <Group>
                    <Button fullWidth component={Link} to="/settings" color="brand">Admin Settings</Button>
                  </Group>
                )}
                <Divider my="xs" />
                <Text c="dimmed" size="sm">Your profile controls access across modules. Contact an administrator to request changes.</Text>
              </Stack>
            </Paper>

            <Paper p="md" radius="md" withBorder mt="md">
              <Stack gap="sm">
                <Title order={5}>Security</Title>
                <Text c="dimmed" size="sm">Password changes are managed by administrators.</Text>
                <Button variant="light" disabled>Request Password Reset</Button>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}