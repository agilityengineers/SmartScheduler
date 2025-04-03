import { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { formatDateTimeRange } from '@/hooks/useTimeZone';
import { Event } from '@shared/schema';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import EventDetails from '@/components/calendar/EventDetails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentTimeZone } from '@/hooks/useTimeZone';

export default function ScheduledEvents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const currentTimeZone = useCurrentTimeZone();
  
  // Get all events without date filtering
  const { data: events = [], isLoading } = useEvents();
  
  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };
  
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEventEdit = (event: Event) => {
    setSelectedEvent(event);
    setShowCreateModal(true);
  };
  
  // Filter events by search query
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Group events by date
  const groupedEvents: Record<string, Event[]> = {};
  
  filteredEvents.forEach(event => {
    const date = new Date(event.startTime).toDateString();
    if (!groupedEvents[date]) {
      groupedEvents[date] = [];
    }
    groupedEvents[date].push(event);
  });
  
  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  
  const getEventTypeLabel = (calendarType: string) => {
    switch(calendarType) {
      case 'google': return 'Google Calendar';
      case 'outlook': return 'Outlook Calendar';
      case 'ical': return 'iCalendar';
      default: return 'Local Calendar';
    }
  };
  
  const getEventTypeColor = (calendarType: string) => {
    switch(calendarType) {
      case 'google': return 'bg-blue-100 text-primary';
      case 'outlook': return 'bg-purple-100 text-purple-700';
      case 'ical': return 'bg-amber-100 text-amber-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b border-neutral-300 p-4 flex items-center justify-between bg-white">
            <h1 className="text-xl font-semibold text-neutral-700">Scheduled Events</h1>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">search</span>
              <Input 
                type="text" 
                placeholder="Search events" 
                className="pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="material-icons text-4xl text-neutral-400 mb-2">event_busy</span>
                <h2 className="text-lg font-medium text-neutral-600 mb-1">No events found</h2>
                <p className="text-neutral-500 mb-4">
                  {searchQuery 
                    ? `No events matching "${searchQuery}"` 
                    : "You don't have any scheduled events yet"}
                </p>
                <Button onClick={handleCreateEvent}>
                  <span className="material-icons mr-1 text-sm">add</span>
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => (
                  <div key={date} className="space-y-2">
                    <h2 className="text-lg font-semibold text-neutral-700 pb-2 border-b border-neutral-200">
                      {new Date(date).toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </h2>
                    <div className="space-y-2">
                      {groupedEvents[date].map(event => (
                        <div 
                          key={event.id} 
                          className="p-4 border rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-neutral-800">{event.title}</h3>
                              <p className="text-sm text-neutral-600 mt-1">
                                {formatDateTimeRange(event.startTime, event.endTime, event.timezone || currentTimeZone)}
                              </p>
                              {event.location && (
                                <p className="text-sm text-neutral-600 mt-1 flex items-center">
                                  <span className="material-icons text-sm mr-1">
                                    {event.meetingUrl ? 'videocam' : 'location_on'}
                                  </span>
                                  {event.location}
                                </p>
                              )}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${getEventTypeColor(event.calendarType || 'local')}`}>
                              {getEventTypeLabel(event.calendarType || 'local')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
