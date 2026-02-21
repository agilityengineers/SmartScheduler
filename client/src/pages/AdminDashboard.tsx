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
import { PlusCircle, Pencil, Trash2, Users, Building, UserPlus, CreditCard, Shield, Settings, Globe, Clock, Key, Mail, RefreshCw, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Organization, Team, UserRole, UserRoleType } from '@shared/schema';

// Audit Log inline component
function AuditLogView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '20', offset: String(offset) });
    if (filterAction) params.set('action', filterAction);
    fetch(`/api/audit-logs?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setLogs(data.logs || []); setTotal(data.total || 0); })
      .catch(() => {});
  }, [offset, filterAction]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <select
          className="text-sm border rounded px-2 py-1"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setOffset(0); }}
        >
          <option value="">All actions</option>
          <option value="login">Login</option>
          <option value="user_create">User Create</option>
          <option value="user_update">User Update</option>
          <option value="settings_change">Settings Change</option>
          <option value="booking_create">Booking Create</option>
          <option value="booking_cancel">Booking Cancel</option>
          <option value="domain_add">Domain Add</option>
        </select>
        <span className="text-xs text-muted-foreground">{total} total entries</span>
      </div>
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {logs.length === 0 && <p className="text-sm text-muted-foreground">No audit log entries found.</p>}
        {logs.map((log: any) => (
          <div key={log.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700 text-sm">
            <div className="flex-1">
              <span className="font-medium">{log.action}</span>
              {log.entityType && <span className="text-muted-foreground ml-2">on {log.entityType} #{log.entityId}</span>}
              <div className="text-xs text-muted-foreground">
                User #{log.userId} &middot; {log.ipAddress || 'unknown IP'} &middot; {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      {total > 20 && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</Button>
          <Button size="sm" variant="outline" disabled={offset + 20 >= total} onClick={() => setOffset(offset + 20)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// Domain Control inline component
function DomainControlView() {
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');

  const loadDomains = () => {
    fetch('/api/domain-controls', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDomains(data); })
      .catch(() => {});
  };

  useEffect(() => { loadDomains(); }, []);

  const addDomain = () => {
    if (!newDomain) return;
    fetch('/api/domain-controls', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain, autoJoin: false }),
    }).then(() => { setNewDomain(''); loadDomains(); });
  };

  const verifyDomain = (id: number) => {
    fetch(`/api/domain-controls/${id}/verify`, { method: 'POST', credentials: 'include' })
      .then(() => loadDomains());
  };

  const removeDomain = (id: number) => {
    fetch(`/api/domain-controls/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => loadDomains());
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="e.g., acme.com"
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" onClick={addDomain}>Add</Button>
      </div>
      {domains.length === 0 && <p className="text-sm text-muted-foreground">No domains configured.</p>}
      {domains.map((d: any) => (
        <div key={d.id} className="flex items-center justify-between p-2 border rounded text-sm">
          <div>
            <span className="font-medium">{d.domain}</span>
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${d.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {d.isVerified ? 'Verified' : 'Pending'}
            </span>
            {d.autoJoin && <span className="ml-1 text-xs text-muted-foreground">(auto-join)</span>}
          </div>
          <div className="flex gap-1">
            {!d.isVerified && <Button size="sm" variant="outline" onClick={() => verifyDomain(d.id)}>Verify</Button>}
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeDomain(d.id)}>Remove</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Data Retention inline component
function DataRetentionView() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [entityType, setEntityType] = useState('bookings');
  const [days, setDays] = useState(90);

  const loadPolicies = () => {
    fetch('/api/data-retention', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPolicies(data); })
      .catch(() => {});
  };

  useEffect(() => { loadPolicies(); }, []);

  const addPolicy = () => {
    fetch('/api/data-retention', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, retentionDays: days }),
    }).then(() => loadPolicies());
  };

  const deletePolicy = (id: number) => {
    fetch(`/api/data-retention/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => loadPolicies());
  };

  const runPolicy = (id: number) => {
    fetch(`/api/data-retention/${id}/run`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: false }),
    }).then(r => r.json()).then(() => loadPolicies());
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Entity Type</label>
          <select className="w-full text-sm border rounded px-2 py-1.5" value={entityType} onChange={e => setEntityType(e.target.value)}>
            <option value="bookings">Bookings</option>
            <option value="audit_logs">Audit Logs</option>
            <option value="events">Events</option>
            <option value="workflow_executions">Workflow Executions</option>
            <option value="webhook_logs">Webhook Logs</option>
          </select>
        </div>
        <div className="w-24">
          <label className="text-xs text-muted-foreground">Days</label>
          <Input type="number" min={1} value={days} onChange={e => setDays(parseInt(e.target.value) || 90)} />
        </div>
        <Button size="sm" onClick={addPolicy}>Add</Button>
      </div>
      {policies.length === 0 && <p className="text-sm text-muted-foreground">No retention policies configured.</p>}
      {policies.map((p: any) => (
        <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
          <div>
            <span className="font-medium">{p.entityType}</span>
            <span className="text-muted-foreground ml-2">{p.retentionDays} days</span>
            {p.lastRunAt && <span className="text-xs text-muted-foreground ml-2">Last run: {new Date(p.lastRunAt).toLocaleDateString()}</span>}
            <span className="text-xs text-muted-foreground ml-2">Deleted: {p.deletedCount || 0}</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => runPolicy(p.id)}>Run</Button>
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deletePolicy(p.id)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// SCIM Config inline component
function ScimConfigView() {
  const [config, setConfig] = useState<any>(null);
  const [showToken, setShowToken] = useState(false);
  const [fullToken, setFullToken] = useState('');

  const loadConfig = () => {
    // We need the user's org ID. Try fetching from the user context
    fetch('/api/user', { credentials: 'include' })
      .then(r => r.json())
      .then(user => {
        if (user.organizationId) {
          fetch(`/api/scim/config/${user.organizationId}`, { credentials: 'include' })
            .then(r => { if (r.ok) return r.json(); throw new Error('not found'); })
            .then(data => setConfig(data))
            .catch(() => setConfig(null));
        }
      });
  };

  useEffect(() => { loadConfig(); }, []);

  const createConfig = () => {
    fetch('/api/user', { credentials: 'include' })
      .then(r => r.json())
      .then(user => {
        if (!user.organizationId) return;
        fetch('/api/scim/config', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: user.organizationId }),
        })
          .then(r => r.json())
          .then(data => { setConfig(data); setFullToken(data.bearerToken); setShowToken(true); });
      });
  };

  const deleteConfig = () => {
    if (config) {
      fetch(`/api/scim/config/${config.id}`, { method: 'DELETE', credentials: 'include' })
        .then(() => { setConfig(null); setFullToken(''); });
    }
  };

  return (
    <div className="space-y-3">
      {!config ? (
        <div>
          <p className="text-sm text-muted-foreground mb-2">SCIM provisioning is not configured. Enable it to auto-sync users from your identity provider.</p>
          <Button size="sm" onClick={createConfig}>Enable SCIM</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="p-2 border rounded text-sm">
            <p className="font-medium">SCIM Endpoint</p>
            <code className="text-xs text-muted-foreground break-all">{window.location.origin}/api/scim/v2</code>
          </div>
          <div className="p-2 border rounded text-sm">
            <p className="font-medium">Bearer Token</p>
            {showToken && fullToken ? (
              <code className="text-xs text-muted-foreground break-all">{fullToken}</code>
            ) : (
              <code className="text-xs text-muted-foreground">{config.bearerToken}</code>
            )}
          </div>
          {config.provisionedCount > 0 && (
            <p className="text-xs text-muted-foreground">Provisioned users: {config.provisionedCount}</p>
          )}
          <Button size="sm" variant="destructive" onClick={deleteConfig}>Disable SCIM</Button>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [location, navigate] = useLocation();
  const { user, isAdmin } = useUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'organizations' | 'teams' | 'audit' | 'enterprise'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'organizations' || tab === 'teams' || tab === 'audit' || tab === 'enterprise') return tab;
    return 'users';
  });
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
  const [passwordMode, setPasswordMode] = useState<'manual' | 'auto-generate'>('auto-generate');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [newRole, setNewRole] = useState<UserRoleType>(UserRole.USER);
  const [newUserOrganizationId, setNewUserOrganizationId] = useState<number | null>(null);
  const [newUserTeamId, setNewUserTeamId] = useState<number | null>(null);
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
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRoleType>(UserRole.USER);
  const [editOrganizationId, setEditOrganizationId] = useState<number | null>(null);
  const [editTeamId, setEditTeamId] = useState<number | null>(null);
  const [editEmailVerified, setEditEmailVerified] = useState<boolean>(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgDescription, setEditOrgDescription] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  const [editTeamOrgId, setEditTeamOrgId] = useState<number | null>(null);

  // Search and filter states
  // Users tab filters
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userOrgFilter, setUserOrgFilter] = useState<string>("all");
  const [userTeamFilter, setUserTeamFilter] = useState<string>("all");
  const [userVerifiedFilter, setUserVerifiedFilter] = useState<string>("all");

  // Organizations tab filters
  const [orgSearchQuery, setOrgSearchQuery] = useState("");

  // Teams tab filters
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamOrgFilter, setTeamOrgFilter] = useState<string>("all");

  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = userSearchQuery === "" ||
      user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()));

    const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter;
    const matchesOrg = userOrgFilter === "all" || user.organizationId?.toString() === userOrgFilter;
    const matchesTeam = userTeamFilter === "all" || user.teamId?.toString() === userTeamFilter;
    const matchesVerified = userVerifiedFilter === "all" ||
      (userVerifiedFilter === "verified" ? user.emailVerified : !user.emailVerified);

    return matchesSearch && matchesRole && matchesOrg && matchesTeam && matchesVerified;
  });

  const filteredOrganizations = organizations.filter(org => {
    return orgSearchQuery === "" ||
      org.name.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
      (org.description && org.description.toLowerCase().includes(orgSearchQuery.toLowerCase()));
  });

  const filteredTeams = teams.filter(team => {
    const matchesSearch = teamSearchQuery === "" ||
      team.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(teamSearchQuery.toLowerCase()));

    const matchesOrg = teamOrgFilter === "all" || team.organizationId?.toString() === teamOrgFilter;

    return matchesSearch && matchesOrg;
  });

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
        console.log("AdminDashboard: Attempting to fetch users from /api/admin/users endpoint");
        // Use the admin-only endpoint to get all users (requires authentication)
        const usersResponse = await fetch('/api/admin/users', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
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
        console.log("AdminDashboard: Attempting to fetch organizations from /api/admin/organizations");
        const orgsResponse = await fetch('/api/admin/organizations', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
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
        console.log("AdminDashboard: Attempting to fetch teams from /api/admin/teams");
        const teamsResponse = await fetch('/api/admin/teams', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
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
    // Validate password is provided if manual mode
    if (passwordMode === 'manual' && !newPassword) {
      toast({
        title: 'Error',
        description: 'Password is required when using manual password mode',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: passwordMode === 'manual' ? newPassword : undefined,
          passwordMode: passwordMode,
          sendWelcomeEmail: sendWelcomeEmail,
          role: newRole,
          organizationId: newUserOrganizationId,
          teamId: newUserTeamId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: result.emailSent
          ? 'User created successfully. Credentials email sent.'
          : 'User created successfully',
      });

      // Reset form
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setPasswordMode('auto-generate');
      setSendWelcomeEmail(true);
      setNewRole(UserRole.USER);
      setNewUserOrganizationId(null);
      setNewUserTeamId(null);
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
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditDisplayName(user.displayName || '');
    // Cast the user role to UserRoleType to match our state type
    setEditRole(user.role as UserRoleType);
    setEditOrganizationId(user.organizationId || null);
    setEditTeamId(user.teamId || null);
    setEditEmailVerified(user.emailVerified === true);
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
          firstName: editFirstName,
          lastName: editLastName,
          displayName: editDisplayName,
          role: editRole,
          organizationId: editOrganizationId,
          teamId: editTeamId,
          emailVerified: editEmailVerified,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
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
        description: error instanceof Error ? error.message : 'Failed to update user',
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

  const resendCredentials = async (userId: number, userEmail: string) => {
    try {
      const response = await fetch('/api/admin/resend-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resend credentials');
      }

      toast({
        title: 'Success',
        description: `New credentials sent to ${userEmail}`,
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error resending credentials:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend credentials',
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

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
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

          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as typeof activeTab)} className="w-full">
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
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Audit Log</span>
                <span className="sm:hidden">Audit</span>
              </TabsTrigger>
              <TabsTrigger value="enterprise" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Enterprise</span>
                <span className="sm:hidden">Ent.</span>
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

              {/* Search and Filters */}
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-4 space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search users by name, email, or username..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filter Dropdowns */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Role:</Label>
                      <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.COMPANY_ADMIN}>Company Admin</SelectItem>
                          <SelectItem value={UserRole.TEAM_MANAGER}>Team Manager</SelectItem>
                          <SelectItem value={UserRole.USER}>User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Organization:</Label>
                      <Select value={userOrgFilter} onValueChange={setUserOrgFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="All Organizations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Organizations</SelectItem>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Team:</Label>
                      <Select value={userTeamFilter} onValueChange={setUserTeamFilter}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="All Teams" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Verified:</Label>
                      <Select value={userVerifiedFilter} onValueChange={setUserVerifiedFilter}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="unverified">Not Verified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results count */}
                  {(userSearchQuery || userRoleFilter !== "all" || userOrgFilter !== "all" || userTeamFilter !== "all" || userVerifiedFilter !== "all") && (
                    <p className="text-sm text-muted-foreground">
                      Found {filteredUsers.length} of {users.length} users
                    </p>
                  )}
                </CardContent>
              </Card>

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
                          <TableCell colSpan={9} className="text-center py-4">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4">
                            {users.length === 0 ? "No users found." : "No users match your search criteria."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
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
                                  title="Resend credentials"
                                  onClick={() => resendCredentials(user.id, user.email)}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  title="Edit user"
                                  onClick={() => prepareEditUser(user)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-red-500"
                                  title="Delete user"
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

              {/* Search */}
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search organizations by name..."
                      value={orgSearchQuery}
                      onChange={(e) => setOrgSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Results count */}
                  {orgSearchQuery && (
                    <p className="text-sm text-muted-foreground">
                      Found {filteredOrganizations.length} of {organizations.length} organizations
                    </p>
                  )}
                </CardContent>
              </Card>

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
                      ) : filteredOrganizations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            {organizations.length === 0 ? "No organizations found." : "No organizations match your search criteria."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrganizations.map((org) => (
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

              {/* Search and Filters */}
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-4 space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search teams by name..."
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Organization:</Label>
                      <Select value={teamOrgFilter} onValueChange={setTeamOrgFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="All Organizations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Organizations</SelectItem>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results count */}
                  {(teamSearchQuery || teamOrgFilter !== "all") && (
                    <p className="text-sm text-muted-foreground">
                      Found {filteredTeams.length} of {teams.length} teams
                    </p>
                  )}
                </CardContent>
              </Card>

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
                      ) : filteredTeams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            {teams.length === 0 ? "No teams found." : "No teams match your search criteria."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTeams.map((team) => (
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

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Audit Log</h2>
              </div>
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-6">
                  <AuditLogView />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Enterprise Tab */}
            <TabsContent value="enterprise" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Enterprise Settings</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Domain Control
                    </CardTitle>
                    <CardDescription>Restrict sign-ups to approved email domains</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DomainControlView />
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Data Retention
                    </CardTitle>
                    <CardDescription>Automatically delete old data per policy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataRetentionView />
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      SCIM Provisioning
                    </CardTitle>
                    <CardDescription>Auto-sync users from identity providers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScimConfigView />
                  </CardContent>
                </Card>
              </div>
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
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Password
                  </Label>
                  <div className="col-span-3 space-y-3">
                    <RadioGroup
                      value={passwordMode}
                      onValueChange={(value) => setPasswordMode(value as 'manual' | 'auto-generate')}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto-generate" id="auto-generate" />
                        <Label htmlFor="auto-generate" className="font-normal cursor-pointer">
                          Auto-generate password
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="font-normal cursor-pointer">
                          Set password manually
                        </Label>
                      </div>
                    </RadioGroup>
                    {passwordMode === 'manual' && (
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Notify User
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="sendWelcomeEmail"
                      checked={sendWelcomeEmail}
                      onCheckedChange={(checked) => setSendWelcomeEmail(checked as boolean)}
                    />
                    <Label htmlFor="sendWelcomeEmail" className="font-normal cursor-pointer">
                      Send welcome email with credentials
                    </Label>
                  </div>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user-organization" className="text-right">
                    Organization
                  </Label>
                  <Select
                    value={newUserOrganizationId?.toString() || "none"}
                    onValueChange={(value) => {
                      const orgId = value === "none" ? null : parseInt(value);
                      setNewUserOrganizationId(orgId);
                      // Reset team selection when organization changes
                      if (orgId !== newUserOrganizationId) {
                        setNewUserTeamId(null);
                      }
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select organization (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Organization</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user-team" className="text-right">
                    Team
                  </Label>
                  <Select
                    value={newUserTeamId?.toString() || "none"}
                    onValueChange={(value) => setNewUserTeamId(value === "none" ? null : parseInt(value))}
                    disabled={!newUserOrganizationId}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={newUserOrganizationId ? "Select team (optional)" : "Select organization first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team</SelectItem>
                      {teams
                        .filter((team) => team.organizationId === newUserOrganizationId)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
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
                  <Label htmlFor="edit-first-name" className="text-right">
                    First Name
                  </Label>
                  <Input
                    id="edit-first-name"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-last-name" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    id="edit-last-name"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-display-name" className="text-right">
                    Display Name
                  </Label>
                  <Input
                    id="edit-display-name"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-verified" className="text-right">
                    Verified
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="edit-verified"
                      checked={editEmailVerified}
                      onCheckedChange={setEditEmailVerified}
                    />
                    <Label htmlFor="edit-verified" className="font-normal">
                      {editEmailVerified ? 'Email verified' : 'Email not verified'}
                    </Label>
                  </div>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-organization" className="text-right">
                    Organization
                  </Label>
                  <Select
                    value={editOrganizationId?.toString() || "none"}
                    onValueChange={(value) => {
                      const orgId = value === "none" ? null : parseInt(value);
                      setEditOrganizationId(orgId);
                      // Reset team selection when organization changes
                      if (orgId !== editOrganizationId) {
                        setEditTeamId(null);
                      }
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Organization</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-team" className="text-right">
                    Team
                  </Label>
                  <Select
                    value={editTeamId?.toString() || "none"}
                    onValueChange={(value) => setEditTeamId(value === "none" ? null : parseInt(value))}
                    disabled={!editOrganizationId}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={editOrganizationId ? "Select team" : "Select organization first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team</SelectItem>
                      {teams
                        .filter((team) => team.organizationId === editOrganizationId)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
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