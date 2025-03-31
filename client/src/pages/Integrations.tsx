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
import { 
  Video, 
  MessageCircle, 
  CreditCard, 
  CalendarClock,
  Check,
  X,
  Plug
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
  
  // Form states for integration modals
  const [zoomApiKey, setZoomApiKey] = useState('');
  const [zoomApiSecret, setZoomApiSecret] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [salesforceClientId, setSalesforceClientId] = useState('');
  const [salesforceClientSecret, setSalesforceClientSecret] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  
  const handleZoomConnect = () => {
    // Would connect to Zoom API in a real implementation
    toast({
      title: "Integration Demo",
      description: "This would connect to Zoom in a real implementation",
    });
    setShowZoomModal(false);
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
                          {calendarIntegrations?.some(i => i.type === 'google' && i.isConnected) ? (
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
                          variant={calendarIntegrations?.some(i => i.type === 'google' && i.isConnected) ? "outline" : "default"}
                        >
                          {calendarIntegrations?.some(i => i.type === 'google' && i.isConnected) ? 'Manage' : 'Connect'}
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
                          {calendarIntegrations?.some(i => i.type === 'outlook' && i.isConnected) ? (
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
                          variant={calendarIntegrations?.some(i => i.type === 'outlook' && i.isConnected) ? "outline" : "default"}
                        >
                          {calendarIntegrations?.some(i => i.type === 'outlook' && i.isConnected) ? 'Manage' : 'Connect'}
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
                          {calendarIntegrations?.some(i => i.type === 'ical' && i.isConnected) ? (
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
                          variant={calendarIntegrations?.some(i => i.type === 'ical' && i.isConnected) ? "outline" : "default"}
                        >
                          {calendarIntegrations?.some(i => i.type === 'ical' && i.isConnected) ? 'Manage' : 'Connect'}
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
                          <div className="flex items-center">
                            <X className="mr-2 h-5 w-5 text-red-500" />
                            <span>Not connected</span>
                          </div>
                        </div>
                        <Button onClick={() => setShowZoomModal(true)}>
                          Connect
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
      <Dialog open={showZoomModal} onOpenChange={setShowZoomModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Zoom</DialogTitle>
            <DialogDescription>
              Enter your Zoom API credentials to enable automatic meeting creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="zoom-api-key">API Key</Label>
              <Input
                id="zoom-api-key"
                placeholder="Enter your Zoom API Key"
                value={zoomApiKey}
                onChange={(e) => setZoomApiKey(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zoom-api-secret">API Secret</Label>
              <Input
                id="zoom-api-secret"
                type="password"
                placeholder="Enter your Zoom API Secret"
                value={zoomApiSecret}
                onChange={(e) => setZoomApiSecret(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoomModal(false)}>Cancel</Button>
            <Button onClick={handleZoomConnect}>Connect</Button>
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