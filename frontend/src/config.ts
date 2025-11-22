// Detect subdomain from URL query parameter or hostname
const getSubdomain = (): string => {
  if (typeof window === 'undefined') return 'localhost';
  
  // First check for subdomain in URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const querySubdomain = urlParams.get('subdomain');
  if (querySubdomain) {
    console.log('[Config] Found subdomain in query parameter:', querySubdomain);
    return querySubdomain;
  }
  
  // Fallback to hostname-based detection
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  console.log('[Config] Hostname:', hostname, 'Parts:', parts);
  
  // Handle different cases:
  // child.localhost:5173 -> subdomain = child
  // test.localhost:5173 -> subdomain = test
  // localhost:5173 -> subdomain = localhost
  
  if (parts.length >= 2 && parts[1] === 'localhost') {
    const subdomain = parts[0];
    console.log('[Config] Detected subdomain from hostname:', subdomain);
    return subdomain;
  }
  
  console.log('[Config] Using default subdomain: localhost');
  return 'localhost'; // Default fallback
};

// Export a function to get dynamic subdomain for runtime checks
export const getDynamicSubdomain = (): string => {
  if (typeof window === 'undefined') return 'localhost';
  
  // Always check query parameter first at runtime
  const urlParams = new URLSearchParams(window.location.search);
  const querySubdomain = urlParams.get('subdomain');
  if (querySubdomain) {
    return querySubdomain;
  }
  
  // Fallback to the cached subdomain
  return SUBDOMAIN;
};

// Dynamic API URL based on subdomain
const getApiUrl = (): string => {
  const subdomain = getSubdomain();
  console.log('[Config] Determining API URL for subdomain:', subdomain);
  
  // For development:
  // - Parent backend (port 8001) for tenant management and configuration
  // - Child backend (port 8002) for operational data when accessing client sites
  if (subdomain && subdomain !== 'localhost') {
    // Client site - use child backend
    const apiUrl = 'http://localhost:8002';
    console.log('[Config] Using child backend for client site:', apiUrl);
    return apiUrl;
  } else {
    // Parent dashboard - use parent backend for operational data
    const apiUrl = 'http://localhost:8001';
    console.log('[Config] Using parent backend for operational data:', apiUrl);
    return apiUrl;
  }
};

export const API_URL = getApiUrl();
export const SINGLE_SITE_MODE = (import.meta.env.VITE_SINGLE_SITE_MODE ?? 'false') === 'true';
export const SUBDOMAIN = getSubdomain();