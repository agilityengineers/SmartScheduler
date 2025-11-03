import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Pencil, Trash2, Users, Building, UserPlus, CreditCard } from 'lucide-react';
import { User, Organization, Team, UserRole, UserRoleType } from '@shared/schema';

export default function AdminDashboard() {
  const [location, navigate] = useLocation();
  const { user, isAdmin } = useUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'organizations' | 'teams'>('users');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showEditOrgDialog, setShowEditOrgDialog] = useState(false);
  const [showEditTeamDialog, setShowEditTeamDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states - New entities
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRoleType>(UserRole.USER);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamOrgId, setNewTeamOrgId] = useState<number | null>(null);

  // Edit states - Current entities
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRoleType>(UserRole.USER);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDescription, setEditOrgDescription] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  const [editTeamOrgId, setEditTeamOrgId] = useState<number | null>(null);

  // Handle admin access check with more detailed debugging
  useEffect(() => {
    console.log('AdminDashboard: User role check', { 
      user: user?.username, 
      role: user?.role,
      roleType: typeof user?.role,
      isAdminValue: isAdmin,
      adminRoleValue: UserRole.ADMIN,
      roleMatch: user?.role === UserRole.ADMIN,
      lowerCaseMatch: user?.role?.toLowerCase() === UserRole.ADMIN.toLowerCase()
    });

    // Check if user is loaded but not admin
    if (user && !isAdmin) {
      console.log('AdminDashboard: User is loaded but not admin, redirecting to admin access page');
      toast({
        title: "Access Denied",
        description: "You don't have administrator privileges.",
        variant: "destructive"
      });

      // Redirect to login page
      navigate('/login');
      return;
    }

    // If no user at all, wait for a short timeout and then check again
    if (!user) {
      console.log('AdminDashboard: No user loaded yet, waiting...');

      // Give the app a moment to load user data from localStorage or session
      const timer = setTimeout(() => {
        if (!user) {
          console.log('AdminDashboard: Still no user after waiting, redirecting to login');
          toast({
            title: "Authentication Required",
            description: "Please log in to access the admin dashboard.",
            variant: "destructive"
          });
          navigate('/login');
        }
      }, 1500); // 1.5 second delay

      return () => clearTimeout(timer);
    }
  }, [isAdmin, navigate, user, toast]);

  // Function to fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        console.log("AdminDashboard: Attempting to fetch users from /api/debug/all-users endpoint");
        // Use the more reliable debug endpoint to get all users including those without org/team
        const usersResponse = await fetch('/api/debug/all-users');
        console.log("AdminDashboard: Users API response status:", usersResponse.status);
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          console.log("AdminDashboard: Fetched users successfully:", usersData);
          setUsers(usersData);

          // Log the environment to help debug production vs development
          console.log("AdminDashboard: Current environment:", import.meta.env.MODE);
        } else {
          console.error("AdminDashboard: Failed to fetch users", usersResponse.status);
          // Try to get the error details
          try {
            const errorData = await usersResponse.json();
            console.error("AdminDashboard: Error details:", errorData);
          } catch (e) {
            console.error("AdminDashboard: Could not parse error response");
          }
        }
      }

      if (activeTab === 'organizations') {
        console.log("AdminDashboard: Attempting to fetch organizations from /api/organizations");
        const orgsResponse = await fetch('/api/organizations');
        console.log("AdminDashboard: Organizations API response status:", orgsResponse.status);
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          console.log("AdminDashboard: Fetched organizations successfully:", orgsData);
          setOrganizations(orgsData);
        } else {
          console.error("AdminDashboard: Failed to fetch organizations", orgsResponse.status);
          // Try to get the error details
          try {
            const errorData = await orgsResponse.json();
            console.error("AdminDashboard: Organization error details:", errorData);
          } catch (e) {
            console.error("AdminDashboard: Could not parse organization error response");
          }
        }
      }

      if (activeTab === 'teams') {
        console.log("AdminDashboard: Attempting to fetch teams from /api/teams");
        const teamsResponse = await fetch('/api/teams');
        console.log("AdminDashboard: Teams API response status:", teamsResponse.status);
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          console.log("AdminDashboard: Fetched teams successfully:", teamsData);
          setTeams(teamsData);
        } else {
          console.error("AdminDashboard: Failed to fetch teams", teamsResponse.status);
          // Try to get the error details
          try {
            const errorData = await teamsResponse.json();
            console.error("AdminDashboard: Teams error details:", errorData);
          } catch (e) {
            console.error("AdminDashboard: Could not parse teams error response");
          }
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // User operations
  const addUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      toast({
        title: 'Success',
        description: 'User created successfully',
      });

      // Reset form
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole(UserRole.USER);
      setShowAddUserDialog(false);

      // Refresh data
      console.log('Refreshing user data after adding a new user');
      setActiveTab('users');
      await fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const prepareEditUser = (user: User) => {
    setCurrentUser(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    // Cast the user role to UserRoleType to match our state type
    setEditRole(user.role as UserRoleType);
    setShowEditUserDialog(true);
  };

  const updateUser = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          role: editRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      // Reset form and close dialog
      setCurrentUser(null);
      setShowEditUserDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const prepareDeleteUser = (userId: number) => {
    setDeleteId(userId);
    setShowDeleteUserDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/users/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      // Reset state and close dialog
      setDeleteId(null);
      setShowDeleteUserDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  // Organization operations
  const addOrganization = async () => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newOrgName,
          description: newOrgDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create organization');
      }

      toast({
        title: 'Success',
        description: 'Organization created successfully',
      });

      // Reset form
      setNewOrgName('');
      setNewOrgDescription('');
      setShowAddOrgDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to create organization',
        variant: 'destructive',
      });
    }
  };

  const prepareEditOrg = (org: Organization) => {
    setCurrentOrg(org);
    setEditOrgName(org.name);
    setEditOrgDescription(org.description || '');
    setShowEditOrgDialog(true);
  };

  const updateOrganization = async () => {
    if (!currentOrg) return;

    try {
      const response = await fetch(`/api/organizations/${currentOrg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editOrgName,
          description: editOrgDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });

      // Reset form and close dialog
      setCurrentOrg(null);
      setShowEditOrgDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to update organization',
        variant: 'destructive',
      });
    }
  };

  const prepareDeleteOrg = (orgId: number) => {
    setDeleteId(orgId);
    setShowDeleteOrgDialog(true);
  };

  const confirmDeleteOrg = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/organizations/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete organization');
      }

      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });

      // Reset state and close dialog
      setDeleteId(null);
      setShowDeleteOrgDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete organization',
        variant: 'destructive',
      });
    }
  };

  // Team operations
  const addTeam = async () => {
    if (!newTeamOrgId) {
      toast({
        title: 'Error',
        description: 'Please select an organization for this team',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
          organizationId: newTeamOrgId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      toast({
        title: 'Success',
        description: 'Team created successfully',
      });

      // Reset form
      setNewTeamName('');
      setNewTeamDescription('');
      setNewTeamOrgId(null);
      setShowAddTeamDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

  const prepareEditTeam = (team: Team) => {
    setCurrentTeam(team);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description || '');
    setEditTeamOrgId(team.organizationId);
    setShowEditTeamDialog(true);
  };

  const updateTeam = async () => {
    if (!currentTeam || !editTeamOrgId) {
      toast({
        title: 'Error',
        description: 'Please select an organization for this team',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTeamName,
          description: editTeamDescription,
          organizationId: editTeamOrgId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update team');
      }

      toast({
        title: 'Success',
        description: 'Team updated successfully',
      });

      // Reset form and close dialog
      setCurrentTeam(null);
      setShowEditTeamDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team',
        variant: 'destructive',
      });
    }
  };

  const prepareDeleteTeam = (teamId: number) => {
    setDeleteId(teamId);
    setShowDeleteTeamDialog(true);
  };

  const confirmDeleteTeam = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/teams/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      toast({
        title: 'Success',
        description: 'Team deleted successfully',
      });

      // Reset state and close dialog
      setDeleteId(null);
      setShowDeleteTeamDialog(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Handle loading state and non-admin users with a better UI
  if (!user) {
    return (
      <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
        <AppHeader />

        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Loading User Data</CardTitle>
              <CardDescription>
                Checking authentication status...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
        <AppHeader />

        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have administrator privileges to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-neutral-600 dark:text-slate-400">
                Your current role: <span className="font-semibold">{user.role || "Unknown"}</span>
              </p>
              <p className="text-neutral-600 dark:text-slate-400">
                If you believe this is an error, please contact your system administrator.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto p-6">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-neutral-600 dark:text-slate-400">
                Manage users, organizations, and teams
              </p>
            </div>
            <Link to="/admin/subscriptions">
              <Button className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Subscription Management</span>
              </Button>
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'users' | 'organizations' | 'teams')} className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="organizations" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Organizations</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Teams</span>
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">All Users</h2>
                <Button className="flex items-center gap-2" onClick={() => setShowAddUserDialog(true)}>
                  <UserPlus className="h-4 w-4" />
                  <span>Add User</span>
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
                        <TableHead>Organization</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            No users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.displayName || '-'}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>
                              {user.organizationId 
                                ? (organizations.find(o => o.id === user.organizationId)?.name || user.organizationId)
                                : <span className="text-yellow-600 dark:text-yellow-500">None</span>}
                            </TableCell>
                            <TableCell>
                              {user.teamId 
                                ? (teams.find(t => t.id === user.teamId)?.name || user.teamId)
                                : <span className="text-yellow-600 dark:text-yellow-500">None</span>}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.emailVerified === true ? 'bg-green-100 text-green-800' : 
                                user.emailVerified === false ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.emailVerified === true ? 'Verified' : 
                                 user.emailVerified === false ? 'Unverified' : 
                                 'Pending'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => prepareEditUser(user)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="text-red-500"
                                  onClick={() => prepareDeleteUser(user.id)}
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
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">All Organizations</h2>
                <Button className="flex items-center gap-2" onClick={() => setShowAddOrgDialog(true)}>
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Organization</span>
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Teams</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Loading organizations...
                          </TableCell>
                        </TableRow>
                      ) : organizations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No organizations found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        organizations.map((org) => (
                          <TableRow key={org.id}>
                            <TableCell>{org.id}</TableCell>
                            <TableCell>{org.name}</TableCell>
                            <TableCell>0</TableCell>
                            <TableCell>0</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => prepareEditOrg(org)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="text-red-500"
                                  onClick={() => prepareDeleteOrg(org.id)}
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
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">All Teams</h2>
                <Button className="flex items-center gap-2" onClick={() => setShowAddTeamDialog(true)}>
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
                        <TableHead>Organization</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Loading teams...
                          </TableCell>
                        </TableRow>
                      ) : teams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No teams found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        teams.map((team) => (
                          <TableRow key={team.id}>
                            <TableCell>{team.id}</TableCell>
                            <TableCell>{team.name}</TableCell>
                            <TableCell>
                              {organizations.find(o => o.id === team.organizationId)?.name || team.organizationId}
                            </TableCell>
                            <TableCell>0</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline"
                                  size="icon"
                                  onClick={() => prepareEditTeam(team)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="text-red-500"
                                  onClick={() => prepareDeleteTeam(team.id)}
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
            </TabsContent>
          </Tabs>

          {/* Add User Dialog */}
          <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select 
                    value={newRole} 
                    onValueChange={(value) => setNewRole(value as UserRoleType)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.COMPANY_ADMIN}>Company Admin</SelectItem>
                      <SelectItem value={UserRole.TEAM_MANAGER}>Team Manager</SelectItem>
                      <SelectItem value={UserRole.USER}>User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={addUser}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Organization Dialog */}
          <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgDescription" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="orgDescription"
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddOrgDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={addOrganization}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Team Dialog */}
          <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Team</DialogTitle>
                <DialogDescription>
                  Create a new team. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamDescription" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="teamDescription"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamOrg" className="text-right">
                    Organization
                  </Label>
                  <Select 
                    value={newTeamOrgId?.toString() || ''} 
                    onValueChange={(value) => setNewTeamOrgId(parseInt(value))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddTeamDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={addTeam}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Edit user details. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-username" className="text-right">
                    Username
                  </Label>
                  <Input
                    id="edit-username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-role" className="text-right">
                    Role
                  </Label>
                  <Select 
                    value={editRole} 
                    onValueChange={(value) => setEditRole(value as UserRoleType)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.COMPANY_ADMIN}>Company Admin</SelectItem>
                      <SelectItem value={UserRole.TEAM_MANAGER}>Team Manager</SelectItem>
                      <SelectItem value={UserRole.USER}>User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={updateUser}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Organization Dialog */}
          <Dialog open={showEditOrgDialog} onOpenChange={setShowEditOrgDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Organization</DialogTitle>
                <DialogDescription>
                  Edit organization details. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-orgName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="edit-orgName"
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-orgDescription" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="edit-orgDescription"
                    value={editOrgDescription}
                    onChange={(e) => setEditOrgDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditOrgDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={updateOrganization}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Team Dialog */}
          <Dialog open={showEditTeamDialog} onOpenChange={setShowEditTeamDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Team</DialogTitle>
                <DialogDescription>
                  Edit team details. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-teamName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="edit-teamName"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-teamDescription" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="edit-teamDescription"
                    value={editTeamDescription}
                    onChange={(e) => setEditTeamDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-teamOrg" className="text-right">
                    Organization
                  </Label>
                  <Select 
                    value={editTeamOrgId?.toString() || ''} 
                    onValueChange={(value) => setEditTeamOrgId(parseInt(value))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditTeamDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={updateTeam}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowDeleteUserDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Organization Confirmation Dialog */}
        <Dialog open={showDeleteOrgDialog} onOpenChange={setShowDeleteOrgDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Organization Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this organization? All teams and user associations will be affected. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowDeleteOrgDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteOrg}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Team Confirmation Dialog */}
        <Dialog open={showDeleteTeamDialog} onOpenChange={setShowDeleteTeamDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Team Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this team? All user associations will be affected. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowDeleteTeamDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteTeam}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}