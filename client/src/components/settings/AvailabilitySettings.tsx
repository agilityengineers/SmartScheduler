import { useState, useMemo } from "react";
import { format, isAfter, isBefore, endOfWeek } from "date-fns";
import { Calendar, CalendarOff, CalendarX, Plus, Trash2, ChevronDown, ChevronUp, ExternalLink, Zap } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUserSettings, useUpdateSettings } from "../../hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import BookingAvailabilitySummary from "./BookingAvailabilitySummary";
import TimezoneSettings from "./TimezoneSettings";
import { Link } from "wouter";

interface TimeBlock {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  blockType: 'vacation' | 'holiday' | 'personal' | 'custom';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  notes?: string;
}

export default function AvailabilitySettings() {
  const { data: settings } = useUserSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { toast } = useToast();

  const [showPastBlocks, setShowPastBlocks] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  
  // New block form state - simplified defaults
  const [newBlock, setNewBlock] = useState<TimeBlock>({
    id: uuidv4(),
    title: "",
    startDate: new Date(),
    endDate: new Date(),
    allDay: true,
    blockType: 'custom',
    recurrence: 'none'
  });
  
  // Get time blocks from settings or use empty array
  const timeBlocks: TimeBlock[] = useMemo(() => {
    if (!settings) return [];
    
    if (Array.isArray(settings.timeBlocks)) {
      return settings.timeBlocks.map((block: any) => ({
        ...block,
        startDate: new Date(block.startDate),
        endDate: new Date(block.endDate)
      }));
    }
    
    return [];
  }, [settings]);
  
  // Generate auto title based on dates
  const generateAutoTitle = (startDate: Date, endDate: Date): string => {
    const startStr = format(startDate, "MMM d");
    const endStr = format(endDate, "MMM d");
    
    if (startStr === endStr) {
      return `Time Off - ${startStr}`;
    }
    return `Time Off - ${startStr} to ${endStr}`;
  };

  const handleAddNewBlock = () => {
    // Auto-generate title if not provided
    const blockToAdd = {
      ...newBlock,
      title: newBlock.title.trim() || generateAutoTitle(newBlock.startDate, newBlock.endDate)
    };
    
    const updatedBlocks = [...timeBlocks, blockToAdd];

    updateSettingsMutation.mutate({
      timeBlocks: updatedBlocks
    }, {
      onSuccess: () => {
        toast({
          title: "Time blocked",
          description: `"${blockToAdd.title}" has been added to your calendar.`,
        });
        // Reset form and close dialog
        setNewBlock({
          id: uuidv4(),
          title: "",
          startDate: new Date(),
          endDate: new Date(),
          allDay: true,
          blockType: 'custom',
          recurrence: 'none'
        });
        setShowAdvancedOptions(false);
        setDialogOpen(false);
        setIsDirty(false);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to add time block. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  // Quick action to block today
  const handleBlockToday = () => {
    const today = new Date();
    const blockToAdd: TimeBlock = {
      id: uuidv4(),
      title: `Time Off - ${format(today, "MMM d")}`,
      startDate: today,
      endDate: today,
      allDay: true,
      blockType: 'personal',
      recurrence: 'none'
    };
    
    const updatedBlocks = [...timeBlocks, blockToAdd];
    updateSettingsMutation.mutate({ timeBlocks: updatedBlocks }, {
      onSuccess: () => {
        toast({ title: "Done", description: "Today has been blocked off." });
      }
    });
  };

  // Quick action to block this week
  const handleBlockThisWeek = () => {
    const today = new Date();
    const weekEnd = endOfWeek(today);
    const blockToAdd: TimeBlock = {
      id: uuidv4(),
      title: `Time Off - Week of ${format(today, "MMM d")}`,
      startDate: today,
      endDate: weekEnd,
      allDay: true,
      blockType: 'personal',
      recurrence: 'none'
    };
    
    const updatedBlocks = [...timeBlocks, blockToAdd];
    updateSettingsMutation.mutate({ timeBlocks: updatedBlocks }, {
      onSuccess: () => {
        toast({ title: "Done", description: "This week has been blocked off." });
      }
    });
  };
  
  const handleDeleteBlock = (blockId: string) => {
    const blockToDelete = timeBlocks.find(block => block.id === blockId);
    const updatedBlocks = timeBlocks.filter(block => block.id !== blockId);

    // Set loading state
    setDeletingBlockId(blockId);

    // Save to database
    updateSettingsMutation.mutate({
      timeBlocks: updatedBlocks
    }, {
      onSuccess: () => {
        toast({
          title: "Deleted",
          description: `"${blockToDelete?.title || 'Unavailable time block'}" has been removed.`,
        });
        setDeletingBlockId(null);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to delete unavailable time block. Please try again.",
          variant: "destructive",
        });
        setDeletingBlockId(null);
      }
    });
  };
  
  const handleSave = () => {
    setIsPending(true);
    
    // Save to database
    updateSettingsMutation.mutate({
      timeBlocks: timeBlocks
    }, {
      onSuccess: () => {
        setIsDirty(false);
        setIsPending(false);
      },
      onError: () => {
        setIsPending(false);
      }
    });
  };
  
  // Get upcoming and past blocks separately
  const upcomingBlocks = useMemo(() => {
    const now = new Date();
    return timeBlocks.filter(block => isAfter(new Date(block.endDate), now));
  }, [timeBlocks]);

  const pastBlocks = useMemo(() => {
    const now = new Date();
    return timeBlocks.filter(block => isBefore(new Date(block.endDate), now));
  }, [timeBlocks]);
  
  // Format a time block's date range for display
  const formatBlockDateRange = (block: TimeBlock): string => {
    const startFormatted = format(new Date(block.startDate), "MMM d, yyyy");
    const endFormatted = format(new Date(block.endDate), "MMM d, yyyy");
    
    if (startFormatted === endFormatted) {
      return startFormatted;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  // Render a single time block item
  const renderTimeBlock = (block: TimeBlock) => (
    <div 
      key={block.id} 
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${
          block.blockType === 'vacation' ? 'bg-blue-100 dark:bg-blue-900/30' : 
          block.blockType === 'holiday' ? 'bg-green-100 dark:bg-green-900/30' : 
          block.blockType === 'personal' ? 'bg-purple-100 dark:bg-purple-900/30' : 
          'bg-gray-100 dark:bg-gray-800'
        }`}>
          {block.blockType === 'vacation' && <Calendar className="h-4 w-4 text-blue-600" />}
          {block.blockType === 'holiday' && <Calendar className="h-4 w-4 text-green-600" />}
          {block.blockType === 'personal' && <Calendar className="h-4 w-4 text-purple-600" />}
          {block.blockType === 'custom' && <CalendarX className="h-4 w-4 text-gray-600" />}
        </div>
        <div>
          <h4 className="font-medium text-sm">{block.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{formatBlockDateRange(block)}</p>
          {block.recurrence && block.recurrence !== 'none' && (
            <Badge variant="outline" className="mt-1 text-xs">
              Repeats {block.recurrence}
            </Badge>
          )}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
            disabled={deletingBlockId === block.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove time block?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{block.title}" and make that time available for bookings again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteBlock(block.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingBlockId === block.id ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Booking Availability Summary - now more compact */}
      <BookingAvailabilitySummary />

      {/* Time Off Card - Primary focus */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarOff className="h-5 w-5" />
                Time Off
              </CardTitle>
              <CardDescription>
                Block dates when you're unavailable for bookings
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Block Time
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Block Time Off</DialogTitle>
                  <DialogDescription>
                    Select the dates you won't be available for meetings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {/* Primary fields - always visible */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate" className="text-sm">From</Label>
                      <DatePicker
                        id="startDate"
                        selected={newBlock.startDate}
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            setNewBlock({
                              ...newBlock, 
                              startDate: date,
                              endDate: isAfter(date, newBlock.endDate) ? date : newBlock.endDate
                            });
                          }
                        }}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-sm">To</Label>
                      <DatePicker
                        id="endDate"
                        selected={newBlock.endDate}
                        onSelect={(date: Date | undefined) => date && setNewBlock({...newBlock, endDate: date})}
                        className="mt-1 w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="title" className="text-sm">Label (optional)</Label>
                    <Input 
                      id="title" 
                      value={newBlock.title} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBlock({...newBlock, title: e.target.value})}
                      placeholder="e.g. Vacation, Doctor's appointment"
                      className="mt-1"
                    />
                  </div>

                  {/* Advanced options - collapsible */}
                  <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                        Advanced options
                        {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor="blockType" className="text-sm">Type</Label>
                        <Select 
                          value={newBlock.blockType} 
                          onValueChange={(value: any) => setNewBlock({...newBlock, blockType: value})}
                        >
                          <SelectTrigger id="blockType" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vacation">Vacation</SelectItem>
                            <SelectItem value="holiday">Holiday</SelectItem>
                            <SelectItem value="personal">Personal Time</SelectItem>
                            <SelectItem value="custom">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="recurrence" className="text-sm">Repeat</Label>
                        <Select 
                          value={newBlock.recurrence} 
                          onValueChange={(value: any) => setNewBlock({...newBlock, recurrence: value})}
                        >
                          <SelectTrigger id="recurrence" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Does not repeat</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="notes" className="text-sm">Notes</Label>
                        <Input 
                          id="notes" 
                          value={newBlock.notes || ''} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBlock({...newBlock, notes: e.target.value})}
                          placeholder="Additional details"
                          className="mt-1"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddNewBlock} disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? 'Adding...' : 'Block Time'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBlockToday}
              disabled={updateSettingsMutation.isPending}
            >
              <Zap className="h-3 w-3 mr-1" />
              Block today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBlockThisWeek}
              disabled={updateSettingsMutation.isPending}
            >
              <Zap className="h-3 w-3 mr-1" />
              Block this week
            </Button>
          </div>

          {/* Upcoming time blocks */}
          {upcomingBlocks.length === 0 && pastBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
              <CalendarOff className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">No time blocked</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                Click "Block Time" to mark dates when you won't be available for bookings.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingBlocks.map(renderTimeBlock)}
              
              {/* Past blocks - collapsible */}
              {pastBlocks.length > 0 && (
                <Collapsible open={showPastBlocks} onOpenChange={setShowPastBlocks}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground mt-4">
                      {showPastBlocks ? 'Hide' : 'Show'} {pastBlocks.length} past {pastBlocks.length === 1 ? 'block' : 'blocks'}
                      {showPastBlocks ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {pastBlocks.map(block => (
                      <div key={block.id} className="opacity-60">
                        {renderTimeBlock(block)}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Timezone Settings */}
      <TimezoneSettings />

      {/* Working Hours - simplified to just a link */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Working Hours</p>
                <p className="text-xs text-muted-foreground">Set your regular availability in booking links</p>
              </div>
            </div>
            <Link href="/booking">
              <Button variant="outline" size="sm">
                Manage
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}