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
} from '@mantine/core';
import { IconPlayerPlay, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { clientSiteApi } from '../api/client';
import { useEffect } from 'react';
import { useState } from 'react';

export function ClientSiteList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<{ name: string; subdomain: string }>({ name: '', subdomain: '' });

  const { data: clientSites, isLoading, refetch } = useQuery({
    queryKey: ['clientSites'],
    queryFn: clientSiteApi.getClientSites,
  });

  // Debug logging
  console.log('[ClientSiteList] clientSites data:', clientSites);
  console.log('[ClientSiteList] clientSites length:', clientSites?.length);
  console.log('[ClientSiteList] isLoading:', isLoading);
  console.log('[ClientSiteList] Current URL:', window.location.href);
  console.log('[ClientSiteList] Route path:', window.location.pathname);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: clientSiteApi.getConfig,
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (createOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [createOpen]);

  const createMutation = useMutation({
    mutationFn: clientSiteApi.createClientSite,
    onSuccess: (newClientSite) => {
      notifications.show({ title: 'Success', message: 'Client site created successfully', color: 'green' });
      // Force immediate refetch to ensure data is available
      queryClient.invalidateQueries({ queryKey: ['clientSites'] });
      queryClient.refetchQueries({ queryKey: ['clientSites'] });
      
      // Always close modal on success
      setCreateOpen(false);
      setFormData({ name: '', subdomain: '' });
      
      // Navigate to the new client site detail page after a short delay
      setTimeout(() => {
        navigate(`/client-site/${newClientSite.id}`);
      }, 500);
    },
    onError: (error: any) => {
      notifications.show({ title: 'Error', message: error.response?.data?.detail || 'Failed to create client site', color: 'red' });
      // Still close modal on error to prevent hanging
      setCreateOpen(false);
      setFormData({ name: '', subdomain: '' });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subdomain.trim()) {
      notifications.show({ title: 'Validation Error', message: 'Please fill in all fields', color: 'orange' });
      return;
    }
    
    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      notifications.show({ title: 'Validation Error', message: 'Subdomain can only contain lowercase letters, numbers, and hyphens', color: 'orange' });
      return;
    }
    
    try {
      createMutation.mutate(formData);
    } catch (error) {
      console.error('[ClientSiteList] Error creating client site:', error);
      notifications.show({ title: 'Error', message: 'An unexpected error occurred. Please try again.', color: 'red' });
      // Ensure modal closes even on unexpected errors
      setCreateOpen(false);
      setFormData({ name: '', subdomain: '' });
    }
  };

  const handleActivate = async (id: string, name: string) => {
    try {
      await clientSiteApi.activateClientSite(id);
      notifications.show({
        title: 'Success',
        message: `Client site ${name} activated successfully`,
        color: 'green',
      });
      refetch();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to activate client site',
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Paper shadow="sm" p="md" radius="md" style={{ width: '100%' }}>
        <Group justify="space-between" mb="md">
          <Title order={2}>Client Site Management</Title>
          <Skeleton height={32} width={150} radius="md" />
        </Group>
        <Table striped highlightOnHover style={{ width: '100%' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Subdomain</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <Table.Tr key={i}>
                <Table.Td><Skeleton height={16} radius="sm" /></Table.Td>
                <Table.Td><Skeleton height={16} radius="sm" /></Table.Td>
                <Table.Td><Skeleton height={16} radius="sm" /></Table.Td>
                <Table.Td><Skeleton height={16} radius="sm" /></Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Skeleton height={24} width={24} radius="xl" />
                    <Skeleton height={24} width={24} radius="xl" />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    );
  }

  const rows = clientSites?.map((clientSite) => (
    <Table.Tr key={clientSite.id}>
      <Table.Td>
        <Text fw={500}>{clientSite.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {clientSite.subdomain}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={clientSite.is_active ? 'green' : 'gray'} variant="dot">
          {clientSite.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {new Date(clientSite.created_at).toLocaleDateString()}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => navigate(`/client-site/${clientSite.id}`)}
          >
            <IconEye size={16} />
          </ActionIcon>
          {!clientSite.is_active && (
            <ActionIcon
              variant="subtle"
              color="green"
              onClick={() => handleActivate(clientSite.id, clientSite.name)}
            >
              <IconPlayerPlay size={16} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  )) || [];

  return (
    <Paper shadow="sm" p="md" radius="md" style={{ width: '100%' }}>
      <Group justify="space-between" mb="md">
        <Title order={2}>Client Site Management</Title>
        <Button id="open-create-client-site" onClick={() => setCreateOpen(true)} variant="filled">
          Create New Client Site
        </Button>
      </Group>
      {createOpen && (
        <div style={{ 
          position: 'fixed', 
          top: '0', 
          left: '0', 
          right: '0', 
          bottom: '0', 
          backgroundColor: 'rgba(0,0,0,0.75)', 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }} onClick={(e) => {
          // Only close if clicking the backdrop, not the modal content
          if (e.target === e.currentTarget) {
            setCreateOpen(false);
          }
        }}>
          <div style={{ 
            background: '#ffffff', 
            padding: '48px', 
            borderRadius: '20px', 
            minWidth: '600px', 
            maxWidth: '680px', 
            boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
            zIndex: 10000,
            position: 'relative',
            border: '1px solid #f3f4f6',
            pointerEvents: 'all'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#111827', fontSize: '28px', fontWeight: '800' }}>Create New Client Site</h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>Set up a new client site with its own subdomain</p>
            </div>
            
            <form onSubmit={handleCreateSubmit} style={{ margin: 0 }}>
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#374151', fontSize: '16px' }}>Client Site Name</label>
                <TextInput 
                  placeholder="Enter client site name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              
              <div style={{ marginBottom: '40px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#374151', fontSize: '16px' }}>Subdomain</label>
                <TextInput 
                  placeholder="my-client-site"
                  value={formData.subdomain}
                  onChange={(e: any) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                  description={config ? `This will create: ${config.child_service_base_url_template.replace('<subdomain>', formData.subdomain || 'my-client-site')}` : 'Loading configuration...'}
                />
              </div>
              
              <Group justify="flex-end" gap="md">
                <Button 
                  variant="subtle" 
                  radius="md" 
                  size="md" 
                  onClick={() => setCreateOpen(false)}
                  style={{ fontWeight: '700', padding: '12px 24px', fontSize: '14px' }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="filled" 
                  radius="md" 
                  size="md" 
                  loading={createMutation.isPending}
                  style={{ fontWeight: '700', padding: '12px 24px', fontSize: '14px' }}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Client Site'}
                </Button>
              </Group>
            </form>
          </div>
        </div>
      )}

      <Table striped highlightOnHover style={{ width: '100%' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Subdomain</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      {!clientSites?.length && (
        <Center mt="xl">
          <Text c="dimmed" size="lg">
            No client sites found. Create your first client site to get started.
          </Text>
        </Center>
      )}


      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Client Site"
        radius="md"
        centered={true}
        size="lg"
        zIndex={1000}
        overlayProps={{ blur: 3, opacity: 0.2 }}
        styles={{
          content: {
            backgroundColor: 'white',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          },
          header: {
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }
        }}
      >
        <Box mb="sm">
          <Text c="dimmed" size="sm">Set up a new client site with a unique subdomain</Text>
        </Box>
        <form onSubmit={handleCreateSubmit}>
          <TextInput
            label="Client Site Name"
            placeholder="Enter client site name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            mb="md"
            radius="md"
            size="md"
          />
          <TextInput
            label="Subdomain"
            placeholder="my-client-site"
            value={formData.subdomain}
            onChange={(e: any) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            required
            mb="lg"
            radius="md"
            size="md"
            description={`This will create: ${config?.child_service_base_url_template?.replace('<subdomain>', formData.subdomain || 'my-client-site') || 'Loading configuration...'}`}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" radius="md" size="md" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="filled" radius="md" size="md" loading={createMutation.isPending}>
              Create Client Site
            </Button>
          </Group>
        </form>
      </Modal>
    </Paper>
  );
}