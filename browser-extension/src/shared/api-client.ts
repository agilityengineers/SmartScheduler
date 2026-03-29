// API client for communicating with the SmartScheduler server
// Uses cookie-based session auth with chrome.cookies API in service worker context

import type { User, BookingLink, AvailabilitySlot, BookingRequest } from './types';

const DEFAULT_BASE_URL = 'http://localhost:5000';
const FETCH_TIMEOUT_MS = 5000;

function getBaseUrl(): string {
  return DEFAULT_BASE_URL;
}

// Detect if running in a service worker (no window object)
function isServiceWorker(): boolean {
  return typeof window === 'undefined' && typeof self !== 'undefined';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // In service worker context, manually attach session cookie
    if (isServiceWorker() && typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const cookie = await chrome.cookies.get({ url: baseUrl, name: 'connect.sid' });
        if (cookie) {
          headers['Cookie'] = `${cookie.name}=${cookie.value}`;
        }
      } catch {
        // cookies API may not be available, continue without
      }
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: controller.signal,
    };

    // Only use credentials: 'include' in non-service-worker contexts (popup, content script)
    if (!isServiceWorker()) {
      fetchOptions.credentials = 'include';
    }

    const response = await fetch(`${baseUrl}${path}`, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      let message: string;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed.message || parsed.error || response.statusText;
      } catch {
        message = response.statusText;
      }
      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(0, 'Server unreachable — is SmartScheduler running?');
    }
    throw new ApiError(0, (err as Error).message || 'Network error');
  } finally {
    clearTimeout(timeoutId);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- Auth ----

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>('/api/users/current');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export async function login(username: string, password: string): Promise<User> {
  return apiFetch<User>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/logout', { method: 'POST' });
}

// ---- Booking Links ----

export async function getBookingLinks(): Promise<BookingLink[]> {
  return apiFetch<BookingLink[]>('/api/booking');
}

export async function getBookingLink(id: number): Promise<BookingLink> {
  return apiFetch<BookingLink>(`/api/booking/${id}`);
}

// ---- Public Booking (no auth needed) ----

export async function getPublicBookingLink(slug: string): Promise<BookingLink> {
  return apiFetch<BookingLink>(`/api/public/booking/${slug}`);
}

export async function getAvailability(
  slug: string,
  startDate: string,
  endDate: string,
  timezone: string,
): Promise<AvailabilitySlot[]> {
  const params = new URLSearchParams({ startDate, endDate, timezone });
  return apiFetch<AvailabilitySlot[]>(
    `/api/public/booking/${slug}/availability?${params}`,
  );
}

export async function createBooking(
  slug: string,
  booking: BookingRequest,
): Promise<{ id: number; redirectUrl?: string; confirmationMessage?: string }> {
  return apiFetch(`/api/public/booking/${slug}`, {
    method: 'POST',
    body: JSON.stringify(booking),
  });
}

// ---- User Public Page ----

export async function getUserPublicPagePath(): Promise<{ path: string } | null> {
  try {
    return await apiFetch<{ path: string }>('/api/user/public-page-path');
  } catch {
    return null;
  }
}
