import './style.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import { createRoot } from 'react-dom/client'
import { Notifications } from '@mantine/notifications'
import BrandingProvider from './context/BrandingProvider'
import ContractorsProvider from './context/ContractorsProvider'
import FieldValuesProvider from './context/FieldValuesProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const queryClient = new QueryClient()

import DashboardHome from './pages/DashboardHome'
import PropertiesPage from './pages/PropertiesPage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import TenantsPage from './pages/TenantsPage'
import CalendarPage from './pages/CalendarPage'
import FinancialsPage from './pages/FinancialsPage'
import MaintenancePage from './pages/MaintenancePage'
import NotFound from './pages/NotFound'
import LoginPage from './pages/LoginPage'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import AdminSettingsPage from './pages/AdminSettingsPage'
import ProfileManagementPage from './pages/ProfileManagementPage'


import AppShellLayout from './layouts/AppShellLayout'

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandingProvider>
      <FieldValuesProvider>
        <ContractorsProvider>
      <Notifications position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}> 
            <Route element={<AppShellLayout />}> 
              <Route path="/" element={<DashboardHome />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/financials" element={<FinancialsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/profile" element={<ProfileManagementPage />} />
              <Route element={<RequireAdmin />}> 
                <Route path="/settings" element={<AdminSettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
        </ContractorsProvider>
      </FieldValuesProvider>
    </BrandingProvider>
  </QueryClientProvider>
)

const rootEl = document.querySelector<HTMLDivElement>('#app')!
createRoot(rootEl).render(<App />)
