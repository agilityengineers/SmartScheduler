import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import { UserRole, User } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function AdminCheck() {
  const { user, setUser, isAdmin } = useUser();
  const { toast } = useToast();
  const [localStorageData, setLocalStorageData] = useState<string | null>(null);
  const [parsedUser, setParsedUser] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  
  useEffect(() => {
    const userData = localStorage.getItem('user');
    setLocalStorageData(userData);
    
    try {
      if (userData) {
        const parsedData = JSON.parse(userData);
        setParsedUser(parsedData);
      }
    } catch (error) {
      console.error('Error parsing localStorage data:', error);
    }
    
    // Fetch all users using the debug endpoint
    fetchAllUsers();
  }, []);
  
  const fetchAllUsers = async () => {
    setDebugLoading(true);
    setDebugError(null);
    
    try {
      const response = await fetch('/api/debug/all-users');
      
      if (response.ok) {
        const users = await response.json();
        setAllUsers(users);
        console.log('Debug endpoint returned users:', users);
      } else {
        const errorText = await response.text();
        setDebugError(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching users from debug endpoint:', error);
      setDebugError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDebugLoading(false);
    }
  };
  
  const handleFixAdminRole = () => {
    if (user && user.username === 'admin') {
      const updatedUser = { ...user, role: UserRole.ADMIN };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast({
        title: 'Admin role fixed',
        description: 'Your role has been updated to admin',
      });
      
      // Refresh the component state
      const userData = localStorage.getItem('user');
      setLocalStorageData(userData);
      
      try {
        if (userData) {
          const parsedData = JSON.parse(userData);
          setParsedUser(parsedData);
        }
      } catch (error) {
        console.error('Error parsing localStorage data:', error);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Admin Role Check</h1>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current User State</CardTitle>
                <CardDescription>
                  Information about your current user state and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">User Context Data:</h3>
                  <pre className="bg-black/5 p-4 rounded-md overflow-auto">
                    {user ? JSON.stringify(user, null, 2) : 'No user data'}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">User Role Status:</h3>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">Is Admin: </span>
                    <span className={isAdmin ? "text-green-600" : "text-red-600"}>
                      {isAdmin ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">User Role Value:</h3>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">Role: </span>
                    <span>{user?.role || "No role"}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-bold">Expected Admin Role: </span>
                    <span>{UserRole.ADMIN}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-bold">Case-insensitive match: </span>
                    <span className={user?.role?.toLowerCase() === UserRole.ADMIN.toLowerCase() ? "text-green-600" : "text-red-600"}>
                      {user?.role?.toLowerCase() === UserRole.ADMIN.toLowerCase() ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {user?.username === 'admin' && !isAdmin && (
                  <Button onClick={handleFixAdminRole}>
                    Fix Admin Role
                  </Button>
                )}
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>All Users in Database</CardTitle>
                <CardDescription>
                  Debug view of all users from the direct database endpoint
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugLoading ? (
                  <div className="text-center py-4">Loading users data...</div>
                ) : debugError ? (
                  <div className="text-red-500 p-4 border border-red-200 rounded-md">
                    {debugError}
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Username</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.length > 0 ? (
                          allUsers.map(user => (
                            <tr key={user.id} className="border-b">
                              <td className="p-2">{user.id}</td>
                              <td className="p-2">{user.username}</td>
                              <td className="p-2">{user.email}</td>
                              <td className="p-2">
                                <span className={user.role === UserRole.ADMIN ? "font-bold text-blue-600" : ""}>
                                  {user.role}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center p-4">No users found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={fetchAllUsers} disabled={debugLoading}>
                  Refresh Users Data
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>localStorage Data</CardTitle>
                <CardDescription>
                  Raw data from localStorage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium mb-1">Raw localStorage 'user' value:</h3>
                <pre className="bg-black/5 p-4 rounded-md overflow-auto">
                  {localStorageData || 'No data in localStorage'}
                </pre>
                
                <h3 className="font-medium mb-1 mt-4">Parsed localStorage user:</h3>
                <pre className="bg-black/5 p-4 rounded-md overflow-auto">
                  {parsedUser ? JSON.stringify(parsedUser, null, 2) : 'Could not parse localStorage data'}
                </pre>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Link href="/admin-access">
                  <Button variant="outline">
                    Go to Admin Access Page
                  </Button>
                </Link>
                <Link href="/admin-debug">
                  <Button variant="outline">
                    Go to Debug Dashboard
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}