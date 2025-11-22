import { Card, Stack, Text, Title, Button, Group } from '@mantine/core'
import { API_URL, SUBDOMAIN, SINGLE_SITE_MODE } from '../config'
import { useState } from 'react'
import { api } from '../api/client'

export default function DebugPage() {
  const [apiResponse, setApiResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testApiConnection = async () => {
    setLoading(true)
    try {
      console.log('[Debug] Testing API connection to:', API_URL)
      const response = await api.get('/health')
      console.log('[Debug] API response:', response.data)
      setApiResponse(JSON.stringify(response.data, null, 2))
    } catch (error) {
      console.error('[Debug] API test failed:', error)
      setApiResponse(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testPropertiesEndpoint = async () => {
    setLoading(true)
    try {
      console.log('[Debug] Testing properties endpoint')
      const response = await api.get('/properties')
      console.log('[Debug] Properties response:', response.data)
      setApiResponse(`Properties count: ${response.data.length}`)
    } catch (error) {
      console.error('[Debug] Properties test failed:', error)
      setApiResponse(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack p="md">
      <Title order={2}>Debug Information</Title>
      <Card p="md">
        <Stack gap="xs">
          <Text><strong>API URL:</strong> {API_URL}</Text>
          <Text><strong>Subdomain:</strong> {SUBDOMAIN}</Text>
          <Text><strong>Single Site Mode:</strong> {SINGLE_SITE_MODE ? 'Yes' : 'No'}</Text>
          <Text><strong>Current Host:</strong> {window.location.hostname}</Text>
          <Text><strong>Current Port:</strong> {window.location.port}</Text>
          <Text><strong>Current Protocol:</strong> {window.location.protocol}</Text>
          <Text><strong>Full URL:</strong> {window.location.href}</Text>
        </Stack>
      </Card>
      
      <Card p="md">
        <Stack gap="md">
          <Title order={3}>API Tests</Title>
          <Group>
            <Button onClick={testApiConnection} loading={loading} size="xs">
              Test Health Endpoint
            </Button>
            <Button onClick={testPropertiesEndpoint} loading={loading} size="xs">
              Test Properties Endpoint
            </Button>
          </Group>
          {apiResponse && (
            <Card p="sm" withBorder>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {apiResponse}
              </Text>
            </Card>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}