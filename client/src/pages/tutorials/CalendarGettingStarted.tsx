import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Check, CalendarDays, Clock, Users, Settings, Link2 } from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import CreateEventModal from "@/components/calendar/CreateEventModal";

const steps = [
  {
    id: "intro",
    title: "Introduction",
    description: "Overview of this tutorial"
  },
  {
    id: "navigating",
    title: "Navigating the Calendar",
    description: "Learn the calendar interface"
  },
  {
    id: "views",
    title: "Calendar Views",
    description: "Switch between day, week, and month views"
  },
  {
    id: "creating",
    title: "Creating Events",
    description: "Add new events to your calendar"
  },
  {
    id: "editing",
    title: "Managing Events",
    description: "Edit, delete, and organize events"
  },
  {
    id: "integrations",
    title: "Calendar Integrations",
    description: "Connect to external calendars"
  },
  {
    id: "conclusion",
    title: "Next Steps",
    description: "Continue your learning"
  }
];

export default function CalendarGettingStarted() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };
  
  const jumpToStep = (index: number) => {
    setCurrentStep(index);
    window.scrollTo(0, 0);
  };
  
  const markComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
  };
  
  const isStepComplete = (index: number) => {
    return completedSteps.includes(index);
  };

  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 overflow-auto">
          <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6">
              <Link href="/help">
                <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Help & Support</span>
                </Button>
              </Link>
              <h1 className="text-3xl font-bold mb-2">Getting Started with Your Calendar</h1>
              <p className="text-muted-foreground">
                A step-by-step guide to mastering the SmartScheduler calendar features.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/4">
                <div className="sticky top-6">
                  <h3 className="font-medium mb-3">Tutorial Steps</h3>
                  <ul className="space-y-1">
                    {steps.map((step, index) => (
                      <li key={step.id}>
                        <button
                          onClick={() => jumpToStep(index)}
                          className={`flex items-center w-full text-left px-3 py-2 rounded-lg text-sm ${
                            currentStep === index 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                            isStepComplete(index) 
                              ? "bg-green-500 text-white" 
                              : currentStep === index 
                                ? "bg-white text-primary" 
                                : "bg-muted text-muted-foreground"
                          }`}>
                            {isStepComplete(index) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>
                          <span>{step.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Your Progress</h3>
                    <div className="bg-muted rounded-full h-2 w-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all" 
                        style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {completedSteps.length} of {steps.length} steps completed
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="md:w-3/4">
                <Card>
                  <CardContent className="p-6">
                    {/* Step 1: Introduction */}
                    {currentStep === 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="bg-primary/10 p-4 rounded-full">
                            <CalendarDays className="h-16 w-16 text-primary" />
                          </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold">Welcome to the Calendar Tutorial</h2>
                        <p>
                          The calendar is at the heart of SmartScheduler, and mastering its features will help you manage your time more effectively. This tutorial will walk you through all the essential functions of the calendar, from basic navigation to advanced features.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">What You'll Learn</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>How to navigate the calendar interface</li>
                          <li>Different calendar view options (day, week, month)</li>
                          <li>Creating and managing events</li>
                          <li>Connecting external calendars</li>
                          <li>Advanced calendar features</li>
                        </ul>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Before You Begin</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            Make sure you've created an account and logged in to SmartScheduler. This tutorial assumes you're already logged in and can access the main dashboard.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: Navigating the Calendar */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Navigating the Calendar</h2>
                        <p>
                          Before creating events, let's get familiar with the calendar interface and its main components.
                        </p>
                        
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mt-4">
                          <h3 className="text-lg font-medium mb-3">Calendar Layout</h3>
                          <div className="border-2 border-blue-500 dark:border-blue-400 border-dashed p-3 mb-3 rounded">
                            <h4 className="font-medium text-blue-700 dark:text-blue-300">Header Bar</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              Contains date navigation, view selectors, and time zone settings
                            </p>
                          </div>
                          <div className="border-2 border-green-500 dark:border-green-400 border-dashed p-3 mb-3 rounded">
                            <h4 className="font-medium text-green-700 dark:text-green-300">Main Calendar Area</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              Displays your events in the selected view (day, week, or month)
                            </p>
                          </div>
                          <div className="border-2 border-purple-500 dark:border-purple-400 border-dashed p-3 rounded">
                            <h4 className="font-medium text-purple-700 dark:text-purple-300">Sidebar</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              Contains calendar filters, connected calendars, and the "Create Event" button
                            </p>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Navigation Controls</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Date Navigation Arrows:</strong> Move forward or backward in time
                          </li>
                          <li>
                            <strong>Today Button:</strong> Quickly jump to today's date
                          </li>
                          <li>
                            <strong>Date Picker:</strong> Jump to a specific date
                          </li>
                          <li>
                            <strong>View Selectors:</strong> Switch between day, week, and month views
                          </li>
                        </ul>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mt-6">
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Pro Tip</h4>
                          <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                            Use keyboard shortcuts to navigate quickly: Right and left arrows to move forward and backward in time, "T" to jump to today, "D" for day view, "W" for week view, and "M" for month view.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Calendar Views */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Calendar Views</h2>
                        <p>
                          SmartScheduler offers different ways to view your calendar, each designed for specific scheduling needs.
                        </p>
                        
                        <Tabs defaultValue="day">
                          <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="day">Day View</TabsTrigger>
                            <TabsTrigger value="week">Week View</TabsTrigger>
                            <TabsTrigger value="month">Month View</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="day" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <h3 className="font-medium">Day View</h3>
                            </div>
                            <p>
                              Day view shows a detailed timeline of a single day, divided into hours. This view is perfect for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>Focusing on today's schedule</li>
                              <li>Planning a specific day in detail</li>
                              <li>Managing time-specific appointments</li>
                              <li>Seeing the exact duration of each event</li>
                            </ul>
                            <p className="text-sm text-muted-foreground">
                              <strong>How to access:</strong> Click the "Day" button in the view selector, or press "D" on your keyboard.
                            </p>
                          </TabsContent>
                          
                          <TabsContent value="week" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                                <CalendarDays className="h-5 w-5 text-green-600 dark:text-green-300" />
                              </div>
                              <h3 className="font-medium">Week View</h3>
                            </div>
                            <p>
                              Week view displays seven days at once, giving you a broader perspective of your schedule. This view is ideal for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>Planning your work week</li>
                              <li>Spotting patterns in your schedule</li>
                              <li>Finding available time slots across multiple days</li>
                              <li>Balancing your weekly workload</li>
                            </ul>
                            <p className="text-sm text-muted-foreground">
                              <strong>How to access:</strong> Click the "Week" button in the view selector, or press "W" on your keyboard.
                            </p>
                          </TabsContent>
                          
                          <TabsContent value="month" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                                <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                              </div>
                              <h3 className="font-medium">Month View</h3>
                            </div>
                            <p>
                              Month view shows an entire month at a glance. This view is best for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>Long-term planning</li>
                              <li>Seeing recurring patterns in your schedule</li>
                              <li>Planning around holidays and important dates</li>
                              <li>Getting a bird's-eye view of your commitments</li>
                            </ul>
                            <p className="text-sm text-muted-foreground">
                              <strong>How to access:</strong> Click the "Month" button in the view selector, or press "M" on your keyboard.
                            </p>
                          </TabsContent>
                        </Tabs>
                        
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900 mt-6">
                          <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Best Practice</h4>
                          <p className="text-green-800 dark:text-green-400 text-sm">
                            Use day view for detailed daily planning, week view for most of your scheduling needs, and month view when planning ahead or getting a big-picture view of your calendar.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 4: Creating Events */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Creating Events</h2>
                        <p>
                          Now that you're familiar with navigating the calendar, let's learn how to create events.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Ways to Create an Event</h3>
                        <div className="space-y-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Method 1: Create Event Button</h4>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Click the "Create Event" button in the sidebar</li>
                              <li>Fill in the event details in the popup form</li>
                              <li>Click "Save" to add the event to your calendar</li>
                            </ol>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Best for:</strong> Creating events when you already know the details.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Method 2: Click on Calendar</h4>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Click on the desired time slot in the calendar</li>
                              <li>A mini form will appear where you can enter the event title</li>
                              <li>Press Enter to create a basic event, or click "Edit" for more options</li>
                            </ol>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Best for:</strong> Quickly scheduling events when you can visualize the time slot.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Method 3: Drag and Select</h4>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Click and drag across a time range in the calendar</li>
                              <li>Enter the event title in the popup form</li>
                              <li>Add additional details or save the event</li>
                            </ol>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Best for:</strong> Creating events with specific durations directly on the calendar.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 5: Managing Events */}
                    {currentStep === 4 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Managing Events</h2>
                        <p>
                          Once you've created events, you'll need to know how to view, edit, and delete them as needed.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Event Management Options</h3>
                        
                        <Tabs defaultValue="view">
                          <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="view">Viewing</TabsTrigger>
                            <TabsTrigger value="edit">Editing</TabsTrigger>
                            <TabsTrigger value="delete">Deleting</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="view" className="space-y-4">
                            <h4 className="font-medium">Viewing Event Details</h4>
                            <p>
                              To view the full details of any event:
                            </p>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Click on the event in the calendar</li>
                              <li>A popup will appear showing the event details</li>
                              <li>You can see the title, time, location, description, and other information</li>
                            </ol>
                            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-4">
                              <p className="text-blue-800 dark:text-blue-400 text-sm">
                                <strong>Tip:</strong> You can also view events from different views (day, week, month) to get different perspectives on your schedule.
                              </p>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="edit" className="space-y-4">
                            <h4 className="font-medium">Editing Events</h4>
                            <p>
                              To edit an existing event:
                            </p>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Click on the event in the calendar</li>
                              <li>Click the "Edit" button in the event popup</li>
                              <li>Make your changes in the edit form</li>
                              <li>Click "Save" to update the event</li>
                            </ol>
                            <p className="mt-2">
                              You can also adjust event times directly in the calendar by:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li><strong>Dragging the event</strong> to a new time or date</li>
                              <li><strong>Resizing the event</strong> by dragging its top or bottom edge to change duration</li>
                            </ul>
                          </TabsContent>
                          
                          <TabsContent value="delete" className="space-y-4">
                            <h4 className="font-medium">Deleting Events</h4>
                            <p>
                              To delete an event:
                            </p>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Click on the event in the calendar</li>
                              <li>Click the "Delete" button in the event popup</li>
                              <li>Confirm the deletion when prompted</li>
                            </ol>
                            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-900 mt-4">
                              <p className="text-red-800 dark:text-red-400 text-sm">
                                <strong>Important:</strong> Deleting an event removes it permanently from your calendar. For recurring events, you'll be asked if you want to delete just one occurrence or the entire series.
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                    
                    {/* Step 6: Calendar Integrations */}
                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Calendar Integrations</h2>
                        <p>
                          SmartScheduler can connect to your external calendars, helping you manage all your events in one place.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Supported Calendar Services</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2">
                                <span className="text-red-600 font-bold">G</span>
                              </div>
                              <h4 className="font-medium">Google Calendar</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Connect your personal or work Google Calendar accounts.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <span className="text-blue-600 font-bold">O</span>
                              </div>
                              <h4 className="font-medium">Outlook Calendar</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Connect Microsoft Outlook or Office 365 calendars.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-2">
                                <span className="text-slate-600 font-bold">A</span>
                              </div>
                              <h4 className="font-medium">Apple Calendar</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Connect your iCloud calendars.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                                <CalendarDays className="h-4 w-4 text-purple-600" />
                              </div>
                              <h4 className="font-medium">Other Calendars (via iCal)</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Import any calendar that supports iCal format (.ics files).
                            </p>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">How to Connect a Calendar</h3>
                        <ol className="list-decimal pl-6 space-y-2 mt-2">
                          <li>Go to <strong>Integrations</strong> in the sidebar</li>
                          <li>Click <strong>Connect Calendar</strong> under the calendar service you want to connect</li>
                          <li>Follow the authentication steps for the selected service</li>
                          <li>Choose which calendars you want to sync (if multiple are available)</li>
                          <li>Set sync preferences (one-way or two-way sync)</li>
                        </ol>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Integration Benefits</h4>
                          <ul className="list-disc pl-6 space-y-1 text-blue-800 dark:text-blue-400 text-sm">
                            <li>See all your events in one place</li>
                            <li>Avoid scheduling conflicts across different calendars</li>
                            <li>Keep your external calendars updated when you create events in SmartScheduler</li>
                            <li>Maintain separate calendars for different aspects of your life (work, personal, etc.)</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 7: Conclusion */}
                    {currentStep === 6 && (
                      <div className="space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full">
                            <Check className="h-16 w-16 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-center">Congratulations!</h2>
                        <p className="text-center">
                          You've completed the Getting Started with Your Calendar tutorial. You now understand the fundamentals of using SmartScheduler's calendar features.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">What You've Learned</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Navigating the calendar interface</li>
                          <li>Using different calendar views (day, week, month)</li>
                          <li>Creating and managing events</li>
                          <li>Connecting to external calendars</li>
                        </ul>
                        
                        <h3 className="text-lg font-medium mt-6">Next Steps</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Set up calendar integrations</h4>
                            <p className="text-sm text-muted-foreground">
                              Connect your Google, Outlook, or other calendars to have all your events in one place.
                            </p>
                            <Button variant="link" className="p-0 h-auto text-primary">
                              Go to Integrations
                            </Button>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Create your first booking link</h4>
                            <p className="text-sm text-muted-foreground">
                              Let others schedule meetings with you based on your availability.
                            </p>
                            <Button variant="link" className="p-0 h-auto text-primary">
                              Learn about Booking Links
                            </Button>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Need More Help?</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            Check out our other tutorials and guides in the Help & Support section, or contact our support team if you have specific questions.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between mt-8">
                      <Button 
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className="flex items-center"
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>
                      
                      {currentStep < steps.length - 1 ? (
                        <Button 
                          onClick={nextStep}
                          className="flex items-center"
                        >
                          Next
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Link href="/help">
                          <Button>
                            Finish Tutorial
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {isCreateEventModalOpen && (
        <CreateEventModal 
          isOpen={isCreateEventModalOpen} 
          onClose={() => setIsCreateEventModalOpen(false)} 
        />
      )}
    </div>
  );
}