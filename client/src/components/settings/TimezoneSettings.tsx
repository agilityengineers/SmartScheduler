import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSettings, useUpdateSettings } from "../../hooks/useSettings";
import { useTimeZones } from "@/hooks/useTimeZone";
import { Settings } from "@shared/schema";
import { Globe } from "lucide-react";

export default function TimezoneSettings() {
  const { data: settings } = useUserSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { data: timeZones, isLoading: timeZonesLoading, userTimeZone } = useTimeZones();

  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    if (settings?.preferredTimezone) {
      setSelectedTimezone(settings.preferredTimezone);
    } else if (userTimeZone) {
      setSelectedTimezone(userTimeZone);
    }
  }, [settings, userTimeZone]);

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(
      {
        preferredTimezone: selectedTimezone,
      },
      {
        onSuccess: () => {
          setIsDirty(false);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Timezone Settings</CardTitle>
        </div>
        <CardDescription>
          Set your preferred timezone for all bookings. When others schedule meetings with you, 
          this timezone will be used as the default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Preferred Timezone</Label>
            <Select
              value={selectedTimezone}
              onValueChange={handleTimezoneChange}
              disabled={timeZonesLoading}
            >
              <SelectTrigger id="timezone" className="w-full" data-tutorial="timezone-selection">
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {timeZones?.map((tz) => (
                  <SelectItem key={tz.id} value={tz.id}>
                    {tz.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground mt-2">
              <p className="mb-1">
                This timezone will be used as the default when others book appointments with you.
                All your available booking slots will be shown in this timezone (9:00 AM - 5:00 PM).
              </p>
              <p className="font-medium text-primary">
                Visitors will initially see times in your timezone, but they can switch to their local 
                timezone if needed.
              </p>
            </div>
          </div>

          {isDirty && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}