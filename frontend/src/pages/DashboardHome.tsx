import { Title, Text, Stack, Button, Group, Card, SimpleGrid, ThemeIcon, Badge, ScrollArea, Anchor, Loader, Image, Select } from '@mantine/core'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listProperties, type Property } from '../api/properties'
import { IconHome, IconGauge, IconCurrencyPound, IconExternalLink, IconAlertCircle, IconCalendar } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useFieldValues } from '../context/FieldValuesProvider'

function formatCurrencyGBP(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
  } catch {
    return `£${Math.round(value)}`
  }
}

function hasTenant(p: Property): boolean {
  const acf: any = p.acf ?? null
  const tg = acf?.tenants_group
  if (!tg) return false
  if (Array.isArray(tg)) return tg.length > 0
  if (typeof tg === 'object') return Object.values(tg).some(Boolean)
  return false
}

function rentMonthlyFromAcf(p: Property): number | null {
  const acf: any = p.acf ?? null
  const pg = acf?.profilegroup ?? null
  if (!pg) return null
  const raw = pg?.incoming_price ?? pg?.price ?? pg?.outgoing_price ?? null
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n)) return null
  const freqRaw = String(pg?.payment_frequency ?? pg?.incoming_payment_frequency ?? pg?.outgoing_payment_frequency ?? '').toLowerCase()
  if (freqRaw.includes('week')) return n * 4.33
  return n
}

function categoryFromAcf(p: Property): string | null {
  const acf: any = p.acf ?? null
  const pg = acf?.profilegroup ?? null
  const cat = (pg?.categories ?? acf?.categories ?? null)
  if (cat === null || cat === undefined) return null
  return String(cat)
}

// ---------- Glance helpers (mocked to work without backend) ----------
type TxType = 'incomingRent' | 'incomingCharge' | 'outgoingRent' | 'outgoingCharge'
type Status = 'Paid' | 'Pending' | 'Scheduled' | 'Overdue'
type Transaction = {
  id: string
  date: Date
  propertyName: string
  propertyType: string
  type: TxType
  amount: number
  status: Status
}

type RequestStatus = 'New' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Overdue'
type MaintenanceRequest = {
  id: string
  title: string
  status: RequestStatus
  dateReported: Date
  dueDate: Date
}

const GLANCE_PROPERTY_NAMES = ['Oak Street Residence', 'Maple Court Flats', 'River View Apartments', 'Beech House', 'Cedar Gardens', 'Willow Court']
const GLANCE_PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Flat', 'Short Lets']
const GLANCE_STATUSES: Status[] = ['Paid', 'Pending', 'Scheduled', 'Overdue']
const GLANCE_REQ_STATUSES: RequestStatus[] = ['New', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Overdue']

function generateGlanceTransactions(daysBack = 60): Transaction[] {
  const out: Transaction[] = []
  const today = new Date()
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dm = d.getDate()
    const idx = dm % GLANCE_PROPERTY_NAMES.length
    const propertyName = GLANCE_PROPERTY_NAMES[idx]
    const propertyType = GLANCE_PROPERTY_TYPES[idx % GLANCE_PROPERTY_TYPES.length]
    const rentIncoming: Transaction = {
      id: `tx-${i}-ir`,
      date: new Date(d),
      propertyName,
      propertyType,
      type: 'incomingRent',
      amount: 800 + (dm % 5) * 100,
      status: GLANCE_STATUSES[(dm + 1) % GLANCE_STATUSES.length],
    }
    // Emit a subset per day to vary distribution
    if (dm % 2 === 0) out.push(rentIncoming)
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function generateGlanceMaintenance(count = 48): MaintenanceRequest[] {
  const out: MaintenanceRequest[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const dateReported = new Date(today)
    dateReported.setDate(today.getDate() - i)
    const dm = dateReported.getDate()
    const status = GLANCE_REQ_STATUSES[(dm + i) % GLANCE_REQ_STATUSES.length]
    const dueDate = new Date(dateReported)
    dueDate.setDate(dateReported.getDate() + (dm % 7))
    out.push({
      id: `mr-${i}-${dm}`,
      title: `Maintenance ${i + 1}`,
      status,
      dateReported,
      dueDate,
    })
  }
  return out
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function computeMockNextInspection(): Date {
  const today = new Date()
  const bumpDays = 5 + (today.getDate() % 7) // 5-11 days ahead
  const d = new Date(today)
  d.setDate(today.getDate() + bumpDays)
  return d
}

export default function DashboardHome() {
  const { data, isLoading, isError } = useQuery<Property[], Error>({
    queryKey: ['dashboard-properties'],
    queryFn: () => listProperties({ page: 1, pageSize: 50, sortBy: 'updated', order: 'desc' }),
    retry: 0,
  })

  const { getOptions } = useFieldValues()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const items = data ?? []
  const total = items.length
  const occupied = items.filter(hasTenant).length
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : null
  const rents = items.map(rentMonthlyFromAcf).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const avgMonthlyRent = rents.length > 0 ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : null
  const displayItems = selectedCategory ? items.filter((p) => categoryFromAcf(p) === selectedCategory) : items

  // Glance metrics (mocked for offline/frontend-only viewing)
  const glanceTx = useMemo(() => generateGlanceTransactions(90), [])
  const glanceMaint = useMemo(() => generateGlanceMaintenance(60), [])
  const overdueRentCount = glanceTx.filter(t => t.type === 'incomingRent' && t.status === 'Overdue').length
  const overdueRepairsCount = glanceMaint.filter(r => r.status === 'Overdue').length
  const nextInspectionDate = useMemo(() => computeMockNextInspection(), [])

  return (
    <Stack p="md" gap="md" style={{ minHeight: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">Portfolio snapshot and quick actions.</Text>
        </Stack>
        <Group>
          <Button component={Link} to="/properties">View Properties</Button>
          <Button variant="light" component={Link} to="/financials">Financials</Button>
        </Group>
      </Group>

      {/* Stats row */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder p="md" radius="md" shadow="xs">
          <Group align="center" gap="sm">
            <ThemeIcon size="lg" radius="md" color="brand" variant="light"><IconHome size={20} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">Total Properties</Text>
              <Text fw={700} size="xl">{isLoading ? '…' : total}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" shadow="xs">
          <Group align="center" gap="sm">
            <ThemeIcon size="lg" radius="md" color="brand" variant="light"><IconGauge size={20} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">Occupancy Rate</Text>
              <Text fw={700} size="xl">{isLoading ? '…' : (occupancyRate !== null ? `${occupancyRate}%` : '—')}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder p="md" radius="md" shadow="xs">
          <Group align="center" gap="sm">
            <ThemeIcon size="lg" radius="md" color="brand" variant="light"><IconCurrencyPound size={20} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="sm" c="dimmed">Avg Monthly Rent</Text>
              <Text fw={700} size="xl">{isLoading ? '…' : formatCurrencyGBP(avgMonthlyRent)}</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* At a glance */}
      <Card withBorder p="md" radius="md" shadow="xs">
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={600}>At a glance</Text>
          <Badge variant="light" color="gray">Mock Data</Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card withBorder p="md" radius="md" shadow="xs">
            <Group align="center" gap="sm">
              <ThemeIcon size="lg" radius="md" color="red" variant="light"><IconCurrencyPound size={20} /></ThemeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Overdue Rents</Text>
                <Text fw={700} size="xl">{String(overdueRentCount)}</Text>
              </Stack>
            </Group>
          </Card>
          <Card withBorder p="md" radius="md" shadow="xs">
            <Group align="center" gap="sm">
              <ThemeIcon size="lg" radius="md" color="pink" variant="light"><IconAlertCircle size={20} /></ThemeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Overdue Repairs</Text>
                <Text fw={700} size="xl">{String(overdueRepairsCount)}</Text>
              </Stack>
            </Group>
          </Card>
          <Card withBorder p="md" radius="md" shadow="xs">
            <Group align="center" gap="sm">
              <ThemeIcon size="lg" radius="md" color="indigo" variant="light"><IconCalendar size={20} /></ThemeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Next Inspection</Text>
                <Text fw={700} size="xl">{formatShortDate(nextInspectionDate)}</Text>
              </Stack>
            </Group>
          </Card>
        </SimpleGrid>
      </Card>

      {/* Property spotlight — fill remaining height, no scrollbars */}
      <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Portfolio Highlights</Text>
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed">Category</Text>
            <Select
              size="xs"
              placeholder="All categories"
              data={getOptions('category')}
              value={selectedCategory}
              onChange={setSelectedCategory}
              allowDeselect
              clearable
              aria-label="Filter by category"
              style={{ minWidth: 180 }}
            />
            <Button size="xs" variant="light" component={Link} to="/properties">Browse all</Button>
          </Group>
        </Group>
        {isError ? (
          <Text c="red">Failed to load properties.</Text>
        ) : isLoading ? (
          <Loader size="sm" />
        ) : displayItems.length === 0 ? (
          <Text c="dimmed">{selectedCategory ? 'No properties for selected category.' : 'No properties available.'}</Text>
        ) : (
          <ScrollArea type="never" style={{ flex: 1, overflow: 'hidden' }} scrollbarSize={8} offsetScrollbars>
            <Group wrap="nowrap" gap="md">
              {displayItems.slice(0, 12).map((p, idx) => (
                <Card key={p.id} withBorder radius="md" shadow="sm" p={0} style={{ minWidth: 280 }}>
                  <Stack gap={0}>
                    {/* Property thumbnail: prefer backend gallery photo, fallback to picsum */}
                    <Image
                      src={propertyThumbnail(p, idx)}
                      alt={`Property preview for ${p.title}`}
                      h={120}
                      fit="cover"
                      withPlaceholder
                      imageProps={{
                        onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                          const img = e.currentTarget
                          img.src = 'https://placehold.co/800x600?text=Property'
                        },
                      }}
                    />
                    <Stack p="md" gap={6}>
                      <Group justify="space-between" align="center">
                        <Anchor component={Link} to={`/properties/${p.id}`} fw={600} style={{ color: '#2A7B88' }}>{p.title}</Anchor>
                        <Badge variant={p.published ? 'filled' : 'outline'} color={p.published ? 'green' : 'gray'}>{p.published ? 'Published' : 'Draft'}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed" lineClamp={1}>{p.address}</Text>
                      <Group justify="space-between" align="center" mt="xs">
                        <Text size="xs" c="dimmed">Updated {new Date(p.updated_at).toLocaleDateString()}</Text>
                        <Button component={Link} to={`/properties/${p.id}`} size="xs" leftSection={<IconExternalLink size={14} />}>Open</Button>
                      </Group>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Group>
          </ScrollArea>
        )}
      </Card>

      {/* Quick actions */}
      <Card withBorder p="md" radius="md" shadow="xs">
        <Group gap="sm">
          <Button component={Link} to="/properties">Manage Properties</Button>
          <Button variant="light" component={Link} to="/calendar">Open Calendar</Button>
          <Button variant="light" component={Link} to="/financials">Financials</Button>
        </Group>
      </Card>
    </Stack>
  )
}
function isHttpUrl(v: any): v is string {
  return typeof v === 'string' && /^https?:\/\//.test(v)
}

function propertyThumbnail(p: Property, seed: number): string {
  const acf: any = p.acf ?? null
  const gp: any = acf?.gallery_photos ?? null
  let urls: string[] = []
  if (Array.isArray(gp)) {
    urls = gp.filter(isHttpUrl)
  } else if (gp && typeof gp === 'object') {
    // Flatten any values that look like arrays of URLs
    const vals = Object.values(gp).flatMap((v: any) => (Array.isArray(v) ? v : []))
    urls = vals.filter(isHttpUrl)
  }
  if (urls.length > 0) return urls[0]
  // Stable placeholder source
  return `https://picsum.photos/seed/${p.id}-${seed}/800/600`
}