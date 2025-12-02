/**
 * Secure Axios Configuration
 * Provides a configured axios instance with security features
 */

import axios from 'axios';
import { getSafeErrorMessage, checkRateLimit } from './security';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with security configurations
const secureAxios = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Include credentials (cookies) for authentication
  withCredentials: true,
});

// Request interceptor for security checks
secureAxios.interceptors.request.use(
  (config) => {
    // Client-side rate limiting check
    const endpoint = config.url;
    if (!checkRateLimit(endpoint, 10, 60000)) {
      toast.error('Demasiadas solicitudes. Por favor espera un momento.');
      return Promise.reject(new Error('Rate limit exceeded'));
    }

    // Add request timestamp for monitoring
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
secureAxios.interceptors.response.use(
  (response) => {
    // Log response time in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const endTime = new Date();
      const duration = endTime - response.config.metadata.startTime;
      console.log(`Request to ${response.config.url} took ${duration}ms`);
    }

    return response;
  },
  (error) => {
    // Handle errors gracefully
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      // Handle 401 Unauthorized - redirect to login
      if (status === 401) {
        console.warn('Unauthorized - redirecting to login');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      
      // Log security events
      if (status === 429) {
        console.warn('Rate limit exceeded on server');
      } else if (status === 403) {
        console.warn('Access forbidden');
      } else if (status >= 500) {
        console.error('Server error:', status);
      }
      
      // Show user-friendly error
      const safeMessage = getSafeErrorMessage(error);
      
      // Don't show toast for certain errors (let component handle them)
      if (status !== 404 && status !== 401) {
        toast.error(safeMessage);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network error:', error.message);
      toast.error('Error de conexión. Verifica tu internet.');
    } else {
      // Error setting up request
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Secure file upload configuration
export const uploadFiles = async (files) => {
  const formData = new FormData();
  
  // Validate files before upload
  for (const file of files) {
    // Validation is done in the component, but double-check here
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File too large');
    }
    formData.append('files', file);
  }

  return secureAxios.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // Longer timeout for file uploads
  });
};

export default secureAxios;
