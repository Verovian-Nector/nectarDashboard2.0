import { Anchor, Badge, Group, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

interface PropertyHeaderProps {
  title: string;
  published: boolean;
  isMocked?: boolean;
  useMocks?: boolean;
  tenantSourceText?: string;
  backTo?: string;
}

export default function PropertyHeader({
  title,
  published,
  isMocked = false,
  useMocks = false,
  tenantSourceText,
  backTo = "/properties",
}: PropertyHeaderProps) {
  return (
    <Group justify="space-between">
      <Group>
        <Title order={2}>{title}</Title>
        <Badge color={published ? "green" : "gray"}>{published ? "Published" : "Draft"}</Badge>
        {isMocked && (
          <Badge color="yellow" variant="light" title="Showing mocked data">
            Mocked
          </Badge>
        )}
        {useMocks && tenantSourceText && (
          <Text size="xs" c="dimmed" title="Debug: mocks status" style={{ marginLeft: 8 }}>
            {tenantSourceText}
          </Text>
        )}
      </Group>
      <Anchor component={Link} to={backTo}>
        Back to properties
      </Anchor>
    </Group>
  );
}