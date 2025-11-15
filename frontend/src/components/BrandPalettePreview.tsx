import { Card, Stack, Text, SimpleGrid, Group, Badge, Box, Divider } from '@mantine/core'

type Props = {
  palette: string[]
}

function usageLabel(index: number): string {
  if (index <= 2) return 'Backgrounds / subtle fills'
  if (index <= 5) return 'Borders / UI chrome'
  if (index === 6) return 'Primary actions'
  if (index <= 8) return 'Hover / active states'
  return 'Emphasis / accents'
}

export default function BrandPalettePreview({ palette }: Props) {
  const valid = Array.isArray(palette) && palette.length === 10
  const shades = valid ? palette : []

  return (
    <Card withBorder p="md" radius="md" shadow="xs" mt="md">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={600}>Brand Palette (derived)</Text>
          <Badge variant="light" style={{ textTransform: 'none' }}>brand[0..9]</Badge>
        </Group>
        <Text c="dimmed" size="sm">
          Guidance: backgrounds brand[0–2], borders/UI chrome brand[3–5], primary actions brand[6],
          hover/active brand[7–8], emphasis/accents brand[8–9].
        </Text>
        <Divider my="xs" />
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          {shades.map((hex, i) => (
            <Card key={`${hex}-${i}`} withBorder p="xs" radius="md">
              <Stack gap={6}>
                <Box style={{ backgroundColor: hex, height: 36, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
                <Group gap={6} align="center">
                  <Badge size="sm" variant="light" style={{ textTransform: 'none' }}>{`brand[${i}]`}</Badge>
                  {i === 6 && <Badge size="sm" color="brand" variant="filled" style={{ textTransform: 'none' }}>base</Badge>}
                </Group>
                <Text size="xs" c="dimmed">{usageLabel(i)}</Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Card>
  )
}