import { useMemo } from 'react';
import { Step } from 'react-joyride';

// Extended Step interface to support navigation
interface TutorialStep extends Step {
  navTo?: string;
}

export const useTutorialSteps = () => {
  // Dashboard steps
  const getDashboardSteps = useMemo(() => (): TutorialStep[] => [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-lg font-bold mb-2">Welcome to SmartScheduler!</h2>
          <p>
            Let's take a quick tour to help you get started with our platform.
            You can skip this tutorial at any time and access it again from your profile settings.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="dashboard-overview"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Dashboard Overview</h3>
          <p>
            This is your dashboard, where you can see your upcoming events, 
            calendar integrations, and quick access to important features.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="calendar-section"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Calendar View</h3>
          <p>
            Here you can view your calendar events, schedule new meetings, 
            and manage your appointments.
          </p>
        </div>
      ),
      placement: 'bottom',
      navTo: '/calendar',
    }
  ], []);

  // Calendar steps
  const getCalendarSteps = useMemo(() => (): TutorialStep[] => [
    {
      target: '[data-tutorial="calendar-view"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Calendar Management</h3>
          <p>
            This is your calendar view. You can view events by day, week, or month.
            Click on any time slot to create a new event.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="calendar-integration"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Calendar Integrations</h3>
          <p>
            Connect your Google, Outlook, or other calendar services here.
            SmartScheduler will sync events automatically once connected.
          </p>
        </div>
      ),
      placement: 'right',
      navTo: '/integrations',
    },
    {
      target: '[data-tutorial="booking-links"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Booking Links</h3>
          <p>
            Create shareable booking links to allow others to schedule meetings with you
            based on your availability.
          </p>
        </div>
      ),
      placement: 'bottom',
      navTo: '/booking',
    }
  ], []);

  // Profile steps
  const getProfileSteps = useMemo(() => (): TutorialStep[] => [
    {
      target: '[data-tutorial="profile-section"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Your Profile</h3>
          <p>
            Here you can update your personal information, change your password,
            and manage notification preferences.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tutorial="timezone-selection"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Time Zone Settings</h3>
          <p>
            Make sure your time zone is set correctly to ensure all events
            display in your local time.
          </p>
        </div>
      ),
      placement: 'bottom',
    }
  ], []);

  // Team steps (for company admins and team managers)
  const getTeamSteps = useMemo(() => (): TutorialStep[] => [
    {
      target: '[data-tutorial="team-management"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Team Management</h3>
          <p>
            As a team manager or company admin, you can manage team members,
            assign roles, and oversee team calendars.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="team-calendar"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Team Calendar</h3>
          <p>
            View and manage your team's schedule. You can see everyone's availability
            and schedule team meetings accordingly.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tutorial="invite-members"]',
      content: (
        <div>
          <h3 className="text-md font-semibold mb-1">Invite Team Members</h3>
          <p>
            Easily invite new members to join your team by sending them an invitation
            email with signup instructions.
          </p>
        </div>
      ),
      placement: 'left',
    }
  ], []);

  return {
    getDashboardSteps,
    getCalendarSteps,
    getProfileSteps,
    getTeamSteps,
  };
};