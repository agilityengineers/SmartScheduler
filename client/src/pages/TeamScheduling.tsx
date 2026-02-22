import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  Clock,
  RefreshCw,
  UsersRound
} from 'lucide-react';
import { BookingLink } from '@shared/schema';

interface Team {
  id: number;
  name: string;
  description: string | null;
  organizationId: number;
}

interface TeamUser {
  id: number;
  username: string;
  displayName: string | null;
  email: string;
}

export default function TeamScheduling() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const { toast } = useToast();
  const { user, isCompanyAdmin, isAdmin } = useUser();

  // Fetch organization teams (for company admins)
  const { data: organizationTeams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/teams`],
    enabled: isCompanyAdmin && !!user?.organizationId,
  });

  // Fetch all teams (for system admins)
  const { data: allTeams = [], isLoading: allTeamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    enabled: isAdmin,
  });

  // Determine which teams to show
  const teams = isAdmin ? allTeams : organizationTeams;
  const isLoadingTeams = isAdmin ? allTeamsLoading : teamsLoading;

  // Fetch all booking links
  const { data: bookingLinks = [], isLoading: linksLoading } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking'],
  });

  // Filter to only team booking links
  const teamBookingLinks = bookingLinks.filter(link => link.isTeamBooking && link.teamId);

  // Group booking links by team
  const bookingLinksByTeam = teams.reduce((acc, team) => {
    acc[team.id] = teamBookingLinks.filter(link => link.teamId === team.id);
    return acc;
  }, {} as Record<number, BookingLink[]>);

  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  const getAssignmentMethodLabel = (method: string | null | undefined) => {
    switch (method) {
      case 'round-robin':
        return 'Round Robin';
      case 'equal-distribution':
        return 'Equal Distribution';
      case 'pooled':
        return 'Pooled';
      case 'specific':
        return 'Specific';
      case 'hybrid':
        return 'Hybrid';
      default:
        return 'Round Robin';
    }
  };

  const navigateToCreateBookingLink = (teamId: number) => {
    // Navigate to booking links page with team pre-selected
    window.location.href = `/booking?create=true&teamId=${teamId}`;
  };

  if (!isCompanyAdmin && !isAdmin) {
    return (
      <div className="flex flex-col h-screen bg-neutral-50 dark:bg-slate-950">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar onCreateEvent={handleCreateEvent} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto text-center py-12">
              <UsersRound className="h-16 w-16 mx-auto text-neutral-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Team Scheduling is only available for Company Admins and System Admins.
              </p>
            </div>
          </main>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50 dark:bg-slate-950">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Team Scheduling</h1>
                <p className="text-muted-foreground mt-1">
                  Create and manage round-robin booking links for your teams
                </p>
              </div>
              <Button onClick={() => window.location.href = '/booking?create=true'}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team Booking Link
              </Button>
            </div>

            {/* Loading state */}
            {(isLoadingTeams || linksLoading) && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* No teams state */}
            {!isLoadingTeams && teams.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-16 w-16 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Teams Found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {isCompanyAdmin
                      ? "Your organization doesn't have any teams yet. Create a team in the Admin Center to get started with team scheduling."
                      : "No teams are available in the system. Create teams in the Admin Center to enable team scheduling."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.href = '/admin?tab=organizations'}
                  >
                    Go to Admin Center
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Teams list */}
            {!isLoadingTeams && teams.length > 0 && (
              <div className="space-y-6">
                {teams.map((team) => (
                  <Card key={team.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            {team.description && (
                              <CardDescription>{team.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateToCreateBookingLink(team.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Round-Robin Link
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Team booking links */}
                      {bookingLinksByTeam[team.id]?.length > 0 ? (
                        <div className="space-y-3">
                          {bookingLinksByTeam[team.id].map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <LinkIcon className="h-4 w-4 text-neutral-500" />
                                <div>
                                  <p className="font-medium text-sm">{link.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {getAssignmentMethodLabel(link.assignmentMethod)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {link.duration} min
                                    </span>
                                    {link.isCollective && (
                                      <Badge variant="outline" className="text-xs">
                                        Collective
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.location.href = `/booking?edit=${link.id}`}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const url = `${window.location.origin}/${link.slug}`;
                                    window.open(url, '_blank');
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <p className="text-sm">No round-robin booking links for this team yet.</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigateToCreateBookingLink(team.id)}
                          >
                            Create your first one
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Help section */}
            <Card className="mt-8 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">How Round-Robin Works</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Round-robin automatically distributes incoming bookings evenly across your team members.
                      Each team member gets assigned meetings in rotation, ensuring fair workload distribution.
                      You can also configure weighted distribution to assign more meetings to specific team members.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <MobileNavigation />
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />
    </div>
  );
}
