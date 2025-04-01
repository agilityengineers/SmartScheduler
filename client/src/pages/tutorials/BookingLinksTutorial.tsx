import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  CalendarDays, 
  Clock, 
  Users, 
  Settings, 
  Link2, 
  Calendar,
  Clock12,
  Globe,
  LinkIcon,
  Share2,
  MessageSquare,
  UserCheck,
  BookOpen
} from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import CreateEventModal from "@/components/calendar/CreateEventModal";

const steps = [
  {
    id: "intro",
    title: "Introduction",
    description: "Overview of booking links"
  },
  {
    id: "creating",
    title: "Creating Booking Links",
    description: "Set up your first booking link"
  },
  {
    id: "availability",
    title: "Setting Availability",
    description: "Configure when people can book you"
  },
  {
    id: "customization",
    title: "Customizing Your Links",
    description: "Make your booking pages unique"
  },
  {
    id: "embedding",
    title: "Sharing & Embedding",
    description: "Use your booking links effectively"
  },
  {
    id: "managing",
    title: "Managing Bookings",
    description: "Handle incoming bookings efficiently"
  },
  {
    id: "conclusion",
    title: "Best Practices",
    description: "Tips for optimizing your booking links"
  }
];

export default function BookingLinksTutorial() {
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
              <h1 className="text-3xl font-bold mb-2">Creating Effective Booking Links</h1>
              <p className="text-muted-foreground">
                Learn how to set up and optimize booking links that make scheduling effortless.
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
                            <LinkIcon className="h-16 w-16 text-primary" />
                          </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold">Welcome to Booking Links</h2>
                        <p>
                          Booking links are one of the most powerful features of SmartScheduler, allowing others to schedule time with you based on your actual availability. They eliminate the back-and-forth of scheduling and ensure meetings land on your calendar automatically.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">What You'll Learn</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>How to create and configure booking links</li>
                          <li>Setting your availability for specific booking types</li>
                          <li>Customizing the booking experience for your invitees</li>
                          <li>Sharing and embedding your booking links</li>
                          <li>Managing incoming bookings efficiently</li>
                          <li>Best practices for optimizing your scheduling workflow</li>
                        </ul>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Before You Begin</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            For the best experience with booking links, we recommend connecting at least one calendar so your availability can be accurately determined. If you haven't connected a calendar yet, don't worry - you can still create booking links, but you'll need to manually manage conflicts.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: Creating Booking Links */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Creating Your First Booking Link</h2>
                        <p>
                          Let's start by creating a basic booking link that others can use to schedule time with you.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Types of Booking Links</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <h4 className="font-medium">One-on-One</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Standard meetings between you and one other person. Ideal for consultations, interviews, or quick catch-ups.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                              <h4 className="font-medium">Group</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Allow multiple people to join the same meeting slot. Perfect for webinars, group sessions, or team meetings.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                <Users className="h-4 w-4 text-green-600" />
                              </div>
                              <h4 className="font-medium">Round Robin</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Distribute bookings among your team members based on availability or rules. Great for support teams or sales teams.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                                <Calendar className="h-4 w-4 text-orange-600" />
                              </div>
                              <h4 className="font-medium">Sequential</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Book multiple meetings in a specific order. Useful for multi-stage interviews or onboarding processes.
                            </p>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Creating a One-on-One Booking Link</h3>
                        <ol className="list-decimal pl-6 space-y-2 mt-2">
                          <li>Navigate to <strong>Booking Links</strong> in the sidebar</li>
                          <li>Click the <strong>Create Booking Link</strong> button</li>
                          <li>Select <strong>One-on-One</strong> as the booking type</li>
                          <li>Fill in the basic details:
                            <ul className="list-disc pl-6 mt-1">
                              <li><strong>Name:</strong> Give your booking link a descriptive name (e.g., "30-Minute Consultation")</li>
                              <li><strong>Duration:</strong> Set how long the meeting should be</li>
                              <li><strong>Description:</strong> Explain what the meeting is for</li>
                              <li><strong>Location:</strong> Choose between video call, phone call, or in-person</li>
                            </ul>
                          </li>
                          <li>Click <strong>Create</strong> to generate your booking link</li>
                        </ol>
                        
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900 mt-6">
                          <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Pro Tip</h4>
                          <p className="text-green-800 dark:text-green-400 text-sm">
                            Create separate booking links for different meeting types (e.g., "Quick 15-min Chat", "60-min Strategy Session") so people can choose the appropriate option for their needs.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Setting Availability */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Setting Your Availability</h2>
                        <p>
                          One of the most important aspects of effective booking links is properly configuring your availability to ensure bookings only occur when you're actually available.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Ways to Configure Availability</h3>
                        
                        <Tabs defaultValue="days">
                          <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="days">Days & Times</TabsTrigger>
                            <TabsTrigger value="date">Date Range</TabsTrigger>
                            <TabsTrigger value="buffer">Buffer Times</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="days" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <h3 className="font-medium">Available Days & Times</h3>
                            </div>
                            <p>
                              Set which days of the week and hours you're available for bookings:
                            </p>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>In your booking link settings, go to the <strong>Availability</strong> tab</li>
                              <li>Select which days of the week you're available</li>
                              <li>For each day, set your available time ranges</li>
                              <li>You can add multiple time ranges per day (e.g., 9:00-12:00 and 13:00-17:00)</li>
                              <li>Save your changes to update your availability</li>
                            </ol>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Example:</strong> You might set availability for Monday-Friday, 9:00 AM to 5:00 PM, with a lunch break from 12:00 PM to 1:00 PM.
                            </p>
                          </TabsContent>
                          
                          <TabsContent value="date" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                                <Calendar className="h-5 w-5 text-green-600 dark:text-green-300" />
                              </div>
                              <h3 className="font-medium">Date Range Restrictions</h3>
                            </div>
                            <p>
                              Limit how far in advance people can book with you:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Rolling availability:</strong> Set how many days into the future people can book (e.g., the next 60 days)
                              </li>
                              <li>
                                <strong>Minimum notice:</strong> Prevent last-minute bookings by requiring advance notice (e.g., at least 4 hours before)
                              </li>
                              <li>
                                <strong>Maximum notice:</strong> Prevent bookings too far in the future (e.g., no more than 30 days ahead)
                              </li>
                              <li>
                                <strong>Date range:</strong> Set a specific start and end date for when your booking link is active
                              </li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Example:</strong> You might require at least 24 hours notice and allow bookings up to 2 weeks in advance.
                            </p>
                          </TabsContent>
                          
                          <TabsContent value="buffer" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                              </div>
                              <h3 className="font-medium">Buffer Times</h3>
                            </div>
                            <p>
                              Add padding before or after meetings to give yourself breathing room:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Before meetings:</strong> Add buffer time before each booking to prepare
                              </li>
                              <li>
                                <strong>After meetings:</strong> Add buffer time after each booking to take notes or prepare for the next meeting
                              </li>
                              <li>
                                <strong>Between bookings:</strong> Ensure a minimum amount of time between consecutive bookings
                              </li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Example:</strong> Setting a 15-minute buffer after each meeting ensures you have time to take notes and prepare for your next appointment.
                            </p>
                          </TabsContent>
                        </Tabs>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mt-6">
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important</h4>
                          <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                            SmartScheduler automatically checks your connected calendars and prevents double-bookings. However, if you have multiple booking links, make sure their availabilities don't conflict in ways you didn't intend.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 4: Customizing Your Links */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Customizing Your Booking Links</h2>
                        <p>
                          Personalize your booking pages to create a branded, professional scheduling experience for your invitees.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Key Customization Options</h3>
                        <div className="space-y-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">URL & Slug</h4>
                            <p className="text-sm">
                              Customize the URL for your booking link to make it easy to remember and share.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded mt-2 font-mono text-sm">
                              mysmartscheduler.co/book/<span className="text-primary">your-custom-slug</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Choose something memorable and relevant to the meeting type.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Branding & Colors</h4>
                            <p className="text-sm">
                              Customize the appearance of your booking page to match your brand:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 mt-1 text-sm">
                              <li>Upload your logo or profile picture</li>
                              <li>Choose a custom accent color</li>
                              <li>Add a background image (optional)</li>
                              <li>Select a light or dark theme</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Form Fields</h4>
                            <p className="text-sm">
                              Collect important information from invitees when they book:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 mt-1 text-sm">
                              <li>Standard fields: Name, Email, Phone</li>
                              <li>Custom questions: Text fields, multiple choice, checkboxes</li>
                              <li>Required vs. optional fields</li>
                              <li>Field order and grouping</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-2">
                              Only ask for information you actually need to avoid friction in the booking process.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Confirmation Page & Redirects</h4>
                            <p className="text-sm">
                              Customize what happens after someone books with you:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 mt-1 text-sm">
                              <li>Custom confirmation message</li>
                              <li>Redirect to another page after booking</li>
                              <li>Display additional resources or instructions</li>
                              <li>Add your social media links</li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            The confirmation page is an opportunity to provide valuable information to your invitees. Consider adding links to preparation materials, forms they should fill out before the meeting, or even a brief video introducing yourself.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 5: Sharing & Embedding */}
                    {currentStep === 4 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Sharing & Embedding Your Links</h2>
                        <p>
                          Once you've created and customized your booking links, it's time to share them with the world.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Sharing Methods</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <LinkIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <h4 className="font-medium">Direct Link</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Share your booking link directly via email, text message, or social media.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded mt-2 text-xs font-mono">
                              mysmartscheduler.co/book/your-slug
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </div>
                              <h4 className="font-medium">Email Signature</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Add your booking link to your email signature for easy access.
                            </p>
                            <div className="text-xs mt-2">
                              <p><strong>Example:</strong></p>
                              <p className="mt-1">John Smith<br />Product Manager | SmartScheduler<br /><span className="text-primary">Schedule a meeting: mysmartscheduler.co/book/john</span></p>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                                <Globe className="h-4 w-4 text-purple-600" />
                              </div>
                              <h4 className="font-medium">Website Embed</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Embed your booking page directly into your website.
                            </p>
                            <div className="text-xs mt-2">
                              <p>You can embed your calendar as:</p>
                              <ul className="list-disc pl-4 mt-1">
                                <li>Inline embed (full booking experience)</li>
                                <li>Pop-up widget (triggered by a button)</li>
                                <li>Sidebar widget (slides in from the edge)</li>
                              </ul>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2">
                                <Share2 className="h-4 w-4 text-red-600" />
                              </div>
                              <h4 className="font-medium">Social Media</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Share your booking link on social media profiles and posts.
                            </p>
                            <div className="text-xs mt-2">
                              <p>Great places to include your link:</p>
                              <ul className="list-disc pl-4 mt-1">
                                <li>LinkedIn profile bio</li>
                                <li>Twitter/X profile</li>
                                <li>Instagram bio link</li>
                                <li>Facebook business page</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Embedding Code Example</h3>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mt-2 font-mono text-xs overflow-x-auto">
                          {'<iframe src="https://mysmartscheduler.co/embed/your-slug" width="100%" height="600px" frameborder="0"></iframe>'}
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            When sharing your booking link, add context about why someone should book with you and what to expect. For example: "Book a 30-minute consultation to discuss your marketing strategy challenges. I'll provide actionable insights you can implement right away."
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 6: Managing Bookings */}
                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Managing Your Bookings</h2>
                        <p>
                          Once people start booking meetings with you, you'll need to manage those bookings efficiently.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Booking Notifications</h3>
                        <p>
                          Customize how you're notified about new bookings:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Email Notifications</h4>
                            <p className="text-sm text-muted-foreground">
                              Receive email alerts when:
                            </p>
                            <ul className="list-disc pl-6 mt-1 text-sm">
                              <li>Someone books a meeting</li>
                              <li>Someone cancels a meeting</li>
                              <li>Someone reschedules a meeting</li>
                              <li>An upcoming meeting is about to start (reminder)</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Calendar Invites</h4>
                            <p className="text-sm text-muted-foreground">
                              Automatically generate and send calendar invites to:
                            </p>
                            <ul className="list-disc pl-6 mt-1 text-sm">
                              <li>Your calendar (automatically added)</li>
                              <li>The invitee's calendar (via email)</li>
                              <li>Any additional attendees (optional)</li>
                              <li>Include custom meeting details and links</li>
                            </ul>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Managing Existing Bookings</h3>
                        <p>
                          Handle your bookings from the Bookings Dashboard:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2 mt-2">
                          <li>Navigate to <strong>Bookings</strong> in your dashboard</li>
                          <li>View all upcoming and past bookings</li>
                          <li>Filter bookings by status, date, or booking link</li>
                          <li>For any booking, you can:
                            <ul className="list-disc pl-6 mt-1">
                              <li><strong>Reschedule:</strong> Change the date/time</li>
                              <li><strong>Cancel:</strong> Cancel the meeting (with optional message)</li>
                              <li><strong>View details:</strong> See invitee information and responses</li>
                              <li><strong>Add notes:</strong> Keep private notes for your reference</li>
                            </ul>
                          </li>
                        </ol>
                        
                        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mt-6">
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important</h4>
                          <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                            When you cancel or reschedule a meeting, the invitee will automatically receive a notification. Consider adding a personal message to explain the reason for the change.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 7: Best Practices */}
                    {currentStep === 6 && (
                      <div className="space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full">
                            <Check className="h-16 w-16 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-center">Best Practices for Booking Links</h2>
                        <p>
                          Follow these tips to optimize your booking links and create a better scheduling experience.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Optimize Your Availability</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Batch similar meetings:</strong> Set aside specific days or time blocks for similar types of meetings to maintain focus and context
                          </li>
                          <li>
                            <strong>Protect your focus time:</strong> Don't make all your working hours available for bookings; reserve some time for deep work
                          </li>
                          <li>
                            <strong>Consider time zones:</strong> If you work with people globally, be mindful of time zone differences when setting your availability
                          </li>
                          <li>
                            <strong>Use buffer times wisely:</strong> Add appropriate buffers based on the meeting type (more for intense meetings, less for quick check-ins)
                          </li>
                        </ul>
                        
                        <h3 className="text-lg font-medium mt-6">Create a Great Invitee Experience</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Clear descriptions:</strong> Provide detailed information about what the meeting is for and what to expect
                          </li>
                          <li>
                            <strong>Minimal form fields:</strong> Only ask for information you actually need to reduce friction
                          </li>
                          <li>
                            <strong>Send preparation materials:</strong> Use confirmation emails to share any pre-meeting materials or questions
                          </li>
                          <li>
                            <strong>Personalize reminders:</strong> Customize reminder emails to include helpful information and reduce no-shows
                          </li>
                        </ul>
                        
                        <h3 className="text-lg font-medium mt-6">Advanced Strategies</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Use round-robin for teams:</strong> Distribute meeting load across team members based on availability and expertise
                          </li>
                          <li>
                            <strong>Implement payment requirements:</strong> For consultation services, set up payment integration to require payment before booking
                          </li>
                          <li>
                            <strong>Set up workflows:</strong> Create automated actions that trigger when someone books (e.g., adding them to your CRM)
                          </li>
                          <li>
                            <strong>Analyze booking patterns:</strong> Review your booking analytics to optimize your availability and improve conversion rates
                          </li>
                        </ul>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Final Tip</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            Periodically review and update your booking links and availability to ensure they still align with your current workflow and priorities. What worked six months ago might not be optimal for your current situation.
                          </p>
                        </div>
                        
                        <div className="mt-6 p-6 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <h3 className="text-lg font-medium mb-4 text-center">What's Next?</h3>
                          <p className="text-center mb-4">
                            Now that you know how to create and optimize booking links, it's time to put your knowledge into practice!
                          </p>
                          <div className="flex justify-center">
                            <Link href="/booking">
                              <Button className="flex items-center">
                                <LinkIcon className="mr-2 h-4 w-4" />
                                Create Your First Booking Link
                              </Button>
                            </Link>
                          </div>
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