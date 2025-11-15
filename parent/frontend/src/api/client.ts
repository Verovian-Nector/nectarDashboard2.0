import axios from 'axios';

export const api = axios.create({
  baseURL: `/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ClientSite {
  id: number;
  name: string;
  subdomain: string;
  api_url: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateClientSiteRequest {
  name: string;
  subdomain: string;
}

export interface ActivateClientSiteResponse {
  status: string;
  activated_at: string;
}

export interface ConfigResponse {
  main_domain: string;
  child_service_port: number;
  base_url: string;
  child_service_base_url_template: string;
}

export interface TenantEvent {
  id: number;
  tenant_id: number;
  type: string;
  message: string;
  created_at: string;
}

export interface TenantHealth {
  status: 'online' | 'offline' | 'error';
  latency_ms: number;
  timestamp: string;
}

export const clientSiteApi = {
  getClientSites: async (): Promise<ClientSite[]> => {
    const response = await api.get<ClientSite[]>('/tenants');
    return response.data;
  },

  createClientSite: async (data: CreateClientSiteRequest): Promise<ClientSite> => {
    const response = await api.post<ClientSite>('/tenants', data);
    return response.data;
  },

  activateClientSite: async (id: number): Promise<ActivateClientSiteResponse> => {
    const response = await api.post<ActivateClientSiteResponse>(`/tenants/${id}/activate`);
    return response.data;
  },

  deactivateClientSite: async (id: number): Promise<ActivateClientSiteResponse> => {
    const response = await api.post<ActivateClientSiteResponse>(`/tenants/${id}/deactivate`);
    return response.data;
  },

  getHealth: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  },

  getConfig: async (): Promise<ConfigResponse> => {
    const response = await api.get<ConfigResponse>('/config');
    return response.data;
  },

  getTenantEvents: async (id: number): Promise<TenantEvent[]> => {
    const response = await api.get<TenantEvent[]>(`/tenants/${id}/events`);
    return response.data;
  },

  getTenantHealth: async (id: number): Promise<TenantHealth> => {
    const response = await api.get<TenantHealth>(`/tenants/${id}/health`);
    return response.data;
  },
};