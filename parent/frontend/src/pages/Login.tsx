import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { authApiClient } from '../api/client';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[Login] Attempting login with:', { username, password });
      const response = await authApiClient.login(username, password);
      console.log('[Login] Login successful:', response);
      
      // Store the token
      localStorage.setItem('token', response.access_token);
      
      // Force page reload to update authentication state
      window.location.href = '/';
      
      notifications.show({
        title: 'Login successful',
        message: 'Welcome back!',
        color: 'green',
      });
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('[Login] Login error:', err);
      setError('Invalid username or password');
      notifications.show({
        title: 'Login failed',
        message: 'Invalid username or password',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your credentials to access the parent dashboard
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            
            <TextInput
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              required
              disabled={loading}
            />
            
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              disabled={loading}
            />
            
            <Button type="submit" fullWidth loading={loading}>
              Login
            </Button>
            
            <Button 
              variant="outline" 
              fullWidth 
              onClick={async () => {
                try {
                  console.log('Testing direct login...');
                  const response = await authApiClient.login('admin', 'admin123');
                  console.log('Direct login success:', response);
                } catch (err) {
                  console.error('Direct login error:', err);
                }
              }}
            >
              Test Login
            </Button>
          </Stack>
        </form>
      </Paper>
      
      <Text c="dimmed" size="sm" ta="center" mt={20}>
        Default credentials: admin / admin123
      </Text>
    </Container>
  );
}