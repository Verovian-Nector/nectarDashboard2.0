import { useState } from 'react'
import { Anchor, Button, Card, Divider, Grid, Group, Image, Modal, Select, SimpleGrid, Stack, Stepper, Text, TextInput, Radio, SegmentedControl, Popover, ActionIcon } from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { DatePicker } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import RichTextArea from './RichTextArea'
import CounterInput from './CounterInput'
import { createProperty, type CreatePropertyPayload, type Property } from '../api/properties'
import { uploadFiles } from '../api/upload'
import { colorsForIncoming, colorsForOutgoing } from '../utils/paymentColors'
import { logCheckoutDate } from '../api/logs'
import { useFieldValues } from '../context/FieldValuesProvider'

type Props = {
  opened: boolean
  onClose: () => void
  onCreated?: (prop: Property) => void
}

export default function CreatePropertyModal({ opened, onClose, onCreated }: Props) {
  const [active, setActive] = useState(0)
  const [creating, setCreating] = useState(false)
  const { getOptions, locations } = useFieldValues()

  // Form state
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [postcode, setPostcode] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [location, setLocation] = useState('')
  const [beds, setBeds] = useState(0)
  const [bathrooms, setBathrooms] = useState(0)
  const [livingRooms, setLivingRooms] = useState(0)
  const [parking, setParking] = useState(0)
  const [furnished, setFurnished] = useState<'Furnished' | 'UnFurnished' | 'SemiFurnished'>('Furnished')
  const [propertyType, setPropertyType] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  // Payments & status (Step 3)
  const [incomingType, setIncomingType] = useState<'Rent' | 'Charge'>('Rent')
  const [outgoingType, setOutgoingType] = useState<'Rent' | 'Charge'>('Charge')
  const [incomingAmount, setIncomingAmount] = useState<string>('')
  const [outgoingAmount, setOutgoingAmount] = useState<string>('')
  const [incomingFreq, setIncomingFreq] = useState<string | null>(null)
  const [outgoingFreq, setOutgoingFreq] = useState<string | null>(null)
  const [incomingDate, setIncomingDate] = useState<Date | null>(null)
  const [outgoingDate, setOutgoingDate] = useState<Date | null>(null)
  const [propertyStatus, setPropertyStatus] = useState<'Vacant' | 'Occupied'>('Vacant')
  const [incomingCalendarOpen, setIncomingCalendarOpen] = useState(false)
  const [outgoingCalendarOpen, setOutgoingCalendarOpen] = useState(false)
  // Checkout date pickers (shown only when frequency === 'Daily')
  const [incomingCheckoutOpen, setIncomingCheckoutOpen] = useState(false)
  const [incomingCheckoutDate, setIncomingCheckoutDate] = useState<Date | null>(null)
  const [outgoingCheckoutOpen, setOutgoingCheckoutOpen] = useState(false)
  const [outgoingCheckoutDate, setOutgoingCheckoutDate] = useState<Date | null>(null)

  // Options now sourced from FieldValuesProvider
  const formatShortDate = (d: any) => {
    const nd = d instanceof Date ? d : (typeof d === 'string' || typeof d === 'number') ? new Date(d) : null
    return nd && !Number.isNaN(nd?.getTime?.())
      ? nd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : '-'
  }

  // Safely convert various date-like inputs to ISO string
  const toIso = (d: any): string | undefined => {
    if (!d) return undefined
    const nd = d instanceof Date ? d : (typeof d === 'string' || typeof d === 'number') ? new Date(d) : null
    return nd && !Number.isNaN(nd.getTime()) ? nd.toISOString() : undefined
  }

  async function handleCreate() {
    try {
      setCreating(true)
      const address = (location || `${houseNumber} ${postcode}`).trim() || undefined
      const toNumberOrUndefined = (val: string): number | undefined => {
        const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''))
        return Number.isFinite(n) ? n : undefined
      }
      const payload: CreatePropertyPayload = {
        title,
        content: contentHtml || undefined,
        address,
        acf: {
          profilegroup: {
            postcode: postcode || undefined,
            house_number: houseNumber || undefined,
            location: location || undefined,
            beds,
            bathrooms,
            living_rooms: livingRooms,
            parking,
            furnished,
            property_type: propertyType || undefined,
            categories: category || undefined,
            // Payments
            incoming_price: toNumberOrUndefined(incomingAmount),
            incoming_payment_frequency: incomingFreq || undefined,
            outgoing_price: toNumberOrUndefined(outgoingAmount),
            outgoing_payment_frequency: outgoingFreq || undefined,
            incoming_type: incomingType || undefined,
            outgoing_type: outgoingType || undefined,
            incoming_date: toIso(incomingDate),
            outgoing_date: toIso(outgoingDate),
            // Status
            property_status: propertyStatus || undefined,
          },
          gallery_photos: images,
        },
      }

      const created = await createProperty(payload)
      notifications.show({
        title: 'Property created',
        message: `“${created.title}” has been created successfully`,
        color: 'green',
      })
      onCreated?.(created)
      onClose()
    } catch (err: any) {
      notifications.show({
        title: 'Creation failed',
        message: err?.response?.data?.detail || err?.message || 'Error creating property',
        color: 'red',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Create Property" size="lg" centered>
      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect>
        <Stepper.Step label="Basic" description="Title & Description">
          <Stack gap="sm">
            <TextInput label="Title" placeholder="e.g., Luxury 2-bed Apartment" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required />
            <RichTextArea label="Description" value={contentHtml} onChange={setContentHtml} placeholder="Describe the property..." />
          </Stack>
        </Stepper.Step>
        <Stepper.Step label="Details" description="Specifications & Photos">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
              <TextInput label="Postcode" value={postcode} onChange={(e) => setPostcode(e.currentTarget.value)} />
              <TextInput label="House number" value={houseNumber} onChange={(e) => setHouseNumber(e.currentTarget.value)} />
              <Select label="Location" placeholder="Select" value={location || null} onChange={(value) => setLocation(value || '')} data={locations} searchable clearable allowDeselect />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <Select label="Property Type" placeholder="Select" value={propertyType} onChange={setPropertyType} data={getOptions('property_type')} clearable allowDeselect />
              <Select label="Category" placeholder="Select" value={category} onChange={setCategory} data={getOptions('category')} clearable allowDeselect />
            </SimpleGrid>
            <Divider my="xs" />
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
              <CounterInput label="Beds" value={beds} onChange={setBeds} labelAbove />
              <CounterInput label="Bathrooms" value={bathrooms} onChange={setBathrooms} labelAbove />
              <CounterInput label="Living Rooms" value={livingRooms} onChange={setLivingRooms} labelAbove />
              <CounterInput label="Parking" value={parking} onChange={setParking} labelAbove />
            </SimpleGrid>
            <Divider my="xs" />
            <Stack gap="xs">
              <Text fw={600}>Furnished</Text>
              <Group gap="sm">
                {(['Furnished', 'UnFurnished', 'SemiFurnished'] as const).map((opt) => {
                  const selected = furnished === opt
                  return (
                    <Button
                      key={opt}
                      size="sm"
                      variant={selected ? 'filled' : 'light'}
                      onClick={() => setFurnished(opt)}
                      aria-pressed={selected}
                      style={selected ? undefined : { backgroundColor: 'var(--mantine-color-gray-2)' }}
                    >
                      {opt}
                    </Button>
                  )
                })}
              </Group>
            </Stack>
            <Divider my="xs" />
            <Stack gap="xs">
              <Text fw={600}>Images</Text>
              <Dropzone multiple onDrop={async (files) => {
                try {
                  const urls = await uploadFiles(files)
                  setImages((prev) => [...prev, ...urls])
                } catch (err: any) {
                  notifications.show({ title: 'Upload failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
                }
              }}>
                <Group justify="center" py="sm">
                  <Text c="dimmed" size="sm">Drop images here, or click to select</Text>
                </Group>
              </Dropzone>
              {images.length > 0 && (
                <Card withBorder p="sm" radius="md" shadow="xs">
                  <Grid gutter="xs">
                    {images.map((url, idx) => (
                      <Grid.Col key={`${url}-${idx}`} span={{ base: 6, md: 3 }}>
                        <Image src={url} h={100} fit="cover" radius="md" alt="Uploaded" />
                      </Grid.Col>
                    ))}
                  </Grid>
                  <Text size="xs" c="dimmed" mt="xs">{images.length} image(s) uploaded</Text>
                </Card>
              )}
            </Stack>
          </Stack>
        </Stepper.Step>
        <Stepper.Step label="Payments" description="Incoming & Outgoing">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {/* Incoming */}
              <Card withBorder radius="md" p="md" style={{ backgroundColor: colorsForIncoming(incomingType).background, border: `1px solid ${colorsForIncoming(incomingType).color}` }}>
                <Stack gap="sm">
                  <Text fw={700}>Incoming</Text>
                  <Radio.Group value={incomingType} onChange={(v) => setIncomingType(v as 'Rent' | 'Charge')}>
                    <Group gap="md">
                      <Radio value="Rent" label="Rent" color={colorsForIncoming(incomingType).color} />
                      <Radio value="Charge" label="Charge" color={colorsForIncoming(incomingType).color} />
                    </Group>
                  </Radio.Group>
                  <TextInput label="Amount" placeholder="Amount" value={incomingAmount} onChange={(e) => setIncomingAmount(e.currentTarget.value)}
                    styles={{ input: { borderColor: colorsForIncoming(incomingType).color } }}
                  />
                  <Select label="Frequency" placeholder="Select" value={incomingFreq} onChange={setIncomingFreq} data={getOptions('payment_frequency')}
                    styles={{ input: { borderColor: colorsForIncoming(incomingType).color } }}
                  />
                  <Group gap="xs" align="center">
                    <Stack gap={2} align="start">
                      <Text component="div" size="sm" fw={600}>Pick date</Text>
                      <Popover opened={incomingCalendarOpen} onChange={setIncomingCalendarOpen} position="bottom-start">
                        <Popover.Target>
                          {incomingDate ? (
                            <Button
                              variant="filled"
                              component="button"
                              type="button"
                              onClick={() => setIncomingCalendarOpen((o) => !o)}
                              styles={{
                                root: {
                                  backgroundColor: colorsForIncoming(incomingType).color,
                                  borderColor: colorsForIncoming(incomingType).color,
                                  color: colorsForIncoming(incomingType).background,
                                },
                              }}
                            >
                              {formatShortDate(incomingDate)}
                            </Button>
                          ) : (
                            <ActionIcon
                              variant="light"
                              size="lg"
                              component="button"
                              type="button"
                              onClick={() => setIncomingCalendarOpen(true)}
                              aria-label="Incoming date"
                              styles={{
                                root: {
                                  backgroundColor: colorsForIncoming(incomingType).color,
                                  color: colorsForIncoming(incomingType).background,
                                },
                              }}
                            >
                              <IconCalendar size={18} />
                            </ActionIcon>
                          )}
                        </Popover.Target>
                        <Popover.Dropdown>
                          <DatePicker value={incomingDate ? incomingDate.toISOString().split('T')[0] : null} onChange={(d) => { setIncomingDate(d ? new Date(d) : null); setIncomingCalendarOpen(false) }} />
                        </Popover.Dropdown>
                      </Popover>
                    </Stack>
                    {String(incomingFreq ?? '').toLowerCase() === 'daily' && (
                      <Stack gap={2} align="start">
                        <Text component="div" size="sm" fw={600}>Checkout Date</Text>
                        <Popover opened={incomingCheckoutOpen} onChange={setIncomingCheckoutOpen} position="bottom-start">
                          <Popover.Target>
                            {incomingCheckoutDate ? (
                              <Button
                                variant="filled"
                                component="button"
                                type="button"
                                onClick={() => setIncomingCheckoutOpen((o) => !o)}
                                styles={{
                                  root: {
                                    backgroundColor: colorsForIncoming(incomingType).color,
                                    borderColor: colorsForIncoming(incomingType).color,
                                    color: colorsForIncoming(incomingType).background,
                                  },
                                }}
                              >
                                {formatShortDate(incomingCheckoutDate)}
                              </Button>
                            ) : (
                              <ActionIcon
                                variant="light"
                                size="lg"
                                component="button"
                                type="button"
                                onClick={() => setIncomingCheckoutOpen(true)}
                                aria-label="Checkout date"
                                styles={{
                                  root: {
                                    backgroundColor: colorsForIncoming(incomingType).color,
                                    color: colorsForIncoming(incomingType).background,
                                  },
                                }}
                              >
                                <IconCalendar size={18} />
                              </ActionIcon>
                            )}
                          </Popover.Target>
                          <Popover.Dropdown>
                            <DatePicker
                              value={incomingCheckoutDate ? incomingCheckoutDate.toISOString().split('T')[0] : null}
                              onChange={async (d) => {
                                setIncomingCheckoutDate(d ? new Date(d) : null)
                                setIncomingCheckoutOpen(false)
                                if (d) {
                                  try {
                                    const iso = toIso(d)
                                    if (iso) await logCheckoutDate(iso, 'incoming')
                                  } catch (err) {
                                    // Swallow logging errors to keep UI responsive
                                  }
                                }
                              }}
                            />
                          </Popover.Dropdown>
                        </Popover>
                      </Stack>
                    )}
                  </Group>
                </Stack>
              </Card>
              {/* Outgoing */}
              <Card withBorder radius="md" p="md" style={{ backgroundColor: colorsForOutgoing(outgoingType).background, border: `1px solid ${colorsForOutgoing(outgoingType).color}` }}>
                <Stack gap="sm">
                  <Text fw={700}>Outgoing</Text>
                  <Radio.Group value={outgoingType} onChange={(v) => setOutgoingType(v as 'Rent' | 'Charge')}>
                    <Group gap="md">
                      <Radio value="Rent" label="Rent" color={colorsForOutgoing(outgoingType).color} />
                      <Radio value="Charge" label="Charge" color={colorsForOutgoing(outgoingType).color} />
                    </Group>
                  </Radio.Group>
                  <TextInput label="Amount" placeholder="Amount" value={outgoingAmount} onChange={(e) => setOutgoingAmount(e.currentTarget.value)}
                    styles={{ input: { borderColor: colorsForOutgoing(outgoingType).color } }}
                  />
                  <Select label="Frequency" placeholder="Select" value={outgoingFreq} onChange={setOutgoingFreq} data={getOptions('payment_frequency')}
                    styles={{ input: { borderColor: colorsForOutgoing(outgoingType).color } }}
                  />
                  <Group gap="xs" align="center">
                    <Stack gap={2} align="start">
                      <Text component="div" size="sm" fw={600}>Pick date</Text>
                      <Popover opened={outgoingCalendarOpen} onChange={setOutgoingCalendarOpen} position="bottom-start">
                        <Popover.Target>
                          {outgoingDate ? (
                            <Button
                              variant="filled"
                              component="button"
                              type="button"
                              onClick={() => setOutgoingCalendarOpen((o) => !o)}
                              styles={{
                                root: {
                                  backgroundColor: colorsForOutgoing(outgoingType).color,
                                  borderColor: colorsForOutgoing(outgoingType).color,
                                  color: colorsForOutgoing(outgoingType).background,
                                },
                              }}
                            >
                              {formatShortDate(outgoingDate)}
                            </Button>
                          ) : (
                            <ActionIcon
                              variant="light"
                              size="lg"
                              component="button"
                              type="button"
                              onClick={() => setOutgoingCalendarOpen(true)}
                              aria-label="Outgoing date"
                              styles={{
                                root: {
                                  backgroundColor: colorsForOutgoing(outgoingType).color,
                                  color: colorsForOutgoing(outgoingType).background,
                                },
                              }}
                            >
                              <IconCalendar size={18} />
                            </ActionIcon>
                          )}
                        </Popover.Target>
                        <Popover.Dropdown>
                          <DatePicker value={outgoingDate ? outgoingDate.toISOString().split('T')[0] : null} onChange={(d) => { setOutgoingDate(d ? new Date(d) : null); setOutgoingCalendarOpen(false) }} />
                        </Popover.Dropdown>
                      </Popover>
                    </Stack>
                    {String(outgoingFreq ?? '').toLowerCase() === 'daily' && (
                      <Stack gap={2} align="start">
                        <Text component="div" size="sm" fw={600}>Checkout Date</Text>
                        <Popover opened={outgoingCheckoutOpen} onChange={setOutgoingCheckoutOpen} position="bottom-start">
                          <Popover.Target>
                            {outgoingCheckoutDate ? (
                              <Button
                                variant="filled"
                                component="button"
                                type="button"
                                onClick={() => setOutgoingCheckoutOpen((o) => !o)}
                                styles={{
                                  root: {
                                    backgroundColor: colorsForOutgoing(outgoingType).color,
                                    borderColor: colorsForOutgoing(outgoingType).color,
                                    color: colorsForOutgoing(outgoingType).background,
                                  },
                                }}
                              >
                                {formatShortDate(outgoingCheckoutDate)}
                              </Button>
                            ) : (
                              <ActionIcon
                                variant="light"
                                size="lg"
                                component="button"
                                type="button"
                                onClick={() => setOutgoingCheckoutOpen(true)}
                                aria-label="Checkout date"
                                styles={{
                                  root: {
                                    backgroundColor: colorsForOutgoing(outgoingType).color,
                                    color: colorsForOutgoing(outgoingType).background,
                                  },
                                }}
                              >
                                <IconCalendar size={18} />
                              </ActionIcon>
                            )}
                          </Popover.Target>
                          <Popover.Dropdown>
                            <DatePicker
                              value={outgoingCheckoutDate ? outgoingCheckoutDate.toISOString().split('T')[0] : null}
                              onChange={async (d) => {
                                setOutgoingCheckoutDate(d ? new Date(d) : null)
                                setOutgoingCheckoutOpen(false)
                                if (d) {
                                  try {
                                    const iso = toIso(d)
                                    if (iso) await logCheckoutDate(iso, 'outgoing')
                                  } catch (err) {
                                    // Swallow logging errors to keep UI responsive
                                  }
                                }
                              }}
                            />
                          </Popover.Dropdown>
                        </Popover>
                      </Stack>
                    )}
                  </Group>
                </Stack>
              </Card>
            </SimpleGrid>
            <Divider my="xs" />
            <Stack gap="xs">
              <Text fw={600}>Property Status</Text>
              <SegmentedControl value={propertyStatus} onChange={(v) => setPropertyStatus(v as 'Vacant' | 'Occupied')} data={[{ label: 'Vacant', value: 'Vacant' }, { label: 'Occupied', value: 'Occupied' }]} />
            </Stack>
          </Stack>
        </Stepper.Step>
        <Stepper.Completed>
          <Stack gap="xs">
            <Text>All steps complete!</Text>
          </Stack>
        </Stepper.Completed>
      </Stepper>
      <Divider my="sm" />
      {/* Sticky bottom navigation */}
      <Group
        justify="space-between"
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--mantine-color-body)',
          borderTop: '1px solid var(--mantine-color-gray-3)',
          padding: '8px',
          zIndex: 10,
        }}
      >
        <Button
          variant="light"
          onClick={() => {
            if (active === 0) return
            if (active === 2) setActive(1)
            else setActive(0)
          }}
          disabled={active === 0}
        >
          Back
        </Button>
        <Button
          onClick={() => {
            if (active === 0) setActive(1)
            else if (active === 1) setActive(2)
            else handleCreate()
          }}
          loading={creating && active === 2}
          disabled={active === 0 && !title}
        >
          {active < 2 ? 'Next' : 'Create Property'}
        </Button>
      </Group>
    </Modal>
  )
}