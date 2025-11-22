import { AppShell, Burger, Group, Title, Button, Badge, Tooltip, ActionIcon, Loader, Menu } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientSiteApi, authApiClient } from '../api/client';
import type { User } from '../api/client';
import { IconReload, IconUser, IconLogout, IconSettings } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check login status on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      // Get current user info
      authApiClient.getCurrentUser()
        .then(user => {
          setUsername(user.username || 'User');
          setUserRole(user.role || '');
          setCurrentUser(user);
          console.log('[Layout] Current user loaded:', user);
          console.log('[Layout] User role:', user.role);
          console.log('[Layout] Is admin?', user.role === 'admin' || user.role === 'super_admin');
        })
        .catch((error) => {
          console.error('[Layout] Failed to load current user:', error);
          // If token is invalid, remove it
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserRole('');
          setCurrentUser(null);
        });
    }
  }, []);

  // API health indicator (polls periodically)
  const { data: health, isError, isFetching, refetch } = useQuery({
    queryKey: ['api-health'],
    queryFn: clientSiteApi.getHealth,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUsername('');
    setUserRole('');
    setCurrentUser(null);
    window.location.href = '/login'; // Force reload to update auth state
  };

  const isAdmin = () => {
    return userRole === 'admin' || userRole === 'super_admin';
  };

  const handleLogin = () => {
    navigate('/login');
  };

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
            
            {/* Authentication button */}
            {isLoggedIn ? (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="subtle" leftSection={<IconUser size={16} />}>
                    {username || 'User'}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Account</Menu.Label>
                  <Menu.Item
                    leftSection={<IconLogout size={14} />}
                    color="red"
                    onClick={handleLogout}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Button variant="subtle" onClick={handleLogin}>
                Login
              </Button>
            )}
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
        
        {/* Only show Settings to admin/super_admin users */}
        {isAdmin() && (
          <Button
            variant="subtle"
            justify="flex-start"
            fullWidth
            mt="xs"
            leftSection={<IconSettings size={16} />}
            onClick={() => {
              navigate('/settings');
              toggle();
            }}
          >
            Settings
          </Button>
        )}
        
        {/* Removed global Create Client Site navigation; creation now handled via modal on Client Site List */}
      </AppShell.Navbar>

      <AppShell.Main>
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </AppShell.Main>
    </AppShell>
  );
}