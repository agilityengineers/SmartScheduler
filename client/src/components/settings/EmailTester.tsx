import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Network, Wifi } from 'lucide-react';

interface TestResultType {
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

interface DiagnosticResultType {
  success: boolean;
  diagnostics: {
    success: boolean;
    results: Record<string, any>;
    errors: Record<string, any>;
  };
  timestamp: string;
  emailConfig: {
    fromEmail: string;
    fromEmailConfigured: boolean;
    sendgridKeyConfigured: boolean;
    sendgridKeyLength: number;
  };
}

export default function EmailTester() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiagnosticLoading, setIsDiagnosticLoading] = useState(false);
  const [lastResult, setLastResult] = useState<TestResultType | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResultType | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDiagnosticDetails, setShowDiagnosticDetails] = useState(false);

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

  const runNetworkDiagnostics = async () => {
    try {
      setIsDiagnosticLoading(true);
      setDiagnosticResult(null);
      
      const response = await axios.get('/api/email/diagnostics');
      setDiagnosticResult(response.data);
      
      toast({
        title: response.data.diagnostics.success ? 'Network Diagnostics Passed' : 'Network Issues Detected',
        description: response.data.diagnostics.success 
          ? 'All connectivity tests to SendGrid were successful.' 
          : 'Some connectivity issues were detected. Check the detailed report.',
        variant: response.data.diagnostics.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Error running network diagnostics:', error);
      
      toast({
        title: 'Failed to run diagnostics',
        description: error.response?.data?.message || error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDiagnosticLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Service Tester</CardTitle>
        <CardDescription>
          Test email delivery and diagnose connectivity issues in the production environment.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="test">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="test" className="flex-1">Send Test Email</TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex-1">Network Diagnostics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="test" className="space-y-4">
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
            
            <div className="pt-4">
              <Button 
                onClick={sendTestEmail} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="diagnostics" className="space-y-4">
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Production Environment Diagnostics</AlertTitle>
              <AlertDescription>
                This tool tests network connectivity from your server to SendGrid services.
                Use it to identify potential network issues in the production environment.
              </AlertDescription>
            </Alert>
            
            <Button
              variant="outline"
              onClick={runNetworkDiagnostics}
              disabled={isDiagnosticLoading}
              className="w-full"
            >
              <Network className="mr-2 h-4 w-4" />
              {isDiagnosticLoading ? 'Running Diagnostics...' : 'Run Network Diagnostics'}
            </Button>
            
            {diagnosticResult && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className={`p-3 ${diagnosticResult.diagnostics.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="flex items-center">
                    {diagnosticResult.diagnostics.success ? 
                      <CheckCircle2 className="h-5 w-5 mr-2" /> : 
                      <AlertCircle className="h-5 w-5 mr-2" />
                    }
                    <span className="font-semibold">
                      {diagnosticResult.diagnostics.success ? 
                        "All connectivity tests passed" : 
                        "Connectivity issues detected"
                      }
                    </span>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setShowDiagnosticDetails(!showDiagnosticDetails)}
                    >
                      {showDiagnosticDetails ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </div>
                </div>
                
                {showDiagnosticDetails && (
                  <div className="p-4 bg-muted">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Configuration</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-background rounded border">
                          <strong>Environment:</strong> {diagnosticResult.environment}
                        </div>
                        <div className="p-2 bg-background rounded border">
                          <strong>Timestamp:</strong> {new Date(diagnosticResult.timestamp).toLocaleString()}
                        </div>
                        <div className="p-2 bg-background rounded border">
                          <strong>From Email:</strong> {diagnosticResult.emailConfig.fromEmail || "Not configured"}
                        </div>
                        <div className="p-2 bg-background rounded border">
                          <strong>SendGrid API Key:</strong> {diagnosticResult.emailConfig.sendgridKeyConfigured ? 
                            `Configured (${diagnosticResult.emailConfig.sendgridKeyLength} chars)` : 
                            "Not configured"}
                        </div>
                      </div>
                    </div>
                    
                    {/* DNS Test Results */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">DNS Resolution</h4>
                      {diagnosticResult.diagnostics.results.dns_lookup ? (
                        <div className="text-xs bg-green-50 p-2 rounded border border-green-200">
                          <p className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            <strong>Status:</strong> Success
                          </p>
                          <p><strong>Resolved IPs:</strong> {diagnosticResult.diagnostics.results.dns_lookup.addresses.join(", ")}</p>
                        </div>
                      ) : (
                        <div className="text-xs bg-red-50 p-2 rounded border border-red-200">
                          <p className="flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1 text-red-600" />
                            <strong>Status:</strong> Failed
                          </p>
                          <p><strong>Error:</strong> {diagnosticResult.diagnostics.errors.dns_lookup?.message}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* TLS Test Results */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">SSL/TLS Connection</h4>
                      {diagnosticResult.diagnostics.results.tls_check ? (
                        <div className="text-xs bg-green-50 p-2 rounded border border-green-200">
                          <p className="flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            <strong>Status:</strong> Success
                          </p>
                          <p><strong>Cipher:</strong> {diagnosticResult.diagnostics.results.tls_check.cipher?.name}</p>
                          <p><strong>Authorized:</strong> {diagnosticResult.diagnostics.results.tls_check.authorized ? "Yes" : "No"}</p>
                        </div>
                      ) : (
                        <div className="text-xs bg-red-50 p-2 rounded border border-red-200">
                          <p className="flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1 text-red-600" />
                            <strong>Status:</strong> Failed
                          </p>
                          <p><strong>Error:</strong> {diagnosticResult.diagnostics.errors.tls_check?.message}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* API Endpoints */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">API Endpoints</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(diagnosticResult.diagnostics.results)
                          .filter(([key]) => ['ping', 'dns', 'mail_send'].includes(key))
                          .map(([key, value]: [string, any]) => (
                            <div key={key} className="text-xs bg-background p-2 rounded border">
                              <p className="font-semibold">{key.toUpperCase()}</p>
                              <p><strong>Status:</strong> {value.status}</p>
                              <p className="truncate"><strong>Endpoint:</strong> {value.endpoint}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    {!diagnosticResult.diagnostics.success && (
                      <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800">Troubleshooting Recommendations</h4>
                        <ul className="list-disc ml-5 text-xs text-yellow-800 mt-2">
                          <li>Check if outbound HTTPS connections are allowed in your production environment</li>
                          <li>Verify if a proxy is required for external connections in your network</li>
                          <li>Confirm that api.sendgrid.com is not blocked by firewall rules</li>
                          <li>Test if DNS resolution is working properly for external domains</li>
                          <li>Ensure SSL/TLS handshakes are allowed through any security appliances</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}