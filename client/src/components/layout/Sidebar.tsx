import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import {
  CalendarIcon,
  Clock,
  Link as LinkIcon,
  Settings,
  HelpCircle,
  Users,
  Building,
  Plug,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Workflow,
  Vote,
  CalendarCheck,
  GitBranch,
  UsersRound
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SidebarProps {
  onCreateEvent?: () => void;
  className?: string;
}

export default function Sidebar({ onCreateEvent, className = '' }: SidebarProps) {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const { user, isAdmin, isCompanyAdmin } = useUser();

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
    <aside
      className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-700 flex-shrink-0 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-60'
      } ${className}`}
    >
      {/* Collapse Toggle */}
      <div className="flex items-center justify-end p-4 border-b border-neutral-200 dark:border-slate-700">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`h-4 w-4 text-neutral-600 dark:text-slate-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex-1 py-4 px-2">
        {/* Create Button */}
        <div className="px-2 mb-4">
          <Button
            onClick={() => {
              if (onCreateEvent) {
                onCreateEvent();
              }
            }}
            className={`w-full flex items-center justify-center gap-2 bg-primary text-white rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors ${
              isCollapsed ? 'px-2 py-2' : 'px-4 py-3'
            }`}
            title="Create Event"
          >
            <span className="text-xl">+</span>
            {!isCollapsed && <span>Create</span>}
          </Button>
        </div>

        <nav>
          <ul className="space-y-1">
            {/* Main Navigation - Calendly Style */}
            <li>
              <Link
                href="/"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/' || location === '/booking'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Scheduling"
              >
                <LinkIcon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Scheduling</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/events"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/events'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Meetings"
              >
                <CalendarIcon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Meetings</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/bookings"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/bookings'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Bookings"
              >
                <CalendarCheck className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Bookings</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/availability"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/availability'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Availability"
              >
                <Clock className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Availability</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/contacts"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/contacts'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Contacts"
              >
                <Users className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Contacts</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/workflows"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/workflows'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Workflows"
              >
                <Workflow className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Workflows</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/meeting-polls"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/meeting-polls'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Meeting Polls"
              >
                <Vote className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Meeting Polls</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/routing"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/routing'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Routing Forms"
              >
                <GitBranch className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Routing</span>}
              </Link>
            </li>
            {/* Team Scheduling - only for company admins and system admins */}
            {(isCompanyAdmin || isAdmin) && (
              <li>
                <Link
                  href="/team-scheduling"
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                    location === '/team-scheduling'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                  }`}
                  title="Team Scheduling"
                >
                  <UsersRound className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>Team Scheduling</span>}
                </Link>
              </li>
            )}
            <li>
              <Link
                href="/integrations"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/integrations'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Integrations & apps"
              >
                <Plug className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Integrations & apps</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/settings'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Settings"
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Settings</span>}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Bottom Section - Like Calendly */}
      <div className="border-t border-neutral-200 dark:border-slate-700 py-3 px-2">
        <nav>
          <ul className="space-y-1">
            {/* Analytics */}
            <li>
              <Link
                href="/analytics"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/analytics'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Analytics"
              >
                <BarChart3 className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Analytics</span>}
              </Link>
            </li>

            {/* Admin Center - Only for admins */}
            {isAdmin && (
              <li>
                <Collapsible open={isAdminOpen} onOpenChange={setIsAdminOpen}>
                  <CollapsibleTrigger
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors w-full ${
                      location.startsWith('/admin')
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                    }`}
                    title="Admin center"
                  >
                    <Building className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span>Admin center</span>
                        <div className="ml-auto">
                          {isAdminOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </>
                    )}
                  </CollapsibleTrigger>
                  {!isCollapsed && (
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1">
                        <Link
                          href="/admin"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            location === '/admin'
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          href="/admin?tab=users"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            location.includes('users')
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Users</span>
                        </Link>
                        <Link
                          href="/admin?tab=organizations"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            location.includes('organizations')
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Organizations</span>
                        </Link>
                        <Link
                          href="/admin?tab=audit"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            location.includes('audit')
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Audit Log</span>
                        </Link>
                        <Link
                          href="/admin?tab=enterprise"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            location.includes('enterprise')
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Enterprise</span>
                        </Link>
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </li>
            )}

            {/* Company Admin - Only for company admins */}
            {isCompanyAdmin && !isAdmin && (
              <>
                <li>
                  <Link
                    href="/admin?tab=organizations"
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                      location.includes('organizations')
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                    }`}
                    title="Organization"
                  >
                    <Building className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>Organization</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/organization/teams"
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                      location === '/organization/teams'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                    }`}
                    title="Manage Teams"
                  >
                    <Users className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>Manage Teams</span>}
                  </Link>
                </li>
              </>
            )}

            {/* Help & Support */}
            <li>
              <Link
                href="/help"
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location === '/help'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800'
                }`}
                title="Help"
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>Help</span>}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
