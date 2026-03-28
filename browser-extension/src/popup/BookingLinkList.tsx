import { useState } from 'react';
import type { BookingLink } from '../shared/types';

interface BookingLinkListProps {
  links: BookingLink[];
  search: string;
  baseUrl: string;
}

export function BookingLinkList({ links, search, baseUrl }: BookingLinkListProps) {
  const filtered = links.filter((link) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      link.title.toLowerCase().includes(q) ||
      link.description?.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        {search ? (
          <p>No event types match "{search}"</p>
        ) : (
          <>
            <p>No booking links yet.</p>
            <a
              href={baseUrl || 'http://localhost:5000'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              Create your first booking link
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((link) => (
        <BookingLinkCard key={link.id} link={link} baseUrl={baseUrl} />
      ))}
    </div>
  );
}

function BookingLinkCard({ link, baseUrl }: { link: BookingLink; baseUrl: string }) {
  const [copied, setCopied] = useState(false);

  const bookingUrl = `${baseUrl}/booking/${link.slug}`;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} mins`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
    return `${hrs} hr ${mins} mins`;
  };

  const getMeetingTypeLabel = (link: BookingLink): string => {
    if (link.isTeamBooking) return 'Group';
    return 'One-on-One';
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select and copy
      const textarea = document.createElement('textarea');
      textarea.value = bookingUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenBookingPage = () => {
    chrome.tabs.create({ url: bookingUrl });
  };

  const handleInsertInEmail = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'INSERT_BOOKING_LINK',
        payload: { url: bookingUrl, title: link.title },
      });
      window.close(); // Close popup after inserting
    }
  };

  return (
    <div className="booking-link-card">
      <div className="booking-link-header">
        <div
          className="booking-link-color"
          style={{ background: link.brandColor || '#4F46E5' }}
        />
        <div className="booking-link-info">
          <div className="booking-link-title">{link.title}</div>
          <div className="booking-link-meta">
            <span>{formatDuration(link.duration)}</span>
            <span>{getMeetingTypeLabel(link)}</span>
          </div>
        </div>
        <button className="btn-icon" onClick={handleOpenBookingPage} title="Open booking page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>

      <div className="booking-link-actions">
        {/* Share to email button */}
        <button className="btn-icon" onClick={handleInsertInEmail} title="Insert in email">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </button>
        {/* Share to active page button */}
        <button className="btn-icon" onClick={() => {
          chrome.runtime.sendMessage({
            type: 'OPEN_BOOKING_MODAL',
            payload: { slug: link.slug },
          });
          window.close();
        }} title="Open booking overlay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
        {/* Copy link */}
        <button
          className={`copy-link-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopyLink}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
