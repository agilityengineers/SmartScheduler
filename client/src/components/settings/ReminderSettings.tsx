import { useUserSettings, useUpdateSettings, useReminderOptions, formatReminderTime } from '@/hooks/useReminders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from '@shared/schema';
import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function ReminderSettings() {
  const { data: settings, isLoading } = useUserSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const reminderOptions = useReminderOptions();
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [defaultReminders, setDefaultReminders] = useState<number[]>([15]);
  const [isDirty, setIsDirty] = useState(false);
  
  // Initialize state from settings
  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.emailNotifications ?? true);
      setPushNotifications(settings.pushNotifications ?? true);
      setDefaultReminders(settings.defaultReminders as number[] || [15]);
      setIsDirty(false);
    }
  }, [settings]);
  
  const handleSave = () => {
    const updatedSettings: Partial<Settings> = {
      emailNotifications,
      pushNotifications,
      defaultReminders,
    };
    
    updateSettings(updatedSettings, {
      onSuccess: () => {
        setIsDirty(false);
      }
    });
  };
  
  const handleReminderChange = (value: string) => {
    const reminderTime = parseInt(value, 10);
    setDefaultReminders([reminderTime]);
    setIsDirty(true);
  };
  
  const toggleEmailNotifications = () => {
    setEmailNotifications(!emailNotifications);
    setIsDirty(true);
  };
  
  const togglePushNotifications = () => {
    setPushNotifications(!pushNotifications);
    setIsDirty(true);
  };
  
  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>
            Configure how and when you would like to be reminded about upcoming events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Default Reminder Time</h3>
            <p className="text-sm text-neutral-500">
              This will be used for all new events unless specified otherwise
            </p>
            <Select
              value={defaultReminders[0]?.toString() || "15"}
              onValueChange={handleReminderChange}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Select reminder time" />
              </SelectTrigger>
              <SelectContent>
                {reminderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <h3 className="text-sm font-medium">Notification Methods</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="emailNotifications" 
                  checked={emailNotifications}
                  onCheckedChange={toggleEmailNotifications}
                />
                <Label htmlFor="emailNotifications" className="cursor-pointer">Email notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="pushNotifications" 
                  checked={pushNotifications}
                  onCheckedChange={togglePushNotifications}
                />
                <Label htmlFor="pushNotifications" className="cursor-pointer">Push notifications</Label>
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
      
      <Card>
        <CardHeader>
          <CardTitle>Reminder Examples</CardTitle>
          <CardDescription>
            Here's how your reminders will appear
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-neutral-50">
            <h4 className="font-medium mb-2">Email Notification Example</h4>
            <div className="border rounded bg-white p-3 text-sm">
              <p className="font-medium">Meeting Reminder: Team Standup</p>
              <p className="text-neutral-600 mt-1">
                Your meeting "Team Standup" is scheduled to start in {formatReminderTime(defaultReminders[0] || 15).toLowerCase()}.
              </p>
              <p className="text-neutral-600 mt-2">
                Time: 9:00 - 10:00 AM<br />
                Location: Google Meet
              </p>
              <div className="mt-3 pt-3 border-t border-neutral-200">
                <Button size="sm" variant="outline">View Event</Button>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-neutral-50">
            <h4 className="font-medium mb-2">Push Notification Example</h4>
            <div className="border rounded bg-white p-3 flex items-start space-x-3 text-sm">
              <CalendarIcon className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-medium">Team Standup</p>
                <p className="text-neutral-600">
                  Starts in {formatReminderTime(defaultReminders[0] || 15).toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
