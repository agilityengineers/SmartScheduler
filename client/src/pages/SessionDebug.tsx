import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface SessionData {
  sessionExists: boolean;
  sessionID: string | null;
  cookie: {
    maxAge: number;
    expires: string;
    secure: boolean;
    httpOnly: boolean;
  } | null;
  userId: number | null;
  username: string | null;
  userRole: string | null;
}

interface EnvironmentInfo {
  nodeEnv: string;
  usingPostgres: boolean;
  userAgent: string;
  isSecure: boolean;
  host: string;
}

export default function SessionDebug() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testValue, setTestValue] = useState('');
  const [isSettingTestValue, setIsSettingTestValue] = useState(false);
  const [isCheckingTestValue, setIsCheckingTestValue] = useState(false);
  const [retrievedTestValue, setRetrievedTestValue] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await fetch('/api/session-debug');
        if (response.ok) {
          const data = await response.json();
          setSessionData(data.session);
          setEnvInfo(data.environment);
        } else {
          console.error('Error fetching session data:', response.statusText);
          toast({
            title: 'Error',
            description: `Failed to fetch session data: ${response.statusText}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch session data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [toast]);

  const setSessionTestValue = async () => {
    if (!testValue) {
      toast({
        title: 'Error',
        description: 'Please enter a test value',
        variant: 'destructive',
      });
      return;
    }

    setIsSettingTestValue(true);
    try {
      const response = await fetch('/api/set-session-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: testValue }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test value set in session',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to set test value',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set test value',
        variant: 'destructive',
      });
    } finally {
      setIsSettingTestValue(false);
    }
  };

  const checkSessionTestValue = async () => {
    setIsCheckingTestValue(true);
    try {
      const response = await fetch('/api/get-session-test');
      if (response.ok) {
        const data = await response.json();
        setRetrievedTestValue(data.value);
        toast({
          title: 'Success',
          description: data.value ? 'Retrieved test value from session' : 'No test value found in session',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to retrieve test value',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retrieve test value',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingTestValue(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Debug</CardTitle>
            <CardDescription>Loading session information...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Session Diagnostics</h1>
        <div className="flex gap-2">
          <Link href="/auth-check">
            <Button variant="outline">Auth Diagnostics</Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>Current session information</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Session Exists:</span>
                  <Badge variant={sessionData.sessionExists ? 'default' : 'destructive'}>
                    {sessionData.sessionExists ? 'Yes' : 'No'}
                  </Badge>
                </div>

                {sessionData.sessionExists && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Session Details:</h3>
                      <div className="bg-secondary/50 p-3 rounded-md text-sm">
                        <div><strong>Session ID:</strong> {sessionData.sessionID || 'None'}</div>
                        <div><strong>User ID:</strong> {sessionData.userId || 'None'}</div>
                        <div><strong>Username:</strong> {sessionData.username || 'None'}</div>
                        <div><strong>User Role:</strong> {sessionData.userRole || 'None'}</div>
                      </div>
                    </div>

                    {sessionData.cookie && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Cookie Information:</h3>
                        <div className="bg-secondary/50 p-3 rounded-md text-sm">
                          <div><strong>Max Age:</strong> {Math.round(sessionData.cookie.maxAge / (60 * 60 * 24))} days</div>
                          <div><strong>Expires:</strong> {new Date(sessionData.cookie.expires).toLocaleString()}</div>
                          <div><strong>Secure:</strong> {sessionData.cookie.secure ? 'Yes' : 'No'}</div>
                          <div><strong>HTTP Only:</strong> {sessionData.cookie.httpOnly ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>No session data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
            <CardDescription>Server environment details</CardDescription>
          </CardHeader>
          <CardContent>
            {envInfo ? (
              <div className="space-y-4">
                <div className="bg-secondary/50 p-3 rounded-md text-sm">
                  <div><strong>NODE_ENV:</strong> {envInfo.nodeEnv}</div>
                  <div><strong>Using PostgreSQL:</strong> {envInfo.usingPostgres ? 'Yes' : 'No'}</div>
                  <div><strong>Request Secure:</strong> {envInfo.isSecure ? 'Yes' : 'No'}</div>
                  <div><strong>Host:</strong> {envInfo.host}</div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">User Agent:</h3>
                  <div className="bg-secondary/50 p-3 rounded-md text-sm break-words">
                    {envInfo.userAgent}
                  </div>
                </div>
              </div>
            ) : (
              <div>No environment data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Persistence Test</CardTitle>
            <CardDescription>
              Test if session values persist between requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="testValue" className="text-sm font-medium">Test Value</label>
                  <div className="flex gap-2">
                    <input 
                      id="testValue"
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter a value to store in session"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                    />
                    <Button 
                      onClick={setSessionTestValue}
                      disabled={isSettingTestValue || !testValue}
                    >
                      {isSettingTestValue ? 'Setting...' : 'Set'}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retrieved Value</label>
                  <div className="flex gap-2">
                    <div className="w-full px-3 py-2 border bg-secondary/30 rounded-md">
                      {retrievedTestValue === null ? 'Not retrieved yet' : retrievedTestValue || 'No value found'}
                    </div>
                    <Button 
                      onClick={checkSessionTestValue}
                      disabled={isCheckingTestValue}
                    >
                      {isCheckingTestValue ? 'Checking...' : 'Check'}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary/40 p-3 rounded-md text-sm">
                <p className="text-xs text-muted-foreground">
                  <strong>How to use:</strong> Enter a test value and click "Set" to store it in your session. 
                  Then click "Check" to retrieve the value from your session. If the values match, your session is working correctly.
                  For testing session persistence, set a value, then reload the page and click "Check" to see if the value persists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}