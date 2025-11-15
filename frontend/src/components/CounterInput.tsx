import { ActionIcon, Group, Text, Stack } from '@mantine/core'
import { IconMinus, IconPlus } from '@tabler/icons-react'

type Props = {
  label: string
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  labelAbove?: boolean
}

export default function CounterInput({ label, value, onChange, min = 0, max = 99, labelAbove = false }: Props) {
  const dec = () => onChange(Math.max(min, (value || 0) - 1))
  const inc = () => onChange(Math.min(max, (value || 0) + 1))

  if (labelAbove) {
    return (
      <Stack gap={4} align="center">
        <Text fw={500}>{label}</Text>
        <Group gap="xs" align="center">
          <ActionIcon variant="light" onClick={dec} aria-label={`Decrease ${label}`}><IconMinus size={16} /></ActionIcon>
          <Text style={{ width: 36, textAlign: 'center' }}>{value ?? 0}</Text>
          <ActionIcon variant="light" onClick={inc} aria-label={`Increase ${label}`}><IconPlus size={16} /></ActionIcon>
        </Group>
      </Stack>
    )
  }

  return (
    <Group gap="xs" align="center">
      <Text fw={500} style={{ width: 120 }}>{label}</Text>
      <ActionIcon variant="light" onClick={dec} aria-label={`Decrease ${label}`}><IconMinus size={16} /></ActionIcon>
      <Text style={{ width: 36, textAlign: 'center' }}>{value ?? 0}</Text>
      <ActionIcon variant="light" onClick={inc} aria-label={`Increase ${label}`}><IconPlus size={16} /></ActionIcon>
    </Group>
  )
}