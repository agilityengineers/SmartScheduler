// Content script for Gmail and Outlook web email integration
// Injects a SmartScheduler button into compose windows and handles booking link insertion

import type { ExtensionMessage } from '../shared/types';

// ============================================================
// SELECTOR CONFIGURATION
// All DOM selectors are centralized here. When Gmail or Outlook
// updates their UI, update only this object — nothing else changes.
// Selectors within each array are ordered from most stable (ARIA /
// semantic attributes) to least stable (obfuscated class names).
// The first selector that matches any element in the live DOM wins.
// ============================================================

const SELECTORS = {
  gmail: {
    // The bottom formatting / action toolbar inside a compose window.
    // ARIA-based selectors are tried first; class-based ones are fallbacks.
    composeToolbar: [
      // Semantic: toolbar inside a compose <form>
      'form[enctype="multipart/form-data"] [role="toolbar"]',
      // Semantic: toolbar inside a compose dialog
      '[role="dialog"] [role="toolbar"]',
      // Class-based fallbacks (may change on Gmail UI updates)
      'td.gU.Up',
      'tr.btC td.gU',
    ],
    // The rich-text body of a compose window.
    composeBody: [
      // ARIA labels — most stable across Gmail redesigns
      'div[role="textbox"][aria-label*="Message Body"]',
      'div[role="textbox"][aria-label*="message body"]',
      'div[role="textbox"][aria-label*="body"]',
      // Gmail-specific editable attribute
      'div[contenteditable="true"][g_editable="true"]',
      // Class-based fallback
      'div.Am.Al.editable[contenteditable="true"]',
      'div.editable[contenteditable="true"]',
    ],
  },

  outlook: {
    // The formatting toolbar inside a compose window.
    // We match on aria-label to distinguish compose toolbars from nav toolbars.
    composeToolbar: [
      '[role="toolbar"][aria-label*="Formatting"]',
      '[role="toolbar"][aria-label*="formatting"]',
      '[role="toolbar"][aria-label*="Compose"]',
      '[role="toolbar"][aria-label*="compose"]',
      '[role="toolbar"][aria-label*="message"]',
      '[role="toolbar"][aria-label*="Message"]',
    ],
    // The rich-text body of an Outlook compose window.
    composeBody: [
      'div[role="textbox"][aria-label*="Message body"]',
      'div[role="textbox"][aria-label*="message body"]',
      'div[contenteditable="true"][aria-label*="Message body"]',
      'div[contenteditable="true"][aria-label*="body"]',
      // Outlook Web App class-based fallback
      'div[contenteditable="true"].ms-rtestate-field',
    ],
  },
} as const;

// ============================================================
// SELECTOR HELPERS
// ============================================================

const SMARTSCHEDULER_BUTTON_CLASS = 'smartscheduler-insert-btn';
const PRODUCTION_BASE_URL = 'https://smart-scheduler.ai';

/**
 * Try each selector in order and return all matching elements from
 * the first selector that yields at least one result.
 */
function queryAll(selectors: readonly string[], root: Document | Element = document): Element[] {
  for (const selector of selectors) {
    try {
      const results = Array.from(root.querySelectorAll(selector));
      if (results.length > 0) return results;
    } catch {
      // Invalid selector — skip silently
    }
  }
  return [];
}

/**
 * Try each selector in order and return the first single matching element.
 */
function queryFirst(selectors: readonly string[], root: Document | Element = document): Element | null {
  for (const selector of selectors) {
    try {
      const el = root.querySelector(selector);
      if (el) return el;
    } catch {
      // Invalid selector — skip silently
    }
  }
  return null;
}

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

// ============================================================
// BUTTON CREATION
// ============================================================

function createButton(tag: 'div' | 'button'): HTMLElement {
  const btn = document.createElement(tag);
  btn.className = SMARTSCHEDULER_BUTTON_CLASS;
  if (tag === 'button') (btn as HTMLButtonElement).type = 'button';
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('title', 'Insert SmartScheduler booking link');
  btn.setAttribute('aria-label', 'Insert SmartScheduler booking link');
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="12" y1="14" x2="12" y2="18"/>
      <line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  `;
  return btn;
}

// ============================================================
// GMAIL INJECTION
// ============================================================

function injectGmailButton(composeToolbar: Element) {
  if (composeToolbar.querySelector(`.${SMARTSCHEDULER_BUTTON_CLASS}`)) return;

  const btn = createButton('div');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLinkPicker(btn);
  });

  // Insert near the end of the toolbar, before the discard / overflow buttons
  const toolbarItems = composeToolbar.querySelectorAll('[role="button"], [data-tooltip]');
  if (toolbarItems.length > 2) {
    composeToolbar.insertBefore(btn, toolbarItems[toolbarItems.length - 2]);
  } else {
    composeToolbar.appendChild(btn);
  }
}

// ============================================================
// OUTLOOK INJECTION
// ============================================================

function injectOutlookButton(composeToolbar: Element) {
  if (composeToolbar.querySelector(`.${SMARTSCHEDULER_BUTTON_CLASS}`)) return;

  const btn = createButton('button');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLinkPicker(btn);
  });

  composeToolbar.appendChild(btn);
}

// ============================================================
// LINK PICKER DROPDOWN
// ============================================================

let activeDropdown: HTMLElement | null = null;

function showLinkPicker(anchorEl: Element) {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'smartscheduler-dropdown';
  dropdown.setAttribute('role', 'menu');
  dropdown.innerHTML = `
    <div class="smartscheduler-dropdown-header">
      <strong>Insert Scheduling Link</strong>
    </div>
    <div class="smartscheduler-dropdown-loading">Loading booking links...</div>
  `;

  const rect = anchorEl.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.zIndex = '10000';

  document.body.appendChild(dropdown);
  activeDropdown = dropdown;

  chrome.runtime.sendMessage({ type: 'GET_BOOKING_LINKS' }, (response) => {
    const result = response as {
      links: Array<{ id: number; title: string; slug: string; duration: number }>;
      error?: string;
    };
    const loadingEl = dropdown.querySelector('.smartscheduler-dropdown-loading');
    if (loadingEl) loadingEl.remove();

    if (result.error || !result.links?.length) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'smartscheduler-dropdown-empty';
      emptyEl.textContent =
        result.error || 'No booking links found. Create one in SmartScheduler.';
      dropdown.appendChild(emptyEl);
      return;
    }

    const list = document.createElement('div');
    list.className = 'smartscheduler-dropdown-list';

    for (const link of result.links) {
      const item = document.createElement('button');
      item.className = 'smartscheduler-dropdown-item';
      item.setAttribute('role', 'menuitem');
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

  const closeHandler = (e: MouseEvent) => {
    if (!dropdown.contains(e.target as Node) && e.target !== anchorEl) {
      dropdown.remove();
      activeDropdown = null;
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

// ============================================================
// INSERT LINK INTO COMPOSE BODY
// ============================================================

async function insertLinkIntoCompose(title: string, slug: string) {
  const baseUrl = await getBaseUrl();
  const bookingUrl = `${baseUrl}/booking/${slug}`;

  const isGmail = window.location.hostname === 'mail.google.com';
  const bodySelectors = isGmail
    ? SELECTORS.gmail.composeBody
    : SELECTORS.outlook.composeBody;

  const composeBody = queryFirst(bodySelectors) as HTMLElement | null;

  if (!composeBody) {
    console.warn(
      '[SmartScheduler] Could not find compose body to insert link into. ' +
      'The email client UI may have changed. Tried selectors:',
      bodySelectors,
    );
    return;
  }

  const linkHtml = `<p><a href="${bookingUrl}" target="_blank">${escapeHtml(title)} - Book a time with me</a></p>`;

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && composeBody.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const temp = document.createElement('div');
    temp.innerHTML = linkHtml;
    const frag = document.createDocumentFragment();
    while (temp.firstChild) frag.appendChild(temp.firstChild);
    range.insertNode(frag);
  } else {
    composeBody.insertAdjacentHTML('beforeend', linkHtml);
  }

  composeBody.dispatchEvent(new Event('input', { bubbles: true }));
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// BOOKING MODAL OVERLAY
// ============================================================

async function openBookingModal(slug: string) {
  const existing = document.getElementById('smartscheduler-modal-overlay');
  if (existing) existing.remove();

  const baseUrl = await getBaseUrl();
  const bookingUrl = `${baseUrl}/booking/${slug}`;

  const overlay = document.createElement('div');
  overlay.id = 'smartscheduler-modal-overlay';
  overlay.innerHTML = `
    <div class="smartscheduler-modal-backdrop"></div>
    <div class="smartscheduler-modal-container" role="dialog" aria-label="SmartScheduler booking">
      <div class="smartscheduler-modal-header">
        <span>SmartScheduler</span>
        <button class="smartscheduler-modal-close" title="Close" aria-label="Close booking modal">&times;</button>
      </div>
      <iframe
        src="${bookingUrl}"
        class="smartscheduler-modal-iframe"
        allow="clipboard-write"
        title="SmartScheduler booking page"
      ></iframe>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.smartscheduler-modal-backdrop')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.smartscheduler-modal-close')?.addEventListener('click', () => overlay.remove());
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

// ============================================================
// MESSAGE LISTENER (from popup / background)
// ============================================================

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'INSERT_BOOKING_LINK') {
    const payload = (message as {
      type: 'INSERT_BOOKING_LINK';
      payload: { url: string; title: string };
    }).payload;

    const isGmail = window.location.hostname === 'mail.google.com';
    const bodySelectors = isGmail
      ? SELECTORS.gmail.composeBody
      : SELECTORS.outlook.composeBody;
    const composeBody = queryFirst(bodySelectors) as HTMLElement | null;

    if (composeBody) {
      const linkHtml = `<p><a href="${payload.url}" target="_blank">${escapeHtml(payload.title)} - Book a time with me</a></p>`;
      composeBody.insertAdjacentHTML('beforeend', linkHtml);
      composeBody.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      console.warn(
        '[SmartScheduler] Could not find compose body via INSERT_BOOKING_LINK message. ' +
        'The email client UI may have changed. Tried selectors:',
        bodySelectors,
      );
    }
  }

  if (message.type === 'OPEN_BOOKING_MODAL') {
    const payload = (message as {
      type: 'OPEN_BOOKING_MODAL';
      payload: { slug: string };
    }).payload;
    openBookingModal(payload.slug);
  }
});

// ============================================================
// MUTATION OBSERVER — detects new compose windows
// ============================================================

function observeComposeWindows() {
  const isGmail = window.location.hostname === 'mail.google.com';
  const isOutlook = window.location.hostname.includes('outlook');

  let injectionAttempts = 0;

  const observer = new MutationObserver(() => {
    if (isGmail) {
      const toolbars = queryAll(SELECTORS.gmail.composeToolbar);

      if (toolbars.length === 0 && injectionAttempts === 0) {
        // No compose window open yet — this is normal. No warning needed.
      } else if (toolbars.length === 0 && injectionAttempts > 0) {
        // A compose was previously detected but now nothing matches.
        // This may mean Gmail updated their UI.
        console.warn(
          '[SmartScheduler] Gmail compose toolbar selector no longer matches. ' +
          'The Gmail UI may have changed. Tried selectors:',
          SELECTORS.gmail.composeToolbar,
        );
      }

      toolbars.forEach((toolbar) => {
        injectionAttempts++;
        injectGmailButton(toolbar);
      });
    }

    if (isOutlook) {
      // Try ARIA-labeled compose toolbars first (from SELECTORS config).
      // Fall back to any [role="toolbar"] with a compose-related label.
      const toolbars = queryAll(SELECTORS.outlook.composeToolbar);

      if (toolbars.length === 0) {
        // Generic fallback: any toolbar whose label suggests it's for composing
        const allToolbars = Array.from(document.querySelectorAll('[role="toolbar"]'));
        const composeToolbars = allToolbars.filter((el) => {
          const label = (el.getAttribute('aria-label') || '').toLowerCase();
          return (
            label.includes('format') ||
            label.includes('compose') ||
            label.includes('message')
          );
        });

        if (composeToolbars.length === 0 && injectionAttempts > 0) {
          console.warn(
            '[SmartScheduler] Outlook compose toolbar selector no longer matches. ' +
            'The Outlook UI may have changed. Tried selectors:',
            SELECTORS.outlook.composeToolbar,
          );
        }

        composeToolbars.forEach((toolbar) => {
          injectionAttempts++;
          injectOutlookButton(toolbar);
        });
      } else {
        toolbars.forEach((toolbar) => {
          injectionAttempts++;
          injectOutlookButton(toolbar);
        });
      }
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
