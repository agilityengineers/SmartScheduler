import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Search, CalendarDays, BookOpen, Clock,
  Users, Bell, HelpCircle, FileText, Link2, ExternalLink,
  Info
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { useState } from "react";

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would search the knowledge base
    console.log("Searching for:", searchQuery);
    // For demo purposes, we're not implementing actual search functionality
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 mb-20">
      <div className="mb-6">
        <Link href="/help">
          <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Help & Support</span>
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground mb-6">
          Detailed articles and guides to help you get the most out of SmartScheduler.
        </p>
        
        <form onSubmit={handleSearch} className="relative mb-6">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 pr-16"
            placeholder="Search the knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-2 top-2"
          >
            Search
          </Button>
        </form>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Knowledge Base Under Development</AlertTitle>
          <AlertDescription>
            We're actively building out detailed articles for each topic. In the meantime, check out our
            comprehensive guides: <Link href="/help/documentation/GettingStartedGuide" className="text-primary hover:underline font-medium">Getting Started Guide</Link> and{" "}
            <Link href="/help/documentation/AdminGuide" className="text-primary hover:underline font-medium">Administrator Guide</Link>.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="popular">
        <TabsList className="mb-6">
          <TabsTrigger value="popular">Popular Articles</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="booking">Booking Links</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Link href="/help/documentation/article/calendar-integrations">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Connecting Your External Calendars</CardTitle>
                    <Badge>Popular</Badge>
                  </div>
                  <CardDescription>Learn how to sync with Google, Outlook, and more</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/troubleshooting-calendar">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Troubleshooting Calendar Issues</CardTitle>
                    <Badge>Popular</Badge>
                  </div>
                  <CardDescription>Solve common syncing and display problems</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <HelpCircle className="mr-1 h-4 w-4" />
                      <span>7 min read</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/creating-booking-links">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Creating Effective Booking Links</CardTitle>
                    <Badge>Popular</Badge>
                  </div>
                  <CardDescription>Design booking links that maximize conversions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Link2 className="mr-1 h-4 w-4" />
                      <span>8 min read</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/getting-started-teams">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Team Scheduling Basics</CardTitle>
                    <Badge>Popular</Badge>
                  </div>
                  <CardDescription>Coordinate scheduling across team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-1 h-4 w-4" />
                      <span>6 min read</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">Recently Updated</h2>
          <div className="space-y-3">
            <Link href="/help/documentation/article/new-google-calendar-integration">
              <div className="border rounded-lg p-4 cursor-pointer hover:bg-accent/50 hover:border-accent-foreground/20 transition-colors">
                <div className="flex justify-between mb-1">
                  <h3 className="font-medium">Google Calendar OAuth Changes (Updated)</h3>
                  <Badge variant="outline">New</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Important changes to Google Calendar integration requirements
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  <span>Updated 2 days ago • 4 min read</span>
                </div>
              </div>
            </Link>
            
            <Link href="/help/documentation/article/custom-booking-forms">
              <div className="border rounded-lg p-4 cursor-pointer hover:bg-accent/50 hover:border-accent-foreground/20 transition-colors">
                <div className="flex justify-between mb-1">
                  <h3 className="font-medium">Custom Booking Form Fields</h3>
                  <Badge variant="outline">Updated</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  New capabilities for collecting information during booking
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <FileText className="mr-1 h-3 w-3" />
                  <span>Updated 5 days ago • 5 min read</span>
                </div>
              </div>
            </Link>
            
            <Link href="/help/documentation/article/timezone-management">
              <div className="border rounded-lg p-4 cursor-pointer hover:bg-accent/50 hover:border-accent-foreground/20 transition-colors">
                <div className="flex justify-between mb-1">
                  <h3 className="font-medium">Managing Time Zones Effectively</h3>
                  <Badge variant="outline">Updated</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Best practices for scheduling across multiple time zones
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  <span>Updated 1 week ago • 6 min read</span>
                </div>
              </div>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/help/documentation/article/create-first-event">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Creating Your First Event</CardTitle>
                  <CardDescription>Learn how to create and manage calendar events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>4 min read</span>
                    </div>
                    <Badge>Beginner</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/recurring-events">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Managing Recurring Events</CardTitle>
                  <CardDescription>Set up repeating meetings and appointments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/calendar-views">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Calendar View Options</CardTitle>
                  <CardDescription>Customize how you view your calendar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>3 min read</span>
                    </div>
                    <Badge>Beginner</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/event-notifications">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Event Notifications</CardTitle>
                  <CardDescription>Configure reminders and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Bell className="mr-1 h-4 w-4" />
                      <span>4 min read</span>
                    </div>
                    <Badge>Beginner</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/advanced-scheduling">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Advanced Scheduling</CardTitle>
                  <CardDescription>Master complex scheduling scenarios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>8 min read</span>
                    </div>
                    <Badge>Advanced</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/timezone-handling">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Time Zone Management</CardTitle>
                  <CardDescription>Scheduling across different time zones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>6 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="booking" className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Booking Link Basics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/help/documentation/article/booking-link-setup">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Creating Booking Links</CardTitle>
                  <CardDescription>Set up your first scheduling page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Link2 className="mr-1 h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                    <Badge>Beginner</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/availability-settings">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Availability Settings</CardTitle>
                  <CardDescription>Define when people can book with you</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>7 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/scheduling-policies">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Booking Policies</CardTitle>
                  <CardDescription>Set rules for scheduling and cancellations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="mr-1 h-4 w-4" />
                      <span>6 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">Advanced Booking Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/help/documentation/article/booking-forms">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Custom Booking Forms</CardTitle>
                  <CardDescription>Create forms to gather information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="mr-1 h-4 w-4" />
                      <span>8 min read</span>
                    </div>
                    <Badge>Advanced</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/team-booking">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Team Booking Pages</CardTitle>
                  <CardDescription>Coordinate scheduling across a team</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-1 h-4 w-4" />
                      <span>9 min read</span>
                    </div>
                    <Badge>Advanced</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/booking-page-customization">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Customizing Booking Pages</CardTitle>
                  <CardDescription>Brand and style your scheduling pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="mr-1 h-4 w-4" />
                      <span>7 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Calendar Integrations</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/help/documentation/article/google-calendar-integration">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Google Calendar</CardTitle>
                  <CardDescription>Connect and sync with Google Calendar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 h-4 w-4" />
                      <span>6 min read</span>
                    </div>
                    <Badge>Beginner</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/outlook-integration">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Microsoft Outlook</CardTitle>
                  <CardDescription>Connect and sync with Outlook Calendar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 h-4 w-4" />
                      <span>6 min read</span>
                    </div>
                    <Badge>Beginner</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/ical-integration">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">iCal Integration</CardTitle>
                  <CardDescription>Connect and sync using iCal feeds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 h-4 w-4" />
                      <span>5 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">Other Integrations</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/help/documentation/article/video-conferencing-integrations">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Video Conferencing</CardTitle>
                  <CardDescription>Zoom, Teams, Google Meet, and more</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>7 min read</span>
                    </div>
                    <Badge>Intermediate</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/crm-integrations">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">CRM Integrations</CardTitle>
                  <CardDescription>Connect to Salesforce, HubSpot, and more</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>8 min read</span>
                    </div>
                    <Badge>Advanced</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/help/documentation/article/zapier-webhook-integrations">
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Zapier & Webhooks</CardTitle>
                  <CardDescription>Automate workflows with custom integrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-4 w-4" />
                      <span>10 min read</span>
                    </div>
                    <Badge>Advanced</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}