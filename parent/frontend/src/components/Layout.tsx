import { AppShell, Burger, Group, Title, Button, Badge, Tooltip, ActionIcon, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientSiteApi } from '../api/client';
import { IconReload } from '@tabler/icons-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();

  // API health indicator (polls periodically)
  const { data: health, isError, isFetching, refetch } = useQuery({
    queryKey: ['api-health'],
    queryFn: clientSiteApi.getHealth,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3} style={{ color: 'var(--mantine-color-blue-filled)' }}>
            Parent Dashboard
          </Title>
          <Group ml="auto" gap="xs">
            {/* Small API health badge */}
            <Tooltip label={isError ? 'API unreachable' : `Status: ${health?.status || 'unknown'}` } withArrow>
              <Badge
                variant="dot"
                color={isError ? 'red' : 'green'}
                size="sm"
              >
                {isError ? 'API Offline' : 'API Online'}
              </Badge>
            </Tooltip>
            <ActionIcon variant="subtle" aria-label="Refresh API health" onClick={() => refetch()}>
              {isFetching ? <Loader size={16} /> : <IconReload size={16} />}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Button
          variant="subtle"
          justify="flex-start"
          fullWidth
          onClick={() => {
            navigate('/');
            toggle();
          }}
        >
          Client Site List
        </Button>
        <Button
          variant="subtle"
          justify="flex-start"
          fullWidth
          mt="xs"
          onClick={() => {
            navigate('/settings');
            toggle();
          }}
        >
          Settings
        </Button>
        {/* Removed global Create Client Site navigation; creation now handled via modal on Client Site List */}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}