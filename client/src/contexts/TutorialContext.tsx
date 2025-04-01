import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

export type FeatureTourName = 'dashboard' | 'calendar' | 'profile' | 'team' | 'booking' | 'settings';

interface TutorialProgress {
  dashboard: boolean;
  calendar: boolean;
  profile: boolean;
  team: boolean;
  bookings: boolean;
  settings: boolean;
}

interface TutorialContextProps {
  isFirstVisit: boolean;
  isTutorialActive: boolean;
  isTutorialCompleted: boolean;
  showOnLogin: boolean;
  activeFeatureTour: FeatureTourName | null;
  hotspotEnabled: boolean;
  tutorialProgress: TutorialProgress;
  
  startTutorial: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  
  startFeatureTour: (feature: FeatureTourName) => void;
  exitFeatureTour: () => void;
  markFeatureComplete: (feature: FeatureTourName) => void;
  
  toggleHotspots: () => void;
  setShowOnLogin: (show: boolean) => void;
}

// Initial tutorial progress state
const initialTutorialProgress: TutorialProgress = {
  dashboard: false,
  calendar: false,
  profile: false,
  team: false,
  bookings: false,
  settings: false
};

// Create context with default values
const defaultContextValue: TutorialContextProps = {
  isFirstVisit: true,
  isTutorialActive: false,
  isTutorialCompleted: false,
  showOnLogin: true,
  activeFeatureTour: null,
  hotspotEnabled: true,
  tutorialProgress: initialTutorialProgress,
  
  startTutorial: () => {},
  skipTutorial: () => {},
  completeTutorial: () => {},
  resetTutorial: () => {},
  
  startFeatureTour: () => {},
  exitFeatureTour: () => {},
  markFeatureComplete: () => {},
  
  toggleHotspots: () => {},
  setShowOnLogin: () => {}
};

const TutorialContext = createContext<TutorialContextProps>(defaultContextValue);

/**
 * TutorialProvider manages the state and logic for the application's
 * tutorial system, including onboarding tours and feature tours
 */
export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User's first visit state
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);
  
  // Tutorial active/completed state
  const [isTutorialActive, setIsTutorialActive] = useState<boolean>(false);
  const [isTutorialCompleted, setIsTutorialCompleted] = useState<boolean>(false);
  
  // Feature tour states
  const [activeFeatureTour, setActiveFeatureTour] = useState<FeatureTourName | null>(null);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>(initialTutorialProgress);
  
  // Preference settings
  const [hotspotEnabled, setHotspotEnabled] = useState<boolean>(true);
  const [showOnLogin, setShowOnLogin] = useState<boolean>(true);

  // Load tutorial state from localStorage on component mount
  useEffect(() => {
    const savedIsFirstVisit = localStorage.getItem('isFirstVisit');
    const savedIsTutorialCompleted = localStorage.getItem('isTutorialCompleted');
    const savedTutorialProgress = localStorage.getItem('tutorialProgress');
    const savedHotspotEnabled = localStorage.getItem('hotspotEnabled');
    const savedShowOnLogin = localStorage.getItem('showOnLogin');

    if (savedIsFirstVisit !== null) {
      setIsFirstVisit(savedIsFirstVisit === 'true');
    }

    if (savedIsTutorialCompleted !== null) {
      setIsTutorialCompleted(savedIsTutorialCompleted === 'true');
    }

    if (savedTutorialProgress !== null) {
      setTutorialProgress(JSON.parse(savedTutorialProgress));
    }

    if (savedHotspotEnabled !== null) {
      setHotspotEnabled(savedHotspotEnabled === 'true');
    }

    if (savedShowOnLogin !== null) {
      setShowOnLogin(savedShowOnLogin === 'true');
    }
  }, []);

  // Save tutorial state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isFirstVisit', isFirstVisit.toString());
    localStorage.setItem('isTutorialCompleted', isTutorialCompleted.toString());
    localStorage.setItem('tutorialProgress', JSON.stringify(tutorialProgress));
    localStorage.setItem('hotspotEnabled', hotspotEnabled.toString());
    localStorage.setItem('showOnLogin', showOnLogin.toString());
  }, [isFirstVisit, isTutorialCompleted, tutorialProgress, hotspotEnabled, showOnLogin]);

  // Start the main tutorial
  const startTutorial = () => {
    setIsTutorialActive(true);
    setActiveFeatureTour('dashboard');
  };

  // Skip the tutorial entirely
  const skipTutorial = () => {
    setIsTutorialActive(false);
    setIsFirstVisit(false);
    setActiveFeatureTour(null);
  };

  // Mark the entire tutorial as completed
  const completeTutorial = () => {
    setIsTutorialActive(false);
    setIsTutorialCompleted(true);
    setIsFirstVisit(false);
    setActiveFeatureTour(null);
  };

  // Reset the tutorial state
  const resetTutorial = () => {
    setIsFirstVisit(true);
    setIsTutorialActive(false);
    setIsTutorialCompleted(false);
    setTutorialProgress(initialTutorialProgress);
    setActiveFeatureTour(null);
  };

  // Start a specific feature tour
  const startFeatureTour = (feature: FeatureTourName) => {
    setActiveFeatureTour(feature);
  };

  // Exit the current feature tour
  const exitFeatureTour = () => {
    setActiveFeatureTour(null);
  };

  // Mark a specific feature as completed
  const markFeatureComplete = (feature: FeatureTourName) => {
    setTutorialProgress(prev => ({
      ...prev,
      [feature]: true
    }));

    // Check if all features are completed
    const updatedProgress = {
      ...tutorialProgress,
      [feature]: true
    };
    
    const allCompleted = Object.values(updatedProgress).every(Boolean);
    if (allCompleted) {
      setIsTutorialCompleted(true);
    }
  };

  // Toggle hotspots visibility
  const toggleHotspots = () => {
    setHotspotEnabled(prev => !prev);
  };

  // Context value to provide
  const contextValue: TutorialContextProps = {
    isFirstVisit,
    isTutorialActive,
    isTutorialCompleted,
    showOnLogin,
    activeFeatureTour,
    hotspotEnabled,
    tutorialProgress,
    
    startTutorial,
    skipTutorial,
    completeTutorial,
    resetTutorial,
    
    startFeatureTour,
    exitFeatureTour,
    markFeatureComplete,
    
    toggleHotspots,
    setShowOnLogin
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
};

// Hook to use the tutorial context
export const useTutorial = () => useContext(TutorialContext);

export default TutorialProvider;