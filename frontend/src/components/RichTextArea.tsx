import { ActionIcon, Group, Paper, Stack, Text, Tooltip } from '@mantine/core'
import { IconBold, IconItalic, IconUnderline, IconList, IconListNumbers, IconLink } from '@tabler/icons-react'
import { useEffect, useRef, useState, useMemo } from 'react'

type Props = {
  label?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextArea({ label, value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [focused, setFocused] = useState(false)
  const isEmpty = useMemo(() => {
    const html = value || ''
    const text = html.replace(/<[^>]*>/g, '').trim()
    return text.length === 0
  }, [value])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Avoid resetting caret if unchanged
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  function exec(cmd: string, arg?: string) {
    // eslint-disable-next-line deprecated-declarations
    document.execCommand(cmd, false, arg)
    // Sync HTML back to parent
    if (ref.current) onChange(ref.current.innerHTML)
  }

  function handleInput() {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <Stack gap="xs">
      {label && <Text fw={500}>{label}</Text>}
      <Paper p="sm" radius="md" withBorder shadow="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Group gap="xs" justify="start" style={{ paddingBottom: 8 }}>
          <Tooltip label="Bold"><ActionIcon color="indigo" variant="light" radius="md" size="md" onClick={() => exec('bold')}><IconBold size={16} /></ActionIcon></Tooltip>
          <Tooltip label="Italic"><ActionIcon color="indigo" variant="light" radius="md" size="md" onClick={() => exec('italic')}><IconItalic size={16} /></ActionIcon></Tooltip>
          <Tooltip label="Underline"><ActionIcon color="indigo" variant="light" radius="md" size="md" onClick={() => exec('underline')}><IconUnderline size={16} /></ActionIcon></Tooltip>
          <Tooltip label="Bulleted list"><ActionIcon color="indigo" variant="light" radius="md" size="md" onClick={() => exec('insertUnorderedList')}><IconList size={16} /></ActionIcon></Tooltip>
          <Tooltip label="Numbered list"><ActionIcon color="indigo" variant="light" radius="md" size="md" onClick={() => exec('insertOrderedList')}><IconListNumbers size={16} /></ActionIcon></Tooltip>
          <Tooltip label="Insert link"><ActionIcon color="indigo" variant="light" radius="md" size="md" onClick={() => {
            const url = prompt('Enter URL')
            if (url) exec('createLink', url)
          }}><IconLink size={16} /></ActionIcon></Tooltip>
        </Group>
        <div style={{ position: 'relative' }}>
          {isEmpty && !focused && (
            <Text c="dimmed" size="sm" style={{ position: 'absolute', left: 12, top: 10, pointerEvents: 'none' }}>
              {placeholder || 'Describe the property...'}
            </Text>
          )}
          <div
            ref={ref}
            contentEditable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onInput={handleInput}
            style={{
              minHeight: 150,
              padding: '10px 12px',
              outline: 'none',
              borderRadius: '8px',
              border: `1px solid ${focused ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-4)'}`,
              backgroundColor: 'var(--mantine-color-body)',
              transition: 'border-color 150ms ease',
            }}
          />
        </div>
        <Text c="dimmed" size="xs" mt="xs">Supports bold, italic, underline, lists and links</Text>
      </Paper>
    </Stack>
  )
}