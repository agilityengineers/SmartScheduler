import React from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, CircleSlash, PlayCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface OnboardingProgressProps {
  className?: string;
}

/**
 * OnboardingProgress shows the user's progress through the tutorial system
 * Displaying which features have been completed and which are still pending
 */
const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ className = '' }) => {
  const { 
    tutorialProgress, 
    isTutorialCompleted,
    startFeatureTour
  } = useTutorial();
  
  // Calculate the percentage of features completed
  const completedFeatures = Object.values(tutorialProgress).filter(completed => completed).length;
  const totalFeatures = Object.keys(tutorialProgress).length;
  const progressPercentage = Math.round((completedFeatures / totalFeatures) * 100);
  
  return (
    <Card className={`shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Onboarding Progress</CardTitle>
        <CardDescription>Track your progress through the app features</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{progressPercentage}% completed</span>
            <span>{completedFeatures} of {totalFeatures} features</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <FeatureItem
            name="dashboard"
            label="Dashboard Overview"
            completed={tutorialProgress.dashboard}
            onStart={() => startFeatureTour('dashboard')}
          />
          <FeatureItem
            name="calendar"
            label="Calendar Management"
            completed={tutorialProgress.calendar}
            onStart={() => startFeatureTour('calendar')}
          />
          <FeatureItem
            name="profile"
            label="Profile Settings"
            completed={tutorialProgress.profile}
            onStart={() => startFeatureTour('profile')}
          />
          <FeatureItem
            name="team"
            label="Team Collaboration"
            completed={tutorialProgress.team}
            onStart={() => startFeatureTour('team')}
          />
          <FeatureItem
            name="booking"
            label="Booking Links"
            completed={tutorialProgress.bookings}
            onStart={() => startFeatureTour('booking')}
          />
          <FeatureItem
            name="settings"
            label="App Settings"
            completed={tutorialProgress.settings}
            onStart={() => startFeatureTour('settings')}
          />
        </div>
        
        {isTutorialCompleted && (
          <div className="mt-4 p-3 bg-primary/10 rounded-md text-center">
            <p className="text-sm font-medium">
              🎉 Congratulations! You've completed all tutorials.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can revisit any feature tour at any time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface FeatureItemProps {
  name: any;
  label: string;
  completed: boolean;
  onStart: () => void;
}

function getFeatureLabel(feature: string): string {
  switch (feature) {
    case 'dashboard': return 'Dashboard Overview';
    case 'calendar': return 'Calendar Management';
    case 'profile': return 'Profile Settings';
    case 'team': return 'Team Collaboration';
    case 'booking': return 'Booking Links';
    case 'settings': return 'App Settings';
    default: return feature;
  }
}

const FeatureItem: React.FC<FeatureItemProps> = ({ name, label, completed, onStart }) => {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        {completed ? (
          <CheckCircle className="h-5 w-5 text-primary" />
        ) : (
          <CircleSlash className="h-5 w-5 text-muted-foreground" />
        )}
        <span className={`text-sm ${completed ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2 gap-1"
        onClick={onStart}
      >
        <PlayCircle className="h-4 w-4" />
        {completed ? 'Replay' : 'Start'}
      </Button>
    </div>
  );
};

export default OnboardingProgress;