import { Table, Badge, Group, Text, Anchor, Button, Tooltip } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { Property } from '../api/properties'

type Props = {
  items: Property[]
}

export default function PropertiesTable({ items }: Props) {
  type Column = { key: string; label: string; render: (p: Property) => React.ReactNode }

  const columns: Column[] = [
    {
      key: 'id',
      label: 'ID',
      render: (p) => p.id,
    },
    {
      key: 'title',
      label: 'Title',
      render: (p) => (
        <Group gap="xs">
          <Anchor component={Link} to={`/properties/${p.id}`} fw={500}>
            {p.title}
          </Anchor>
        </Group>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      render: (p) => (
        <Tooltip label={p.address} withArrow>
          <Text lineClamp={1}>{p.address}</Text>
        </Tooltip>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      render: (p) => {
        const pg: any = (p as any)?.acf?.profilegroup ?? {}
        const propertyType: string | null = pg?.property_type ?? null
        const beds: any = pg?.beds ?? null
        const baths: any = pg?.bathrooms ?? null
        const priceRaw: any = pg?.incoming_price ?? pg?.price ?? null
        const paymentFrequency: string | null = pg?.payment_frequency ?? pg?.incoming_payment_frequency ?? pg?.outgoing_payment_frequency ?? null
        const priceLabel = typeof priceRaw === 'number'
          ? `£${priceRaw.toLocaleString()}`
          : (typeof priceRaw === 'string' && priceRaw.trim() ? `£${priceRaw}` : null)
        const freqLabel = paymentFrequency ? ` • ${paymentFrequency}` : ''
        return (
          <Group gap={6} wrap="wrap">
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
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <Badge color={p.published ? 'brand' : 'gray'} variant={p.published ? 'filled' : 'outline'}>
          {p.published ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'updated',
      label: 'Updated',
      render: (p) => new Date(p.updated_at).toLocaleString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => (
        <Button component={Link} to={`/properties/${p.id}`} size="xs">Open</Button>
      ),
    },
  ]

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders className="premium-properties-table">
      <Table.Thead>
        <Table.Tr>
          {columns.map((col) => (
            <Table.Th key={col.key}>{col.label}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={columns.length}>
              <Text c="dimmed">No properties found.</Text>
            </Table.Td>
          </Table.Tr>
        )}
        {items.map((p) => (
          <Table.Tr key={p.id} className={p.published ? 'row--published' : 'row--draft'}>
            {columns.map((col) => (
              <Table.Td key={col.key}>{col.render(p)}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}