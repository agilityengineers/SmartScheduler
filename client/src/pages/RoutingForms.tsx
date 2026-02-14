import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  GitBranch, Plus, Copy, Trash2, ExternalLink, Settings, Eye, BarChart3,
  GripVertical, ArrowRight, MessageSquare, Link as LinkIcon
} from 'lucide-react';

interface RoutingForm {
  id: number;
  userId: number;
  title: string;
  slug: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface RoutingFormQuestion {
  id: number;
  routingFormId: number;
  label: string;
  type: string;
  options: any;
  isRequired: boolean | null;
  orderIndex: number | null;
}

interface RoutingFormRule {
  id: number;
  routingFormId: number;
  questionId: number;
  operator: string;
  value: string;
  action: string;
  targetBookingLinkId: number | null;
  targetUrl: string | null;
  targetMessage: string | null;
  priority: number | null;
  isActive: boolean | null;
}

interface RoutingFormSubmission {
  id: number;
  routingFormId: number;
  answers: any;
  routedTo: string | null;
  submitterEmail: string | null;
  submitterName: string | null;
  createdAt: string;
}

interface FormDetail extends RoutingForm {
  questions: RoutingFormQuestion[];
  rules: RoutingFormRule[];
}

interface BookingLink {
  id: number;
  title: string;
  slug: string;
}

export default function RoutingForms() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDetail | null>(null);
  const [showSubmissions, setShowSubmissions] = useState<number | null>(null);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const { toast } = useToast();

  // Create form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Question form state
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('text');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(true);

  // Rule form state
  const [newRuleQuestionId, setNewRuleQuestionId] = useState<number | null>(null);
  const [newRuleOperator, setNewRuleOperator] = useState('equals');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleAction, setNewRuleAction] = useState('route_to_booking');
  const [newRuleTargetBookingLinkId, setNewRuleTargetBookingLinkId] = useState<number | null>(null);
  const [newRuleTargetUrl, setNewRuleTargetUrl] = useState('');
  const [newRuleTargetMessage, setNewRuleTargetMessage] = useState('');
  const [newRulePriority, setNewRulePriority] = useState(0);

  const { data: forms = [], isLoading } = useQuery<RoutingForm[]>({
    queryKey: ['/api/routing-forms'],
  });

  const { data: bookingLinks = [] } = useQuery<BookingLink[]>({
    queryKey: ['/api/booking-links'],
  });

  const { data: submissions = [] } = useQuery<RoutingFormSubmission[]>({
    queryKey: ['/api/routing-forms', showSubmissions, 'submissions'],
    queryFn: async () => {
      if (!showSubmissions) return [];
      const res = await fetch(`/api/routing-forms/${showSubmissions}/submissions`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!showSubmissions,
  });

  const createForm = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/routing-forms', {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: description || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Form Created', description: 'Your routing form has been created.' });
      setShowCreateModal(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ['/api/routing-forms'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/routing-forms/${id}`, null);
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Routing form deleted.' });
      queryClient.invalidateQueries({ queryKey: ['/api/routing-forms'] });
    },
  });

  const toggleFormActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest('PUT', `/api/routing-forms/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routing-forms'] });
    },
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      if (!editingForm) return;
      const opts = newQuestionType === 'select' || newQuestionType === 'radio' || newQuestionType === 'checkbox'
        ? newQuestionOptions.split(',').map(o => o.trim()).filter(Boolean)
        : [];
      const res = await apiRequest('POST', `/api/routing-forms/${editingForm.id}/questions`, {
        label: newQuestionLabel,
        type: newQuestionType,
        options: opts,
        isRequired: newQuestionRequired,
        orderIndex: editingForm.questions.length,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Question Added' });
      setNewQuestionLabel('');
      setNewQuestionOptions('');
      refreshEditingForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/routing-forms/questions/${id}`, null);
    },
    onSuccess: () => {
      toast({ title: 'Question Removed' });
      refreshEditingForm();
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      if (!editingForm || !newRuleQuestionId) return;
      const res = await apiRequest('POST', `/api/routing-forms/${editingForm.id}/rules`, {
        questionId: newRuleQuestionId,
        operator: newRuleOperator,
        value: newRuleValue,
        action: newRuleAction,
        targetBookingLinkId: newRuleAction === 'route_to_booking' ? newRuleTargetBookingLinkId : null,
        targetUrl: newRuleAction === 'route_to_url' ? newRuleTargetUrl : null,
        targetMessage: newRuleAction === 'show_message' ? newRuleTargetMessage : null,
        priority: newRulePriority,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Rule Added' });
      resetRuleForm();
      refreshEditingForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/routing-forms/rules/${id}`, null);
    },
    onSuccess: () => {
      toast({ title: 'Rule Removed' });
      refreshEditingForm();
    },
  });

  const resetCreateForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
  };

  const resetRuleForm = () => {
    setNewRuleQuestionId(null);
    setNewRuleOperator('equals');
    setNewRuleValue('');
    setNewRuleAction('route_to_booking');
    setNewRuleTargetBookingLinkId(null);
    setNewRuleTargetUrl('');
    setNewRuleTargetMessage('');
    setNewRulePriority(0);
  };

  const refreshEditingForm = async () => {
    if (!editingForm) return;
    try {
      const res = await fetch(`/api/routing-forms/${editingForm.id}`, { credentials: 'include' });
      const data = await res.json();
      setEditingForm(data);
    } catch {
      // ignore
    }
  };

  const openEditForm = async (form: RoutingForm) => {
    try {
      const res = await fetch(`/api/routing-forms/${form.id}`, { credentials: 'include' });
      const data = await res.json();
      setEditingForm(data);
    } catch {
      toast({ title: 'Error', description: 'Could not load form details', variant: 'destructive' });
    }
  };

  const copyFormLink = (slug: string) => {
    const url = `${window.location.origin}/route/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'Routing form link copied to clipboard.' });
  };

  const getOperatorLabel = (op: string) => {
    switch (op) {
      case 'equals': return 'equals';
      case 'not_equals': return 'does not equal';
      case 'contains': return 'contains';
      case 'starts_with': return 'starts with';
      default: return op;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'route_to_booking': return 'Route to booking link';
      case 'route_to_url': return 'Redirect to URL';
      case 'show_message': return 'Show message';
      default: return action;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'route_to_booking': return <LinkIcon className="h-3 w-3" />;
      case 'route_to_url': return <ExternalLink className="h-3 w-3" />;
      case 'show_message': return <MessageSquare className="h-3 w-3" />;
      default: return null;
    }
  };

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !slug) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [title]);

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={() => setIsCreateEventModalOpen(true)} />
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b border-neutral-300 p-4 flex items-center justify-between bg-white">
            <h1 className="text-xl font-semibold text-neutral-700 flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Routing Forms
            </h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Routing Form
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Loading routing forms...</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <GitBranch className="h-12 w-12 text-neutral-300 mb-4" />
                <h2 className="text-lg font-semibold text-neutral-600">No Routing Forms</h2>
                <p className="text-neutral-500 mt-2 max-w-md">
                  Create routing forms with conditional logic to direct visitors to the right booking page based on their answers.
                </p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Your First Routing Form
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <Card key={form.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{form.title}</CardTitle>
                          <CardDescription className="text-sm mt-1 truncate">
                            /{form.slug}
                          </CardDescription>
                        </div>
                        <Badge className={form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {form.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {form.description && (
                        <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{form.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openEditForm(form)}>
                          <Settings className="h-3 w-3 mr-1" /> Configure
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyFormLink(form.slug)}>
                          <Copy className="h-3 w-3 mr-1" /> Copy Link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowSubmissions(form.id)}>
                          <BarChart3 className="h-3 w-3 mr-1" /> Submissions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFormActive.mutate({ id: form.id, isActive: !form.isActive })}
                        >
                          {form.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteForm.mutate(form.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
        <MobileNavigation onCreateEventClick={() => setIsCreateEventModalOpen(true)} />
      </div>

      {isCreateEventModalOpen && (
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
        />
      )}

      {/* Create Form Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Routing Form</DialogTitle>
            <DialogDescription>
              A routing form asks visitors questions and directs them to the right booking page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="e.g., Sales Inquiry"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>URL Slug</Label>
              <Input
                placeholder="e.g., sales-inquiry"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Public URL: {window.location.origin}/route/{slug || 'your-slug'}
              </p>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Help visitors understand what this form is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={() => createForm.mutate()} disabled={!title || createForm.isPending}>
              {createForm.isPending ? 'Creating...' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Form Modal (Questions + Rules) */}
      <Dialog open={!!editingForm} onOpenChange={(open) => { if (!open) setEditingForm(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {editingForm && (
            <>
              <DialogHeader>
                <DialogTitle>Configure: {editingForm.title}</DialogTitle>
                <DialogDescription>
                  Add questions and routing rules. Rules are evaluated top-to-bottom by priority.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Questions Section */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <GripVertical className="h-4 w-4" /> Questions ({editingForm.questions.length})
                  </h3>

                  {editingForm.questions.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {editingForm.questions
                        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                        .map((q, i) => (
                          <div key={q.id} className="flex items-center gap-3 p-3 border rounded-lg bg-neutral-50">
                            <span className="text-xs font-mono text-neutral-400 w-6">Q{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{q.label}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{q.type}</Badge>
                                {q.isRequired && <Badge variant="outline" className="text-xs text-red-500">Required</Badge>}
                                {q.type !== 'text' && Array.isArray(q.options) && q.options.length > 0 && (
                                  <span className="text-xs text-neutral-400">{(q.options as string[]).join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => deleteQuestion.mutate(q.id)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="border rounded-lg p-3 space-y-3 bg-white">
                    <p className="text-xs font-medium text-neutral-500 uppercase">Add Question</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Question Label</Label>
                        <Input
                          placeholder="e.g., What type of meeting?"
                          value={newQuestionLabel}
                          onChange={(e) => setNewQuestionLabel(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={newQuestionType} onValueChange={setNewQuestionType}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="radio">Radio Buttons</SelectItem>
                            <SelectItem value="checkbox">Checkboxes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(newQuestionType === 'select' || newQuestionType === 'radio' || newQuestionType === 'checkbox') && (
                      <div>
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          placeholder="e.g., Sales, Support, Demo, Other"
                          value={newQuestionOptions}
                          onChange={(e) => setNewQuestionOptions(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newQuestionRequired}
                          onCheckedChange={setNewQuestionRequired}
                          id="q-required"
                        />
                        <Label htmlFor="q-required" className="text-xs">Required</Label>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addQuestion.mutate()}
                        disabled={!newQuestionLabel || addQuestion.isPending}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Question
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Rules Section */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" /> Routing Rules ({editingForm.rules.length})
                  </h3>

                  {editingForm.rules.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {editingForm.rules
                        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                        .map((rule) => {
                          const question = editingForm.questions.find(q => q.id === rule.questionId);
                          const bookingLink = bookingLinks.find((bl: any) => bl.id === rule.targetBookingLinkId);
                          return (
                            <div key={rule.id} className="flex items-start gap-3 p-3 border rounded-lg bg-neutral-50">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-sm flex-wrap">
                                  <span className="font-medium">If</span>
                                  <Badge variant="outline" className="text-xs">{question?.label || `Q#${rule.questionId}`}</Badge>
                                  <span className="text-neutral-500">{getOperatorLabel(rule.operator)}</span>
                                  <Badge className="text-xs">{rule.value}</Badge>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                                  {getActionIcon(rule.action)}
                                  <span>{getActionLabel(rule.action)}</span>
                                  {rule.action === 'route_to_booking' && bookingLink && (
                                    <Badge variant="outline" className="text-xs ml-1">{bookingLink.title}</Badge>
                                  )}
                                  {rule.action === 'route_to_url' && rule.targetUrl && (
                                    <span className="ml-1 truncate max-w-[200px]">{rule.targetUrl}</span>
                                  )}
                                  {rule.action === 'show_message' && rule.targetMessage && (
                                    <span className="ml-1 truncate max-w-[200px] italic">"{rule.targetMessage}"</span>
                                  )}
                                  {rule.priority ? <Badge variant="outline" className="text-xs ml-auto">Priority: {rule.priority}</Badge> : null}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(rule.id)}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {editingForm.questions.length > 0 ? (
                    <div className="border rounded-lg p-3 space-y-3 bg-white">
                      <p className="text-xs font-medium text-neutral-500 uppercase">Add Routing Rule</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">When question</Label>
                          <Select
                            value={newRuleQuestionId ? String(newRuleQuestionId) : ''}
                            onValueChange={(val) => setNewRuleQuestionId(parseInt(val))}
                          >
                            <SelectTrigger className="text-sm"><SelectValue placeholder="Select question" /></SelectTrigger>
                            <SelectContent>
                              {editingForm.questions.map(q => (
                                <SelectItem key={q.id} value={String(q.id)}>{q.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Operator</Label>
                          <Select value={newRuleOperator} onValueChange={setNewRuleOperator}>
                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Does not equal</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="starts_with">Starts with</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Value to match</Label>
                        <Input
                          placeholder="e.g., Sales"
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Action</Label>
                          <Select value={newRuleAction} onValueChange={setNewRuleAction}>
                            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="route_to_booking">Route to booking link</SelectItem>
                              <SelectItem value="route_to_url">Redirect to URL</SelectItem>
                              <SelectItem value="show_message">Show message</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Priority (higher = first)</Label>
                          <Input
                            type="number"
                            value={newRulePriority}
                            onChange={(e) => setNewRulePriority(parseInt(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      {newRuleAction === 'route_to_booking' && (
                        <div>
                          <Label className="text-xs">Target Booking Link</Label>
                          <Select
                            value={newRuleTargetBookingLinkId ? String(newRuleTargetBookingLinkId) : ''}
                            onValueChange={(val) => setNewRuleTargetBookingLinkId(parseInt(val))}
                          >
                            <SelectTrigger className="text-sm"><SelectValue placeholder="Select booking link" /></SelectTrigger>
                            <SelectContent>
                              {bookingLinks.map((bl: any) => (
                                <SelectItem key={bl.id} value={String(bl.id)}>{bl.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {newRuleAction === 'route_to_url' && (
                        <div>
                          <Label className="text-xs">Target URL</Label>
                          <Input
                            placeholder="https://..."
                            value={newRuleTargetUrl}
                            onChange={(e) => setNewRuleTargetUrl(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      )}
                      {newRuleAction === 'show_message' && (
                        <div>
                          <Label className="text-xs">Message</Label>
                          <Textarea
                            placeholder="Message to display..."
                            value={newRuleTargetMessage}
                            onChange={(e) => setNewRuleTargetMessage(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      )}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => addRule.mutate()}
                          disabled={!newRuleQuestionId || !newRuleValue || addRule.isPending}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Rule
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">Add questions first, then configure routing rules.</p>
                  )}
                </div>

                {/* Preview Link */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Public Form Link</p>
                      <p className="text-xs text-neutral-500">{window.location.origin}/route/{editingForm.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyFormLink(editingForm.slug)}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/route/${editingForm.slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submissions Modal */}
      <Dialog open={!!showSubmissions} onOpenChange={(open) => { if (!open) setShowSubmissions(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Submissions</DialogTitle>
            <DialogDescription>
              Recent submissions and routing outcomes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No submissions yet.</p>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {sub.submitterName && <span className="text-sm font-medium">{sub.submitterName}</span>}
                      {sub.submitterEmail && <span className="text-xs text-neutral-500">{sub.submitterEmail}</span>}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 space-y-1">
                    {sub.answers && typeof sub.answers === 'object' &&
                      Object.entries(sub.answers as Record<string, any>).map(([qId, answer]) => (
                        <div key={qId}>
                          <span className="text-neutral-400">Q{qId}:</span> {String(answer)}
                        </div>
                      ))}
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      Routed to: {sub.routedTo || 'no match'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
