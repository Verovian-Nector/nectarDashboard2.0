import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingOverlay, Container } from '@mantine/core';
import { authApiClient } from '../api/client';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const user = await authApiClient.getCurrentUser();
        console.log('[RequireAdmin] User role:', user.role);
        const adminRoles = ['admin', 'super_admin'];
        setIsAdmin(adminRoles.includes(user.role));
      } catch (error) {
        console.error('[RequireAdmin] Failed to check user role:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
        setHasChecked(true);
      }
    };

    checkAdminRole();
  }, []);

  if (isLoading) {
    return (
      <Container style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (!hasChecked || !isAdmin) {
    console.log('[RequireAdmin] Access denied - not an admin');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}