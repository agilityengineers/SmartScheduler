import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalendarIntegrations, useGoogleCalendarAuth, useOutlookCalendarAuth, useConnectiCalCalendar, useDisconnectCalendar, useSyncCalendar } from '@/hooks/useCalendarIntegration';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIntegration } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

const iCalFormSchema = z.object({
  calendarUrl: z.string().url({ message: 'Please enter a valid calendar URL' })
});

type ICalFormValues = z.infer<typeof iCalFormSchema>;

export default function IntegrationSettings() {
  const { data: integrations = [], isLoading } = useCalendarIntegrations();
  const googleAuth = useGoogleCalendarAuth();
  const outlookAuth = useOutlookCalendarAuth();
  const connectiCal = useConnectiCalCalendar();
  const { toast } = useToast();
  
  const [showICalForm, setShowICalForm] = useState(false);
  
  const googleDisconnect = useDisconnectCalendar('google');
  const outlookDisconnect = useDisconnectCalendar('outlook');
  const iCalDisconnect = useDisconnectCalendar('ical');
  
  const googleSync = useSyncCalendar('google');
  const outlookSync = useSyncCalendar('outlook');
  const iCalSync = useSyncCalendar('ical');
  
  const iCalForm = useForm<ICalFormValues>({
    resolver: zodResolver(iCalFormSchema),
    defaultValues: {
      calendarUrl: ''
    }
  });
  
  const getIntegrationByType = (type: string): CalendarIntegration | undefined => {
    return integrations.find(i => i.type === type);
  };
  
  const connectGoogle = async () => {
    try {
      const data = await googleAuth.refetch();
      if (data.data?.authUrl) {
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate Google auth URL',
        variant: 'destructive'
      });
    }
  };
  
  const connectOutlook = async () => {
    try {
      const data = await outlookAuth.refetch();
      if (data.data?.authUrl) {
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate Outlook auth URL',
        variant: 'destructive'
      });
    }
  };
  
  const handleICalSubmit = (values: ICalFormValues) => {
    connectiCal.mutate(values.calendarUrl, {
      onSuccess: () => {
        setShowICalForm(false);
        iCalForm.reset();
      }
    });
  };
  
  const formatLastSynced = (date: string | Date | undefined) => {
    if (!date) return 'Never synced';
    
    const lastSynced = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastSynced.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 60 * 24) return `${Math.floor(diffMins / 60)} hours ago`;
    return lastSynced.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar Integrations</CardTitle>
          <CardDescription>
            Connect your external calendars to sync events and manage availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-icons text-primary">event</span>
              </div>
              <div>
                <h3 className="font-medium">Google Calendar</h3>
                {getIntegrationByType('google')?.isConnected ? (
                  <p className="text-sm text-neutral-500">
                    Last synced: {formatLastSynced(getIntegrationByType('google')?.lastSynced)}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500">Not connected</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {getIntegrationByType('google')?.isConnected ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => googleSync.mutate()}
                    disabled={googleSync.isPending}
                  >
                    {googleSync.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => googleDisconnect.mutate()}
                    disabled={googleDisconnect.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={connectGoogle}
                  disabled={googleAuth.isLoading || googleAuth.isFetching}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Outlook Calendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-icons text-primary">calendar_today</span>
              </div>
              <div>
                <h3 className="font-medium">Outlook Calendar</h3>
                {getIntegrationByType('outlook')?.isConnected ? (
                  <p className="text-sm text-neutral-500">
                    Last synced: {formatLastSynced(getIntegrationByType('outlook')?.lastSynced)}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500">Not connected</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {getIntegrationByType('outlook')?.isConnected ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => outlookSync.mutate()}
                    disabled={outlookSync.isPending}
                  >
                    {outlookSync.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => outlookDisconnect.mutate()}
                    disabled={outlookDisconnect.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={connectOutlook}
                  disabled={outlookAuth.isLoading || outlookAuth.isFetching}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* iCalendar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-icons text-primary">today</span>
              </div>
              <div>
                <h3 className="font-medium">iCalendar</h3>
                {getIntegrationByType('ical')?.isConnected ? (
                  <p className="text-sm text-neutral-500">
                    Last synced: {formatLastSynced(getIntegrationByType('ical')?.lastSynced)}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500">Not connected</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {getIntegrationByType('ical')?.isConnected ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => iCalSync.mutate()}
                    disabled={iCalSync.isPending}
                  >
                    {iCalSync.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => iCalDisconnect.mutate()}
                    disabled={iCalDisconnect.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowICalForm(true)}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
          
          {/* iCal Form */}
          {showICalForm && (
            <Form {...iCalForm}>
              <form onSubmit={iCalForm.handleSubmit(handleICalSubmit)} className="space-y-4 p-4 border rounded-lg mt-4">
                <FormField
                  control={iCalForm.control}
                  name="calendarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>iCalendar URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter calendar URL (e.g., webcal://...)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowICalForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={connectiCal.isPending}>
                    {connectiCal.isPending ? 'Connecting...' : 'Connect Calendar'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
