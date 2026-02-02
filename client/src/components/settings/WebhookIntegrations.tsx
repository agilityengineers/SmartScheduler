import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Copy, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  AlertTriangle,
  Key,
  Zap,
  Loader2
} from 'lucide-react';

interface WebhookIntegration {
  id: number;
  userId: number;
  organizationId: number | null;
  name: string;
  source: string;
  webhookSecret: string;
  isActive: boolean;
  apiKey: string | null;
  apiEndpoint: string | null;
  callbackUrl: string | null;
  callbackSecret: string | null;
  metadata: Record<string, any>;
  lastWebhookAt: string | null;
  webhookCount: number;
  createdAt: string;
  updatedAt: string;
}

const SOURCES = [
  { value: 'smart-scheduler', label: 'Smart-Scheduler.ai' },
  { value: 'calendly', label: 'Calendly' },
  { value: 'custom', label: 'Custom Integration' },
];

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    hasSecret: boolean;
    signatureValid: boolean;
    integrationActive?: boolean;
    source?: string;
    webhookCount?: number;
    lastWebhookAt?: string | null;
    generatedSignature?: string;
  };
}

export function WebhookIntegrations() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretDialogTitle, setSecretDialogTitle] = useState('');
  const [testResultDialogOpen, setTestResultDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testingIntegrationId, setTestingIntegrationId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    source: 'smart-scheduler',
    webhookSecret: '',
    apiEndpoint: '',
    callbackUrl: '',
  });

  const { data: integrations = [], isLoading } = useQuery<WebhookIntegration[]>({
    queryKey: ['/api/webhook-integrations'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const secret = data.webhookSecret || crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const response = await apiRequest('POST', '/api/webhook-integrations', { ...data, webhookSecret: secret });
      return { ...response, generatedSecret: secret };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
      setIsAddDialogOpen(false);
      setFormData({ name: '', source: 'smart-scheduler', webhookSecret: '', apiEndpoint: '', callbackUrl: '' });
      setNewSecret(data.generatedSecret);
      setSecretDialogTitle('Integration Created - Copy Your Secret');
      setSecretDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/webhook-integrations/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
      toast({ title: 'Integration deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/webhook-integrations/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/webhook-integrations/${id}/regenerate-secret`, {});
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhook-integrations'] });
      setNewSecret(data.webhookSecret);
      setSecretDialogTitle('Secret Regenerated - Copy Your New Secret');
      setSecretDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      setTestingIntegrationId(id);
      const res = await apiRequest('POST', `/api/webhook-integrations/${id}/test`, {});
      return res as TestResult;
    },
    onSuccess: (data: TestResult) => {
      setTestResult(data);
      setTestResultDialogOpen(true);
      setTestingIntegrationId(null);
    },
    onError: (error: any) => {
      setTestingIntegrationId(null);
      toast({ title: 'Test Failed', description: error.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/smart-scheduler`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Integrations
              </CardTitle>
              <CardDescription>
                Connect external scheduling systems to sync appointments automatically.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>How to Connect Brand Voice Interview</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2 text-sm">
                <p><strong>Step 1:</strong> Add an integration below. A secret will be generated that you can copy.</p>
                <p><strong>Step 2:</strong> In Brand Voice Interview, paste the webhook URL and secret from here.</p>
                <p><strong>Step 3:</strong> Brand Voice Interview will use the secret to sign webhook requests.</p>
                <p className="text-muted-foreground">Both systems must share the same secret for secure communication.</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Your Webhook Endpoint URL</h4>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-background px-3 py-2 rounded border flex-1 overflow-x-auto">
                {webhookUrl}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Copy this URL to Brand Voice Interview's webhook configuration.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading integrations...</div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No webhook integrations configured yet.</p>
              <p className="text-sm">Add an integration to start receiving appointment updates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="bg-background">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{integration.name}</h4>
                          <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                            {integration.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {SOURCES.find(s => s.value === integration.source)?.label || integration.source}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-2">
                          <div className="flex items-center gap-2">
                            <Key className="h-3 w-3" />
                            <span>Secret:</span>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              ••••••••••••••••
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regenerateSecretMutation.mutate(integration.id)}
                              disabled={regenerateSecretMutation.isPending}
                              className="ml-2"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${regenerateSecretMutation.isPending ? 'animate-spin' : ''}`} />
                              Get New Secret
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testConnectionMutation.mutate(integration.id)}
                              disabled={testConnectionMutation.isPending}
                              className="ml-2"
                            >
                              {testingIntegrationId === integration.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Zap className="h-3 w-3 mr-1" />
                              )}
                              Test Connection
                            </Button>
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Secrets can only be viewed once when created. Click "Get New Secret" to generate a new one you can copy.
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last webhook: {integration.lastWebhookAt 
                                ? new Date(integration.lastWebhookAt).toLocaleDateString() 
                                : 'Never'}
                            </span>
                            <span>Total received: {integration.webhookCount || 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={integration.isActive}
                          onCheckedChange={(checked) => 
                            toggleMutation.mutate({ id: integration.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(integration.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Events</CardTitle>
          <CardDescription>
            The following webhook events are supported for Smart-Scheduler integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h5 className="font-medium">appointment.created</h5>
                <p className="text-sm text-muted-foreground">When a new appointment is booked</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h5 className="font-medium">appointment.updated</h5>
                <p className="text-sm text-muted-foreground">When an appointment is rescheduled</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h5 className="font-medium">appointment.cancelled</h5>
                <p className="text-sm text-muted-foreground">When an appointment is cancelled</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h5 className="font-medium">appointment.completed</h5>
                <p className="text-sm text-muted-foreground">When an appointment is marked complete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Integration</DialogTitle>
            <DialogDescription>
              Configure a new webhook integration to receive appointment updates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name</Label>
              <Input
                id="name"
                placeholder="e.g., Smart-Scheduler Production"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secret">Webhook Secret (optional)</Label>
              <Input
                id="secret"
                placeholder="Leave blank to auto-generate"
                value={formData.webhookSecret}
                onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Used for HMAC signature verification. If left blank, a secure secret will be generated.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Integration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={secretDialogOpen} onOpenChange={(open) => {
        setSecretDialogOpen(open);
        if (!open) setNewSecret(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {secretDialogTitle}
            </DialogTitle>
            <DialogDescription>
              Copy this secret now and paste it into Brand Voice Interview's webhook configuration. 
              This secret will not be shown again for security reasons.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Important</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Copy this secret before closing. You won't be able to see it again.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>Your Webhook Secret</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded text-sm break-all font-mono border">
                  {newSecret}
                </code>
                <Button 
                  variant="default" 
                  onClick={() => newSecret && copyToClipboard(newSecret, 'Secret')}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p className="font-medium mb-1">Next step:</p>
              <p>Paste this secret into Brand Voice Interview's webhook settings to complete the connection.</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => {
              setSecretDialogOpen(false);
              setNewSecret(null);
            }}>
              I've Copied the Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testResultDialogOpen} onOpenChange={setTestResultDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Connection Test {testResult?.success ? 'Passed' : 'Failed'}
            </DialogTitle>
            <DialogDescription>
              {testResult?.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {testResult?.success ? (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">SmartScheduler Ready</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  This integration is configured correctly. To complete the connection, ensure Brand Voice Interview has the same webhook secret configured.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Configuration Issue</AlertTitle>
                <AlertDescription>
                  {testResult?.details?.hasSecret === false 
                    ? 'No webhook secret is configured. Please generate a new secret.'
                    : !testResult?.details?.integrationActive
                      ? 'This integration is disabled. Enable it using the toggle to receive webhooks.'
                      : 'There was a problem verifying the configuration. Please check your settings.'}
                </AlertDescription>
              </Alert>
            )}
            
            {testResult?.details && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Test Details</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Secret Configured:</span>
                    <span className={testResult.details.hasSecret ? 'text-green-600' : 'text-red-600'}>
                      {testResult.details.hasSecret ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signature Valid:</span>
                    <span className={testResult.details.signatureValid ? 'text-green-600' : 'text-red-600'}>
                      {testResult.details.signatureValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {testResult.details.integrationActive !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Integration Active:</span>
                      <span className={testResult.details.integrationActive ? 'text-green-600' : 'text-amber-600'}>
                        {testResult.details.integrationActive ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                  {testResult.details.webhookCount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Webhooks Received:</span>
                      <span>{testResult.details.webhookCount}</span>
                    </div>
                  )}
                  {testResult.details.lastWebhookAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Webhook:</span>
                      <span>{new Date(testResult.details.lastWebhookAt).toLocaleString()}</span>
                    </div>
                  )}
                  {testResult.details.generatedSignature && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Test Signature:</span>
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {testResult.details.generatedSignature}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setTestResultDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
