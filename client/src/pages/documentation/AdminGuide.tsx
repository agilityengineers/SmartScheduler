import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Building, Users, Shield, Settings } from "lucide-react";
import { Link } from "wouter";

export default function AdminGuide() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/help">
          <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Help & Support</span>
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Admin Guide</h1>
        <p className="text-muted-foreground">
          Comprehensive guide for company administrators and team managers.
        </p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organization">Organization Management</TabsTrigger>
          <TabsTrigger value="teams">Team Management</TabsTrigger>
          <TabsTrigger value="settings">Admin Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Organization Setup</CardTitle>
                  <CardDescription>Managing your organizational structure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Creating Your Organization</h3>
              <p className="mb-4">
                As a company administrator, you're responsible for setting up and managing your organization.
              </p>
              
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>
                  <strong>Complete your organization profile</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your company name, logo, description, and timezone. This information will be 
                    displayed across the platform and in shared calendars.
                  </p>
                </li>
                <li>
                  <strong>Define organization settings</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure organization-wide settings such as working hours, holidays, and default 
                    meeting policies.
                  </p>
                </li>
                <li>
                  <strong>Create teams</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organize your members into teams based on departments, projects, or any other 
                    logical grouping. Each team can have its own settings and designated team managers.
                  </p>
                </li>
                <li>
                  <strong>Invite members</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add team members by email invitation. You can assign them to specific teams 
                    and grant appropriate roles during the invitation process.
                  </p>
                </li>
              </ol>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  Take time to properly set up your organization hierarchy. A well-structured organization 
                  makes it easier for members to find relevant calendars and schedule meetings with the right people.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Management</CardTitle>
              <CardDescription>Managing organization members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Inviting Members</h3>
              <p className="mb-2">
                There are multiple ways to add members to your organization:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <strong>Individual invitations</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send personalized invitations to individual email addresses.
                  </p>
                </li>
                <li>
                  <strong>Bulk invitations</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import a CSV file with email addresses to invite multiple users at once.
                  </p>
                </li>
                <li>
                  <strong>Invitation link</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate a signup link that you can share with your team. Users who sign up through 
                    this link will automatically be added to your organization.
                  </p>
                </li>
              </ul>
              
              <h3 className="text-lg font-medium">Member Roles and Permissions</h3>
              <p className="mb-2">
                SmartScheduler offers different roles to control access and capabilities:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Company Administrator</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Has full control over the organization, including creating teams, 
                    managing members, and configuring organization-wide settings.
                  </p>
                </li>
                <li>
                  <strong>Team Manager</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Can manage their assigned teams, including team settings, team 
                    events, and team booking pages.
                  </p>
                </li>
                <li>
                  <strong>Member</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Regular users who can manage their own calendar and booking links, 
                    participate in team scheduling, and view shared calendars they have access to.
                  </p>
                </li>
                <li>
                  <strong>Guest</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Limited access users who can only view events they are invited to 
                    and interact with public booking links.
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>Creating and managing teams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Creating Teams</h3>
              <p className="mb-4">
                Teams help organize members and streamline scheduling within specific groups.
              </p>
              
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>
                  <strong>Navigate to Teams</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    From the organization dashboard, go to the Teams section in the sidebar.
                  </p>
                </li>
                <li>
                  <strong>Create a new team</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Create Team" and provide a name, description, and optional team image.
                  </p>
                </li>
                <li>
                  <strong>Configure team settings</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set team-specific working hours, scheduling policies, and default availability.
                  </p>
                </li>
                <li>
                  <strong>Assign team manager(s)</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Designate one or more members as team managers who can administer the team.
                  </p>
                </li>
                <li>
                  <strong>Add team members</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add existing organization members to the team, or invite new members directly to the team.
                  </p>
                </li>
              </ol>
              
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mb-4">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important Note</h4>
                <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                  Members can belong to multiple teams simultaneously. When adding a member to a team, 
                  their availability will be shared across all their teams' calendars.
                </p>
              </div>

              <h3 className="text-lg font-medium">Team Calendar Management</h3>
              <p className="mb-2">
                Each team has its own shared calendar for collective scheduling:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Team Calendar View</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    View all team members' schedules in a consolidated calendar to find common availability.
                  </p>
                </li>
                <li>
                  <strong>Team Events</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create events that automatically include all team members, such as team meetings or department events.
                  </p>
                </li>
                <li>
                  <strong>Team Availability</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define when the team as a whole is available for meetings, which can differ from individual member availability.
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Booking Features</CardTitle>
              <CardDescription>Scheduling options for teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Team Booking Links</h3>
              <p className="mb-4">
                Team booking links allow external parties to schedule with the appropriate team member based on availability and expertise.
              </p>
              
              <h4 className="font-medium mt-4 mb-2">Booking Assignment Methods</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <strong>Round-Robin</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically distribute bookings evenly among team members in rotation.
                  </p>
                </li>
                <li>
                  <strong>First Available</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign bookings to the team member who has the earliest availability.
                  </p>
                </li>
                <li>
                  <strong>Load Balanced</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribute bookings based on which team members currently have the fewest scheduled meetings.
                  </p>
                </li>
                <li>
                  <strong>Manual Selection</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allow bookers to select a specific team member based on profiles or expertise.
                  </p>
                </li>
              </ul>
              
              <h4 className="font-medium mt-4 mb-2">Setting Up Team Booking Pages</h4>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Navigate to the team dashboard</li>
                <li>Select "Booking Links" from the sidebar</li>
                <li>Click "Create Team Booking Link"</li>
                <li>Define the meeting purpose, duration, and booking rules</li>
                <li>Select which team members should be included</li>
                <li>Choose the assignment method (Round-Robin, First Available, etc.)</li>
                <li>Configure any custom form fields or questionnaires</li>
                <li>Customize the booking page appearance if desired</li>
                <li>Save and share the team booking link</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Administrative Settings</CardTitle>
                  <CardDescription>Organization-wide configurations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Global Calendar Settings</h3>
              <p className="mb-4">
                Configure defaults that apply across your organization:
              </p>
              
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <strong>Default Working Hours</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set standard business hours for your organization. Members can override these individually.
                  </p>
                </li>
                <li>
                  <strong>Default Meeting Duration</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set the default length for new meetings (e.g., 30 minutes or 1 hour).
                  </p>
                </li>
                <li>
                  <strong>Shared Holidays</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and manage a shared holiday calendar that applies to the entire organization.
                  </p>
                </li>
                <li>
                  <strong>Calendar Appearance</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize color schemes, branding elements, and display options for all calendars.
                  </p>
                </li>
              </ul>
              
              <h3 className="text-lg font-medium">Integration Settings</h3>
              <p className="mb-4">
                Manage third-party calendar and tool integrations:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Calendar Services</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure default settings for Google Calendar, Microsoft Outlook, and iCal integrations.
                  </p>
                </li>
                <li>
                  <strong>Video Conferencing</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set up integrations with Zoom, Microsoft Teams, Google Meet, and other video platforms.
                  </p>
                </li>
                <li>
                  <strong>CRM Integrations</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect SmartScheduler to your CRM system to sync contacts and meeting information.
                  </p>
                </li>
                <li>
                  <strong>API Access</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage API keys and webhook configurations for custom integrations.
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Security and Compliance</CardTitle>
                  <CardDescription>Managing access and data protection</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Security Settings</h3>
              <p className="mb-4">
                Protect your organization's scheduling data:
              </p>
              
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <strong>Password Policies</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set requirements for password strength, rotation, and recovery across your organization.
                  </p>
                </li>
                <li>
                  <strong>Two-Factor Authentication</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enforce 2FA for all users or specific roles within your organization.
                  </p>
                </li>
                <li>
                  <strong>Session Management</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure session timeout settings and active session monitoring.
                  </p>
                </li>
                <li>
                  <strong>IP Restrictions</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Limit access to specific IP addresses or ranges for enhanced security.
                  </p>
                </li>
              </ul>
              
              <h3 className="text-lg font-medium">Data Privacy Controls</h3>
              <p className="mb-4">
                Manage how data is shared and protected:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Event Visibility</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set default privacy levels for calendar events (private, within team, organization-wide).
                  </p>
                </li>
                <li>
                  <strong>Information Sharing</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure what personal information is shared in booking forms and event details.
                  </p>
                </li>
                <li>
                  <strong>Data Retention</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set policies for how long meeting data, booking information, and logs are retained.
                  </p>
                </li>
                <li>
                  <strong>Audit Logs</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Access detailed logs of all administrative actions for compliance and security monitoring.
                  </p>
                </li>
              </ul>
              
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900 mt-4">
                <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Best Practice</h4>
                <p className="text-green-800 dark:text-green-400 text-sm">
                  Regularly review audit logs and security settings, especially after organization 
                  changes or when new integrations are added. This helps maintain a secure scheduling environment.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Advanced Administration</CardTitle>
              <CardDescription>Data management and system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Data Management</h3>
              <p className="mb-4">
                Tools for managing organization data:
              </p>
              
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <strong>Import/Export</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import users from CSV or export organization data for backup and analysis.
                  </p>
                </li>
                <li>
                  <strong>Bulk Operations</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Perform operations on multiple users, teams, or events simultaneously.
                  </p>
                </li>
                <li>
                  <strong>Calendar Cleanup</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tools to identify and resolve scheduling conflicts, duplicates, or orphaned events.
                  </p>
                </li>
              </ul>
              
              <h3 className="text-lg font-medium">Analytics and Reporting</h3>
              <p className="mb-4">
                Gain insights into scheduling patterns and system usage:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Usage Reports</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    View detailed reports on active users, meetings scheduled, and feature adoption.
                  </p>
                </li>
                <li>
                  <strong>Booking Analytics</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track performance of booking links, including conversion rates and popular time slots.
                  </p>
                </li>
                <li>
                  <strong>Team Productivity</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Analyze meeting patterns, scheduling efficiency, and time utilization.
                  </p>
                </li>
                <li>
                  <strong>Custom Reports</strong>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and save custom reports for specific metrics relevant to your organization.
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}