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
  LinkIcon,
  Calendar,
  ClipboardList,
  BarChart,
  UserCheck,
  Filter,
  RotateCcw,
  PanelLeftClose,
  Share2
} from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import CreateEventModal from "@/components/calendar/CreateEventModal";

const steps = [
  {
    id: "intro",
    title: "Introduction",
    description: "Team scheduling basics"
  },
  {
    id: "setup",
    title: "Team Setup",
    description: "Configure your team structure"
  },
  {
    id: "availability",
    title: "Team Availability",
    description: "Manage collective availability"
  },
  {
    id: "round-robin",
    title: "Round Robin Scheduling",
    description: "Distribute bookings efficiently"
  },
  {
    id: "workflows",
    title: "Scheduling Workflows",
    description: "Automate team processes"
  },
  {
    id: "analytics",
    title: "Reporting & Analytics",
    description: "Measure and improve efficiency"
  },
  {
    id: "best-practices",
    title: "Best Practices",
    description: "Tips for optimizing team scheduling"
  }
];

export default function TeamSchedulingTutorial() {
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
              <h1 className="text-3xl font-bold mb-2">Team Scheduling Strategies</h1>
              <p className="text-muted-foreground">
                Learn advanced techniques to coordinate team schedules and optimize collective availability.
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
                            <Users className="h-16 w-16 text-primary" />
                          </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold">Team Scheduling Fundamentals</h2>
                        <p>
                          Coordinating schedules across a team can be challenging, but SmartScheduler's team features make it simple. In this tutorial, you'll learn how to use SmartScheduler's advanced team scheduling features to improve collaboration and productivity.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">What You'll Learn</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Setting up and organizing your team structure</li>
                          <li>Managing shared availability and resources</li>
                          <li>Implementing round-robin scheduling for equitable distribution</li>
                          <li>Creating automated scheduling workflows</li>
                          <li>Analyzing team scheduling metrics</li>
                          <li>Best practices for optimizing team coordination</li>
                        </ul>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Requirements</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            To fully utilize team scheduling features, you need:
                          </p>
                          <ul className="list-disc pl-6 space-y-1 mt-1 text-blue-800 dark:text-blue-400 text-sm">
                            <li>A Company or Team Manager account</li>
                            <li>Team members added to your organization</li>
                            <li>Basic familiarity with individual scheduling features</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: Team Setup */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Setting Up Your Team</h2>
                        <p>
                          Before you can implement effective team scheduling strategies, you need to properly configure your team structure in SmartScheduler.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Creating Team Structure</h3>
                        <div className="space-y-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Creating a Team</h4>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Navigate to the <strong>Teams</strong> section in your organization dashboard</li>
                              <li>Click <strong>Create New Team</strong></li>
                              <li>Enter the team name, description, and department</li>
                              <li>Select team visibility settings (public or private)</li>
                              <li>Click <strong>Create Team</strong> to finalize</li>
                            </ol>
                            <p className="text-sm text-muted-foreground mt-2">
                              You can create multiple teams for different departments or project groups within your organization.
                            </p>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Adding Team Members</h4>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Go to your team dashboard</li>
                              <li>Click <strong>Add Member</strong></li>
                              <li>Select from existing organization members or invite new users by email</li>
                              <li>Assign appropriate roles (Team Member, Team Admin)</li>
                              <li>Set permission levels for scheduling access</li>
                              <li>Click <strong>Add to Team</strong></li>
                            </ol>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Defining Team Roles</h4>
                            <p className="text-sm mb-2">
                              Different roles have different capabilities in team scheduling:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <h5 className="text-sm font-medium">Team Admin</h5>
                                <ul className="list-disc pl-4 text-xs mt-1 space-y-1">
                                  <li>Full access to team calendar</li>
                                  <li>Can create team booking links</li>
                                  <li>Can view/edit all team members' availability</li>
                                  <li>Can configure round-robin settings</li>
                                  <li>Access to all scheduling analytics</li>
                                </ul>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <h5 className="text-sm font-medium">Team Member</h5>
                                <ul className="list-disc pl-4 text-xs mt-1 space-y-1">
                                  <li>Can view team calendar</li>
                                  <li>Can set personal availability</li>
                                  <li>Can participate in round-robin pools</li>
                                  <li>Limited scheduling analytics access</li>
                                  <li>Cannot edit other members' settings</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900 mt-6">
                          <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Pro Tip</h4>
                          <p className="text-green-800 dark:text-green-400 text-sm">
                            Organize your teams based on scheduling needs rather than just department structure. For example, you might create a "Customer Support" team that includes members from different departments who need to share on-call scheduling responsibilities.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Team Availability */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Managing Team Availability</h2>
                        <p>
                          One of the most powerful features of team scheduling is the ability to coordinate and visualize collective availability across your entire team.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Setting Team Availability</h3>
                        
                        <Tabs defaultValue="collective">
                          <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="collective">Collective View</TabsTrigger>
                            <TabsTrigger value="individual">Individual Settings</TabsTrigger>
                            <TabsTrigger value="conflicts">Conflict Resolution</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="collective" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <h3 className="font-medium">Team Availability View</h3>
                            </div>
                            <p>
                              The collective availability view shows when members of your team are available or busy:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Team Calendar:</strong> Access the team calendar from your team dashboard
                              </li>
                              <li>
                                <strong>Availability Heatmap:</strong> The darker the time slot, the fewer team members are available
                              </li>
                              <li>
                                <strong>Filtering:</strong> Filter the view by team members, time ranges, or event types
                              </li>
                              <li>
                                <strong>Finding Free Time:</strong> Use the "Find Team Time" feature to automatically identify slots when everyone is available
                              </li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>How to access:</strong> Go to your Team Dashboard and click on "Team Calendar" or "Team Availability" in the sidebar.
                            </p>
                          </TabsContent>
                          
                          <TabsContent value="individual" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-300" />
                              </div>
                              <h3 className="font-medium">Individual Team Member Settings</h3>
                            </div>
                            <p>
                              Team members can set their availability preferences that will be used for team scheduling:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Working Hours:</strong> Each team member can set their regular working hours
                              </li>
                              <li>
                                <strong>Time Off:</strong> Members can mark vacation days and time off that will be automatically blocked in team scheduling
                              </li>
                              <li>
                                <strong>Meeting Preferences:</strong> Set buffer times between meetings and maximum meetings per day
                              </li>
                              <li>
                                <strong>Focus Time:</strong> Block out dedicated focus time that won't be interrupted by team scheduling
                              </li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-2">
                              Team admins can override individual settings if needed for critical team scheduling requirements.
                            </p>
                          </TabsContent>
                          
                          <TabsContent value="conflicts" className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                                <Filter className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                              </div>
                              <h3 className="font-medium">Resolving Scheduling Conflicts</h3>
                            </div>
                            <p>
                              When conflicts arise in team scheduling, SmartScheduler provides tools to resolve them:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Conflict Detection:</strong> The system automatically identifies scheduling conflicts
                              </li>
                              <li>
                                <strong>Priority Settings:</strong> Set priority levels for different event types or team members
                              </li>
                              <li>
                                <strong>Conflict Resolution Workflow:</strong> Follow a structured process to resolve overlapping schedules
                              </li>
                              <li>
                                <strong>Notification System:</strong> Affected team members are automatically notified about conflicts and resolutions
                              </li>
                            </ul>
                            <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900 mt-2">
                              <p className="text-yellow-800 dark:text-yellow-400 text-xs">
                                <strong>Note:</strong> When creating team events, you can set them as "Required" or "Optional" for different team members to help manage conflicts.
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Best Practice</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            Encourage team members to keep their calendars up-to-date and connected to SmartScheduler. The team availability features are only as accurate as the underlying calendar data.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 4: Round Robin Scheduling */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Round Robin Scheduling</h2>
                        <p>
                          Round robin scheduling distributes meetings fairly among team members based on rules you set, making it perfect for sales teams, support staff, and consulting groups.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">What is Round Robin Scheduling?</h3>
                        <p>
                          Round robin scheduling automatically assigns incoming meeting requests to available team members based on predetermined criteria. When someone books a meeting through your team's booking link, the system intelligently selects which team member will take the meeting.
                        </p>
                        
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mt-4">
                          <h4 className="font-medium mb-2">How Round Robin Works</h4>
                          <ol className="list-decimal pl-6 space-y-2">
                            <li>A customer books a meeting through your team booking link</li>
                            <li>SmartScheduler checks which team members are part of the round robin pool</li>
                            <li>The system filters based on availability during the requested time slot</li>
                            <li>From the available members, it selects someone based on your distribution rules</li>
                            <li>The selected team member is assigned the booking</li>
                            <li>Both the customer and team member receive confirmations</li>
                          </ol>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Setting Up Round Robin</h3>
                        <div className="space-y-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Creating a Round Robin Booking Link</h4>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li>Go to <strong>Booking Links</strong> in your team dashboard</li>
                              <li>Click <strong>Create Booking Link</strong></li>
                              <li>Select <strong>Round Robin</strong> as the booking type</li>
                              <li>Fill in the basic details (name, duration, description)</li>
                              <li>Click <strong>Next</strong> to configure round robin settings</li>
                            </ol>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Round Robin Distribution Methods</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <h5 className="text-sm font-medium">Even Distribution</h5>
                                <p className="text-xs mt-1">
                                  Assigns meetings evenly across all team members to balance workload, regardless of individual capacity.
                                </p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <h5 className="text-sm font-medium">Capacity Based</h5>
                                <p className="text-xs mt-1">
                                  Assigns more meetings to members with higher capacity settings, accommodating different workloads.
                                </p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <h5 className="text-sm font-medium">First Available</h5>
                                <p className="text-xs mt-1">
                                  Assigns to the first available team member, maximizing earliest possible meeting times.
                                </p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                <h5 className="text-sm font-medium">Skills Based</h5>
                                <p className="text-xs mt-1">
                                  Assigns based on expertise tags, matching meetings to the most qualified team members.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">Advanced Round Robin Settings</h4>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Member Pool:</strong> Select which team members to include in the round robin pool
                              </li>
                              <li>
                                <strong>Priority Rules:</strong> Set priority levels for different team members
                              </li>
                              <li>
                                <strong>Availability Rules:</strong> Define minimum availability requirements
                              </li>
                              <li>
                                <strong>Reset Period:</strong> Determine when distribution counters reset (daily, weekly, monthly)
                              </li>
                              <li>
                                <strong>Reassignment Settings:</strong> Configure what happens if a team member can't attend a meeting
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900 mt-6">
                          <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Pro Tip</h4>
                          <p className="text-green-800 dark:text-green-400 text-sm">
                            For sales teams, consider using a "round robin with memory" feature that assigns repeat customers to the same team member they worked with previously, maintaining relationship continuity while still distributing new leads evenly.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 5: Scheduling Workflows */}
                    {currentStep === 4 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Scheduling Workflows</h2>
                        <p>
                          Automate your team's scheduling processes with customized workflows that streamline repetitive tasks and ensure consistent follow-up.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">What are Scheduling Workflows?</h3>
                        <p>
                          Scheduling workflows are automated sequences of actions that occur before, during, or after a scheduled event. They help standardize your team's scheduling processes and ensure nothing falls through the cracks.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Types of Workflows</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                                <ClipboardList className="h-4 w-4 text-indigo-600" />
                              </div>
                              <h4 className="font-medium">Pre-Meeting Workflows</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Actions that occur before a scheduled meeting:
                            </p>
                            <ul className="list-disc pl-6 text-sm space-y-1">
                              <li>Automated intake forms</li>
                              <li>Pre-meeting questionnaires</li>
                              <li>Document sharing</li>
                              <li>Preparation reminders</li>
                              <li>Calendar notifications</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <h4 className="font-medium">Booking Workflows</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Actions that occur during the booking process:
                            </p>
                            <ul className="list-disc pl-6 text-sm space-y-1">
                              <li>Multi-stage approval processes</li>
                              <li>Team notifications</li>
                              <li>Resource allocation</li>
                              <li>CRM integration updates</li>
                              <li>Meeting link generation</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                <RotateCcw className="h-4 w-4 text-green-600" />
                              </div>
                              <h4 className="font-medium">Follow-Up Workflows</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Actions that occur after a meeting:
                            </p>
                            <ul className="list-disc pl-6 text-sm space-y-1">
                              <li>Automated follow-up emails</li>
                              <li>Feedback surveys</li>
                              <li>Meeting summary distribution</li>
                              <li>Next steps assignment</li>
                              <li>Follow-up scheduling</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                                <PanelLeftClose className="h-4 w-4 text-purple-600" />
                              </div>
                              <h4 className="font-medium">Conditional Workflows</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Flexible workflows based on specific conditions:
                            </p>
                            <ul className="list-disc pl-6 text-sm space-y-1">
                              <li>If-then branching logic</li>
                              <li>Different workflows by meeting type</li>
                              <li>Role-specific processes</li>
                              <li>Time or date-based triggers</li>
                              <li>Customer segment customization</li>
                            </ul>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Creating Team Workflows</h3>
                        <ol className="list-decimal pl-6 space-y-2 mt-2">
                          <li>Go to your team dashboard</li>
                          <li>Select <strong>Workflows</strong> from the menu</li>
                          <li>Click <strong>Create Workflow</strong></li>
                          <li>Choose a workflow type (Pre-Meeting, Booking, Follow-Up, Conditional)</li>
                          <li>Configure triggers: When should this workflow activate?</li>
                          <li>Add actions: What should happen when triggered?</li>
                          <li>Set conditions: Any special rules or exceptions?</li>
                          <li>Assign to booking types: Which scheduling links should use this workflow?</li>
                          <li>Test your workflow before activating it</li>
                        </ol>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Example Workflow</h4>
                          <p className="text-blue-800 dark:text-blue-400 text-sm">
                            <strong>Client Onboarding Workflow:</strong>
                          </p>
                          <ol className="list-decimal pl-6 space-y-1 mt-1 text-blue-800 dark:text-blue-400 text-sm">
                            <li>When a new client books an onboarding call, send them a welcome email with prep materials</li>
                            <li>3 days before the meeting, send a reminder with a link to an intake form</li>
                            <li>1 hour before, send meeting link and agenda to both client and assigned team member</li>
                            <li>After the meeting, automatically send follow-up email with next steps</li>
                            <li>3 days after meeting, trigger account manager to check in with client</li>
                            <li>2 weeks after, send automated satisfaction survey</li>
                          </ol>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 6: Reporting & Analytics */}
                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Team Scheduling Analytics</h2>
                        <p>
                          Gain insights into your team's scheduling patterns, efficiency, and workload distribution with SmartScheduler's analytics features.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Key Metrics to Track</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <BarChart className="h-4 w-4 text-blue-600" />
                              </div>
                              <h4 className="font-medium">Workload Distribution</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Track meeting load across team members:
                            </p>
                            <ul className="list-disc pl-6 mt-1 text-sm space-y-1">
                              <li>Number of meetings per team member</li>
                              <li>Total meeting hours per person</li>
                              <li>Meeting-to-work ratio</li>
                              <li>Round robin distribution effectiveness</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                                <Clock className="h-4 w-4 text-green-600" />
                              </div>
                              <h4 className="font-medium">Time Utilization</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Analyze how time is being used:
                            </p>
                            <ul className="list-disc pl-6 mt-1 text-sm space-y-1">
                              <li>Meeting time vs. focus time</li>
                              <li>Internal vs. external meetings</li>
                              <li>Average meeting duration</li>
                              <li>Time spent in different meeting types</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                                <LinkIcon className="h-4 w-4 text-purple-600" />
                              </div>
                              <h4 className="font-medium">Booking Link Performance</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Measure booking link effectiveness:
                            </p>
                            <ul className="list-disc pl-6 mt-1 text-sm space-y-1">
                              <li>Conversion rate (views to bookings)</li>
                              <li>Most popular booking types</li>
                              <li>Booking link traffic sources</li>
                              <li>No-show/cancellation rates</li>
                            </ul>
                          </div>
                          
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2">
                                <Users className="h-4 w-4 text-red-600" />
                              </div>
                              <h4 className="font-medium">Team Efficiency</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Evaluate overall scheduling efficiency:
                            </p>
                            <ul className="list-disc pl-6 mt-1 text-sm space-y-1">
                              <li>Time to book (speed of scheduling)</li>
                              <li>Rescheduling frequency</li>
                              <li>Advanced booking time frame</li>
                              <li>Resource utilization rates</li>
                            </ul>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium mt-6">Accessing Analytics</h3>
                        <ol className="list-decimal pl-6 space-y-2 mt-2">
                          <li>Go to your team dashboard</li>
                          <li>Select <strong>Analytics</strong> from the menu</li>
                          <li>Choose the date range for your analysis</li>
                          <li>Filter by team members, booking types, or other criteria</li>
                          <li>View visualizations and data tables</li>
                          <li>Export reports as needed (CSV, PDF, etc.)</li>
                        </ol>
                        
                        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900 mt-6">
                          <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Using Analytics Effectively</h4>
                          <ul className="list-disc pl-6 space-y-1 text-green-800 dark:text-green-400 text-sm">
                            <li>
                              <strong>Regular review:</strong> Schedule monthly analytics reviews with your team to identify trends
                            </li>
                            <li>
                              <strong>Balanced workload:</strong> Use distribution metrics to ensure equitable meeting loads
                            </li>
                            <li>
                              <strong>Optimization:</strong> Identify underperforming booking links and experiment with improvements
                            </li>
                            <li>
                              <strong>Capacity planning:</strong> Use historical data to forecast future scheduling needs
                            </li>
                          </ul>
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
                        
                        <h2 className="text-2xl font-bold text-center">Team Scheduling Best Practices</h2>
                        <p>
                          Apply these strategies to optimize your team's scheduling process and maximize productivity.
                        </p>
                        
                        <h3 className="text-lg font-medium mt-6">Establishing Team Scheduling Policies</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Meeting-Free Time Blocks:</strong> Designate specific days or time periods as meeting-free for the entire team to ensure everyone has focused work time
                          </li>
                          <li>
                            <strong>Response Time Standards:</strong> Set expectations for how quickly team members should respond to meeting requests
                          </li>
                          <li>
                            <strong>Calendar Hygiene:</strong> Establish rules for keeping calendars up-to-date and accurately reflecting availability
                          </li>
                          <li>
                            <strong>Meeting Duration Standards:</strong> Default meeting lengths for different meeting types to avoid unnecessarily long meetings
                          </li>
                        </ul>
                        
                        <h3 className="text-lg font-medium mt-6">Optimizing Team Availability</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Core Hours:</strong> Define core working hours when all team members should be available for internal meetings
                          </li>
                          <li>
                            <strong>Timezone Management:</strong> For distributed teams, create scheduling windows that accommodate different time zones fairly
                          </li>
                          <li>
                            <strong>Capacity Thresholds:</strong> Set maximum meeting hours per day for team members to prevent meeting overload
                          </li>
                          <li>
                            <strong>Buffer Time:</strong> Build in team-wide buffer times between meetings to allow for breaks and preparation
                          </li>
                        </ul>
                        
                        <h3 className="text-lg font-medium mt-6">Round Robin Refinement</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Skill Tagging:</strong> Tag team members with their expertise areas for more intelligent assignment
                          </li>
                          <li>
                            <strong>Weighted Distribution:</strong> Assign different capacity weights to team members based on their roles and bandwidth
                          </li>
                          <li>
                            <strong>Hybrid Approaches:</strong> Combine different assignment methods for different meeting types or customer segments
                          </li>
                          <li>
                            <strong>Regular Rotation:</strong> Periodically adjust your round robin pools to accommodate changing team dynamics
                          </li>
                        </ul>
                        
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-6">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Final Tips</h4>
                          <ul className="list-disc pl-6 space-y-1 text-blue-800 dark:text-blue-400 text-sm">
                            <li>
                              <strong>Training:</strong> Ensure all team members understand how to use the scheduling tools effectively
                            </li>
                            <li>
                              <strong>Regular reviews:</strong> Schedule quarterly reviews of your team scheduling practices to identify improvements
                            </li>
                            <li>
                              <strong>Feedback loops:</strong> Collect input from both team members and customers about the scheduling experience
                            </li>
                            <li>
                              <strong>Continuous improvement:</strong> Use analytics to regularly refine and optimize your team scheduling approach
                            </li>
                          </ul>
                        </div>
                        
                        <div className="mt-6 p-6 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <h3 className="text-lg font-medium mb-4 text-center">Ready to Implement?</h3>
                          <p className="text-center mb-4">
                            Now that you've learned advanced team scheduling strategies, it's time to apply them to your team!
                          </p>
                          <div className="flex justify-center gap-4">
                            <Link href="/team">
                              <Button className="flex items-center">
                                <Users className="mr-2 h-4 w-4" />
                                Go to Team Dashboard
                              </Button>
                            </Link>
                            <Link href="/booking">
                              <Button variant="outline" className="flex items-center">
                                <Share2 className="mr-2 h-4 w-4" />
                                Create Team Booking Link
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