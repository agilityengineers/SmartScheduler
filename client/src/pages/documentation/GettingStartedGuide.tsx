import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Calendar, User, Link2, Bell, Vote, GitBranch, Users } from "lucide-react";
import { Link } from "wouter";
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { useUser } from '@/context/UserContext';

export default function GettingStartedGuide() {
  const { user } = useUser();
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);

  const handleCreateEvent = () => {
    setIsCreateEventModalOpen(true);
  };

  // If user is not logged in, redirect to login
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
              <CardDescription>
                Please log in to access the documentation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onCreateEvent={handleCreateEvent} />
        
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
          <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6">
              <Link href="/help">
                <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Help & Support</span>
                </Button>
              </Link>
              <h1 className="text-3xl font-bold mb-2">Getting Started Guide</h1>
              <p className="text-muted-foreground">
                Welcome to My Smart Scheduler! This guide will help you get up and running with the basic features.
              </p>
            </div>

      <Tabs defaultValue="account-setup">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account-setup">Account Setup</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Basics</TabsTrigger>
          <TabsTrigger value="booking">Booking Links</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="more-features">More Features</TabsTrigger>
        </TabsList>

        <TabsContent value="account-setup" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Setting Up Your Account</CardTitle>
                  <CardDescription>Complete your profile and preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">1. Complete Your Profile</h3>
              <p>
                Start by filling out your profile information to help others identify you when scheduling meetings.
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Click on your profile icon in the top-right corner</li>
                <li>Select "Profile" from the dropdown</li>
                <li>Add your profile picture, display name, and bio</li>
                <li>Save your changes</li>
              </ul>

              <h3 className="text-lg font-medium">2. Set Your Timezone</h3>
              <p>
                Setting your timezone correctly ensures that all events and bookings appear at the proper times.
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Go to "Availability" in the sidebar</li>
                <li>Look for the Timezone Settings card</li>
                <li>Select your preferred timezone from the dropdown menu</li>
                <li>Click "Save Changes"</li>
              </ul>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  Your timezone affects how your availability is displayed to people booking meetings with you. They'll initially see times in your timezone but can switch to their local timezone.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization and Team Setup</CardTitle>
              <CardDescription>For company administrators and team managers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-lg font-medium">For Company Administrators</h3>
                <p className="mb-2">If you're a company administrator, you can set up your organization:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Navigate to "Admin Center" in the sidebar (bottom section)</li>
                  <li>Click on "Organizations" tab to manage organizations</li>
                  <li>Create teams from the Organizations view</li>
                  <li>Invite members through the "Users" tab</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-medium">For Team Managers</h3>
                <p className="mb-2">If you're a team manager, you can set up your team:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Access your Team Dashboard (you'll be redirected automatically when assigned as a team manager)</li>
                  <li>View and manage team members from the dashboard</li>
                  <li>Set up team availability and working hours</li>
                  <li>Create team booking links from the Scheduling page</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Calendar Basics</CardTitle>
                  <CardDescription>Managing your events and calendar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Navigating the Calendar</h3>
              <p className="mb-2">
                The calendar view is your central hub for managing all events and appointments:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Toggle between day, week, and month views</li>
                <li>Navigate between dates using the date picker or arrows</li>
                <li>Click on any time slot to create a new event</li>
                <li>Click on an existing event to view, edit, or delete it</li>
              </ul>

              <h3 className="text-lg font-medium">Creating Events</h3>
              <p className="mb-2">You can create new events in several ways:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Click the "Create Event" button in the sidebar</li>
                <li>Click on any empty time slot in the calendar</li>
                <li>Use the quick-create shortcut (Ctrl/Cmd + N)</li>
              </ul>
              <p>
                When creating an event, you can specify details like title, description, 
                location, time, duration, and participants.
              </p>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mb-4">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important Note</h4>
                <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                  Events created in SmartScheduler can be synced with external calendars like Google Calendar
                  and Microsoft Outlook after connecting your accounts in the Integrations section.
                </p>
              </div>

              <h3 className="text-lg font-medium">Calendar Integrations</h3>
              <p className="mb-2">Connect your external calendars to keep everything in sync:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Go to "Integrations" in the sidebar</li>
                <li>Click "Connect" next to the calendar service you want to use</li>
                <li>Follow the authentication process</li>
                <li>Select which calendars to sync and set sync preferences</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Calendar Features</CardTitle>
              <CardDescription>Getting the most out of your calendar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Filtering and Views</h3>
              <p className="mb-4">
                Customize what you see in your calendar to focus on what matters:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Filter events by team, organization, or event type</li>
                <li>Toggle visibility of specific calendars</li>
                <li>Use the agenda view for a list-based overview of upcoming events</li>
                <li>Apply color coding to different event categories for visual organization</li>
              </ul>

              <h3 className="text-lg font-medium">Recurring Events</h3>
              <p className="mb-2">Set up recurring events for regular meetings:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Create a new event or edit an existing one</li>
                <li>Enable the "Repeat" option</li>
                <li>Select recurrence pattern (daily, weekly, monthly, etc.)</li>
                <li>Set an end date or number of occurrences</li>
                <li>Configure exceptions if needed</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Booking Links</CardTitle>
                  <CardDescription>Let others schedule time with you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Creating Your First Booking Link</h3>
              <p className="mb-2">
                Booking links let others schedule time with you without the back-and-forth:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Navigate to "Scheduling" in the sidebar</li>
                <li>Click "Create New Booking Link"</li>
                <li>Set a title and description for your booking type</li>
                <li>Define the duration of meetings</li>
                <li>Set your availability (days and hours)</li>
                <li>Configure buffer times between meetings if needed</li>
                <li>Save and share your booking link</li>
              </ol>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  Create different booking links for different purposes (e.g., 15-min quick calls, 
                  30-min consultations, 60-min in-depth meetings) to streamline your scheduling process.
                </p>
              </div>

              <h3 className="text-lg font-medium">Customizing Booking Experience</h3>
              <p className="mb-2">Tailor how others interact with your booking page:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Add a custom form to collect information before booking</li>
                <li>Set minimum advance notice (e.g., no bookings less than 24 hours in advance)</li>
                <li>Limit the number of meetings per day</li>
                <li>Customize confirmation and reminder messages</li>
                <li>Add your logo and brand colors to the booking page</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managing Bookings</CardTitle>
              <CardDescription>Handle incoming appointments effectively</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Reviewing and Responding to Bookings</h3>
              <p className="mb-4">
                Stay on top of your scheduled appointments:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>View all upcoming bookings in the "Scheduled Events" section</li>
                <li>Receive email notifications for new bookings</li>
                <li>Accept or reschedule appointments as needed</li>
                <li>Access pre-meeting questionnaire responses from bookers</li>
              </ul>

              <h3 className="text-lg font-medium">Team Booking Pages</h3>
              <p className="mb-2">If you're a team manager, you can set up team booking options:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Go to "Scheduling" in the sidebar</li>
                <li>Click "Create New Booking Link"</li>
                <li>Enable "Team Booking" option in the booking link settings</li>
                <li>Select team members to include in the booking link</li>
                <li>Choose assignment method: Round-robin, Pooled (any available), or Specific member</li>
                <li>Save and share your team booking link</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Notifications & Reminders</CardTitle>
                  <CardDescription>Stay on top of your schedule</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Setting Up Notifications</h3>
              <p className="mb-2">
                Configure how and when you receive notifications:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Go to "Settings" in the sidebar</li>
                <li>Navigate to the "Notifications" tab</li>
                <li>Choose notification channels (email, in-app)</li>
                <li>Select which events trigger notifications</li>
                <li>Set notification timing preferences</li>
                <li>Save your settings</li>
              </ol>

              <h3 className="text-lg font-medium">Configuring Event Reminders</h3>
              <p className="mb-2">
                Never miss a meeting with customized reminders:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Default reminders can be set globally in Settings</li>
                <li>Custom reminders can be set for individual events</li>
                <li>Configure multiple reminders (e.g., 1 day before, 1 hour before)</li>
                <li>Choose reminder delivery methods (email, in-app notification)</li>
              </ul>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900">
                <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Best Practice</h4>
                <p className="text-green-800 dark:text-green-400 text-sm">
                  Set up at least two reminders for important meetings: one the day before to help
                  you prepare, and another 15-30 minutes before to make sure you're ready to join.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Keep exploring SmartScheduler's features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Now that you've mastered the basics, here are some advanced features to explore:
              </p>
              
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Calendar Integrations</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Connect with Google Calendar, Outlook, and more
                  </p>
                  <Link href="/integrations">
                    <Button variant="outline" size="sm">Go to Integrations</Button>
                  </Link>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Team Management</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Set up teams and manage group scheduling
                  </p>
                  <Link href="/team">
                    <Button variant="outline" size="sm">Explore Team Features</Button>
                  </Link>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Advanced Booking Rules</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create sophisticated availability rules
                  </p>
                  <Link href="/booking">
                    <Button variant="outline" size="sm">Booking Settings</Button>
                  </Link>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Tutorials & Guides</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Dive deeper with step-by-step tutorials
                  </p>
                  <Link href="/help?tab=tutorials">
                    <Button variant="outline" size="sm">View Tutorials</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="more-features" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Vote className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Meeting Polls</CardTitle>
                  <CardDescription>Find the best time for group meetings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Creating a Meeting Poll</h3>
              <p className="mb-2">
                Meeting polls help you find the best time when scheduling with multiple people:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Navigate to "Meeting Polls" in the sidebar</li>
                <li>Click "Create New Poll"</li>
                <li>Add a title and description for your meeting</li>
                <li>Select multiple date and time options for participants to vote on</li>
                <li>Set an optional deadline for voting</li>
                <li>Share the poll link with participants</li>
              </ol>

              <h3 className="text-lg font-medium">Managing Poll Results</h3>
              <p className="mb-2">Track responses and finalize meeting times:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>View voting results in real-time</li>
                <li>See which time slots have the most availability</li>
                <li>Close the poll and select the final time</li>
                <li>Notify participants of the selected time</li>
              </ul>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  Include more time options than you think you need - this increases the chances of finding a time that works for everyone.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <GitBranch className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Routing Forms</CardTitle>
                  <CardDescription>Direct visitors to the right booking link</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Creating a Routing Form</h3>
              <p className="mb-2">
                Routing forms let you ask qualifying questions and direct visitors to different booking links based on their answers:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Navigate to "Routing" in the sidebar</li>
                <li>Click "Create New Routing Form"</li>
                <li>Add a title and description</li>
                <li>Create questions with multiple choice options</li>
                <li>Set up routing rules for each answer</li>
                <li>Share the routing form link</li>
              </ol>

              <h3 className="text-lg font-medium">Routing Options</h3>
              <p className="mb-2">Based on answers, you can:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Redirect to a specific booking link</li>
                <li>Redirect to an external URL</li>
                <li>Display a custom message</li>
                <li>Show different booking options based on needs</li>
              </ul>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900">
                <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Use Case</h4>
                <p className="text-green-800 dark:text-green-400 text-sm">
                  Use routing forms to qualify leads before booking - ask about their needs, budget, or timeline to ensure they book with the right team member.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Contacts</CardTitle>
                  <CardDescription>Manage your booking contacts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Viewing Your Contacts</h3>
              <p className="mb-2">
                SmartScheduler automatically creates contact records when people book meetings with you:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Navigate to "Contacts" in the sidebar</li>
                <li>View all contacts who have booked with you</li>
                <li>Search contacts by name or email</li>
                <li>Click on a contact to see their booking history</li>
              </ol>

              <h3 className="text-lg font-medium">Contact Information</h3>
              <p className="mb-2">For each contact, you can view:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact details (name, email)</li>
                <li>Total number of bookings</li>
                <li>Booking history with dates and times</li>
                <li>Whether they're a repeat booker</li>
              </ul>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  Review your contacts regularly to identify repeat bookers and build stronger relationships with your most engaged clients.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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