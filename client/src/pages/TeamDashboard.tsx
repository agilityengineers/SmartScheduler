import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useUser } from '@/context/UserContext';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, UserPlus, CalendarDays } from 'lucide-react';
import { User, Event } from '@shared/schema';

export default function TeamDashboard() {
  const [location, navigate] = useLocation();
  const { user, team, organization, isTeamManager } = useUser();
  const [members, setMembers] = useState<User[]>([]);
  const [teamEvents, setTeamEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not team manager
  useEffect(() => {
    if (!isTeamManager) {
      navigate('/');
    }
  }, [isTeamManager, navigate]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch team members
        const membersResponse = await fetch(`/api/teams/${team?.id}/users`);
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setMembers(membersData);
        }
        
        // Fetch team events
        const eventsResponse = await fetch(`/api/teams/${team?.id}/events`);
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setTeamEvents(eventsData);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (team?.id) {
      fetchData();
    }
  }, [team]);

  if (!isTeamManager || !team) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">
              {team.name} Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-slate-400">
              Manage your team's members and schedule
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Team Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">Name</dt>
                    <dd className="text-sm">{team.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">Organization</dt>
                    <dd className="text-sm">{organization?.name || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">ID</dt>
                    <dd className="text-sm">{team.id}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col justify-between h-full">
                  <div className="text-3xl font-bold">{members.length}</div>
                  <Button variant="outline" className="mt-4 w-full flex items-center justify-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Manage Members</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col justify-between h-full">
                  <div className="text-3xl font-bold">{teamEvents.length}</div>
                  <Button variant="outline" className="mt-4 w-full flex items-center justify-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Schedule Event</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Team Members Section */}
          <div className="mb-8 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Team Members</h2>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Loading team members...
                        </TableCell>
                      </TableRow>
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No members found. Add members to your team!
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.id}</TableCell>
                          <TableCell>{member.username}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.displayName || '-'}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          {/* Team Schedule Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Team Schedule</h2>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Create Event</span>
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Attendees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Loading team events...
                        </TableCell>
                      </TableRow>
                    ) : teamEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No events found. Schedule your first team event!
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>{event.id}</TableCell>
                          <TableCell>{event.title}</TableCell>
                          <TableCell>{new Date(event.startTime).toLocaleString()}</TableCell>
                          <TableCell>{new Date(event.endTime).toLocaleString()}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}