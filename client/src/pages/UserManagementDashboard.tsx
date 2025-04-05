import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, Organization, Team } from '@shared/schema';
import { AlertCircle, CheckCircle, Search, UserPlus, Building, Users, RefreshCw } from 'lucide-react';

// Create a simple loader component since we don't have a dedicated LoadingSpinner
type SpinnerSize = "sm" | "md" | "lg";

const LoadingSpinner = ({ size = "md" }: { size?: SpinnerSize }) => {
  const sizeClass: Record<SpinnerSize, string> = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };
  
  return (
    <div className={`animate-spin text-primary ${sizeClass[size]}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </div>
  );
};

export default function UserManagementDashboard() {
  const { user, isAdmin, isCompanyAdmin, isTeamManager } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<number | null>(null);
  const [teamFilter, setTeamFilter] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Data fetching with React Query
  const { data: allUsers, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = 
    useQuery<User[]>({ 
      queryKey: ['/api/users/all'],
      enabled: isAdmin || isCompanyAdmin || isTeamManager
    });

  const { data: organizations, isLoading: orgsLoading } = 
    useQuery<Organization[]>({ 
      queryKey: ['/api/organizations'],
      enabled: isAdmin || isCompanyAdmin
    });

  const { data: teams, isLoading: teamsLoading } = 
    useQuery<Team[]>({ 
      queryKey: ['/api/teams'],
      enabled: isAdmin || isCompanyAdmin || isTeamManager
    });

  // Filter users based on search and role permissions
  const getFilteredUsers = () => {
    if (!allUsers) return [];

    let filteredUsers = allUsers;
    
    // Apply role-based filtering
    if (isCompanyAdmin && !isAdmin) {
      filteredUsers = filteredUsers.filter(
        u => u.organizationId === user?.organizationId
      );
    } else if (isTeamManager && !isAdmin && !isCompanyAdmin) {
      filteredUsers = filteredUsers.filter(
        u => u.teamId === user?.teamId
      );
    }

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(
        u => u.username.toLowerCase().includes(term) ||
             u.email.toLowerCase().includes(term) ||
             u.role.toLowerCase().includes(term)
      );
    }

    // Apply organization filter
    if (organizationFilter) {
      filteredUsers = filteredUsers.filter(u => u.organizationId === organizationFilter);
    }

    // Apply team filter
    if (teamFilter) {
      filteredUsers = filteredUsers.filter(u => u.teamId === teamFilter);
    }

    return filteredUsers;
  };

  const filteredUsers = getFilteredUsers();
  
  // Not authorized
  if (!isAdmin && !isCompanyAdmin && !isTeamManager) {
    return <Redirect to="/admin-access" />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management Dashboard</h1>
        <Button onClick={() => refetchUsers()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {usersError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Users</AlertTitle>
          <AlertDescription>
            Failed to load user data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Overview</CardTitle>
            <CardDescription>
              {isAdmin 
                ? 'View and manage all users across the platform' 
                : isCompanyAdmin 
                  ? 'View and manage users in your organization'
                  : 'View and manage users in your team'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Search users..." 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>

              {isAdmin && organizations && (
                <select 
                  className="ml-2 p-2 border rounded-md"
                  value={organizationFilter || ''}
                  onChange={(e) => setOrganizationFilter(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}

              {(isAdmin || isCompanyAdmin) && teams && (
                <select 
                  className="ml-2 p-2 border rounded-md"
                  value={teamFilter || ''}
                  onChange={(e) => setTeamFilter(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              )}
            </div>

            {(usersLoading || orgsLoading || teamsLoading) ? (
              <div className="flex justify-center items-center h-60">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">No users found matching your criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Team</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(user => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                user.role === 'company_admin' ? 'bg-blue-100 text-blue-800' :
                                user.role === 'team_manager' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'}`}>
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              {organizations?.find(o => o.id === user.organizationId)?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {teams?.find(t => t.id === user.teamId)?.name || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredUsers.length}</div>
            </CardContent>
          </Card>
          
          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{organizations?.length || 0}</div>
              </CardContent>
            </Card>
          )}
          
          {(isAdmin || isCompanyAdmin) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Teams</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teams?.length || 0}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}