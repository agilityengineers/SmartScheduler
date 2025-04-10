import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import Calendar from '@/components/calendar/Calendar';
import EventDetails from '@/components/calendar/EventDetails';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import LandingPage from '@/components/landing/LandingPage';
import WelcomeScreen from '@/components/dashboard/WelcomeScreen';
import { Event } from '@shared/schema';
import { useCurrentTimeZone } from '@/hooks/useTimeZone';
import { useUser } from '@/context/UserContext';

export default function Home() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week');
  const currentTimeZoneObj = useCurrentTimeZone();
  const [timeZone, setTimeZone] = useState<string>(currentTimeZoneObj.timeZone);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [location] = useLocation();
  
  // Initialize state variables
  const [showWelcome, setShowWelcome] = useState(true);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  
  // Process URL parameters and update states accordingly
  useEffect(() => {
    console.log("URL location changed:", location);
    
    // Get URL parameters
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      console.error("Error parsing URL parameters:", e);
      params = new URLSearchParams("");
    }
    
    const viewParam = params.get('view');
    const orgParam = params.get('org');
    const teamParam = params.get('team');
    
    console.log("URL parameters detected:", { viewParam, orgParam, teamParam });
    
    // If view=calendar parameter is present, show the calendar
    if (viewParam === 'calendar') {
      console.log("Setting showWelcome to false because view=calendar detected");
      setShowWelcome(false);
      
      // Handle organization ID if present
      if (orgParam) {
        try {
          const orgId = parseInt(orgParam, 10);
          console.log("Setting organizationId to:", orgId);
          setOrganizationId(orgId);
        } catch (e) {
          console.error("Invalid organization ID:", orgParam);
          setOrganizationId(null);
        }
      } else {
        setOrganizationId(null);
      }
      
      // Handle team ID if present
      if (teamParam) {
        try {
          const tId = parseInt(teamParam, 10);
          console.log("Setting teamId to:", tId);
          setTeamId(tId);
        } catch (e) {
          console.error("Invalid team ID:", teamParam);
          setTeamId(null);
        }
      } else {
        setTeamId(null);
      }
    } else {
      // No view parameter or different view, show welcome screen
      console.log("Setting showWelcome to true because no view=calendar detected");
      setShowWelcome(true);
    }
  }, [location]);
  
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };
  
  const handleEventEdit = (event: Event) => {
    // Implement edit functionality here
    console.log('Edit event:', event);
    setShowEventDetails(false);
  };
  
  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };
  
  // Update timeZone when currentTimeZoneObj changes
  useEffect(() => {
    if (currentTimeZoneObj && currentTimeZoneObj.timeZone) {
      setTimeZone(currentTimeZoneObj.timeZone);
    }
  }, [currentTimeZoneObj]);

  // If user is not logged in, show the landing page
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <LandingPage />
        <Footer />
      </div>
    );
  }

  // If user is logged in, show either welcome screen or calendar app
  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          onCreateEvent={handleCreateEvent} 
          onShowWelcome={() => setShowWelcome(true)}
          onShowCalendar={() => setShowWelcome(false)}
          showWelcome={showWelcome}
        />
        
        {showWelcome ? (
          <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-800" data-tutorial="dashboard-overview">
            <WelcomeScreen />
          </main>
        ) : (
          <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
            <CalendarHeader 
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onViewChange={(view: 'day' | 'week' | 'month') => setCurrentView(view)}
              onTimeZoneChange={setTimeZone}
              currentView={currentView}
              currentTimeZone={timeZone}
            />
            
            <div data-tutorial="calendar-view">
              <Calendar 
                currentDate={currentDate}
                timeZone={timeZone}
                onEventClick={handleEventClick}
                currentView={currentView}
                organizationId={organizationId}
                teamId={teamId}
              />
            </div>
          </main>
        )}
        
        <EventDetails
          event={selectedEvent}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEventEdit}
          isOpen={showEventDetails}
        />
      </div>
      
      <MobileNavigation 
        onCreateEventClick={handleCreateEvent} 
        onShowWelcome={() => setShowWelcome(true)}
        onShowCalendar={() => setShowWelcome(false)}
        showWelcome={showWelcome}
      />
      
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <Footer />
    </div>
  );
}
