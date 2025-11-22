import { Title, Stack, Card, Text, Group, SegmentedControl, ActionIcon, Badge } from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconChevronsRight, IconChevronsLeft, IconCalendar } from '@tabler/icons-react'
import { useState } from 'react'

type Frequency = 'weekly' | 'monthly'

type EventType = 'incomingRent' | 'incomingCharge' | 'outgoingRent' | 'outgoingCharge'

interface CalendarEvent {
  id: string
  type: EventType
  date: Date
  title: string
  amount?: number
  propertyName: string
  tenantName: string
  propertyType: string
  incomingDate?: Date | null // start date of incoming schedule
  outgoingDate?: Date | null // start date of outgoing schedule
  incomingEndDate?: Date | null // end date for short-lets incoming schedule
  outgoingEndDate?: Date | null // end date for short-lets outgoing schedule
  status: 'Pending' | 'Paid' | 'Scheduled' | 'Overdue'
  direction: 'incoming' | 'outgoing'
  frequency: Frequency
}

function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1) {
  const d = new Date(date)
  const day = d.getDay() // 0-6 (Sun-Sat)
  const diff = weekStartsOn === 1 ? (day === 0 ? -6 : 1 - day) : -day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function monthGridStart(date: Date, weekStartsOn: 0 | 1 = 1) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  return startOfWeek(first, weekStartsOn)
}

function formatMonthYear(date: Date) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

function formatWeekRange(date: Date, weekStartsOn: 0 | 1 = 1) {
  const start = startOfWeek(date, weekStartsOn)
  const end = addDays(start, 6)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleString(undefined, { month: sameMonth ? undefined : 'short', day: 'numeric' })
  const yearLabel = end.getFullYear()
  return `${startLabel}–${endLabel}, ${yearLabel}`
}

const DOW_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const today = new Date()

  const weekStartsOn: 0 | 1 = 1 // Monday
  const label = view === 'month' ? formatMonthYear(currentDate) : formatWeekRange(currentDate, weekStartsOn)

  const handlePrev = () => {
    setCurrentDate((d) => (view === 'month' ? addMonths(d, -1) : addWeeks(d, -1)))
  }
  const handleNext = () => {
    setCurrentDate((d) => (view === 'month' ? addMonths(d, 1) : addWeeks(d, 1)))
  }

  // Build cells
  const monthStart = monthGridStart(currentDate, weekStartsOn)
  const monthCells = Array.from({ length: 42 }).map((_, i) => addDays(monthStart, i))
  const weekStart = startOfWeek(currentDate, weekStartsOn)
  const weekCells = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  const EVENT_COLORS: Record<EventType, string> = {
    incomingRent: '#1eb5fd',
    incomingCharge: '#fff82a',
    outgoingRent: '#ff4cc8',
    outgoingCharge: '#ca5cf4',
  }
  const EVENT_LABELS: Record<EventType, string> = {
    incomingRent: 'Incoming Rent',
    incomingCharge: 'Incoming Charge',
    outgoingRent: 'Outgoing Rent',
    outgoingCharge: 'Outgoing Charge',
  }
  function dateKey(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  function formatCurrency(n: number) {
    return n.toLocaleString(undefined, { style: 'currency', currency: 'GBP' })
  }
  function formatFullDate(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  function formatShortDate(d: Date) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  function differenceInDays(end: Date, start: Date) {
    const ms = end.getTime() - start.getTime()
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
  }
  function nextRecurringDate(start: Date, frequency: Frequency, ref: Date) {
    const refMid = new Date(ref)
    refMid.setHours(0, 0, 0, 0)
    let d = new Date(start)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() > refMid.getTime()) return d
    while (d.getTime() <= refMid.getTime()) {
      d = frequency === 'weekly' ? addDays(d, 7) : addMonths(d, 1)
    }
    return d
  }
  function generateMockEvents(start: Date, end: Date): CalendarEvent[] {
    const events: CalendarEvent[] = []
    let idCounter = 1
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    while (cur.getTime() <= end.getTime()) {
      const dm = cur.getDate()
      const idx = dm % PROPERTY_NAMES.length
      const propertyName = PROPERTY_NAMES[idx]
      const propertyType = PROPERTY_TYPES[idx % PROPERTY_TYPES.length]
      const tenantName = TENANT_NAMES[idx % TENANT_NAMES.length]
      const status = STATUSES[dm % STATUSES.length]
      const frequency: Frequency = (dm % 2 === 0) ? 'weekly' : 'monthly'
      const isShortLets = propertyType.toLowerCase() === 'short lets'
      const shortStayDays = 2 + (dm % 5) // 2-6 nights deterministically
      // Deterministic distribution based on day-of-month
      if (dm % 7 === 0) {
        const incStart = new Date(cur)
        const outStart = addDays(new Date(cur), 1)
        events.push({ id: String(idCounter++), type: 'incomingRent', date: new Date(cur), title: 'Rent received', amount: 1200, propertyName, tenantName, propertyType, incomingDate: incStart, incomingEndDate: isShortLets ? addDays(incStart, shortStayDays) : null, outgoingDate: outStart, outgoingEndDate: isShortLets ? addDays(outStart, shortStayDays) : null, status, direction: 'incoming', frequency })
      }
      if (dm % 6 === 0) {
        const incStart = new Date(cur)
        const outStart = addDays(new Date(cur), 1)
        events.push({ id: String(idCounter++), type: 'incomingCharge', date: new Date(cur), title: 'Service charge', amount: 75, propertyName, tenantName, propertyType, incomingDate: incStart, incomingEndDate: isShortLets ? addDays(incStart, shortStayDays) : null, outgoingDate: outStart, outgoingEndDate: isShortLets ? addDays(outStart, shortStayDays) : null, status, direction: 'incoming', frequency })
      }
      if (dm % 5 === 0) {
        const incStart = addDays(new Date(cur), -1)
        const outStart = new Date(cur)
        events.push({ id: String(idCounter++), type: 'outgoingRent', date: new Date(cur), title: 'Landlord rent payment', amount: 1100, propertyName, tenantName, propertyType, incomingDate: incStart, incomingEndDate: isShortLets ? addDays(incStart, shortStayDays) : null, outgoingDate: outStart, outgoingEndDate: isShortLets ? addDays(outStart, shortStayDays) : null, status, direction: 'outgoing', frequency })
      }
      if (dm % 4 === 0) {
        const incStart = addDays(new Date(cur), -1)
        const outStart = new Date(cur)
        events.push({ id: String(idCounter++), type: 'outgoingCharge', date: new Date(cur), title: 'Maintenance expense', amount: 140, propertyName, tenantName, propertyType, incomingDate: incStart, incomingEndDate: isShortLets ? addDays(incStart, shortStayDays) : null, outgoingDate: outStart, outgoingEndDate: isShortLets ? addDays(outStart, shortStayDays) : null, status, direction: 'outgoing', frequency })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return events
  }
  const visibleCells = view === 'month' ? monthCells : weekCells
  const visibleStart = visibleCells[0]
  const visibleEnd = visibleCells[visibleCells.length - 1]
  const mockEvents = generateMockEvents(visibleStart, visibleEnd)
  const eventsByDay: Record<string, CalendarEvent[]> = {}
  for (const e of mockEvents) {
    const k = dateKey(e.date)
    eventsByDay[k] = eventsByDay[k] || []
    eventsByDay[k].push(e)
  }
  const selectedEvents = eventsByDay[dateKey(currentDate)] ?? []

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 8,
    width: '100%',
  }
  const cellStyle: React.CSSProperties = {
    border: '1px solid var(--mantine-color-gray-3)',
    borderRadius: 8,
    padding: 8,
    minHeight: 88,
    backgroundColor: 'var(--mantine-color-body)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
  }

  function renderCell(day: Date, baseMonth: Date) {
    const outside = !isSameMonth(day, baseMonth)
    const isTodayFlag = isSameDay(day, today)
    const isSelected = isSameDay(day, currentDate)
    const bg = isSelected ? '#2A7B88' : undefined
    const color = isSelected ? '#fff' : undefined
    const borderColor = isTodayFlag ? '#2A7B88' : 'var(--mantine-color-gray-3)'
    const key = dateKey(day)
    const dayEvents = eventsByDay[key] || []
    return (
      <div
        key={day.toISOString()}
        onClick={() => setCurrentDate(day)}
        style={{
          ...cellStyle,
          border: `1px solid ${borderColor}`,
          backgroundColor: bg,
          color,
          opacity: outside ? 0.6 : 1,
        }}
      >
        <Text fw={600}>{day.getDate()}</Text>
        <Group gap={6} style={{ marginTop: 'auto' }}>
          {dayEvents.slice(0, 6).map((ev) => (
            <div key={ev.id} style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: EVENT_COLORS[ev.type], border: '1px solid rgba(0,0,0,0.08)' }} />
          ))}
        </Group>
      </div>
    )
  }

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Calendar</Title>
        <SegmentedControl value={view} onChange={(v: string) => setView(v as 'month' | 'week')} data={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]} />
      </Group>

      {/* Top section: full-width calendar with month/week toggle */}
      <Card withBorder p="md" radius="md" shadow="xs" style={{ width: '100%' }}>
        <Group justify="space-between" align="center" mb="sm">
          <Group gap={6} align="center">
            <ActionIcon variant="light" aria-label="Previous" onClick={handlePrev}>
              <IconChevronLeft size={16} />
            </ActionIcon>
            <ActionIcon variant="light" aria-label="Next" onClick={handleNext}>
              <IconChevronRight size={16} />
            </ActionIcon>
            <Text fw={700}>{label}</Text>
          </Group>
          <Text c="dimmed" size="sm">Click a date to focus; toggle view above.</Text>
        </Group>

        {/* Day-of-week header */}
        <div style={gridStyle}>
          {DOW_MON_FIRST.map((d) => (
            <div key={d} style={{ padding: 6 }}>
              <Text size="sm" fw={600} c="dimmed">{d}</Text>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ ...gridStyle, marginTop: 8 }}>
          {view === 'month'
            ? monthCells.map((day) => renderCell(day, currentDate))
            : weekCells.map((day) => renderCell(day, weekStart))}
        </div>
      </Card>

      {/* Selected date events */}
      <Card withBorder p="md" radius="md" shadow="xs">
        <Group justify="space-between" align="center" mb="md">
          <Group gap={8} align="center">
            <Text fw={700}>Events on {formatFullDate(currentDate)}</Text>
            <Badge variant="light" color="gray">{selectedEvents.length} event(s)</Badge>
          </Group>
          <Text c="dimmed" size="sm">Mock data for visualization</Text>
        </Group>
        {selectedEvents.length === 0 ? (
          <Text c="dimmed">No events for selected date.</Text>
        ) : (
          <Stack gap="sm">
            {selectedEvents.map((ev) => (
              <Card key={ev.id} withBorder radius="md" shadow="xs" p="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                <Group justify="space-between" align="center" gap="md" wrap="nowrap" style={{ overflowX: 'auto' }}>
                  <Group gap={8} align="center" style={{ minWidth: 220 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: EVENT_COLORS[ev.type], border: '1px solid rgba(0,0,0,0.12)' }} />
                    <Text fw={600}>{ev.propertyName}</Text>
                  </Group>
                  <Text size="sm" style={{ minWidth: 140 }}>{ev.tenantName}</Text>
                  <Badge variant="light" color="gray" style={{ minWidth: 100, textTransform: 'none' }}>{ev.propertyType}</Badge>
                  <Group gap={16} align="center" style={{ minWidth: 420 }}>
                    <Group gap={6} align="center">
                      <IconCalendar size={16} />
                      <Text size="sm">
                        Incoming: {(() => {
                          if (!ev.incomingDate) return '-'
                          const isShort = ev.propertyType.toLowerCase() === 'short lets'
                          const start = ev.status === 'Pending' ? currentDate : nextRecurringDate(ev.incomingDate, ev.frequency, currentDate)
                          if (isShort) {
                            const dur = ev.incomingEndDate && ev.incomingDate ? differenceInDays(ev.incomingEndDate, ev.incomingDate) : 3
                            const end = addDays(start, dur)
                            return `${formatShortDate(start)} – ${formatShortDate(end)}`
                          }
                          return formatShortDate(start)
                        })()}
                      </Text>
                    </Group>
                    <Group gap={6} align="center">
                      <IconCalendar size={16} />
                      <Text size="sm">
                        Outgoing: {(() => {
                          if (!ev.outgoingDate) return '-'
                          const isShort = ev.propertyType.toLowerCase() === 'short lets'
                          const start = ev.status === 'Pending' ? currentDate : nextRecurringDate(ev.outgoingDate, ev.frequency, currentDate)
                          if (isShort) {
                            const dur = ev.outgoingEndDate && ev.outgoingDate ? differenceInDays(ev.outgoingEndDate, ev.outgoingDate) : 3
                            const end = addDays(start, dur)
                            return `${formatShortDate(start)} – ${formatShortDate(end)}`
                          }
                          return formatShortDate(start)
                        })()}
                      </Text>
                    </Group>
                  </Group>
                  <Badge variant="light" color={ev.status === 'Paid' ? 'green' : ev.status === 'Pending' ? 'yellow' : ev.status === 'Scheduled' ? 'blue' : 'red'} style={{ minWidth: 90 }}>{ev.status}</Badge>
                  <Group gap={6} align="center" style={{ minWidth: 40 }}>
                    {ev.direction === 'incoming' ? (
                      <IconChevronsRight size={18} color="green" />
                    ) : (
                      <IconChevronsLeft size={18} color="red" />
                    )}
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  )
}
  const PROPERTY_NAMES = ['Oak Street Residence', 'Maple Court Flats', 'River View Apartments', 'Beech House', 'Cedar Gardens']
  const PROPERTY_TYPES = ['Apartment', 'House', 'Studio', 'Townhouse', 'Flat', 'Short Lets']
  const TENANT_NAMES = ['John Doe', 'Emily Clark', 'Mohammed Ali', 'Sarah Green', 'Daniel Wong', 'Jane Doe']
  const STATUSES: Array<CalendarEvent['status']> = ['Pending', 'Paid', 'Scheduled', 'Overdue']