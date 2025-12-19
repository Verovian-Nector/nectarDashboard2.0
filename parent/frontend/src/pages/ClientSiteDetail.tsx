import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Modal,
  Container,
  Alert,
  ThemeIcon,
  rem,
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
  IconServer,
  IconActivity,
  IconCheck,
  IconAlertTriangle,
  IconPlugConnected,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { clientSiteApi, api } from '../api/client';
import { useState } from 'react';

export function ClientSiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clipboard = useClipboard({ timeout: 1000 });
  const queryClient = useQueryClient();

  // Confirmation state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);

  const { data: clientSite, isLoading, refetch } = useQuery({
    queryKey: ['clientSite', id],
    queryFn: async () => {
      const clientSites = await clientSiteApi.getClientSites();
      const found = clientSites.find(t => t.id === id);
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
    retry: 3,
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

    // 1. Prefer backend-provided template (Handles both Dev and Prod correctly)
    if (config?.child_service_base_url_template) {
      return config.child_service_base_url_template.replace('<subdomain>', clientSite.subdomain);
    }

    // 2. Dynamic fallback based on current window location (never hardcode localhost)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // If we're on localhost but config failed, try to guess the dev standard
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:5173/?subdomain=${clientSite.subdomain}`;
    }

    // 3. Production fallback: assume typical subdomain structure
    // If dashboard is app.domain.com, client site is likely client.domain.com
    return `${protocol}//${clientSite.subdomain}.${hostname.split('.').slice(-2).join('.')}`;
  };

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!clientSite) return;
      if (pendingAction === 'deactivate') {
        await clientSiteApi.deactivateClientSite(clientSite.id);
      } else if (pendingAction === 'activate') {
        await clientSiteApi.activateClientSite(clientSite.id);
      } else if (pendingAction === 'delete') {
        await clientSiteApi.deleteClientSite(clientSite.subdomain);
      }
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: `Client site ${pendingAction}d successfully`,
        color: 'green',
      });

      if (pendingAction === 'delete') {
        navigate('/'); // Redirect to dashboard after delete
      } else {
        refetch();
        setConfirmModalOpen(false);
        setPendingAction(null);
      }
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || `Failed to ${pendingAction} client site`,
        color: 'red',
      });
      setConfirmModalOpen(false);
      setPendingAction(null);
    },
  });

  const initiateToggle = (action: 'activate' | 'deactivate' | 'delete') => {
    setPendingAction(action);
    setConfirmModalOpen(true);
  };

  // Loading State
  if (isLoading) {
    return (
      <Container size="xl">
        <Stack>
          <Skeleton height={50} width={200} mb="xl" />
          <Skeleton height={200} radius="lg" />
          <Grid>
            <Grid.Col span={4}><Skeleton height={150} radius="lg" /></Grid.Col>
            <Grid.Col span={4}><Skeleton height={150} radius="lg" /></Grid.Col>
            <Grid.Col span={4}><Skeleton height={150} radius="lg" /></Grid.Col>
          </Grid>
        </Stack>
      </Container>
    );
  }

  // Not Found State
  if (!clientSite && !isLoading) {
    return (
      <Center style={{ height: '60vh' }}>
        <Stack align="center" gap="md">
          <ThemeIcon size={64} radius="circle" color="gray" variant="light">
            <IconAlertTriangle size={32} />
          </ThemeIcon>
          <Title order={3} c="dimmed">Client site not found</Title>
          <Text c="dimmed">The requested site does not exist or you don't have access.</Text>
          <Button onClick={() => navigate('/')} variant="subtle">Return to Dashboard</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Container size="xl" p={0}>
      {/* Navigation */}
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/')}
        mb="lg"
        color="gray"
      >
        Back
      </Button>

      {/* Hero Section */}
      <Paper
        radius="lg"
        mb="xl"
        style={{
          background: 'linear-gradient(135deg, #1A365D 0%, #2D527C 100%)', // Deep corporate blue gradient
          color: 'white',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Decorative circle */}
        <Box style={{ position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <Stack p={{ base: 'lg', md: 'xxl' }} gap="xl" style={{ position: 'relative', zIndex: 1 }}>
          <Group justify="space-between" align="start">
            <Stack gap={4}>
              <Group gap="sm">
                <Title order={1} style={{ color: 'white', fontWeight: 800 }}>{clientSite.name}</Title>
                <Badge
                  size="lg"
                  variant="filled"
                  color={clientSite.is_active ? 'green' : 'gray'}
                  styles={{ root: { backgroundColor: clientSite.is_active ? '#40c057' : 'rgba(255,255,255,0.2)' } }}
                >
                  {clientSite.is_active ? 'Active' : 'Offline'}
                </Badge>
              </Group>
              <Text c="rgba(255,255,255,0.7)" size="lg">
                Production Environment
              </Text>
            </Stack>

            <Group>
              {clientSite.is_active ? (
                <Button
                  variant="white"
                  color="gray"
                  leftSection={<IconPlayerStop size={16} />}
                  onClick={() => initiateToggle('deactivate')}
                  style={{ fontWeight: 600, color: '#495057', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                >
                  Deactivate Site
                </Button>
              ) : (
                <Button
                  variant="white"
                  color="teal"
                  leftSection={<IconPlayerPlay size={16} />}
                  onClick={() => initiateToggle('activate')}
                  style={{ fontWeight: 600, color: '#099268', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                >
                  Activate Site
                </Button>
              )}
              <Button
                variant="filled"
                color="red"
                onClick={() => initiateToggle('delete')}
                style={{ backgroundColor: 'rgba(224, 49, 49, 0.2)', color: '#ffc9c9', border: '1px solid rgba(255, 201, 201, 0.3)' }}
              >
                Delete Site
              </Button>
            </Group>
          </Group>

          <Divider color="rgba(255,255,255,0.1)" />

          <Group gap="xl" align="center">
            <Group gap="xs">
              <IconWorld size={20} color="rgba(255,255,255,0.6)" />
              <Text c="rgba(255,255,255,0.9)" fw={500}>{computePublicUrl()}</Text>
              <ActionIcon variant="transparent" color="white" style={{ opacity: 0.7 }} onClick={() => clipboard.copy(computePublicUrl())}>
                <IconCopy size={16} />
              </ActionIcon>
              <ActionIcon variant="transparent" color="white" style={{ opacity: 0.7 }} onClick={() => window.open(computePublicUrl(), '_blank')}>
                <IconExternalLink size={16} />
              </ActionIcon>
            </Group>

            <Group gap="xs">
              <IconServer size={20} color="rgba(255,255,255,0.6)" />
              <Text c="rgba(255,255,255,0.9)" fw={500}>API: {clientSite.api_url}</Text>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* Main Content Grid (Bento) */}
      <Grid gutter="lg">
        {/* Status & Health Column */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            {/* Quick Stats */}
            <Grid>
              <Grid.Col span={6}>
                <Card withBorder padding="lg" radius="lg">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed" fw={600}>SYSTEM HEALTH</Text>
                    <ThemeIcon color={health?.status === 'online' ? 'green' : 'red'} variant="light" radius="md">
                      <IconActivity size={16} />
                    </ThemeIcon>
                  </Group>
                  <Group align="baseline" gap="xs">
                    <Title order={3}>{health?.status === 'online' ? 'Operational' : 'Issues Detected'}</Title>
                  </Group>
                  <Text size="sm" c="dimmed" mt="xs">
                    Latency: {health ? `${health.latency_ms}ms` : 'Checking...'}
                  </Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card withBorder padding="lg" radius="lg">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed" fw={600}>SITE AGE</Text>
                    <ThemeIcon color="blue" variant="light" radius="md">
                      <IconCalendar size={16} />
                    </ThemeIcon>
                  </Group>
                  <Title order={3}>
                    {Math.floor((new Date().getTime() - new Date(clientSite.created_at).getTime()) / (1000 * 60 * 60 * 24)) || '0'} Days
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">Created {new Date(clientSite.created_at).toLocaleDateString()}</Text>
                </Card>
              </Grid.Col>
            </Grid>

            {/* Activity Timeline */}
            <Card withBorder padding="lg" radius="lg">
              <Group justify="space-between" mb="lg">
                <Title order={4}>Activity Log</Title>
                <Button variant="subtle" size="xs" onClick={() => refetchEvents()}>Refresh</Button>
              </Group>

              {eventsLoading ? (
                <Stack>
                  <Skeleton height={30} />
                  <Skeleton height={30} />
                </Stack>
              ) : (
                <Timeline active={0} bulletSize={18} lineWidth={2}>
                  {(events ?? []).slice(0, 5).map((ev) => (
                    <Timeline.Item
                      key={ev.id}
                      bullet={<IconCheck size={10} />}
                      title={
                        <Text size="sm" fw={600}>{ev.type.replace('_', ' ').toUpperCase()}</Text>
                      }
                    >
                      <Text c="dimmed" size="xs" mt={2}>{ev.message}</Text>
                      <Text size="xs" c="dimmed" mt={4}>{new Date(ev.created_at).toLocaleString()}</Text>
                    </Timeline.Item>
                  ))}
                  {(events ?? []).length === 0 && (
                    <Text c="dimmed" size="sm" ta="center" py="xl">No recent activity recorded.</Text>
                  )}
                </Timeline>
              )}
            </Card>
          </Stack>
        </Grid.Col>

        {/* Sidebar Column: Integrations */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder padding="lg" radius="lg" h="100%">
            <Group mb="xl">
              <IconPlugConnected size={24} color="#475569" />
              <Title order={4}>Integrations</Title>
            </Group>

            <Stack gap="md">
              <Paper withBorder p="md" radius="md" bg="gray.0">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>WordPress</Text>
                  <Badge color={health?.status === 'online' ? 'green' : 'gray'} size="sm" variant="dot">
                    {health?.status === 'online' ? 'Connected' : 'Disconnected'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mb="md">Content Management System</Text>
                <Group gap="xs">
                  <Button fullWidth variant="white" size="xs" onClick={() => window.open(`${computePublicUrl()}/admin`, '_blank')}>
                    Access Admin
                  </Button>
                </Group>
              </Paper>

              <Paper withBorder p="md" radius="md" bg="gray.0">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>Webhooks</Text>
                  <Switch size="sm" disabled />
                </Group>
                <Text size="xs" c="dimmed" mb="md">Event notifications (Coming soon)</Text>
                <Button fullWidth variant="light" size="xs" disabled>Configure</Button>
              </Paper>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={
          <Group gap="sm">
            <IconAlertTriangle color="red" size={20} />
            <Text fw={700} size="lg" c="red">
              {pendingAction === 'delete' ? 'Delete Client Site?' : (pendingAction === 'deactivate' ? 'Deactivate Site?' : 'Activate Site?')}
            </Text>
          </Group>
        }
        centered
        radius="md"
        styles={{
          header: { backgroundColor: '#FFF5F5' },
          title: { color: '#C92A2A' }
        }}
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to <strong>{pendingAction}</strong> the client site <strong>{clientSite.name}</strong>?
          </Text>
          {pendingAction === 'delete' && (
            <Alert color="red" variant="filled" icon={<IconAlertTriangle size={16} />}>
              This action is <strong>irreversible</strong> and cannot be undone. All data, databases, and configuration for this site will be permanently deleted.
            </Alert>
          )}
          {pendingAction === 'deactivate' && (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
              This action will make the site inaccessible to all users. This is reversible, but may disrupt active sessions.
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => toggleMutation.mutate()}
              loading={toggleMutation.isPending}
            >
              Confirm {pendingAction === 'activate' ? 'Activation' : (pendingAction === 'delete' ? 'Delete' : 'Deactivation')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

// Helper to avoid import error if Switch is not imported (It wasn't in original imports, keeping it safe)
function Switch(props: any) {
  return <Box w={32} h={18} bg="gray.3" style={{ borderRadius: 99 }} />;
}