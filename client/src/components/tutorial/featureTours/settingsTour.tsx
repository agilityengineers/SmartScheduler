import { Step } from 'react-joyride';

const settingsTour: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Settings & Preferences</h2>
        <p>
          The settings section allows you to customize your app experience and
          manage integrations. Let's explore what you can configure.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-settings-tabs]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Settings Categories</h3>
        <p>
          Navigate between different settings categories using these tabs.
          Each section contains related configuration options.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-account-settings]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Account Settings</h3>
        <p>
          Manage your account details, password, and authentication preferences here.
          You can also change your email address or delete your account if needed.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-notifications]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Notification Preferences</h3>
        <p>
          Control how and when you receive notifications. You can enable or disable
          email notifications, reminders, and in-app alerts for different events.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-integrations-section]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Calendar Integrations</h3>
        <p>
          Connect SmartScheduler with your existing calendar services like Google Calendar,
          Outlook, or Apple Calendar to sync your events automatically.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-connect-calendar]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Connect Calendars</h3>
        <p>
          Use these buttons to establish connections with your external calendar services.
          This ensures all your events stay in sync across all platforms.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-appearance]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Appearance Settings</h3>
        <p>
          Customize the look and feel of the application. You can switch between
          light and dark modes or adjust the color theme to your preference.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-privacy]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Privacy Settings</h3>
        <p>
          Control who can see your availability, events, and personal information.
          Set your default privacy levels and visibility preferences here.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Settings Tour Complete!</h2>
        <p>
          Well done! You now understand how to customize the application to match your
          preferences and workflow. Take some time to configure your settings for the best experience.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
];

export default settingsTour;