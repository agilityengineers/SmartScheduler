import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface EmailConfigType {
  emailServiceConfigured: boolean;
  fromEmail: string;
}

interface TestResultType {
  success: boolean;
  details?: {
    to?: string;
    emailType?: string;
    sendGridConfigured?: boolean;
  };
  error?: string;
  timestamp: string;
}

export default function EmailTester() {
  const [emailType, setEmailType] = useState('default');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfigType | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [lastResult, setLastResult] = useState<TestResultType | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Check email configuration on component mount
  const checkEmailConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await axios.get('/api/debug/email-config');
      setEmailConfig(response.data);
    } catch (error) {
      console.error('Error checking email configuration:', error);
      setEmailConfig(null);
    } finally {
      setConfigLoading(false);
    }
  };

  // Check configuration when component mounts
  useEffect(() => {
    checkEmailConfig();
  }, []);

  const sendTestEmail = async () => {
    try {
      setIsLoading(true);
      setLastResult(null);
      
      const response = await axios.post('/api/test/send-email', { 
        emailType,
        recipientEmail: recipientEmail.trim() || undefined
      });
      
      // Store the response for detailed view
      setLastResult({
        success: true,
        details: response.data.details,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Email sent successfully',
        description: 'Check your inbox for the test email',
        variant: 'default',
      });
      
      // Update the config information
      checkEmailConfig();
    } catch (error: any) {
      console.error('Error sending test email:', error);
      
      // Store error details
      setLastResult({
        success: false,
        details: error.response?.data?.details || {},
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
        <CardTitle>Email Notification Tester</CardTitle>
        <CardDescription>
          Test the email notification system by sending yourself a test email.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Email configuration status */}
          <div className="mb-4">
            {configLoading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm">Checking email configuration...</p>
              </div>
            ) : emailConfig ? (
              <Alert variant={emailConfig.emailServiceConfigured ? "default" : "destructive"}>
                <AlertTitle>
                  Email Service Status: 
                  {emailConfig.emailServiceConfigured ? (
                    <Badge className="ml-2 bg-green-500">Configured</Badge>
                  ) : (
                    <Badge className="ml-2 bg-red-500">Not Configured</Badge>
                  )}
                </AlertTitle>
                <AlertDescription>
                  {emailConfig.emailServiceConfigured ? (
                    <div className="text-sm mt-1">
                      Emails will be sent from <strong>{emailConfig.fromEmail}</strong>
                    </div>
                  ) : (
                    <div className="text-sm mt-1">
                      SendGrid API key is not configured. Email functionality will not work correctly.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Unable to check email configuration</AlertTitle>
                <AlertDescription>
                  Could not verify email service configuration. Please try again later.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Type</label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Simple Test Email</SelectItem>
                <SelectItem value="reminder">Event Reminder</SelectItem>
                <SelectItem value="booking">Booking Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Email (optional)</label>
            <Input
              type="email"
              placeholder="Enter email address to send to"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use your account email
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
          disabled={isLoading || (emailConfig && !emailConfig.emailServiceConfigured) || false}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardFooter>
    </Card>
  );
}