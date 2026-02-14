import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import AvailabilitySettings from '@/components/settings/AvailabilitySettings';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Calendar, Clock, CalendarOff } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface AvailabilitySchedule {
  id: number;
  userId: number;
  name: string;
  isDefault: boolean;
  timezone: string;
  rules: AvailabilityRule[];
  createdAt: string;
  updatedAt: string;
}

interface DateOverride {
  id: number;
  userId: number;
  date: string;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
  label: string | null;
  createdAt: string;
}

export default function AvailabilityPage() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AvailabilitySchedule | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [editingOverride, setEditingOverride] = useState<DateOverride | null>(null);
  const { toast } = useToast();

  // Schedule form state
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleIsDefault, setScheduleIsDefault] = useState(false);
  const [scheduleRules, setScheduleRules] = useState<AvailabilityRule[]>([
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  ]);

  // Override form state
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideIsAvailable, setOverrideIsAvailable] = useState(true);
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('17:00');
  const [overrideLabel, setOverrideLabel] = useState('');

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<AvailabilitySchedule[]>({
    queryKey: ['/api/availability-schedules'],
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery<DateOverride[]>({
    queryKey: ['/api/date-overrides'],
  });

  // Schedule mutations
  const saveScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSchedule) {
        const res = await apiRequest('PUT', `/api/availability-schedules/${editingSchedule.id}`, data);
        return res.json();
      }
      const res = await apiRequest('POST', '/api/availability-schedules', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: editingSchedule ? 'Schedule updated' : 'Schedule created' });
      setShowScheduleModal(false);
      setEditingSchedule(null);
      queryClient.invalidateQueries({ queryKey: ['/api/availability-schedules'] });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/availability-schedules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Schedule deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/availability-schedules'] });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Override mutations
  const saveOverrideMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingOverride) {
        const res = await apiRequest('PUT', `/api/date-overrides/${editingOverride.id}`, data);
        return res.json();
      }
      const res = await apiRequest('POST', '/api/date-overrides', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: editingOverride ? 'Override updated' : 'Override created' });
      setShowOverrideModal(false);
      setEditingOverride(null);
      queryClient.invalidateQueries({ queryKey: ['/api/date-overrides'] });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/date-overrides/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Override deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/date-overrides'] });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openScheduleModal = (schedule?: AvailabilitySchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleName(schedule.name);
      setScheduleIsDefault(schedule.isDefault ?? false);
      setScheduleRules((schedule.rules as AvailabilityRule[]) || []);
    } else {
      setEditingSchedule(null);
      setScheduleName('');
      setScheduleIsDefault(false);
      setScheduleRules([
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
      ]);
    }
    setShowScheduleModal(true);
  };

  const openOverrideModal = (override?: DateOverride) => {
    if (override) {
      setEditingOverride(override);
      setOverrideDate(override.date);
      setOverrideIsAvailable(override.isAvailable ?? true);
      setOverrideStartTime(override.startTime || '09:00');
      setOverrideEndTime(override.endTime || '17:00');
      setOverrideLabel(override.label || '');
    } else {
      setEditingOverride(null);
      setOverrideDate('');
      setOverrideIsAvailable(true);
      setOverrideStartTime('09:00');
      setOverrideEndTime('17:00');
      setOverrideLabel('');
    }
    setShowOverrideModal(true);
  };

  const toggleRuleDay = (dayOfWeek: number) => {
    const exists = scheduleRules.find(r => r.dayOfWeek === dayOfWeek);
    if (exists) {
      setScheduleRules(scheduleRules.filter(r => r.dayOfWeek !== dayOfWeek));
    } else {
      setScheduleRules([...scheduleRules, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    }
  };

  const updateRuleTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setScheduleRules(scheduleRules.map(r =>
      r.dayOfWeek === dayOfWeek ? { ...r, [field]: value } : r
    ));
  };

  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />

        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-800">
          <div className="border-b border-neutral-200 dark:border-slate-700 px-4 md:px-8 py-5 bg-white dark:bg-slate-800">
            <div className="max-w-6xl">
              <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-slate-100">Availability</h1>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                Manage your schedule, availability schedules, and date overrides.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
            <div className="max-w-6xl">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="schedules">Schedules</TabsTrigger>
                <TabsTrigger value="overrides">Date Overrides</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <AvailabilitySettings />
              </TabsContent>

              <TabsContent value="schedules">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-800 dark:text-slate-200">Availability Schedules</h2>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">
                        Create named schedules and assign them to booking links.
                      </p>
                    </div>
                    <Button onClick={() => openScheduleModal()}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Schedule
                    </Button>
                  </div>

                  {schedulesLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="h-24 bg-neutral-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : schedules.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-12 w-12 text-neutral-300 dark:text-slate-600 mb-4" />
                        <p className="text-neutral-500 dark:text-slate-400 mb-4">No availability schedules yet</p>
                        <Button variant="outline" onClick={() => openScheduleModal()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Schedule
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {schedules.map(schedule => (
                        <Card key={schedule.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">
                                {schedule.name}
                                {schedule.isDefault && (
                                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                              </CardTitle>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openScheduleModal(schedule)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              {(schedule.rules as AvailabilityRule[])?.map(rule => (
                                <div key={rule.dayOfWeek} className="text-sm text-neutral-600 dark:text-slate-400 flex justify-between">
                                  <span>{DAY_NAMES[rule.dayOfWeek]}</span>
                                  <span>{rule.startTime} - {rule.endTime}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="overrides">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-800 dark:text-slate-200">Date Overrides</h2>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">
                        Override your availability on specific dates. Applies to all booking links.
                      </p>
                    </div>
                    <Button onClick={() => openOverrideModal()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Override
                    </Button>
                  </div>

                  {overridesLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="h-16 bg-neutral-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : overrides.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="h-12 w-12 text-neutral-300 dark:text-slate-600 mb-4" />
                        <p className="text-neutral-500 dark:text-slate-400 mb-4">No date overrides yet</p>
                        <Button variant="outline" onClick={() => openOverrideModal()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Override
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {overrides
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map(override => (
                        <Card key={override.id}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${override.isAvailable ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                {override.isAvailable ? (
                                  <Calendar className="h-5 w-5 text-green-600" />
                                ) : (
                                  <CalendarOff className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-neutral-800 dark:text-slate-200">
                                    {new Date(override.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  {override.label && (
                                    <span className="text-xs bg-neutral-100 dark:bg-slate-700 px-2 py-0.5 rounded text-neutral-600 dark:text-slate-400">
                                      {override.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-neutral-500 dark:text-slate-400">
                                  {override.isAvailable
                                    ? `Available: ${override.startTime} - ${override.endTime}`
                                    : 'Unavailable all day'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openOverrideModal(override)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteOverrideMutation.mutate(override.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            </div>
          </div>
        </main>
      </div>

      <MobileNavigation onCreateEventClick={handleCreateEvent} />

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
      />

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'New Availability Schedule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Schedule Name</Label>
              <Input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Weekday Mornings"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={scheduleIsDefault}
                onCheckedChange={setScheduleIsDefault}
              />
              <Label>Set as default schedule</Label>
            </div>
            <div>
              <Label className="mb-2 block">Available Days & Hours</Label>
              <div className="space-y-2">
                {DAY_NAMES.map((name, i) => {
                  const rule = scheduleRules.find(r => r.dayOfWeek === i);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Switch
                        checked={!!rule}
                        onCheckedChange={() => toggleRuleDay(i)}
                      />
                      <span className="w-24 text-sm">{name}</span>
                      {rule && (
                        <>
                          <Input
                            type="time"
                            value={rule.startTime}
                            onChange={(e) => updateRuleTime(i, 'startTime', e.target.value)}
                            className="w-28"
                          />
                          <span className="text-sm text-neutral-500">to</span>
                          <Input
                            type="time"
                            value={rule.endTime}
                            onChange={(e) => updateRuleTime(i, 'endTime', e.target.value)}
                            className="w-28"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
            <Button
              onClick={() => saveScheduleMutation.mutate({
                name: scheduleName,
                isDefault: scheduleIsDefault,
                rules: scheduleRules,
              })}
              disabled={!scheduleName || saveScheduleMutation.isPending}
            >
              {saveScheduleMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Modal */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOverride ? 'Edit Date Override' : 'Add Date Override'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                value={overrideLabel}
                onChange={(e) => setOverrideLabel(e.target.value)}
                placeholder="e.g., Holiday, Half Day"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={overrideIsAvailable}
                onCheckedChange={setOverrideIsAvailable}
              />
              <Label>{overrideIsAvailable ? 'Available with custom hours' : 'Completely unavailable'}</Label>
            </div>
            {overrideIsAvailable && (
              <div className="flex items-center gap-3">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={overrideStartTime}
                    onChange={(e) => setOverrideStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={overrideEndTime}
                    onChange={(e) => setOverrideEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
            <Button
              onClick={() => saveOverrideMutation.mutate({
                date: overrideDate,
                isAvailable: overrideIsAvailable,
                startTime: overrideIsAvailable ? overrideStartTime : null,
                endTime: overrideIsAvailable ? overrideEndTime : null,
                label: overrideLabel || null,
              })}
              disabled={!overrideDate || saveOverrideMutation.isPending}
            >
              {saveOverrideMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
