import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAdmin } from './components/RequireAdmin';
import { ClientSiteList } from './pages/ClientSiteList';
import { ClientSiteDetail } from './pages/ClientSiteDetail';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { theme } from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

const queryClient = new QueryClient();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    
    // Check auth on mount
    checkAuth();
    
    // Listen for storage changes (logout from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <ClientSiteList />
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/client-site/:id" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <ClientSiteDetail />
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route 
              path="/settings" 
              element={
                isAuthenticated ? (
                  <Layout>
                    <RequireAdmin>
                      <Settings />
                    </RequireAdmin>
                  </Layout>
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
