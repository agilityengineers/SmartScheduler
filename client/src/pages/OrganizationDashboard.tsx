import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useUser } from '@/context/UserContext';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import { AddOrgMemberModal } from '@/components/organization/AddOrgMemberModal';
import { useToast } from '@/hooks/use-toast';
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
import { PlusCircle, Pencil, Trash2, Users, Building, UserPlus } from 'lucide-react';
import { Team, User } from '@shared/schema';

export default function OrganizationDashboard() {
  const [location, navigate] = useLocation();
  const { user, organization, isCompanyAdmin } = useUser();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Redirect if not company admin
  useEffect(() => {
    if (!isCompanyAdmin) {
      navigate('/');
    }
  }, [isCompanyAdmin, navigate]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teams for this organization
      const teamsResponse = await fetch(`/api/organizations/${organization?.id}/teams`);
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setTeams(teamsData);
      }
      
      // Fetch members of this organization
      const membersResponse = await fetch(`/api/organizations/${organization?.id}/users`);
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch organization data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handlers for member operations
  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove organization member');
      }
      
      toast({
        title: 'Success',
        description: 'Member removed from organization successfully',
      });
      
      // Refresh the members list
      fetchData();
    } catch (error) {
      console.error('Error removing organization member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove organization member',
        variant: 'destructive',
      });
    }
  };

  const handleAddMemberSuccess = () => {
    toast({
      title: 'Success',
      description: 'New member added to the organization',
    });
    fetchData();
  };

  useEffect(() => {
    if (organization?.id) {
      fetchData();
    }
  }, [organization]);

  if (!isCompanyAdmin || !organization) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">
              {organization.name} Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-slate-400">
              Manage teams and members within your organization
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Organization Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">Teams</dt>
                    <dd className="text-2xl font-bold">{teams.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">Members</dt>
                    <dd className="text-2xl font-bold">{members.length}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Organization Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">Name</dt>
                    <dd className="text-sm">{organization.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-neutral-500 dark:text-slate-400">ID</dt>
                    <dd className="text-sm">{organization.id}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
          
          {/* Teams Section */}
          <div className="mb-8 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Teams</h2>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span>Add Team</span>
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          Loading teams...
                        </TableCell>
                      </TableRow>
                    ) : teams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No teams found. Create your first team!
                        </TableCell>
                      </TableRow>
                    ) : (
                      teams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{team.id}</TableCell>
                          <TableCell>{team.name}</TableCell>
                          <TableCell>0</TableCell>
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
          
          {/* Members Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Members</h2>
              <Button className="flex items-center gap-2" onClick={handleAddMember}>
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
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Loading members...
                        </TableCell>
                      </TableRow>
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No members found. Add members to your organization!
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
                          <TableCell>{member.teamId || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="text-red-500"
                                onClick={() => handleRemoveMember(member.id)}
                              >
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
      
      {/* Modals */}
      <AddOrgMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        organizationId={organization.id}
        onSuccess={handleAddMemberSuccess}
      />
    </div>
  );
}