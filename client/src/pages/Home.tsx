import { useState } from 'react';
import { format } from 'date-fns';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Calendar from '@/components/calendar/Calendar';
import EventDetails from '@/components/calendar/EventDetails';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import { Event } from '@shared/schema';
import { useCurrentTimeZone } from '@/hooks/useTimeZone';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week');
  const [currentTimeZone, setCurrentTimeZone] = useState(useCurrentTimeZone());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  
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

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <CalendarHeader 
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewChange={(view: 'day' | 'week' | 'month') => setCurrentView(view)}
            onTimeZoneChange={setCurrentTimeZone}
            currentView={currentView}
            currentTimeZone={currentTimeZone}
          />
          
          <Calendar 
            currentDate={currentDate}
            timeZone={currentTimeZone}
            onEventClick={handleEventClick}
            currentView={currentView}
          />
        </main>
        
        <EventDetails
          event={selectedEvent}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEventEdit}
          isOpen={showEventDetails}
        />
      </div>
      
      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
