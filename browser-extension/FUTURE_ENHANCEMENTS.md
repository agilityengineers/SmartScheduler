# SmartScheduler Browser Extension - Future Enhancements

Items listed here are intentionally out of scope for the initial release.
They represent potential future work to revisit after the MVP ships.

## Out of Scope (v1)

### Platform Support
- [ ] **Safari extension** - Requires a separate Apple-specific build using Xcode and the Safari Web Extensions API
- [ ] **Mobile browser support** - Chrome/Firefox extensions do not run on mobile browsers; would require a progressive web app (PWA) or native mobile approach
- [ ] **Desktop app / system tray widget** - A standalone Electron or Tauri app with system tray presence for quick scheduling access

### Advanced Features
- [ ] **Two-way calendar sync from extension** - Syncing calendar events directly from the extension popup (currently handled by the main web app)
- [ ] **Analytics dashboard for link clicks** - Tracking how many times each booking link was viewed, clicked, and converted within the extension
- [ ] **Offline mode** - Caching booking links and availability data for offline viewing with background sync when reconnected
- [ ] **Multi-account support** - Switching between multiple SmartScheduler accounts within the extension
- [ ] **Keyboard shortcuts / command palette** - Quick-access keyboard shortcuts (e.g., Ctrl+Shift+S to open scheduling overlay)

### Email/App Integrations (Phase 3+)
- [ ] **LinkedIn integration** - Inject scheduling buttons into LinkedIn messaging and connection requests
- [ ] **Slack web integration** - Add scheduling buttons within the Slack web interface
- [ ] **Microsoft Teams web integration** - Scheduling integration within Teams web client
- [ ] **CRM integrations** - Detect contacts in Salesforce, HubSpot, etc. and offer scheduling links

### Personalization
- [ ] **Custom themes** - Allow users to customize the extension popup appearance beyond brand colors
- [ ] **Pinned/favorite booking links** - Pin frequently used booking links to the top of the list
- [ ] **Quick-create one-off meetings** - Create a one-time booking link directly from the extension without opening the main app

### Notifications
- [ ] **Real-time booking notifications** - Push notifications in the browser when someone books a meeting
- [ ] **Upcoming meeting reminders** - Badge count and alerts for meetings starting soon
- [ ] **Daily schedule preview** - Morning notification showing today's scheduled meetings

### Enterprise
- [ ] **Managed deployment (Chrome Enterprise)** - Group policy / MDM deployment for organizations
- [ ] **SSO integration** - Support SAML/OIDC login directly from the extension
- [ ] **Admin-enforced booking link templates** - Company admins push pre-configured booking links to team members' extensions
