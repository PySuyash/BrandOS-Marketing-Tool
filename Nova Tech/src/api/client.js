import axios from 'axios';

const SESSION_TOKEN_KEY = 'novatech_session_token';
let inMemoryToken = null;

export function setSessionToken(token) {
  inMemoryToken = token || null;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
}

export function getSessionToken() {
  if (inMemoryToken) return inMemoryToken;
  try {
    const stored = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractApiError(error, fallbackMessage = 'An unexpected error occurred.') {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
}
