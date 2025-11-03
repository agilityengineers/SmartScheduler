import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CalendarDays, 
  Users, 
  UserPlus, 
  Building2, 
  Star, 
  Calendar, 
  Settings, 
  ArrowRight, 
  CheckSquare,
  BookOpen
} from 'lucide-react';
import { Link } from 'wouter';

export default function WelcomeScreen() {
  const { user, organization, team, isAdmin, isCompanyAdmin, isTeamManager } = useUser();
  const [progress, setProgress] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set appropriate greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    // Animate progress bar
    const timer = setTimeout(() => setProgress(70), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!user) return null;

  const renderAdminWelcome = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
          <CardDescription>
            Welcome to your admin control panel. Manage your entire platform from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AdminQuickAction 
              icon={<Users className="h-5 w-5" />}
              title="Manage Users"
              description="Add, edit, or remove users"
              href="/admin"
            />
            <AdminQuickAction 
              icon={<Building2 className="h-5 w-5" />}
              title="Organizations"
              description="Oversee all organizations"
              href="/admin"
            />
            <AdminQuickAction 
              icon={<Settings className="h-5 w-5" />}
              title="System Settings"
              description="Configure global settings"
              href="/settings"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/admin">
            <Button variant="outline" className="w-full">
              Go to Admin Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <SystemStatusCard />
    </div>
  );

  const renderCompanyAdminWelcome = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">
            {organization?.name || 'Your Company'} Dashboard
          </CardTitle>
          <CardDescription>
            Manage your company and teams from this central dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompanyQuickAction 
              icon={<Users className="h-5 w-5" />}
              title="Manage Teams"
              description="View and manage your organization's teams"
              href="/organization"
            />
            <CompanyQuickAction 
              icon={<UserPlus className="h-5 w-5" />}
              title="Invite Members"
              description="Add new members to your organization"
              href="/organization"
            />
            <div 
              className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors"
              onClick={() => {
                // Navigate to calendar view with company view
                console.log("Company Calendar clicked! Navigating to company calendar view with org ID:", organization?.id || 1);
                // Use location.replace instead of window.location.href for more reliable navigation
                window.location.replace("/?view=calendar&org=" + (organization?.id || 1));
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500/10 p-2 rounded-md text-blue-500">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Company Calendar</h3>
                  <p className="text-sm text-muted-foreground">View events across all teams</p>
                </div>
              </div>
            </div>
            <CompanyQuickAction 
              icon={<Settings className="h-5 w-5" />}
              title="Organization Settings"
              description="Customize your organization settings"
              href="/settings"
            />
          </div>
        </CardContent>
      </Card>

      <OrganizationStatsCard organizationName={organization?.name || 'Your Company'} />
    </div>
  );

  const renderTeamManagerWelcome = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">
            {team?.name || 'Your Team'} Dashboard
          </CardTitle>
          <CardDescription>
            Manage your team's schedule and members from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamQuickAction 
              icon={<Users className="h-5 w-5" />}
              title="Team Members"
              description="Manage your team members"
              href="/team"
            />
            <div 
              className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors"
              onClick={() => {
                // Navigate to calendar view with team view
                console.log("Team Calendar clicked! Navigating to team calendar view with team ID:", team?.id || 1);
                window.location.replace("/?view=calendar&team=" + (team?.id || 1));
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="bg-green-500/10 p-2 rounded-md text-green-500">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Team Schedule</h3>
                  <p className="text-sm text-muted-foreground">View and manage team events</p>
                </div>
              </div>
            </div>
            <TeamQuickAction 
              icon={<CheckSquare className="h-5 w-5" />}
              title="Team Availability"
              description="Set team availability hours"
              href="/booking-links"
            />
            <TeamQuickAction 
              icon={<Settings className="h-5 w-5" />}
              title="Team Settings"
              description="Customize team preferences"
              href="/settings"
            />
          </div>
        </CardContent>
      </Card>

      <TeamAvailabilityCard />
    </div>
  );

  const renderBasicUserWelcome = () => (
    <div className="space-y-6">
      {/* Getting Started Guide for New Users */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Getting Started with SmartScheduler
          </CardTitle>
          <CardDescription>
            Welcome! Here's how to get the most out of SmartScheduler in 3 easy steps:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Connect Your Calendar</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Sync your Google or Outlook calendar to see all your events in one place
                </p>
                <Link href="/integrations">
                  <Button size="sm" variant="outline">
                    Connect Calendar <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Create Your First Booking Link</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Share a link so others can easily book time with you
                </p>
                <Link href="/booking-links">
                  <Button size="sm" variant="outline">
                    Create Booking Link <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Customize Your Settings</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Set your timezone, working hours, and notification preferences
                </p>
                <Link href="/settings">
                  <Button size="sm" variant="outline">
                    Update Settings <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Quick Actions</CardTitle>
          <CardDescription>
            Jump right in and start managing your schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-tutorial="calendar-section">
              <div
                className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors"
                onClick={() => {
                  // Navigate to user's personal calendar view
                  console.log("Your Calendar clicked! Navigating to personal calendar");
                  window.location.replace("/?view=calendar");
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-500/10 p-2 rounded-md text-purple-500">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Your Calendar</h3>
                    <p className="text-sm text-muted-foreground">View and manage your events</p>
                  </div>
                </div>
              </div>
            </div>
            <div data-tutorial="booking-links">
              <UserQuickAction
                icon={<Star className="h-5 w-5" />}
                title="Booking Links"
                description="Create and manage your booking links"
                href="/booking-links"
              />
            </div>
            <UserQuickAction
              icon={<BookOpen className="h-5 w-5" />}
              title="Scheduled Events"
              description="View your upcoming schedules"
              href="/scheduled-events"
            />
            <UserQuickAction
              icon={<Settings className="h-5 w-5" />}
              title="Your Settings"
              description="Customize your preferences"
              href="/settings"
            />
          </div>
        </CardContent>
      </Card>

      <UserTrialCard />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" data-tutorial="dashboard-overview">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {user.displayName || user.username}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your {isCompanyAdmin ? 'organization' : isTeamManager ? 'team' : 'personal'} dashboard.
        </p>
      </div>

      {isAdmin && renderAdminWelcome()}
      {!isAdmin && isCompanyAdmin && renderCompanyAdminWelcome()}
      {!isAdmin && !isCompanyAdmin && isTeamManager && renderTeamManagerWelcome()}
      {!isAdmin && !isCompanyAdmin && !isTeamManager && renderBasicUserWelcome()}
    </div>
  );
}

// Component for admin quick action cards
function AdminQuickAction({ icon, title, description, href }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors">
        <div className="flex items-start space-x-3">
          <div className="bg-primary/10 p-2 rounded-md text-primary">
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Component for company admin quick action cards
function CompanyQuickAction({ icon, title, description, href }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors">
        <div className="flex items-start space-x-3">
          <div className="bg-blue-500/10 p-2 rounded-md text-blue-500">
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Component for team manager quick action cards
function TeamQuickAction({ icon, title, description, href }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors">
        <div className="flex items-start space-x-3">
          <div className="bg-green-500/10 p-2 rounded-md text-green-500">
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Component for basic user quick action cards
function UserQuickAction({ icon, title, description, href }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer transition-colors">
        <div className="flex items-start space-x-3">
          <div className="bg-purple-500/10 p-2 rounded-md text-purple-500">
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Card showing system status for admins
function SystemStatusCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>System Status</CardTitle>
        <CardDescription>
          Platform activity and metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>System Load</span>
              <span className="text-muted-foreground">12%</span>
            </div>
            <Progress value={12} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Active Users</span>
              <span className="text-muted-foreground">245 online</span>
            </div>
            <Progress value={58} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Storage Usage</span>
              <span className="text-muted-foreground">35%</span>
            </div>
            <Progress value={35} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Total Users</p>
            <p className="text-2xl font-semibold">1,254</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Organizations</p>
            <p className="text-2xl font-semibold">126</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Events Today</p>
            <p className="text-2xl font-semibold">567</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">API Requests</p>
            <p className="text-2xl font-semibold">48.2k</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card showing organization stats for company admins
function OrganizationStatsCard({ organizationName }: { organizationName: string }) {
  const { organization } = useUser();
  const [teamsCount, setTeamsCount] = useState(0);
  const [membersCount, setMembersCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizationStats = async () => {
      if (!organization?.id) return;
      
      setLoading(true);
      try {
        // Fetch teams count
        const teamsResponse = await fetch(`/api/organizations/${organization.id}/teams`);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeamsCount(teamsData.length);
        }
        
        // Fetch members count
        const membersResponse = await fetch(`/api/organizations/${organization.id}/users`);
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setMembersCount(membersData.length);
        }
        
        // Fetch events count (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const eventsResponse = await fetch(`/api/events?start=${thirtyDaysAgo.toISOString()}&end=${now.toISOString()}`);
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEventsCount(eventsData.length);
        }
        
        // For bookings count, we would need to implement an endpoint
        // that returns bookings for an organization. For now, we'll
        // set this to 0 and update it when that endpoint is available.
        setBookingsCount(0);
      } catch (error) {
        console.error('Error fetching organization stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrganizationStats();
  }, [organization?.id]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{organizationName} Overview</CardTitle>
        <CardDescription>
          Statistics and activity for your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Teams</p>
            {loading ? (
              <div className="h-7 bg-muted animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-semibold">{teamsCount}</p>
            )}
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Members</p>
            {loading ? (
              <div className="h-7 bg-muted animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-semibold">{membersCount}</p>
            )}
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Events</p>
            {loading ? (
              <div className="h-7 bg-muted animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-semibold">{eventsCount}</p>
            )}
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Bookings</p>
            {loading ? (
              <div className="h-7 bg-muted animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-semibold">{bookingsCount}</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Member Onboarding Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Profile Completion</span>
                {loading ? (
                  <div className="h-4 w-10 bg-muted animate-pulse rounded"></div>
                ) : (
                  <span className="text-muted-foreground">
                    {membersCount > 0 ? `${Math.round((membersCount - 1) / membersCount * 100)}%` : '0%'}
                  </span>
                )}
              </div>
              <Progress 
                value={membersCount > 0 ? Math.round((membersCount - 1) / membersCount * 100) : 0} 
                className="h-2" 
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Calendar Integration</span>
                {loading ? (
                  <div className="h-4 w-10 bg-muted animate-pulse rounded"></div>
                ) : (
                  <span className="text-muted-foreground">
                    {membersCount > 0 ? `${Math.round(Math.min(eventsCount / membersCount, 1) * 100)}%` : '0%'}
                  </span>
                )}
              </div>
              <Progress 
                value={membersCount > 0 ? Math.round(Math.min(eventsCount / membersCount, 1) * 100) : 0} 
                className="h-2" 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card showing team availability for team managers
function TeamAvailabilityCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Team Availability This Week</CardTitle>
        <CardDescription>
          Overview of your team's availability and schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              <span>Available</span>
            </div>
            <span className="text-muted-foreground">68%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
              <span>Partial</span>
            </div>
            <span className="text-muted-foreground">22%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
              <span>Unavailable</span>
            </div>
            <span className="text-muted-foreground">10%</span>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-3">Team members</h3>
          <div className="space-y-3">
            {['Alex Carter', 'Sam Rodriguez', 'Taylor Johnson', 'Jordan Smith'].map((name, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {name.split(' ').map(part => part[0]).join('')}
                  </div>
                  <span>{name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  index === 0 ? 'bg-green-500/10 text-green-500' :
                  index === 1 ? 'bg-green-500/10 text-green-500' :
                  index === 2 ? 'bg-orange-500/10 text-orange-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {index === 0 ? 'Available' :
                   index === 1 ? 'Available' :
                   index === 2 ? 'Partial' :
                   'Unavailable'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card showing trial status for basic users
function UserTrialCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Your Account Status</CardTitle>
        <CardDescription>
          Monitor your trial status and account usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="font-medium mb-2">Free Trial</h3>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Days Remaining</span>
              <span className="text-muted-foreground">10 of 14 days</span>
            </div>
            <Progress value={70} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your trial ends on April 10, 2025
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Calendar Events</p>
            <p className="text-2xl font-semibold">12</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Bookings</p>
            <p className="text-2xl font-semibold">5</p>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="outline" className="w-full">
            Upgrade Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}