import { Modal, Stack, Group, TextInput, Divider, Button, Select, Text, Avatar, Paper } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useFieldValues } from '../context/FieldValuesProvider'
import { IconCurrencyPound } from '@tabler/icons-react'

type Financials = {
  rent_to_landlord?: string | number | null
  rent_yield?: string | number | null
  collection_date?: string | null
  payment_date?: string | null
  payment_method?: string | null
}

type Props = {
  opened: boolean
  data: Financials
  onClose: () => void
  onSave: (updated: Financials) => void
}

export default function EditFinancialsModal({ opened, data, onClose, onSave }: Props) {
  const { getOptions } = useFieldValues()

  const [rentToLandlord, setRentToLandlord] = useState<string | number | null>(null)
  const [rentYield, setRentYield] = useState<string | number | null>(null)
  const [collectionDate, setCollectionDate] = useState<Date | null>(null)
  const [paymentDate, setPaymentDate] = useState<Date | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  useEffect(() => {
    setRentToLandlord(data?.rent_to_landlord ?? null)
    setRentYield(data?.rent_yield ?? null)
    setPaymentMethod(data?.payment_method ?? null)
    setCollectionDate(data?.collection_date ? dayjs(String(data.collection_date)).toDate() : null)
    setPaymentDate(data?.payment_date ? dayjs(String(data.payment_date)).toDate() : null)
  }, [data, opened])

  const handleSave = () => {
    const payload: Financials = {
      rent_to_landlord: rentToLandlord ?? null,
      rent_yield: rentYield ?? null,
      collection_date: collectionDate ? dayjs(collectionDate).format('YYYY-MM-DD') : null,
      payment_date: paymentDate ? dayjs(paymentDate).format('YYYY-MM-DD') : null,
      payment_method: paymentMethod ?? null,
    }
    onSave(payload)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand"><IconCurrencyPound size={18} /></Avatar>
          <Text fw={700}>Edit Financials</Text>
        </Group>
      }
      radius="md"
      padding="md"
      overlayProps={{ opacity: 0.2, blur: 2 }}
      styles={{
        header: { borderBottom: 'none' },
        title: { fontWeight: 700 },
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }
      }}
      centered
      size="lg"
    >
      <div style={{ height: 6, background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))' }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          <Text c="dimmed" size="sm">Update rent, yield, dates, and payment method.</Text>
          <Divider />

          <TextInput
            label="Rent to landlord (£)"
            value={String(rentToLandlord ?? '')}
            onChange={(e) => setRentToLandlord(e.currentTarget.value)}
          />

          <Group grow>
            <TextInput
              label="Rent yield (%)"
              value={String(rentYield ?? '')}
              onChange={(e) => setRentYield(e.currentTarget.value)}
            />
            <Select
              label="Payment method"
              data={getOptions('payment_method')}
              value={paymentMethod}
              onChange={setPaymentMethod}
              allowDeselect
              clearable
            />
          </Group>

          <Group grow>
            <DateInput
              label="Collection date"
              value={collectionDate}
              onChange={setCollectionDate}
              placeholder="Select date"
              valueFormat="DD MMM YYYY"
              clearable
            />
            <DateInput
              label="Payment date"
              value={paymentDate}
              onChange={setPaymentDate}
              placeholder="Select date"
              valueFormat="DD MMM YYYY"
              clearable
            />
          </Group>

          <Divider />
          <Group justify="space-between">
            <Button variant="light" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </Group>
        </Stack>
      </Paper>
    </Modal>
  )
}