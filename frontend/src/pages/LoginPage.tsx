import { useState } from 'react'
import { Paper, Title, TextInput, PasswordInput, Button, Stack, Text, Alert } from '@mantine/core'
import { useForm } from '@mantine/form'
import { login } from '../api/auth'
import { useSession } from '../state/session'
import { notifications } from '@mantine/notifications'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LoginPage() {
  const setToken = useSession((s) => s.setToken)
  const navigate = useNavigate()
  const location = useLocation() as any
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm({
    initialValues: { username: '', password: '' },
    validate: {
      username: (v) => (v.trim().length === 0 ? 'Username is required' : null),
      password: (v) => (v.trim().length === 0 ? 'Password is required' : null),
    },
  })

  async function onSubmit(values: typeof form.values) {
    setLoading(true)
    try {
      const resp = await login(values.username, values.password)
      setToken(resp.access_token)
      setErrorMessage(null)
      notifications.show({ title: 'Logged in', message: 'Welcome back!', color: 'green' })
      const from = location.state?.from?.pathname || '/properties'
      navigate(from, { replace: true })
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      const msg = detail || 'Login failed'
      // Persist a clear message for deactivated accounts
      if (status === 403 && String(detail).toLowerCase().includes('deactivat')) {
        setErrorMessage('Your account has been deactivated. Please contact your administrator to restore access.')
      } else {
        setErrorMessage(String(msg))
      }
      notifications.show({ title: 'Login error', message: String(msg), color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack align="center" mt={80}>
      <Paper w={400} p="lg" withBorder data-testid="login-paper">
        <Title order={3} mb="md" data-testid="login-heading">Sign in</Title>
        <form onSubmit={form.onSubmit(onSubmit)} data-testid="login-form">
          <Stack gap="sm">
            {errorMessage && (
              <Alert color="red" variant="light" title="Sign-in blocked">
                {errorMessage}
              </Alert>
            )}
            <div data-testid="login-username">
              <TextInput label="Username" placeholder="your.name" {...form.getInputProps('username')} />
            </div>
            <div data-testid="login-password">
              <PasswordInput label="Password" placeholder="Your password" {...form.getInputProps('password')} />
            </div>
            <div data-testid="login-submit">
              <Button type="submit" loading={loading}>Sign in</Button>
            </div>
            <Text c="dimmed" size="xs">Use your dashboard credentials.</Text>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}