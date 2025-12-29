import { Title, Text, Paper, SimpleGrid, Card, Group, Badge } from '@mantine/core';

export function Settings() {
  const modules = [
    { key: 'branding', title: 'Branding & Theme', desc: 'Logo, color palette, fonts, premium UI tokens' },
    { key: 'auth', title: 'Authentication & Users', desc: 'Admin accounts, roles/permissions, SSO (OAuth/SAML)' },
    { key: 'clientSites', title: 'Client Site Defaults', desc: 'Subdomain rules, onboarding defaults, activation policies' },
    { key: 'integrations', title: 'Integrations', desc: 'Child app endpoints, WordPress, payments, external APIs' },
    { key: 'notifications', title: 'Notifications', desc: 'Email/SMS/webhook templates and triggers' },
    { key: 'security', title: 'Security & Compliance', desc: 'Password policies, audit logs, data retention' },
    { key: 'billing', title: 'Billing & Plans', desc: 'Subscription tiers, limits, invoicing, per-client-site billing' },
    { key: 'templates', title: 'Defaults & Templates', desc: 'Lease terms, property categories, document templates' },
    { key: 'storage', title: 'File Storage & Uploads', desc: 'S3/Local storage, upload limits, virus scanning' },
    { key: 'api', title: 'API Keys & Webhooks', desc: 'Key management, webhook endpoints, retry policies' },
    { key: 'health', title: 'System Health', desc: 'Status page, background jobs, error reporting' },
    { key: 'locale', title: 'Localization', desc: 'Time zone, currency, language and regional formats' },
  ];

  return (
    <div style={{ maxWidth: 1200 }}>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Settings</Title>
        <Badge variant="dot" color="blue">Parent Dashboard</Badge>
      </Group>
      <Text c="dimmed" mb="xl">
        Configure global preferences and defaults that apply across client sites and the parent dashboard.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {modules.map((m) => (
          <Card key={m.key} withBorder radius="md" p="md" shadow="sm">
            <Title order={4} mb="xs">{m.title}</Title>
            <Text c="dimmed" size="sm">{m.desc}</Text>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}