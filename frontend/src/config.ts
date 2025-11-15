// Detect subdomain from URL query parameter or hostname
const getSubdomain = (): string => {
  if (typeof window === 'undefined') return 'localhost';
  
  // First check for subdomain in URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const querySubdomain = urlParams.get('subdomain');
  if (querySubdomain) {
    return querySubdomain;
  }
  
  // Fallback to hostname-based detection
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Handle different cases:
  // child.localhost:5173 -> subdomain = child
  // test.localhost:5173 -> subdomain = test
  // localhost:5173 -> subdomain = localhost
  
  if (parts.length >= 2 && parts[1] === 'localhost') {
    return parts[0]; // First part is subdomain
  }
  
  return 'localhost'; // Default fallback
};

// Dynamic API URL based on subdomain
const getApiUrl = (): string => {
  const subdomain = getSubdomain();
  
  if (subdomain === 'localhost') {
    // Default/main site - use the original backend
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
  } else {
    // Child service API - each subdomain connects to its respective child backend
    // The child backend is accessible at port 8002
    return `http://localhost:8002`;
  }
};

export const API_URL = getApiUrl();
export const SINGLE_SITE_MODE = (import.meta.env.VITE_SINGLE_SITE_MODE ?? 'false') === 'true';
export const SUBDOMAIN = getSubdomain();