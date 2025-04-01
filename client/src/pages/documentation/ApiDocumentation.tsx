import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Code, FileJson, Lock, Server } from "lucide-react";
import { Link } from "wouter";

export default function ApiDocumentation() {
  return (
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
          Integrate SmartScheduler with your applications and services using our REST API.
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
                  <Code className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>API Overview</CardTitle>
                  <CardDescription>Introduction to the SmartScheduler API</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Base URL</h3>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm mb-4">
                https://api.smartscheduler.com/v1
              </div>
              
              <h3 className="text-lg font-medium">API Versioning</h3>
              <p className="mb-4">
                The current API version is <Badge variant="outline">v1</Badge>. All API requests should include the version in the URL path.
              </p>
              <p className="mb-4">
                When we make backwards-incompatible changes to the API, we release a new version. We recommend specifying the API version explicitly in your requests to ensure compatibility.
              </p>

              <h3 className="text-lg font-medium">Rate Limits</h3>
              <p className="mb-2">
                The API enforces rate limits to ensure fair usage:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Free tier:</strong> 60 requests per minute</li>
                <li><strong>Professional tier:</strong> 120 requests per minute</li>
                <li><strong>Enterprise tier:</strong> 300 requests per minute</li>
              </ul>
              <p>
                Rate limit information is included in the response headers:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>X-Rate-Limit-Limit</code>: The maximum number of requests allowed per minute</li>
                <li><code>X-Rate-Limit-Remaining</code>: The number of requests remaining in the current window</li>
                <li><code>X-Rate-Limit-Reset</code>: The time when the current rate limit window resets, in UTC epoch seconds</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request and Response Format</CardTitle>
              <CardDescription>Understanding API communication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Content Type</h3>
              <p className="mb-4">
                All requests must use <code>application/json</code> content type. Responses are always returned as JSON.
              </p>

              <h3 className="text-lg font-medium">Date Format</h3>
              <p className="mb-4">
                All dates and times are returned in ISO 8601 format (e.g., <code>2023-04-15T14:30:00Z</code>) and are in UTC unless otherwise specified.
              </p>

              <h3 className="text-lg font-medium">Error Handling</h3>
              <p className="mb-2">
                When an error occurs, the API returns an appropriate HTTP status code and a JSON response with error details:
              </p>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm">
                {`{
  "error": {
    "code": "invalid_parameter",
    "message": "The parameter 'start_time' is invalid. Expected ISO 8601 date format.",
    "status": 400,
    "details": {
      "parameter": "start_time",
      "value": "2023/04/15"
    }
  }
}`}
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
                  <CardTitle>API Authentication</CardTitle>
                  <CardDescription>Secure access to the API</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">API Keys</h3>
              <p className="mb-4">
                Authentication is performed using API keys. Each request to the API must include your API key in the request headers.
              </p>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm mb-4">
                {`Authorization: Bearer your_api_key_here`}
              </div>
              
              <h3 className="text-lg font-medium">Generating API Keys</h3>
              <p className="mb-2">
                To generate an API key:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Log in to your SmartScheduler account</li>
                <li>Go to Settings → Integrations → API Keys</li>
                <li>Click "Generate New API Key"</li>
                <li>Name your key and select the appropriate permission scopes</li>
                <li>Store your API key securely; it will only be shown once</li>
              </ol>
              
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Security Warning</h4>
                <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                  Never expose your API key in client-side code or public repositories. Always make API requests from your server-side code.
                </p>
              </div>
              
              <h3 className="text-lg font-medium">API Key Scopes</h3>
              <p className="mb-2">
                When creating an API key, you can restrict it to specific scopes for enhanced security:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>events:read</code> - View calendar events</li>
                <li><code>events:write</code> - Create and modify calendar events</li>
                <li><code>bookings:read</code> - View booking links and bookings</li>
                <li><code>bookings:write</code> - Create and modify booking links and bookings</li>
                <li><code>users:read</code> - View user information</li>
                <li><code>teams:read</code> - View team information</li>
                <li><code>teams:write</code> - Modify team settings</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OAuth 2.0 Authentication</CardTitle>
              <CardDescription>For applications acting on behalf of users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="mb-4">
                For applications that need to access data on behalf of users, we support OAuth 2.0 authentication.
              </p>
              
              <h3 className="text-lg font-medium">OAuth Flow</h3>
              <ol className="list-decimal pl-6 space-y-2 mb-4">
                <li>Register your application in the Developer Console</li>
                <li>Redirect users to our authorization URL with your client ID and requested scopes</li>
                <li>User grants permission to your application</li>
                <li>User is redirected back to your application with an authorization code</li>
                <li>Exchange the authorization code for an access token</li>
                <li>Use the access token to make API requests on behalf of the user</li>
              </ol>
              
              <h3 className="text-lg font-medium">Access Token Usage</h3>
              <p className="mb-2">
                Include the access token in the Authorization header:
              </p>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm">
                {`Authorization: Bearer access_token_here`}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900 mt-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Note</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  Access tokens expire after 2 hours. Use the refresh token to obtain a new access token when needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>API Endpoints</CardTitle>
                  <CardDescription>Available resources and operations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Badge className="mr-2">GET</Badge>
                      <span>/events</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>Retrieve events based on specified filters.</p>
                      
                      <h4 className="font-medium">Query Parameters</h4>
                      <ul className="list-disc pl-6 space-y-1 mb-4">
                        <li><code>start_date</code> - Start date for events (ISO 8601)</li>
                        <li><code>end_date</code> - End date for events (ISO 8601)</li>
                        <li><code>team_id</code> - Filter events by team</li>
                        <li><code>organization_id</code> - Filter events by organization</li>
                        <li><code>limit</code> - Maximum number of events to return (default: 50)</li>
                        <li><code>offset</code> - Number of events to skip (for pagination)</li>
                      </ul>
                      
                      <h4 className="font-medium">Example Response</h4>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm">
                        {`{
  "data": [
    {
      "id": "evt_123456",
      "title": "Weekly Team Meeting",
      "description": "Review sprint progress",
      "start_time": "2023-04-15T14:00:00Z",
      "end_time": "2023-04-15T15:00:00Z",
      "location": "Conference Room A",
      "created_at": "2023-04-10T09:30:00Z",
      "updated_at": "2023-04-14T11:20:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 125,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}`}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Badge className="mr-2">POST</Badge>
                      <span>/events</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>Create a new event.</p>
                      
                      <h4 className="font-medium">Request Body</h4>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm mb-4">
                        {`{
  "title": "Client Presentation",
  "description": "Presenting quarterly results",
  "start_time": "2023-04-20T10:00:00Z",
  "end_time": "2023-04-20T11:00:00Z",
  "location": "Virtual",
  "participants": ["user_123", "user_456"],
  "is_private": false
}`}
                      </div>
                      
                      <h4 className="font-medium">Required Parameters</h4>
                      <ul className="list-disc pl-6 space-y-1 mb-4">
                        <li><code>title</code> - Event title</li>
                        <li><code>start_time</code> - Event start time (ISO 8601)</li>
                        <li><code>end_time</code> - Event end time (ISO 8601)</li>
                      </ul>
                      
                      <h4 className="font-medium">Response</h4>
                      <p>Returns the created event object with a 201 status code.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Badge className="mr-2">GET</Badge>
                      <span>/events/:id</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>Retrieve a specific event by ID.</p>
                      
                      <h4 className="font-medium">Path Parameters</h4>
                      <ul className="list-disc pl-6 space-y-1 mb-4">
                        <li><code>id</code> - Event ID</li>
                      </ul>
                      
                      <h4 className="font-medium">Example Response</h4>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm">
                        {`{
  "id": "evt_123456",
  "title": "Weekly Team Meeting",
  "description": "Review sprint progress",
  "start_time": "2023-04-15T14:00:00Z",
  "end_time": "2023-04-15T15:00:00Z",
  "location": "Conference Room A",
  "created_by": "user_789",
  "participants": ["user_123", "user_456", "user_789"],
  "is_private": false,
  "created_at": "2023-04-10T09:30:00Z",
  "updated_at": "2023-04-14T11:20:00Z"
}`}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Badge className="mr-2">GET</Badge>
                      <span>/booking-links</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>Retrieve all booking links for the authenticated user.</p>
                      
                      <h4 className="font-medium">Query Parameters</h4>
                      <ul className="list-disc pl-6 space-y-1 mb-4">
                        <li><code>status</code> - Filter by status (active, inactive)</li>
                        <li><code>limit</code> - Maximum number of links to return (default: 50)</li>
                        <li><code>offset</code> - Number of links to skip (for pagination)</li>
                      </ul>
                      
                      <h4 className="font-medium">Example Response</h4>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm">
                        {`{
  "data": [
    {
      "id": "bl_123456",
      "title": "30-Minute Consultation",
      "slug": "consultation",
      "url": "https://smartscheduler.com/username/consultation",
      "description": "Book a 30-minute consultation",
      "duration": 30,
      "status": "active",
      "created_at": "2023-04-10T09:30:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 3,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}`}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Badge className="mr-2">POST</Badge>
                      <span>/booking-links</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>Create a new booking link.</p>
                      
                      <h4 className="font-medium">Request Body</h4>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-sm mb-4">
                        {`{
  "title": "30-Minute Consultation",
  "slug": "consultation", 
  "description": "Book a 30-minute consultation",
  "duration": 30,
  "availability": {
    "monday": ["09:00-12:00", "13:00-17:00"],
    "tuesday": ["09:00-12:00", "13:00-17:00"],
    "wednesday": ["09:00-12:00", "13:00-17:00"],
    "thursday": ["09:00-12:00", "13:00-17:00"],
    "friday": ["09:00-12:00", "13:00-17:00"]
  },
  "buffer_before": 5,
  "buffer_after": 10,
  "form_fields": [
    {
      "name": "name",
      "label": "Your Name",
      "type": "text",
      "required": true
    },
    {
      "name": "topic",
      "label": "What would you like to discuss?",
      "type": "textarea",
      "required": true
    }
  ]
}`}
                      </div>
                      
                      <h4 className="font-medium">Required Parameters</h4>
                      <ul className="list-disc pl-6 space-y-1 mb-4">
                        <li><code>title</code> - Booking link title</li>
                        <li><code>duration</code> - Meeting duration in minutes</li>
                        <li><code>availability</code> - Available time slots by day of week</li>
                      </ul>
                      
                      <h4 className="font-medium">Response</h4>
                      <p>Returns the created booking link object with a 201 status code.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <div className="mt-6 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Note</h4>
                <p className="text-blue-800 dark:text-blue-400 text-sm">
                  This is a partial list of available endpoints. For a complete reference, visit our 
                  <a href="#" className="text-blue-600 dark:text-blue-300 font-medium ml-1">full API documentation</a>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="mr-4 bg-primary/10 p-2 rounded-full">
                  <FileJson className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>API Examples</CardTitle>
                  <CardDescription>Code samples for common operations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="javascript">
                <TabsList className="mb-4">
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>
                
                <TabsContent value="javascript">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Fetch All Events</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`const fetchEvents = async () => {
  const baseUrl = 'https://api.smartscheduler.com/v1';
  const apiKey = 'your_api_key_here';
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  
  const params = new URLSearchParams({
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    limit: '10'
  });
  
  try {
    const response = await fetch(\`\${baseUrl}/events?\${params}\`, {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(\`API error: \${response.status}\`);
    }
    
    const data = await response.json();
    console.log('Events:', data);
    return data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

fetchEvents();`}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Create an Event</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`const createEvent = async () => {
  const baseUrl = 'https://api.smartscheduler.com/v1';
  const apiKey = 'your_api_key_here';
  
  const eventData = {
    title: 'Client Meeting',
    description: 'Discussing project requirements',
    start_time: '2023-04-20T14:00:00Z',
    end_time: '2023-04-20T15:00:00Z',
    location: 'Conference Room B',
    participants: ['participant1@example.com', 'participant2@example.com']
  };
  
  try {
    const response = await fetch(\`\${baseUrl}/events\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(\`API error: \${JSON.stringify(errorData)}\`);
    }
    
    const data = await response.json();
    console.log('Created event:', data);
    return data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

createEvent();`}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="python">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Fetch All Events</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`import requests
from datetime import datetime, timedelta

def fetch_events():
    base_url = 'https://api.smartscheduler.com/v1'
    api_key = 'your_api_key_here'
    
    # Get events for the next 7 days
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=7)
    
    params = {
        'start_date': start_date.isoformat() + 'Z',
        'end_date': end_date.isoformat() + 'Z',
        'limit': 10
    }
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f'{base_url}/events', params=params, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f'API error: {response.status_code} - {response.text}')
    
    data = response.json()
    print(f'Found {len(data["data"])} events')
    return data

events = fetch_events()`}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Create a Booking Link</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`import requests
import json

def create_booking_link():
    base_url = 'https://api.smartscheduler.com/v1'
    api_key = 'your_api_key_here'
    
    booking_data = {
        'title': '60-Minute Strategy Session',
        'slug': 'strategy-session',
        'description': 'Book a 60-minute strategy session',
        'duration': 60,
        'availability': {
            'monday': ['09:00-12:00', '13:00-17:00'],
            'tuesday': ['09:00-12:00', '13:00-17:00'],
            'wednesday': ['09:00-12:00', '13:00-17:00'],
            'thursday': ['09:00-12:00', '13:00-17:00'],
            'friday': ['09:00-12:00', '13:00-15:00']
        },
        'buffer_before': 5,
        'buffer_after': 10
    }
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'{base_url}/booking-links',
        headers=headers,
        data=json.dumps(booking_data)
    )
    
    if response.status_code != 201:
        raise Exception(f'API error: {response.status_code} - {response.text}')
    
    data = response.json()
    print(f'Created booking link: {data["url"]}')
    return data

booking_link = create_booking_link()`}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="curl">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Fetch All Events</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`curl -X GET \
  'https://api.smartscheduler.com/v1/events?start_date=2023-04-01T00:00:00Z&end_date=2023-04-30T23:59:59Z' \
  -H 'Authorization: Bearer your_api_key_here' \
  -H 'Content-Type: application/json'`}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Create an Event</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`curl -X POST \
  'https://api.smartscheduler.com/v1/events' \
  -H 'Authorization: Bearer your_api_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Team Standup",
    "description": "Daily team standup meeting",
    "start_time": "2023-04-20T09:00:00Z",
    "end_time": "2023-04-20T09:30:00Z",
    "location": "Zoom Meeting",
    "participants": ["user1@example.com", "user2@example.com"]
  }'`}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Get Available Time Slots</h3>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs sm:text-sm">
                        {`curl -X GET \
  'https://api.smartscheduler.com/v1/booking-links/bl_123456/available-slots?date=2023-04-20' \
  -H 'Authorization: Bearer your_api_key_here' \
  -H 'Content-Type: application/json'`}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">SDKs and Libraries</h3>
                <p className="mb-4">
                  We offer official client libraries to simplify API integration:
                </p>
                <ul className="grid gap-2 md:grid-cols-2">
                  <li className="flex items-center gap-2 p-3 border rounded-md">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Code className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <span className="font-medium">JavaScript/TypeScript SDK</span>
                      <a href="#" className="text-sm text-blue-600 dark:text-blue-300 block">View on GitHub</a>
                    </div>
                  </li>
                  <li className="flex items-center gap-2 p-3 border rounded-md">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Code className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <span className="font-medium">Python SDK</span>
                      <a href="#" className="text-sm text-blue-600 dark:text-blue-300 block">View on GitHub</a>
                    </div>
                  </li>
                  <li className="flex items-center gap-2 p-3 border rounded-md">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Code className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <span className="font-medium">Ruby SDK</span>
                      <a href="#" className="text-sm text-blue-600 dark:text-blue-300 block">View on GitHub</a>
                    </div>
                  </li>
                  <li className="flex items-center gap-2 p-3 border rounded-md">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                      <Code className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <span className="font-medium">PHP SDK</span>
                      <a href="#" className="text-sm text-blue-600 dark:text-blue-300 block">View on GitHub</a>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}