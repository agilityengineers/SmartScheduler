import React from 'react';
import Joyride, { Step } from 'react-joyride';
import { useTutorial } from '@/contexts/TutorialContext';
import FeatureTour from './FeatureTour';

interface TourManagerProps {
  activeTour: string | null;
}

interface TourSteps {
  dashboard: Step[];
  calendar: Step[];
  profile: Step[];
  team: Step[];
  booking: Step[];
  settings: Step[];
}

/**
 * Placeholder steps for tours
 * In a complete implementation, these would be replaced with actual tour steps
 * tailored to each feature with proper targets and content
 */
const tourSteps: TourSteps = {
  dashboard: [
    {
      target: '.dashboard-overview',
      content: 'This is your dashboard where you can see an overview of your calendar events and activities.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.dashboard-stats',
      content: 'Here you can see statistics about your meetings and scheduled events.',
      placement: 'bottom',
    },
    {
      target: '.dashboard-actions',
      content: 'Quick actions to help you manage your calendar efficiently.',
      placement: 'right',
    }
  ],
  calendar: [
    {
      target: '.calendar-view',
      content: 'This is your calendar view showing all your scheduled events.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.calendar-controls',
      content: 'These controls let you navigate between day, week, and month views.',
      placement: 'bottom',
    },
    {
      target: '.create-event-button',
      content: 'Click here to create a new calendar event.',
      placement: 'left',
    }
  ],
  profile: [
    {
      target: '.profile-header',
      content: 'Your profile information is displayed here.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.profile-avatar',
      content: 'Click here to change your profile picture.',
      placement: 'right',
    },
    {
      target: '.profile-settings',
      content: 'Manage your account settings and preferences here.',
      placement: 'bottom',
    }
  ],
  team: [
    {
      target: '.team-header',
      content: 'This is your team management section.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.team-members',
      content: 'Here you can see all members of your team.',
      placement: 'bottom',
    },
    {
      target: '.add-member-button',
      content: 'Click here to invite new members to your team.',
      placement: 'left',
    }
  ],
  booking: [
    {
      target: '.booking-links',
      content: 'This is where you manage your booking links.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.create-booking-link',
      content: 'Create new booking links for others to schedule time with you.',
      placement: 'bottom',
    },
    {
      target: '.booking-settings',
      content: 'Configure your availability and booking preferences here.',
      placement: 'right',
    }
  ],
  settings: [
    {
      target: '.settings-panel',
      content: 'This is the settings panel for the application.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.notification-settings',
      content: 'Configure your notification preferences here.',
      placement: 'bottom',
    },
    {
      target: '.calendar-integration',
      content: 'Connect your external calendars for better synchronization.',
      placement: 'right',
    }
  ]
};

/**
 * TourManager displays different feature tours based on the active feature
 * It uses tourSteps to determine which steps to show
 */
const TourManager: React.FC<TourManagerProps> = ({ activeTour }) => {
  const { exitFeatureTour, markFeatureComplete } = useTutorial();
  
  if (!activeTour) return null;
  
  // Get the steps for the active tour
  const steps = tourSteps[activeTour as keyof TourSteps] || [];
  
  // Handle tour completion
  const handleTourComplete = () => {
    // Mark the feature as completed in the context
    markFeatureComplete(activeTour as any);
    exitFeatureTour();
  };
  
  return (
    <FeatureTour
      name={activeTour}
      steps={steps}
      onComplete={handleTourComplete}
    />
  );
};

export default TourManager;