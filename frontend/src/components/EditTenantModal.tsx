import { useEffect, useMemo, useState } from 'react'
import { Modal, Stack, Group, Text, TextInput, Select, Badge, Avatar, Divider, Button, Paper, Tooltip, Stepper, Anchor, ActionIcon } from '@mantine/core'
import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { notifications } from '@mantine/notifications'
import { IconUser, IconMail, IconPhone, IconBuildingSkyscraper, IconCalendar, IconFileText, IconUsers, IconShieldCheck, IconUpload, IconX } from '@tabler/icons-react'
import { useFieldValues } from '../context/FieldValuesProvider'
import { uploadFiles } from '../api/upload'

type TenantEditable = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  employmentStatus?: string | null
  status: 'Verified' | 'Pending' | 'Unknown'
  propertyTitle?: string
  propertyAddress?: string | null
  rightToRent?: string | null
  proofOfId?: string | null
  emergencyContact?: { name?: string | null; phone?: string | null } | null
  guarantor?: { name?: string | null; email?: string | null; phone?: string | null } | null
  dateOfBirth?: string | null
  agreementSignedDate?: string | null
}

type Props = {
  opened: boolean
  tenant: TenantEditable | null
  onClose: () => void
  onSave: (updated: TenantEditable) => void
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

export default function EditTenantModal({ opened, tenant, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [employmentStatus, setEmploymentStatus] = useState<string | null>(null)
  const [status, setStatus] = useState<'Verified' | 'Pending' | 'Unknown'>('Unknown')
  const [dateOfBirthDate, setDateOfBirthDate] = useState<Date | null>(null)
  const [agreementSignedDateDate, setAgreementSignedDateDate] = useState<Date | null>(null)
  const [rightToRent, setRightToRent] = useState<string | null>(null)
  const [proofOfId, setProofOfId] = useState<string | null>(null)
  const [emergencyName, setEmergencyName] = useState<string | null>(null)
  const [emergencyPhone, setEmergencyPhone] = useState<string | null>(null)
  const [guarantorName, setGuarantorName] = useState<string | null>(null)
  const [guarantorEmail, setGuarantorEmail] = useState<string | null>(null)
  const [guarantorPhone, setGuarantorPhone] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const { getOptions } = useFieldValues()

  useEffect(() => {
    if (!tenant) return
    setName(tenant.name || '')
    setEmail(tenant.email ?? null)
    setPhone(tenant.phone ?? null)
    setEmploymentStatus(tenant.employmentStatus ?? null)
    setStatus(tenant.status)
    setDateOfBirthDate(tenant.dateOfBirth ? (dayjs(tenant.dateOfBirth).isValid() ? dayjs(tenant.dateOfBirth).toDate() : null) : null)
    setAgreementSignedDateDate(tenant.agreementSignedDate ? (dayjs(tenant.agreementSignedDate).isValid() ? dayjs(tenant.agreementSignedDate).toDate() : null) : null)
    setRightToRent(tenant.rightToRent ?? null)
    setProofOfId(tenant.proofOfId ?? null)
    setEmergencyName(tenant.emergencyContact?.name ?? null)
    setEmergencyPhone(tenant.emergencyContact?.phone ?? null)
    setGuarantorName(tenant.guarantor?.name ?? null)
    setGuarantorEmail(tenant.guarantor?.email ?? null)
    setGuarantorPhone(tenant.guarantor?.phone ?? null)
  }, [tenant])

  const initial = useMemo(() => initialsFromName(tenant?.name || ''), [tenant])

  const canSave = name.trim().length > 0

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <Avatar radius="xl" size={32} color="brand">{initial || '?'}</Avatar>
          <Text fw={700}>Edit Tenant</Text>
        </Group>
      }
      radius="md"
      padding="md"
      overlayProps={{ opacity: 0.2, blur: 2 }}
      styles={{
        header: {
          borderBottom: 'none',
        },
        title: {
          fontWeight: 700,
        },
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Premium header accent */}
      <div style={{
        height: 6,
        background: 'linear-gradient(90deg, var(--mantine-color-brand-6), var(--mantine-color-brand-4))'
      }} />

      <Paper p="md" radius={0} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          {/* Context */}
          {tenant && (
            <Group justify="space-between" align="center">
              <Group>
                <Badge variant="light" color="brand" leftSection={<IconBuildingSkyscraper size={14} />}>{tenant.propertyTitle || '—'}</Badge>
                {tenant.propertyAddress && (
                  <Text c="dimmed" size="sm">{tenant.propertyAddress}</Text>
                )}
              </Group>
              <Badge variant="light" color={status === 'Verified' ? 'green' : status === 'Pending' ? 'yellow' : 'gray'}>{status}</Badge>
            </Group>
          )}

          <Divider my="xs" />

          {/* Stepper for premium UX */}
          <Stepper active={active} onStepClick={setActive} size="sm" allowNextStepsSelect={false}
            styles={{
              stepIcon: { borderColor: 'var(--mantine-color-brand-6)' },
              step: { cursor: 'pointer' },
              separator: { background: 'var(--mantine-color-brand-4)' }
            }}
          >
            <Stepper.Step label="Details" description="Contact & status">
              <Stack gap="sm">
                <TextInput
                  label="Full name"
                  placeholder="Enter tenant name"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  leftSection={<IconUser size={16} />}
                />

                <Group grow>
                  <TextInput
                    label="Email"
                    placeholder="name@example.com"
                    value={email ?? ''}
                    onChange={(e) => setEmail(e.currentTarget.value || null)}
                    leftSection={<IconMail size={16} />}
                    error={email && !/^\S+@\S+\.\S+$/.test(email) ? 'Invalid email format' : undefined}
                  />
                  <TextInput
                    label="Phone"
                    placeholder="+44 7700 000000"
                    value={phone ?? ''}
                    onChange={(e) => setPhone(e.currentTarget.value || null)}
                    leftSection={<IconPhone size={16} />}
                    error={phone && !/^[+]?[\d\s()\-]{7,}$/.test(phone) ? 'Invalid phone format' : undefined}
                  />
                </Group>

                <Group grow>
                  <Select
                    label="Employment status"
                    placeholder="Select"
                    data={getOptions('employment_status')}
                    value={employmentStatus}
                    onChange={setEmploymentStatus}
                    allowDeselect
                    clearable
                  />
                  <Select
                    label="Verification status"
                    placeholder="Select"
                    data={[
                      { value: 'Verified', label: 'Verified' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Unknown', label: 'Unknown' },
                    ]}
                    value={status}
                    onChange={(v: any) => setStatus(v)}
                  />
                </Group>

                <Group grow>
                  <DateInput
                    label="Date of birth"
                    placeholder="Select date"
                    value={dateOfBirthDate}
                    onChange={setDateOfBirthDate}
                    leftSection={<IconCalendar size={16} />}
                    maxDate={new Date()}
                    valueFormat="YYYY-MM-DD"
                  />
                  <DateInput
                    label="Agreement signed date"
                    placeholder="Select date"
                    value={agreementSignedDateDate}
                    onChange={setAgreementSignedDateDate}
                    leftSection={<IconFileText size={16} />}
                    maxDate={new Date()}
                    valueFormat="YYYY-MM-DD"
                  />
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Documents" description="Upload proofs">
              <Stack gap="sm">
                {/* Right to Rent */}
                <Stack gap={6}
                  style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 12, padding: 12 }}
                >
                  <Text fw={500}>Right to Rent</Text>
                  {rightToRent ? (
                    <Group justify="space-between" align="center">
                      <Anchor href={rightToRent} target="_blank" rel="noopener noreferrer">Open document</Anchor>
                      <ActionIcon variant="subtle" color="red" aria-label="Clear Right to Rent" onClick={() => setRightToRent(null)}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <Dropzone
                      onDrop={async (files) => {
                        try {
                          const urls = await uploadFiles(files)
                          if (urls.length) {
                            setRightToRent(urls[0])
                            notifications.show({ title: 'Uploaded', message: 'Right to Rent uploaded', color: 'green' })
                          }
                        } catch (e) {
                          notifications.show({ title: 'Upload failed', message: 'Could not upload file', color: 'red' })
                        }
                      }}
                      onReject={(rejections) => {
                        notifications.show({ title: 'Rejected', message: `${rejections.length} file(s) rejected`, color: 'red' })
                      }}
                      accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.svg, 'application/pdf']}
                      maxSize={5 * 1024 ** 2}
                      multiple={false}
                    >
                      <Group justify="center" mih={100}>
                        <Dropzone.Accept>
                          <Group gap={6}><IconUpload size={16} /><Text size="sm">Drop to upload</Text></Group>
                        </Dropzone.Accept>
                        <Dropzone.Idle>
                          <Text size="sm" c="dimmed">Drag a file here, or click to select</Text>
                        </Dropzone.Idle>
                        <Dropzone.Reject>
                          <Text size="sm" c="red">File type/size not allowed</Text>
                        </Dropzone.Reject>
                      </Group>
                    </Dropzone>
                  )}
                </Stack>

                {/* Proof of ID */}
                <Stack gap={6}
                  style={{ border: '1px dashed var(--mantine-color-default-border)', borderRadius: 12, padding: 12 }}
                >
                  <Text fw={500}>Proof of ID</Text>
                  {proofOfId ? (
                    <Group justify="space-between" align="center">
                      <Anchor href={proofOfId} target="_blank" rel="noopener noreferrer">Open document</Anchor>
                      <ActionIcon variant="subtle" color="red" aria-label="Clear Proof of ID" onClick={() => setProofOfId(null)}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <Dropzone
                      onDrop={async (files) => {
                        try {
                          const urls = await uploadFiles(files)
                          if (urls.length) {
                            setProofOfId(urls[0])
                            notifications.show({ title: 'Uploaded', message: 'Proof of ID uploaded', color: 'green' })
                          }
                        } catch (e) {
                          notifications.show({ title: 'Upload failed', message: 'Could not upload file', color: 'red' })
                        }
                      }}
                      onReject={(rejections) => {
                        notifications.show({ title: 'Rejected', message: `${rejections.length} file(s) rejected`, color: 'red' })
                      }}
                      accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.svg, 'application/pdf']}
                      maxSize={5 * 1024 ** 2}
                      multiple={false}
                    >
                      <Group justify="center" mih={100}>
                        <Dropzone.Accept>
                          <Group gap={6}><IconUpload size={16} /><Text size="sm">Drop to upload</Text></Group>
                        </Dropzone.Accept>
                        <Dropzone.Idle>
                          <Text size="sm" c="dimmed">Drag a file here, or click to select</Text>
                        </Dropzone.Idle>
                        <Dropzone.Reject>
                          <Text size="sm" c="red">File type/size not allowed</Text>
                        </Dropzone.Reject>
                      </Group>
                    </Dropzone>
                  )}
                </Stack>
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Contacts" description="Emergency & guarantor">
              <Stack gap="sm">
                <Text fw={600} size="sm">Emergency Contact</Text>
                <Group grow>
                  <TextInput
                    label="Name"
                    placeholder="Emergency contact name"
                    value={emergencyName ?? ''}
                    onChange={(e) => setEmergencyName(e.currentTarget.value || null)}
                    leftSection={<IconUsers size={16} />}
                  />
                  <TextInput
                    label="Phone"
                    placeholder="+44 7700 000000"
                    value={emergencyPhone ?? ''}
                    onChange={(e) => setEmergencyPhone(e.currentTarget.value || null)}
                    leftSection={<IconPhone size={16} />}
                    error={emergencyPhone && !/^[+]?[\d\s()\-]{7,}$/.test(emergencyPhone) ? 'Invalid phone format' : undefined}
                  />
                </Group>

                <Divider my="sm" />

                <Text fw={600} size="sm">Guarantor</Text>
                <TextInput
                  label="Name"
                  placeholder="Guarantor name"
                  value={guarantorName ?? ''}
                  onChange={(e) => setGuarantorName(e.currentTarget.value || null)}
                  leftSection={<IconShieldCheck size={16} />}
                />
                <Group grow>
                  <TextInput
                    label="Email"
                    placeholder="guarantor@example.com"
                    value={guarantorEmail ?? ''}
                    onChange={(e) => setGuarantorEmail(e.currentTarget.value || null)}
                    leftSection={<IconMail size={16} />}
                    error={guarantorEmail && !/^\S+@\S+\.\S+$/.test(guarantorEmail) ? 'Invalid email format' : undefined}
                  />
                  <TextInput
                    label="Phone"
                    placeholder="+44 7700 000000"
                    value={guarantorPhone ?? ''}
                    onChange={(e) => setGuarantorPhone(e.currentTarget.value || null)}
                    leftSection={<IconPhone size={16} />}
                    error={guarantorPhone && !/^[+]?[\d\s()\-]{7,}$/.test(guarantorPhone) ? 'Invalid phone format' : undefined}
                  />
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Stack gap="xs">
                <Text fw={600}>Review</Text>
                <Text size="sm"><strong>Name:</strong> {name || '—'}</Text>
                <Text size="sm"><strong>Email:</strong> {email || '—'}</Text>
                <Text size="sm"><strong>Phone:</strong> {phone || '—'}</Text>
                <Text size="sm"><strong>Employment:</strong> {employmentStatus || '—'}</Text>
                <Text size="sm"><strong>Status:</strong> {status}</Text>
                <Text size="sm"><strong>DOB:</strong> {dateOfBirthDate ? dayjs(dateOfBirthDate).format('YYYY-MM-DD') : '—'}</Text>
                <Text size="sm"><strong>Agreement signed:</strong> {agreementSignedDateDate ? dayjs(agreementSignedDateDate).format('YYYY-MM-DD') : '—'}</Text>
                <Text size="sm"><strong>Right to Rent:</strong> {rightToRent ? <Anchor href={rightToRent} target="_blank">Open</Anchor> : '—'}</Text>
                <Text size="sm"><strong>Proof of ID:</strong> {proofOfId ? <Anchor href={proofOfId} target="_blank">Open</Anchor> : '—'}</Text>
                <Text size="sm"><strong>Emergency contact:</strong> {(emergencyName || emergencyPhone) ? `${emergencyName || ''} ${emergencyPhone || ''}` : '—'}</Text>
                <Text size="sm"><strong>Guarantor:</strong> {(guarantorName || guarantorEmail || guarantorPhone) ? `${guarantorName || ''} ${guarantorEmail || ''} ${guarantorPhone || ''}` : '—'}</Text>
              </Stack>
            </Stepper.Completed>
          </Stepper>

          <Tooltip label="Saving updates only affects current view (no backend yet)">
            <Text size="xs" c="dimmed">Changes apply to this session and can be persisted later.</Text>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Sticky bottom actions */}
      <Group
        justify="space-between"
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--mantine-color-body)',
          borderTop: '1px solid var(--mantine-color-default-border)',
          padding: '8px',
          zIndex: 10,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}
      >
        <Group>
          <Button variant="light" onClick={onClose}>Close</Button>
        </Group>
        <Group>
          {active > 0 && (
            <Button variant="subtle" onClick={() => setActive((s) => Math.max(0, s - 1))}>Back</Button>
          )}
          {active < 3 && (
            <Button
              onClick={() => setActive((s) => Math.min(3, s + 1))}
              disabled={(() => {
                const detailsValid = name.trim().length > 0 && (!email || /^\S+@\S+\.\S+$/.test(email)) && (!phone || /^[+]?[\d\s()\-]{7,}$/.test(phone))
                const contactsValid = (!emergencyPhone || /^[+]?[\d\s()\-]{7,}$/.test(emergencyPhone)) && (!guarantorEmail || /^\S+@\S+\.\S+$/.test(guarantorEmail)) && (!guarantorPhone || /^[+]?[\d\s()\-]{7,}$/.test(guarantorPhone))
                if (active === 0) return !detailsValid
                if (active === 1) return false
                if (active === 2) return !contactsValid
                return false
              })()}
            >
              Next
            </Button>
          )}
          {active === 3 && (
            <Button
              onClick={() => {
                if (!tenant) return
                const dobStr = dateOfBirthDate ? dayjs(dateOfBirthDate).format('YYYY-MM-DD') : null
                const agreementStr = agreementSignedDateDate ? dayjs(agreementSignedDateDate).format('YYYY-MM-DD') : null
                const payload: TenantEditable = {
                  id: tenant.id,
                  name: name.trim(),
                  email: email,
                  phone: phone,
                  employmentStatus: employmentStatus ?? null,
                  status,
                  propertyTitle: tenant.propertyTitle,
                  propertyAddress: tenant.propertyAddress ?? null,
                  rightToRent: rightToRent ?? null,
                  proofOfId: proofOfId ?? null,
                  emergencyContact: { name: emergencyName ?? null, phone: emergencyPhone ?? null },
                  guarantor: { name: guarantorName ?? null, email: guarantorEmail ?? null, phone: guarantorPhone ?? null },
                  dateOfBirth: dobStr,
                  agreementSignedDate: agreementStr,
                }
                onSave(payload)
              }}
              disabled={(() => {
                const detailsValid = name.trim().length > 0 && (!email || /^\S+@\S+\.\S+$/.test(email)) && (!phone || /^[+]?[\d\s()\-]{7,}$/.test(phone))
                const contactsValid = (!emergencyPhone || /^[+]?[\d\s()\-]{7,}$/.test(emergencyPhone)) && (!guarantorEmail || /^\S+@\S+\.\S+$/.test(guarantorEmail)) && (!guarantorPhone || /^[+]?[\d\s()\-]{7,}$/.test(guarantorPhone))
                return !canSave || !detailsValid || !contactsValid
              })()}
            >
              Save Changes
            </Button>
          )}
        </Group>
      </Group>
    </Modal>
  )
}