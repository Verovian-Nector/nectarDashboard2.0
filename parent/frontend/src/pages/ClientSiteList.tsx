import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Group,
  Badge,
  Text,
  ActionIcon,
  Center,
  Paper,
  Title,
  Modal,
  TextInput,
  Box,
  Skeleton,
  Stack,
  Card,
  Avatar,
  Tooltip,
  Container,
} from '@mantine/core';
import { IconPlayerPlay, IconEye, IconPlus, IconSearch, IconServer, IconCalendar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { clientSiteApi } from '../api/client';
import { useState } from 'react';

export function ClientSiteList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<{ name: string; subdomain: string }>({ name: '', subdomain: '' });
  const [search, setSearch] = useState('');

  const { data: clientSites, isLoading } = useQuery({
    queryKey: ['clientSites'],
    queryFn: clientSiteApi.getClientSites,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: clientSiteApi.getConfig,
  });

  const createMutation = useMutation({
    mutationFn: clientSiteApi.createClientSite,
    onSuccess: (newClientSite) => {
      notifications.show({ title: 'Success', message: 'Client site created successfully', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['clientSites'] });
      setCreateOpen(false);
      setFormData({ name: '', subdomain: '' });
      setTimeout(() => {
        navigate(`/client-site/${newClientSite.id}`);
      }, 500);
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.detail || 'Failed to create client site', color: 'red' });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subdomain.trim()) {
      notifications.show({ title: 'Validation Error', message: 'Please fill in all fields', color: 'orange' });
      return;
    }
    if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      notifications.show({ title: 'Validation Error', message: 'Subdomain can only contain lowercase letters, numbers, and hyphens', color: 'orange' });
      return;
    }
    createMutation.mutate(formData);
  };

  // Filter client sites
  const filteredSites = clientSites?.filter(site =>
    site.name.toLowerCase().includes(search.toLowerCase()) ||
    site.subdomain.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Container size="xl">
        <Stack gap="lg">
          <Group justify="space-between">
            <Skeleton height={40} width={200} />
            <Skeleton height={40} width={150} />
          </Group>
          <Card padding="lg" radius="lg" withBorder>
            <Stack>
              {[1, 2, 3].map(i => <Skeleton key={i} height={50} radius="md" />)}
            </Stack>
          </Card>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" p={0}>
      <Stack gap="xl">
        {/* Header Section */}
        <Group justify="space-between" align="end">
          <Box>
            <Title order={2} style={{ color: '#1a202c', fontWeight: 800, marginBottom: 8 }}>Client Sites</Title>
            <Text c="dimmed">Manage all your client instances and environments</Text>
          </Box>
          <Button
            onClick={() => setCreateOpen(true)}
            leftSection={<IconPlus size={18} />}
            size="md"
            variant="filled"
            color="darkBlue"
          >
            New Client Site
          </Button>
        </Group>

        {/* Filters & Content */}
        <Card shadow="sm" padding="lg" radius="lg" withBorder>
          <Group mb="lg">
            <TextInput
              placeholder="Search sites..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: 400 }}
            />
          </Group>

          {filteredSites.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap="md">
                <Box p="xl" style={{ borderRadius: '50%', background: '#F1F5F9' }}>
                  <IconServer size={40} color="#94A3B8" />
                </Box>
                <Title order={4} c="dimmed">No client sites found</Title>
                <Text size="sm" c="dimmed">Get started by creating your first client deployment.</Text>
                <Button variant="light" onClick={() => setCreateOpen(true)}>Create Client Site</Button>
              </Stack>
            </Center>
          ) : (
            <Table horizontalSpacing="lg" verticalSpacing="md" withRowBorders={true}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Subdomain</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredSites.map((site) => (
                  <Table.Tr key={site.id} style={{ transition: 'background-color 0.2s' }}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar color="blue" radius="md">
                          {site.name.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Text fw={600} size="sm">{site.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray" size="sm" tt="lowercase">
                        {site.subdomain}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="dot"
                        size="md"
                        color={site.is_active ? 'green' : 'gray'}
                      >
                        {site.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" style={{ color: '#909296' }}>
                        <IconCalendar size={14} />
                        <Text size="sm">{new Date(site.created_at).toLocaleDateString()}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="View Details">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="lg"
                            onClick={() => navigate(`/client-site/${site.id}`)}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>

      {/* Create Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Client Site"
        centered
        size="lg"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        <form onSubmit={handleCreateSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed" mb="xs">
              Deploy a new isolated client environment. This will provision a new subdomain and database.
            </Text>

            <TextInput
              label="Client Site Name"
              placeholder="e.g. Acme Corp"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-autofocus
            />

            <TextInput
              label="Subdomain"
              placeholder="acme-corp"
              value={formData.subdomain}
              onChange={(e: any) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              required
              description={
                config
                  ? `Final URL: ${config.child_service_base_url_template.replace('<subdomain>', formData.subdomain || '...')}`
                  : 'Generating URL preview...'
              }
              rightSectionWidth={100}
            />

            <Group justify="flex-end" mt="xl">
              <Button variant="subtle" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending}
                color="darkBlue"
              >
                Deploy Site
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}