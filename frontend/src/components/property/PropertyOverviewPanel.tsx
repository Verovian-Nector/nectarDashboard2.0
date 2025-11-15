import React from 'react';
import { Title, Text, Group, Stack, Card, SimpleGrid, ActionIcon, Tooltip, ThemeIcon } from '@mantine/core';
import { IconPencil, IconBed, IconBath, IconSofa, IconCar } from '@tabler/icons-react';
import { formatCurrency } from '../../utils/format';

type SizeToken = 'sm' | 'md' | 'lg';

function MonochromeIcon({ children, size = 'md' }: { children: React.ReactNode; size?: SizeToken }) {
  const dim: Record<SizeToken, number> = { sm: 24, md: 30, lg: 36 };
  return (
    <ThemeIcon
      size={dim[size]}
      radius="md"
      variant="filled"
      style={{ backgroundColor: '#000000', color: '#ffffff' }}
    >
      {children}
    </ThemeIcon>
  );
}

export type PropertyOverviewPanelProps = {
  canEdit: boolean;
  onEdit: () => void;
  postcode: string | null;
  houseNumber: string | number | null;
  referenceNumber: string;
  location: string | null;
  paymentFrequency: string | null;
  priceRaw: any;
  furnished: string | null;
  propertyType: string | null;
  marketStatus: string | null;
  beds: any;
  bathrooms: any;
  livingRooms: any;
  parking: any;
};

export default function PropertyOverviewPanel(props: PropertyOverviewPanelProps) {
  const {
    canEdit,
    onEdit,
    postcode,
    houseNumber,
    referenceNumber,
    location,
    paymentFrequency,
    priceRaw,
    furnished,
    propertyType,
    marketStatus,
    beds,
  bathrooms,
  livingRooms,
  parking,
} = props;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={4}>Overview</Title>
        {canEdit && (
          <Tooltip label="Edit overview" withArrow>
            <ActionIcon size="lg" variant="light" color="brand" radius="md" onClick={onEdit}>
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <Card withBorder p="md" radius="md" shadow="xs">
        <Title order={4}>Property Details</Title>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mt="sm">
          <Stack gap={8}>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Postcode</Text>
              <Text fw={500}>{postcode ?? '-'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={600}>House Number</Text>
              <Text fw={500}>{houseNumber ?? '-'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Reference Number</Text>
              <Text fw={500}>{referenceNumber}</Text>
            </Stack>
          </Stack>

          <Stack gap={8}>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Location</Text>
              <Text fw={500}>{location ?? '-'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Payment Frequency</Text>
              <Text fw={500}>{paymentFrequency ?? '-'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Price</Text>
              <Text fw={500}>{formatCurrency(priceRaw)}</Text>
            </Stack>
          </Stack>

          <Stack gap={8}>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Furnish State</Text>
              <Text fw={500}>{furnished ?? '-'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Property Type</Text>
              <Text fw={500}>{propertyType ?? '-'}</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={600}>Market Status</Text>
              <Text fw={500}>{marketStatus ?? '-'}</Text>
            </Stack>
          </Stack>
        </SimpleGrid>
      </Card>

      <Card withBorder p="md" radius="md" shadow="xs">
        <Title order={4}>Snapshot</Title>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mt="sm">
          <Card withBorder p="md" radius="md">
            <Group align="center" gap="sm">
              <MonochromeIcon size="lg"><IconBed size={18} /></MonochromeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Bedrooms</Text>
                <Text fw={600}>{beds ?? '-'}</Text>
              </Stack>
            </Group>
          </Card>
          <Card withBorder p="md" radius="md">
            <Group align="center" gap="sm">
              <MonochromeIcon size="lg"><IconBath size={18} /></MonochromeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Bathrooms</Text>
                <Text fw={600}>{bathrooms ?? '-'}</Text>
              </Stack>
            </Group>
          </Card>
          <Card withBorder p="md" radius="md">
            <Group align="center" gap="sm">
              <MonochromeIcon size="lg"><IconSofa size={18} /></MonochromeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Living Rooms</Text>
                <Text fw={600}>{livingRooms ?? '-'}</Text>
              </Stack>
            </Group>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group align="center" gap="sm">
              <MonochromeIcon size="lg"><IconCar size={18} /></MonochromeIcon>
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Parking</Text>
                <Text fw={600}>{parking ?? '-'}</Text>
              </Stack>
            </Group>
          </Card>
          
        </SimpleGrid>
      </Card>
    </Stack>
  );
}