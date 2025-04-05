import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';

interface SessionDebugData {
  timestamp: string;
  message: string;
  sessionData: {
    id: string;
    exists: boolean;
    isNew: boolean;
    cookie: {
      maxAge: number;
      expires: string;
      secure: boolean;
      httpOnly: boolean;
      domain: string | null;
      path: string;
      sameSite: string | boolean | null;
    } | null;
    userId: number | null;
    username: string | null;
    userRole: string | null;
  };
  environmentInfo: {
    nodeEnv: string;
    usingPostgres: boolean;
    hostname: string;
    protocol: string;
    secure: boolean;
    ip: string;
    originalUrl: string;
    headers: {
      host: string;
      userAgent: string;
      referer: string;
      cookieLength: number;
    };
  };
  sessionStore: {
    type: string;
    writeTest: {
      success: boolean;
      testValue?: string;
      error?: string;
    };
  };
}

export default function SessionDebug() {
  const [sessionData, setSessionData] = useState<SessionDebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSessionDebug = async () => {
    setLoading(true);
    setFetchError(null);
    
    try {
      const response = await fetch('/api/session-debug');
      
      if (!response.ok) {
        const errorMsg = `Error fetching session data: ${response.status} ${response.statusText}`;
        setFetchError(errorMsg);
        toast({
          title: "Error fetching session data",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }
      
      const data = await response.json();
      setSessionData(data);
      
      toast({
        title: "Session data loaded",
        description: "Successfully retrieved session diagnostic information.",
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setFetchError(`Failed to fetch session data: ${errorMsg}`);
      toast({
        title: "Error",
        description: `Failed to fetch session data: ${errorMsg}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDebug();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format time remaining in cookie
  const formatTimeRemaining = (maxAge: number) => {
    if (maxAge <= 0) return 'Expired';
    
    const hours = Math.floor(maxAge / 3600);
    const minutes = Math.floor((maxAge % 3600) / 60);
    const seconds = maxAge % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Session Diagnostics</h1>
            
            <div className="space-x-2">
              <Button onClick={fetchSessionDebug} disabled={loading} size="sm" className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Link href="/admin-check">
                <Button variant="outline" size="sm">Auth Check</Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {fetchError && (
              <Alert variant="destructive" className="col-span-full">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{fetchError}</AlertDescription>
              </Alert>
            )}
            
            {loading && !sessionData && (
              <Card className="col-span-full">
                <CardContent className="pt-6">
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3">Loading session data...</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {sessionData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Session Information</CardTitle>
                    <CardDescription>
                      Current session data from server as of {formatDate(sessionData.timestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-1">Session ID:</h3>
                      <div className="bg-neutral-100 dark:bg-slate-800 p-2 rounded-md overflow-x-auto">
                        <code>{sessionData.sessionData.id || 'No session ID'}</code>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-1">Status:</h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={sessionData.sessionData.exists ? "default" : "destructive"}>
                            {sessionData.sessionData.exists ? 'Exists' : 'Missing'}
                          </Badge>
                          {sessionData.sessionData.isNew && (
                            <Badge variant="outline">New Session</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-1">Session Store:</h3>
                        <Badge variant="outline">{sessionData.sessionStore.type}</Badge>
                        <Badge 
                          variant={sessionData.sessionStore.writeTest.success ? "default" : "destructive"}
                          className="ml-2"
                        >
                          {sessionData.sessionStore.writeTest.success ? 'Write Test OK' : 'Write Test Failed'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-1">User ID:</h3>
                        <Badge variant={sessionData.sessionData.userId ? "default" : "destructive"}>
                          {sessionData.sessionData.userId || 'Not set'}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-1">Username:</h3>
                        <Badge variant={sessionData.sessionData.username ? "default" : "destructive"}>
                          {sessionData.sessionData.username || 'Not set'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-1">User Role:</h3>
                      <Badge variant={sessionData.sessionData.userRole ? "default" : "destructive"}>
                        {sessionData.sessionData.userRole || 'Not set'}
                      </Badge>
                    </div>
                    
                    {sessionData.sessionData.cookie && (
                      <div>
                        <h3 className="font-medium mb-1">Cookie Information:</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Max Age:</span> {formatTimeRemaining(sessionData.sessionData.cookie.maxAge)}
                          </div>
                          <div>
                            <span className="font-medium">Expires:</span> {formatDate(sessionData.sessionData.cookie.expires)}
                          </div>
                          <div>
                            <span className="font-medium">Secure:</span> {sessionData.sessionData.cookie.secure ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="font-medium">HTTP Only:</span> {sessionData.sessionData.cookie.httpOnly ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="font-medium">Path:</span> {sessionData.sessionData.cookie.path}
                          </div>
                          <div>
                            <span className="font-medium">Same Site:</span> {sessionData.sessionData.cookie.sameSite ? String(sessionData.sessionData.cookie.sameSite) : 'Not set'}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Environment Information</CardTitle>
                    <CardDescription>
                      Server and request environment details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-1">Node Environment:</h3>
                        <Badge variant="outline">{sessionData.environmentInfo.nodeEnv}</Badge>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-1">Database:</h3>
                        <Badge variant="outline">
                          {sessionData.environmentInfo.usingPostgres ? 'PostgreSQL' : 'In-Memory'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-1">Protocol:</h3>
                        <Badge variant={sessionData.environmentInfo.secure ? "default" : "destructive"}>
                          {sessionData.environmentInfo.protocol.toUpperCase()}
                          {sessionData.environmentInfo.secure ? ' (Secure)' : ' (Not Secure)'}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-1">Hostname:</h3>
                        <div className="truncate max-w-[200px]">
                          <Badge variant="outline">{sessionData.environmentInfo.hostname}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-1">Request Headers:</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Host:</span> {sessionData.environmentInfo.headers.host}
                        </div>
                        <div>
                          <span className="font-medium">Cookie Length:</span> {sessionData.environmentInfo.headers.cookieLength} bytes
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">User Agent:</span>
                          <div className="truncate text-xs mt-1 bg-neutral-100 dark:bg-slate-800 p-1 rounded-md">
                            {sessionData.environmentInfo.headers.userAgent}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-full">
                  <CardHeader>
                    <CardTitle>Troubleshooting Guide</CardTitle>
                    <CardDescription>
                      Common session issues and how to fix them
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert variant={sessionData.sessionData.userId ? "default" : "destructive"}>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Session User ID {sessionData.sessionData.userId ? 'Present' : 'Missing'}</AlertTitle>
                        <AlertDescription>
                          {sessionData.sessionData.userId 
                            ? 'Session contains a user ID, which is required for authentication.'
                            : 'Session is missing a user ID. This indicates you are not logged in or there is a session storage problem.'}
                        </AlertDescription>
                      </Alert>
                      
                      <Alert variant={sessionData.sessionStore.writeTest.success ? "default" : "destructive"}>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Session Write Test {sessionData.sessionStore.writeTest.success ? 'Passed' : 'Failed'}</AlertTitle>
                        <AlertDescription>
                          {sessionData.sessionStore.writeTest.success 
                            ? 'The server can successfully write to the session store.'
                            : `The server failed to write to the session store. Error: ${sessionData.sessionStore.writeTest.error || 'Unknown'}`}
                        </AlertDescription>
                      </Alert>
                      
                      {sessionData.sessionData.cookie && sessionData.sessionData.cookie.secure && !sessionData.environmentInfo.secure && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Secure Cookie / Insecure Connection Mismatch</AlertTitle>
                          <AlertDescription>
                            The session cookie is set to secure, but the connection is not using HTTPS.
                            This will prevent the browser from sending the cookie.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex flex-col space-y-2 w-full">
                      <div className="text-sm text-neutral-600 dark:text-slate-400">
                        If you're experiencing authentication issues, try:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          localStorage.removeItem('user');
                          window.location.href = '/login';
                        }}>
                          Clear Local Storage & Logout
                        </Button>
                        
                        <Button variant="outline" size="sm" onClick={() => {
                          fetch('/api/logout', { method: 'POST' })
                            .then(() => {
                              localStorage.removeItem('user');
                              window.location.href = '/login';
                            });
                        }}>
                          Server Logout
                        </Button>
                        
                        <Link href="/admin-check">
                          <Button variant="outline" size="sm">
                            Admin Auth Check
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}