import axios from 'axios';

export const api = axios.create({
  baseURL: `/api`, // Use relative path to leverage Vite proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication interceptor to regular API client
api.interceptors.request.use((config) => {
  console.log('[API] Request:', {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    headers: config.headers,
    data: config.data
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[API] Response success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    return Promise.reject(error);
  }
);

// Create a separate API client for authentication (uses proxy to parent backend)
export const authApi = axios.create({
  baseURL: `/api`, // Use relative path to leverage Vite proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request/response interceptors for debugging
authApi.interceptors.request.use((config) => {
  console.log('[AuthAPI] Request:', {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    headers: config.headers,
    data: config.data
  });

  // Don't add auth header for login requests
  if (config.url?.includes('/token')) {
    return config;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => {
    console.log('[AuthAPI] Response success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[AuthAPI] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    return Promise.reject(error);
  }
);

export interface ClientSite {
  id: string;  // UUID string, not number
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

export interface ClientSiteEvent {
  id: number;
  client_site_id: string;  // UUID string, not number
  type: string;
  message: string;
  created_at: string;
}

export interface ClientSiteHealth {
  status: 'online' | 'offline' | 'error';
  latency_ms: number;
  timestamp: string;
}

export const clientSiteApi = {
  getClientSites: async (): Promise<ClientSite[]> => {
    console.log('[API] Fetching client sites from /client-sites');
    const response = await api.get<ClientSite[]>('/client-sites');
    console.log('[API] Client sites response:', response.data);
    return response.data;
  },

  createClientSite: async (data: CreateClientSiteRequest): Promise<ClientSite> => {
    const response = await api.post<ClientSite>('/client-sites', data);
    return response.data;
  },

  activateClientSite: async (id: string): Promise<ActivateClientSiteResponse> => {
    const response = await api.post<ActivateClientSiteResponse>(`/client-sites/${id}/activate`);
    return response.data;
  },

  deactivateClientSite: async (id: string): Promise<ActivateClientSiteResponse> => {
    const response = await api.post<ActivateClientSiteResponse>(`/client-sites/${id}/deactivate`);
    return response.data;
  },

  deleteClientSite: async (subdomain: string): Promise<void> => {
    await api.delete(`/client-sites/${subdomain}`);
  },

  getHealth: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  },

  getConfig: async (): Promise<ConfigResponse> => {
    const response = await api.get<ConfigResponse>('/config');
    return response.data;
  },

  getClientSiteEvents: async (id: string): Promise<ClientSiteEvent[]> => {
    const response = await api.get<ClientSiteEvent[]>(`/client-sites/${id}/events`);
    return response.data;
  },

  getClientSiteHealth: async (id: string): Promise<ClientSiteHealth> => {
    const response = await api.get<ClientSiteHealth>(`/client-sites/${id}/health`);
    return response.data;
  },
};

// Authentication API
export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export const authApiClient = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    console.log('[Auth] Attempting login with username:', username);

    // Use the regular api client for login (since authApi might have issues)
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    console.log('[Auth] Request body:', params.toString());

    const response = await api.post<TokenResponse>('/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
    });

    console.log('[Auth] Login response:', response.data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await authApi.get<User>('/users/me');
    return response.data;
  },
};