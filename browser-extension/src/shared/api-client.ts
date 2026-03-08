// API client for communicating with the SmartScheduler server
// All requests include credentials for session cookie auth

import type { User, BookingLink, AvailabilitySlot, BookingRequest } from './types';

const DEFAULT_BASE_URL = 'http://localhost:5000';

function getBaseUrl(): string {
  // In production, this would be the deployed SmartScheduler URL
  // Can be configured via extension storage
  return DEFAULT_BASE_URL;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

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
