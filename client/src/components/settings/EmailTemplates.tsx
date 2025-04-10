import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from '../LoadingSpinner';

interface TemplateVersion {
  subject: string;
  htmlContent: string;
  textContent: string;
  createdAt: string;
  createdBy?: string;
  comment?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  lastUpdated?: string;
  category?: string;
  language?: string;
  versionHistory?: TemplateVersion[];
  active: boolean;
  comment?: string; // For tracking changes in version history
}

export function EmailTemplates() {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [templateComment, setTemplateComment] = useState<string>('');
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all templates
  const { data: templates, isLoading, error } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    enabled: true,
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const response = await apiRequest('/api/email-templates/' + template.id, 'PUT', {
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        category: template.category,
        language: template.language,
        comment: template.comment || 'Updated template' // Add comment for version history
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setEditingTemplate(null);
      toast({
        title: 'Template updated',
        description: 'Email template has been updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating template',
        description: error instanceof Error ? error.message : 'An error occurred while updating the template',
        variant: 'destructive',
      });
    },
  });

  // Reset template mutation
  const resetTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest(`/api/email-templates/${templateId}/reset`, 'POST');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setEditingTemplate(null);
      toast({
        title: 'Template reset',
        description: 'Email template has been reset to default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error resetting template',
        description: error instanceof Error ? error.message : 'An error occurred while resetting the template',
        variant: 'destructive',
      });
    },
  });

  // Reset all templates mutation
  const resetAllTemplatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/email-templates/reset-all', 'POST');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setEditingTemplate(null);
      toast({
        title: 'All templates reset',
        description: 'All email templates have been reset to defaults',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error resetting templates',
        description: error instanceof Error ? error.message : 'An error occurred while resetting templates',
        variant: 'destructive',
      });
    },
  });

  // Preview template mutation
  const previewTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest(`/api/email-templates/${templateId}/preview`, 'GET');
      return response;
    },
    onSuccess: (data) => {
      setPreviewMode(true);
      toast({
        title: 'Template preview generated',
        description: 'Preview is now available with sample data',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error generating preview',
        description: error instanceof Error ? error.message : 'An error occurred while generating the preview',
        variant: 'destructive',
      });
    },
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async ({ templateId, versionIndex }: { templateId: string; versionIndex: number }) => {
      const response = await apiRequest(`/api/email-templates/${templateId}/restore/${versionIndex}`, 'POST');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setSelectedVersionIndex(null);
      toast({
        title: 'Version restored',
        description: 'Template has been restored to the selected version',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error restoring version',
        description: error instanceof Error ? error.message : 'An error occurred while restoring the version',
        variant: 'destructive',
      });
    },
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ templateId, recipientEmail, variables }: { templateId: string; recipientEmail: string; variables?: Record<string, string> }) => {
      const response = await apiRequest(`/api/email-templates/${templateId}/test`, 'POST', {
        recipientEmail,
        variables
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Test email sent',
        description: 'A test email has been sent to the specified address',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error sending test email',
        description: error instanceof Error ? error.message : 'An error occurred while sending the test email',
        variant: 'destructive',
      });
    },
  });

  // When a template is selected, set it as active
  useEffect(() => {
    if (templates && templates.length > 0 && !activeTemplate) {
      setActiveTemplate(templates[0].id);
    }
  }, [templates, activeTemplate]);

  // Handle saving template changes
  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate(editingTemplate);
  };

  // Handle discarding template changes
  const handleDiscardChanges = () => {
    setEditingTemplate(null);
  };

  // Handle editing a template
  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate({
      ...template,
    });
  };

  // Handle reset template
  const handleResetTemplate = (templateId: string) => {
    resetTemplateMutation.mutate(templateId);
  };

  // Handle reset all templates
  const handleResetAllTemplates = () => {
    resetAllTemplatesMutation.mutate();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive font-semibold">Error loading email templates</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An error occurred while loading templates'}
        </p>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No email templates found</p>
      </div>
    );
  }

  // Get current active template
  const currentTemplate = templates.find(template => template.id === activeTemplate);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage and customize system email templates
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Reset All Templates
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all templates?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all email templates to their default values. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetAllTemplates}
                disabled={resetAllTemplatesMutation.isPending}
              >
                {resetAllTemplatesMutation.isPending ? 'Resetting...' : 'Reset All'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Template Sidebar */}
        <div className="col-span-1 border rounded-lg p-2">
          <div className="font-medium px-2 py-1.5 text-sm">Template Type</div>
          <Separator className="my-2" />
          <div className="grid gap-1 p-1">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={template.id === activeTemplate ? 'default' : 'ghost'}
                className="justify-start font-normal"
                onClick={() => setActiveTemplate(template.id)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Template Content */}
        <div className="col-span-1 md:col-span-3">
          {currentTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>{currentTemplate.name}</CardTitle>
                <CardDescription>{currentTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {editingTemplate && editingTemplate.id === currentTemplate.id ? (
                  /* Editing Mode */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={editingTemplate.subject}
                        onChange={(e) => 
                          setEditingTemplate({
                            ...editingTemplate,
                            subject: e.target.value,
                          })
                        }
                        placeholder="Email subject line"
                      />
                    </div>

                    <Tabs defaultValue="html" className="w-full">
                      <TabsList className="mb-2">
                        <TabsTrigger value="html">HTML Content</TabsTrigger>
                        <TabsTrigger value="text">Plain Text</TabsTrigger>
                      </TabsList>
                      <TabsContent value="html">
                        <div className="space-y-2">
                          <Label htmlFor="htmlContent">HTML Content</Label>
                          <Textarea
                            id="htmlContent"
                            value={editingTemplate.htmlContent}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                htmlContent: e.target.value,
                              })
                            }
                            placeholder="HTML content of the email"
                            className="min-h-[400px] font-mono text-sm"
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="text">
                        <div className="space-y-2">
                          <Label htmlFor="textContent">Plain Text Content</Label>
                          <Textarea
                            id="textContent"
                            value={editingTemplate.textContent}
                            onChange={(e) =>
                              setEditingTemplate({
                                ...editingTemplate,
                                textContent: e.target.value,
                              })
                            }
                            placeholder="Plain text content of the email"
                            className="min-h-[400px] font-mono text-sm"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">Subject</h3>
                      <p className="p-2 border rounded-md">{currentTemplate.subject}</p>
                    </div>

                    <Tabs defaultValue="html" className="w-full">
                      <TabsList className="mb-2">
                        <TabsTrigger value="html">HTML Content</TabsTrigger>
                        <TabsTrigger value="text">Plain Text</TabsTrigger>
                      </TabsList>
                      <TabsContent value="html">
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-1">HTML Content</h3>
                          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                            <pre className="whitespace-pre-wrap font-mono text-sm">{currentTemplate.htmlContent}</pre>
                          </ScrollArea>
                        </div>
                      </TabsContent>
                      <TabsContent value="text">
                        <div>
                          <h3 className="font-medium text-sm text-muted-foreground mb-1">Plain Text Content</h3>
                          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
                            <pre className="whitespace-pre-wrap font-mono text-sm">{currentTemplate.textContent}</pre>
                          </ScrollArea>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">Available Variables</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentTemplate.variables.map((variable) => (
                          <div
                            key={variable}
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                          >
                            {`{{${variable}}}`}
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentTemplate.lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(currentTemplate.lastUpdated).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {editingTemplate && editingTemplate.id === currentTemplate.id ? (
                  /* Editing Mode Buttons */
                  <>
                    <Button variant="outline" onClick={handleDiscardChanges}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTemplate} disabled={updateTemplateMutation.isPending}>
                      {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  /* View Mode Buttons */
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Reset to Default</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset this template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset the template to its default values. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleResetTemplate(currentTemplate.id)}
                            disabled={resetTemplateMutation.isPending}
                          >
                            {resetTemplateMutation.isPending ? 'Resetting...' : 'Reset'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={() => handleEditTemplate(currentTemplate)}>
                      Edit Template
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}