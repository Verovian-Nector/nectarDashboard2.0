import { Title, Text, Stack } from '@mantine/core'

export default function NotFound() {
  return (
    <Stack p="md" gap="sm">
      <Title order={2}>Page not found</Title>
      <Text c="dimmed">The page you requested does not exist.</Text>
    </Stack>
  )
}