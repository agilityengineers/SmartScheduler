import { Step } from 'react-joyride';

const teamTour: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Team Management</h2>
        <p>
          The team section allows you to manage your team members, their roles,
          and team schedules. Let's learn how to effectively manage your team.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tutorial="team-management"]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Team Dashboard</h3>
        <p>
          This is your team dashboard, where you can get an overview of all team activities,
          members, and upcoming events in one place.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-team-stats]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Team Statistics</h3>
        <p>
          These cards show important metrics about your team, including the number of
          members, upcoming events, and team activity levels.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-team-members]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Team Members</h3>
        <p>
          View and manage all team members here. You can see their roles, contact information,
          and take actions like adding new members or modifying roles.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-add-member]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Adding Team Members</h3>
        <p>
          Click this button to add new members to your team. You can invite them by
          email or username and assign them specific roles.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-team-schedule]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Team Schedule</h3>
        <p>
          View and manage your team's collective schedule here. This helps you avoid
          scheduling conflicts and see everyone's availability at a glance.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-create-team-event]',
    content: (
      <div>
        <h3 className="text-md font-semibold mb-1">Team Events</h3>
        <p>
          Create events for the entire team using this button. Team events will appear
          on everyone's calendar automatically.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-lg font-bold mb-2">Team Tour Complete!</h2>
        <p>
          Excellent! You now know how to effectively manage your team.
          Coordinating schedules and maintaining team information is now much easier.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  }
];

export default teamTour;