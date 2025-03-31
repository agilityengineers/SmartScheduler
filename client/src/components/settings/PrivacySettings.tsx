import { useState, useEffect } from 'react';
import { useUserSettings, useUpdateSettings } from '@/hooks/useReminders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PrivacySettings() {
  const { data: settings, isLoading } = useUserSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  
  const [defaultCalendar, setDefaultCalendar] = useState('google');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [isDirty, setIsDirty] = useState(false);
  
  // Initialize state from settings
  useEffect(() => {
    if (settings) {
      setDefaultCalendar(settings.defaultCalendar || 'google');
      setTimeFormat(settings.timeFormat || '12h');
      setIsDirty(false);
    }
  }, [settings]);
  
  const handleSave = () => {
    const updatedSettings: Partial<Settings> = {
      defaultCalendar,
      timeFormat,
    };
    
    updateSettings(updatedSettings, {
      onSuccess: () => {
        setIsDirty(false);
      }
    });
  };
  
  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Display Settings</CardTitle>
          <CardDescription>
            Manage your calendar display preferences and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Default Calendar</h3>
            <p className="text-sm text-neutral-500">
              Select which calendar to use as your primary calendar
            </p>
            <Select
              value={defaultCalendar}
              onValueChange={(value) => {
                setDefaultCalendar(value);
                setIsDirty(true);
              }}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Select default calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Calendar</SelectItem>
                <SelectItem value="outlook">Outlook Calendar</SelectItem>
                <SelectItem value="ical">iCalendar</SelectItem>
                <SelectItem value="local">Local Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <h3 className="text-sm font-medium">Time Format</h3>
            <div className="flex items-center space-x-4">
              <Button
                variant={timeFormat === '12h' ? 'default' : 'outline'}
                className="w-20"
                onClick={() => {
                  setTimeFormat('12h');
                  setIsDirty(true);
                }}
              >
                12-hour
              </Button>
              <Button
                variant={timeFormat === '24h' ? 'default' : 'outline'}
                className="w-20"
                onClick={() => {
                  setTimeFormat('24h');
                  setIsDirty(true);
                }}
              >
                24-hour
              </Button>
            </div>
            <div className="text-sm text-neutral-500 mt-2">
              Example: {timeFormat === '12h' ? '3:30 PM' : '15:30'}
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <h3 className="text-sm font-medium">Calendar Visibility</h3>
            <Tabs defaultValue="availability">
              <TabsList>
                <TabsTrigger value="availability">Free/Busy Time</TabsTrigger>
                <TabsTrigger value="details">Event Details</TabsTrigger>
              </TabsList>
              <TabsContent value="availability" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="free-busy-public" className="font-medium">Public Free/Busy</Label>
                    <p className="text-sm text-neutral-500">
                      Allow others to see your availability without event details
                    </p>
                  </div>
                  <Switch id="free-busy-public" />
                </div>
              </TabsContent>
              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="team-details" className="font-medium">Team Members</Label>
                    <p className="text-sm text-neutral-500">
                      Share event details with team members
                    </p>
                  </div>
                  <Switch id="team-details" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public-details" className="font-medium">Public Users</Label>
                    <p className="text-sm text-neutral-500">
                      Share event details with public users
                    </p>
                  </div>
                  <Switch id="public-details" />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <h3 className="text-sm font-medium">Booking Page Privacy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-available-slots" className="font-medium">Show available time slots</Label>
                  <p className="text-sm text-neutral-500">
                    Make your availability visible on booking pages
                  </p>
                </div>
                <Switch id="show-available-slots" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="require-approval" className="font-medium">Require approval</Label>
                  <p className="text-sm text-neutral-500">
                    Review and approve booking requests
                  </p>
                </div>
                <Switch id="require-approval" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-attendees" className="font-medium">Show attendee list</Label>
                  <p className="text-sm text-neutral-500">
                    Display other attendees on booking pages
                  </p>
                </div>
                <Switch id="show-attendees" />
              </div>
            </div>
          </div>
          
          {isDirty && (
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
