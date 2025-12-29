import { AppShell, Burger, Group, Title, Button, Badge, Tooltip, ActionIcon, Loader, Menu, Text, Avatar, UnstyledButton, Box, rem } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientSiteApi, authApiClient } from '../api/client';
import type { User } from '../api/client';
import { IconReload, IconLogout, IconSettings, IconLayoutDashboard, IconChevronRight, IconBuildingStore } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      authApiClient.getCurrentUser()
        .then(user => {
          setUsername(user.username || 'User');
          setUserRole(user.role || '');
          setCurrentUser(user);
        })
        .catch((error) => {
          console.error('[Layout] Failed to load current user:', error);
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserRole('');
          setCurrentUser(null);
        });
    }
  }, []);

  const { data: health, isError, isFetching, refetch } = useQuery({
    queryKey: ['api-health'],
    queryFn: clientSiteApi.getHealth,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.href = '/login';
  };

  const isAdmin = () => userRole === 'admin' || userRole === 'super_admin';

  const NavItem = ({ icon: Icon, label, path, active }: { icon: any, label: string, path: string, active: boolean }) => (
    <UnstyledButton
      onClick={() => {
        navigate(path);
        if (opened) toggle(); // Close mobile drawer
      }}
      style={(theme) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        color: active ? theme.colors.darkBlue[6] : theme.colors.gray[7],
        backgroundColor: active ? theme.colors.darkBlue[0] : 'transparent',
        transition: 'background-color 0.2s, color 0.2s',
        '&:hover': {
          backgroundColor: active ? theme.colors.darkBlue[0] : theme.colors.gray[0],
          color: active ? theme.colors.darkBlue[7] : theme.colors.gray[9],
        },
      })}
    >
      <Group>
        <Icon size={20} stroke={1.5} />
        <Text size="sm" fw={500} style={{ flex: 1 }}>{label}</Text>
        {active && <IconChevronRight size={14} stroke={1.5} style={{ opacity: 0.5 }} />}
      </Group>
    </UnstyledButton>
  );

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="0"
      styles={(theme) => ({
        main: {
          backgroundColor: '#f3f6f9',
          paddingTop: 'calc(var(--app-shell-header-offset, 0px) + 2rem)',
          paddingLeft: 'calc(var(--app-shell-navbar-offset, 0px) + 2rem)',
          paddingRight: '2rem',
          paddingBottom: '2rem',
          [`@media (max-width: ${theme.breakpoints.sm})`]: {
            padding: 'calc(var(--app-shell-header-offset, 0px) + 1rem) 1rem 1rem 1rem',
          }
        },
      })}
    >
      <AppShell.Header
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <Group h="100%" px="xl" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs">
              <div style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #264D70 0%, #3E6586 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800
              }}>
                N
              </div>
              <Title order={4} style={{ letterSpacing: '-0.02em' }}>Nectar Dashboard</Title>
            </Group>
          </Group>

          <Group gap="md">
            <Group gap={8}>
              <Tooltip label={isError ? 'API unreachable' : `Status: ${health?.status || 'Active'}`} withArrow>
                <Box style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  backgroundColor: isError ? '#fa5252' : '#40c057',
                  boxShadow: isError ? '0 0 0 2px rgba(250, 82, 82, 0.2)' : '0 0 0 2px rgba(64, 192, 87, 0.2)'
                }} />
              </Tooltip>
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => refetch()}>
                {isFetching ? <Loader size={12} /> : <IconReload size={14} />}
              </ActionIcon>
            </Group>

            {isLoggedIn ? (
              <Menu shadow="lg" width={220} radius="md" position="bottom-end" transitionProps={{ transition: 'pop-top-right' }}>
                <Menu.Target>
                  <UnstyledButton>
                    <Group gap="xs">
                      <Avatar color="blue" radius="xl" size="sm">
                        {username?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box visibleFrom="xs">
                        <Text size="sm" fw={600} lh={1}>{username}</Text>
                        <Text size="xs" c="dimmed" lh={1} mt={2}>{userRole}</Text>
                      </Box>
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Settings</Menu.Label>
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
              <Button onClick={() => navigate('/login')}>Login</Button>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="lg" style={{ backgroundColor: 'transparent', borderRight: 'none' }}>
        <Box pl="xs" mb="lg">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">Main Menu</Text>
        </Box>
        <Box>
          <NavItem
            icon={IconLayoutDashboard}
            label="Overview"
            path="/"
            active={location.pathname === '/'}
          />
          {isAdmin() && (
            <NavItem
              icon={IconSettings}
              label="Settings"
              path="/settings"
              active={location.pathname.startsWith('/settings')}
            />
          )}
          {/* Client Sites link removed as it duplicates Overview for now */}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </AppShell.Main>
    </AppShell>
  );
}