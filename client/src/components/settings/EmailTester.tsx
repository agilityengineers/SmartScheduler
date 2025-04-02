import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface TestResultType {
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

export default function EmailTester() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<TestResultType | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const sendTestEmail = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setLastResult(null);
      
      const response = await axios.post('/api/email/test', { email });
      
      // Store the response
      setLastResult({
        success: true,
        message: response.data.message,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Email sent successfully',
        description: 'Check your inbox for the test email',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      
      // Store error details
      setLastResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Failed to send email',
        description: error.response?.data?.message || error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Service Tester</CardTitle>
        <CardDescription>
          Test email delivery by sending a verification email to any address.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Email Testing Tool</AlertTitle>
            <AlertDescription>
              This tool will send a test email to verify that the email service is working correctly. 
              Use this to test email delivery in the production environment.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the email address where you want to receive the test message
            </p>
          </div>

          {/* Last result details */}
          {lastResult && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Last Test Result:
                    <span className={`ml-2 ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                      {lastResult.success ? 'Success' : 'Failed'}
                    </span>
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                </div>
                
                {showDetails && (
                  <div className="rounded bg-muted p-3 text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(lastResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={sendTestEmail} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardFooter>
    </Card>
  );
}