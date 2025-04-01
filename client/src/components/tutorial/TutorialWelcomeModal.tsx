import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/contexts/TutorialContext';

export const TutorialWelcomeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { startTutorial, isTutorialCompleted, markTutorialCompleted } = useTutorial();
  
  // Check if this is the user's first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome && !isTutorialCompleted) {
      setIsOpen(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [isTutorialCompleted]);

  const handleStartTutorial = () => {
    setIsOpen(false);
    startTutorial();
  };

  const handleSkipTutorial = () => {
    setIsOpen(false);
    markTutorialCompleted();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to SmartScheduler!</DialogTitle>
          <DialogDescription>
            Let us show you around and help you get started with our platform.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            SmartScheduler is designed to help teams coordinate and manage their calendars effectively.
            Our quick tutorial will walk you through the main features.
          </p>
          
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">1</div>
            <p className="text-sm">Calendar Integration</p>
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">2</div>
            <p className="text-sm">Team Management</p>
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">3</div>
            <p className="text-sm">Booking Links</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">4</div>
            <p className="text-sm">Profile Settings</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleSkipTutorial}>
            Skip for now
          </Button>
          <Button onClick={handleStartTutorial}>
            Start Tutorial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TutorialWelcomeModal;