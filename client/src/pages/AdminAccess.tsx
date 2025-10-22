import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import { useUser } from '@/context/UserContext';

/**
 * Admin Access Page
 * 
 * This is an alternative way to access the admin dashboard
 * for authorized users when the normal admin dashboard access may have issues.
 */
export default function AdminAccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, setUser } = useUser();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [directAccessAttempted, setDirectAccessAttempted] = useState(false);
  
  // Check for direct access via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directAccessToken = params.get('token');
    
    if (directAccessToken === 'admin-direct-access-12345') {
      console.log('AdminAccess: Direct access token detected in URL');
      setDirectAccessAttempted(true);
      
      // Get the current user from localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          
          // Only allow admin user to use this direct access
          if (userData.username === 'admin') {
            // Force the role to be 'admin' (lowercase)
            userData.role = 'admin';
            
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update context
            setUser({...userData});
            
            toast({
              title: 'Direct Admin Access Granted',
              description: 'You now have access to admin features via direct link',
            });
            
            // Redirect to admin dashboard
            setTimeout(() => {
              window.location.href = '/admin';
            }, 1000);
          } else {
            toast({
              title: 'Direct Access Denied',
              description: 'This link can only be used with the admin account',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('Error parsing user from localStorage for direct access:', err);
        }
      } else {
        toast({
          title: 'Login Required',
          description: 'Please log in as admin before using this direct access link',
          variant: 'destructive',
        });
        
        // Redirect to login page with return URL
        navigate('/login?returnUrl=/admin-access?token=admin-direct-access-12345');
      }
    }
  }, []);

  // A simple access code verification for admin dashboard
  // In production, this would be a more secure mechanism
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if this is the admin access code
      if (accessCode === 'admin123') {
        // Get the current user from localStorage to verify
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          toast({
            title: 'Error',
            description: 'You need to be logged in to access admin features',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        try {
          const user = JSON.parse(userStr);
          
          console.log('AdminAccess: Current user data from localStorage:', {
            username: user.username,
            role: user.role
          });
          
          // Temporary admin access - directly override role in localStorage to ensure UI shows admin features
          if (user.username === 'admin') {
            // Force the role to be 'admin' (lowercase)
            user.role = 'admin';
            
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(user));
            
            // Show success message
            toast({
              title: 'Admin Access Granted',
              description: 'You now have access to admin features',
            });
            
            // Force page reload to refresh context with new role
            console.log('AdminAccess: Reloading page with updated user role');
            setTimeout(() => {
              window.location.href = '/admin';
            }, 1000);
            return;
          }
          
          // If username is not 'admin'
          toast({
            title: 'Access Denied',
            description: 'Only users with admin credentials can access this feature',
            variant: 'destructive',
          });
        } catch (err) {
          console.error('Error parsing user from localStorage:', err);
          toast({
            title: 'Error',
            description: 'Failed to verify user credentials',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Invalid Code',
          description: 'The access code you entered is not valid',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accessing admin features:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get the direct access URL for sharing
  const getDirectAccessUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/admin-access?token=admin-direct-access-12345`;
  };

  // Function to copy direct access link to clipboard
  const copyDirectAccessLink = () => {
    const directAccessUrl = getDirectAccessUrl();
    navigator.clipboard.writeText(directAccessUrl).then(() => {
      toast({
        title: "Link Copied!",
        description: "Admin direct access link copied to clipboard",
      });
    }).catch((err) => {
      console.error("Failed to copy link: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-md space-y-6">
            {/* Show info message if direct access was attempted */}
            {directAccessAttempted && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Direct Access Attempted</AlertTitle>
                <AlertDescription>
                  We're processing your direct admin access request. If you're not redirected automatically, please try logging in as admin first.
                </AlertDescription>
              </Alert>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Admin Access</CardTitle>
                <CardDescription>
                  Enter the admin access code to unlock admin features
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Access Code</Label>
                    <Input
                      id="accessCode"
                      type="password"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Enter access code"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Verifying...' : 'Access Admin Dashboard'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            {/* Direct access link section - only visible if logged in and username is admin */}
            {user && user.username === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle>Direct Access Link</CardTitle>
                  <CardDescription>
                    Share this link with admin users who need direct access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Important Security Notice</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      This direct access link should only be shared with authorized admin users.
                      Users must log in with admin credentials before using the link.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="mt-2 p-3 bg-neutral-100 dark:bg-slate-800 rounded-md text-neutral-700 dark:text-slate-300 text-sm font-mono break-all">
                    {getDirectAccessUrl()}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={copyDirectAccessLink} className="w-full">
                    Copy Direct Access Link
                  </Button>
                </CardFooter>
              </Card>
            )}
            
            {/* Instructions for using the access */}
            <Card>
              <CardHeader>
                <CardTitle>How To Use Admin Access</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Log in with your admin account credentials</li>
                  <li>Enter the access code in the field above</li>
                  <li>You will be redirected to the admin dashboard with admin privileges</li>
                  <li>Alternatively, use the direct access link if provided to you</li>
                </ol>
                <p className="mt-4 text-sm text-neutral-500">
                  Note: This is a special access method for use when normal admin dashboard access is not working properly.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}