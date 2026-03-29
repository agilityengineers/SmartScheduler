// API client for communicating with the SmartScheduler server
// Uses cookie-based session auth with credentials: 'include'

import type { User, BookingLink, AvailabilitySlot, BookingRequest } from './types';

const PRODUCTION_BASE_URL = 'https://smart-scheduler.ai';
const FETCH_TIMEOUT_MS = 8000;

async function getBaseUrl(): Promise<string> {
  // Allow override stored in chrome.storage.local for development/self-hosted use
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const stored = await chrome.storage.local.get('baseUrl');
      if (stored.baseUrl && typeof stored.baseUrl === 'string') {
        return stored.baseUrl.replace(/\/$/, '');
      }
    } catch {
      // storage API unavailable, fall through
    }
  }
  return PRODUCTION_BASE_URL;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = await getBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    };

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
      throw new ApiError(0, 'Server unreachable — please check your connection.');
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
  try {
    await apiFetch<void>('/api/logout', { method: 'POST' });
  } catch {
    // Ignore errors on logout — session may already be invalid
  }
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

// ---- Base URL helper for UI links ----

export async function resolveBaseUrl(): Promise<string> {
  return getBaseUrl();
}
