import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useCalendarIntegrations } from '@/hooks/useCalendarIntegration';
import { CalendarIntegration } from '@shared/schema';
import { CalendarConnect } from '@/components/calendar/CalendarConnect';
import { useUser } from '@/context/UserContext';
import { 
  CalendarIcon, 
  ClipboardList, 
  Link2Icon, 
  Settings, 
  HelpCircle, 
  Users, 
  Building,
  LayoutDashboard,
  Plug,
  UserCircle
} from 'lucide-react';

interface SidebarProps {
  onCreateEvent?: () => void;
  className?: string;
  onShowWelcome?: () => void;
  onShowCalendar?: () => void;
  showWelcome?: boolean;
}

export default function Sidebar({ onCreateEvent, onShowWelcome, onShowCalendar, showWelcome, className = '' }: SidebarProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const { data: integrationsData, isLoading } = useCalendarIntegrations();
  const { user, isAdmin, isCompanyAdmin, isTeamManager } = useUser();
  
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
    <aside className={`hidden md:block w-60 bg-white dark:bg-slate-900 border-r border-neutral-300 dark:border-slate-700 flex-shrink-0 overflow-y-auto z-10 ${className}`}>
      <div className="py-6 px-4">
        <Button 
          onClick={onCreateEvent}
          className="mb-6 flex items-center justify-center w-full py-3 px-4 bg-primary text-white rounded-full font-medium shadow-md hover:bg-primary/90 transition-colors"
        >
          <span className="material-icons mr-2 text-sm">add</span>
          <span>Create Event</span>
        </Button>
        
        <nav>
          <ul className="space-y-1">
            {/* Common Navigation for all users */}
            <li>
              <Link 
                href="/"
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/' || (location === '' && showWelcome)
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/?view=calendar"
                className={`flex items-center px-4 py-3 rounded-lg ${
                  (location === '/' && !showWelcome) || location === '/?view=calendar'
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarIcon className="mr-3 h-5 w-5" />
                <span>Calendar</span>
              </Link>
            </li>
            <li className="ml-6">
              <Link 
                href="/events" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/events' 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="mr-3 h-5 w-5" />
                <span>Scheduled Events</span>
              </Link>
            </li>
            <li className="ml-6">
              <Link 
                href="/booking" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/booking' 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <Link2Icon className="mr-3 h-5 w-5" />
                <span>Booking Links</span>
              </Link>
            </li>
            
            {/* Role-specific navigation sections */}
            {isAdmin && (
              <li className="mt-6 pt-4 border-t border-neutral-200 dark:border-slate-700">
                <h3 className="px-4 mb-2 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                  Admin
                </h3>
                <Link 
                  href="/admin" 
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    location.startsWith('/admin') 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="mr-3 h-5 w-5" />
                  <span>Admin Dashboard</span>
                </Link>
                <Link 
                  href="/admin/users" 
                  className={`flex items-center px-4 py-3 ml-4 rounded-lg ${
                    location.startsWith('/admin/users') 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="mr-3 h-5 w-5" />
                  <span>Manage Users</span>
                </Link>
                <Link 
                  href="/admin?tab=organizations" 
                  className={`flex items-center px-4 py-3 ml-4 rounded-lg ${
                    (location === '/admin' && window.location.href.includes('tab=organizations')) || location.startsWith('/admin/organizations')
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Building className="mr-3 h-5 w-5" />
                  <span>Organizations</span>
                </Link>
              </li>
            )}
            
            {isCompanyAdmin && (
              <li className="mt-6 pt-4 border-t border-neutral-200 dark:border-slate-700">
                <h3 className="px-4 mb-2 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                  Organization
                </h3>
                <Link 
                  href="/admin?tab=organizations" 
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    (location === '/admin' && window.location.href.includes('tab=organizations')) || location.startsWith('/admin/organizations') 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="mr-3 h-5 w-5" />
                  <span>Org Dashboard</span>
                </Link>
                <Link 
                  href="/organization/teams" 
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    location === '/organization/teams' 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="mr-3 h-5 w-5" />
                  <span>Manage Teams</span>
                </Link>
              </li>
            )}
            
            {isTeamManager && (
              <li className="mt-6 pt-4 border-t border-neutral-200 dark:border-slate-700">
                <h3 className="px-4 mb-2 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                  Team
                </h3>
                <Link 
                  href="/team" 
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    location.startsWith('/team') 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="mr-3 h-5 w-5" />
                  <span>Team Dashboard</span>
                </Link>
                <Link 
                  href="/team/members" 
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    location === '/team/members' 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="mr-3 h-5 w-5" />
                  <span>Team Members</span>
                </Link>
              </li>
            )}
            
            {/* Common settings and help links */}
            <li className={!isAdmin && !isCompanyAdmin && !isTeamManager ? "mt-6 pt-4 border-t border-neutral-200 dark:border-slate-700" : ""}>
              <Link 
                href="/profile" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/profile' 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <UserCircle className="mr-3 h-5 w-5" />
                <span>Profile</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/settings" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/settings' 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="mr-3 h-5 w-5" />
                <span>Settings</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/integrations" 
                className={`flex items-center px-4 py-3 rounded-lg ${
                  location === '/integrations' 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
              >
                <Plug className="mr-3 h-5 w-5" />
                <span>Integrations</span>
              </Link>
            </li>
            <li>
              <a 
                href="#" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
              >
                <HelpCircle className="mr-3 h-5 w-5" />
                <span>Help & Support</span>
              </a>
            </li>
          </ul>
        </nav>
        
        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-3 px-4">Connected Calendars</h3>
          
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-neutral-500 dark:text-slate-400">Loading...</div>
          ) : (
            <>
              {integrations.filter(i => i.isConnected).map((integration) => (
                <div key={integration.id} className="flex items-center px-4 py-2 mb-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <span className="material-icons text-primary text-sm">check_circle</span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-700 dark:text-slate-300">
                      {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)} Calendar
                    </p>
                    <p className="text-neutral-500 dark:text-slate-400 text-xs">
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
                  className="flex items-center px-4 py-2 mb-2 text-sm hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-lg w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-slate-700 flex items-center justify-center mr-3">
                    <span className="material-icons text-neutral-500 dark:text-slate-400 text-sm">add</span>
                  </div>
                  <div className="text-neutral-600 dark:text-slate-300">Connect Google</div>
                </button>
              )}
              
              {!integrations.some(i => i.type === 'outlook' && i.isConnected) && (
                <button 
                  onClick={() => setConnectDialogType('outlook')}
                  className="flex items-center px-4 py-2 mb-2 text-sm hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-lg w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-slate-700 flex items-center justify-center mr-3">
                    <span className="material-icons text-neutral-500 dark:text-slate-400 text-sm">add</span>
                  </div>
                  <div className="text-neutral-600 dark:text-slate-300">Connect Outlook</div>
                </button>
              )}
              
              {!integrations.some(i => i.type === 'ical' && i.isConnected) && (
                <button 
                  onClick={() => setConnectDialogType('ical')}
                  className="flex items-center px-4 py-2 mb-2 text-sm hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-lg w-full text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-slate-700 flex items-center justify-center mr-3">
                    <span className="material-icons text-neutral-500 dark:text-slate-400 text-sm">add</span>
                  </div>
                  <div className="text-neutral-600 dark:text-slate-300">Connect iCal</div>
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
