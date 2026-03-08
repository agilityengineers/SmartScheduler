// Background service worker for SmartScheduler browser extension
// Handles auth state management and acts as API proxy for content scripts

import type { ExtensionMessage, AuthState, User } from '../shared/types';
import { getCurrentUser, login, logout, getBookingLinks } from '../shared/api-client';

let cachedAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  baseUrl: 'http://localhost:5000',
};

// Check auth state on extension load
async function refreshAuthState(): Promise<AuthState> {
  try {
    const user = await getCurrentUser();
    cachedAuthState = {
      isAuthenticated: user !== null,
      user,
      baseUrl: cachedAuthState.baseUrl,
    };
  } catch {
    cachedAuthState = {
      isAuthenticated: false,
      user: null,
      baseUrl: cachedAuthState.baseUrl,
    };
  }

  // Update badge to indicate auth status
  const badgeText = cachedAuthState.isAuthenticated ? '' : '!';
  const badgeColor = cachedAuthState.isAuthenticated ? '#22c55e' : '#ef4444';
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });

  return cachedAuthState;
}

// Message handler for popup and content scripts
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // Keep message channel open for async response
  },
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'GET_AUTH_STATE':
      return await refreshAuthState();

    case 'LOGIN': {
      try {
        const user = await login(message.payload.username, message.payload.password);
        cachedAuthState = {
          isAuthenticated: true,
          user: user as User,
          baseUrl: cachedAuthState.baseUrl,
        };
        chrome.action.setBadgeText({ text: '' });
        return { success: true, user };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Login failed',
        };
      }
    }

    case 'LOGOUT': {
      try {
        await logout();
        cachedAuthState = {
          isAuthenticated: false,
          user: null,
          baseUrl: cachedAuthState.baseUrl,
        };
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        return { success: true };
      } catch {
        return { success: false };
      }
    }

    case 'GET_BOOKING_LINKS': {
      try {
        const links = await getBookingLinks();
        return { links };
      } catch (err) {
        return {
          links: [],
          error: err instanceof Error ? err.message : 'Failed to load booking links',
        };
      }
    }

    case 'OPEN_BOOKING_MODAL': {
      // Send message to the active tab's content script to open modal
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'OPEN_BOOKING_MODAL',
          payload: message.payload,
        });
      }
      return { success: true };
    }

    case 'COPY_LINK': {
      // Use the offscreen clipboard API or fallback
      // The popup handles this directly via navigator.clipboard
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

// Refresh auth state when extension is installed or browser starts
chrome.runtime.onInstalled.addListener(() => {
  refreshAuthState();
});

chrome.runtime.onStartup.addListener(() => {
  refreshAuthState();
});

// Periodic auth check (every 5 minutes)
chrome.alarms.create('auth-check', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'auth-check') {
    refreshAuthState();
  }
});
