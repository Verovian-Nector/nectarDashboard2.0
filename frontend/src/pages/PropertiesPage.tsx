import { Title, Card, Stack, Group, Button, TextInput, Select, Pagination, Loader, Text, Grid, Badge, SegmentedControl, SimpleGrid, Anchor, ThemeIcon, Divider, Box, Tooltip } from '@mantine/core'
import { motion } from 'framer-motion'
import { variants } from '../utils/motion'
import { useQuery } from '@tanstack/react-query'
import PropertiesTable from '../components/PropertiesTable'
import { listProperties, type Property } from '../api/properties'
import { listIntegrations, type IntegrationConfig } from '../api/integrations'
import { useState } from 'react'
import { IconSearch, IconHome, IconCheck, IconClock, IconLayoutGrid, IconList, IconExternalLink, IconUser } from '@tabler/icons-react'
import CreatePropertyModal from '../components/CreatePropertyModal'
import CreateOwnerModal from '../components/CreateOwnerModal'
import { createUser, getMe } from '../api/users'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { updateProperty } from '../api/properties'
import { useFieldValues } from '../context/FieldValuesProvider'

function categoryFromAcf(p: Property): string | null {
  const acf: any = p.acf ?? null
  const pg = acf?.profilegroup ?? null
  const cat = (pg?.categories ?? acf?.categories ?? null)
  if (cat === null || cat === undefined) return null
  return String(cat)
}

export default function PropertiesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const [location, setLocation] = useState('')
  const [beds, setBeds] = useState('')
  const [sortBy, setSortBy] = useState<string | null>('updated')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const { getOptions } = useFieldValues()
  const [selectedPropertyType, setSelectedPropertyType] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const isAdmin = String(me?.role || '').toLowerCase().includes('admin')
  const perms: any = (me as any)?.permissions ?? {}
  const canCreateProperties = isAdmin || !!perms?.properties?.create
  const canCreateOwner = isAdmin || !!perms?.profile_management?.create
  const canCreateUsers = isAdmin || !!perms?.users?.create

  const { data, isLoading, isError, error, refetch } = useQuery<Property[], Error>({
    queryKey: ['properties', page, pageSize, location, beds, sortBy, order, status, selectedPropertyType],
    queryFn: () =>
      listProperties({
        page,
        pageSize: Number(pageSize),
        location: location || null,
        beds: beds ? Number(beds) : null,
        sortBy,
        order,
        status: status === 'all' || !status ? null : status,
        property_type: selectedPropertyType ?? null,
      }),
    retry: 0,
  })

  const items = data ?? []

  const { data: integrations } = useQuery<IntegrationConfig[], Error>({
    queryKey: ['integrations'],
    queryFn: () => listIntegrations(),
    retry: 0,
  })
  const locationOptions = (integrations && integrations[0] && Array.isArray((integrations[0].transforms as any)?.location_options)) ? ((integrations[0].transforms as any).location_options as string[]) : []

  const totalCount = items.length
  const publishedCount = items.filter((p) => p.published).length
  const draftCount = items.filter((p) => !p.published).length

  const searchTerm = search.trim().toLowerCase()
  const filtered = items.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.title.toLowerCase().includes(searchTerm) ||
      p.address.toLowerCase().includes(searchTerm)
    const matchesStatus =
      !status || status === 'all' ||
      (status === 'published' && p.published) ||
      (status === 'draft' && !p.published)
    const matchesCategory = !selectedCategory || categoryFromAcf(p) === selectedCategory
    const matchesPropType = !selectedPropertyType || (((p as any)?.acf?.profilegroup?.property_type ?? null) === selectedPropertyType)
    return matchesSearch && matchesStatus && matchesCategory && matchesPropType
  })

  const [ownerOpen, setOwnerOpen] = useState(false)

  return (
    <Stack p="md" gap="md">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={2}>Properties</Title>
            <Text c="dimmed" size="sm">Browse, filter, and manage your portfolio with a premium touch.</Text>
          </Stack>
          <Group gap="sm">
            {canCreateProperties && (
              <Button leftSection={<IconExternalLink size={16} />} onClick={() => setCreateOpen(true)}>
                Add Property
              </Button>
            )}
            {canCreateOwner && (
              <Button leftSection={<IconUser size={16} />} variant="light" onClick={() => setOwnerOpen(true)}>
                Add Owner
              </Button>
            )}
          </Group>
        </Group>

        <motion.div {...variants.hoverLift}>
        <Card withBorder p="sm" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Group gap="md" wrap="wrap">
            <Group gap="xs">
              <ThemeIcon size="sm" radius="md" variant="light" color="teal"><IconHome size={14} /></ThemeIcon>
              <Text fw={600}>Total</Text>
              <Badge variant="light" color="gray">{totalCount}</Badge>
            </Group>
            <Divider orientation="vertical" mx="xs"/>
            <Group gap="xs">
              <ThemeIcon size="sm" radius="md" variant="light" color="teal"><IconCheck size={14} /></ThemeIcon>
              <Text fw={600}>Published</Text>
              <Badge style={{ backgroundColor: '#2A7B88', color: '#fff' }}>{publishedCount}</Badge>
            </Group>
            <Divider orientation="vertical" mx="xs"/>
            <Group gap="xs">
              <ThemeIcon size="sm" radius="md" variant="light" color="gray"><IconClock size={14} /></ThemeIcon>
              <Text fw={600}>Drafts</Text>
              <Badge variant="outline" color="dark">{draftCount}</Badge>
            </Group>
          </Group>
        </Card>
        </motion.div>
      </Stack>

      <Card withBorder p="md" radius="md" shadow="xs">
        <Grid gutter="sm" align="end">
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <TextInput label="Search" placeholder="Search title or address" value={search} onChange={(e) => setSearch(e.currentTarget.value)} leftSection={<IconSearch size={16} />} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select label="Status" placeholder="All" value={status} onChange={setStatus} data={[{ value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select
              label="Property Type"
              placeholder="All"
              value={selectedPropertyType}
              onChange={setSelectedPropertyType}
              data={getOptions('property_type')}
              clearable
              allowDeselect
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select
              label="Category"
              placeholder="All"
              value={selectedCategory}
              onChange={setSelectedCategory}
              data={getOptions('category')}
              clearable
              allowDeselect
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <Select label="Sort by" value={sortBy} onChange={setSortBy} data={[
              { value: 'created', label: 'Created' },
              { value: 'updated', label: 'Updated' },
            ]} />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <Select label="Order" value={order} onChange={(v) => setOrder((v as 'asc' | 'desc') ?? 'asc')} data={[
              { value: 'asc', label: 'Asc' },
              { value: 'desc', label: 'Desc' },
            ]} />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <Select label="Page size" value={pageSize} onChange={(v) => setPageSize(v ?? '10')} data={['10','20','50','100'].map(v => ({ value: v, label: v }))} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            {locationOptions.length > 0 ? (
              <Select label="Location" placeholder="All" clearable value={location || null} onChange={(v) => setLocation(v ?? '')} data={locationOptions.map((v) => ({ value: v, label: v }))} />
            ) : (
              <TextInput label="Location" placeholder="e.g. London" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <TextInput label="Beds" placeholder="e.g. 2" value={beds} onChange={(e) => setBeds(e.currentTarget.value)} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
            <SegmentedControl value={view} onChange={(v) => setView(v as 'table' | 'grid')} data={[
              { value: 'table', label: (<Group gap={6}><IconList size={14} /><Text>Table</Text></Group>) as any },
              { value: 'grid', label: (<Group gap={6}><IconLayoutGrid size={14} /><Text>Grid</Text></Group>) as any },
            ]} fullWidth />
          </Grid.Col>
        </Grid>
      </Card>

      <Card withBorder p="md" radius="md" shadow="xs">
        {isLoading && (
          <Group justify="center" p="lg"><Loader /></Group>
        )}
        {!isLoading && isError && (
          <Text c="red">Failed to load properties{error?.message ? `: ${error.message}` : ''}. If auth is required, login will be wired next.</Text>
        )}
        {!isLoading && !isError && (
          view === 'table' ? (
            <PropertiesTable items={filtered} />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {filtered.length === 0 && (
                <Text c="dimmed">No properties found.</Text>
              )}
              {filtered.map((p) => {
                const pg: any = (p as any)?.acf?.profilegroup ?? {}
                const locationLabel: string | null = pg?.location ?? null
                const propertyType: string | null = pg?.property_type ?? null
                const beds: any = pg?.beds ?? null
                const baths: any = pg?.bathrooms ?? null
                const priceRaw: any = pg?.incoming_price ?? pg?.price ?? null
                const paymentFrequency: string | null = pg?.payment_frequency ?? null

                // Price label formatting
                const priceLabel = typeof priceRaw === 'number'
                  ? `£${priceRaw.toLocaleString()}`
                  : (typeof priceRaw === 'string' && priceRaw.trim() ? `£${priceRaw}` : null)
                const freqLabel = paymentFrequency ? ` • ${paymentFrequency}` : ''

                return (
                  <motion.div key={p.id} {...variants.hoverLift}>
                  <Card
                    withBorder
                    radius="md"
                    shadow="md"
                    p={0}
                    style={{
                      backgroundColor: 'var(--mantine-color-body)',
                      overflow: 'hidden',
                      borderColor: 'var(--mantine-color-default-border)',
                    }}
                  >
                    {/* Premium header banner */}
                    <Box
                      style={{
                        height: 96,
                        background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))',
                        position: 'relative',
                      }}
                    >
                      {/* Status badge overlay */}
                      <Badge
                        variant={p.published ? 'filled' : 'light'}
                        color={p.published ? 'brand' : 'gray'}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                        }}
                      >
                        {p.published ? 'Published' : 'Draft'}
                      </Badge>
                      {/* Title anchor */}
                      <Anchor
                        href={`/properties/${p.id}`}
                        fw={700}
                        style={{
                          position: 'absolute',
                          left: 16,
                          bottom: 12,
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.25)'
                        }}
                      >
                        {p.title}
                      </Anchor>
                    </Box>

                    <Stack gap="xs" p="md">
                      {/* Address / location */}
                      <Group gap={6} align="center" wrap="nowrap">
                        <ThemeIcon size="sm" radius="md" variant="light" color="brand">
                          <IconHome size={14} />
                        </ThemeIcon>
                        <Tooltip label={p.address} withArrow>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {locationLabel || p.address}
                          </Text>
                        </Tooltip>
                      </Group>

                      {/* Meta row: type, beds, baths, price */}
                      <Group gap={8} wrap="wrap" mt={4}>
                        {propertyType && (
                          <Badge variant="light" color="brand" style={{ textTransform: 'none' }}>{propertyType}</Badge>
                        )}
                        {typeof beds !== 'undefined' && beds !== null && beds !== '' && (
                          <Badge variant="light" color="brand" style={{ textTransform: 'none' }}>{String(beds)} beds</Badge>
                        )}
                        {typeof baths !== 'undefined' && baths !== null && baths !== '' && (
                          <Badge variant="light" color="brand" style={{ textTransform: 'none' }}>{String(baths)} baths</Badge>
                        )}
                        {priceLabel && (
                          <Badge variant="light" color="brand" style={{ textTransform: 'none' }}>{priceLabel}{freqLabel}</Badge>
                        )}
                      </Group>

                      <Group justify="space-between" align="center" mt="xs">
                        <Text size="xs" c="dimmed">Updated {new Date(p.updated_at).toLocaleString()}</Text>
                        <Button component={Anchor as any} href={`/properties/${p.id}`} variant="filled" size="xs">
                          Open
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                  </motion.div>
                )
              })}
            </SimpleGrid>
          )
        )}
        <Group justify="flex-end" mt="md">
          <Pagination total={50} value={page} onChange={setPage} />
        </Group>
      </Card>
      <CreatePropertyModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(p) => {
          setCreateOpen(false)
          refetch()
          navigate(`/properties/${p.id}`)
        }}
      />
      <CreateOwnerModal
        opened={ownerOpen}
        properties={items.map(p => ({ id: p.id, title: p.title, address: p.address }))}
        onClose={() => setOwnerOpen(false)}
        onCreate={async (owner) => {
          try {
            if ((owner as any).mode === 'existing') {
              const o = owner as { mode: 'existing'; propertyId: number; ownerId: number; propertyTitle: string }
              await updateProperty(o.propertyId, { owner_id: o.ownerId })
              notifications.show({ title: 'Owner assigned', message: `Assigned existing owner to ${o.propertyTitle}.`, color: 'green' })
            } else {
              const o = owner as { mode: 'new'; name: string; email: string; propertyId: number; propertyTitle: string }
              const base = o.email.split('@')[0] || o.name.trim().toLowerCase().replace(/\s+/g, '.')
              const username = `${base}`
              const tempPassword = `owner-${Math.random().toString(36).slice(2, 10)}`
              if (canCreateUsers) {
                const user = await createUser({ username, email: o.email, password: tempPassword, role: 'propertyowner' })
                notifications.show({ title: 'Owner user created', message: `User '${username}' created.`, color: 'green' })
                await updateProperty(o.propertyId, { owner_id: user.id })
                notifications.show({ title: 'Owner linked to property', message: `Linked owner to ${o.propertyTitle}.`, color: 'green' })
              } else {
                notifications.show({ title: 'Insufficient permission', message: 'users.create permission is required to create owner accounts. You can still link an existing owner.', color: 'yellow' })
              }
            }
          } catch (err: any) {
            notifications.show({ title: 'Owner assignment failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
          } finally {
            setOwnerOpen(false)
            await refetch()
          }
        }}
      />
    </Stack>
  )
}