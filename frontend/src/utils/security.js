/**
 * Security utilities for frontend
 * Provides input sanitization, validation, and XSS protection
 */

import DOMPurify from 'dompurify';

// ==================== INPUT SANITIZATION ====================

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Unsanitized HTML
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize plain text input
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (text, maxLength = 50000) => {
  if (!text) return '';
  
  // Remove any HTML tags
  const cleaned = text.replace(/<[^>]*>/g, '');
  
  // Remove null bytes
  const noNulls = cleaned.replace(/\0/g, '');
  
  // Trim to max length
  return noNulls.slice(0, maxLength).trim();
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return '';
  
  // Remove path components
  const basename = filename.split('/').pop().split('\\\\').pop();
  
  // Remove dangerous characters
  const cleaned = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  return cleaned.slice(0, 255);
};

// ==================== VALIDATION ====================

/**
 * Validate UUID format
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} - True if valid UUID
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate file type
 * @param {File} file - File object
 * @returns {boolean} - True if valid
 */
export const isValidFileType = (file) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  const allowedExtensions = ['.pdf', '.txt', '.csv', '.xlsx', '.xls', '.docx', '.doc'];
  
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
};

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSize - Maximum size in bytes (default 50MB)
 * @returns {boolean} - True if valid
 */
export const isValidFileSize = (file, maxSize = 50 * 1024 * 1024) => {
  return file.size <= maxSize;
};

/**
 * Validate text length
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} - True if valid
 */
export const isValidLength = (text, maxLength) => {
  return text && text.length > 0 && text.length <= maxLength;
};

// ==================== SECURE STORAGE ====================

/**
 * Securely store data in sessionStorage (not localStorage for security)
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const secureStore = (key, value) => {
  try {
    const sanitizedKey = sanitizeText(key, 100);
    sessionStorage.setItem(sanitizedKey, JSON.stringify(value));
  } catch (error) {
    console.error('Storage error:', error);
  }
};

/**
 * Retrieve data from secure storage
 * @param {string} key - Storage key
 * @returns {any} - Retrieved value or null
 */
export const secureRetrieve = (key) => {
  try {
    const sanitizedKey = sanitizeText(key, 100);
    const item = sessionStorage.getItem(sanitizedKey);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Retrieval error:', error);
    return null;
  }
};

/**
 * Clear secure storage
 */
export const secureClear = () => {
  sessionStorage.clear();
};

// ==================== ERROR HANDLING ====================

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} - Safe error message
 */
export const getSafeErrorMessage = (error) => {
  // Never expose technical details to users
  const genericMessages = {
    'Network Error': 'No se pudo conectar con el servidor. Por favor intenta nuevamente.',
    'timeout': 'La solicitud tardó demasiado. Por favor intenta nuevamente.',
    '400': 'Solicitud inv\u00e1lida. Verifica los datos ingresados.',
    '401': 'No autorizado. Por favor inicia sesi\u00f3n.',
    '403': 'Acceso denegado.',
    '404': 'Recurso no encontrado.',
    '429': 'Demasiadas solicitudes. Por favor espera un momento.',
    '500': 'Error del servidor. Por favor intenta m\u00e1s tarde.',
    '503': 'Servicio no disponible temporalmente.'
  };
  
  if (error.response) {
    const status = error.response.status.toString();
    return genericMessages[status] || 'Ocurri\u00f3 un error. Por favor intenta nuevamente.';
  }
  
  if (error.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network')) return genericMessages['Network Error'];
    if (msg.includes('timeout')) return genericMessages['timeout'];
  }
  
  return 'Ocurri\u00f3 un error inesperado. Por favor intenta nuevamente.';
};

// ==================== RATE LIMITING (Client-side) ====================

const requestCounts = new Map();

/**
 * Check if rate limit is exceeded (client-side protection)
 * @param {string} endpoint - API endpoint
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if allowed
 */
export const checkRateLimit = (endpoint, maxRequests = 10, windowMs = 60000) => {
  const now = Date.now();
  const record = requestCounts.get(endpoint) || { count: 0, resetTime: now + windowMs };
  
  if (now > record.resetTime) {
    // Reset window
    requestCounts.set(endpoint, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  requestCounts.set(endpoint, record);
  return true;
};

// ==================== CONTENT VALIDATION ====================

/**
 * Check if content contains suspicious patterns
 * @param {string} content - Content to check
 * @returns {boolean} - True if safe
 */
export const isSafeContent = (content) => {
  if (!content) return true;
  
  // Check for script injection attempts
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,  // Event handlers
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(content));
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeFilename,
  isValidUUID,
  isValidFileType,
  isValidFileSize,
  isValidLength,
  secureStore,
  secureRetrieve,
  secureClear,
  getSafeErrorMessage,
  checkRateLimit,
  isSafeContent
};
