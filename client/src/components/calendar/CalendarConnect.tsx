import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
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

/**
 * Validates an app-specific password format.
 * Apple app-specific passwords are 16 lowercase letters, optionally separated by dashes
 * in groups of 4 (e.g., "abcd-efgh-ijkl-mnop" or "abcdefghijklmnop").
 */
function validateAppSpecificPassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'App-specific password is required.' };
  }

  // Strip dashes and spaces for validation
  const stripped = password.replace(/[-\s]/g, '');

  if (stripped.length !== 16) {
    return {
      valid: false,
      message: 'App-specific password should be 16 characters (format: xxxx-xxxx-xxxx-xxxx).'
    };
  }

  if (!/^[a-z]+$/.test(stripped)) {
    return {
      valid: false,
      message: 'App-specific password should contain only lowercase letters. Make sure you are not using your regular Apple ID password.'
    };
  }

  return { valid: true };
}

export function CalendarConnect({ calendarType, open, onOpenChange }: CalendarConnectProps) {
  const { toast } = useToast();
  const [calendarName, setCalendarName] = useState('');
  const [iCalUrl, setICalUrl] = useState('');
  const [appleId, setAppleId] = useState('');
  const [appSpecificPassword, setAppSpecificPassword] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [iCloudError, setICloudError] = useState<string | null>(null);

  // Hooks for different calendar types
  const googleAuth = useGoogleCalendarAuth(calendarName || undefined);
  const outlookAuth = useOutlookCalendarAuth(calendarName || undefined);
  const iCalConnect = useConnectiCalCalendar();
  const iCloudConnect = useConnectiCloudCalendar();

  const handleConnect = async () => {
    setICloudError(null);

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

        // Validate app-specific password format
        const passwordValidation = validateAppSpecificPassword(appSpecificPassword);
        if (!passwordValidation.valid) {
          setICloudError(passwordValidation.message || 'Invalid password format.');
          toast({
            title: "Invalid Password Format",
            description: passwordValidation.message,
            variant: "destructive",
          });
          return;
        }

        await iCloudConnect.mutateAsync({
          appleId,
          appSpecificPassword,
          name: calendarName || 'iCloud Calendar'
        });
        setICloudError(null);
        onOpenChange(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to calendar";

      // Provide actionable iCloud-specific error guidance
      if (calendarType === 'icloud') {
        if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('invalid credentials')) {
          setICloudError(
            'Authentication failed. Please verify: (1) Your Apple ID email is correct, (2) You are using an app-specific password (not your regular password), and (3) Two-Factor Authentication is enabled on your Apple ID.'
          );
        } else if (errorMessage.includes('403') || errorMessage.toLowerCase().includes('forbidden')) {
          setICloudError(
            'Access denied. If you have Advanced Data Protection enabled on your Apple ID, CalDAV access may be restricted. Try disabling it temporarily or contact Apple Support.'
          );
        } else if (errorMessage.toLowerCase().includes('homeurl') || errorMessage.toLowerCase().includes('home url') || errorMessage.toLowerCase().includes('cannot find')) {
          setICloudError(
            'Could not connect to iCloud CalDAV service. This may be a temporary Apple server issue. Please try again in a few minutes.'
          );
        } else if (errorMessage.toLowerCase().includes('no calendars found')) {
          setICloudError(
            'No calendars were found in your iCloud account. Please make sure you have at least one calendar in your iCloud account at icloud.com/calendar.'
          );
        } else if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('econnrefused')) {
          setICloudError(
            'Could not reach the iCloud server. Please check your internet connection and try again.'
          );
        } else {
          setICloudError(errorMessage);
        }
      }

      toast({
        title: "Connection Error",
        description: errorMessage,
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
        return 'Connect your iCloud Calendar using your Apple ID and an app-specific password. Two-Factor Authentication must be enabled on your Apple ID.';
      default:
        return 'Connect your calendar to sync events with SmartScheduler.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setICloudError(null);
        setShowSetupGuide(false);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
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
              {/* Prerequisites notice */}
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">Before you begin:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>Two-Factor Authentication (2FA) must be enabled on your Apple ID</li>
                      <li>You need an app-specific password (not your regular password)</li>
                      <li>Advanced Data Protection must be disabled for CalDAV access</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appleId">Apple ID Email</Label>
                <Input
                  id="appleId"
                  type="email"
                  placeholder="your.email@icloud.com"
                  value={appleId}
                  onChange={(e) => {
                    setAppleId(e.target.value);
                    setICloudError(null);
                  }}
                />
                <p className="text-sm text-neutral-500">
                  The email address associated with your Apple ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSpecificPassword">App-Specific Password</Label>
                <Input
                  id="appSpecificPassword"
                  type="password"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={appSpecificPassword}
                  onChange={(e) => {
                    setAppSpecificPassword(e.target.value);
                    setICloudError(null);
                  }}
                />
                <p className="text-xs text-neutral-500">
                  Format: 16 lowercase letters separated by dashes (e.g., abcd-efgh-ijkl-mnop)
                </p>
              </div>

              {/* Collapsible Setup Guide */}
              <div className="border rounded-md dark:border-slate-700">
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-md"
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                >
                  <span>How to generate an app-specific password</span>
                  {showSetupGuide ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showSetupGuide && (
                  <div className="px-3 pb-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>Go to <a href="https://appleid.apple.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">appleid.apple.com</a> and sign in</li>
                      <li>Enable <strong>Two-Factor Authentication</strong> if not already enabled (under Sign-In and Security)</li>
                      <li>Navigate to <strong>Sign-In and Security</strong> &rarr; <strong>App-Specific Passwords</strong></li>
                      <li>Click <strong>Generate an app-specific password</strong></li>
                      <li>Enter a label (e.g., "SmartScheduler") and click <strong>Create</strong></li>
                      <li>Copy the generated password and paste it above</li>
                    </ol>
                    <p className="text-neutral-500 dark:text-neutral-500 mt-2 italic">
                      Note: Do not use your regular Apple ID password. App-specific passwords are separate and are required for third-party app access.
                    </p>
                  </div>
                )}
              </div>

              {/* Error display with actionable guidance */}
              {iCloudError && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-300">{iCloudError}</p>
                  </div>
                </div>
              )}
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