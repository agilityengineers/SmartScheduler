// Content script for Gmail and Outlook web email integration
// Injects "SmartScheduler" button into compose windows and handles booking link insertion

import type { ExtensionMessage } from '../shared/types';

const SMARTSCHEDULER_BUTTON_CLASS = 'smartscheduler-insert-btn';
const PRODUCTION_BASE_URL = 'https://smart-scheduler.ai';

async function getBaseUrl(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get('baseUrl');
    if (stored.baseUrl && typeof stored.baseUrl === 'string') {
      return stored.baseUrl.replace(/\/$/, '');
    }
  } catch {
    // storage unavailable
  }
  return PRODUCTION_BASE_URL;
}

// ---- Gmail Integration ----

function injectGmailButton(composeToolbar: Element) {
  // Avoid duplicate buttons
  if (composeToolbar.querySelector(`.${SMARTSCHEDULER_BUTTON_CLASS}`)) return;

  const btn = document.createElement('div');
  btn.className = SMARTSCHEDULER_BUTTON_CLASS;
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('title', 'Insert SmartScheduler link');
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="12" y1="14" x2="12" y2="18"/>
      <line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  `;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLinkPicker(btn);
  });

  // Insert before the last toolbar items (typically the trash/discard area)
  const toolbarItems = composeToolbar.querySelectorAll('[role="button"], [data-tooltip]');
  if (toolbarItems.length > 2) {
    composeToolbar.insertBefore(btn, toolbarItems[toolbarItems.length - 2]);
  } else {
    composeToolbar.appendChild(btn);
  }
}

// ---- Outlook Web Integration ----

function injectOutlookButton(composeToolbar: Element) {
  if (composeToolbar.querySelector(`.${SMARTSCHEDULER_BUTTON_CLASS}`)) return;

  const btn = document.createElement('button');
  btn.className = SMARTSCHEDULER_BUTTON_CLASS;
  btn.type = 'button';
  btn.setAttribute('title', 'Insert SmartScheduler link');
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="12" y1="14" x2="12" y2="18"/>
      <line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  `;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLinkPicker(btn);
  });

  composeToolbar.appendChild(btn);
}

// ---- Link Picker Dropdown ----

let activeDropdown: HTMLElement | null = null;

function showLinkPicker(anchorEl: Element) {
  // Close existing dropdown
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'smartscheduler-dropdown';
  dropdown.innerHTML = `
    <div class="smartscheduler-dropdown-header">
      <strong>Insert Scheduling Link</strong>
    </div>
    <div class="smartscheduler-dropdown-loading">Loading booking links...</div>
  `;

  // Position relative to button
  const rect = anchorEl.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.zIndex = '10000';

  document.body.appendChild(dropdown);
  activeDropdown = dropdown;

  // Fetch booking links from background
  chrome.runtime.sendMessage({ type: 'GET_BOOKING_LINKS' }, (response) => {
    const result = response as { links: Array<{ id: number; title: string; slug: string; duration: number }>; error?: string };
    const loadingEl = dropdown.querySelector('.smartscheduler-dropdown-loading');
    if (loadingEl) loadingEl.remove();

    if (result.error || !result.links?.length) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'smartscheduler-dropdown-empty';
      emptyEl.textContent = result.error || 'No booking links found. Create one in SmartScheduler.';
      dropdown.appendChild(emptyEl);
      return;
    }

    const list = document.createElement('div');
    list.className = 'smartscheduler-dropdown-list';

    for (const link of result.links) {
      const item = document.createElement('button');
      item.className = 'smartscheduler-dropdown-item';
      item.innerHTML = `
        <span class="smartscheduler-dropdown-item-title">${escapeHtml(link.title)}</span>
        <span class="smartscheduler-dropdown-item-meta">${link.duration} min</span>
      `;
      item.addEventListener('click', () => {
        insertLinkIntoCompose(link.title, link.slug);
        dropdown.remove();
        activeDropdown = null;
      });
      list.appendChild(item);
    }

    dropdown.appendChild(list);
  });

  // Close on outside click
  const closeHandler = (e: MouseEvent) => {
    if (!dropdown.contains(e.target as Node) && e.target !== anchorEl) {
      dropdown.remove();
      activeDropdown = null;
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

// ---- Insert Link into Compose Body ----

async function insertLinkIntoCompose(title: string, slug: string) {
  const baseUrl = await getBaseUrl();
  const bookingUrl = `${baseUrl}/booking/${slug}`;

  // Try to find the active compose body (contenteditable div)
  const composeBody = document.querySelector<HTMLElement>(
    // Gmail
    'div[role="textbox"][aria-label*="Message Body"], ' +
    'div[role="textbox"][aria-label*="body"], ' +
    'div.editable[contenteditable="true"], ' +
    // Outlook
    'div[role="textbox"][aria-label*="Message body"], ' +
    'div[contenteditable="true"][aria-label*="body"]'
  );

  if (composeBody) {
    // Insert formatted link at cursor or end of body
    const linkHtml = `<p><a href="${bookingUrl}" target="_blank">${escapeHtml(title)} - Book a time with me</a></p>`;

    // Try to insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && composeBody.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const temp = document.createElement('div');
      temp.innerHTML = linkHtml;
      const frag = document.createDocumentFragment();
      while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
      }
      range.insertNode(frag);
    } else {
      // Append to end
      composeBody.insertAdjacentHTML('beforeend', linkHtml);
    }

    // Trigger input event so Gmail/Outlook detect the change
    composeBody.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Booking Modal Overlay ----

async function openBookingModal(slug: string) {
  // Remove existing modal
  const existing = document.getElementById('smartscheduler-modal-overlay');
  if (existing) existing.remove();

  const baseUrl = await getBaseUrl();
  const bookingUrl = `${baseUrl}/booking/${slug}`;

  const overlay = document.createElement('div');
  overlay.id = 'smartscheduler-modal-overlay';
  overlay.innerHTML = `
    <div class="smartscheduler-modal-backdrop"></div>
    <div class="smartscheduler-modal-container">
      <div class="smartscheduler-modal-header">
        <span>SmartScheduler</span>
        <button class="smartscheduler-modal-close" title="Close">&times;</button>
      </div>
      <iframe
        src="${bookingUrl}"
        class="smartscheduler-modal-iframe"
        allow="clipboard-write"
      ></iframe>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.querySelector('.smartscheduler-modal-backdrop')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.smartscheduler-modal-close')?.addEventListener('click', () => overlay.remove());
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

// ---- Listen for messages from popup/background ----

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'INSERT_BOOKING_LINK') {
    const payload = (message as { type: 'INSERT_BOOKING_LINK'; payload: { url: string; title: string } }).payload;
    const composeBody = document.querySelector<HTMLElement>(
      'div[role="textbox"][contenteditable="true"], div.editable[contenteditable="true"]'
    );
    if (composeBody) {
      const linkHtml = `<p><a href="${payload.url}" target="_blank">${escapeHtml(payload.title)} - Book a time with me</a></p>`;
      composeBody.insertAdjacentHTML('beforeend', linkHtml);
      composeBody.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  if (message.type === 'OPEN_BOOKING_MODAL') {
    const payload = (message as { type: 'OPEN_BOOKING_MODAL'; payload: { slug: string } }).payload;
    openBookingModal(payload.slug);
  }
});

// ---- MutationObserver to detect new compose windows ----

function observeComposeWindows() {
  const isGmail = window.location.hostname === 'mail.google.com';
  const isOutlook = window.location.hostname.includes('outlook');

  const observer = new MutationObserver(() => {
    if (isGmail) {
      // Gmail compose toolbar: look for the bottom toolbar in compose windows
      const toolbars = document.querySelectorAll('tr.btC td.gU');
      toolbars.forEach((toolbar) => injectGmailButton(toolbar));
    }

    if (isOutlook) {
      // Outlook compose toolbar
      const toolbars = document.querySelectorAll('[role="toolbar"]');
      toolbars.forEach((toolbar) => {
        // Only inject in compose toolbars, not navigation toolbars
        const label = toolbar.getAttribute('aria-label') || '';
        if (label.toLowerCase().includes('format') || label.toLowerCase().includes('compose')) {
          injectOutlookButton(toolbar);
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Start observing when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeComposeWindows);
} else {
  observeComposeWindows();
}
