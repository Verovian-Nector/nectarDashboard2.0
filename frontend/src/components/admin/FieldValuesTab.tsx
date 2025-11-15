import React from 'react';
import {
  Tabs,
  Group,
  Select,
  Button,
  Text,
  Card,
  Stack,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  Divider,
  TextInput,
  Table,
} from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { FIELD_DEFAULTS, FIELD_USAGE_NOTES } from '../../config/fieldDefaults';

type IntegrationConfig = { id: number; name?: string; integration_type?: string; client_id?: number };

type FieldValuesTabProps = {
  fvTab: string;
  setFvTab: (val: string) => void;
  integrations: IntegrationConfig[];
  activeIntegration: IntegrationConfig | null;
  selectedIntegrationId: number | null;
  setSelectedIntegrationId: (id: number | null) => void;
  saveFieldValues: () => void;
  locationOptions: string[];
  contractors: string[];
  fieldValues: Record<string, string[]>;
  newValues: Record<string, string>;
  setNewValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setContractors: React.Dispatch<React.SetStateAction<string[]>>;
  openEditFieldValue: (category: string, index: number, current: string) => void;
  moveUpFieldValue: (category: string, index: number) => void;
  removeFieldValue: (category: string, index: number) => void;
  addFieldValue: (category: string) => void;
};

const STATIC_TABS: string[] = ['locations', 'contractors'];

export default function FieldValuesTab(props: FieldValuesTabProps) {
  const {
    fvTab,
    setFvTab,
    integrations,
    activeIntegration,
    selectedIntegrationId,
    setSelectedIntegrationId,
    saveFieldValues,
    locationOptions,
    contractors,
    fieldValues,
    newValues,
    setNewValues,
    setContractors,
    openEditFieldValue,
    moveUpFieldValue,
    removeFieldValue,
    addFieldValue,
  } = props;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text c="dimmed" size="sm">Consolidated options for dropdowns and statuses across the app.</Text>
        <Group gap="xs">
          <Select
            value={activeIntegration ? String(activeIntegration.id) : null}
            onChange={(v) => setSelectedIntegrationId(v ? Number(v) : null)}
            data={integrations.map((i) => ({
              value: String(i.id),
              label: i.name || `${i.integration_type} (client ${i.client_id})`,
            }))}
            placeholder="Integration"
          />
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={saveFieldValues} disabled={!activeIntegration}>Save All</Button>
        </Group>
      </Group>
      {!activeIntegration && (
        <Text c="red" size="sm">No integration config found. Create one in Integrations tab to persist field values.</Text>
      )}
      <Divider my="xs" />
      <Card withBorder p="sm" radius="md">
        <Tabs value={fvTab} onChange={(v) => v && setFvTab(String(v))} variant="pills">
          <Tabs.List>
            {STATIC_TABS.map((t) => (
              <Tabs.Tab key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</Tabs.Tab>
            ))}
            {Object.keys(FIELD_DEFAULTS).map((key) => (
              <Tabs.Tab key={key} value={key}>
                {key.replace('_', ' ').replace(/\b\w/g, (s) => s.toUpperCase())}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {/* Locations */}
          <Tabs.Panel value="locations" pt="md">
            <Stack gap="sm">
              <Text c="dimmed" size="xs">{FIELD_USAGE_NOTES['locations']}</Text>
              <Group gap="xs">
                <TextInput placeholder="Add location" value={newValues['locations'] || ''} onChange={(e) => setNewValues((p) => ({ ...p, locations: e.currentTarget.value }))} />
                <Button leftSection={<IconPlus size={16} />} onClick={() => addFieldValue('locations')}>Add</Button>
              </Group>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {locationOptions.map((loc, idx) => (
                    <Table.Tr key={`${loc}-${idx}`}>
                      <Table.Td>{loc}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Edit"><ActionIcon variant="light" color="brand" onClick={() => openEditFieldValue('locations', idx, loc)}><IconPencil size={16} /></ActionIcon></Tooltip>
                          <Tooltip label="Move up"><ActionIcon variant="light" onClick={() => moveUpFieldValue('locations', idx)}><IconRefresh size={16} /></ActionIcon></Tooltip>
                          <Tooltip label="Remove"><ActionIcon variant="light" color="red" onClick={() => removeFieldValue('locations', idx)}><IconTrash size={16} /></ActionIcon></Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* Contractors */}
          <Tabs.Panel value="contractors" pt="md">
            <Stack gap="sm">
              <Text c="dimmed" size="xs">{FIELD_USAGE_NOTES['contractors']}</Text>
              <Group gap="xs">
                <TextInput placeholder="Add contractor" value={newValues['contractors'] || ''} onChange={(e) => setNewValues((p) => ({ ...p, contractors: e.currentTarget.value }))} />
                <Button leftSection={<IconPlus size={16} />} onClick={() => addFieldValue('contractors')}>Add</Button>
              </Group>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Contractor</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {contractors.map((name, idx) => (
                    <Table.Tr key={`${name}-${idx}`}>
                      <Table.Td>{name}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Edit"><ActionIcon variant="light" color="brand" onClick={() => openEditFieldValue('contractors', idx, name)}><IconPencil size={16} /></ActionIcon></Tooltip>
                          <Tooltip label="Move up"><ActionIcon variant="light" onClick={() => moveUpFieldValue('contractors', idx)}><IconRefresh size={16} /></ActionIcon></Tooltip>
                          <Tooltip label="Remove"><ActionIcon variant="light" color="red" onClick={() => removeFieldValue('contractors', idx)}><IconTrash size={16} /></ActionIcon></Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group justify="flex-end" mt="sm">
                <Button variant="light" onClick={() => setContractors([...contractors])}>Apply</Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          {/* Dynamic generic panels for the rest */}
          {Object.keys(FIELD_DEFAULTS).map((key) => (
            <Tabs.Panel key={key} value={key} pt="md">
              <Stack gap="sm">
                <Text c="dimmed" size="xs">{FIELD_USAGE_NOTES[key] || ''}</Text>
                <Group gap="xs">
                  <TextInput placeholder={`Add ${key.replace('_',' ')}`} value={newValues[key] || ''} onChange={(e) => setNewValues((p) => ({ ...p, [key]: e.currentTarget.value }))} />
                  <Button leftSection={<IconPlus size={16} />} onClick={() => addFieldValue(key)}>Add</Button>
                </Group>
                <Table withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Value</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(fieldValues[key] || []).map((val, idx) => (
                      <Table.Tr key={`${val}-${idx}`}>
                        <Table.Td>{val}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="Edit"><ActionIcon variant="light" color="brand" onClick={() => openEditFieldValue(key, idx, val)}><IconPencil size={16} /></ActionIcon></Tooltip>
                            <Tooltip label="Move up"><ActionIcon variant="light" onClick={() => moveUpFieldValue(key, idx)}><IconRefresh size={16} /></ActionIcon></Tooltip>
                            <Tooltip label="Remove"><ActionIcon variant="light" color="red" onClick={() => removeFieldValue(key, idx)}><IconTrash size={16} /></ActionIcon></Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Card>
    </Stack>
  );
}