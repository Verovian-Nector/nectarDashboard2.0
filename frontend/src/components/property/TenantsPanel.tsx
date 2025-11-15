import React from 'react'
import { Card, Group, Stack, Avatar, Text, Badge, Tooltip, ActionIcon, Divider, Grid, Title, Button, Accordion } from '@mantine/core'
import { IconPencil, IconPlus, IconFileText } from '@tabler/icons-react'
import { formatDate } from '../../utils/format'

interface TenantsPanelProps {
  tenant: any | null
  isEmpty: boolean
  canEdit: boolean
  onEdit: () => void
  onAdd: () => void
  canAdd?: boolean
}

export default function TenantsPanel({ tenant, isEmpty, canEdit, onEdit, onAdd, canAdd = true }: TenantsPanelProps) {
  const tenantsList = Array.isArray(tenant) ? tenant : (tenant ? [tenant] : [])
  const firstValue = tenantsList.length > 0 ? `tenant-0` : undefined
  const [openValues, setOpenValues] = React.useState<string[]>(firstValue ? [firstValue] : [])

  return (
    <Card withBorder p="md">
      {isEmpty || tenantsList.length === 0 ? (
        canAdd ? (
          <Group justify="center">
            <Button variant="light" leftSection={<IconPlus size={16} />} onClick={onAdd}>
              Add Tenant
            </Button>
          </Group>
        ) : null
      ) : (
        <>
          {canAdd && (
            <Group justify="flex-end" mb="sm">
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={onAdd}>
                Add Tenant
              </Button>
            </Group>
          )}
          <Accordion multiple value={openValues} onChange={(vals) => setOpenValues(firstValue ? (vals.includes(firstValue) ? vals : [firstValue, ...vals]) : vals)}>
          {tenantsList.map((t, idx) => {
            const value = `tenant-${idx}`
            return (
              <Accordion.Item key={value} value={value}>
                <Accordion.Control>
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group align="center" gap="sm">
                      <Avatar radius="xl" size={48}>{String(t?.tenants_name ?? t?.name ?? '?').charAt(0).toUpperCase()}</Avatar>
                      <Stack gap={2}>
                        <Text fw={600}>{t?.tenants_name ?? t?.name ?? 'Tenant'}</Text>
                        <Group gap="xs">
                          {t?.phone && (
                            <Badge variant="light" style={{ backgroundColor: '#fac13c', color: '#000000', fontWeight: 400 }}>
                              {t.phone}
                            </Badge>
                          )}
                          {t?.employment_status && (
                            <Badge variant="light" style={{ backgroundColor: '#fac13c', color: '#000000', fontWeight: 400 }}>
                              {t.employment_status}
                            </Badge>
                          )}
                          {t?.date_of_birth && (
                            <Badge variant="outline" style={{ backgroundColor: '#ffffff', color: '#2A7B88', borderColor: '#2A7B88' }}>
                              DOB: {formatDate(t.date_of_birth)}
                            </Badge>
                          )}
                        </Group>
                      </Stack>
                    </Group>
                    <Group align="center" gap="xs">
                      <Stack gap={2} align="flex-end">
                        <Text size="sm" c="dimmed">Agreement signed</Text>
                        <Text fw={500}>{formatDate(t?.agreement_signed_date)}</Text>
                      </Stack>
                      {canEdit && (
                        <Tooltip label="Edit tenant details">
                          <ActionIcon variant="light" color="brand" size="lg" radius="md" aria-label="Edit tenant details" onClick={onEdit}>
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Grid mt="sm">
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                        <Title order={4}>Tenant Documents</Title>
                        <Stack gap="md" mt="sm">
                          <Stack gap={4}>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={600}>Right to Rent</Text>
                              {t?.right_to_rent ? (
                                <Badge color="green">Provided</Badge>
                              ) : (
                                <Badge color="gray">Missing</Badge>
                              )}
                            </Group>
                            {t?.right_to_rent?.url && (
                              <Group gap="xs">
                                <Tooltip label="View document">
                                  <ActionIcon component="a" href={t.right_to_rent.url} target="_blank" variant="light" size="lg" radius="md" aria-label="View Right to Rent document" color="brand" style={{ cursor: 'pointer' }}>
                                    <IconFileText size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            )}
                          </Stack>

                          <Divider my="sm" />

                          <Stack gap={4}>
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={600}>Proof of ID</Text>
                              {t?.proof_of_id ? (
                                <Badge color="green">Provided</Badge>
                              ) : (
                                <Badge color="gray">Missing</Badge>
                              )}
                            </Group>
                            {t?.proof_of_id?.url && (
                              <Group gap="xs">
                                <Tooltip label="View document">
                                  <ActionIcon component="a" href={t.proof_of_id.url} target="_blank" variant="light" size="lg" radius="md" aria-label="View Proof of ID document" color="brand" style={{ cursor: 'pointer' }}>
                                    <IconFileText size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            )}
                          </Stack>
                        </Stack>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                        <Title order={4}>Contacts</Title>
                        <Stack gap="md" mt="sm">
                          <Stack gap={4}>
                            <Text size="sm" fw={600}>Emergency Contact</Text>
                            {t?.emergency_contact ? (
                              <Stack gap={2}>
                                <Text>{t.emergency_contact?.name ?? '-'}</Text>
                                <Text size="sm" c="dimmed">{t.emergency_contact?.phone ?? '-'}</Text>
                              </Stack>
                            ) : (
                              <Text c="dimmed">Not provided</Text>
                            )}
                          </Stack>

                          <Divider my="sm" />

                          <Stack gap={4}>
                            <Text size="sm" fw={600}>Guarantor</Text>
                            {t?.guarantor ? (
                              <Stack gap={2}>
                                <Text>{t.guarantor?.name ?? '-'}</Text>
                                <Text size="sm" c="dimmed">{t.guarantor?.email ?? '-'}</Text>
                                <Text size="sm" c="dimmed">{t.guarantor?.phone ?? '-'}</Text>
                              </Stack>
                            ) : (
                              <Text c="dimmed">Not provided</Text>
                            )}
                          </Stack>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Accordion.Panel>
              </Accordion.Item>
            )
          })}
          </Accordion>
        </>
      )}
    </Card>
  )
}