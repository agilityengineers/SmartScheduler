import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useCalendarIntegrations } from '@/hooks/useCalendarIntegration';
import { CalendarIntegration } from '@shared/schema';
import { CalendarConnect } from '@/components/calendar/CalendarConnect';

interface SidebarProps {
  onCreateEvent?: () => void;
  className?: string;
}

export default function Sidebar({ onCreateEvent, className = '' }: SidebarProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const { data: integrationsData, isLoading } = useCalendarIntegrations();
  
  // Safely type the integrations data
  const integrations: CalendarIntegration[] = Array.isArray(integrationsData) ? integrationsData : [];
  
  // State for calendar connect dialogs
  const [connectDialogType, setConnectDialogType] = useState<'google' | 'outlook' | 'ical' | null>(null);

  useEffect(() => {
    // Handle responsive behavior
    const handleResize = () => {
      setIsVisible(window.innerWidth >= 768);
    };

    const handleToggleSidebar = () => {
      setIsVisible(prev => !prev);
    };

    // Set initial state
    handleResize();

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('toggle-sidebar', handleToggleSidebar);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggle-sidebar', handleToggleSidebar);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <aside className={`hidden md:block w-60 bg-white border-r border-neutral-300 flex-shrink-0 overflow-y-auto z-10 ${className}`}>
      <div className="py-6 px-4">
        <Button 
          onClick={onCreateEvent}
          className="mb-6 flex items-center justify-center w-full py-3 px-4 bg-primary text-white rounded-full font-medium shadow-md hover:bg-blue-600 transition-colors"
        >
          <span className="material-icons mr-2 text-sm">add</span>
          <span>Create Event</span>
        </Button>
        
        <nav>
          <ul className="space-y-1">
            <li>
              <Link 
                href="/" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/' 
                    ? 'bg-blue-50 text-primary font-medium' 
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span className="material-icons mr-3">calendar_today</span>
                <span>Calendar</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/events" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/events' 
                    ? 'bg-blue-50 text-primary font-medium' 
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span className="material-icons mr-3">schedule</span>
                <span>Scheduled Events</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/booking" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/booking' 
                    ? 'bg-blue-50 text-primary font-medium' 
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span className="material-icons mr-3">link</span>
                <span>Booking Links</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/settings" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/settings' 
                    ? 'bg-blue-50 text-primary font-medium' 
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span className="material-icons mr-3">settings</span>
                <span>Settings</span>
              </Link>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-600 hover:bg-neutral-100"
              >
                <span className="material-icons mr-3">help_outline</span>
                <span>Help & Support</span>
              </a>
            </li>
          </ul>
        </nav>
        
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-500 mb-3 px-4">Connected Calendars</h3>
          
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-neutral-500">Loading...</div>
          ) : (
            <>
              {integrations.filter(i => i.isConnected).map((integration) => (
                <div key={integration.id} className="flex items-center px-4 py-2 mb-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="material-icons text-primary text-sm">check_circle</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700">
                      {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)} Calendar
                    </p>
                    <p className="text-neutral-500 text-xs">
                      Last synced: {integration.lastSynced 
                        ? new Date(integration.lastSynced).toLocaleString() 
                        : 'Never'}
                    </p>
                  </div>
                </div>
              ))}

              {!integrations.some(i => i.type === 'google' && i.isConnected) && (
                <button 
                  onClick={() => setConnectDialogType('google')}
                  className="flex items-center px-4 py-2 mb-2 text-sm hover:bg-neutral-50 rounded-lg w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center mr-3">
                    <span className="material-icons text-neutral-500 text-sm">add</span>
                  </div>
                  <div className="text-neutral-600">Connect Google</div>
                </button>
              )}
              
              {!integrations.some(i => i.type === 'outlook' && i.isConnected) && (
                <button 
                  onClick={() => setConnectDialogType('outlook')}
                  className="flex items-center px-4 py-2 mb-2 text-sm hover:bg-neutral-50 rounded-lg w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center mr-3">
                    <span className="material-icons text-neutral-500 text-sm">add</span>
                  </div>
                  <div className="text-neutral-600">Connect Outlook</div>
                </button>
              )}
              
              {!integrations.some(i => i.type === 'ical' && i.isConnected) && (
                <button 
                  onClick={() => setConnectDialogType('ical')}
                  className="flex items-center px-4 py-2 mb-2 text-sm hover:bg-neutral-50 rounded-lg w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center mr-3">
                    <span className="material-icons text-neutral-500 text-sm">add</span>
                  </div>
                  <div className="text-neutral-600">Connect iCal</div>
                </button>
              )}
              
              {/* Calendar Connect dialogs */}
              {connectDialogType && (
                <CalendarConnect
                  calendarType={connectDialogType}
                  open={Boolean(connectDialogType)}
                  onOpenChange={(open) => {
                    if (!open) setConnectDialogType(null);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
