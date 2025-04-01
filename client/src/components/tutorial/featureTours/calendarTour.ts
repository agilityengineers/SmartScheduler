import { Step } from 'react-joyride';
import React from 'react';

const calendarTour: Step[] = [
  {
    target: 'body',
    content: React.createElement('div', {}, [
      React.createElement('h2', { className: 'text-lg font-bold mb-2', key: 'title' }, 'Calendar Management'),
      React.createElement('p', { key: 'description' }, 
        'The calendar is where you can view, create, and manage all your events and appointments. Let\'s explore how to use it effectively.'
      ),
    ]),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="calendar-view"]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Calendar View</h3>
        <p>
          This is your main calendar view. You can see all your scheduled events here, 
          and easily navigate between different time periods.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-calendar-header]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Calendar Controls</h3>
        <p>
          Use these controls to switch between day, week, and month views. 
          You can also navigate to different dates and customize the calendar display.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-timezone-selector]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Time Zone Settings</h3>
        <p>
          You can change the time zone to view your calendar in different locations. 
          Useful for coordinating with team members across time zones.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-event-slot]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Creating Events</h3>
        <p>
          Click on any time slot to create a new event. You can add details like title, 
          description, location, and invite participants.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-event-item]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Managing Events</h3>
        <p>
          Click on any event to view its details, make changes, or delete it. 
          You can also drag events to reschedule them.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Calendar Tour Complete!</h2>
        <p>
          Well done! You now know how to use the calendar effectively. 
          Try creating your first event to practice what you've learned.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
];

export default calendarTour;