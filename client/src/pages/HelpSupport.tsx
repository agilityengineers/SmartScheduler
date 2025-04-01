import { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, BookOpen, Mail, MessageSquare, FileText, HelpCircle, ExternalLink } from 'lucide-react';

export default function HelpSupport() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const handleSendSupportMessage = () => {
    // In a real application, this would send the message to a backend endpoint
    setIsSending(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSending(false);
      setMessageSent(true);
      setSupportMessage('');
      
      // Reset message sent status after 3 seconds
      setTimeout(() => {
        setMessageSent(false);
      }, 3000);
    }, 1000);
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Help & Support</h1>
      
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help topics..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="contact">Contact Support</TabsTrigger>
        </TabsList>
        
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find answers to common questions about using the scheduling platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I connect my calendar?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">You can connect your calendar by going to the Integrations page in the sidebar. We support:</p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                      <li>Google Calendar</li>
                      <li>Microsoft Outlook</li>
                      <li>iCal feeds</li>
                    </ul>
                    <p>Click on the appropriate connection button and follow the authentication steps to grant access.</p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>How do I create a booking link?</AccordionTrigger>
                  <AccordionContent>
                    <p>To create a booking link:</p>
                    <ol className="list-decimal pl-6 mb-4 space-y-2">
                      <li>Navigate to the "Booking Links" page from the sidebar</li>
                      <li>Click the "Create New Booking Link" button</li>
                      <li>Set your availability, meeting duration, and other preferences</li>
                      <li>Click "Create" to generate your link</li>
                      <li>Share the link with others who want to book time with you</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do teams work?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Teams allow you to coordinate scheduling across multiple members. Team managers can:
                    </p>
                    <ul className="list-disc pl-6 mb-4 space-y-1">
                      <li>View team member availability</li>
                      <li>Create team events</li>
                      <li>Manage team settings</li>
                      <li>Add or remove team members (requires company admin permissions)</li>
                    </ul>
                    <p>
                      Team members will see team events on their calendar and receive notifications
                      about upcoming team events.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>How do I manage notifications?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Notification settings can be managed in your account settings:
                    </p>
                    <ol className="list-decimal pl-6 mb-4 space-y-1">
                      <li>Go to the "Settings" page from the sidebar</li>
                      <li>Select the "Notifications" tab</li>
                      <li>Enable or disable email notifications</li>
                      <li>Configure reminder timing preferences</li>
                      <li>Save your changes</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger>What are the account permission levels?</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">Our system has several user roles with different permissions:</p>
                    <ul className="list-disc pl-6 mb-4 space-y-2">
                      <li>
                        <strong>Admin:</strong> Full system access, can manage all users, organizations, and settings
                      </li>
                      <li>
                        <strong>Company Admin:</strong> Can manage their organization, teams, and members
                      </li>
                      <li>
                        <strong>Team Manager:</strong> Can manage their team's schedule and members
                      </li>
                      <li>
                        <strong>User:</strong> Can manage their personal schedule and booking links
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>
                Comprehensive guides and reference materials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4 border">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Getting Started Guide</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Learn the basics of setting up your account and calendar.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 flex items-center">
                        <span>Read Guide</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 border">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">API Documentation</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Developer resources for integrating with our platform.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 flex items-center">
                        <span>View API Docs</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 border">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Admin Guide</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Learn how to manage organizations, teams, and users.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 flex items-center">
                        <span>Read Guide</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 border">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Knowledge Base</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Detailed articles on specific features and use cases.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2 flex items-center">
                        <span>Browse Articles</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tutorials">
          <Card>
            <CardHeader>
              <CardTitle>Tutorials</CardTitle>
              <CardDescription>
                Step-by-step guides to help you get the most out of the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-slate-200 dark:bg-slate-800 w-full md:w-64 h-40 md:h-auto flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-slate-400" />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">Getting Started with Your Calendar</h3>
                        <Badge>Beginner</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 mb-4">
                        Learn how to set up your calendar, manage events, and integrate with external calendars.
                      </p>
                      <Button variant="outline" size="sm" className="flex items-center">
                        <span>Start Tutorial</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-slate-200 dark:bg-slate-800 w-full md:w-64 h-40 md:h-auto flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-slate-400" />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">Creating Effective Booking Links</h3>
                        <Badge>Intermediate</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 mb-4">
                        Learn best practices for setting up booking links that optimize your availability.
                      </p>
                      <Button variant="outline" size="sm" className="flex items-center">
                        <span>Start Tutorial</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-slate-200 dark:bg-slate-800 w-full md:w-64 h-40 md:h-auto flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-slate-400" />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">Team Scheduling Strategies</h3>
                        <Badge>Advanced</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 mb-4">
                        Learn how to coordinate team availability and set up efficient scheduling workflows.
                      </p>
                      <Button variant="outline" size="sm" className="flex items-center">
                        <span>Start Tutorial</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Need help with something specific? Our support team is here to help.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium mb-4">Send us a message</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="supportMessage" className="block text-sm font-medium mb-1">
                        Describe your issue
                      </label>
                      <Textarea
                        id="supportMessage"
                        placeholder="Please provide details about your question or issue..."
                        rows={5}
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                      />
                    </div>
                    
                    <Button 
                      disabled={!supportMessage.trim() || isSending}
                      onClick={handleSendSupportMessage}
                      className="w-full"
                    >
                      {isSending ? "Sending..." : messageSent ? "Message Sent!" : "Send Message"}
                    </Button>
                    
                    <p className="text-sm text-muted-foreground">
                      Our support team typically responds within 24 hours.
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-sm text-muted-foreground">support@smartscheduler.com</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Monitored 24/7, expect a response within 24 hours
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Live Chat</p>
                        <p className="text-sm text-muted-foreground">Available Monday-Friday</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          9:00 AM - 5:00 PM EST
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Start Chat
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Support Ticket</p>
                        <p className="text-sm text-muted-foreground">
                          Submit a support ticket for complex issues
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Create Ticket
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}