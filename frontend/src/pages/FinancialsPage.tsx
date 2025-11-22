import { Title, Text, Card, Stack, Group, SimpleGrid, ThemeIcon, Badge, ScrollArea, Table, SegmentedControl, Chip } from '@mantine/core'
import { useState } from 'react'
import { DateInput } from '@mantine/dates'
import { IconCurrencyPound, IconAlertCircle, IconReceipt2, IconChartLine } from '@tabler/icons-react'

type TxType = 'incomingRent' | 'incomingCharge' | 'outgoingRent' | 'outgoingCharge'
type Direction = 'incoming' | 'outgoing'
type Status = 'Paid' | 'Pending' | 'Scheduled' | 'Overdue'

type Transaction = {
  id: string
  date: Date
  propertyName: string
  propertyType: string
  type: TxType
  direction: Direction
  amount: number
  status: Status
}

const PROPERTY_NAMES = ['Oak Street Residence', 'Maple Court Flats', 'River View Apartments', 'Beech House', 'Cedar Gardens', 'Willow Court', 'Harbor View']
const PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Flat', 'Short Lets']
const STATUSES: Status[] = ['Paid', 'Pending', 'Scheduled', 'Overdue']
const TYPE_LABELS: Record<TxType, string> = {
  incomingRent: 'Incoming Rent',
  incomingCharge: 'Incoming Charge',
  outgoingRent: 'Outgoing Rent',
  outgoingCharge: 'Outgoing Charge',
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'GBP' })
}
function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function generateTransactions(daysBack = 45): Transaction[] {
  const out: Transaction[] = []
  const today = new Date()
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dm = d.getDate()
    const idx = dm % PROPERTY_NAMES.length
    const propertyName = PROPERTY_NAMES[idx]
    const propertyType = PROPERTY_TYPES[idx % PROPERTY_TYPES.length]
    // Deterministic mix
    const rentIncoming: Transaction = {
      id: `tx-${i}-ir`,
      date: new Date(d),
      propertyName,
      propertyType,
      type: 'incomingRent',
      direction: 'incoming',
      amount: 800 + (dm % 5) * 100,
      status: STATUSES[(dm + 1) % STATUSES.length],
    }
    const chargeIncoming: Transaction = {
      id: `tx-${i}-ic`,
      date: new Date(d),
      propertyName,
      propertyType,
      type: 'incomingCharge',
      direction: 'incoming',
      amount: 50 + (dm % 3) * 25,
      status: STATUSES[(dm + 2) % STATUSES.length],
    }
    const rentOutgoing: Transaction = {
      id: `tx-${i}-or`,
      date: new Date(d),
      propertyName,
      propertyType,
      type: 'outgoingRent',
      direction: 'outgoing',
      amount: 700 + (dm % 4) * 100,
      status: STATUSES[(dm + 3) % STATUSES.length],
    }
    const chargeOutgoing: Transaction = {
      id: `tx-${i}-oc`,
      date: new Date(d),
      propertyName,
      propertyType,
      type: 'outgoingCharge',
      direction: 'outgoing',
      amount: 80 + (dm % 5) * 20,
      status: STATUSES[(dm + 4) % STATUSES.length],
    }
    // Push a varied subset per day
    if (dm % 2 === 0) out.push(rentIncoming)
    if (dm % 3 === 0) out.push(chargeIncoming)
    if (dm % 4 === 0) out.push(rentOutgoing)
    if (dm % 5 === 0) out.push(chargeOutgoing)
  }
  // Sort newest first
  return out.sort((a, b) => b.date.getTime() - a.date.getTime())
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

export default function FinancialsPage() {
  const tx = generateTransactions(180)

  type Period = 'day' | 'month' | 'quarter' | 'year' | 'range'
  const [period, setPeriod] = useState<Period>('month')
  const [refDate, setRefDate] = useState<Date | null>(new Date())
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [statusSelected, setStatusSelected] = useState<Status[]>([])

  const isRange = period === 'range'
  function normalizeDate(d: unknown): Date | null {
    if (!d) return null
    if (d instanceof Date) return d
    const nd = new Date(d as any)
    return isNaN(nd.getTime()) ? null : nd
  }
  const fd = normalizeDate(fromDate)
  const td = normalizeDate(toDate)
  const invalidRange = isRange && fd && td && fd.getTime() > td.getTime()

  function getWindow(): { start: Date; end: Date; label: string } {
    const now = new Date()
    const rd = refDate || now
    const start = new Date(rd)
    start.setHours(0, 0, 0, 0)
    const end = new Date(rd)
    end.setHours(23, 59, 59, 999)

    if (period === 'day') {
      return { start, end, label: rd.toLocaleDateString() }
    }
    if (period === 'month') {
      const s = new Date(rd.getFullYear(), rd.getMonth(), 1)
      const e = new Date(rd.getFullYear(), rd.getMonth() + 1, 0)
      e.setHours(23, 59, 59, 999)
      return { start: s, end: e, label: `${rd.toLocaleString(undefined, { month: 'long' })} ${rd.getFullYear()}` }
    }
    if (period === 'quarter') {
      const q = Math.floor(rd.getMonth() / 3) + 1
      const startMonth = (q - 1) * 3
      const endMonth = startMonth + 2
      const s = new Date(rd.getFullYear(), startMonth, 1)
      const e = new Date(rd.getFullYear(), endMonth + 1, 0)
      e.setHours(23, 59, 59, 999)
      return { start: s, end: e, label: `Q${q} ${rd.getFullYear()}` }
    }
    if (period === 'year') {
      const s = new Date(rd.getFullYear(), 0, 1)
      const e = new Date(rd.getFullYear(), 11, 31)
      e.setHours(23, 59, 59, 999)
      return { start: s, end: e, label: String(rd.getFullYear()) }
    }
    // range
    const s = fd ? new Date(fd) : new Date(2000, 0, 1)
    s.setHours(0, 0, 0, 0)
    const e = td ? new Date(td) : new Date(2100, 0, 1)
    e.setHours(23, 59, 59, 999)
    const label = invalidRange
      ? 'Invalid range'
      : fd && td
        ? `${fd.toLocaleDateString()} → ${td.toLocaleDateString()}`
        : 'Custom range'
    return { start: s, end: e, label }
  }

  const { start, end, label } = getWindow()
  const dateFiltered = invalidRange
    ? []
    : tx.filter(t => t.date.getTime() >= start.getTime() && t.date.getTime() <= end.getTime())
  const filtered = statusSelected.length > 0
    ? dateFiltered.filter(t => statusSelected.includes(t.status))
    : dateFiltered
  const totalRevenue = filtered.filter(t => t.direction === 'incoming').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.direction === 'outgoing').reduce((s, t) => s + t.amount, 0)
  const outstanding = filtered.filter(t => t.status === 'Pending' || t.status === 'Overdue').reduce((s, t) => s + t.amount, 0)
  const netIncome = totalRevenue - totalExpenses

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Financials</Title>
        <Badge variant="light" color="gray">Mock Data</Badge>
      </Group>

      {/* Filter controls */}
      <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
        <Stack gap="sm">
          <Group gap="md" align="end" wrap="wrap">
            <Stack gap={4} style={{ minWidth: 220 }}>
              <Text size="sm" c="dimmed">Period</Text>
              <SegmentedControl
                value={period}
                onChange={(v: any) => setPeriod(v)}
                data={[
                  { label: 'Day', value: 'day' },
                  { label: 'Month', value: 'month' },
                  { label: 'Quarter', value: 'quarter' },
                  { label: 'Year', value: 'year' },
                  { label: 'Range', value: 'range' },
                ]}
              />
            </Stack>
            {period === 'range' ? (
              <Stack gap={6} style={{ flex: 1 }}>
                <Group grow>
                  <DateInput
                    label="From"
                    placeholder="Pick start"
                    value={fromDate}
                    onChange={(value) => setFromDate(value ? new Date(value) : null)}
                    clearable
                    maxDate={toDate || undefined}
                    error={invalidRange && fromDate && toDate ? 'Start must be before end' : undefined}
                  />
                  <DateInput
                    label="To"
                    placeholder="Pick end"
                    value={toDate}
                    onChange={(value) => setToDate(value ? new Date(value) : null)}
                    clearable
                    minDate={fromDate || undefined}
                    error={invalidRange && fromDate && toDate ? 'End must be after start' : undefined}
                  />
                </Group>
                {invalidRange && (
                  <Text size="xs" c="red">Invalid range: “From” must be on or before “To”.</Text>
                )}
              </Stack>
            ) : (
              <DateInput label="Reference date" placeholder="Pick date" value={refDate} onChange={(value) => setRefDate(value ? new Date(value) : null)} clearable />
            )}
          </Group>
          <Group gap="xs" align="center">
            <Badge variant="light" color={invalidRange ? 'red' : 'brand'}>Applied window</Badge>
            <Text size="sm" fw={600} c={invalidRange ? 'red' : undefined}>{label}</Text>
          </Group>
        </Stack>
      </Card>

      {/* Status filter */}
      <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">Status</Text>
          <Chip.Group multiple value={statusSelected} onChange={(vals: string[]) => setStatusSelected(vals as Status[])}>
            <Group gap="xs" wrap="wrap">
              <Chip value="Paid" variant="light" color="green">Paid</Chip>
              <Chip value="Pending" variant="light" color="yellow">Pending</Chip>
              <Chip value="Scheduled" variant="light" color="blue">Scheduled</Chip>
              <Chip value="Overdue" variant="filled" color="red">Overdue</Chip>
            </Group>
          </Chip.Group>
        </Stack>
      </Card>

      {/* Premium summary row */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        {statCard('Total Revenue', formatCurrency(totalRevenue), '#2A7B88', '#58CFD8', <IconCurrencyPound size={22} color="#fff" />)}
        {statCard('Outstanding Payments', formatCurrency(outstanding), '#f59f00', '#fcc419', <IconAlertCircle size={22} color="#fff" />)}
        {statCard('Total Expenses', formatCurrency(totalExpenses), '#d6336c', '#f06595', <IconReceipt2 size={22} color="#fff" />)}
        {statCard('Net Income', formatCurrency(netIncome), '#0ca678', '#20c997', <IconChartLine size={22} color="#fff" />)}
      </SimpleGrid>

      {/* Financials per property */}
      <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={700}>Property Financials</Text>
          <Badge variant="light" color="gray">{filtered.length} record(s)</Badge>
        </Group>
        <ScrollArea h={420} type="auto">
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Property</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th align="right">Amount</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((t) => (
                <Table.Tr
                  key={t.id}
                  style={t.status === 'Overdue' ? { backgroundColor: 'var(--mantine-color-red-0)' } : undefined}
                >
                  <Table.Td>{formatDate(t.date)}</Table.Td>
                  <Table.Td>
                    <Group gap={6} align="center">
                      <ThemeIcon size={18} radius="md" color="teal" variant="light" />
                      <Text fw={600}>{t.propertyName}</Text>
                      <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>{t.propertyType}</Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={t.direction === 'incoming' ? 'teal' : 'pink'} fw={600}>{TYPE_LABELS[t.type]}</Text>
                  </Table.Td>
                  <Table.Td align="right">
                    <Text fw={700} c={t.status === 'Overdue' ? 'red' : t.direction === 'incoming' ? 'teal' : 'pink'}>
                      {formatCurrency(t.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant={t.status === 'Overdue' ? 'filled' : 'light'}
                      color={t.status === 'Paid' ? 'green' : t.status === 'Pending' ? 'yellow' : t.status === 'Scheduled' ? 'blue' : 'red'}
                    >
                      {t.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  )
}