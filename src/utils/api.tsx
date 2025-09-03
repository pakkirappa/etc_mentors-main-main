// utils/api.ts
import { toast } from 'react-toastify';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    toast.error('Your session has expired. Please log in again.');
    // Dispatch custom event for redirect
    window.dispatchEvent(new Event('sessionExpired'));
    return;
  }

  return res;
}
