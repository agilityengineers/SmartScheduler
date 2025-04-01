import React, { useEffect, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTutorial } from '@/contexts/TutorialContext';
import { useLocation } from 'wouter';

// Define tutorial steps directly in this file for now
interface TutorialStep extends Step {
  navTo?: string;
}

export const Tutorial: React.FC = () => {
  const { 
    isTutorialActive, 
    isTutorialCompleted,
    completeTutorial,
    activeFeatureTour,
    startFeatureTour,
    exitFeatureTour
  } = useTutorial();
  
  // Since Tutorial Context doesn't manage tutorial steps or current route, 
  // we'll manage these locally in this component
  const [tutorialStep, setTutorialStep] = React.useState(0);
  const [currentRoute, setCurrentRoute] = React.useState('');
  
  const [location, setLocation] = useLocation();
  
  // Update current route when location changes
  useEffect(() => {
    setCurrentRoute(location);
  }, [location, setCurrentRoute]);

  // Define steps for each section
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
    }
  ], []);

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
    }
  ], []);

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
    }
  ], []);

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
    }
  ], []);

  // Get the appropriate steps based on the current route
  const steps = useMemo(() => {
    if (currentRoute === '/') {
      return getDashboardSteps();
    } else if (currentRoute.includes('/calendar') || currentRoute.includes('/events')) {
      return getCalendarSteps();
    } else if (currentRoute.includes('/profile')) {
      return getProfileSteps();
    } else if (currentRoute.includes('/team')) {
      return getTeamSteps();
    }
    return getDashboardSteps(); // Default to dashboard steps
  }, [currentRoute, getDashboardSteps, getCalendarSteps, getProfileSteps, getTeamSteps]);

  // Callback for Joyride events
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // User has finished or skipped the tutorial
      completeTutorial();
    } else if (type === 'step:after' && action === 'next') {
      // User clicked next, update step
      setTutorialStep(index + 1);
      
      // Special case: if we need to navigate to a different page
      const currentStep = steps[index];
      if (currentStep && currentStep.navTo && currentStep.navTo !== currentRoute) {
        setLocation(currentStep.navTo);
      }
    } else if (type === 'step:after' && action === 'prev') {
      // User clicked back, update step
      setTutorialStep(index - 1);
    }
  };

  if (!isTutorialActive || isTutorialCompleted) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      disableOverlayClose={false}
      disableCloseOnEsc={false}
      steps={steps}
      stepIndex={tutorialStep}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#6366f1', // Match your primary color
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#6366f1',
        },
        buttonBack: {
          marginRight: 10,
        },
      }}
    />
  );
};

export default Tutorial;