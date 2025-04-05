import { useState, useMemo } from "react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Calendar, CalendarOff, CalendarX, Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/components/ui/date-picker";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUserSettings, useUpdateSettings } from "../../hooks/useSettings";

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
  
  const [selectedBlockTab, setSelectedBlockTab] = useState<string>("active");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  
  // New block form state
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
  
  const handleAddNewBlock = () => {
    // Add the new block to the existing list
    const updatedBlocks = [...timeBlocks, newBlock];
    
    // Save to database
    updateSettingsMutation.mutate({
      timeBlocks: updatedBlocks
    });
    
    // Reset form
    setNewBlock({
      id: uuidv4(),
      title: "",
      startDate: new Date(),
      endDate: new Date(),
      allDay: true,
      blockType: 'custom',
      recurrence: 'none'
    });
    
    setIsDirty(true);
  };
  
  const handleDeleteBlock = (blockId: string) => {
    const updatedBlocks = timeBlocks.filter(block => block.id !== blockId);
    
    // Save to database
    updateSettingsMutation.mutate({
      timeBlocks: updatedBlocks
    });
    
    setIsDirty(true);
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
  
  // Filter blocks based on the selected tab
  const getFilteredBlocks = () => {
    const now = new Date();
    
    switch (selectedBlockTab) {
      case "active":
        return timeBlocks.filter(block => isAfter(new Date(block.endDate), now));
      case "past":
        return timeBlocks.filter(block => isBefore(new Date(block.endDate), now));
      case "all":
      default:
        return timeBlocks;
    }
  };
  
  // Format a time block's date range for display
  const formatBlockDateRange = (block: TimeBlock): string => {
    const startFormatted = format(new Date(block.startDate), "MMM d, yyyy");
    const endFormatted = format(new Date(block.endDate), "MMM d, yyyy");
    
    if (startFormatted === endFormatted) {
      return startFormatted;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Unavailable Time</CardTitle>
            <CardDescription>
              Define periods when you're unavailable for meetings
            </CardDescription>
          </div>
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unavailable Time
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Unavailable Time Block</DialogTitle>
                  <DialogDescription>
                    Block out time when you're unavailable for meetings, such as vacations, holidays, or regular personal time.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input 
                        id="title" 
                        value={newBlock.title} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBlock({...newBlock, title: e.target.value})}
                        placeholder="e.g. Summer Vacation, Weekly Team Meeting"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="blockType">Block Type</Label>
                      <Select 
                        value={newBlock.blockType} 
                        onValueChange={(value: any) => setNewBlock({...newBlock, blockType: value})}
                      >
                        <SelectTrigger id="blockType" className="mt-1">
                          <SelectValue placeholder="Select block type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacation">Vacation</SelectItem>
                          <SelectItem value="holiday">Holiday</SelectItem>
                          <SelectItem value="personal">Personal Time</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="recurrence">Recurrence</Label>
                      <Select 
                        value={newBlock.recurrence} 
                        onValueChange={(value: any) => setNewBlock({...newBlock, recurrence: value})}
                      >
                        <SelectTrigger id="recurrence" className="mt-1">
                          <SelectValue placeholder="How often does this repeat?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Does not repeat</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <DatePicker
                          id="startDate"
                          selected={newBlock.startDate}
                          onSelect={(date: Date | undefined) => date && setNewBlock({...newBlock, startDate: date})}
                          className="mt-1 w-full"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <DatePicker
                          id="endDate"
                          selected={newBlock.endDate}
                          onSelect={(date: Date | undefined) => date && setNewBlock({...newBlock, endDate: date})}
                          className="mt-1 w-full"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input 
                        id="notes" 
                        value={newBlock.notes || ''} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBlock({...newBlock, notes: e.target.value})}
                        placeholder="Additional details about this unavailable time"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddNewBlock} disabled={!newBlock.title}>
                    Add Time Block
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={selectedBlockTab}
            onValueChange={setSelectedBlockTab}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedBlockTab} className="space-y-6">
              {getFilteredBlocks().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarOff className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No unavailable time blocks</h3>
                  <p className="text-sm text-gray-500 max-w-md mt-2">
                    You don't have any {selectedBlockTab === 'past' ? 'past' : ''} unavailable time blocks set up. 
                    Click "Add Unavailable Time" to block out dates when you won't be available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredBlocks().map((block) => (
                    <div 
                      key={block.id} 
                      className="flex items-center justify-between p-4 border rounded-md"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-2 rounded-full bg-gray-100">
                          {block.blockType === 'vacation' && <Calendar className="h-5 w-5 text-blue-500" />}
                          {block.blockType === 'holiday' && <Calendar className="h-5 w-5 text-green-500" />}
                          {block.blockType === 'personal' && <Calendar className="h-5 w-5 text-purple-500" />}
                          {block.blockType === 'custom' && <CalendarX className="h-5 w-5 text-gray-500" />}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{block.title}</h4>
                            <Badge 
                              variant={block.blockType === 'vacation' ? 'secondary' : 
                                      block.blockType === 'holiday' ? 'outline' : 
                                      block.blockType === 'personal' ? 'secondary' : 'default'}
                              className={`ml-2 ${
                                block.blockType === 'vacation' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 
                                block.blockType === 'holiday' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                                block.blockType === 'personal' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : ''
                              }`}
                            >
                              {block.blockType.charAt(0).toUpperCase() + block.blockType.slice(1)}
                            </Badge>
                            {block.recurrence && block.recurrence !== 'none' && (
                              <Badge variant="outline" className="ml-2">
                                Recurring {block.recurrence}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{formatBlockDateRange(block)}</span>
                          </div>
                          {block.notes && (
                            <p className="text-sm text-gray-500 mt-1">{block.notes}</p>
                          )}
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete unavailable time block</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this unavailable time block? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteBlock(block.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {isDirty && (
            <div className="pt-4 flex items-center justify-end">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>
            Set your regular working hours to match your availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Your working hours are already configured in the booking links settings. 
            For more detailed control, create specific time blocks for days when 
            you're unavailable using the options above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}