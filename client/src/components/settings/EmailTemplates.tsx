import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Template type definition
interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  textContent: string;
  htmlContent: string;
  variables: string[];
  lastUpdated?: string;
}

// Structure for test variable values
interface TemplateVariables {
  [key: string]: string;
}

export default function EmailTemplates() {
  // State for templates and UI
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  // Edit states
  const [subject, setSubject] = useState('');
  const [textContent, setTextContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Test email states
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testVariables, setTestVariables] = useState<TemplateVariables>({});

  // Fetch all templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Set selected template when selectedTemplateId changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId) || null;
      setSelectedTemplate(template);
      
      if (template) {
        setSubject(template.subject);
        setTextContent(template.textContent);
        setHtmlContent(template.htmlContent);
        
        // Initialize test variables with empty values
        const vars: TemplateVariables = {};
        template.variables.forEach(v => {
          // Extract variable name without the curly braces
          const varName = v.replace(/{|}/g, '');
          vars[varName] = '';
        });
        setTestVariables(vars);
      }
    } else {
      setSelectedTemplate(null);
      setSubject('');
      setTextContent('');
      setHtmlContent('');
      setTestVariables({});
    }
  }, [selectedTemplateId, templates]);

  // Fetch all templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/email-templates');
      setTemplates(response.data);
      
      // Select the first template by default if available
      if (response.data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(response.data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching email templates:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load email templates');
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Save template changes
  const saveTemplate = async () => {
    if (!selectedTemplateId) return;
    
    try {
      setIsSaving(true);
      
      await axios.put(`/api/email-templates/${selectedTemplateId}`, {
        subject,
        textContent,
        htmlContent
      });
      
      // Update the template in the local state
      setTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === selectedTemplateId 
            ? { ...t, subject, textContent, htmlContent, lastUpdated: new Date().toISOString() } 
            : t
        )
      );
      
      toast({
        title: 'Template saved',
        description: 'Your changes have been saved successfully',
        variant: 'default',
      });
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset template to default
  const resetTemplate = async () => {
    if (!selectedTemplateId) return;
    
    try {
      setIsResetting(true);
      
      const response = await axios.post(`/api/email-templates/${selectedTemplateId}/reset`);
      
      // Update the template in the local state
      setTemplates(prevTemplates => 
        prevTemplates.map(t => 
          t.id === selectedTemplateId ? response.data : t
        )
      );
      
      // Update the form values
      setSubject(response.data.subject);
      setTextContent(response.data.textContent);
      setHtmlContent(response.data.htmlContent);
      
      toast({
        title: 'Template reset',
        description: 'The template has been reset to its default values',
        variant: 'default',
      });
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error resetting template:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to reset template',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!selectedTemplateId || !testEmail) return;
    
    try {
      setIsSendingTest(true);
      
      await axios.post(`/api/email-templates/${selectedTemplateId}/test`, {
        recipientEmail: testEmail,
        variables: testVariables
      });
      
      toast({
        title: 'Test email sent',
        description: `A test email has been sent to ${testEmail}`,
        variant: 'default',
      });
    } catch (err: any) {
      console.error('Error sending test email:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handle test variable changes
  const handleVariableChange = (key: string, value: string) => {
    setTestVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Email Templates</h3>
        <p className="text-sm text-muted-foreground">
          Customize the email templates used throughout the system.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important Note</AlertTitle>
        <AlertDescription>
          These templates are used for all system emails. Maintain the variables in curly braces (e.g., {'{variable_name}'})
          as they will be replaced with actual values when emails are sent.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchTemplates}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Template List */}
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Templates</CardTitle>
                <CardDescription>Select a template to edit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {templates.map(template => (
                    <Button
                      key={template.id}
                      variant={selectedTemplateId === template.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-left"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setIsEditing(false);
                      }}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Template Editor */}
          <div className="md:col-span-9">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button 
                            variant="secondary" 
                            onClick={() => {
                              // Reset form values to original template values
                              setSubject(selectedTemplate.subject);
                              setTextContent(selectedTemplate.textContent);
                              setHtmlContent(selectedTemplate.htmlContent);
                              setIsEditing(false);
                            }}
                            disabled={isSaving || isResetting}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={saveTemplate} 
                            disabled={isSaving || isResetting}
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={resetTemplate} 
                            disabled={isSaving || isResetting}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {isResetting ? 'Resetting...' : 'Reset to Default'}
                          </Button>
                          <Button 
                            onClick={() => setIsEditing(true)}
                            disabled={isSaving || isResetting}
                          >
                            Edit Template
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedTemplate.lastUpdated && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated: {new Date(selectedTemplate.lastUpdated).toLocaleString()}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue="edit" className="space-y-4">
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="edit">Edit Template</TabsTrigger>
                      <TabsTrigger value="test">Test Delivery</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="edit" className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          disabled={!isEditing}
                          placeholder="Email subject line"
                        />
                      </div>
                      
                      <Accordion type="single" collapsible defaultValue="text">
                        <AccordionItem value="text">
                          <AccordionTrigger>
                            Plain Text Version
                            <Badge variant="outline" className="ml-2">Required</Badge>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              <Textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                disabled={!isEditing}
                                placeholder="Plain text version of the email"
                                className="h-[300px] font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                The plain text version is used for email clients that don't support HTML.
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="html">
                          <AccordionTrigger>
                            HTML Version
                            <Badge variant="outline" className="ml-2">Required</Badge>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              <Textarea
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                disabled={!isEditing}
                                placeholder="HTML version of the email"
                                className="h-[400px] font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                The HTML version is the primary email content for modern email clients.
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="variables">
                          <AccordionTrigger>
                            Template Variables
                            <Badge variant="outline" className="ml-2">Read Only</Badge>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Template Variables</AlertTitle>
                                <AlertDescription>
                                  The following variables are used in this template and will be replaced with actual values when emails are sent.
                                  Make sure to keep these variables in your template.
                                </AlertDescription>
                              </Alert>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                                {selectedTemplate.variables.map((variable, idx) => (
                                  <div key={idx} className="bg-muted p-2 rounded-md flex items-center">
                                    <code className="text-sm">{variable}</code>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                    
                    <TabsContent value="test" className="space-y-6">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Test Email Delivery</AlertTitle>
                        <AlertDescription>
                          Send a test email using this template to verify it works as expected.
                          You can provide test values for the template variables.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Recipient Email</label>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the email address where you want to receive the test message
                          </p>
                        </div>
                        
                        {Object.keys(testVariables).length > 0 && (
                          <>
                            <Separator />
                            
                            <div className="space-y-4">
                              <h4 className="font-medium">Template Variables</h4>
                              <p className="text-sm text-muted-foreground">
                                Provide test values for the variables used in this template.
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(testVariables).map(([key, value]) => (
                                  <div key={key} className="space-y-2">
                                    <label className="text-sm font-medium">{key}</label>
                                    <Input
                                      value={value}
                                      onChange={(e) => handleVariableChange(key, e.target.value)}
                                      placeholder={`Value for ${key}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        
                        <div className="pt-4">
                          <Button
                            onClick={sendTestEmail}
                            disabled={!testEmail || isSendingTest}
                            className="w-full"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {isSendingTest ? 'Sending...' : 'Send Test Email'}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-10">
                  <p className="text-muted-foreground">
                    Select a template from the list to view and edit its contents
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}