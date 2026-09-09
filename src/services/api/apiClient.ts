import { API_CONFIG } from '../../config/apiConfig';

export interface ApiError {
  status: number;
  message: string;
  isBackendPending?: boolean;
}

export class ApiException extends Error {
  status: number;
  isBackendPending: boolean;

  constructor(status: number, message: string, isBackendPending = false) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.isBackendPending = isBackendPending;
  }
}

/**
 * Robust HTTP client ready for backend integration with comprehensive status code handling.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = 'An unexpected server error occurred.';
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) errorMessage = errJson.message;
      } catch {
        // Fallback to HTTP status messages
      }

      switch (response.status) {
        case 400:
          throw new ApiException(400, errorMessage || 'Bad Request: Invalid parameters provided.');
        case 401:
          throw new ApiException(401, 'Session expired or unauthorized. Please sign in again.');
        case 403:
          throw new ApiException(403, 'Access denied: You do not have permission for this resource.');
        case 404:
          throw new ApiException(404, 'Requested backend resource not found.');
        case 409:
          throw new ApiException(409, 'Conflict: Resource state conflict occurred.');
        case 500:
        case 502:
        case 503:
          throw new ApiException(response.status, 'Server error: Backend service currently unavailable.');
        default:
          throw new ApiException(response.status, errorMessage || `HTTP Error ${response.status}`);
      }
    }

    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err instanceof ApiException) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new ApiException(408, 'Request timed out. Backend server did not respond.');
    }

    // Network connection failed / backend server not running
    throw new ApiException(
      0,
      'Backend integration pending: Server is currently unreachable or not connected.',
      true
    );
  }
}
