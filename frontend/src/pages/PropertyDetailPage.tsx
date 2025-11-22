import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProperty, updateProperty, type PropertyDetail, type InventoryRoom, type InventoryItem } from '../api/properties'
import { getMe, createUser } from '../api/users'
import { Title, Badge, Group, Stack, Card, Text, Tabs, Grid, Loader, Anchor, Table, SimpleGrid, Image, Accordion, ActionIcon, Avatar, Divider, Tooltip, ThemeIcon, Button } from '@mantine/core'
import classes from './PropertyDetailPage.module.css'
import { IconReceipt, IconUser, IconTools, IconCalendar, IconAlertTriangle, IconGauge, IconNote, IconHome, IconBuilding, IconClipboardList, IconPhone, IconCurrencyPound, IconChartLine, IconCreditCard, IconFileText, IconClock, IconCircleCheck, IconPencil, IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import React, { useEffect, useState } from 'react'
import { formatDate, formatCurrency } from '../utils/format'
import { isEmptyObject } from '../utils/object'
import EditOverviewModal from '../components/EditOverviewModal'
import EditGalleryModal from '../components/EditGalleryModal'
import EditOwnerProfileModal from '../components/EditOwnerProfileModal'
import EditTenantModal from '../components/EditTenantModal'
import EditFinancialsModal from '../components/EditFinancialsModal'
import CreateInventoryRoomModal from '../components/CreateInventoryRoomModal'
import EditInventoryRoomModal from '../components/EditInventoryRoomModal'
import CreateInventoryItemModal from '../components/CreateInventoryItemModal'
import EditInventoryItemModal from '../components/EditInventoryItemModal'
import EditDocumentsModal from '../components/EditDocumentsModal'
import EditMaintenanceModal from '../components/EditMaintenanceModal'
import EditInspectionsModal from '../components/EditInspectionsModal'
import CreateOwnerModal from '../components/CreateOwnerModal'
import CreateTenantModal from '../components/CreateTenantModal'
import TenantsPanel from '../components/property/TenantsPanel'
import PropertyHeader from '../components/property/PropertyHeader'
import PropertyOverviewPanel from '../components/property/PropertyOverviewPanel'
// Removed local upload controls from page; uploads now handled in EditDocumentsModal

// Icons use global theme overrides (BrandingProvider) — no local hardcodes

// Tabs styling moved to CSS module to avoid inline nested selector warnings

function MonochromeIcon({ size = 'lg', children }: { size?: number | string, children: React.ReactElement }) {
  return (
    <ThemeIcon variant="light" size={size} radius="md">
      {children}
    </ThemeIcon>
  )
}

export default function PropertyDetailPage() {
  const { id } = useParams()
  const propertyId = Number(id)
  const { data, isLoading } = useQuery<PropertyDetail, Error>({
    queryKey: ['property', propertyId],
    queryFn: () => getProperty(propertyId),
    enabled: Number.isFinite(propertyId) && propertyId > 0,
  })
  // Fetch current user to determine permissions for edit visibility
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const queryClient = useQueryClient()
  // Document uploads moved to EditDocumentsModal; page now displays only uploaded results
  // Mock toggle: opt-in only via env, no default
  const rawEnvMocks = (import.meta as any)?.env?.VITE_USE_MOCKS
  const USE_MOCKS = rawEnvMocks === 'true'
  const IS_DEV = (import.meta as any)?.env?.DEV === true


  // Decide base payload and optionally overlay missing sections with mocks
  let usedMockFallback = false
  let base: PropertyDetail | null = data ?? null
  if (!base) {
    base = getMockProperty()
    usedMockFallback = true
  }
  const overlayed = USE_MOCKS ? overlayMissingSections(base, getMockProperty()) : base
  const p: PropertyDetail = overlayed
  const hadMissing = !!data && (
    isEmptyObject(data.tenant_info) ||
    isEmptyObject(data.financial_info) ||
    !data.inventory || (Array.isArray((data as any)?.inventory?.rooms) && ((data as any).inventory.rooms.length === 0)) ||
    !(data.documents && data.documents.length > 0) ||
    !(data.maintenance_records && data.maintenance_records.length > 0) ||
    isEmptyObject(data.inspections) ||
    isEmptyObject((data as any)?.acf?.tenants_group)
  )
  const isMocked = usedMockFallback || (USE_MOCKS && hadMissing)
  const tenantGroup: any = (p.tenant_info ?? (p.acf as any)?.tenants_group ?? null)
  const isTenantEmpty = !tenantGroup || isEmptyObject(tenantGroup)

  // Per-section mocked flags (compare base vs post-overlay p)
  const baseAcfTenant = (base as any)?.acf?.tenants_group
  const baseAcfProfile = (base as any)?.acf?.profile_management
  const tenantMocked = USE_MOCKS && !baseAcfTenant && isEmptyObject(base.tenant_info) && !!((p as any)?.acf?.tenants_group || p.tenant_info)
  const financialsMocked = USE_MOCKS && isEmptyObject(base.financial_info) && !isEmptyObject(p.financial_info)
  const inventoryMocked = USE_MOCKS && (!base.inventory || (Array.isArray(base.inventory?.rooms) && (base.inventory?.rooms?.length ?? 0) === 0)) && !!p.inventory && Array.isArray(p.inventory.rooms) && p.inventory.rooms.length > 0
  const documentsMocked = USE_MOCKS && (!(base.documents && base.documents.length > 0)) && !!(p.documents && p.documents.length > 0)
  const maintenanceMocked = USE_MOCKS && (!(base.maintenance_records && base.maintenance_records.length > 0)) && !!(p.maintenance_records && p.maintenance_records.length > 0)
  const inspectionsMocked = USE_MOCKS && isEmptyObject(base.inspections) && !isEmptyObject(p.inspections)
  const profileMocked = USE_MOCKS && isEmptyObject(baseAcfProfile) && !isEmptyObject((p as any)?.acf?.profile_management)

  const mockedSections = [
    tenantMocked && 'tenants',
    financialsMocked && 'financials',
    inventoryMocked && 'inventory',
    documentsMocked && 'documents',
    maintenanceMocked && 'maintenance',
    inspectionsMocked && 'inspections',
    profileMocked && 'acf.profile_management',
  ].filter(Boolean) as string[]

  const mockedSummary = mockedSections.join(', ')
  useEffect(() => {
    if (!IS_DEV) return
    if (USE_MOCKS) {
      console.log(`[PropertyDetail] USE_MOCKS=true · mockedSections=${mockedSummary || 'none'} · raw=${String(rawEnvMocks)}`)
    }
    if (rawEnvMocks === undefined) {
      console.warn('[PropertyDetail] VITE_USE_MOCKS not found; mocks disabled by default')
    }
  }, [USE_MOCKS, mockedSummary, p?.id, rawEnvMocks, IS_DEV])

  // Permission helper: show edit when user has update rights in any of the given keys
  const isAdmin = String((me as any)?.role || '').toLowerCase().includes('admin')
  const canUpdate = (...keys: string[]) => {
    if (isAdmin) return true
    const perms = (me as any)?.permissions ?? null
    if (!perms) return false
    return keys.some((k) => Boolean(perms?.[k]?.update))
  }
  // Permission helper: show section when user has read rights in any of the given keys
  const canRead = (...keys: string[]) => {
    if (isAdmin) return true
    const perms = (me as any)?.permissions ?? null
    if (!perms) return false
    return keys.some((k) => Boolean(perms?.[k]?.read))
  }
  // Permission helper: show create when user has create rights in any of the given keys
  const canCreate = (...keys: string[]) => {
    if (isAdmin) return true
    const perms = (me as any)?.permissions ?? null
    if (!perms) return false
    return keys.some((k) => Boolean(perms?.[k]?.create))
  }

  // Modal open state
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [tenantsOpen, setTenantsOpen] = useState(false)
  const [createTenantOpen, setCreateTenantOpen] = useState(false)
  const [extraTenants, setExtraTenants] = useState<any[]>([])
  const [financialsOpen, setFinancialsOpen] = useState(false)
  const [financialsOverride, setFinancialsOverride] = useState<any>({})
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [createItemOpen, setCreateItemOpen] = useState(false)
  const [createItemRoomId, setCreateItemRoomId] = useState<number | null>(null)
  const [createdItems, setCreatedItems] = useState<Record<number, any[]>>({})
  const [createdRooms, setCreatedRooms] = useState<InventoryRoom[]>([])
  const [editRoomOpen, setEditRoomOpen] = useState(false)
  const [editRoomRoomId, setEditRoomRoomId] = useState<number | null>(null)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editItemRoomId, setEditItemRoomId] = useState<number | null>(null)
  const [editItemItemId, setEditItemItemId] = useState<number | null>(null)
  const [roomOverrides, setRoomOverrides] = useState<Record<number, Partial<InventoryRoom>>>({})
  const [itemOverrides, setItemOverrides] = useState<Record<number, Partial<InventoryItem>>>({})
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [inspectionsOpen, setInspectionsOpen] = useState(false)
  const [createOwnerOpen, setCreateOwnerOpen] = useState(false)

  // Initial modal payloads (derived from current property data)
  const acf: any = (p as any)?.acf ?? {}
  const overviewInitial = {
    postcode: acf?.profilegroup?.postcode ?? null,
    house_number: acf?.profilegroup?.house_number ?? null,
    location: acf?.profilegroup?.location ?? p.address ?? null,
    payment_frequency: acf?.profilegroup?.payment_frequency ?? acf?.profilegroup?.incoming_payment_frequency ?? acf?.profilegroup?.outgoing_payment_frequency ?? null,
    price: acf?.profilegroup?.incoming_price ?? acf?.profilegroup?.price ?? acf?.profilegroup?.outgoing_price ?? null,
    furnished: acf?.profilegroup?.furnished ?? null,
    property_type: acf?.profilegroup?.property_type ?? null,
    marketing_status: acf?.profilegroup?.marketing_status ?? acf?.profilegroup?.property_status ?? null,
    beds: acf?.profilegroup?.beds ?? null,
    bathrooms: acf?.profilegroup?.bathrooms ?? null,
    living_rooms: acf?.profilegroup?.living_rooms ?? null,
    parking: acf?.profilegroup?.parking ?? null,
  }

  const inventoryPhotos: string[] = Array.isArray(p?.inventory?.rooms)
    ? p.inventory!.rooms.flatMap((r) => r.items).flatMap((it) => it.photos ?? []).filter((src): src is string => typeof src === 'string')
    : []
  const galleryInitial: string[] = Array.isArray((acf as any)?.gallery_photos)
    ? ((acf as any).gallery_photos as any[]).map(String)
    : inventoryPhotos

  const ownerInitial = {
    firstname: acf?.profile_management?.firstname ?? null,
    lastname: acf?.profile_management?.lastname ?? null,
    email: acf?.profile_management?.email ?? null,
    phone: acf?.profile_management?.phone ?? acf?.profile_management?.telephone ?? acf?.profile_management?.mobile ?? null,
  }

  const financialsInitial = {
    rent_to_landlord: (p as any)?.financial_info?.rent ?? (acf as any)?.financial_group?.rent_to_landord ?? null,
    rent_yield: (acf as any)?.financial_group?.rent_yeild ?? null,
    collection_date: (p as any)?.financial_info?.collection_date ?? (acf as any)?.financial_group?.collection_date ?? null,
    payment_date: (acf as any)?.financial_group?.payment_date ?? null,
    payment_method: (p as any)?.financial_info?.payment_method ?? (acf as any)?.financial_group?.payment_method ?? null,
  }


  const allRooms = Array.isArray(p?.inventory?.rooms) ? [...p!.inventory!.rooms, ...createdRooms] : []
  const selectedRoomForCreate = allRooms.find((r) => r.id === createItemRoomId) ?? null
  const selectedRoomForEditRoom = allRooms.find((r) => r.id === editRoomRoomId) ?? null
  const selectedRoomForEditItem = allRooms.find((r) => r.id === editItemRoomId) ?? null
  const selectedItemForEdit = selectedRoomForEditItem
    ? ([...selectedRoomForEditItem.items, ...((createdItems[selectedRoomForEditItem.id] ?? []) as any[])]
        .find((it: any) => it?.id === editItemItemId) ?? null)
    : null
  const selectedItemIsCreated = selectedRoomForEditItem
    ? ((createdItems[selectedRoomForEditItem.id] ?? []).some((it: any) => it?.id === editItemItemId))
    : false

  const acfDocs: any = (acf as any)?.documents_group_full ?? {}
  const documentsInitial = {
    support_name: acfDocs?.supporting_evidence?.land_registry?.filename ?? null,
    support_url: acfDocs?.supporting_evidence?.land_registry?.url ?? null,
    last_sold: acfDocs?.supporting_evidence?.last_sold ?? null,
    contract_name: acfDocs?.landlord_contract?.land_contract?.filename ?? null,
    contract_url: acfDocs?.landlord_contract?.land_contract?.url ?? null,
    contract_date: acfDocs?.landlord_contract?.date ?? null,
    uploaded_url: acfDocs?.documents?.document_upload?.url ?? null,
    uploaded_name: acfDocs?.documents?.document_upload?.filename ?? null,
    doc_type: acfDocs?.documents?.type ?? null,
  }

  const inspObj: any = p?.inspections ?? {}
  const inspectionsInitial = {
    count: typeof inspObj?.schedule_count === 'number' ? inspObj.schedule_count : null,
    frequency: inspObj?.schedule_frequency ?? null,
    start_date: inspObj?.schedule_start_date ?? null,
    next_inspection_date: inspObj?.next_inspection_date ?? null,
    inspector_id: null,
    inspector_name: inspObj?.inspector ?? null,
    status: inspObj?.status ?? null,
  }

  const acfMaintObj: any = (acf as any)?.mainenance_group ?? {}
  const maintenanceInitial = {
    where: acfMaintObj?.where ?? null,
    what: acfMaintObj?.what ?? null,
    payable_by: acfMaintObj?.payable_by ?? null,
    contractor_supplied_by: acfMaintObj?.contractor_supplied_by ?? null,
    priority: null,
    notes: null,
  }

  // Early returns MUST come after hooks to preserve hook order across renders
  if (!id || !Number.isFinite(propertyId)) {
    return (
      <Stack p="md">
        <Title order={3}>Invalid property id</Title>
        <Anchor component={Link} to="/properties">Back to properties</Anchor>
      </Stack>
    )
  }

  if (isLoading) {
    return (
      <Stack p="md" align="center">
        <Loader />
        <Text c="dimmed">Loading property…</Text>
      </Stack>
    )
  }

  return (
    <Stack p="md" gap="md">
      <PropertyHeader
        title={p.title}
        published={p.published}
        isMocked={isMocked}
        useMocks={USE_MOCKS}
        tenantSourceText={
          USE_MOCKS
            ? `Debug — USE_MOCKS=true · Tenant source: ${p.tenant_info ? 'tenant_info' : ((p as any)?.acf?.tenants_group ? 'acf.tenants_group' : 'none')}`
            : undefined
        }
        backTo="/properties"
      />

      {/* Top section: Overview/Gallery tabs on the left, Owner's Profile on the right */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Tabs defaultValue="overview" classNames={{ tab: classes.tabsTab }} variant="pills">
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="gallery">Gallery</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              {(() => {
                const pg: any = (p as any)?.acf?.profilegroup ?? {}
                const postcode: string | null = pg?.postcode ?? null
                const houseNumber: string | number | null = pg?.house_number ?? null
                const referenceNumber: string = [postcode, houseNumber].filter(Boolean).join('-') || '-'
                const location: string | null = pg?.location ?? p.address ?? null
                const paymentFrequency: string | null = pg?.payment_frequency ?? pg?.incoming_payment_frequency ?? pg?.outgoing_payment_frequency ?? null
                const priceRaw: any = pg?.incoming_price ?? pg?.price ?? pg?.outgoing_price ?? null
                const furnished: string | null = pg?.furnished ?? null
                const propertyType: string | null = pg?.property_type ?? null
                const marketStatus: string | null = pg?.marketing_status ?? pg?.property_status ?? null

                const beds: any = pg?.beds ?? null
                const bathrooms: any = pg?.bathrooms ?? null
                const livingRooms: any = pg?.living_rooms ?? null
                const parking: any = pg?.parking ?? null

                return (
                  <PropertyOverviewPanel
                    canEdit={canUpdate('profilegroup', 'properties')}
                    onEdit={() => setOverviewOpen(true)}
                    postcode={postcode}
                    houseNumber={houseNumber}
                    referenceNumber={referenceNumber}
                    location={location}
                    paymentFrequency={paymentFrequency}
                    priceRaw={priceRaw}
                    furnished={furnished}
                    propertyType={propertyType}
                    marketStatus={marketStatus}
                    beds={beds}
                    bathrooms={bathrooms}
                    livingRooms={livingRooms}
                    parking={parking}
                  />
                )
              })()}
            </Tabs.Panel>

            <Tabs.Panel value="gallery" pt="md">
              <Group justify="space-between" align="center" mb="md">
                <Title order={4}>Gallery</Title>
                {canUpdate('gallery_photos', 'properties') && (
                  <Tooltip label="Edit gallery" withArrow>
                    <ActionIcon
                      size="lg"
                      variant="light"
                      color="brand"
                      radius="md"
                      onClick={() => setGalleryOpen(true)}
                    >
                      <IconPencil size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <Card withBorder>
                {Array.isArray(p?.inventory?.rooms) && p.inventory!.rooms.some(r => Array.isArray(r.items) && r.items.some(it => Array.isArray(it.photos) && it.photos.length > 0)) ? (
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                    {p.inventory!.rooms.flatMap(r => r.items).flatMap(it => it.photos ?? []).map((src, idx) => (
                      <Image key={idx} src={src as string} alt={`Photo ${idx+1}`} radius="sm"/>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text c="dimmed">No gallery items available.</Text>
                )}
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          {(() => {
          const profile: any = (p?.acf as any)?.profile_management ?? null
          const firstName: string | null = profile?.firstname ?? null
          const lastName: string | null = profile?.lastname ?? null
          const email: string | null = profile?.email ?? null
          const phone: string | null = profile?.phone ?? profile?.telephone ?? profile?.mobile ?? null
          const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Owner'
          const initial = String(displayName).charAt(0).toUpperCase()
            const isOwnerEmpty = isEmptyObject(profile) || (!firstName && !lastName && !email && !phone)

            return (canRead('profile_management') && (!isOwnerEmpty || canCreate('profile_management'))) ? (
              <Card withBorder p="md" radius="md" shadow="xs">
                <Group justify="space-between" align="center">
                  <Group gap="sm" align="center">
                    <MonochromeIcon size="lg"><IconUser size={18} /></MonochromeIcon>
                    <Title order={4}>Owner's Profile</Title>
                  </Group>
                  <Group gap="xs">
                    {!isOwnerEmpty && (
                      <>
                        <Badge variant="light">ID {p.owner_id}</Badge>
                        <Badge color={p.published ? 'green' : 'gray'} variant="light">{p.published ? 'Published' : 'Draft'}</Badge>
                      </>
                    )}
                    {isOwnerEmpty ? (
                      canCreate('profile_management') ? (
                        <Button size="sm" variant="light" color="brand" leftSection={<IconPlus size={16} />} onClick={() => setCreateOwnerOpen(true)}>
                          Add Owner
                        </Button>
                      ) : null
                    ) : (
                      canUpdate('profile_management') ? (
                        <Tooltip label="Edit owner profile" withArrow>
                          <ActionIcon
                            size="lg"
                            variant="light"
                            color="brand"
                            radius="md"
                            onClick={() => setOwnerOpen(true)}
                          >
                            <IconPencil size={18} />
                          </ActionIcon>
                        </Tooltip>
                      ) : null
                    )}
                  </Group>
                </Group>

                {(!isOwnerEmpty || canCreate('profile_management')) && (
                  <Stack gap="md" mt="sm">
                    <Group align="center" justify="space-between">
                      <Group align="center" gap="sm">
                        <Avatar radius="xl" size={48}>{initial}</Avatar>
                        <Stack gap={2}>
                          <Text fw={600}>{displayName}</Text>
                          <Text size="sm" c="dimmed">{email ?? '-'}</Text>
                          <Group gap={6}>
                            <MonochromeIcon size="sm"><IconPhone size={14} /></MonochromeIcon>
                            <Text size="sm" c="dimmed">{phone ?? '-'}</Text>
                          </Group>
                        </Stack>
                      </Group>
                    </Group>

                    <Divider />

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Stack gap={6}>
                        <Group gap={6} align="center">
                          <MonochromeIcon size="sm"><IconCalendar size={14} /></MonochromeIcon>
                          <Text size="sm" c="dimmed">Created</Text>
                        </Group>
                        <Text fw={500}>{formatDate(p.created_at)}</Text>
                      </Stack>
                      <Stack gap={6}>
                        <Group gap={6} align="center">
                          <MonochromeIcon size="sm"><IconCalendar size={14} /></MonochromeIcon>
                          <Text size="sm" c="dimmed">Updated</Text>
                        </Group>
                        <Text fw={500}>{formatDate(p.updated_at)}</Text>
                      </Stack>
                    </SimpleGrid>
                  </Stack>
                )}
              </Card>
            ) : null
          })()}
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="tenants" classNames={{ tab: classes.tabsTab }} variant="pills">
        <Tabs.List>
          <Tabs.Tab value="tenants">
            <Group gap={6} align="center">
              <span>Tenant details</span>
              {tenantMocked && <Badge size="xs" color="yellow" variant="light">Mocked</Badge>}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="financials">
            <Group gap={6} align="center">
              <span>Financials</span>
              {financialsMocked && <Badge size="xs" color="yellow" variant="light">Mocked</Badge>}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="inventory">
            <Group gap={6} align="center">
              <span>Inventory</span>
              {inventoryMocked && <Badge size="xs" color="yellow" variant="light">Mocked</Badge>}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="documents">
            <Group gap={6} align="center">
              <span>Documents</span>
              {documentsMocked && <Badge size="xs" color="yellow" variant="light">Mocked</Badge>}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="maintenance">
            <Group gap={6} align="center">
              <span>Maintenance</span>
              {maintenanceMocked && <Badge size="xs" color="yellow" variant="light">Mocked</Badge>}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="inspections">
            <Group gap={6} align="center">
              <span>Inspections</span>
              {inspectionsMocked && <Badge size="xs" color="yellow" variant="light">Mocked</Badge>}
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="tenants" pt="md">
          <TenantsPanel
            tenant={tenantGroup ? [tenantGroup, ...extraTenants] : extraTenants}
            isEmpty={isTenantEmpty && extraTenants.length === 0}
            canEdit={canUpdate('tenants_group')}
            onEdit={() => setTenantsOpen(true)}
            onAdd={() => setCreateTenantOpen(true)}
            canAdd={canCreate('tenants_group')}
          />
        </Tabs.Panel>

        <Tabs.Panel value="financials" pt="md">
          <Card withBorder p="md" radius="md" shadow="xs">
            <Group justify="space-between" align="center" mb="md">
              <Title order={4}>Financial Summary</Title>
              <Group gap="xs" align="center">
                {financialsMocked && <Badge color="yellow" variant="light">Mocked</Badge>}
                {canUpdate('financial_group') && (
                  <Tooltip label="Edit financials">
                    <ActionIcon
                      variant="light"
                      color="brand"
                      size="lg"
                      radius="md"
                      aria-label="Edit financials"
                      onClick={() => setFinancialsOpen(true)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>

            {(() => {
              const fin: any = p.financial_info ?? {}
              const acfFin: any = (p as any)?.acf?.financial_group ?? {}


              const formatCurrency = (n: any) => {
                if (n === null || n === undefined || n === '') return '—'
                const num = typeof n === 'string' ? Number(n) : n
                if (Number.isFinite(num)) {
                  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(num)
                }
                // Already currency string like "£1,200"
                return String(n)
              }








              const rentAmount = financialsOverride?.rent_to_landlord ?? (fin.rent ?? acfFin.rent_to_landord ?? null)

              const yieldPct = (financialsOverride?.rent_yield ?? acfFin.rent_yeild ?? null)
              const paymentMethod = financialsOverride?.payment_method ?? (fin.payment_method ?? acfFin.payment_method ?? null)
              const collectionDate = financialsOverride?.collection_date ?? (fin.collection_date ?? acfFin.collection_date ?? null)
              const paymentDate = financialsOverride?.payment_date ?? (acfFin.payment_date ?? null)


              // Attempt to locate rent history across possible shapes/fields
              return (
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCurrencyPound size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Rent to landlord</Text>
                          <Text fw={700}>{formatCurrency(rentAmount)}</Text>
                        </Stack>
                      </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconChartLine size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Yield</Text>
                          <Text fw={700}>{yieldPct !== null && yieldPct !== undefined ? `${yieldPct}%` : '—'}</Text>
                        </Stack>
                      </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCreditCard size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Payment Method</Text>
                          <Text fw={600}>{paymentMethod ?? '—'}</Text>
                        </Stack>
                      </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCalendar size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Collection Date</Text>
                          <Text fw={600}>{formatDate(collectionDate)}</Text>
                        </Stack>
                      </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCalendar size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Payment Date</Text>
                          <Text fw={600}>{formatDate(paymentDate)}</Text>
                        </Stack>
                      </Group>
                    </Card>
                  </SimpleGrid>

                  
                </Stack>
              )
            })()}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="inventory" pt="md">
          <Group justify="space-between" align="center" mb="md">
            <Title order={4}>Inventory</Title>
            {canCreate('inventory_group', 'inventory') && (
                  <Tooltip label="Add room">
                    <ActionIcon
                      variant="light"
                      color="brand"
                      size="lg"
                      radius="md"
                      aria-label="Add room"
                      onClick={() => setInventoryOpen(true)}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
          </Group>
          {!p.inventory ? (
            <Card withBorder><Text c="dimmed">No inventory found.</Text></Card>
          ) : (
            <Accordion multiple>
              {[...p.inventory.rooms, ...createdRooms].map((room) => (
                <Accordion.Item key={room.id} value={`room-${room.id}`}>
                  <Accordion.Control>
                    <Group justify="space-between">
                      <Group gap="xs">
                        {(() => {
                          const ov = roomOverrides[room.id] || {}
                          const displayName = ov.room_name ?? room.room_name
                          const displayType = ov.room_type ?? room.room_type
                          return (
                            <>
                              <Text fw={500}>{displayName}</Text>
                              <Text size="xs" c="dimmed">{displayType || 'Room'}</Text>
                            </>
                          )
                        })()}
                      </Group>
                      <Group gap="xs" align="center">
                        <Badge variant="light">{room.items.length + ((createdItems[room.id] ?? []).length)} items</Badge>
                        {canCreate('inventory') && (
                          <Tooltip label="Add item">
                            <ActionIcon
                              component="span"
                              variant="light"
                              color="brand"
                              aria-label="Add item"
                              onClick={(e) => { e.stopPropagation(); setCreateItemRoomId(room.id); setCreateItemOpen(true) }}
                            >
                              <IconPlus size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {canUpdate('inventory') && (
                          <Tooltip label="Edit room">
                            <ActionIcon
                              component="span"
                              variant="light"
                              color="brand"
                              aria-label="Edit room"
                              onClick={(e) => { e.stopPropagation(); setEditRoomRoomId(room.id); setEditRoomOpen(true) }}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {(() => {
                      const items = [...room.items, ...((createdItems[room.id] ?? []) as any[])]
                      return items.length === 0 ? (
                        <Card withBorder><Text c="dimmed">No items</Text></Card>
                      ) : (
                        <Stack gap="xs">
                          {items.map((it) => {
                            const ov = itemOverrides[(it as any).id] || {}
                            const displayName = (ov as any).name ?? (it as any).name
                            const displayQty = (ov as any).quantity ?? (it as any).quantity ?? 1
                            const displayOwner = (ov as any).owner ?? (it as any).owner ?? '-'
                            const displayCond = ((ov as any).condition ?? (it as any).condition) ?? '-'
                            return (
                              <Card key={(it as any).id} withBorder p="sm">
                                <Group justify="space-between" align="center" wrap="nowrap">
                                  <Text fw={500}>{displayName}</Text>
                                  <Group gap="xs" align="center">
                                    <Badge
                                      variant="filled"
                                      title="Quantity"
                                      style={{ backgroundColor: '#000000', color: '#ffffff' }}
                                    >
                                      x{displayQty}
                                    </Badge>
                                    <Badge
                                      variant="filled"
                                      style={{ backgroundColor: '#000000', color: '#ffffff' }}
                                    >
                                      {displayOwner}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      style={{ color: '#000000', borderColor: '#000000' }}
                                    >
                                      {displayCond}
                                    </Badge>
                                    <ActionIcon variant="light" color="brand" aria-label="Receipts" onClick={() => notifications.show({ title: 'Receipts', message: `${(((it as any).photos?.length ?? 0))} attachment(s)`, })}>
                                      <IconReceipt size={16} />
                                    </ActionIcon>
                                    {canUpdate('inventory') && (
                                      <Tooltip label="Edit item">
                                        <ActionIcon
                                          variant="light"
                                          color="brand"
                                          aria-label="Edit item"
                                          onClick={() => { setEditItemRoomId(room.id); setEditItemItemId((it as any).id); setEditItemOpen(true) }}
                                        >
                                          <IconPencil size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                    )}
                                  </Group>
                                </Group>
                              </Card>
                            )
                          })}
                        </Stack>
                      )
                    })()}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="md">
          <Card withBorder p="md" radius="md" shadow="xs">
            <Group justify="space-between" align="center" mb="md">
              <Title order={4}>Documents</Title>
              {canUpdate('documents_group') && (
                <Tooltip label="Edit documents">
                  <ActionIcon
                    variant="light"
                    color="brand"
                    size="lg"
                    radius="md"
                    aria-label="Edit documents"
                    onClick={() => setDocumentsOpen(true)}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>

            {(() => {
              const acfDocs: any = (p as any)?.acf?.documents_group_full ?? {}
              const support: any = acfDocs?.supporting_evidence ?? {}
              const contract: any = acfDocs?.landlord_contract ?? {}

              return (
                <Grid>
                  {/* Uploaded document — display only */}
                  <Grid.Col span={{ base: 12 }}>
                    <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                      <Title order={5}>Uploaded Document</Title>
                      {(() => {
                        const docs: any = acfDocs?.documents ?? {}
                        const uploaded = docs?.document_upload ?? null
                        const type = docs?.type ?? null
                        const hasDoc = !!uploaded?.url
                        return (
                          <Stack gap="md" mt="sm">
                            <Stack gap={6}>
                              <Group justify="space-between" align="center">
                                <Group gap="sm" align="center">
                                  <MonochromeIcon size="lg"><IconFileText size={18} /></MonochromeIcon>
                                  <Text size="sm" fw={600}>Document</Text>
                                </Group>
                                {hasDoc ? <Badge color="green">Provided</Badge> : <Badge color="gray">Missing</Badge>}
                              </Group>
                              {hasDoc && (
                                <Group gap="xs" align="center">
                                  <Text size="sm" c="dimmed">{uploaded?.filename ?? 'Document'}</Text>
                                  <Tooltip label="View document">
                                    <ActionIcon
                                      component="a"
                                      href={uploaded.url}
                                      target="_blank"
                                      variant="light"
                                      size="lg"
                                      radius="md"
                                      aria-label="View uploaded document"
                                      color="brand"
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <IconFileText size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              )}
                            </Stack>

                            <Divider my="sm" />

                            <Stack gap={4}>
                              <Text size="sm" fw={600}>Type</Text>
                              <Text fw={500}>{type ?? '-'}</Text>
                            </Stack>
                          </Stack>
                        )
                      })()}
                    </Card>
                  </Grid.Col>

                  {/* Supporting Evidence */}
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                      <Title order={5}>Supporting Evidence</Title>
                      <Stack gap="md" mt="sm">
                        <Stack gap={6}>
                          <Group justify="space-between" align="center">
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconFileText size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Land registry</Text>
                            </Group>
                            {support?.land_registry?.url ? <Badge color="green">Provided</Badge> : <Badge color="gray">Missing</Badge>}
                          </Group>
                          {support?.land_registry?.url && (
                            <Group gap="xs" align="center">
                              <Text size="sm" c="dimmed">{support?.land_registry?.filename ?? 'Document'}</Text>
                              <Tooltip label="View land registry">
                                <ActionIcon
                                  component="a"
                                  href={support.land_registry.url}
                                  target="_blank"
                                  variant="light"
                                  size="lg"
                                  radius="md"
                                  aria-label="View land registry"
                                  color="brand"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <IconFileText size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          )}
                        </Stack>

                        <Divider my="sm" />

                        <Stack gap={4}>
                          <Group gap={6} align="center">
                            <MonochromeIcon size="sm"><IconCalendar size={14} /></MonochromeIcon>
                            <Text size="sm" fw={600}>Last sold</Text>
                          </Group>
                          <Text fw={500}>{support?.last_sold ? formatDate(support.last_sold) : '-'}</Text>
                        </Stack>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  {/* Landlord Contract */}
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                      <Title order={5}>Landlord Contract</Title>
                      <Stack gap="md" mt="sm">
                        <Stack gap={6}>
                          <Group justify="space-between" align="center">
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconFileText size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Contract</Text>
                            </Group>
                            {contract?.land_contract?.url ? <Badge color="green">Provided</Badge> : <Badge color="gray">Missing</Badge>}
                          </Group>
                          {contract?.land_contract?.url && (
                            <Group gap="xs" align="center">
                              <Text size="sm" c="dimmed">{contract?.land_contract?.filename ?? 'Contract'}</Text>
                              <Tooltip label="View contract">
                                <ActionIcon
                                  component="a"
                                  href={contract.land_contract.url}
                                  target="_blank"
                                  variant="light"
                                  size="lg"
                                  radius="md"
                                  aria-label="View contract"
                                  color="brand"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <IconFileText size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          )}
                        </Stack>

                        <Divider my="sm" />

                        <Stack gap={4}>
                          <Group gap={6} align="center">
                            <MonochromeIcon size="sm"><IconCalendar size={14} /></MonochromeIcon>
                            <Text size="sm" fw={600}>Date</Text>
                          </Group>
                          <Text fw={500}>{contract?.date ? formatDate(contract.date) : '-'}</Text>
                        </Stack>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>
              )
            })()}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="maintenance" pt="md">
          <Card withBorder p="md" radius="md" shadow="xs">
            <Group justify="space-between" align="center" mb="md">
              <Title order={4}>Maintenance Overview</Title>
              {canUpdate('mainenance_group') && (
                <Tooltip label="Edit maintenance">
                  <ActionIcon
                    variant="light"
                    color="brand"
                    size="lg"
                    radius="md"
                    aria-label="Edit maintenance"
                    onClick={() => setMaintenanceOpen(true)}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>

            {(() => {
              const records: any[] = Array.isArray(p.maintenance_records) ? (p.maintenance_records as any[]) : []
              if (!records || records.length === 0) {
                return <Text c="dimmed">No maintenance records.</Text>
              }

              const today = new Date()
              const parseAmount = (v: any) => {
                const n = typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : NaN)
                return Number.isFinite(n) ? n : 0
              }
              const parseDateVal = (s: any): Date | null => {
                try {
                  const d = new Date(s)
                  return isNaN(d.getTime()) ? null : d
                } catch {
                  return null
                }
              }


              const completed = records.filter((r) => String(r?.status ?? '').toLowerCase() === 'completed')
              const pending = records.filter((r) => {
                const lc = String(r?.status ?? '').toLowerCase()
                return lc === 'pending' || lc === 'in progress'
              })
              const totalSpend = completed.reduce((sum, r) => sum + parseAmount(r?.cost), 0)
              const upcoming = pending.filter((r) => {
                const d = parseDateVal(r?.when)
                return !!d && d.getTime() >= today.getTime()
              }).length
              const overdue = pending.filter((r) => {
                const d = parseDateVal(r?.when)
                return !!d && d.getTime() < today.getTime()
              }).length
              const lastCompletedDate = (() => {
                const dates = completed.map((r) => parseDateVal(r?.when)).filter((d): d is Date => !!d)
                dates.sort((a, b) => a.getTime() - b.getTime())
                return dates.length ? dates[dates.length - 1] : null
              })()
              const lastCompletedDateStr = lastCompletedDate ? lastCompletedDate.toISOString() : null

              const sorted = records.slice().sort((a, b) => {
                const da = parseDateVal(a?.when)?.getTime() ?? 0
                const db = parseDateVal(b?.when)?.getTime() ?? 0
                return db - da
              })


              const groupMap: Record<string, any[]> = {}
              for (const r of sorted) {
                const d = parseDateVal(r?.when)
                const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown'
                if (!groupMap[key]) groupMap[key] = []
                groupMap[key].push(r)
              }



              return (
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconTools size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Total Spend (Completed)</Text>
                          <Text fw={700}>{formatCurrency(totalSpend)}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconClock size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Upcoming Scheduled</Text>
                          <Text fw={700}>{upcoming}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconAlertTriangle size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Overdue</Text>
                          <Text fw={700}>{overdue}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCircleCheck size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Last Maintenance</Text>
                          <Text fw={700}>{lastCompletedDateStr ? formatDate(lastCompletedDateStr) : '-'}</Text>
                        </Stack>
                      </Group>
                    </Card>
                  </SimpleGrid>

                  {/* Maintenance details from ACF group (supports list) */}
                  {(() => {
                    const acfMaintRaw: any = (p as any)?.acf?.mainenance_group
                    const isArray = Array.isArray(acfMaintRaw)
                    const normalize = (obj: any) => ({
                      where: obj?.where ?? '-',
                      what: obj?.what ?? '-',
                      payable_by: obj?.payable_by ?? '-',
                      contractor_supplied_by: obj?.contractor_supplied_by ?? '-',
                      invoice: obj?.invoice ?? null,
                    })
                    let entries: any[] = []
                    if (isArray) {
                      entries = (acfMaintRaw as any[]).filter(Boolean)
                    } else if (acfMaintRaw && (acfMaintRaw.where || acfMaintRaw.what || acfMaintRaw.payable_by || acfMaintRaw.contractor_supplied_by || acfMaintRaw.invoice)) {
                      entries = [acfMaintRaw]
                    }

                    if (!entries.length) return null

                    return (
                      <Stack gap="xs">
                        <Title order={5}>Maintenance Details</Title>
                        <Table withTableBorder withColumnBorders mt="sm">
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Where</Table.Th>
                              <Table.Th>What</Table.Th>
                              <Table.Th>Payable by</Table.Th>
                              <Table.Th>Contractor supplied by</Table.Th>
                              <Table.Th>Invoice</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {entries.map((row, idx) => {
                              const r = normalize(row)
                              const hasInvoice = !!r.invoice
                              const invoiceUrl = (r.invoice as any)?.url
                              return (
                                <Table.Tr key={idx}>
                                  <Table.Td>{r.where}</Table.Td>
                                  <Table.Td>{r.what}</Table.Td>
                                  <Table.Td>{r.payable_by}</Table.Td>
                                  <Table.Td>{r.contractor_supplied_by}</Table.Td>
                                  <Table.Td>
                                    <Group gap={6} align="center">
                                      {hasInvoice ? (
                                        <Badge color="green" variant="light">Provided</Badge>
                                      ) : (
                                        <Badge color="gray" variant="light">Missing</Badge>
                                      )}
                                      {invoiceUrl && (
                                        <Tooltip label="View Invoice">
                                          <ActionIcon
                                            component="a"
                                            href={invoiceUrl}
                                            target="_blank"
                                            variant="light"
                                            size="sm"
                                            radius="md"
                                            aria-label="View maintenance invoice"
                                            color="brand"
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <IconReceipt size={14} />
                                          </ActionIcon>
                                        </Tooltip>
                                      )}
                                    </Group>
                                  </Table.Td>
                                </Table.Tr>
                              )
                            })}
                          </Table.Tbody>
                        </Table>
                      </Stack>
                    )
                  })()}

                  {/* Recent Records removed for compactness and duplication avoidance */}

                  {/* Timeline removed for compactness as requested */}
                </Stack>
              )
            })()}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="inspections" pt="md">
          <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
            <Group justify="space-between" align="center" mb="md">
              <Title order={4}>Inspections</Title>
              {canUpdate('inspection_group') && (
                <Tooltip label="Edit inspections">
                  <ActionIcon
                    variant="light"
                    color="brand"
                    size="lg"
                    radius="md"
                    aria-label="Edit inspections"
                    onClick={() => setInspectionsOpen(true)}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            {(() => {
              const insp: any = p?.inspections ?? {}
              const lastInspectionDate: string | null = insp?.last_inspection_date ?? insp?.updated_at ?? null
              const inspector: string | null = insp?.inspector ?? null
              const scoreVal: number | null = typeof insp?.score === 'number' ? insp.score : null
              const issues: string[] = Array.isArray(insp?.issues_found) ? insp.issues_found : []
              const notes: string | null = insp?.notes ?? null
              const scheduleCount: number | null = typeof insp?.schedule_count === 'number' ? insp.schedule_count : null
              const scheduleFrequency: string | null = insp?.schedule_frequency ?? null
              const scheduleStart: string | null = insp?.schedule_start_date ?? null
              function computeNextFromSchedule(startDate: string | null, frequency: string | null, count: number | null): string | null {
                if (!startDate || !frequency) return null
                if (typeof count === 'number' && count <= 1) return null
                const d = new Date(startDate)
                if (Number.isNaN(d.getTime())) return null
                const f = String(frequency).toLowerCase()
                if (f === 'daily') d.setDate(d.getDate() + 1)
                else if (f === 'weekly') d.setDate(d.getDate() + 7)
                else if (f === 'monthly') d.setMonth(d.getMonth() + 1)
                else if (f === 'quarterly') d.setMonth(d.getMonth() + 3)
                else if (f === 'yearly') d.setFullYear(d.getFullYear() + 1)
                return d.toISOString().slice(0, 10)
              }
              const nextInspectionDate: string | null = insp?.next_inspection_date ?? computeNextFromSchedule(scheduleStart, scheduleFrequency, scheduleCount)

              // ACF inspection checklist group
              const acfInsp: any = (p as any)?.acf?.inspection_group ?? (p as any)?.acf?.ACFInspectionGroup ?? {}
              const hasChecklist = acfInsp && (acfInsp.interior_of_property || acfInsp.exterior_of_property || acfInsp.appliance)

              return (
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCalendar size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Last Inspection</Text>
                          <Text fw={700}>{lastInspectionDate ? formatDate(lastInspectionDate) : '-'}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconCalendar size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Next Inspection</Text>
                          <Text fw={700}>{nextInspectionDate ? formatDate(nextInspectionDate) : '-'}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconAlertTriangle size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Issues Found</Text>
                          <Text fw={700}>{issues.length}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconGauge size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Inspection Score</Text>
                          <Text fw={700}>{scoreVal !== null ? String(scoreVal) : '-'}</Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconClipboardList size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Inspection Schedule</Text>
                          <Text fw={700}>
                            {scheduleCount !== null && scheduleFrequency
                              ? `${scheduleCount} time${scheduleCount === 1 ? '' : 's'} every ${String(scheduleFrequency).toLowerCase()}`
                              : '-'}
                          </Text>
                        </Stack>
                      </Group>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group align="center" gap="sm">
                        <MonochromeIcon size="lg"><IconUser size={18} /></MonochromeIcon>
                        <Stack gap={2}>
                          <Text size="sm" c="dimmed">Inspector</Text>
                          <Text fw={700}>{inspector ?? '-'}</Text>
                        </Stack>
                      </Group>
                    </Card>
                  </SimpleGrid>

                  {/* Inspection details */}
                  {(notes || issues.length > 0 || inspector || lastInspectionDate) ? (
                    <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                      <Title order={5}>Inspection Details</Title>
                      <Stack gap="md" mt="sm">
                        {notes && (
                          <Stack gap={4}>
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconNote size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Notes</Text>
                            </Group>
                            <Text fw={500}>{notes}</Text>
                          </Stack>
                        )}

                        {issues.length > 0 && (
                          <Stack gap={6}>
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconAlertTriangle size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Issues</Text>
                            </Group>
                            <Stack gap={4} pl={32}>
                              {issues.map((it, idx) => (
                                <Text key={idx} size="sm">• {it}</Text>
                              ))}
                            </Stack>
                          </Stack>
                        )}

                        {(inspector || lastInspectionDate) && (
                          <Group gap="lg">
                            <Group gap="xs" align="center">
                              <MonochromeIcon size="sm"><IconUser size={14} /></MonochromeIcon>
                              <Text size="sm" c="dimmed">Inspector:</Text>
                              <Text size="sm" fw={600}>{inspector ?? '-'}</Text>
                            </Group>
                            <Group gap="xs" align="center">
                              <MonochromeIcon size="sm"><IconCalendar size={14} /></MonochromeIcon>
                              <Text size="sm" c="dimmed">Last Updated:</Text>
                              <Text size="sm" fw={600}>{lastInspectionDate ? formatDate(lastInspectionDate) : '-'}</Text>
                            </Group>
                          </Group>
                        )}
                      </Stack>
                    </Card>
                  ) : null}

                  {/* ACF Inspection Checklist */}
                  {hasChecklist && (
                    <Card withBorder p="md" radius="md" shadow="xs" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                      <Title order={5}>Inspection Checklist</Title>
                      <Stack gap="md" mt="sm">
                        <Stack gap={4}>
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconHome size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Interior of Property</Text>
                            </Group>
                          <Text fw={500}>{acfInsp?.interior_of_property ?? '-'}</Text>
                        </Stack>

                        <Divider my="sm" />

                        <Stack gap={4}>
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconBuilding size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Exterior of Property</Text>
                            </Group>
                          <Text fw={500}>{acfInsp?.exterior_of_property ?? '-'}</Text>
                        </Stack>

                        <Divider my="sm" />

                        <Stack gap={4}>
                            <Group gap="sm" align="center">
                              <MonochromeIcon size="lg"><IconClipboardList size={18} /></MonochromeIcon>
                              <Text size="sm" fw={600}>Appliance</Text>
                            </Group>
                          <Text fw={500}>{acfInsp?.appliance ?? '-'}</Text>
                        </Stack>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              )
            })()}
          </Card>
        </Tabs.Panel>
      </Tabs>
      {/* Edit Modals */}
      <EditOverviewModal
        opened={overviewOpen}
        data={overviewInitial}
        onClose={() => setOverviewOpen(false)}
        onSave={async (updated) => {
          const notifId = 'overview-update'
          notifications.show({ id: notifId, title: 'Saving overview…', message: 'Updating property details', loading: true, autoClose: false })

          try {
            // Build profilegroup payload, only including meaningful values
            const pg: Record<string, any> = {}
            const add = (key: string, value: any) => {
              if (value === undefined || value === null) return
              if (typeof value === 'string' && value.trim() === '') return
              pg[key] = value
            }

            // Strings
            add('postcode', updated.postcode)
            add('location', updated.location)
            add('payment_frequency', updated.payment_frequency)
            add('furnished', updated.furnished)
            add('property_type', updated.property_type)
            add('marketing_status', updated.marketing_status)
            add('categories', updated.categories)

            // Numeric conversions for numeric-friendly fields
            const toNumber = (v: any) => {
              if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return undefined
              const n = Number(v)
              return Number.isNaN(n) ? undefined : n
            }

            const hn = toNumber(updated.house_number)
            if (hn !== undefined) pg['house_number'] = hn
            const beds = toNumber(updated.beds)
            if (beds !== undefined) pg['beds'] = beds
            const baths = toNumber(updated.bathrooms)
            if (baths !== undefined) pg['bathrooms'] = baths
            const living = toNumber(updated.living_rooms)
            if (living !== undefined) pg['living_rooms'] = living
            const park = toNumber(updated.parking)
            if (park !== undefined) pg['parking'] = park

            // Price: prefer incoming_price so UI picks it up
            const price = toNumber(updated.price)
            if (price !== undefined) pg['incoming_price'] = price

            const payload = { acf: { profilegroup: pg } }
            await updateProperty(propertyId, payload)

            // Refetch to confirm persistence and refresh UI
            await queryClient.invalidateQueries({ queryKey: ['property', propertyId] })

            notifications.update({ id: notifId, title: 'Overview updated', message: 'Property overview saved successfully', loading: false, color: 'green', autoClose: 2000 })
            setOverviewOpen(false)
          } catch (err: any) {
            notifications.update({ id: notifId, title: 'Update failed', message: err?.message ?? 'Unable to save overview', loading: false, color: 'red' })
          }
        }}
      />

      <EditGalleryModal
        opened={galleryOpen}
        photos={galleryInitial}
        onClose={() => setGalleryOpen(false)}
        onSave={(updated) => {
          notifications.show({ title: 'Gallery saved', message: `Captured ${(updated as any).length} photo URL(s) (stub).` })
          setGalleryOpen(false)
        }}
      />

      <EditOwnerProfileModal
        opened={ownerOpen}
        data={ownerInitial}
        onClose={() => setOwnerOpen(false)}
        onSave={() => {
          notifications.show({ title: "Owner profile saved", message: 'Changes captured (stub). Backend wiring pending.' })
          setOwnerOpen(false)
        }}
      />

      <CreateOwnerModal
        opened={createOwnerOpen}
        properties={[{ id: p.id, title: p.title, address: p.address ?? null }]}
        contextProperty={{ id: p.id, title: p.title, address: p.address ?? null }}
        onClose={() => setCreateOwnerOpen(false)}
        onCreate={async (owner) => {
          try {
            if ((owner as any).mode === 'existing') {
              const o = owner as any as { mode: 'existing'; propertyId: number; propertyTitle: string; propertyAddress?: string | null; ownerId: number; ownerName?: string; ownerEmail?: string | null }
              await updateProperty(o.propertyId, {
                owner_id: o.ownerId,
                acf: { profile_management: { firstname: o.ownerName ?? null, lastname: null, email: o.ownerEmail ?? null, phone: null } }
              })
              notifications.show({ title: 'Owner assigned', message: `Assigned owner to ${o.propertyTitle}.`, color: 'green' })
            } else {
              const o = owner as any as { mode: 'new'; name: string; email: string; phone?: string | null; propertyId: number; propertyTitle: string }
              const base = o.email.split('@')[0] || o.name.trim().toLowerCase().replace(/\s+/g, '.')
              const username = `${base}`
              const tempPassword = `owner-${Math.random().toString(36).slice(2, 10)}`
              const user = await createUser({ username, email: o.email, password: tempPassword, role: 'propertyowner' })
              await updateProperty(o.propertyId, {
                owner_id: user.id,
                acf: { profile_management: { firstname: o.name, lastname: null, email: o.email, phone: o.phone ?? null } }
              })
              notifications.show({ title: 'Owner created', message: `Owner '${username}' linked to ${o.propertyTitle}.`, color: 'green' })
            }
            setCreateOwnerOpen(false)
            queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
          } catch (err: any) {
            notifications.show({ title: 'Failed to add owner', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
          }
        }}
      />

      <EditTenantModal
        opened={tenantsOpen}
        tenant={!tenantGroup ? null : {
          id: String((tenantGroup as any)?.id ?? p.id),
          name: String(tenantGroup?.tenants_name ?? tenantGroup?.name ?? 'Tenant'),
          email: (tenantGroup as any)?.email ?? null,
          phone: tenantGroup?.phone ?? null,
          employmentStatus: tenantGroup?.employment_status ?? null,
          status: ((tenantGroup?.proof_of_id || tenantGroup?.right_to_rent) ? 'Verified' : ((tenantGroup as any)?.email || tenantGroup?.phone ? 'Pending' : 'Unknown')),
          propertyTitle: p.title,
          propertyAddress: p.address ?? null,
          rightToRent: (tenantGroup as any)?.right_to_rent?.url ?? null,
          proofOfId: (tenantGroup as any)?.proof_of_id?.url ?? null,
          emergencyContact: {
            name: (tenantGroup as any)?.emergency_contact?.name ?? null,
            phone: (tenantGroup as any)?.emergency_contact?.phone ?? null,
          },
          guarantor: {
            name: (tenantGroup as any)?.guarantor?.name ?? null,
            email: (tenantGroup as any)?.guarantor?.email ?? null,
            phone: (tenantGroup as any)?.guarantor?.phone ?? null,
          },
          dateOfBirth: (tenantGroup as any)?.date_of_birth ?? null,
          agreementSignedDate: (tenantGroup as any)?.agreement_signed_date ?? null,
        }}
        onClose={() => setTenantsOpen(false)}
        onSave={() => {
          notifications.show({ title: 'Tenant details saved', message: 'Changes captured (stub). Backend wiring pending.' })
          setTenantsOpen(false)
        }}
      />

      <CreateTenantModal
        opened={createTenantOpen}
        properties={[{ id: p.id, title: p.title, address: p.address ?? null }]}
        contextProperty={{ id: p.id, title: p.title, address: p.address ?? null }}
        onClose={() => setCreateTenantOpen(false)}
        onCreate={async (nt) => {
          try {
            const hasPrimaryTenant = !!tenantGroup && !isEmptyObject(tenantGroup)
            if ((nt as any).mode === 'existing') {
              const t = nt as any as { mode: 'existing'; name: string; email?: string | null; phone?: string | null; employmentStatus?: string | null; propertyId: number; propertyTitle: string; tenantUserId?: number | null }
              if (hasPrimaryTenant) {
                // Add as additional tenant locally (do not overwrite primary backend tenant)
                setExtraTenants((prev) => [
                  ...prev,
                  {
                    tenants_name: t.name,
                    name: t.name,
                    email: t.email ?? null,
                    phone: t.phone ?? null,
                    employment_status: t.employmentStatus ?? null,
                    agreement_signed_date: null,
                  },
                ])
                notifications.show({ title: 'Tenant added', message: `Added additional tenant for ${t.propertyTitle}.`, color: 'green' })
              } else {
                // No primary tenant: persist to backend as the primary
                await updateProperty(t.propertyId, { acf: { tenants_group: { full_name: t.name, email: t.email ?? null, phone: t.phone ?? null, employment_status: t.employmentStatus ?? null } } })
                notifications.show({ title: 'Tenant assigned', message: `Assigned existing tenant to ${t.propertyTitle}.`, color: 'green' })
              }
            } else {
              const t = nt as any as { mode: 'new'; name: string; email?: string | null; phone?: string | null; employmentStatus?: string | null; status: 'Verified' | 'Pending' | 'Unknown'; propertyId: number; propertyTitle: string }
              // Create tenant user if email provided
              if (t.email) {
                const base = t.email.split('@')[0] || t.name.trim().toLowerCase().replace(/\s+/g, '.')
                const username = `${base}`
                const tempPassword = `tenant-${Math.random().toString(36).slice(2, 10)}`
                try {
                  await createUser({ username, email: t.email, password: tempPassword, role: 'tenant' })
                  notifications.show({ title: 'User created', message: `Tenant user '${username}' created.`, color: 'green' })
                } catch (e) {
                  notifications.show({ title: 'User creation failed', message: 'Could not create tenant user. You can create one manually in Settings.', color: 'red' })
                }
              }
              if (hasPrimaryTenant) {
                // Add as additional tenant locally (do not overwrite primary backend tenant)
                setExtraTenants((prev) => [
                  ...prev,
                  {
                    tenants_name: t.name,
                    name: t.name,
                    email: t.email ?? null,
                    phone: t.phone ?? null,
                    employment_status: t.employmentStatus ?? null,
                    agreement_signed_date: null,
                  },
                ])
                notifications.show({ title: 'Tenant added', message: `Added additional tenant for ${t.propertyTitle}.`, color: 'green' })
              } else {
                // No primary tenant: persist to backend as the primary
                await updateProperty(t.propertyId, { acf: { tenants_group: { full_name: t.name, email: t.email ?? null, phone: t.phone ?? null, employment_status: t.employmentStatus ?? null } } })
                notifications.show({ title: 'Tenant linked', message: `Linked tenant to ${t.propertyTitle}.`, color: 'green' })
              }
            }
            setCreateTenantOpen(false)
            if (!hasPrimaryTenant) {
              // Only invalidate when we persisted changes to backend
              await queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
            }
          } catch (err: any) {
            notifications.show({ title: 'Tenant update failed', message: err?.response?.data?.detail || err?.message || 'Error', color: 'red' })
          }
        }}
      />

      <EditFinancialsModal
        opened={financialsOpen}
        data={financialsInitial}
        onClose={() => setFinancialsOpen(false)}
        onSave={async (updated) => {
          try {
            const payload = {
              acf: {
                financial_group: {
                  rent_to_landord: updated.rent_to_landlord ?? null,
                  rent_yeild: updated.rent_yield ?? null,
                  collection_date: updated.collection_date ?? null,
                  payment_date: updated.payment_date ?? null,
                  payment_method: updated.payment_method ?? null,
                },
              },
            }
            await updateProperty(propertyId, payload)
            setFinancialsOverride({ ...updated })
            notifications.show({ title: 'Financials saved', message: 'Changes persisted successfully.' })
            await queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
            setFinancialsOpen(false)
          } catch (e: any) {
            notifications.show({ color: 'red', title: 'Save failed', message: String(e?.message || 'Unable to save financials') })
          }
        }}
      />

      <CreateInventoryRoomModal
        opened={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        onCreate={(newRoom) => {
          setCreatedRooms((prev) => [...prev, newRoom])
          notifications.show({ title: 'Room added', message: 'Inventory room created locally.' })
          setInventoryOpen(false)
        }}
      />

      <EditInventoryRoomModal
        opened={editRoomOpen}
        room={selectedRoomForEditRoom}
        onClose={() => setEditRoomOpen(false)}
        onSave={(updated) => {
          if (!selectedRoomForEditRoom) return
          const isCreated = createdRooms.some((r) => r.id === selectedRoomForEditRoom.id)
          if (isCreated) {
            setCreatedRooms((prev) => prev.map((r) => r.id === updated.id ? { ...r, room_name: updated.room_name, room_type: updated.room_type } : r))
          } else {
            setRoomOverrides((prev) => ({ ...prev, [updated.id]: { room_name: updated.room_name, room_type: updated.room_type } }))
          }
          notifications.show({ title: 'Room updated', message: 'Changes applied locally.' })
          setEditRoomOpen(false)
        }}
      />

      <EditInventoryItemModal
        opened={editItemOpen}
        room={selectedRoomForEditItem}
        item={selectedItemForEdit as any}
        onClose={() => setEditItemOpen(false)}
        onSave={(updated) => {
          if (!selectedRoomForEditItem || !selectedItemForEdit) return
          if (selectedItemIsCreated) {
            setCreatedItems((prev) => {
              const list = [...(prev[selectedRoomForEditItem.id] ?? [])]
              const idx = list.findIndex((it: any) => it?.id === updated.id)
              if (idx >= 0) list[idx] = { ...list[idx], ...updated }
              return { ...prev, [selectedRoomForEditItem.id]: list }
            })
          } else {
            setItemOverrides((prev) => ({ ...prev, [updated.id]: { ...updated } }))
          }
          notifications.show({ title: 'Item updated', message: 'Changes applied locally.' })
          setEditItemOpen(false)
        }}
      />

      <CreateInventoryItemModal
        opened={createItemOpen}
        room={selectedRoomForCreate}
        onClose={() => setCreateItemOpen(false)}
        onCreate={(item) => {
          if (!createItemRoomId) return
          setCreatedItems((prev) => ({
            ...prev,
            [createItemRoomId]: [...(prev[createItemRoomId] ?? []), item],
          }))
          notifications.show({ title: 'Item created', message: 'Item added to room (local only).' })
          setCreateItemOpen(false)
        }}
      />

      <EditDocumentsModal
        opened={documentsOpen}
        data={documentsInitial}
        onClose={() => setDocumentsOpen(false)}
        onSave={async (updated) => {
          try {
            const currentDocs: any = (p as any)?.acf?.documents_group_full ?? {}
            const payload: any = {
              acf: {
                documents_group: {
                  documents: {
                    document_upload: updated.uploaded_url ? {
                      url: updated.uploaded_url,
                      filename: updated.uploaded_name || 'Document',
                      uploaded_at: new Date().toISOString(),
                      file_type: null,
                    } : null,
                    type: updated.doc_type ?? null,
                  },
                  supporting_evidence: {
                    land_registry: updated.support_url ? {
                      url: updated.support_url,
                      filename: updated.support_name || 'Document',
                      uploaded_at: currentDocs?.supporting_evidence?.land_registry?.uploaded_at ?? null,
                      file_type: currentDocs?.supporting_evidence?.land_registry?.file_type ?? null,
                    } : null,
                    last_sold: updated.last_sold ?? currentDocs?.supporting_evidence?.last_sold ?? null,
                  },
                  landlord_contract: {
                    land_contract: updated.contract_url ? {
                      url: updated.contract_url,
                      filename: updated.contract_name || 'Contract',
                      uploaded_at: currentDocs?.landlord_contract?.land_contract?.uploaded_at ?? null,
                      file_type: currentDocs?.landlord_contract?.land_contract?.file_type ?? null,
                    } : null,
                    date: updated.contract_date ?? currentDocs?.landlord_contract?.date ?? null,
                  },
                },
              },
            }
            await updateProperty(propertyId, payload)
            notifications.show({ title: 'Documents saved', message: 'Changes persisted successfully.' })
            await queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
            setDocumentsOpen(false)
          } catch (e: any) {
            notifications.show({ color: 'red', title: 'Save failed', message: String(e?.message || 'Unable to save documents') })
          }
        }}
      />

      <EditMaintenanceModal
        opened={maintenanceOpen}
        data={maintenanceInitial}
        rooms={p.inventory?.rooms || []}
        onClose={() => setMaintenanceOpen(false)}
        onSave={async (updated) => {
          try {
            const payload = {
              acf: {
                mainenance_group: {
                  where: updated.where ?? acfMaintObj?.where ?? null,
                  what: updated.what ?? acfMaintObj?.what ?? null,
                  payable_by: updated.payable_by ?? acfMaintObj?.payable_by ?? null,
                  contractor_supplied_by: updated.contractor_supplied_by ?? acfMaintObj?.contractor_supplied_by ?? null,
                },
              },
            }
            await updateProperty(propertyId, payload)

            const newRecord = {
              title: updated.what ? `New: ${updated.what}` : 'New maintenance request',
              where: updated.where ?? null,
              when: new Date().toISOString(),
              status: 'New',
              cost: 0,
            }
            queryClient.setQueryData(['property', propertyId], (prev: any) => {
              if (!prev || typeof prev !== 'object') return prev
              const prevRecords = Array.isArray(prev.maintenance_records) ? prev.maintenance_records : []
              return { ...prev, maintenance_records: [...prevRecords, newRecord] }
            })

            // Inject into Repairs & Maintenance board (New) via localStorage
            try {
              const key = 'injected-maintenance-requests'
              const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
              const arr = raw ? JSON.parse(raw) : []
              const dateReported = new Date()
              const dueDate = new Date(dateReported)
              dueDate.setDate(dateReported.getDate() + 7)
              arr.push({
                id: `injected-${Date.now()}`,
                title: updated.what && updated.where ? `${updated.what} in ${updated.where}` : 'New maintenance',
                propertyName: String(p.title || 'Unknown Property'),
                propertyType: 'Flat',
                tenantName: String(((p as any)?.acf?.tenants_group?.tenants_name) || 'Unknown Tenant'),
                category: updated.what ? 'Appliance' : 'General',
                priority: (updated.priority as any) || 'Medium',
                status: 'New',
                dateReported: dateReported.toISOString(),
                dueDate: dueDate.toISOString(),
                assignedTo: null,
                estimatedCost: null,
              })
              if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(arr))
            } catch {}

            notifications.show({ title: 'Maintenance saved', message: 'Request added under Repairs → New and details captured.', color: 'teal' })
            await queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
            setMaintenanceOpen(false)
          } catch (e: any) {
            notifications.show({ color: 'red', title: 'Save failed', message: String(e?.message || 'Unable to save maintenance') })
          }
        }}
      />

      <EditInspectionsModal
        opened={inspectionsOpen}
        data={inspectionsInitial}
        onClose={() => setInspectionsOpen(false)}
        onSave={(updated) => {
          // Reflect results in content area by updating local query cache
          queryClient.setQueryData(["property", propertyId], (prev: any) => {
            if (!prev || typeof prev !== 'object') return prev
            const insp = { ...(prev.inspections || {}) }
            if (typeof updated.count === 'number') insp.schedule_count = updated.count
            if (updated.frequency) insp.schedule_frequency = updated.frequency
            if (updated.start_date) insp.schedule_start_date = updated.start_date
            if (updated.next_inspection_date) insp.next_inspection_date = updated.next_inspection_date
            if (updated.inspector_name) insp.inspector = updated.inspector_name
            if (updated.status) insp.status = updated.status
            insp.updated_at = new Date().toISOString()
            return { ...prev, inspections: insp }
          })
          notifications.show({ title: 'Inspections saved', message: 'Schedule and inspector updated for this view.' })
          setInspectionsOpen(false)
        }}
      />
    </Stack>
  )
}

function getMockProperty(): PropertyDetail {
  const now = new Date().toISOString()
  return {
    id: 123,
    title: 'Mocked — Oak Street Residence',
    address: '12 Oak Street, London, UK',
    published: true,
    owner_id: 42,
    created_at: now,
    updated_at: now,
    content: 'A bright two-bedroom flat with modern amenities and excellent transport links.',
    acf: {
      profile_management: {
        firstname: 'Alice',
        lastname: 'Johnson',
        email: 'alice.johnson@example.com',
        phone: '+44 7912 345678',
      },
      tenants_group: {
        tenants_name: 'John Doe',
        phone: '+44 7712 345 678',
        employment_status: 'Full-time',
        date_of_birth: '1990-05-23',
        agreement_signed_date: '2025-03-12',
        right_to_rent: { url: 'https://example.com/documents/right-to-rent.pdf' },
        proof_of_id: { url: 'https://example.com/documents/proof-of-id.pdf' },
        emergency_contact: { name: 'Jane Doe', phone: '+44 7700 900123' },
        guarantor: { name: 'Gary Grant', email: 'gary.grant@example.com', phone: '+44 7710 111222' },
      },
    },
    tenant_info: null,
    financial_info: {
      rent: '£1,250/month',
      deposit: '£1,250',
      balance: '£0',
      last_payment_date: '2025-03-10',
      next_due_date: '2025-04-10',
    },
    documents: [
      { name: 'Assured Shorthold Tenancy.pdf' },
      { name: 'Inventory Checklist.pdf' },
    ],
    maintenance_records: [
      { title: 'Boiler serviced — 2025-02-05' },
      { title: 'Smoke detectors replaced — 2025-01-16' },
    ],
    inspections: {
      last_inspection_date: '2025-01-20',
      notes: 'No major issues found. Minor scuffs on hallway wall.',
    },
    inventory: {
      id: 1,
      property_id: 123,
      property_name: 'Oak Street Residence',
      rooms: [
        {
          id: 10,
          room_name: 'Living Room',
          room_type: 'Living Room',
          items: [
            {
              id: 100,
              name: 'Sofa',
              brand: 'IKEA',
              purchase_date: '2022-06-01',
              value: 300,
              condition: 'Good',
              owner: 'Nectar',
              notes: 'Two-seat fabric sofa in charcoal.',
              photos: [
                'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
                'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=800&q=80',
              ],
              quantity: 1,
              created: now,
              updated: now,
            },
            {
              id: 101,
              name: 'Television',
              brand: 'Samsung',
              value: 500,
              condition: 'Excellent',
              owner: 'Tenant',
              photos: [],
              quantity: 1,
              created: now,
              updated: now,
            },
          ],
        },
        {
          id: 20,
          room_name: 'Bedroom',
          room_type: 'Bedroom',
          items: [
            {
              id: 200,
              name: 'Bed Frame',
              condition: 'Good',
              owner: 'Nectar',
              quantity: 1,
              photos: [
                'https://images.unsplash.com/photo-1505691723518-36a5ac3b2b8f?w=800&q=80',
              ],
              created: now,
              updated: now,
            },
            {
              id: 201,
              name: 'Wardrobe',
              condition: 'Fair',
              owner: 'Nectar',
              quantity: 1,
              photos: [],
              created: now,
              updated: now,
            },
          ],
        },
      ],
    },
  }
}

// Overlay helper: fills only missing sections from mock data while preserving real data
function overlayMissingSections(base: PropertyDetail, mock: PropertyDetail): PropertyDetail {
  const acfBase: any = base.acf ?? {}
  const acfMock: any = mock.acf ?? {}
  const mergedAcf: any = { ...acfBase }
  if (isEmptyObject(acfBase.profile_management)) {
    mergedAcf.profile_management = acfMock.profile_management
  }
  if (isEmptyObject(acfBase.tenants_group)) {
    mergedAcf.tenants_group = acfMock.tenants_group
  }
  return {
    ...base,
    acf: mergedAcf,
    tenant_info: (isEmptyObject(base.tenant_info) ? mock.tenant_info : base.tenant_info),
    financial_info: (isEmptyObject(base.financial_info) ? mock.financial_info : base.financial_info),
    documents: (base.documents && base.documents.length > 0) ? base.documents : (mock.documents ?? base.documents),
    maintenance_records: (base.maintenance_records && base.maintenance_records.length > 0) ? base.maintenance_records : (mock.maintenance_records ?? base.maintenance_records),
    inspections: (isEmptyObject(base.inspections) ? mock.inspections : base.inspections),
    inventory: (!base.inventory || (Array.isArray(base.inventory.rooms) && base.inventory.rooms.length === 0)) ? mock.inventory : base.inventory,
  }
}

// isEmptyObject moved to ../utils/object