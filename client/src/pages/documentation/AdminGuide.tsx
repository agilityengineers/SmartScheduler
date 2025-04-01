import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Users, Building, Settings, Shield } from "lucide-react";
import { Link } from "wouter";
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { useUser } from '@/context/UserContext';

export default function AdminGuide() {
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
                Please log in to access the administrator guide.
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
              <h1 className="text-3xl font-bold mb-2">Administrator Guide</h1>
              <p className="text-muted-foreground">
                Comprehensive guide for system administrators and organization managers.
              </p>
            </div>

            <Tabs defaultValue="org-admin">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="org-admin">Organization Admin</TabsTrigger>
                <TabsTrigger value="team-admin">Team Management</TabsTrigger>
                <TabsTrigger value="security">Security & Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="org-admin" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Organization Administration</CardTitle>
                        <CardDescription>Managing your organization</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Organization Setup</h3>
                    <p>
                      As an organization administrator, you're responsible for setting up and managing 
                      your organization within My Smart Scheduler.
                    </p>
                    
                    <h3 className="text-lg font-medium">Organization Profile</h3>
                    <p className="mb-2">Configure your organization's profile:</p>
                    <ol className="list-decimal pl-6 space-y-2 mb-4">
                      <li>Navigate to "Organization" in the sidebar</li>
                      <li>Click on "Settings"</li>
                      <li>Complete your organization profile:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Organization name</li>
                          <li>Logo and branding</li>
                          <li>Business hours</li>
                          <li>Contact information</li>
                          <li>Default timezone</li>
                        </ul>
                      </li>
                      <li>Save your changes</li>
                    </ol>

                    <h3 className="text-lg font-medium">User Management</h3>
                    <p className="mb-2">Manage users within your organization:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>Invite new members to your organization</li>
                      <li>Assign roles and permissions</li>
                      <li>Create and manage user groups</li>
                      <li>Set user-specific settings</li>
                      <li>Deactivate or remove users</li>
                    </ul>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h4>
                      <p className="text-blue-800 dark:text-blue-400 text-sm">
                        Use CSV import to bulk add users to your organization. Access this feature under 
                        "Organization" {'>'} "Users" {'>'} "Import Users".
                      </p>
                    </div>

                    <h3 className="text-lg font-medium">Team Structure</h3>
                    <p className="mb-2">
                      Create and manage teams within your organization:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2">
                      <li>Go to "Organization" {'>'} "Teams"</li>
                      <li>Click "Create New Team"</li>
                      <li>Set up team details:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Team name and description</li>
                          <li>Assign team manager(s)</li>
                          <li>Add team members</li>
                          <li>Set team permissions</li>
                        </ul>
                      </li>
                      <li>Save the team configuration</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>Configuring preferences and policies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Calendar Settings</h3>
                    <p className="mb-2">
                      Configure organization-wide calendar settings:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>Default meeting duration</li>
                      <li>Working hours and days</li>
                      <li>Holiday calendar</li>
                      <li>Resource scheduling policies</li>
                      <li>Booking restrictions</li>
                    </ul>

                    <h3 className="text-lg font-medium">Integration Management</h3>
                    <p className="mb-2">
                      Set up and manage organization-wide integrations:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>Email service integration</li>
                      <li>Single Sign-On (SSO) configuration</li>
                      <li>Directory service integration (e.g., Active Directory, LDAP)</li>
                      <li>CRM and project management tool connections</li>
                      <li>Custom API integrations</li>
                    </ul>

                    <h3 className="text-lg font-medium">Billing and Subscription</h3>
                    <p className="mb-2">
                      Manage your organization's subscription:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>View current subscription plan</li>
                      <li>Update payment information</li>
                      <li>View billing history and invoices</li>
                      <li>Upgrade or downgrade subscription plan</li>
                      <li>Manage user licenses</li>
                    </ul>

                    <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mt-4">
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important Note</h4>
                      <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                        Changes to your subscription plan will take effect at the start of the next billing cycle. 
                        Contact support@mysmartscheduler.co for immediate changes or special arrangements.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team-admin" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Team Management</CardTitle>
                        <CardDescription>Managing teams and members</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Team Manager Responsibilities</h3>
                    <p>
                      As a team manager, you're responsible for coordinating your team's scheduling, 
                      availability, and calendar management within My Smart Scheduler.
                    </p>
                    
                    <h3 className="text-lg font-medium">Team Dashboard</h3>
                    <p className="mb-2">The Team Dashboard provides an overview of your team's activities:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>Team member availability</li>
                      <li>Upcoming team events</li>
                      <li>Booking statistics</li>
                      <li>Team scheduling conflicts</li>
                      <li>Resource allocation</li>
                    </ul>

                    <h3 className="text-lg font-medium">Member Management</h3>
                    <p className="mb-2">Manage your team members:</p>
                    <ol className="list-decimal pl-6 space-y-2 mb-4">
                      <li>Go to "Team" {'>'} "Members" in the sidebar</li>
                      <li>Add new members by clicking "Add Member"</li>
                      <li>Assign roles and permissions</li>
                      <li>Set individual availability preferences</li>
                      <li>Manage booking permissions</li>
                    </ol>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Best Practice</h4>
                      <p className="text-blue-800 dark:text-blue-400 text-sm">
                        Regularly review your team's composition and roles to ensure that permissions 
                        are appropriate and up-to-date as responsibilities change.
                      </p>
                    </div>

                    <h3 className="text-lg font-medium">Team Scheduling</h3>
                    <p className="mb-2">
                      Coordinate team scheduling and availability:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Create team events and meetings</li>
                      <li>Set up recurring team sync meetings</li>
                      <li>Manage team availability hours</li>
                      <li>Handle scheduling conflicts</li>
                      <li>Create team booking links for external appointments</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Team Booking Links</CardTitle>
                    <CardDescription>Setting up shared scheduling options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Creating Team Booking Links</h3>
                    <p className="mb-2">
                      Team booking links allow external parties to schedule meetings with your team:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2 mb-4">
                      <li>Navigate to "Team" {'>'} "Booking Links"</li>
                      <li>Click "Create Team Booking Link"</li>
                      <li>Configure the booking link:
                        <ul className="list-disc pl-6 mt-1">
                          <li>Title and description</li>
                          <li>Duration options</li>
                          <li>Select team members to include</li>
                          <li>Set availability windows</li>
                          <li>Configure assignment method (round-robin, first available, etc.)</li>
                        </ul>
                      </li>
                      <li>Save and share the booking link</li>
                    </ol>

                    <h3 className="text-lg font-medium">Assignment Methods</h3>
                    <p className="mb-2">
                      Choose how bookings are assigned to team members:
                    </p>
                    <table className="w-full mb-4">
                      <thead className="bg-slate-100 dark:bg-slate-900">
                        <tr>
                          <th className="py-2 px-3 text-left">Method</th>
                          <th className="py-2 px-3 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        <tr>
                          <td className="py-2 px-3">Round Robin</td>
                          <td className="py-2 px-3">Distributes bookings evenly among team members</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">First Available</td>
                          <td className="py-2 px-3">Assigns to the first team member with availability</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Load Balanced</td>
                          <td className="py-2 px-3">Distributes based on current booking load</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Manual Selection</td>
                          <td className="py-2 px-3">Allows booker to choose a specific team member</td>
                        </tr>
                      </tbody>
                    </table>

                    <h3 className="text-lg font-medium">Monitoring Team Bookings</h3>
                    <p className="mb-2">
                      Stay informed about team booking activities:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>View all upcoming team bookings in the dashboard</li>
                      <li>Monitor distribution of bookings among team members</li>
                      <li>Set up notifications for new bookings</li>
                      <li>Review booking performance metrics</li>
                      <li>Identify scheduling bottlenecks</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Security & Compliance</CardTitle>
                        <CardDescription>Maintaining security and regulatory compliance</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Security Features</h3>
                    <p>
                      My Smart Scheduler offers robust security features to protect your organization's data:
                    </p>
                    
                    <h3 className="text-lg font-medium">Authentication Options</h3>
                    <p className="mb-2">Configure authentication methods for your organization:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>Standard email/password authentication</li>
                      <li>Single Sign-On (SSO) integration</li>
                      <li>Multi-factor authentication (MFA)</li>
                      <li>Social login options</li>
                      <li>SAML and OpenID Connect support</li>
                    </ul>

                    <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-900 mb-4">
                      <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">Security Recommendation</h4>
                      <p className="text-red-800 dark:text-red-400 text-sm">
                        We strongly recommend enabling multi-factor authentication (MFA) for all users, 
                        especially those with administrative privileges.
                      </p>
                    </div>

                    <h3 className="text-lg font-medium">Password Policies</h3>
                    <p className="mb-2">
                      Configure password requirements for your organization:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>Minimum password length</li>
                      <li>Complexity requirements</li>
                      <li>Password expiration periods</li>
                      <li>Password history restrictions</li>
                      <li>Account lockout settings</li>
                    </ul>

                    <h3 className="text-lg font-medium">Data Privacy Settings</h3>
                    <p className="mb-2">
                      Configure data privacy settings:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Event visibility controls</li>
                      <li>Personal information sharing preferences</li>
                      <li>Data retention policies</li>
                      <li>Anonymization options</li>
                      <li>Consent management</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Management</CardTitle>
                    <CardDescription>Meeting regulatory requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Regulatory Compliance</h3>
                    <p className="mb-2">
                      My Smart Scheduler helps organizations maintain compliance with various regulations:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li><strong>GDPR:</strong> Data processing agreements, data subject rights, privacy controls</li>
                      <li><strong>HIPAA:</strong> PHI handling, audit logs, access controls (requires Enterprise plan)</li>
                      <li><strong>SOC 2:</strong> Security, availability, processing integrity, confidentiality</li>
                      <li><strong>CCPA:</strong> Privacy notices, opt-out capabilities, data access requests</li>
                    </ul>

                    <h3 className="text-lg font-medium">Audit Logs</h3>
                    <p className="mb-2">
                      Comprehensive audit logging for compliance purposes:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li>User access logs</li>
                      <li>Data modification history</li>
                      <li>Administrator actions</li>
                      <li>Security-related events</li>
                      <li>Export and reporting capabilities</li>
                    </ul>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Compliance Tip</h4>
                      <p className="text-blue-800 dark:text-blue-400 text-sm">
                        Regularly export and archive audit logs for long-term retention to meet regulatory 
                        requirements that may exceed the standard retention period.
                      </p>
                    </div>

                    <h3 className="text-lg font-medium">Data Protection Impact Assessment</h3>
                    <p className="mb-2">
                      Organizations can use My Smart Scheduler's DPIA tools to assess data protection risks:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2">
                      <li>Navigate to "Organization" {'>'} "Security & Compliance" {'>'} "DPIA"</li>
                      <li>Complete the assessment questionnaire</li>
                      <li>Review identified risks and recommended mitigations</li>
                      <li>Implement recommended security controls</li>
                      <li>Download DPIA documentation for your records</li>
                    </ol>
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