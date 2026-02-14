import { Step } from 'react-joyride';
import React from 'react';

const dashboardTour: Step[] = [
  {
    target: 'body',
    content: React.createElement('div', {}, [
      React.createElement('h2', { className: 'text-lg font-bold mb-2', key: 'title' }, 'Welcome to your Dashboard!'),
      React.createElement('p', { key: 'description' }, 
        'The dashboard is your central hub for managing your schedule. Let\'s explore the key features together.'
      ),
    ]),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="dashboard-overview"]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Dashboard Overview</h3>
        <p>
          This is where you can see all your upcoming events, statistics, and quick actions. 
          The dashboard adapts to your role in the organization.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.sidebar, [data-sidebar]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Navigation</h3>
        <p>
          Use the sidebar to navigate to different sections of the app. You can access your calendar, 
          booking links, team management, and settings from here.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-create-event-button]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Create Events</h3>
        <p>
          You can quickly add new events to your calendar by clicking this button. 
          Try creating your first event now!
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.user-stats, [data-stats]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Your Activity</h3>
        <p>
          Keep track of your events, meetings, and bookings. You can see your activity statistics 
          and performance metrics in this section.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Dashboard Tour Complete!</h2>
        <p>
          Great job! You now understand how to use the dashboard effectively. 
          Continue exploring other features or start using the app.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
];

export default dashboardTour;