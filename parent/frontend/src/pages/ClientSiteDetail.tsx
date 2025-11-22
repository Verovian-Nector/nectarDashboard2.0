import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Paper,
  Title,
  Text,
  Group,
  Button,
  Badge,
  Stack,
  LoadingOverlay,
  Center,
  Box,
  Divider,
  Card,
  ActionIcon,
  Tooltip,
  Grid,
  Skeleton,
  Timeline,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconPlayerStop,
  IconCopy,
  IconExternalLink,
  IconWorld,
  IconCalendar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { clientSiteApi, api } from '../api/client';

export function ClientSiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clipboard = useClipboard({ timeout: 1000 });

  const { data: clientSite, isLoading, refetch } = useQuery({
    queryKey: ['clientSite', id],
    queryFn: async () => {
      // First try to find in cached list
      const clientSites = await clientSiteApi.getClientSites();
      const found = clientSites.find(t => t.id === id);
      
      // If not found in cache, try direct API call
      if (!found) {
        try {
          const response = await api.get(`/client-sites/${id}`);
          return response.data;
        } catch (error) {
          console.log('[ClientSiteDetail] Client site not found via direct API either:', error);
          return null;
        }
      }
      
      return found;
    },
    enabled: !!id,
    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: clientSiteApi.getConfig,
  });

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<import('../api/client').ClientSiteEvent[]>({
    queryKey: ['events', id],
    queryFn: () => clientSiteApi.getClientSiteEvents(id!),
    enabled: !!id,
  });

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<import('../api/client').ClientSiteHealth>({
    queryKey: ['health', id],
    queryFn: () => clientSiteApi.getClientSiteHealth(id!),
    enabled: !!id,
  });

  const computePublicUrl = () => {
    if (!clientSite) return '';
    // Use the main frontend with subdomain as path parameter
    // This allows the same frontend to serve different client sites
    return `http://localhost:5173/?subdomain=${clientSite.subdomain}`;
  };

  const handleToggleActivation = async () => {
    if (!clientSite) return;
    
    try {
      if (clientSite.is_active) {
        // Deactivate
        await clientSiteApi.deactivateClientSite(clientSite.id);
        notifications.show({
          title: 'Success',
          message: `Client site ${clientSite.name} deactivated successfully`,
          color: 'green',
        });
      } else {
        // Activate
        await clientSiteApi.activateClientSite(clientSite.id);
        notifications.show({
          title: 'Success',
          message: `Client site ${clientSite.name} activated successfully`,
          color: 'green',
        });
      }
      refetch();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to ${clientSite.is_active ? 'deactivate' : 'activate'} client site`,
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Center style={{ height: '50vh' }}>
        <LoadingOverlay visible={true} />
      </Center>
    );
  }

  if (!clientSite && !isLoading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Stack align="center" gap="md">
          <Text size="lg" c="dimmed">Client site not found</Text>
          <Text size="sm" c="dimmed">This might happen if the site was just created. Try refreshing or wait a moment.</Text>
          <Button onClick={() => refetch()} variant="light">
            Retry
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box>
      {/* Top nav back button */}
      <Group mb="xl">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/')}
        >
          Back to Client Sites
        </Button>
      </Group>

      {/* Premium hero header */}
      <Paper shadow="md" radius="lg" p="0" mb="xl">
        <Box
          style={{
            background:
              'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(56,189,248,0.12) 100%)',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}
        >
          <Stack p="xl" gap="sm">
            <Group justify="space-between" align="center">
              <Stack gap={4}>
                <Title order={2} style={{ letterSpacing: 0.2 }}>{clientSite.name}</Title>
                <Text c="dimmed" size="sm">
                  Manage environment, status, and integrations for this client site
                </Text>
              </Stack>

              <Badge
                color={clientSite.is_active ? 'green' : 'gray'}
                variant="light"
                size="lg"
              >
                {clientSite.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Group>

            <Group gap="md" wrap="wrap">
              <Badge variant="outline" size="lg" leftSection={<IconWorld size={16} />}>
                {computePublicUrl()}
              </Badge>
              <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy URL'}>
                <ActionIcon
                  variant="light"
                  aria-label="Copy public URL"
                  onClick={() => clipboard.copy(computePublicUrl())}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Open API URL">
                <ActionIcon
                  variant="light"
                  aria-label="Open API URL"
                  onClick={() => window.open(clientSite.api_url, '_blank')}
                >
                  <IconExternalLink size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Stack>
        </Box>
      </Paper>

      {/* Info grid */}
      <Grid gutter="md" mb="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder radius="md" shadow="xs" p="md">
            <Group gap="sm">
              <ActionIcon variant="light" color="blue" size="lg">
                <IconWorld size={18} />
              </ActionIcon>
              <Stack gap={4}>
                <Text size="sm" c="dimmed">Subdomain</Text>
                <Text fw={600}>{clientSite.subdomain}</Text>
              </Stack>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder radius="md" shadow="xs" p="md">
            <Group gap="sm" justify="space-between" align="flex-start">
              <Group gap="sm">
                <ActionIcon variant="light" color="violet" size="lg">
                  <IconWorld size={18} />
                </ActionIcon>
                <Stack gap={4}>
                  <Text size="sm" c="dimmed">API URL</Text>
                  <Text fw={600} style={{ fontFamily: 'monospace' }}>{clientSite.api_url}</Text>
                </Stack>
              </Group>
              <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy API URL'}>
                <ActionIcon
                  variant="light"
                  aria-label="Copy API URL"
                  onClick={() => clipboard.copy(clientSite.api_url)}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder radius="md" shadow="xs" p="md">
            <Group gap="sm">
              <ActionIcon variant="light" color="teal" size="lg">
                <IconCalendar size={18} />
              </ActionIcon>
              <Stack gap={4}>
                <Text size="sm" c="dimmed">Created</Text>
                <Text fw={600}>
                  {new Date(clientSite.created_at).toLocaleDateString()} at{' '}
                  {new Date(clientSite.created_at).toLocaleTimeString()}
                </Text>
              </Stack>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Divider my="md" />

      {/* Actions */}
      <Group justify="space-between" align="center" mb="md">
        <Text c="dimmed">Quick actions</Text>
        <Group gap="sm">
          {!clientSite.is_active ? (
            <Button
              variant="gradient"
              gradient={{ from: 'teal', to: 'green', deg: 90 }}
              size="md"
              radius="md"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={handleToggleActivation}
            >
              Activate Client Site
            </Button>
          ) : (
            <Button
              variant="outline"
              color="orange"
              size="md"
              radius="md"
              leftSection={<IconPlayerStop size={16} />}
              onClick={handleToggleActivation}
            >
              Deactivate Client Site
            </Button>
          )}

          <Button
            variant="light"
            leftSection={<IconExternalLink size={16} />}
            onClick={() => window.open(computePublicUrl(), '_blank')}
          >
            Open Client Site
          </Button>
        </Group>
      </Group>

      <Divider my="xl" />

      {/* Health and Integrations */}
      <Grid gutter="md" mb="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" shadow="xs" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={600}>Health</Text>
              <Group gap="xs">
                <Badge color={health?.status === 'online' ? 'green' : health?.status === 'error' ? 'orange' : 'gray'} variant="light">
                  {healthLoading ? 'Checking…' : health?.status ?? 'Unknown'}
                </Badge>
                <Button size="xs" variant="light" onClick={() => refetchHealth()}>Refresh</Button>
              </Group>
            </Group>
            {healthLoading ? (
              <Skeleton height={24} radius="sm" />
            ) : (
              <Text size="sm" c="dimmed">Latency: {health ? `${health.latency_ms} ms` : '—'}</Text>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" shadow="xs" p="md">
            <Text fw={600} mb="sm">Integrations</Text>
            <Grid gutter="sm">
              <Grid.Col span={6}>
                <Card withBorder radius="md" p="sm">
                  <Group justify="space-between" align="center">
                    <Text>WordPress</Text>
                    <Badge variant="dot" color={health?.status === 'online' ? 'green' : 'gray'}>
                      {health?.status === 'online' ? 'Reachable' : 'Unknown'}
                    </Badge>
                  </Group>
                  <Group mt="sm" gap="xs">
                    <Button size="xs" variant="light" onClick={() => navigate('/settings')}>Configure</Button>
                    <Button size="xs" variant="subtle" onClick={() => window.open(`${computePublicUrl()}/admin`, '_blank')}>Open Admin</Button>
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card withBorder radius="md" p="sm">
                  <Group justify="space-between" align="center">
                    <Text>Webhooks</Text>
                    <Badge variant="dot" color="gray">Not connected</Badge>
                  </Group>
                  <Group mt="sm" gap="xs">
                    <Button size="xs" variant="light" onClick={() => navigate('/settings')}>Setup</Button>
                    <Button size="xs" variant="subtle" onClick={() => notifications.show({ title: 'Webhook docs', message: 'Please configure webhooks in Settings → Integrations.' })}>Docs</Button>
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Activity Timeline */}
      <Card withBorder radius="md" shadow="xs" p="md">
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={600}>Activity</Text>
          <Button size="xs" variant="light" onClick={() => refetchEvents()}>Refresh</Button>
        </Group>
        {eventsLoading ? (
          <Stack>
            <Skeleton height={16} radius="sm" />
            <Skeleton height={16} radius="sm" />
            <Skeleton height={16} radius="sm" />
          </Stack>
        ) : (
          <Timeline active={-1} bulletSize={16} lineWidth={2}>
            {(events ?? []).map((ev) => (
              <Timeline.Item key={ev.id} title={ev.type.toUpperCase()}>
                <Text size="sm">{ev.message}</Text>
                <Text size="xs" c="dimmed">{new Date(ev.created_at).toLocaleString()}</Text>
              </Timeline.Item>
            ))}
            {(events ?? []).length === 0 && (
              <Timeline.Item title="No activity yet">
                <Text size="sm" c="dimmed">This client site has no recorded events yet.</Text>
              </Timeline.Item>
            )}
          </Timeline>
        )}
      </Card>
    </Box>
  );
}