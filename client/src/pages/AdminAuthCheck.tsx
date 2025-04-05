import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AuthStatusData {
  isAuthenticated: boolean;
  sessionData: {
    userId: number | null;
    username: string | null;
    userRole: string | null;
  };
  userData: any;
  environment: string;
  usingPostgres: boolean;
}

interface AuthCheckData {
  timestamp: string;
  environment: string;
  usingPostgres: boolean;
  sessionInfo: {
    exists: boolean;
    id: string;
    cookie: {
      maxAge: number;
      expires: string;
      secure: boolean;
      httpOnly: boolean;
    };
    userId: number | null;
    username: string | null;
    userRole: string | null;
  };
  database: {
    type: string;
    connected: boolean;
  };
  userCheck: {
    fetchSuccess: boolean;
    userData: any;
  };
  adminCheck: {
    isAdmin: boolean;
    apiAccessible: boolean;
  };
  problemUsersCheck: {
    fetchSuccess: boolean;
    usersFound: number;
    users: Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      organizationId: number | null;
      teamId: number | null;
    }>;
  };
}

export default function AdminAuthCheck() {
  const [authStatus, setAuthStatus] = useState<AuthStatusData | null>(null);
  const [authCheck, setAuthCheck] = useState<AuthCheckData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth-status');
        if (response.ok) {
          const data = await response.json();
          setAuthStatus(data);
        } else {
          console.error('Error fetching auth status:', response.statusText);
          toast({
            title: 'Error',
            description: `Failed to fetch auth status: ${response.statusText}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching auth status:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch auth status',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthStatus();
  }, [toast]);

  const runComprehensiveCheck = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/auth-check');
      if (response.ok) {
        const data = await response.json();
        setAuthCheck(data);
        toast({
          title: 'Success',
          description: 'Authentication diagnostics completed',
        });
      } else {
        console.error('Error running auth check:', response.statusText);
        toast({
          title: 'Error',
          description: `Failed to run auth check: ${response.statusText}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running auth check:', error);
      toast({
        title: 'Error',
        description: 'Failed to run auth check',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status Check</CardTitle>
            <CardDescription>Loading authentication status...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Authentication Diagnostics</h1>
        <div className="flex gap-2">
          <Button onClick={runComprehensiveCheck} disabled={isChecking}>
            {isChecking ? 'Running Diagnostics...' : 'Run Comprehensive Check'}
          </Button>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Auth Status</CardTitle>
            <CardDescription>Current user authentication status</CardDescription>
          </CardHeader>
          <CardContent>
            {authStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Authentication Status:</span>
                  <Badge variant={authStatus.isAuthenticated ? 'success' : 'destructive'}>
                    {authStatus.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Session Data:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div><strong>User ID:</strong> {authStatus.sessionData.userId || 'None'}</div>
                    <div><strong>Username:</strong> {authStatus.sessionData.username || 'None'}</div>
                    <div><strong>User Role:</strong> {authStatus.sessionData.userRole || 'None'}</div>
                  </div>
                </div>

                {authStatus.userData && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">User Data:</h3>
                    <div className="bg-secondary/50 p-3 rounded-md text-sm overflow-auto max-h-40">
                      <pre>{JSON.stringify(authStatus.userData, null, 2)}</pre>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2">Environment:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div><strong>Environment:</strong> {authStatus.environment}</div>
                    <div><strong>Using PostgreSQL:</strong> {authStatus.usingPostgres ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>No authentication data available</div>
            )}
          </CardContent>
        </Card>

        {authCheck && (
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Auth Diagnostics</CardTitle>
              <CardDescription>Detailed authentication system diagnostics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Timestamp & Environment:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div><strong>Timestamp:</strong> {new Date(authCheck.timestamp).toLocaleString()}</div>
                    <div><strong>Environment:</strong> {authCheck.environment}</div>
                    <div><strong>Using PostgreSQL:</strong> {authCheck.usingPostgres ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Session Information:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div className="flex items-center justify-between">
                      <span><strong>Session Exists:</strong></span>
                      <Badge variant={authCheck.sessionInfo.exists ? 'success' : 'destructive'}>
                        {authCheck.sessionInfo.exists ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div><strong>Session ID:</strong> {authCheck.sessionInfo.id}</div>
                    <div><strong>User ID:</strong> {authCheck.sessionInfo.userId || 'None'}</div>
                    <div><strong>Username:</strong> {authCheck.sessionInfo.username || 'None'}</div>
                    <div><strong>User Role:</strong> {authCheck.sessionInfo.userRole || 'None'}</div>
                    
                    <Separator className="my-2" />
                    
                    <div><strong>Cookie Max Age:</strong> {authCheck.sessionInfo.cookie?.maxAge / (60 * 60 * 24)} days</div>
                    <div><strong>Cookie Expires:</strong> {new Date(authCheck.sessionInfo.cookie?.expires).toLocaleString()}</div>
                    <div><strong>Cookie Secure:</strong> {authCheck.sessionInfo.cookie?.secure ? 'Yes' : 'No'}</div>
                    <div><strong>Cookie HTTP Only:</strong> {authCheck.sessionInfo.cookie?.httpOnly ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Database:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div><strong>Type:</strong> {authCheck.database.type}</div>
                    <div className="flex items-center justify-between">
                      <span><strong>Connected:</strong></span>
                      <Badge variant={authCheck.database.connected ? 'success' : 'destructive'}>
                        {authCheck.database.connected ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">User Check:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div className="flex items-center justify-between">
                      <span><strong>Fetch Success:</strong></span>
                      <Badge variant={authCheck.userCheck.fetchSuccess ? 'success' : 'destructive'}>
                        {authCheck.userCheck.fetchSuccess ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {authCheck.userCheck.userData && (
                      <div className="mt-2">
                        <div><strong>Username:</strong> {authCheck.userCheck.userData.username}</div>
                        <div><strong>Email:</strong> {authCheck.userCheck.userData.email}</div>
                        <div><strong>Role:</strong> {authCheck.userCheck.userData.role}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Admin Check:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div className="flex items-center justify-between">
                      <span><strong>Is Admin:</strong></span>
                      <Badge variant={authCheck.adminCheck.isAdmin ? 'success' : 'destructive'}>
                        {authCheck.adminCheck.isAdmin ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span><strong>Admin API Accessible:</strong></span>
                      <Badge variant={authCheck.adminCheck.apiAccessible ? 'success' : 'destructive'}>
                        {authCheck.adminCheck.apiAccessible ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Problem Users Check:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm">
                    <div className="flex items-center justify-between">
                      <span><strong>Fetch Success:</strong></span>
                      <Badge variant={authCheck.problemUsersCheck.fetchSuccess ? 'success' : 'destructive'}>
                        {authCheck.problemUsersCheck.fetchSuccess ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span><strong>Problem Users Found:</strong></span>
                      <Badge variant={authCheck.problemUsersCheck.usersFound > 0 ? 'warning' : 'success'}>
                        {authCheck.problemUsersCheck.usersFound}
                      </Badge>
                    </div>

                    {authCheck.problemUsersCheck.users.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium mb-1">Problem Users:</h4>
                        <div className="max-h-60 overflow-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1">ID</th>
                                <th className="text-left py-1">Username</th>
                                <th className="text-left py-1">Email</th>
                                <th className="text-left py-1">Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {authCheck.problemUsersCheck.users.map(user => (
                                <tr key={user.id} className="border-b">
                                  <td className="py-1">{user.id}</td>
                                  <td className="py-1">{user.username}</td>
                                  <td className="py-1">{user.email}</td>
                                  <td className="py-1">{user.role}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}