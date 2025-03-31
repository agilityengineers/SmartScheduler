import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useCalendarIntegrations, 
  useDisconnectCalendar, 
  useSyncCalendar
} from '@/hooks/useCalendarIntegration';
import { CalendarIntegration } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { CalendarConnect } from '@/components/calendar/CalendarConnect';

export default function IntegrationSettings() {
  const { data: integrationsData = [], isLoading } = useCalendarIntegrations();
  const { toast } = useToast();
  
  // Safely type the integrations data
  const integrations: CalendarIntegration[] = Array.isArray(integrationsData) ? integrationsData : [];
  
  // State for calendar connect dialogs
  const [connectDialogType, setConnectDialogType] = useState<'google' | 'outlook' | 'ical' | null>(null);
  
  // Helper function to get integration by type
  const getIntegrationByType = (type: string): CalendarIntegration | undefined => {
    return integrations.find((i: CalendarIntegration) => i.type === type);
  };
  
  // Setup disconnect hooks with specific integration IDs if available
  const googleDisconnect = useDisconnectCalendar('google');
  const outlookDisconnect = useDisconnectCalendar('outlook');
  const iCalDisconnect = useDisconnectCalendar('ical');
  
  // Setup sync hooks with specific integration IDs if available
  const googleSync = useSyncCalendar('google');
  const outlookSync = useSyncCalendar('outlook');
  const iCalSync = useSyncCalendar('ical');
  
  const formatLastSynced = (date: string | Date | undefined | null) => {
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
                    onClick={() => googleSync.mutate(undefined)}
                    disabled={googleSync.isPending}
                  >
                    {googleSync.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => googleDisconnect.mutate(undefined)}
                    disabled={googleDisconnect.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setConnectDialogType('google')}
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
                    onClick={() => outlookSync.mutate(undefined)}
                    disabled={outlookSync.isPending}
                  >
                    {outlookSync.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => outlookDisconnect.mutate(undefined)}
                    disabled={outlookDisconnect.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setConnectDialogType('outlook')}
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
                    onClick={() => iCalSync.mutate(undefined)}
                    disabled={iCalSync.isPending}
                  >
                    {iCalSync.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => iCalDisconnect.mutate(undefined)}
                    disabled={iCalDisconnect.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setConnectDialogType('ical')}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
          
          {/* Calendar Connect Dialog */}
          {connectDialogType && (
            <CalendarConnect
              calendarType={connectDialogType}
              open={Boolean(connectDialogType)}
              onOpenChange={(open) => {
                if (!open) setConnectDialogType(null);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
