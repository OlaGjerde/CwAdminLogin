/**
 * API Error Handling Utilities
 */

import type { AxiosError } from 'axios';
import { logError } from './logger';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Create a standardized error object from an API error response
 */
export function handleApiError(error: unknown): ApiError {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  const axiosError = error as AxiosError<{ detail?: string; message?: string; error?: string }>;
  
  if (axiosError.response) {
    const status = axiosError.response.status;
    const data = axiosError.response.data;
    
    // Log detailed error information
    logError('API Error:', {
      status,
      data,
      url: axiosError.config?.url,
      method: axiosError.config?.method
    });

    // Common error scenarios
    if (status === 401) {
      return {
        message: 'Session expired or unauthorized',
        status,
        code: 'UNAUTHORIZED'
      };
    }

    if (status === 403) {
      return {
        message: 'Access denied',
        status,
        code: 'FORBIDDEN'
      };
    }

    if (status === 404) {
      return {
        message: 'Resource not found',
        status,
        code: 'NOT_FOUND'
      };
    }

    // Try to extract error message from various response formats
    const message = typeof data === 'object' && data 
      ? data.detail || data.message || data.error || 'An error occurred'
      : 'An error occurred';

    return {
      message,
      status,
      details: data
    };
  }

  if (axiosError.request) {
    // Network error (no response received)
    return {
      message: 'Network error - please check your connection',
      code: 'NETWORK_ERROR'
    };
  }

  // Something else went wrong
  return {
    message: axiosError.message || 'An unexpected error occurred',
    code: 'UNKNOWN'
  };
}