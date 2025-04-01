import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS as TOUR_STATUS, Step } from 'react-joyride';
import { useTutorial } from '@/contexts/TutorialContext';

interface FeatureTourProps {
  name: string;
  steps: Step[];
  onComplete?: () => void;
}

/**
 * FeatureTour component wraps react-joyride to provide a guided tour
 * of specific features in the application
 */
const FeatureTour: React.FC<FeatureTourProps> = ({ 
  name, 
  steps,
  onComplete 
}) => {
  const { markFeatureComplete, exitFeatureTour } = useTutorial();
  
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type } = data;
    
    if ([TOUR_STATUS.FINISHED, TOUR_STATUS.SKIPPED].includes(status)) {
      if (status === TOUR_STATUS.FINISHED) {
        markFeatureComplete(name as any);
      }
      
      exitFeatureTour();
      
      if (onComplete) {
        onComplete();
      }
    }
  }, [markFeatureComplete, exitFeatureTour, name, onComplete]);
  
  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          arrowColor: 'var(--primary)',
          backgroundColor: 'var(--background)',
          primaryColor: 'var(--primary)',
          textColor: 'var(--foreground)',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: 'var(--primary)',
          borderRadius: '4px',
          color: 'var(--primary-foreground)',
        },
        buttonBack: {
          marginRight: 10,
          color: 'var(--muted-foreground)',
        },
        buttonSkip: {
          color: 'var(--muted-foreground)',
        },
        spotlight: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }
      }}
    />
  );
};

export default FeatureTour;