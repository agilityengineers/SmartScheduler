import React from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, Play, Eye, EyeOff } from 'lucide-react';

export const OnboardingSettings: React.FC = () => {
  const { 
    isTutorialCompleted,
    resetTutorial,
    startTutorial,
    hotspotEnabled,
    toggleHotspots,
    showOnLogin,
    setShowOnLogin,
    tutorialProgress
  } = useTutorial();
  
  // Calculate completion percentage for progress display
  const completedCount = Object.values(tutorialProgress).filter(Boolean).length;
  const totalSections = Object.keys(tutorialProgress).length;
  const completionPercentage = Math.round((completedCount / totalSections) * 100);
  
  const handleResetTutorial = () => {
    if (window.confirm('Are you sure you want to reset the tutorial progress? This will mark all tours as unseen.')) {
      resetTutorial();
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Preferences</CardTitle>
        <CardDescription>
          Customize your tutorial and onboarding experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium">Tutorial Progress</h4>
              <p className="text-sm text-muted-foreground">
                {isTutorialCompleted 
                  ? 'You have completed all tutorials' 
                  : `${completionPercentage}% complete`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startTutorial}
                className="flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                <span>Start</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetTutorial}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-hotspots">Feature Highlight Tooltips</Label>
            <p className="text-sm text-muted-foreground">
              Show tooltip indicators for new features and hints
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hotspotEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <Switch
              id="show-hotspots"
              checked={hotspotEnabled}
              onCheckedChange={toggleHotspots}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-welcome">Show Welcome on Login</Label>
            <p className="text-sm text-muted-foreground">
              Display the welcome tutorial when you log in
            </p>
          </div>
          <Switch
            id="show-welcome"
            checked={showOnLogin}
            onCheckedChange={setShowOnLogin}
          />
        </div>
        
        <div className="pt-3">
          <h4 className="text-sm font-medium mb-2">Available Tours</h4>
          <div className="space-y-2">
            <TourButton 
              name="Dashboard Tour" 
              completed={tutorialProgress.dashboard} 
              onClick={() => startTutorial()}
            />
            <TourButton 
              name="Calendar Features" 
              completed={tutorialProgress.calendar} 
              onClick={() => useTutorial().startFeatureTour('calendar')}
            />
            <TourButton 
              name="Profile Settings" 
              completed={tutorialProgress.profile} 
              onClick={() => useTutorial().startFeatureTour('profile')}
            />
            <TourButton 
              name="Team Management" 
              completed={tutorialProgress.team} 
              onClick={() => useTutorial().startFeatureTour('team')}
            />
            <TourButton 
              name="Booking Link Setup" 
              completed={tutorialProgress.bookings} 
              onClick={() => useTutorial().startFeatureTour('booking')}
            />
            <TourButton 
              name="App Settings" 
              completed={tutorialProgress.settings} 
              onClick={() => useTutorial().startFeatureTour('settings')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TourButtonProps {
  name: string;
  completed: boolean;
  onClick: () => void;
}

const TourButton: React.FC<TourButtonProps> = ({ name, completed, onClick }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`text-sm ${completed ? 'text-muted-foreground' : 'font-medium'}`}>
          {name}
        </span>
        {completed && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            Completed
          </span>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClick}
        className="h-7 px-2"
      >
        {completed ? 'Review' : 'Start'}
      </Button>
    </div>
  );
};

export default OnboardingSettings;