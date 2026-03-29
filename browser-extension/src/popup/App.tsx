import { useState, useEffect, useCallback } from 'react';
import type { AuthState, BookingLink, User } from '../shared/types';
import { LoginScreen } from './LoginScreen';
import { BookingLinkList } from './BookingLinkList';
import { resolveBaseUrl } from '../shared/api-client';

type View = 'scheduling' | 'meetings' | 'contacts';

export function App() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('scheduling');

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
      setAuthState(response as AuthState);
    } catch {
      const baseUrl = await resolveBaseUrl();
      setAuthState({ isAuthenticated: false, user: null, baseUrl });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLoginSuccess = (user: User) => {
    setAuthState((prev) => ({
      ...prev!,
      isAuthenticated: true,
      user,
    }));
  };

  const handleLogout = async () => {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    const baseUrl = await resolveBaseUrl();
    setAuthState({ isAuthenticated: false, user: null, baseUrl });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!authState?.isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="header-logo">S</div>
          <span className="header-title">SmartScheduler</span>
        </div>
        <div className="header-actions">
          <a
            href={`${authState.baseUrl}/booking/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            + Create
          </a>
          <button className="btn-icon" onClick={handleLogout} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* View content */}
      {view === 'scheduling' && <SchedulingView user={authState.user!} baseUrl={authState.baseUrl} />}
      {view === 'meetings' && <ComingSoonView title="Meetings" description="View and manage your upcoming meetings." baseUrl={authState.baseUrl} />}
      {view === 'contacts' && <ComingSoonView title="Contacts" description="Browse and search your contacts." baseUrl={authState.baseUrl} />}

      {/* Bottom nav */}
      <div className="bottom-nav">
        <button
          className={`bottom-nav-item ${view === 'meetings' ? 'active' : ''}`}
          onClick={() => setView('meetings')}
        >
          <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Meetings
        </button>
        <button
          className={`bottom-nav-item ${view === 'scheduling' ? 'active' : ''}`}
          onClick={() => setView('scheduling')}
        >
          <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Scheduling
        </button>
        <button
          className={`bottom-nav-item ${view === 'contacts' ? 'active' : ''}`}
          onClick={() => setView('contacts')}
        >
          <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Contacts
        </button>
      </div>
    </div>
  );
}

// ---- Scheduling View ----

function SchedulingView({ user, baseUrl }: { user: User; baseUrl: string }) {
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinks() {
      setLoading(true);
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_BOOKING_LINKS' });
        const result = response as { links: BookingLink[]; error?: string };
        if (result.error) {
          setError(result.error);
        } else {
          setLinks(result.links);
        }
      } catch {
        setError('Failed to load booking links');
      } finally {
        setLoading(false);
      }
    }
    fetchLinks();
  }, []);

  const displayName = user.displayName || user.firstName || user.username;

  return (
    <>
      {/* Section label */}
      <div className="section-label">Event types</div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search event types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User info */}
      <div className="user-info">
        <div className="user-avatar">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={displayName} />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <span className="user-name">{displayName}</span>
      </div>

      {/* Booking links */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : (
        <BookingLinkList links={links} search={search} baseUrl={baseUrl} />
      )}
    </>
  );
}

// ---- Coming Soon View ----

function ComingSoonView({ title, description, baseUrl }: { title: string; description: string; baseUrl: string }) {
  return (
    <div className="empty-state" style={{ flex: 1, padding: '24px 16px' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" style={{ marginBottom: 12 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{title} — Coming Soon</p>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>{description}</p>
      <a
        href={baseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline btn-sm"
      >
        Open SmartScheduler
      </a>
    </div>
  );
}
