import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import Footer from '@/components/layout/Footer';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Copy,
  ChevronRight,
  Mail,
  MessageSquare,
  Webhook,
  Clock,
  GitBranch,
  Calendar,
  Zap,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  FileText,
  ArrowRight,
  FlaskConical,
  Sparkles,
  LayoutTemplate,
  GripVertical,
} from 'lucide-react';

interface WorkflowData {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  isEnabled: boolean;
  isTemplate: boolean;
  templateId: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: number;
  workflowId: number;
  actionType: string;
  actionConfig: Record<string, unknown>;
  orderIndex: number;
  parentStepId: number | null;
  branchCondition: string | null;
  conditionConfig: Record<string, unknown> | null;
  delayMinutes: number | null;
}

interface WorkflowAnalytics {
  total: number;
  successful: number;
  failed: number;
  pending: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  steps: Array<{
    actionType: string;
    actionConfig: Record<string, unknown>;
    orderIndex: number;
    delayMinutes?: number;
  }>;
}

const TRIGGER_TYPES = [
  { value: 'booking_created', label: 'Booking Created', icon: Calendar, description: 'Triggers when a new booking is made' },
  { value: 'booking_canceled', label: 'Booking Cancelled', icon: XCircle, description: 'Triggers when a booking is cancelled' },
  { value: 'booking_updated', label: 'Booking Updated', icon: Clock, description: 'Triggers when a booking is modified' },
  { value: 'event_reminder', label: 'Event Reminder', icon: Timer, description: 'Triggers before a scheduled event' },
  { value: 'follow_up', label: 'Follow-up', icon: ArrowRight, description: 'Triggers after an event completes' },
  { value: 'team_schedule_change', label: 'Team Schedule Change', icon: Calendar, description: 'Triggers when team availability changes' },
  { value: 'manual', label: 'Manual Trigger', icon: Play, description: 'Trigger manually via API' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: Mail, description: 'Send an email notification' },
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send an SMS via Twilio' },
  { value: 'trigger_webhook', label: 'Webhook', icon: Webhook, description: 'Call an external webhook URL' },
  { value: 'trigger_zapier', label: 'Zapier', icon: Zap, description: 'Trigger a Zapier automation' },
  { value: 'delay', label: 'Delay', icon: Clock, description: 'Wait before next action' },
  { value: 'condition', label: 'Condition', icon: GitBranch, description: 'Add conditional branching' },
  { value: 'create_event', label: 'Create Event', icon: Calendar, description: 'Create a calendar event' },
];

export default function Workflows() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);
  const [activeTab, setActiveTab] = useState('workflows');
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    triggerType: 'booking_created',
    triggerConfig: {} as Record<string, unknown>,
  });
  const [workflowSteps, setWorkflowSteps] = useState<Partial<WorkflowStep>[]>([]);
  const [testData, setTestData] = useState('{\n  "bookingId": 1,\n  "guestEmail": "test@example.com",\n  "guestName": "John Doe"\n}');
  const { toast } = useToast();

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery<WorkflowData[]>({
    queryKey: ['/api/workflows'],
  });

  const { data: analytics } = useQuery<WorkflowAnalytics>({
    queryKey: ['/api/workflows/analytics'],
  });

  const { data: templates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/workflows/templates'],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: { workflow: Partial<WorkflowData>; steps: Partial<WorkflowStep>[] }) => {
      const res = await apiRequest('POST', '/api/workflows', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      setShowWorkflowBuilder(false);
      resetForm();
      toast({ title: 'Workflow created', description: 'Your workflow has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkflowData> & { id: number }) => {
      const res = await apiRequest('PATCH', `/api/workflows/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({ title: 'Workflow updated', description: 'Your workflow has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/workflows/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({ title: 'Workflow deleted', description: 'Your workflow has been deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: async ({ id, triggerData, testMode }: { id: number; triggerData: Record<string, unknown>; testMode?: boolean }) => {
      const res = await apiRequest('POST', `/api/workflows/${id}/execute`, { triggerData, testMode });
      return res.json();
    },
    onSuccess: (data: { id: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({ 
        title: showTestMode ? 'Test completed' : 'Workflow executed', 
        description: `Execution ID: ${data.id}` 
      });
      if (showTestMode) setShowTestMode(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Execution failed', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setWorkflowForm({ name: '', description: '', triggerType: 'booking_created', triggerConfig: {} });
    setWorkflowSteps([]);
    setSelectedWorkflow(null);
  };

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const handleToggleWorkflow = (workflow: WorkflowData) => {
    updateWorkflowMutation.mutate({ id: workflow.id, isEnabled: !workflow.isEnabled });
  };

  const handleDuplicateWorkflow = async (workflow: WorkflowData) => {
    try {
      const stepsResponse = await apiRequest('GET', `/api/workflows/${workflow.id}/steps`);
      const steps = await stepsResponse.json() as WorkflowStep[];
      createWorkflowMutation.mutate({
        workflow: {
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          triggerType: workflow.triggerType,
          triggerConfig: workflow.triggerConfig,
        },
        steps: steps.map((s) => ({
          actionType: s.actionType,
          actionConfig: s.actionConfig,
          orderIndex: s.orderIndex,
          delayMinutes: s.delayMinutes,
        })),
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate workflow', variant: 'destructive' });
    }
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    setWorkflowForm({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
    });
    setWorkflowSteps(template.steps.map((s, i) => ({ ...s, orderIndex: i })));
    setShowWorkflowBuilder(true);
  };

  const handleAddStep = (actionType: string) => {
    const action = ACTION_TYPES.find((a) => a.value === actionType);
    setWorkflowSteps([
      ...workflowSteps,
      {
        actionType,
        actionConfig: getDefaultActionConfig(actionType),
        orderIndex: workflowSteps.length,
        delayMinutes: actionType === 'delay' ? 60 : 0,
      },
    ]);
    toast({ title: 'Step added', description: `Added ${action?.label} step` });
  };

  const handleRemoveStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index).map((s, i) => ({ ...s, orderIndex: i })));
  };

  const handleUpdateStep = (index: number, updates: Partial<WorkflowStep>) => {
    setWorkflowSteps(workflowSteps.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleSaveWorkflow = () => {
    if (!workflowForm.name) {
      toast({ title: 'Error', description: 'Please enter a workflow name', variant: 'destructive' });
      return;
    }
    createWorkflowMutation.mutate({
      workflow: workflowForm,
      steps: workflowSteps,
    });
  };

  const handleTestWorkflow = (workflow: WorkflowData) => {
    setSelectedWorkflow(workflow);
    setShowTestMode(true);
  };

  const handleRunTest = () => {
    if (!selectedWorkflow) return;
    try {
      const triggerData = JSON.parse(testData);
      executeWorkflowMutation.mutate({ id: selectedWorkflow.id, triggerData, testMode: true });
    } catch {
      toast({ title: 'Invalid JSON', description: 'Please enter valid JSON test data', variant: 'destructive' });
    }
  };

  const getDefaultActionConfig = (actionType: string): Record<string, unknown> => {
    switch (actionType) {
      case 'send_email':
        return { to: '{{guestEmail}}', subject: 'Booking Confirmation', body: 'Your booking has been confirmed.' };
      case 'send_sms':
        return { to: '{{guestPhone}}', message: 'Your booking has been confirmed.' };
      case 'webhook':
        return { url: '', method: 'POST', headers: {}, body: {} };
      case 'zapier':
        return { webhookUrl: '' };
      case 'delay':
        return { minutes: 60 };
      case 'condition':
        return { field: '', operator: 'equals', value: '' };
      case 'create_event':
        return { title: '{{eventTitle}}', startTime: '{{startTime}}', duration: 30 };
      default:
        return {};
    }
  };

  const getTriggerIcon = (triggerType: string) => {
    const trigger = TRIGGER_TYPES.find((t) => t.value === triggerType);
    return trigger?.icon || Calendar;
  };

  const getActionIcon = (actionType: string) => {
    const action = ACTION_TYPES.find((a) => a.value === actionType);
    return action?.icon || Zap;
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-slate-900">
      <AppHeader onCreateEvent={handleCreateEvent} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">Workflow Automation</h1>
                <p className="text-neutral-600 dark:text-slate-400 mt-1">
                  Create powerful automations for your scheduling workflow
                </p>
              </div>
              <Button onClick={() => setShowWorkflowBuilder(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Total Workflows</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{workflows.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Workflow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Successful</p>
                      <p className="text-2xl font-bold text-green-600">{analytics?.successful || 0}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{analytics?.failed || 0}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{analytics?.pending || 0}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="workflows" className="flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  My Workflows
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workflows" className="space-y-4 mt-4">
                {workflowsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : workflows.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Workflow className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
                        No workflows yet
                      </h3>
                      <p className="text-neutral-600 dark:text-slate-400 text-center mb-4 max-w-md">
                        Create your first workflow to automate tasks like sending confirmation emails, reminders, or integrating with other tools.
                      </p>
                      <div className="flex gap-3">
                        <Button onClick={() => setShowWorkflowBuilder(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Workflow
                        </Button>
                        <Button variant="outline" onClick={() => setActiveTab('templates')}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Browse Templates
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {workflows.map((workflow) => {
                      const TriggerIcon = getTriggerIcon(workflow.triggerType);
                      return (
                        <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <TriggerIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-neutral-900 dark:text-slate-100">
                                      {workflow.name}
                                    </h3>
                                    <Badge variant={workflow.isEnabled ? 'default' : 'secondary'}>
                                      {workflow.isEnabled ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  {workflow.description && (
                                    <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                                      {workflow.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs text-neutral-500 dark:text-slate-500">
                                      Trigger: {TRIGGER_TYPES.find((t) => t.value === workflow.triggerType)?.label}
                                    </span>
                                    <span className="text-xs text-neutral-500 dark:text-slate-500">
                                      v{workflow.version}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={workflow.isEnabled}
                                  onCheckedChange={() => handleToggleWorkflow(workflow)}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleTestWorkflow(workflow)}
                                  title="Test workflow"
                                >
                                  <FlaskConical className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicateWorkflow(workflow)}
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="templates" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => {
                    const TriggerIcon = getTriggerIcon(template.triggerType);
                    return (
                      <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <TriggerIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 mb-4">
                            {template.steps.slice(0, 3).map((step, i) => {
                              const ActionIcon = getActionIcon(step.actionType);
                              return (
                                <div key={i} className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-slate-700 flex items-center justify-center">
                                    <ActionIcon className="h-4 w-4 text-neutral-600 dark:text-slate-400" />
                                  </div>
                                  {i < template.steps.length - 1 && i < 2 && (
                                    <ChevronRight className="h-4 w-4 text-neutral-400 mx-1" />
                                  )}
                                </div>
                              );
                            })}
                            {template.steps.length > 3 && (
                              <span className="text-xs text-neutral-500">+{template.steps.length - 3} more</span>
                            )}
                          </div>
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleUseTemplate(template)}
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution Overview</CardTitle>
                    <CardDescription>Track your workflow performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-slate-100">Total Executions</p>
                            <p className="text-sm text-neutral-600 dark:text-slate-400">All time</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                          {analytics?.total || 0}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-600">{analytics?.successful || 0}</p>
                          <p className="text-sm text-green-700 dark:text-green-400">Successful</p>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                          <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-red-600">{analytics?.failed || 0}</p>
                          <p className="text-sm text-red-700 dark:text-red-400">Failed</p>
                        </div>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                          <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-yellow-600">{analytics?.pending || 0}</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">Pending</p>
                        </div>
                      </div>

                      {analytics && analytics.total > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-neutral-600 dark:text-slate-400 mb-2">Success Rate</p>
                          <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-3">
                            <div
                              className="bg-green-600 h-3 rounded-full transition-all"
                              style={{ width: `${(analytics.successful / analytics.total) * 100}%` }}
                            />
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                            {((analytics.successful / analytics.total) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={showWorkflowBuilder} onOpenChange={setShowWorkflowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>Build an automated workflow with triggers and actions</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={workflowForm.name}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                  placeholder="e.g., Booking Confirmation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trigger-type">Trigger</Label>
                <Select
                  value={workflowForm.triggerType}
                  onValueChange={(value) => setWorkflowForm({ ...workflowForm, triggerType: value })}
                >
                  <SelectTrigger id="trigger-type">
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        <div className="flex items-center gap-2">
                          <trigger.icon className="h-4 w-4" />
                          {trigger.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow-description">Description (Optional)</Label>
              <Textarea
                id="workflow-description"
                value={workflowForm.description}
                onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                placeholder="Describe what this workflow does..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-slate-100">Workflow Steps</h3>
                <span className="text-sm text-neutral-500">{workflowSteps.length} step(s)</span>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
                  {(() => {
                    const TriggerIcon = getTriggerIcon(workflowForm.triggerType);
                    return <TriggerIcon className="h-5 w-5 text-primary" />;
                  })()}
                  <div>
                    <p className="font-medium text-primary">Trigger</p>
                    <p className="text-sm text-primary/80">
                      {TRIGGER_TYPES.find((t) => t.value === workflowForm.triggerType)?.label}
                    </p>
                  </div>
                </div>

                {workflowSteps.map((step, index) => {
                  const ActionIcon = getActionIcon(step.actionType || '');
                  const action = ACTION_TYPES.find((a) => a.value === step.actionType);
                  return (
                    <div key={index} className="p-4 bg-neutral-100 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-slate-700 flex items-center justify-center">
                              <GripVertical className="h-4 w-4 text-neutral-400" />
                            </div>
                            <div className="w-0.5 h-4 bg-neutral-300 dark:bg-slate-600 mt-1" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <ActionIcon className="h-4 w-4 text-neutral-600 dark:text-slate-400" />
                              <span className="font-medium text-neutral-900 dark:text-slate-100">
                                {action?.label}
                              </span>
                              <Badge variant="outline" className="text-xs">Step {index + 1}</Badge>
                            </div>
                            
                            {step.actionType === 'send_email' && (
                              <div className="space-y-2 mt-2">
                                <Input
                                  placeholder="To: {{guestEmail}}"
                                  value={(step.actionConfig?.to as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, to: e.target.value },
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Subject"
                                  value={(step.actionConfig?.subject as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, subject: e.target.value },
                                    })
                                  }
                                />
                              </div>
                            )}

                            {step.actionType === 'send_sms' && (
                              <div className="space-y-2 mt-2">
                                <Input
                                  placeholder="To: {{guestPhone}}"
                                  value={(step.actionConfig?.to as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, to: e.target.value },
                                    })
                                  }
                                />
                                <Textarea
                                  placeholder="Message"
                                  value={(step.actionConfig?.message as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, message: e.target.value },
                                    })
                                  }
                                  rows={2}
                                />
                              </div>
                            )}

                            {step.actionType === 'webhook' && (
                              <div className="space-y-2 mt-2">
                                <Input
                                  placeholder="Webhook URL"
                                  value={(step.actionConfig?.url as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, url: e.target.value },
                                    })
                                  }
                                />
                              </div>
                            )}

                            {step.actionType === 'zapier' && (
                              <div className="space-y-2 mt-2">
                                <Input
                                  placeholder="Zapier Webhook URL"
                                  value={(step.actionConfig?.webhookUrl as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, webhookUrl: e.target.value },
                                    })
                                  }
                                />
                              </div>
                            )}

                            {step.actionType === 'delay' && (
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  type="number"
                                  className="w-24"
                                  value={step.delayMinutes || 60}
                                  onChange={(e) =>
                                    handleUpdateStep(index, { delayMinutes: parseInt(e.target.value) || 0 })
                                  }
                                />
                                <span className="text-sm text-neutral-600 dark:text-slate-400">minutes</span>
                              </div>
                            )}

                            {step.actionType === 'condition' && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <Input
                                  placeholder="Field"
                                  value={(step.actionConfig?.field as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, field: e.target.value },
                                    })
                                  }
                                />
                                <Select
                                  value={(step.actionConfig?.operator as string) || 'equals'}
                                  onValueChange={(value) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, operator: value },
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="equals">equals</SelectItem>
                                    <SelectItem value="not_equals">not equals</SelectItem>
                                    <SelectItem value="contains">contains</SelectItem>
                                    <SelectItem value="greater_than">greater than</SelectItem>
                                    <SelectItem value="less_than">less than</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Value"
                                  value={(step.actionConfig?.value as string) || ''}
                                  onChange={(e) =>
                                    handleUpdateStep(index, {
                                      actionConfig: { ...step.actionConfig, value: e.target.value },
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="border-2 border-dashed border-neutral-300 dark:border-slate-600 rounded-lg p-4">
                  <p className="text-sm font-medium text-neutral-600 dark:text-slate-400 mb-3">Add Action</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ACTION_TYPES.map((action) => (
                      <Button
                        key={action.value}
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-center gap-1"
                        onClick={() => handleAddStep(action.value)}
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="text-xs">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setShowWorkflowBuilder(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={createWorkflowMutation.isPending || !workflowForm.name}
            >
              {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTestMode} onOpenChange={setShowTestMode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Test Workflow
            </DialogTitle>
            <DialogDescription>
              Run {selectedWorkflow?.name} with test data. No actual actions will be performed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Trigger Data (JSON)</Label>
              <Textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                rows={8}
                className="font-mono text-sm"
                placeholder='{"bookingId": 1, "guestEmail": "test@example.com"}'
              />
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                <p className="font-medium">Test Mode</p>
                <p>Actions will be simulated and logged but not actually executed.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestMode(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRunTest}
              disabled={executeWorkflowMutation.isPending}
            >
              {executeWorkflowMutation.isPending ? (
                <>Running Test...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />
      <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <Footer />
    </div>
  );
}
