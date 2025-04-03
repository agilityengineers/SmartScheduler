import { useState } from 'react';
import { useCalendarIntegrations } from '@/hooks/useCalendarIntegration';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarConnect } from '@/components/calendar/CalendarConnect';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import { CalendarIntegration } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { 
  Video, 
  MessageCircle, 
  CreditCard, 
  CalendarClock,
  Check,
  X,
  Plug,
  Zap
} from 'lucide-react';

export default function Integrations() {
  const { user } = useUser();
  const { toast } = useToast();
  const { data: calendarIntegrations, isLoading } = useCalendarIntegrations();
  const [activeTab, setActiveTab] = useState('calendars');
  const [connectDialogType, setConnectDialogType] = useState<'google' | 'outlook' | 'ical' | null>(null);
  
  // Integration category modals
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [showSalesforceModal, setShowSalesforceModal] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showZapierModal, setShowZapierModal] = useState(false);
  
  // Form states for integration modals
  const [zoomApiKey, setZoomApiKey] = useState('');
  const [zoomApiSecret, setZoomApiSecret] = useState('');
  const [zoomAccountId, setZoomAccountId] = useState('');
  const [zoomIsOAuth, setZoomIsOAuth] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [salesforceClientId, setSalesforceClientId] = useState('');
  const [salesforceClientSecret, setSalesforceClientSecret] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [zapierIntegrationName, setZapierIntegrationName] = useState('');
  const [zapierApiKey, setZapierApiKey] = useState('');
  const [isConnectingZapier, setIsConnectingZapier] = useState(false);
  
  const [isConnectingZoom, setIsConnectingZoom] = useState(false);
  
  const handleZoomConnect = async () => {
    if (!zoomApiKey || !zoomApiSecret) {
      toast({
        title: "Error",
        description: "Zoom API Key and API Secret are required",
        variant: "destructive"
      });
      return;
    }
    
    // For OAuth type, account ID is required
    if (zoomIsOAuth && !zoomAccountId) {
      toast({
        title: "Error",
        description: "Account ID is required for Server-to-Server OAuth apps",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsConnectingZoom(true);
      
      // Connect to Zoom using our Zoom API endpoint
      const response = await fetch('/api/integrations/zoom/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: zoomApiKey,
          apiSecret: zoomApiSecret,
          name: 'Zoom Integration',
          accountId: zoomAccountId || undefined,
          isOAuth: zoomIsOAuth
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to connect to Zoom');
      }
      
      const integration = await response.json();
      
      toast({
        title: "Success",
        description: "Successfully connected to Zoom",
      });
      
      // Refresh calendar integrations
      // This should trigger a refetch if you're using react-query
      
      // Clear form and close modal
      setZoomApiKey('');
      setZoomApiSecret('');
      setZoomAccountId('');
      setZoomIsOAuth(false);
      setShowZoomModal(false);
    } catch (error) {
      console.error('Error connecting to Zoom:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Zoom",
        variant: "destructive"
      });
    } finally {
      setIsConnectingZoom(false);
    }
  };
  
  const handleSlackConnect = () => {
    // Would connect to Slack API in a real implementation
    toast({
      title: "Integration Demo",
      description: "This would connect to Slack in a real implementation",
    });
    setShowSlackModal(false);
  };
  
  const handleSalesforceConnect = () => {
    // Would connect to Salesforce API in a real implementation
    toast({
      title: "Integration Demo",
      description: "This would connect to Salesforce in a real implementation",
    });
    setShowSalesforceModal(false);
  };
  
  const handleStripeConnect = () => {
    // Would connect to Stripe API in a real implementation
    toast({
      title: "Integration Demo",
      description: "This would connect to Stripe in a real implementation",
    });
    setShowStripeModal(false);
  };
  
  const handleZapierConnect = async () => {
    try {
      setIsConnectingZapier(true);
      
      // Real implementation to connect to Zapier
      const name = zapierIntegrationName || 'My Zapier Integration';
      
      // With apiRequest correctly typed for POST requests
      const response = await fetch('/api/integrations/zapier/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store the API key to show to the user
        setZapierApiKey(data.apiKey);
        
        toast({
          title: "Success",
          description: "Successfully connected to Zapier",
        });
        
        // We don't close the modal yet because we want to show the API key
      } else {
        toast({
          title: "Error",
          description: "Failed to connect to Zapier",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error connecting to Zapier:', error);
      toast({
        title: "Error",
        description: "Failed to connect to Zapier: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsConnectingZapier(false);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-slate-950">
      <Sidebar className="hidden md:block" />
      
      <div className="flex-1 flex flex-col">
        <AppHeader notificationCount={0} />
        
        <div className="md:hidden">
          <MobileNavigation onCreateEventClick={() => {}} />
        </div>
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Integrations</h1>
          </div>
          
          <div className="mb-8">
            <Tabs defaultValue="calendars" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="calendars">Calendar</TabsTrigger>
                <TabsTrigger value="video">Video Conferencing</TabsTrigger>
                <TabsTrigger value="messaging">Messaging</TabsTrigger>
                <TabsTrigger value="crm">CRM & Payments</TabsTrigger>
              </TabsList>
              
              {/* Calendar Integrations Tab */}
              <TabsContent value="calendars" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Google Calendar Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-red-600 font-bold">G</span>
                        </div>
                        Google Calendar
                      </CardTitle>
                      <CardDescription>
                        Sync your events with Google Calendar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'google' && i.isConnected) ? (
                            <div className="flex items-center">
                              <Check className="mr-2 h-5 w-5 text-green-500" />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <X className="mr-2 h-5 w-5 text-red-500" />
                              <span>Not connected</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => setConnectDialogType('google')}
                          variant={Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'google' && i.isConnected) ? "outline" : "default"}
                        >
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'google' && i.isConnected) ? 'Manage' : 'Connect'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Outlook Calendar Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-bold">O</span>
                        </div>
                        Outlook Calendar
                      </CardTitle>
                      <CardDescription>
                        Sync your events with Outlook Calendar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'outlook' && i.isConnected) ? (
                            <div className="flex items-center">
                              <Check className="mr-2 h-5 w-5 text-green-500" />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <X className="mr-2 h-5 w-5 text-red-500" />
                              <span>Not connected</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => setConnectDialogType('outlook')}
                          variant={Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'outlook' && i.isConnected) ? "outline" : "default"}
                        >
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'outlook' && i.isConnected) ? 'Manage' : 'Connect'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* iCal Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-bold">iC</span>
                        </div>
                        iCalendar
                      </CardTitle>
                      <CardDescription>
                        Import events from any iCal feed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'ical' && i.isConnected) ? (
                            <div className="flex items-center">
                              <Check className="mr-2 h-5 w-5 text-green-500" />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <X className="mr-2 h-5 w-5 text-red-500" />
                              <span>Not connected</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => setConnectDialogType('ical')}
                          variant={Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'ical' && i.isConnected) ? "outline" : "default"}
                        >
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'ical' && i.isConnected) ? 'Manage' : 'Connect'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Video Conferencing Tab */}
              <TabsContent value="video" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Zoom Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Video className="h-4 w-4 text-blue-600" />
                        </div>
                        Zoom
                      </CardTitle>
                      <CardDescription>
                        Automatically create Zoom meetings for bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'zoom' && i.isConnected) ? (
                            <div className="flex items-center">
                              <Check className="mr-2 h-5 w-5 text-green-500" />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <X className="mr-2 h-5 w-5 text-red-500" />
                              <span>Not connected</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => {
                            const zoomIntegration = Array.isArray(calendarIntegrations) && 
                              calendarIntegrations.find((i: CalendarIntegration) => i.type === 'zoom' && i.isConnected);
                            
                            if (zoomIntegration) {
                              // Would open Zoom settings or disconnect dialog in a real implementation
                              toast({
                                title: "Manage Zoom",
                                description: "This would allow you to manage your Zoom integration"
                              });
                            } else {
                              setShowZoomModal(true);
                            }
                          }}
                          variant={Array.isArray(calendarIntegrations) && 
                            calendarIntegrations.some((i: CalendarIntegration) => i.type === 'zoom' && i.isConnected) 
                              ? "outline" : "default"}
                        >
                          {Array.isArray(calendarIntegrations) && 
                            calendarIntegrations.some((i: CalendarIntegration) => i.type === 'zoom' && i.isConnected) 
                              ? 'Manage' : 'Connect'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Google Meet Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Video className="h-4 w-4 text-green-600" />
                        </div>
                        Google Meet
                      </CardTitle>
                      <CardDescription>
                        Automatically create Google Meet links for bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Microsoft Teams Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Video className="h-4 w-4 text-purple-600" />
                        </div>
                        Microsoft Teams
                      </CardTitle>
                      <CardDescription>
                        Automatically create Teams meetings for bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Messaging Tab */}
              <TabsContent value="messaging" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Slack Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                        </div>
                        Slack
                      </CardTitle>
                      <CardDescription>
                        Get notifications for new bookings in Slack
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button onClick={() => setShowSlackModal(true)}>
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Microsoft Teams Notifications Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        MS Teams Notifications
                      </CardTitle>
                      <CardDescription>
                        Get notifications for new bookings in Teams
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Discord Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-indigo-600" />
                        </div>
                        Discord
                      </CardTitle>
                      <CardDescription>
                        Get notifications for new bookings in Discord
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* CRM & Payments Tab */}
              <TabsContent value="crm" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Salesforce Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Plug className="h-4 w-4 text-blue-600" />
                        </div>
                        Salesforce
                      </CardTitle>
                      <CardDescription>
                        Sync contacts and create leads from bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button onClick={() => setShowSalesforceModal(true)}>
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* HubSpot Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Plug className="h-4 w-4 text-orange-600" />
                        </div>
                        HubSpot
                      </CardTitle>
                      <CardDescription>
                        Sync contacts and bookings with HubSpot CRM
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Zapier Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-orange-600" />
                        </div>
                        Zapier
                      </CardTitle>
                      <CardDescription>
                        Connect your calendar with 5,000+ apps
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'zapier' && i.isConnected) ? (
                            <div className="flex items-center">
                              <Check className="mr-2 h-5 w-5 text-green-500" />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <X className="mr-2 h-5 w-5 text-red-500" />
                              <span>Not connected</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => setShowZapierModal(true)}
                          variant={Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'zapier' && i.isConnected) ? "outline" : "default"}
                        >
                          {Array.isArray(calendarIntegrations) && calendarIntegrations.some((i: CalendarIntegration) => i.type === 'zapier' && i.isConnected) ? 'Manage' : 'Connect'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Stripe Integration Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center">
                        <div className="mr-2 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                        </div>
                        Stripe
                      </CardTitle>
                      <CardDescription>
                        Accept payments for paid appointments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button onClick={() => setShowStripeModal(true)}>
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Integration Settings Section */}
          <div className="mt-8 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Integration Settings</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Default Behavior</CardTitle>
                <CardDescription>
                  Configure how integrations work by default
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-create video meetings</Label>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      Automatically create a video meeting link for each new booking
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send notifications</Label>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      Send notifications to connected messaging platforms
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-way sync</Label>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      Changes made in external calendars will sync back
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Calendar Connect Dialogs */}
      {connectDialogType && (
        <CalendarConnect
          calendarType={connectDialogType}
          open={Boolean(connectDialogType)}
          onOpenChange={(open) => {
            if (!open) setConnectDialogType(null);
          }}
        />
      )}
      
      {/* Zoom Integration Modal */}
      <Dialog open={showZoomModal} onOpenChange={(open) => {
        if (!isConnectingZoom) {
          setShowZoomModal(open);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Zoom</DialogTitle>
            <DialogDescription>
              Enter your Zoom credentials to enable automatic meeting creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2 mb-2">
              <Switch 
                id="zoom-oauth-type" 
                checked={zoomIsOAuth} 
                onCheckedChange={setZoomIsOAuth}
                disabled={isConnectingZoom}
              />
              <Label htmlFor="zoom-oauth-type">
                Use Server-to-Server OAuth (Recommended)
              </Label>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="zoom-api-key">
                Client ID
              </Label>
              <Input
                id="zoom-api-key"
                placeholder="Enter your Zoom Client ID"
                value={zoomApiKey}
                onChange={(e) => setZoomApiKey(e.target.value)}
                disabled={isConnectingZoom}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="zoom-api-secret">
                Client Secret
              </Label>
              <Input
                id="zoom-api-secret"
                type="password"
                placeholder="Enter your Zoom Client Secret"
                value={zoomApiSecret}
                onChange={(e) => setZoomApiSecret(e.target.value)}
                disabled={isConnectingZoom}
              />
            </div>
            
            {zoomIsOAuth && (
              <div className="grid gap-2">
                <Label htmlFor="zoom-account-id">Account ID</Label>
                <Input
                  id="zoom-account-id"
                  placeholder="Enter your Zoom Account ID"
                  value={zoomAccountId}
                  onChange={(e) => setZoomAccountId(e.target.value)}
                  disabled={isConnectingZoom}
                />
              </div>
            )}
            
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 border-t pt-2">
              <p className="font-medium mb-1">How to get Zoom credentials:</p>
              
              <div className={`mb-3 ${zoomIsOAuth ? 'opacity-100' : 'opacity-70'}`}>
                <h4 className="text-sm font-medium mb-1">Option 1: Server-to-Server OAuth App (Recommended)</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Sign in to the <a href="https://marketplace.zoom.us/" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Zoom Marketplace</a></li>
                  <li>Click "Develop" in the top-right and select "Build App"</li>
                  <li>Select "Server-to-Server OAuth" app type</li>
                  <li>Fill out the required information for your app</li>
                  <li>In the "Scopes" section, add necessary permissions (e.g., meeting:write, meeting:read)</li>
                  <li>After creation, copy your "Account ID", "Client ID", and "Client Secret"</li>
                </ol>
                <p className="mt-1 text-xs italic">Note: This is Zoom's recommended approach for new integrations as JWT apps are being deprecated.</p>
              </div>
              
              <div className={zoomIsOAuth ? 'opacity-70' : 'opacity-100'}>
                <h4 className="text-sm font-medium mb-1">Option 2: JWT App (Legacy Method)</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Sign in to the <a href="https://marketplace.zoom.us/" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Zoom Marketplace</a></li>
                  <li>Click "Develop" in the top-right and select "Build App"</li>
                  <li>Choose "JWT" as the app type</li>
                  <li>Fill out the required information for your app</li>
                  <li>Once created, you can find your API Key and API Secret in the "App Credentials" section</li>
                </ol>
                <p className="mt-1 text-xs italic">Note: JWT apps are being deprecated by Zoom. Consider using Server-to-Server OAuth for future compatibility.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowZoomModal(false)}
              disabled={isConnectingZoom}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleZoomConnect}
              disabled={isConnectingZoom || !zoomApiKey || !zoomApiSecret}
            >
              {isConnectingZoom ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800"></div>
                  Connecting...
                </>
              ) : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Slack Integration Modal */}
      <Dialog open={showSlackModal} onOpenChange={setShowSlackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Slack</DialogTitle>
            <DialogDescription>
              Enter your Slack webhook URL to enable notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="slack-webhook">Webhook URL</Label>
              <Input
                id="slack-webhook"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlackModal(false)}>Cancel</Button>
            <Button onClick={handleSlackConnect}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Salesforce Integration Modal */}
      <Dialog open={showSalesforceModal} onOpenChange={setShowSalesforceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Salesforce</DialogTitle>
            <DialogDescription>
              Enter your Salesforce API credentials to sync contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="salesforce-client-id">Client ID</Label>
              <Input
                id="salesforce-client-id"
                placeholder="Enter your Salesforce Client ID"
                value={salesforceClientId}
                onChange={(e) => setSalesforceClientId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salesforce-client-secret">Client Secret</Label>
              <Input
                id="salesforce-client-secret"
                type="password"
                placeholder="Enter your Salesforce Client Secret"
                value={salesforceClientSecret}
                onChange={(e) => setSalesforceClientSecret(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalesforceModal(false)}>Cancel</Button>
            <Button onClick={handleSalesforceConnect}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Zapier Integration Modal */}
      <Dialog open={showZapierModal} onOpenChange={setShowZapierModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Zapier</DialogTitle>
            <DialogDescription>
              Connect your calendar with thousands of apps through Zapier.
            </DialogDescription>
          </DialogHeader>
          {zapierApiKey ? (
            <div className="grid gap-4 py-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
                <h3 className="font-medium mb-2 text-slate-900 dark:text-slate-100">Your Zapier API Key</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Use this API key to authenticate with Zapier. Keep this key secret!
                </p>
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <code className="text-sm font-mono text-slate-900 dark:text-slate-100">{zapierApiKey}</code>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(zapierApiKey);
                      toast({
                        title: "Copied!",
                        description: "API key copied to clipboard",
                      });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="zapier-webhook">Webhook URL (Optional)</Label>
                <Input
                  id="zapier-webhook"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  onChange={(e) => {
                    // Would update the webhook URL in a real implementation
                  }}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add a webhook URL to receive events from Zapier
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="zapier-name">Integration Name</Label>
                <Input
                  id="zapier-name"
                  placeholder="My Zapier Integration"
                  value={zapierIntegrationName}
                  onChange={(e) => setZapierIntegrationName(e.target.value)}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Give this integration a name to identify it in your account
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            {zapierApiKey ? (
              <>
                <Button variant="outline" onClick={() => {
                  setZapierApiKey('');
                  setShowZapierModal(false);
                }}>
                  Close
                </Button>
                <Button variant="default" onClick={() => {
                  // Would save webhook URL in a real implementation
                  setZapierApiKey('');
                  setShowZapierModal(false);
                  toast({
                    title: "Success",
                    description: "Zapier webhook URL updated",
                  });
                }}>
                  Save Settings
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowZapierModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleZapierConnect} 
                  disabled={isConnectingZapier}
                >
                  {isConnectingZapier ? 'Connecting...' : 'Connect to Zapier'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Stripe Integration Modal */}
      <Dialog open={showStripeModal} onOpenChange={setShowStripeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Stripe</DialogTitle>
            <DialogDescription>
              Enter your Stripe API keys to enable payments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stripe-publishable-key">Publishable Key</Label>
              <Input
                id="stripe-publishable-key"
                placeholder="pk_test_..."
                value={stripePublishableKey}
                onChange={(e) => setStripePublishableKey(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stripe-secret-key">Secret Key</Label>
              <Input
                id="stripe-secret-key"
                type="password"
                placeholder="sk_test_..."
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStripeModal(false)}>Cancel</Button>
            <Button onClick={handleStripeConnect}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}