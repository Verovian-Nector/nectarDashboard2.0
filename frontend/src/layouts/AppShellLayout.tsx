import { AppShell, AppShellHeader, AppShellNavbar, AppShellMain, Group, Text, Burger, Stack, NavLink, Button, Avatar, Tooltip, Image, ActionIcon, Divider } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../state/session'
import { useEffect, useState } from 'react'
import { IconSun, IconMoon, IconHome, IconBuilding, IconUsers, IconCalendar, IconCash, IconTools, IconSettings } from '@tabler/icons-react'
import { getMe } from '../api/users'
import { useBranding } from '../context/BrandingProvider'

const navItems = [
  { label: 'Dashboard', to: '/', icon: IconHome },
  { label: 'Properties', to: '/properties', icon: IconBuilding },
  { label: 'Tenants', to: '/tenants', icon: IconUsers },
  { label: 'Calendar', to: '/calendar', icon: IconCalendar },
  { label: 'Financials', to: '/financials', icon: IconCash },
  { label: 'Repairs/Maintenance', to: '/maintenance', icon: IconTools },
]

export default function AppShellLayout() {
  const [opened, { toggle }] = useDisclosure()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const clearToken = useSession((s) => s.clearToken)
  const token = useSession((s) => s.token)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState<string>('')
  const { branding, colorScheme, toggleColorScheme } = useBranding()

  useEffect(() => {
    let mounted = true
    async function loadMe() {
      try {
        const me = await getMe()
        if (!mounted) return
        setIsAdmin(me.role === 'propertyadmin')
        setUsername(me.username || '')
      } catch {
        if (!mounted) return
        setIsAdmin(false)
      }
    }
    if (token) loadMe()
    return () => { mounted = false }
  }, [token])

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="sm"
    >
      <AppShellHeader
        withBorder
        px="md"
      >
        <Group h="100%" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" aria-label="Toggle navigation" />
            <Image src={branding?.logo_url || '/logo.png'} alt={(branding?.app_title || 'Nectar Estates') + ' logo'} h={28} fit="contain" radius="md"/>
          </Group>
          <Group>
            <Text c="dimmed">v0.1</Text>
            <Tooltip label={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} withArrow>
              <ActionIcon variant="light" aria-label="Toggle color scheme" onClick={toggleColorScheme}>
                {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Profile" withArrow>
              <Link to="/profile" aria-label="Open profile">
                <Avatar size="md" radius="xl" color="brand" style={{ boxShadow: '0 0 0 2px var(--mantine-color-brand-6)' }}>
                  {(username?.[0] ?? '?').toUpperCase()}
                </Avatar>
              </Link>
            </Tooltip>
            {token && (
              <Button size="xs" variant="light" onClick={() => { clearToken(); navigate('/login') }}>Logout</Button>
            )}
          </Group>
        </Group>
      </AppShellHeader>

      <AppShellNavbar p="md" style={{ backgroundColor: 'var(--mantine-color-body)', borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <Stack gap="xs">
          <Text size="xs" c="dimmed" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>Navigation</Text>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              label={item.label}
              component={Link}
              to={item.to}
              active={pathname === item.to}
              leftSection={<item.icon size={16} />}
              style={{
                borderRadius: 8,
                ...(pathname === item.to
                  ? {
                      backgroundColor: 'var(--mantine-color-brand-0)',
                      color: 'var(--mantine-color-brand-9)',
                      fontWeight: 600,
                      boxShadow: 'inset 0 0 0 1px var(--mantine-color-brand-4)'
                    }
                  : {
                      boxShadow: 'inset 0 0 0 1px var(--mantine-color-default-border)'
                    }),
              }}
            />
          ))}
          <Divider my="xs" />
          {isAdmin && (
            <>
              <Text size="xs" c="dimmed" style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>Admin</Text>
              <NavLink
                label="Settings"
                component={Link}
                to="/settings"
                active={pathname === '/settings'}
                leftSection={<IconSettings size={16} />}
                style={{
                  borderRadius: 8,
                  ...(pathname === '/settings'
                    ? {
                        backgroundColor: 'var(--mantine-color-brand-0)',
                        color: 'var(--mantine-color-brand-9)',
                        fontWeight: 600,
                        boxShadow: 'inset 0 0 0 1px var(--mantine-color-brand-4)'
                      }
                    : {
                        boxShadow: 'inset 0 0 0 1px var(--mantine-color-default-border)'
                      }),
                }}
              />
            </>
          )}
        </Stack>
      </AppShellNavbar>

      <AppShellMain>
        <Outlet />
      </AppShellMain>
    </AppShell>
  )
}