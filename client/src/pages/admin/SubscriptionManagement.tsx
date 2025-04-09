import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { DollarSign, UserPlus, Users, Building2, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useUser } from '@/context/UserContext';
import { SubscriptionPlan, SubscriptionStatus } from '@shared/schema';

// Admin page layout components
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';

type User = {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: string;
  hasFreeAccess?: boolean;
  stripeCustomerId?: string | null;
};

type Subscription = {
  id: number;
  userId: number | null;
  teamId: number | null;
  organizationId: number | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: string;
  status: string;
  priceId: string | null;
  quantity: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
};

// API fetch functions
const fetchUsers = async () => {
  console.log("Fetching users from /api/users");
  const response = await apiRequest('GET', '/api/users');
  console.log("Users API response status:", response.status);
  const data = await response.json();
  console.log("Users API response data:", data);
  return data;
};

const fetchSubscriptions = async () => {
  return await apiRequest('GET', '/api/admin/subscriptions').then(res => res.json());
};

const fetchTeams = async () => {
  return await apiRequest('GET', '/api/admin/teams').then(res => res.json());
};

const fetchOrganizations = async () => {
  return await apiRequest('GET', '/api/admin/organizations').then(res => res.json());
};

export default function SubscriptionManagement() {
  const { isAdmin } = useUser();
  const queryClient = useQueryClient();
  const [showGrantFreeAccess, setShowGrantFreeAccess] = useState(false);
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<'user' | 'team' | 'organization'>('user');
  const [selectedPlan, setSelectedPlan] = useState<string>(SubscriptionPlan.INDIVIDUAL);
  const [quantity, setQuantity] = useState<number>(1);

  // Fetch data
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: fetchUsers
  });

  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['/api/admin/subscriptions'],
    queryFn: fetchSubscriptions,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/admin/teams'],
    queryFn: fetchTeams,
  });

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['/api/admin/organizations'],
    queryFn: fetchOrganizations,
  });

  // Mutations
  const grantFreeMutation = useMutation({
    mutationFn: async (userId: number) => {
      console.log('Granting free access to user ID:', userId);
      try {
        // Using our direct method that bypasses Stripe
        const response = await apiRequest('POST', `/api/admin/free-access/${userId}`);
        console.log('Grant free access response:', response);
        return response;
      } catch (error) {
        console.error('Error in grant free access mutation:', error);
        
        // If the direct method fails, log detailed error
        console.error('Detailed error from direct grant method:', error);
        
        // Throw the error to be handled by onError
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Free access granted',
        description: 'User now has free access to the platform.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setShowGrantFreeAccess(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'An error occurred while processing your request.';
      console.error('Grant free access detailed error:', error);
      
      toast({
        title: 'Error granting free access',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const revokeFreeMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Using our direct method that bypasses Stripe
      try {
        const response = await apiRequest('POST', `/api/admin/revoke-free-access/${userId}`);
        console.log('Revoke free access response:', response);
        return response;
      } catch (error) {
        console.error('Error in revoke free access mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Free access revoked',
        description: 'User no longer has free access to the platform.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
    },
    onError: (error) => {
      const errorMessage = error?.message || 'An error occurred while processing your request.';
      toast({
        title: 'Error revoking free access',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Revoke free access error:', error);
    },
  });

  // Create subscription with Stripe Checkout
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: {
      type: 'user' | 'team' | 'organization';
      entityId: number;
      plan: string;
      quantity: number;
    }) => {
      // Get the entity based on type
      let entity;
      let stripeCustomerId;
      let entityData: any = {};
      
      if (data.type === 'user') {
        entity = users.find((u: User) => u.id === data.entityId);
        stripeCustomerId = entity?.stripeCustomerId;
        entityData.userId = data.entityId;
      } else if (data.type === 'team') {
        entity = teams.find((t: any) => t.id === data.entityId);
        stripeCustomerId = entity?.stripeCustomerId;
        entityData.teamId = data.entityId;
      } else if (data.type === 'organization') {
        entity = organizations.find((o: any) => o.id === data.entityId);
        stripeCustomerId = entity?.stripeCustomerId;
        entityData.organizationId = data.entityId;
      }
      
      // First create customer if needed
      if (!stripeCustomerId) {
        const customerData = {
          name: entity?.name || entity?.displayName || entity?.username || 'Customer',
          email: entity?.email || 'unknown@example.com',
          ...entityData
        };
        const customerResponse = await apiRequest('POST', '/api/stripe/customers', customerData)
          .then(res => res.json());
        stripeCustomerId = customerResponse.customerId;
      }
      
      // Create a Checkout session for secure credit card processing
      // This uses Stripe's hosted checkout page for maximum security and compliance
      const currentUrl = window.location.href.split('?')[0]; // Remove any query params
      
      const checkoutData = {
        stripeCustomerId,
        priceId: getPriceIdForPlan(data.plan),
        quantity: data.quantity,
        ...entityData,
        successUrl: `${currentUrl}?checkout_success=true&plan=${data.plan}&entity_type=${data.type}&entity_id=${data.entityId}`,
        cancelUrl: `${currentUrl}?checkout_canceled=true`,
      };
      
      // Create a checkout session and redirect to Stripe
      try {
        const response = await apiRequest('POST', '/api/stripe/checkout', checkoutData);
        
        if (!response.ok) {
          // If the server response is not ok, parse error details
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create checkout session');
        }
        
        const checkoutResponse = await response.json();
        
        // Redirect to Stripe Checkout
        if (checkoutResponse.url) {
          window.location.href = checkoutResponse.url;
          return checkoutResponse;
        } else {
          throw new Error('Failed to create checkout session - no URL returned');
        }
      } catch (error) {
        console.error('Checkout session error details:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Redirecting to Stripe',
        description: 'You will be redirected to Stripe to complete payment.',
      });
      // No need to invalidate queries or close the dialog as we're redirecting
      // This will happen after returning from Stripe with success
    },
    onError: (error) => {
      console.error('Create subscription detailed error:', error);
      
      // Get more detailed error message if available
      let errorMessage = 'An error occurred while setting up the subscription.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      toast({
        title: 'Error creating subscription',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
  
  // Check for return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutSuccess = params.get('checkout_success');
    const checkoutCanceled = params.get('checkout_canceled');
    
    if (checkoutSuccess === 'true') {
      // Clean up URL
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
      
      // Show success message
      toast({
        title: 'Subscription created',
        description: 'Your subscription has been set up successfully!',
      });
      
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
    } else if (checkoutCanceled === 'true') {
      // Clean up URL
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
      
      // Show message
      toast({
        title: 'Checkout canceled',
        description: 'You canceled the subscription checkout process.',
      });
    }
  }, []);

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      return await apiRequest('POST', `/api/stripe/subscriptions/${subscriptionId}/cancel`);
    },
    onSuccess: () => {
      toast({
        title: 'Subscription canceled',
        description: 'The subscription has been canceled.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: 'Error canceling subscription',
        description: 'An error occurred while canceling the subscription.',
        variant: 'destructive',
      });
      console.error('Cancel subscription error:', error);
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      return await apiRequest('POST', `/api/stripe/subscriptions/${subscriptionId}/reactivate`);
    },
    onSuccess: () => {
      toast({
        title: 'Subscription reactivated',
        description: 'The subscription has been reactivated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: 'Error reactivating subscription',
        description: 'An error occurred while reactivating the subscription.',
        variant: 'destructive',
      });
      console.error('Reactivate subscription error:', error);
    },
  });

  // Helper functions
  const getEntityName = (subscription: Subscription) => {
    if (subscription.userId) {
      const user = users.find((u: User) => u.id === subscription.userId);
      return user ? user.displayName || user.username : 'Unknown User';
    } else if (subscription.teamId) {
      const team = teams.find((t: any) => t.id === subscription.teamId);
      return team ? team.name : 'Unknown Team';
    } else if (subscription.organizationId) {
      const org = organizations.find((o: any) => o.id === subscription.organizationId);
      return org ? org.name : 'Unknown Organization';
    }
    return 'Unknown Entity';
  };

  const getEntityType = (subscription: Subscription) => {
    if (subscription.userId) return 'User';
    if (subscription.teamId) return 'Team';
    if (subscription.organizationId) return 'Organization';
    return 'Unknown';
  };

  const formatDate = (date: Date | null | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return <Badge className="bg-green-500">Active</Badge>;
      case SubscriptionStatus.CANCELED:
        return <Badge className="bg-yellow-500">Canceled</Badge>;
      case SubscriptionStatus.PAST_DUE:
        return <Badge className="bg-red-500">Past Due</Badge>;
      case SubscriptionStatus.UNPAID:
        return <Badge className="bg-red-700">Unpaid</Badge>;
      case SubscriptionStatus.EXPIRED:
        return <Badge className="bg-gray-500">Expired</Badge>;
      case SubscriptionStatus.TRIALING:
        return <Badge className="bg-blue-500">Trial</Badge>;
      default:
        return <Badge className="bg-gray-300">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case SubscriptionPlan.INDIVIDUAL:
        return <Badge className="bg-indigo-500">Individual</Badge>;
      case SubscriptionPlan.TEAM:
        return <Badge className="bg-purple-500">Team</Badge>;
      case SubscriptionPlan.ORGANIZATION:
        return <Badge className="bg-blue-500">Organization</Badge>;
      default:
        return <Badge className="bg-gray-300">{plan}</Badge>;
    }
  };

  // Function to get actual price IDs from the API
  const { data: stripeConfig, isLoading: stripeConfigLoading } = useQuery({
    queryKey: ['/api/stripe/validate-config'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/stripe/validate-config').then(res => res.json());
    }
  });

  const getPriceIdForPlan = (plan: string) => {
    // Check if we've loaded the Stripe config
    if (stripeConfig?.prices) {
      switch (plan) {
        case SubscriptionPlan.INDIVIDUAL:
          return stripeConfig.prices.INDIVIDUAL;
        case SubscriptionPlan.TEAM:
          return stripeConfig.prices.TEAM;
        case SubscriptionPlan.ORGANIZATION:
          return stripeConfig.prices.ORGANIZATION;
        default:
          return stripeConfig.prices.INDIVIDUAL;
      }
    }
    
    // Fallback to environment variable naming convention (supporting both formats)
    switch (plan) {
      case SubscriptionPlan.INDIVIDUAL:
        return process.env.STRIPE_PRICE_INDIVIDUAL || process.env.STRIPEPRICE_INDIVIDUAL || 'price_individual';
      case SubscriptionPlan.TEAM:
        return process.env.STRIPE_PRICE_TEAM || process.env.STRIPEPRICE_TEAM || 'price_team';
      case SubscriptionPlan.ORGANIZATION:
        return process.env.STRIPE_PRICE_ORGANIZATION || process.env.STRIPEPRICE_ORGANIZATION || 'price_organization';
      default:
        return process.env.STRIPE_PRICE_INDIVIDUAL || process.env.STRIPEPRICE_INDIVIDUAL || 'price_individual';
    }
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setSelectedTeamId(null);
    setSelectedOrgId(null);
    setSubscriptionType('user');
    setSelectedPlan(SubscriptionPlan.INDIVIDUAL);
    setQuantity(1);
  };

  // Entity-specific handlers
  const handleUserChange = (value: string) => {
    setSelectedUserId(parseInt(value, 10));
  };

  const handleTeamChange = (value: string) => {
    setSelectedTeamId(parseInt(value, 10));
  };

  const handleOrganizationChange = (value: string) => {
    setSelectedOrgId(parseInt(value, 10));
  };

  const handleSubscriptionTypeChange = (value: string) => {
    setSubscriptionType(value as 'user' | 'team' | 'organization');
    setSelectedUserId(null);
    setSelectedTeamId(null);
    setSelectedOrgId(null);
  };

  // Render entity selector based on subscription type
  const renderEntitySelector = () => {
    switch (subscriptionType) {
      case 'user':
        return (
          <div className="space-y-2">
            <Label>User</Label>
            <Select onValueChange={handleUserChange} value={selectedUserId?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: User) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.displayName || user.username} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'team':
        return (
          <div className="space-y-2">
            <Label>Team</Label>
            <Select onValueChange={handleTeamChange} value={selectedTeamId?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'organization':
        return (
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select onValueChange={handleOrganizationChange} value={selectedOrgId?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org: any) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmitSubscription = () => {
    let entityId;
    if (subscriptionType === 'user') {
      entityId = selectedUserId;
    } else if (subscriptionType === 'team') {
      entityId = selectedTeamId;
    } else if (subscriptionType === 'organization') {
      entityId = selectedOrgId;
    }

    if (!entityId) {
      toast({
        title: 'Error',
        description: 'Please select an entity',
        variant: 'destructive',
      });
      return;
    }

    createSubscriptionMutation.mutate({
      type: subscriptionType,
      entityId,
      plan: selectedPlan,
      quantity
    });
  };

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You need administrator privileges to access this page.
                </CardDescription>
              </CardHeader>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">
              Subscription Management
            </h1>
            <p className="text-neutral-600 dark:text-slate-400">
              Manage user subscriptions, grant free access, and create new subscriptions.
            </p>
            {/* Stripe configuration status */}
            {stripeConfigLoading ? (
              <div className="mt-2 text-sm text-neutral-500">Checking Stripe configuration...</div>
            ) : stripeConfig?.enabled ? (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Stripe integration active - {stripeConfig.products || 0} product(s) available
              </div>
            ) : (
              <div className="mt-2 text-sm text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {stripeConfig?.message || "Stripe integration is not configured"}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Individual Users</CardTitle>
                <CardDescription>
                  $9.99 per user / month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-indigo-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">$9.99</p>
                    <p className="text-sm text-neutral-500">14-day trial included</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Teams</CardTitle>
                <CardDescription>
                  $30 base + $8 per user / month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">$30 + $8/user</p>
                    <p className="text-sm text-neutral-500">Shared calendar and controls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Organizations</CardTitle>
                <CardDescription>
                  $99 base + $8 per user / month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">$99 + $8/user</p>
                    <p className="text-sm text-neutral-500">Enterprise features included</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Free Access</CardTitle>
                <CardDescription>
                  For special users and admins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mr-2" />
                  <div>
                    <p className="text-2xl font-bold">$0.00</p>
                    <p className="text-sm text-neutral-500">Admin granted access</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Active Subscriptions</h2>
            <div className="flex space-x-4">
              <Dialog open={showGrantFreeAccess} onOpenChange={setShowGrantFreeAccess}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Grant Free Access
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Free Access</DialogTitle>
                    <DialogDescription>
                      Select a user to grant free access to the platform.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>User</Label>
                      <Select onValueChange={(value) => setSelectedUserId(parseInt(value, 10))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter((user: User) => !user.hasFreeAccess)
                            .map((user: User) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.displayName || user.username} ({user.email})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowGrantFreeAccess(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedUserId) {
                          grantFreeMutation.mutate(selectedUserId);
                        }
                      }}
                      disabled={!selectedUserId || grantFreeMutation.isPending}
                    >
                      {grantFreeMutation.isPending ? 'Processing...' : 'Grant Access'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showCreateSubscription} onOpenChange={setShowCreateSubscription}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subscription</DialogTitle>
                    <DialogDescription>
                      Set up a new subscription with secure payment processing. You'll be redirected to Stripe to enter payment details.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Subscription Type</Label>
                      <Select 
                        onValueChange={handleSubscriptionTypeChange} 
                        defaultValue="user"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Individual User</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                          <SelectItem value="organization">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {renderEntitySelector()}
                    
                    <div className="space-y-2">
                      <Label>Subscription Plan</Label>
                      <Select 
                        onValueChange={(value) => setSelectedPlan(value)} 
                        defaultValue={SubscriptionPlan.INDIVIDUAL}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SubscriptionPlan.INDIVIDUAL}>Individual ($9.99/user)</SelectItem>
                          <SelectItem value={SubscriptionPlan.TEAM}>Team ($30 + $8/user)</SelectItem>
                          <SelectItem value={SubscriptionPlan.ORGANIZATION}>Organization ($99 + $8/user)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Quantity (Users)</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={quantity} 
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} 
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateSubscription(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitSubscription}
                      disabled={
                        createSubscriptionMutation.isPending || 
                        (subscriptionType === 'user' && !selectedUserId) ||
                        (subscriptionType === 'team' && !selectedTeamId) ||
                        (subscriptionType === 'organization' && !selectedOrgId)
                      }
                    >
                      {createSubscriptionMutation.isPending ? 'Processing...' : 'Continue to Payment'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Card className="mb-8">
            <CardContent className="pt-6">
              {subscriptionsLoading ? (
                <div className="text-center py-8">Loading subscriptions...</div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  No subscriptions found. Create a subscription to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription: Subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">
                          {getEntityName(subscription)}
                        </TableCell>
                        <TableCell>
                          {getEntityType(subscription)}
                        </TableCell>
                        <TableCell>
                          {getPlanBadge(subscription.plan)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(subscription.status)}
                        </TableCell>
                        <TableCell>
                          {subscription.currentPeriodStart && (
                            <span>
                              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription.status === SubscriptionStatus.ACTIVE && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelSubscriptionMutation.mutate(subscription.id)}
                              disabled={cancelSubscriptionMutation.isPending}
                            >
                              {cancelSubscriptionMutation.isPending ? 'Processing...' : 'Cancel'}
                            </Button>
                          )}
                          {subscription.status === SubscriptionStatus.CANCELED && (
                            <Button
                              size="sm"
                              onClick={() => reactivateSubscriptionMutation.mutate(subscription.id)}
                              disabled={reactivateSubscriptionMutation.isPending}
                            >
                              {reactivateSubscriptionMutation.isPending ? 'Processing...' : 'Reactivate'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Users with Free Access</h2>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter((user: User) => user.hasFreeAccess).map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.displayName || user.username}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500">Free Access</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeFreeMutation.mutate(user.id)}
                            disabled={revokeFreeMutation.isPending}
                          >
                            {revokeFreeMutation.isPending ? 'Processing...' : 'Revoke Access'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.filter((user: User) => user.hasFreeAccess).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-neutral-500">
                          No users with free access. Grant free access to users as needed.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}