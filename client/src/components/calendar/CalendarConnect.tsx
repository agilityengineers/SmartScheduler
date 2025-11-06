import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useGoogleCalendarAuth,
  useOutlookCalendarAuth,
  useConnectiCalCalendar,
  useConnectiCloudCalendar
} from '@/hooks/useCalendarIntegration';

interface CalendarConnectProps {
  calendarType: 'google' | 'outlook' | 'ical' | 'icloud';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarConnect({ calendarType, open, onOpenChange }: CalendarConnectProps) {
  const { toast } = useToast();
  const [calendarName, setCalendarName] = useState('');
  const [iCalUrl, setICalUrl] = useState('');
  const [appleId, setAppleId] = useState('');
  const [appSpecificPassword, setAppSpecificPassword] = useState('');

  // Hooks for different calendar types
  const googleAuth = useGoogleCalendarAuth(calendarName || undefined);
  const outlookAuth = useOutlookCalendarAuth(calendarName || undefined);
  const iCalConnect = useConnectiCalCalendar();
  const iCloudConnect = useConnectiCloudCalendar();

  const handleConnect = async () => {
    try {
      if (calendarType === 'google') {
        const result = await googleAuth.refetch();
        if (result.data?.authUrl) {
          window.location.href = result.data.authUrl;
        }
      } else if (calendarType === 'outlook') {
        const result = await outlookAuth.refetch();
        if (result.data?.authUrl) {
          window.location.href = result.data.authUrl;
        }
      } else if (calendarType === 'ical') {
        if (!iCalUrl) {
          toast({
            title: "URL Required",
            description: "Please enter an iCalendar URL",
            variant: "destructive",
          });
          return;
        }

        await iCalConnect.mutateAsync({
          calendarUrl: iCalUrl,
          name: calendarName || 'iCalendar'
        });
        onOpenChange(false);
      } else if (calendarType === 'icloud') {
        if (!appleId || !appSpecificPassword) {
          toast({
            title: "Credentials Required",
            description: "Please enter your Apple ID and app-specific password",
            variant: "destructive",
          });
          return;
        }

        await iCloudConnect.mutateAsync({
          appleId,
          appSpecificPassword,
          name: calendarName || 'iCloud Calendar'
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to calendar",
        variant: "destructive",
      });
    }
  };

  const getTitle = () => {
    switch (calendarType) {
      case 'google': return 'Connect Google Calendar';
      case 'outlook': return 'Connect Outlook Calendar';
      case 'ical': return 'Connect iCalendar';
      case 'icloud': return 'Connect iCloud Calendar';
      default: return 'Connect Calendar';
    }
  };

  const getDescription = () => {
    switch (calendarType) {
      case 'google':
        return 'Connect your Google Calendar to sync events with SmartScheduler.';
      case 'outlook':
        return 'Connect your Outlook Calendar to sync events with SmartScheduler.';
      case 'ical':
        return 'Enter an iCalendar URL to import events. Note: iCalendar connections are read-only.';
      case 'icloud':
        return 'Connect your iCloud Calendar using your Apple ID and an app-specific password. Generate an app-specific password at appleid.apple.com.';
      default:
        return 'Connect your calendar to sync events with SmartScheduler.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="calendarName">Calendar Name (Optional)</Label>
            <Input 
              id="calendarName" 
              placeholder="Work, Personal, etc." 
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
            />
            <p className="text-sm text-neutral-500">
              A name to help you identify this calendar
            </p>
          </div>

          {calendarType === 'ical' && (
            <div className="space-y-2">
              <Label htmlFor="iCalUrl">iCalendar URL</Label>
              <Input
                id="iCalUrl"
                placeholder="https://..."
                value={iCalUrl}
                onChange={(e) => setICalUrl(e.target.value)}
              />
              <p className="text-sm text-neutral-500">
                Enter the URL of your iCalendar feed
              </p>
            </div>
          )}

          {calendarType === 'icloud' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="appleId">Apple ID</Label>
                <Input
                  id="appleId"
                  type="email"
                  placeholder="your.email@icloud.com"
                  value={appleId}
                  onChange={(e) => setAppleId(e.target.value)}
                />
                <p className="text-sm text-neutral-500">
                  Your Apple ID email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSpecificPassword">App-Specific Password</Label>
                <Input
                  id="appSpecificPassword"
                  type="password"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={appSpecificPassword}
                  onChange={(e) => setAppSpecificPassword(e.target.value)}
                />
                <p className="text-sm text-neutral-500">
                  Generate at <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">appleid.apple.com</a> → Security → App-Specific Passwords
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={
              (calendarType === 'ical' && !iCalUrl) ||
              (calendarType === 'icloud' && (!appleId || !appSpecificPassword)) ||
              (googleAuth.isFetching || outlookAuth.isFetching || iCalConnect.isPending || iCloudConnect.isPending)
            }
          >
            {googleAuth.isFetching || outlookAuth.isFetching || iCalConnect.isPending || iCloudConnect.isPending
              ? 'Connecting...'
              : 'Connect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}