# SmartScheduler vs Cal.com - Feature Comparison & Gap Analysis

**Date:** March 2026
**Purpose:** Competitive gap analysis to prioritize feature development

---

## Legend

| Symbol | Meaning |
|--------|---------|
| SS | SmartScheduler has this |
| CAL | Cal.com has this |
| GAP | Cal.com has it, SmartScheduler doesn't |
| ADVANTAGE | SmartScheduler has it, Cal.com doesn't |

---

## 1. Core Scheduling / Booking Features

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| One-on-one meetings | Y | Y | Parity |
| Custom event durations | Y | Y | Parity |
| Minimum scheduling notice (lead time) | Y | Y | Parity |
| Buffer times (before/after) | Y | Y | Parity |
| Per-day booking limits | Y | Y | Parity |
| Per-week/month booking limits | Y | Y | Parity |
| Start time increments | Y | Y | Parity |
| Hidden/secret events | Y | Y | Parity |
| One-off booking links | Y | Y | Parity |
| Custom booking questions | Y | Y | Parity |
| Custom confirmation messages | Y | Y | Parity |
| Post-booking redirect URL | Y | Y | Parity |
| Recurring bookings (RRULE) | Y | Y | Parity |
| **Requires confirmation / opt-in bookings** | N | Y | **GAP - Tier 1** |
| **Seats / group bookings (booker-facing)** | N | Y | **GAP - Tier 1** |
| **Dynamic group links (username "+" combos)** | N | Y | GAP - Tier 3 |
| **Booker calendar overlay** | N | Y | GAP - Tier 3 |
| **Phone-based bookings** | N | Y | GAP - Tier 4 |
| **Disable guests option** | N | Y | GAP - Tier 4 |
| **Private single-use booking links** | N | Y | GAP - Tier 4 |
| Meeting polls (Doodle-style) | Y | N | **ADVANTAGE** |
| QR code generation | Y | N | **ADVANTAGE** |
| Contact management with booking stats | Y | N | **ADVANTAGE** |

## 2. Team Scheduling

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Team booking links | Y | Y | Parity |
| Round-robin assignment | Y | Y | Parity |
| Weighted round-robin | Y | Y | Parity |
| Collective bookings (all must attend) | Y | Y | Parity |
| Hybrid collective + rotating | Y | Y | Parity |
| Managed event templates | Y | Y | Parity |
| Locked fields on templates | Y | Y | Parity |
| Team directory pages | Y | Y | Parity |
| **Round-robin groups (multiple pools per event)** | N | Y | GAP - Tier 3 |

## 3. Calendar Integrations

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Google Calendar | Y | Y | Parity |
| Outlook Calendar | Y | Y | Parity |
| iCalendar (ICS) | Y | Y | Parity |
| iCloud Calendar | Y | Y | Parity |
| Conflict detection across calendars | Y | Y | Parity |
| Multiple availability schedules | Y | Y | Parity |
| Per-day hour blocks | Y | Y | Parity |
| **CalDAV (generic, full read/write)** | N | Y | GAP - Tier 3 |
| **Lark Calendar** | N | Y | GAP - Tier 4 |
| **Zoho Calendar** | N | Y | GAP - Tier 4 |

## 4. Video Conferencing

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Zoom integration | Y | Y | Parity |
| Google Meet auto-creation | Y | Y | Parity |
| **Microsoft Teams** | N | Y | **GAP - Tier 1** |
| **Built-in video (Cal Video / Daily.co)** | N | Y | GAP - Tier 3 |
| **Recording & auto-transcription** | N | Y | GAP - Tier 3 |
| **Discord / Telegram / WhatsApp** | N | Y | GAP - Tier 4 |

## 5. Workflows / Automation

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Booking created trigger | Y | Y | Parity |
| Booking canceled trigger | Y | Y | Parity |
| Before event reminder trigger | Y | Y | Parity |
| No-show trigger | Y | Y | Parity |
| Send email action | Y | Y | Parity |
| Webhook action | Y | Y | Parity |
| Send SMS action | Y | Y | Parity |
| Slack notification action | Y | Y | Parity |
| Multi-step workflows | Y | Y | Parity |
| Workflow templates | Y | Y | Parity |
| Workflow analytics | Y | Y | Parity |
| **WhatsApp message action** | N | Y | GAP - Tier 4 |
| **AI voice call action** | N | Y | GAP - Tier 3 |
| Workflow versioning | Y | N | **ADVANTAGE** |
| Conditional branching | Y | N | **ADVANTAGE** |
| Managed workflow templates (push to teams) | Y | N | **ADVANTAGE** |

## 6. Payment Integrations

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Stripe payments | Y | Y | Parity |
| Per-event pricing | Y | Y | Parity |
| **PayPal** | N | Y | GAP - Tier 4 |
| **Apple Pay / Google Pay (via Stripe)** | N | Y | GAP - Tier 3 |

## 7. Embedding / Widgets

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Iframe embed | Y | Y | Parity |
| QR code embed | Y | N | **ADVANTAGE** |
| **Inline embed (non-iframe)** | N | Y | **GAP - Tier 1** |
| **Floating pop-up button** | N | Y | **GAP - Tier 1** |
| **Pop-up via element click** | N | Y | **GAP - Tier 1** |
| **WordPress plugin** | N | Y | GAP - Tier 3 |
| **Cal Atoms (React component library)** | N | Y | GAP - Tier 3 |

## 8. Analytics / Reporting

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Booking overview dashboard | Y | Y | Parity |
| Bookings over time chart | Y | Y | Parity |
| Popular booking times | Y | Y | Parity |
| Team leaderboards | Y | Y | Parity |
| Status breakdown | Y | Y | Parity |
| Workflow analytics | Y | Y | Parity |
| **Google Analytics integration** | N | Y | GAP - Tier 3 |
| **Google Tag Manager** | N | Y | GAP - Tier 3 |
| Custom question response analytics | Y | N | **ADVANTAGE** |

## 9. Admin / Organization

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Multi-tenant (org/company/team) | Y | Y | Parity |
| Role-based access control (4 roles) | Y | Y | Parity |
| User management | Y | Y | Parity |
| SCIM 2.0 provisioning | Y | Y | Parity |
| Audit logging | Y | Y | Parity |
| Data retention policies | Y | N | **ADVANTAGE** |
| Email template versioning | Y | N | **ADVANTAGE** |
| Domain controls | Y | Y | Parity |
| **SAML SSO** | N | Y | **GAP - Tier 1** |
| **Directory sync (Google Workspace, AD)** | N | Y | GAP - Tier 2 |
| **Custom subdomain** | N | Y | GAP - Tier 2 |

## 10. Branding / Customization

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Brand color per booking link | Y | Y | Parity |
| Remove platform branding | Y | Y | Parity |
| Custom logo | Y | Y | Parity |
| **Full white-label** | N | Y | GAP - Tier 2 |
| **Dark mode** | N | Y | GAP - Tier 4 |

## 11. Compliance / Security

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Session-based auth | Y | Y | Parity |
| Rate limiting | Y | Y | Parity |
| Webhook signature verification | Y | Y | Parity |
| SCIM provisioning | Y | Y | Parity |
| Data retention policies | Y | N | **ADVANTAGE** |
| **SOC 2 Type II** | N | Y | GAP - Tier 2 |
| **HIPAA compliance (BAA)** | N | Y | GAP - Tier 2 |
| **ISO 27001** | N | Y | GAP - Tier 2 |
| **Data residency options** | N | Y | GAP - Tier 2 |

## 12. Platform / Developer

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| REST API | Y | Y | Parity |
| Webhooks | Y | Y | Parity |
| Zapier integration | Y | Y | Parity |
| **API v2 with OAuth 2.0** | N | Y | GAP - Tier 2 |
| **Cal Atoms (React SDK)** | N | Y | GAP - Tier 3 |
| **Open source self-hosting** | N | Y | GAP - Tier 3 |

## 13. Mobile / Desktop

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| **iOS app** | N | Y | **GAP - Tier 1** |
| **Android app** | N | Y | **GAP - Tier 1** |
| **Desktop app** | N | Y | GAP - Tier 3 |
| **Browser extensions** | N | Y | GAP - Tier 3 |

## 14. AI Features

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| **AI voice agent for scheduling** | N | Y | GAP - Tier 3 |
| **AI call transcripts** | N | Y | GAP - Tier 3 |
| **AI sentiment analysis** | N | Y | GAP - Tier 3 |

## 15. Additional Integrations

| Feature | SS | CAL | Status |
|---------|----|----|--------|
| Slack | Y | Y | Parity |
| Zoom | Y | Y | Parity |
| Zapier | Y | Y | Parity |
| **Salesforce CRM** | N | Y | **GAP - Tier 2** |
| **HubSpot CRM** | N | Y | **GAP - Tier 2** |
| **Make / Integromat** | N | Y | GAP - Tier 3 |
| **100+ app marketplace** | N | Y | GAP - long term |

---

## Priority Implementation Roadmap

### Tier 1 - Competitive Essentials (Immediate)
1. Requires confirmation / opt-in bookings
2. Seats / group bookings (booker-facing, max attendees per slot)
3. SAML SSO
4. Microsoft Teams video integration
5. Embed SDK (inline, floating popup, click-triggered popup)
6. Mobile apps (iOS / Android) - long lead time, start planning

### Tier 2 - Enterprise Credibility
7. Salesforce CRM integration
8. HubSpot CRM integration
9. SOC 2 / HIPAA documentation & processes
10. Directory sync (AD, Google Workspace)
11. Custom booking domains / subdomains
12. Data residency options
13. OAuth 2.0 API authentication

### Tier 3 - Competitive Differentiation
14. AI scheduling assistant (voice/chat)
15. Built-in video with transcription
16. Cal Atoms-style React component library
17. Booker calendar overlay
18. Dynamic duration selection
19. App marketplace / ecosystem
20. Google Analytics / GTM integration

### Tier 4 - Polish
21. Dark mode
22. PayPal payments
23. WhatsApp notifications
24. Out-of-office with redirect
25. Phone-based bookings

---

## SmartScheduler Unique Advantages (Defend & Promote)

These features exist in SmartScheduler but NOT in Cal.com:
- **Meeting polls** (Doodle-style time selection)
- **QR code generation** for booking links and routing forms
- **Contact management** with booking history and stats
- **Email template versioning** with rollback
- **Data retention policies** (configurable auto-cleanup)
- **Granular RBAC** (4 distinct roles vs Cal's simpler model)
- **Managed workflow templates** with push distribution
- **Workflow conditional branching**
- **Workflow versioning**
- **Built-in diagnostics** (SendGrid, DB connectivity, env var checks)
- **Custom question response analytics**

---

## Cal.com Pricing Context

| Plan | Price | Notes |
|------|-------|-------|
| Free | $0 | Unlimited events, calendars, bookings |
| Teams | $15/user/mo | Round-robin, managed events, remove branding |
| Organizations | $37/user/mo | SSO, SCIM, SOC 2, HIPAA, routing suite |
| Enterprise | Custom | 24/7 support, dedicated DB, data residency |
| Platform | From $299/mo | API-first, Cal Atoms, per-booking pricing |

SmartScheduler pricing: Free, Individual ($9.99/mo), Team ($30/mo + $8/user), Organization ($99/mo + $8/user)
