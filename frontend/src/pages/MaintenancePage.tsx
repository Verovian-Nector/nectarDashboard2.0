import { Title, Text, Card, Stack, Group, SimpleGrid, ThemeIcon, Badge, ScrollArea, Table, SegmentedControl, TextInput, Select, ActionIcon, Tooltip, Tabs } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMemo, useState } from 'react'
import { IconTools, IconHammer, IconAlertCircle, IconCalendar, IconClipboardList, IconPlayerPlay, IconCircleCheck, IconUser, IconCurrencyPound } from '@tabler/icons-react'
import StartMaintenanceModal from '../components/StartMaintenanceModal'
import CompleteMaintenanceModal from '../components/CompleteMaintenanceModal'
import ScheduleMaintenanceModal from '../components/ScheduleMaintenanceModal'
import { useContractors } from '../context/ContractorsProvider'

type RequestStatus = 'New' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Overdue'
type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'
type Category = 'Plumbing' | 'Electrical' | 'Heating' | 'Appliance' | 'General'

type MaintenanceRequest = {
  id: string
  title: string
  propertyName: string
  propertyType: string
  tenantName: string
  category: Category
  priority: Priority
  status: RequestStatus
  dateReported: Date
  dueDate: Date
  assignedTo?: string | null
  estimatedCost?: number | null
}

const PROPERTY_NAMES = ['Oak Street Residence', 'Maple Court Flats', 'River View Apartments', 'Beech House', 'Cedar Gardens', 'Willow Court']
const PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Flat', 'Short Lets']
const TENANT_NAMES = ['John Doe', 'Emily Clark', 'Mohammed Ali', 'Sarah Green', 'Daniel Wong', 'Jane Doe']
const CONTRACTORS = ['FixIt Co.', 'Rapid Repairs Ltd', 'Premier Plumbing', 'Bright Sparks Electrical', 'HeatFlow Services']
const CATEGORIES: Category[] = ['Plumbing', 'Electrical', 'Heating', 'Appliance', 'General']
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES: RequestStatus[] = ['New', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Overdue']

const statusColors: Record<RequestStatus, string> = {
  New: 'blue',
  Scheduled: 'indigo',
  'In Progress': 'teal',
  Completed: 'green',
  Cancelled: 'gray',
  Overdue: 'red',
}
const priorityColors: Record<Priority, string> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'orange',
  Urgent: 'red',
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'GBP' })
}
function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function readInjectedRequests(): MaintenanceRequest[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('injected-maintenance-requests') : null
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((r: any) => ({
      id: String(r.id || `injected-${Math.random()}`),
      title: String(r.title || 'New maintenance'),
      propertyName: String(r.propertyName || 'Unknown Property'),
      propertyType: String(r.propertyType || 'Flat') as any,
      tenantName: String(r.tenantName || 'Unknown Tenant'),
      category: (r.category || 'General') as Category,
      priority: (r.priority || 'Medium') as Priority,
      status: (r.status || 'New') as RequestStatus,
      dateReported: r.dateReported ? new Date(r.dateReported) : new Date(),
      dueDate: r.dueDate ? new Date(r.dueDate) : new Date(),
      assignedTo: r.assignedTo ?? null,
      estimatedCost: (typeof r.estimatedCost === 'number' ? r.estimatedCost : null),
    }))
  } catch {
    return []
  }
}

function statCard(title: string, value: string, colorFrom: string, colorTo: string, icon: React.ReactNode) {
  return (
    <Card radius="md" shadow="sm" p="md" style={{ background: `linear-gradient(135deg, ${colorFrom} 0%, ${colorTo} 100%)`, color: '#fff' }}>
      <Group justify="space-between" align="center">
        <Stack gap={4}>
          <Text size="sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</Text>
          <Text fw={800} style={{ fontSize: 24 }}>{value}</Text>
        </Stack>
        <ThemeIcon size={40} radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  )
}

function generateRequests(count = 60): MaintenanceRequest[] {
  const out: MaintenanceRequest[] = []
  const today = new Date()
  // Explicitly seed several 'New' requests so the New column always has data
  for (let i = 0; i < 6; i++) {
    const dateReported = new Date(today)
    dateReported.setDate(today.getDate() - i)
    const propertyName = PROPERTY_NAMES[i % PROPERTY_NAMES.length]
    const propertyType = PROPERTY_TYPES[i % PROPERTY_TYPES.length]
    const tenantName = TENANT_NAMES[i % TENANT_NAMES.length]
    const category = CATEGORIES[i % CATEGORIES.length]
    const priority = PRIORITIES[i % PRIORITIES.length]
    const dueDate = new Date(dateReported)
    dueDate.setDate(dateReported.getDate() + (priority === 'Urgent' ? 2 : priority === 'High' ? 4 : 7))
    out.push({
      id: `seed-new-${i}`,
      title: `${category} issue at ${propertyName.split(' ')[0]}`,
      propertyName,
      propertyType,
      tenantName,
      category,
      priority,
      status: 'New',
      dateReported,
      dueDate,
      assignedTo: null,
      estimatedCost: null,
    })
  }
  for (let i = 0; i < count; i++) {
    const dateReported = new Date(today)
    dateReported.setDate(today.getDate() - i)
    const dm = dateReported.getDate()
    const idx = dm % PROPERTY_NAMES.length
    const propertyName = PROPERTY_NAMES[idx]
    const propertyType = PROPERTY_TYPES[idx % PROPERTY_TYPES.length]
    const tenantName = TENANT_NAMES[idx % TENANT_NAMES.length]
    const category = CATEGORIES[dm % CATEGORIES.length]
    const priority = PRIORITIES[dm % PRIORITIES.length]
    const status = STATUSES[(dm + i) % STATUSES.length]
    const dueDate = new Date(dateReported)
    dueDate.setDate(dateReported.getDate() + (priority === 'Urgent' ? 2 : priority === 'High' ? 4 : 7))
    const assignedTo = (dm % 3 === 0) ? CONTRACTORS[(dm + i) % CONTRACTORS.length] : null
    const estimatedCost = 60 + (dm % 5) * 25
    out.push({
      id: `mr-${i}-${dm}`,
      title: `${category} issue at ${propertyName.split(' ')[0]}`,
      propertyName,
      propertyType,
      tenantName,
      category,
      priority,
      status,
      dateReported,
      dueDate,
      assignedTo,
      estimatedCost,
    })
  }
  return out
}

export default function MaintenancePage() {
  const { contractors } = useContractors()
  const [view, setView] = useState<'board' | 'table'>('board')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [priority, setPriority] = useState<string | null>(null)
  const [tab, setTab] = useState<string>('all')
  const [boardTab, setBoardTab] = useState<string>('new')
  const [overrides, setOverrides] = useState<Record<string, Partial<MaintenanceRequest>>>({})
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const data = useMemo(() => {
    const injected = readInjectedRequests()
    const base = generateRequests(72)
    // Place injected first so they appear prominently
    return [...injected, ...base]
  }, [])
  const mergedData = useMemo(() => data.map((r) => ({ ...r, ...(overrides[r.id] || {}) })), [data, overrides])
  const filtered = mergedData.filter((r) => {
    const q = search.trim().toLowerCase()
    const matchesText = q === '' || [r.title, r.propertyName, r.tenantName, r.propertyType].some(s => s.toLowerCase().includes(q))
    const matchesStatus = !status || status === 'All' || r.status === status
    const matchesPriority = !priority || priority === 'All' || r.priority === priority
    return matchesText && matchesStatus && matchesPriority
  })

  const openCount = filtered.filter(r => ['New', 'Scheduled', 'In Progress', 'Overdue'].includes(r.status)).length
  const overdueCount = filtered.filter(r => r.status === 'Overdue').length
  const progressCount = filtered.filter(r => r.status === 'In Progress').length
  const completedCount = filtered.filter(r => r.status === 'Completed').length

  const columns: RequestStatus[] = ['New', 'Scheduled', 'In Progress', 'Overdue', 'Completed', 'Cancelled']

  const countByStatus = useMemo(() => {
    const m: Record<RequestStatus, number> = {
      New: 0,
      Scheduled: 0,
      'In Progress': 0,
      Completed: 0,
      Cancelled: 0,
      Overdue: 0,
    }
    filtered.forEach(r => { m[r.status]++ })
    return m
  }, [filtered])

  function applyOverride(id: string, patch: Partial<MaintenanceRequest>) {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }

  const renderTable = (rows: MaintenanceRequest[]) => (
    <ScrollArea h={460} type="auto">
      <Table highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Property</Table.Th>
            <Table.Th>Tenant</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Priority</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Assigned</Table.Th>
            <Table.Th align="right">Est. Cost</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>{formatDate(r.dateReported)}</Table.Td>
              <Table.Td>
                <Group gap={6} align="center">
                  <ThemeIcon size={18} radius="md" color="teal" variant="light" />
                  <Text fw={600}>{r.propertyName}</Text>
                  <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                </Group>
              </Table.Td>
              <Table.Td>{r.tenantName}</Table.Td>
              <Table.Td><Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge></Table.Td>
              <Table.Td><Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge></Table.Td>
              <Table.Td><Badge variant="light" color={statusColors[r.status]}>{r.status}</Badge></Table.Td>
              <Table.Td>{r.assignedTo ?? <Text c="dimmed">—</Text>}</Table.Td>
              <Table.Td align="right">{r.estimatedCost ? <Text fw={700}>{formatCurrency(r.estimatedCost)}</Text> : <Text c="dimmed">—</Text>}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  )

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Repairs & Maintenance</Title>
        <Badge variant="light" color="gray">Mock Data</Badge>
      </Group>

      {/* Premium summary */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        {statCard('Open Requests', String(openCount), '#2A7B88', '#58CFD8', <IconClipboardList size={22} color="#fff" />)}
        {statCard('Overdue', String(overdueCount), '#d6336c', '#f06595', <IconAlertCircle size={22} color="#fff" />)}
        {statCard('In Progress', String(progressCount), '#0ca678', '#20c997', <IconHammer size={22} color="#fff" />)}
        {statCard('Completed', String(completedCount), '#4c6ef5', '#748ffc', <IconCircleCheck size={22} color="#fff" />)}
      </SimpleGrid>

      {/* Filters */}
      <Card withBorder p="md" radius="md" shadow="xs">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          <TextInput label="Search" placeholder="Property, tenant or issue" value={search} onChange={(e) => setSearch(e.currentTarget.value)} leftSection={<IconTools size={16} />} />
          <Select label="Status" placeholder="All" value={status} onChange={setStatus} data={[{ value: 'All', label: 'All' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
          <Select label="Priority" placeholder="All" value={priority} onChange={setPriority} data={[{ value: 'All', label: 'All' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
          <Stack gap={4}>
            <Text size="sm" c="dimmed">View</Text>
            <SegmentedControl value={view} onChange={(v: string) => setView(v as 'board' | 'table')} data={[{ value: 'board', label: 'Tabs' }, { value: 'table', label: 'Table' }]} />
          </Stack>
        </SimpleGrid>
      </Card>

      {/* Board view */}
      {view === 'board' ? (
        <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Tabs value={boardTab} onChange={(value: string | null) => setBoardTab(value || 'new')} variant="pills" color="teal">
            <Tabs.List>
              <Tabs.Tab value="new" leftSection={<IconClipboardList size={14} />}>New ({countByStatus['New']})</Tabs.Tab>
              <Tabs.Tab value="scheduled" leftSection={<IconCalendar size={14} />}>Scheduled ({countByStatus['Scheduled']})</Tabs.Tab>
              <Tabs.Tab value="in-progress" leftSection={<IconHammer size={14} />}>In Progress ({countByStatus['In Progress']})</Tabs.Tab>
              <Tabs.Tab value="overdue" leftSection={<IconAlertCircle size={14} />}>Overdue ({countByStatus['Overdue']})</Tabs.Tab>
              <Tabs.Tab value="completed" leftSection={<IconCircleCheck size={14} />}>Completed ({countByStatus['Completed']})</Tabs.Tab>
              <Tabs.Tab value="cancelled" leftSection={<IconClipboardList size={14} />}>Cancelled ({countByStatus['Cancelled']})</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="new" pt="md">
              <Stack gap="sm">
                {filtered.filter(r => r.status === 'New').length === 0 && <Text c="dimmed" size="sm">No requests.</Text>}
                {filtered.filter(r => r.status === 'New').map((r) => (
                  <Card key={r.id} withBorder p="sm" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap={6} align="center">
                          <ThemeIcon size={18} radius="md" color="teal" variant="light"><IconTools size={14} /></ThemeIcon>
                          <Text fw={600}>{r.title}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{r.propertyName} · {r.tenantName}</Text>
                        <Group gap={6}>
                          <Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                        </Group>
                        <Group gap={6} align="center">
                          <IconCalendar size={14} />
                          <Text size="xs">Due {formatDate(r.dueDate)}</Text>
                          {r.estimatedCost ? (
                            <Group gap={4} align="center">
                              <IconCurrencyPound size={14} />
                              <Text size="xs">{formatCurrency(r.estimatedCost)}</Text>
                            </Group>
                          ) : null}
                        </Group>
                        {r.assignedTo ? (
                          <Group gap={6} align="center">
                            <IconUser size={14} />
                            <Text size="xs">{r.assignedTo}</Text>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">Unassigned</Text>
                        )}
                      </Stack>
                      <Group gap={6} align="center">
                        {/* New: show Start only */}
                        <Tooltip label="Start">
                          <ActionIcon variant="light" color="teal" onClick={() => { setSelected(r); setStartOpen(true) }}><IconPlayerPlay size={16} /></ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="scheduled" pt="md">
              <Stack gap="sm">
                {filtered.filter(r => r.status === 'Scheduled').length === 0 && <Text c="dimmed" size="sm">No requests.</Text>}
                {filtered.filter(r => r.status === 'Scheduled').map((r) => (
                  <Card key={r.id} withBorder p="sm" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap={6} align="center">
                          <ThemeIcon size={18} radius="md" color="teal" variant="light"><IconTools size={14} /></ThemeIcon>
                          <Text fw={600}>{r.title}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{r.propertyName} · {r.tenantName}</Text>
                        <Group gap={6}>
                          <Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                        </Group>
                        <Group gap={6} align="center">
                          <IconCalendar size={14} />
                          <Text size="xs">Due {formatDate(r.dueDate)}</Text>
                          {r.estimatedCost ? (
                            <Group gap={4} align="center">
                              <IconCurrencyPound size={14} />
                              <Text size="xs">{formatCurrency(r.estimatedCost)}</Text>
                            </Group>
                          ) : null}
                        </Group>
                        {r.assignedTo ? (
                          <Group gap={6} align="center">
                            <IconUser size={14} />
                            <Text size="xs">{r.assignedTo}</Text>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">Unassigned</Text>
                        )}
                      </Stack>
                      <Group gap={6} align="center">
                        {/* Scheduled: show Schedule & Complete; remove Start & Assign */}
                        <Tooltip label="Schedule">
                          <ActionIcon variant="light" color="indigo" onClick={() => { setSelected(r); setScheduleOpen(true) }}><IconCalendar size={16} /></ActionIcon>
                        </Tooltip>
                        <Tooltip label="Complete">
                          <ActionIcon variant="light" color="green" onClick={() => { setSelected(r); setCompleteOpen(true) }}><IconCircleCheck size={16} /></ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="in-progress" pt="md">
              <Stack gap="sm">
                {filtered.filter(r => r.status === 'In Progress').length === 0 && <Text c="dimmed" size="sm">No requests.</Text>}
                {filtered.filter(r => r.status === 'In Progress').map((r) => (
                  <Card key={r.id} withBorder p="sm" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap={6} align="center">
                          <ThemeIcon size={18} radius="md" color="teal" variant="light"><IconTools size={14} /></ThemeIcon>
                          <Text fw={600}>{r.title}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{r.propertyName} · {r.tenantName}</Text>
                        <Group gap={6}>
                          <Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                        </Group>
                        <Group gap={6} align="center">
                          <IconCalendar size={14} />
                          <Text size="xs">Due {formatDate(r.dueDate)}</Text>
                          {r.estimatedCost ? (
                            <Group gap={4} align="center">
                              <IconCurrencyPound size={14} />
                              <Text size="xs">{formatCurrency(r.estimatedCost)}</Text>
                            </Group>
                          ) : null}
                        </Group>
                        {r.assignedTo ? (
                          <Group gap={6} align="center">
                            <IconUser size={14} />
                            <Text size="xs">{r.assignedTo}</Text>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">Unassigned</Text>
                        )}
                      </Stack>
                      <Group gap={6} align="center">
                        {/* In Progress: show Complete & Schedule; remove Assign & Start */}
                        <Tooltip label="Complete">
                          <ActionIcon variant="light" color="green" onClick={() => { setSelected(r); setCompleteOpen(true) }}><IconCircleCheck size={16} /></ActionIcon>
                        </Tooltip>
                        <Tooltip label="Schedule">
                          <ActionIcon variant="light" color="indigo" onClick={() => { setSelected(r); setScheduleOpen(true) }}><IconCalendar size={16} /></ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="overdue" pt="md">
              <Stack gap="sm">
                {filtered.filter(r => r.status === 'Overdue').length === 0 && <Text c="dimmed" size="sm">No requests.</Text>}
                {filtered.filter(r => r.status === 'Overdue').map((r) => (
                  <Card key={r.id} withBorder p="sm" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap={6} align="center">
                          <ThemeIcon size={18} radius="md" color="teal" variant="light"><IconTools size={14} /></ThemeIcon>
                          <Text fw={600}>{r.title}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{r.propertyName} · {r.tenantName}</Text>
                        <Group gap={6}>
                          <Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                        </Group>
                        <Group gap={6} align="center">
                          <IconCalendar size={14} />
                          <Text size="xs">Due {formatDate(r.dueDate)}</Text>
                          {r.estimatedCost ? (
                            <Group gap={4} align="center">
                              <IconCurrencyPound size={14} />
                              <Text size="xs">{formatCurrency(r.estimatedCost)}</Text>
                            </Group>
                          ) : null}
                        </Group>
                        {r.assignedTo ? (
                          <Group gap={6} align="center">
                            <IconUser size={14} />
                            <Text size="xs">{r.assignedTo}</Text>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">Unassigned</Text>
                        )}
                      </Stack>
                      <Group gap={6} align="center">
                        {/* Overdue: show Schedule & Complete; remove Start & Assign */}
                        <Tooltip label="Schedule">
                          <ActionIcon variant="light" color="indigo" onClick={() => { setSelected(r); setScheduleOpen(true) }}><IconCalendar size={16} /></ActionIcon>
                        </Tooltip>
                        <Tooltip label="Complete">
                          <ActionIcon variant="light" color="green" onClick={() => { setSelected(r); setCompleteOpen(true) }}><IconCircleCheck size={16} /></ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="completed" pt="md">
              <Stack gap="sm">
                {filtered.filter(r => r.status === 'Completed').length === 0 && <Text c="dimmed" size="sm">No requests.</Text>}
                {filtered.filter(r => r.status === 'Completed').map((r) => (
                  <Card key={r.id} withBorder p="sm" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap={6} align="center">
                          <ThemeIcon size={18} radius="md" color="teal" variant="light"><IconTools size={14} /></ThemeIcon>
                          <Text fw={600}>{r.title}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{r.propertyName} · {r.tenantName}</Text>
                        <Group gap={6}>
                          <Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                        </Group>
                        <Group gap={6} align="center">
                          <IconCalendar size={14} />
                          <Text size="xs">Due {formatDate(r.dueDate)}</Text>
                          {r.estimatedCost ? (
                            <Group gap={4} align="center">
                              <IconCurrencyPound size={14} />
                              <Text size="xs">{formatCurrency(r.estimatedCost)}</Text>
                            </Group>
                          ) : null}
                        </Group>
                        {r.assignedTo ? (
                          <Group gap={6} align="center">
                            <IconUser size={14} />
                            <Text size="xs">{r.assignedTo}</Text>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">Unassigned</Text>
                        )}
                      </Stack>
                      {/* Completed: no actions */}
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="cancelled" pt="md">
              <Stack gap="sm">
                {filtered.filter(r => r.status === 'Cancelled').length === 0 && <Text c="dimmed" size="sm">No requests.</Text>}
                {filtered.filter(r => r.status === 'Cancelled').map((r) => (
                  <Card key={r.id} withBorder p="sm" radius="md" shadow="xs">
                    <Group justify="space-between" align="start">
                      <Stack gap={4} style={{ maxWidth: '70%' }}>
                        <Group gap={6} align="center">
                          <ThemeIcon size={18} radius="md" color="teal" variant="light"><IconTools size={14} /></ThemeIcon>
                          <Text fw={600}>{r.title}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{r.propertyName} · {r.tenantName}</Text>
                        <Group gap={6}>
                          <Badge variant="light" color={priorityColors[r.priority]}>{r.priority}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.category}</Badge>
                          <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{r.propertyType}</Badge>
                        </Group>
                        <Group gap={6} align="center">
                          <IconCalendar size={14} />
                          <Text size="xs">Due {formatDate(r.dueDate)}</Text>
                          {r.estimatedCost ? (
                            <Group gap={4} align="center">
                              <IconCurrencyPound size={14} />
                              <Text size="xs">{formatCurrency(r.estimatedCost)}</Text>
                            </Group>
                          ) : null}
                        </Group>
                        {r.assignedTo ? (
                          <Group gap={6} align="center">
                            <IconUser size={14} />
                            <Text size="xs">{r.assignedTo}</Text>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">Unassigned</Text>
                        )}
                      </Stack>
                      {/* Cancelled: no actions */}
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Card>
      ) : (
        <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
          <Tabs value={tab} onChange={(value: string | null) => setTab(value || 'all')} variant="pills" color="teal">
            <Tabs.List>
              <Tabs.Tab value="all" leftSection={<IconClipboardList size={14} />}>All ({filtered.length})</Tabs.Tab>
              <Tabs.Tab value="new" leftSection={<IconClipboardList size={14} />}>New ({countByStatus['New']})</Tabs.Tab>
              <Tabs.Tab value="scheduled" leftSection={<IconClipboardList size={14} />}>Scheduled ({countByStatus['Scheduled']})</Tabs.Tab>
              <Tabs.Tab value="in-progress" leftSection={<IconClipboardList size={14} />}>In Progress ({countByStatus['In Progress']})</Tabs.Tab>
              <Tabs.Tab value="overdue" leftSection={<IconAlertCircle size={14} />}>Overdue ({countByStatus['Overdue']})</Tabs.Tab>
              <Tabs.Tab value="completed" leftSection={<IconCircleCheck size={14} />}>Completed ({countByStatus['Completed']})</Tabs.Tab>
              <Tabs.Tab value="cancelled" leftSection={<IconClipboardList size={14} />}>Cancelled ({countByStatus['Cancelled']})</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="all" pt="md">
              {renderTable(filtered)}
            </Tabs.Panel>
            <Tabs.Panel value="new" pt="md">
              {renderTable(filtered.filter(r => r.status === 'New'))}
            </Tabs.Panel>
            <Tabs.Panel value="scheduled" pt="md">
              {renderTable(filtered.filter(r => r.status === 'Scheduled'))}
            </Tabs.Panel>
            <Tabs.Panel value="in-progress" pt="md">
              {renderTable(filtered.filter(r => r.status === 'In Progress'))}
            </Tabs.Panel>
            <Tabs.Panel value="overdue" pt="md">
              {renderTable(filtered.filter(r => r.status === 'Overdue'))}
            </Tabs.Panel>
            <Tabs.Panel value="completed" pt="md">
              {renderTable(filtered.filter(r => r.status === 'Completed'))}
            </Tabs.Panel>
            <Tabs.Panel value="cancelled" pt="md">
              {renderTable(filtered.filter(r => r.status === 'Cancelled'))}
            </Tabs.Panel>
          </Tabs>
        </Card>
      )}
      {/* Action Modals */}
      <StartMaintenanceModal
        opened={startOpen}
        request={selected}
        assignees={contractors}
        priorities={PRIORITIES}
        onClose={() => { setStartOpen(false); setSelected(null) }}
        onConfirm={(payload) => {
          if (!selected) return
          const patch: Partial<MaintenanceRequest> = { status: 'In Progress' }
          if (payload.assignee !== undefined) patch.assignedTo = payload.assignee
          if (payload.priority) patch.priority = payload.priority as Priority
          applyOverride(selected.id, patch)
          notifications.show({ title: 'Work started', message: `${selected.title} is now In Progress`, color: 'teal' })
          setStartOpen(false)
          setSelected(null)
        }}
      />
      <CompleteMaintenanceModal
        opened={completeOpen}
        request={selected}
        onClose={() => { setCompleteOpen(false); setSelected(null) }}
        onConfirm={(payload) => {
          if (!selected) return
          const patch: Partial<MaintenanceRequest> = { status: 'Completed' }
          if (payload.actualCost !== null && Number.isFinite(payload.actualCost)) patch.estimatedCost = payload.actualCost
          applyOverride(selected.id, patch)
          notifications.show({ title: 'Marked completed', message: `${selected.title} marked Completed`, color: 'green' })
          setCompleteOpen(false)
          setSelected(null)
        }}
      />
      <ScheduleMaintenanceModal
        opened={scheduleOpen}
        request={selected}
        assignees={contractors}
        priorities={PRIORITIES}
        onClose={() => { setScheduleOpen(false); setSelected(null) }}
        onConfirm={(payload) => {
          if (!selected) return
          const patch: Partial<MaintenanceRequest> = { status: 'Scheduled' }
          if (payload.assignee !== undefined) patch.assignedTo = payload.assignee
          if (payload.scheduledDate) patch.dueDate = payload.scheduledDate
          if (payload.priority) patch.priority = payload.priority as Priority
          applyOverride(selected.id, patch)
          notifications.show({ title: 'Scheduled', message: `${selected.title} scheduled for ${payload.scheduledDate ? payload.scheduledDate.toLocaleDateString() : 'selected date'}`, color: 'indigo' })
          setScheduleOpen(false)
          setSelected(null)
        }}
      />
    </Stack>
  )
}