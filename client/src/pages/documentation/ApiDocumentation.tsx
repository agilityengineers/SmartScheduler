import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Code, FileJson, Lock, Server } from "lucide-react";
import { Link } from "wouter";
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { useUser } from '@/context/UserContext';

export default function ApiDocumentation() {
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
                Please log in to access the API documentation.
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
          <div className="container max-w-5xl mx-auto py-8 px-4">
            <div className="mb-6">
              <Link href="/help">
                <Button variant="ghost" className="mb-4 pl-0 flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Help & Support</span>
                </Button>
              </Link>
              <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
              <p className="text-muted-foreground">
                Integrate My Smart Scheduler with your applications and services using our REST API.
              </p>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="authentication">Authentication</TabsTrigger>
                <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <Server className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>API Overview</CardTitle>
                        <CardDescription>Key concepts and architecture</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium">Introduction</h3>
                    <p>
                      The My Smart Scheduler API allows you to programmatically interact with calendars, events, 
                      and bookings. You can create applications that integrate with our platform to build 
                      automation, integrations, or custom interfaces.
                    </p>

                    <h3 className="text-lg font-medium">Base URL</h3>
                    <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm mb-4">
                      https://api.smart-scheduler.ai/v1
                    </div>

                    <h3 className="text-lg font-medium">Rate Limits</h3>
                    <p className="mb-2">
                      Our API implements rate limiting to ensure service stability:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                      <li><strong>Free tier:</strong> 100 requests per hour</li>
                      <li><strong>Pro tier:</strong> 1,000 requests per hour</li>
                      <li><strong>Enterprise tier:</strong> 10,000 requests per hour</li>
                    </ul>
                    <p>
                      The rate limit is applied per API key. You can check your current rate limit status 
                      by examining the following headers in API responses:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 mb-4">
                      <li><code>X-RateLimit-Limit</code>: Maximum number of requests allowed per hour</li>
                      <li><code>X-RateLimit-Remaining</code>: Number of requests remaining in the current period</li>
                      <li><code>X-RateLimit-Reset</code>: Time at which the rate limit resets (UTC epoch seconds)</li>
                    </ul>

                    <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 mb-4">
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Important Note</h4>
                      <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                        When you exceed your rate limit, the API will return a <code>429 Too Many Requests</code> status code.
                        Implement proper error handling and exponential backoff in your applications.
                      </p>
                    </div>

                    <h3 className="text-lg font-medium">Response Format</h3>
                    <p className="mb-2">
                      All API responses are returned in JSON format. A typical successful response will have the following structure:
                    </p>
                    <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto">
{`{
  "success": true,
  "data": {
    // Resource data
  },
  "meta": {
    // Pagination, filtering, or other metadata
  }
}`}
                    </pre>

                    <p className="mb-2 mt-4">
                      Error responses will follow this structure:
                    </p>
                    <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto">
{`{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  }
}`}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Versioning</CardTitle>
                    <CardDescription>Understanding versioning and backward compatibility</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      Our API uses versioning to ensure backward compatibility as we continue to improve the platform.
                      The version is included in the URL path, for example: <code>/v1/events</code>
                    </p>

                    <h3 className="text-lg font-medium mb-2">Version Policy</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>
                        <strong>Major versions (v1, v2):</strong> May include breaking changes and require code updates
                      </li>
                      <li>
                        <strong>Minor updates:</strong> Backward-compatible feature additions and improvements (not reflected in the URL)
                      </li>
                      <li>
                        <strong>Deprecation:</strong> API versions are supported for at least 12 months after a new major version is released
                      </li>
                    </ul>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Best Practice</h4>
                      <p className="text-blue-800 dark:text-blue-400 text-sm">
                        Always specify the full version in your API calls. Avoid using unversioned endpoints as they may change without notice.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="authentication" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <Lock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Authentication</CardTitle>
                        <CardDescription>Securing your API requests</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>
                      All API requests must be authenticated. We support API key authentication which 
                      you can manage from your account dashboard.
                    </p>

                    <h3 className="text-lg font-medium">API Keys</h3>
                    <p className="mb-2">
                      API keys should be passed in the <code>Authorization</code> header using the Bearer scheme:
                    </p>
                    <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm mb-4">
                      Authorization: Bearer YOUR_API_KEY
                    </pre>

                    <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-900 mb-4">
                      <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">Security Warning</h4>
                      <p className="text-red-800 dark:text-red-400 text-sm">
                        Never expose your API key in client-side code or public repositories. API keys provide full access to your account.
                      </p>
                    </div>

                    <h3 className="text-lg font-medium">Creating and Managing API Keys</h3>
                    <ol className="list-decimal pl-6 space-y-2 mb-4">
                      <li>Go to your account settings</li>
                      <li>Navigate to the "API & Integrations" tab</li>
                      <li>Click "Create New API Key"</li>
                      <li>Give your key a descriptive name and select permissions</li>
                      <li>Store the key securely - it will only be shown once</li>
                    </ol>

                    <h3 className="text-lg font-medium">Scopes and Permissions</h3>
                    <p className="mb-2">
                      When creating an API key, you can specify the scopes that determine what actions it can perform:
                    </p>
                    <table className="w-full mb-4">
                      <thead className="bg-slate-100 dark:bg-slate-900">
                        <tr>
                          <th className="py-2 px-3 text-left">Scope</th>
                          <th className="py-2 px-3 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        <tr>
                          <td className="py-2 px-3 font-mono text-sm">events:read</td>
                          <td className="py-2 px-3">View events and bookings</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono text-sm">events:write</td>
                          <td className="py-2 px-3">Create, update, and delete events</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono text-sm">bookings:read</td>
                          <td className="py-2 px-3">View booking links and booking slots</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono text-sm">bookings:write</td>
                          <td className="py-2 px-3">Create and update booking links</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono text-sm">users:read</td>
                          <td className="py-2 px-3">Read user profile information</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-mono text-sm">admin</td>
                          <td className="py-2 px-3">Full administrative access (teams, organization management)</td>
                        </tr>
                      </tbody>
                    </table>

                    <h3 className="text-lg font-medium">Authentication Errors</h3>
                    <p className="mb-2">Common authentication error responses:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li><code>401 Unauthorized</code>: Missing or invalid API key</li>
                      <li><code>403 Forbidden</code>: API key lacks the required scope for the requested action</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endpoints" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <FileJson className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>API Endpoints</CardTitle>
                        <CardDescription>Available resources and actions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="events">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span>Events</span>
                            <Badge variant="outline">7 endpoints</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/events</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                List events for the authenticated user
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:read</Badge>
                                <Badge variant="outline" className="text-xs">Filterable</Badge>
                                <Badge variant="outline" className="text-xs">Paginated</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/events/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get a single event by ID
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:read</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">POST</Badge>
                                <code className="font-mono text-sm">/v1/events</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Create a new event
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:write</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">PATCH</Badge>
                                <code className="font-mono text-sm">/v1/events/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Update an existing event
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:write</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">DELETE</Badge>
                                <code className="font-mono text-sm">/v1/events/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Delete an event
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:write</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/events/upcoming</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get upcoming events for the next 7 days
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:read</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">POST</Badge>
                                <code className="font-mono text-sm">/v1/events/:id/invite</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Send invitations for an existing event
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:write</Badge>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="bookings">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span>Booking Links</span>
                            <Badge variant="outline">5 endpoints</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/booking-links</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                List all booking links for the authenticated user
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:read</Badge>
                                <Badge variant="outline" className="text-xs">Filterable</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/booking-links/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get a single booking link by ID
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:read</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">POST</Badge>
                                <code className="font-mono text-sm">/v1/booking-links</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Create a new booking link
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:write</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">PATCH</Badge>
                                <code className="font-mono text-sm">/v1/booking-links/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Update an existing booking link
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:write</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">DELETE</Badge>
                                <code className="font-mono text-sm">/v1/booking-links/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Delete a booking link
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:write</Badge>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="availability">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span>Availability</span>
                            <Badge variant="outline">3 endpoints</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/availability</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get user's availability for a date range
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:read</Badge>
                                <Badge variant="outline" className="text-xs">Requires date parameters</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/availability/team/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get team availability for a date range
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">bookings:read</Badge>
                                <Badge variant="outline" className="text-xs">Requires date parameters</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">POST</Badge>
                                <code className="font-mono text-sm">/v1/availability/block</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Block out unavailable time slots
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">events:write</Badge>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="users">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span>Users</span>
                            <Badge variant="outline">4 endpoints</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/users/me</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get the authenticated user's profile
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">users:read</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/users/:id</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Get a user's profile by ID
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">users:read</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">GET</Badge>
                                <code className="font-mono text-sm">/v1/users/team/:teamId</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                List all users in a team
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">users:read</Badge>
                                <Badge variant="secondary" className="text-xs">admin</Badge>
                              </div>
                            </div>

                            <div className="border-l-4 border-primary pl-4">
                              <div className="flex items-center">
                                <Badge className="mr-2">PATCH</Badge>
                                <code className="font-mono text-sm">/v1/users/me</code>
                              </div>
                              <p className="text-sm mt-1 text-muted-foreground">
                                Update the authenticated user's profile
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">users:write</Badge>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="examples" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="mr-4 bg-primary/10 p-2 rounded-full">
                        <Code className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Code Examples</CardTitle>
                        <CardDescription>Sample API implementations</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="javascript">
                      <TabsList className="mb-4">
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                      </TabsList>

                      <TabsContent value="javascript">
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-2">Fetching Events</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`// Using fetch API
const apiKey = 'your_api_key';
const baseUrl = 'https://api.smart-scheduler.ai/v1';

async function getEvents(startDate, endDate) {
  const url = new URL(\`\${baseUrl}/events\`);
  
  // Add query parameters
  if (startDate) url.searchParams.append('start_date', startDate);
  if (endDate) url.searchParams.append('end_date', endDate);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message || 'Failed to fetch events');
  }
  
  return response.json();
}

// Example usage
getEvents('2025-04-01', '2025-04-30')
  .then(data => console.log(data))
  .catch(error => console.error(error));`}
                            </pre>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-2">Creating a Booking Link</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`// Using async/await with fetch
async function createBookingLink(bookingData) {
  const response = await fetch(\`\${baseUrl}/booking-links\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message || 'Failed to create booking link');
  }
  
  return response.json();
}

// Example booking data
const bookingLinkData = {
  title: "30-Minute Consultation",
  description: "Book a consultation session with me",
  duration: 30, // Minutes
  availableDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  availableHours: {
    start: "09:00",
    end: "17:00"
  },
  timeZone: "America/New_York",
  bufferBefore: 5, // Minutes
  bufferAfter: 5, // Minutes
  maxBookingsPerDay: 8
};

createBookingLink(bookingLinkData)
  .then(data => console.log(data))
  .catch(error => console.error(error));`}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="python">
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-2">Fetching Events (Python)</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`import requests

API_KEY = 'your_api_key'
BASE_URL = 'https://api.smart-scheduler.ai/v1'

def get_events(start_date=None, end_date=None):
    """Fetch events from the API."""
    url = f"{BASE_URL}/events"
    
    # Prepare query parameters
    params = {}
    if start_date:
        params['start_date'] = start_date
    if end_date:
        params['end_date'] = end_date
    
    # Prepare headers
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Make the request
    response = requests.get(url, headers=headers, params=params)
    
    # Check for errors
    response.raise_for_status()
    
    # Return the data
    return response.json()

# Example usage
try:
    events = get_events(start_date='2025-04-01', end_date='2025-04-30')
    print(f"Found {len(events['data'])} events")
    
    # Process each event
    for event in events['data']:
        print(f"Event: {event['title']} - {event['startTime']}")
except requests.exceptions.RequestException as e:
    print(f"Error fetching events: {e}")
`}
                            </pre>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-2">Creating a Booking Link (Python)</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`import requests
import json

def create_booking_link(booking_data):
    """Create a new booking link."""
    url = f"{BASE_URL}/booking-links"
    
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, headers=headers, json=booking_data)
    response.raise_for_status()
    
    return response.json()

# Example booking data
booking_link_data = {
    "title": "30-Minute Consultation",
    "description": "Book a consultation session with me",
    "duration": 30,  # Minutes
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "availableHours": {
        "start": "09:00",
        "end": "17:00"
    },
    "timeZone": "America/New_York",
    "bufferBefore": 5,  # Minutes
    "bufferAfter": 5,  # Minutes
    "maxBookingsPerDay": 8
}

try:
    result = create_booking_link(booking_link_data)
    print(f"Booking link created with ID: {result['data']['id']}")
    print(f"Shareable URL: {result['data']['url']}")
except requests.exceptions.RequestException as e:
    print(f"Error creating booking link: {e}")
    if hasattr(e, 'response') and e.response:
        print(f"Response: {e.response.text}")
`}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="curl">
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-2">Fetching Events (cURL)</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`# Fetch events for a date range
curl -X GET "https://api.smart-scheduler.ai/v1/events?start_date=2025-04-01&end_date=2025-04-30" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                            </pre>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-2">Creating a Booking Link (cURL)</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`# Create a new booking link
curl -X POST "https://api.smart-scheduler.ai/v1/booking-links" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "30-Minute Consultation",
    "description": "Book a consultation session with me",
    "duration": 30,
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "availableHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "timeZone": "America/New_York",
    "bufferBefore": 5,
    "bufferAfter": 5,
    "maxBookingsPerDay": 8
  }'`}
                            </pre>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-2">Getting User Profile (cURL)</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`# Get authenticated user profile
curl -X GET "https://api.smart-scheduler.ai/v1/users/me" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                            </pre>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-2">Checking API Limits (cURL)</h3>
                            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre">
{`# Make a request and examine rate limit headers
curl -i -X GET "https://api.smart-scheduler.ai/v1/events" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">SDKs and Libraries</h3>
                      <p className="mb-4">
                        We offer officially supported client libraries to make integration even easier:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          <strong>JavaScript/TypeScript:</strong>{" "}
                          <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">npm install @mysmartscheduler/client</code>
                        </li>
                        <li>
                          <strong>Python:</strong>{" "}
                          <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">pip install mysmartscheduler-client</code>
                        </li>
                        <li>
                          <strong>PHP:</strong>{" "}
                          <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">composer require mysmartscheduler/client</code>
                        </li>
                      </ul>
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