import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { SubscriptionStatus, SubscriptionPlan, UserRole } from "@shared/schema";
import { Loader2, CheckCircle, XCircle, AlertCircle, Calendar, DollarSign, User, Users, Building, Tag, Clock, RefreshCw } from "lucide-react";
import { useState } from "react";

const SubscriptionManagement = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | "">("");
  const [isFreePlanDialogOpen, setIsFreePlanDialogOpen] = useState(false);
  const [isAssignPlanDialogOpen, setIsAssignPlanDialogOpen] = useState(false);

  // Get all subscriptions
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ['/api/stripe/admin/subscriptions'],
    retry: 1,
  });

  // Get all users with subscription info
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/stripe/admin/users'],
    retry: 1,
  });

  // Grant/revoke free access mutation
  const freeAccessMutation = useMutation({
    mutationFn: ({ userId, grant }: { userId: number, grant: boolean }) => {
      return apiRequest(`/api/stripe/free-access/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ grant }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/admin/subscriptions'] });
      toast({
        title: "Success",
        description: "Free access status updated successfully",
      });
      setIsFreePlanDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update free access status: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Update subscription mutation (cancel/reactivate)
  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ subscriptionId, action }: { subscriptionId: number, action: 'cancel' | 'reactivate' }) => {
      return apiRequest(`/api/stripe/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/admin/subscriptions'] });
      toast({
        title: "Success",
        description: "Subscription updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update subscription: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case SubscriptionStatus.CANCELED:
        return <Badge className="bg-orange-500"><XCircle className="h-3 w-3 mr-1" /> Canceled</Badge>;
      case SubscriptionStatus.PAST_DUE:
        return <Badge className="bg-red-500"><AlertCircle className="h-3 w-3 mr-1" /> Past Due</Badge>;
      case SubscriptionStatus.TRIALING:
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" /> Trial</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  // Helper function to get plan icon
  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case SubscriptionPlan.INDIVIDUAL:
        return <User className="h-4 w-4 mr-1" />;
      case SubscriptionPlan.TEAM:
        return <Users className="h-4 w-4 mr-1" />;
      case SubscriptionPlan.ORGANIZATION:
        return <Building className="h-4 w-4 mr-1" />;
      default:
        return <Tag className="h-4 w-4 mr-1" />;
    }
  };

  // Helper function to get entity type icon
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4 mr-1" />;
      case 'team':
        return <Users className="h-4 w-4 mr-1" />;
      case 'organization':
        return <Building className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const handleCancelSubscription = (subscriptionId: number) => {
    updateSubscriptionMutation.mutate({ subscriptionId, action: 'cancel' });
  };

  const handleReactivateSubscription = (subscriptionId: number) => {
    updateSubscriptionMutation.mutate({ subscriptionId, action: 'reactivate' });
  };

  const handleToggleFreeAccess = (userId: number, currentStatus: boolean) => {
    freeAccessMutation.mutate({ userId, grant: !currentStatus });
  };

  const handleOpenFreePlanDialog = (userId: number) => {
    setSelectedUser(userId);
    setIsFreePlanDialogOpen(true);
  };

  const handleOpenAssignPlanDialog = (userId: number) => {
    setSelectedUser(userId);
    setSelectedPlan("");
    setIsAssignPlanDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>
      <p className="text-gray-600 mb-8">
        Manage user subscriptions, grant free access, and view payment status of your users.
      </p>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="subscriptions">
            <DollarSign className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                View and manage all subscriptions across users, teams, and organizations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSubscriptions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : subscriptions?.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((subscription: any) => (
                        <TableRow key={subscription.id}>
                          <TableCell className="flex items-center">
                            {getEntityIcon(subscription.entityType)}
                            <span className="ml-1">{subscription.entityName}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({subscription.entityType})
                            </span>
                          </TableCell>
                          <TableCell className="flex items-center">
                            {getPlanIcon(subscription.plan)}
                            {subscription.plan}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(subscription.status)}
                          </TableCell>
                          <TableCell>
                            {subscription.currentPeriodStart ? 
                              format(new Date(subscription.currentPeriodStart), 'MMM d, yyyy') : 
                              'N/A'}
                          </TableCell>
                          <TableCell>
                            {subscription.currentPeriodEnd ? 
                              format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy') : 
                              'N/A'}
                          </TableCell>
                          <TableCell>
                            ${subscription.amount ? (subscription.amount / 100).toFixed(2) : '0.00'}
                            {subscription.interval ? `/${subscription.interval}` : ''}
                          </TableCell>
                          <TableCell>
                            {subscription.status === SubscriptionStatus.ACTIVE ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelSubscription(subscription.id)}
                                disabled={updateSubscriptionMutation.isPending}
                              >
                                {updateSubscriptionMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                Cancel
                              </Button>
                            ) : subscription.status === SubscriptionStatus.CANCELED ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReactivateSubscription(subscription.id)}
                                disabled={updateSubscriptionMutation.isPending}
                              >
                                {updateSubscriptionMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Reactivate
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No subscriptions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Manage User Access</CardTitle>
              <CardDescription>
                Grant free access or assign subscription plans to users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : users?.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Access Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {user.displayName || user.username}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.email}
                          </TableCell>
                          <TableCell>
                            {user.hasFreeAccess ? (
                              <Badge className="bg-purple-500">Free Access</Badge>
                            ) : user.subscription ? (
                              <Badge className="bg-blue-500">
                                {getPlanIcon(user.subscription.plan)}
                                Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500">No Access</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.subscription ? (
                              getStatusBadge(user.subscription.status)
                            ) : (
                              <Badge variant="outline">No Subscription</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenFreePlanDialog(user.id)}
                              >
                                {user.hasFreeAccess ? "Revoke Free" : "Grant Free"}
                              </Button>
                              
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleOpenAssignPlanDialog(user.id)}
                              >
                                Assign Plan
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Free Access Dialog */}
      <Dialog open={isFreePlanDialogOpen} onOpenChange={setIsFreePlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Free Access</DialogTitle>
            <DialogDescription>
              {selectedUser && users?.find((u: any) => u.id === selectedUser)?.hasFreeAccess
                ? "Are you sure you want to revoke free access from this user?"
                : "Are you sure you want to grant free access to this user?"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <strong>User:</strong>{" "}
                  {users?.find((u: any) => u.id === selectedUser)?.displayName ||
                    users?.find((u: any) => u.id === selectedUser)?.username}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <strong>Email:</strong>{" "}
                  {users?.find((u: any) => u.id === selectedUser)?.email}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <strong>Current Status:</strong>{" "}
                  {users?.find((u: any) => u.id === selectedUser)?.hasFreeAccess
                    ? "Has Free Access"
                    : "No Free Access"}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFreePlanDialogOpen(false)}
            >
              Cancel
            </Button>
            {selectedUser && (
              <Button
                onClick={() => handleToggleFreeAccess(
                  selectedUser,
                  users?.find((u: any) => u.id === selectedUser)?.hasFreeAccess || false
                )}
                disabled={freeAccessMutation.isPending}
              >
                {freeAccessMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {users?.find((u: any) => u.id === selectedUser)?.hasFreeAccess
                  ? "Revoke Free Access"
                  : "Grant Free Access"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={isAssignPlanDialogOpen} onOpenChange={setIsAssignPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
            <DialogDescription>
              Select a subscription plan to assign to this user.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <strong>User:</strong>{" "}
                  {users?.find((u: any) => u.id === selectedUser)?.displayName ||
                    users?.find((u: any) => u.id === selectedUser)?.username}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <strong>Email:</strong>{" "}
                  {users?.find((u: any) => u.id === selectedUser)?.email}
                </div>
              </div>
              
              <div className="py-4">
                <Label htmlFor="plan-select">Select Plan</Label>
                <Select
                  value={selectedPlan}
                  onValueChange={(value) => setSelectedPlan(value as SubscriptionPlan)}
                >
                  <SelectTrigger id="plan-select" className="mt-2">
                    <SelectValue placeholder="Select a subscription plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SubscriptionPlan.INDIVIDUAL}>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Individual ($9.99/month)
                      </div>
                    </SelectItem>
                    <SelectItem value={SubscriptionPlan.TEAM}>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Team ($30 + $8/user/month)
                      </div>
                    </SelectItem>
                    <SelectItem value={SubscriptionPlan.ORGANIZATION}>
                      <div className="flex items-center">
                        <Building className="mr-2 h-4 w-4" />
                        Organization ($99 + $8/user/month)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignPlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedPlan || !selectedUser}
              onClick={() => {
                toast({
                  title: "Not Implemented",
                  description: "This functionality would require payment method setup. For a complete implementation, we'd need a payment form and Stripe integration here.",
                });
                setIsAssignPlanDialogOpen(false);
              }}
            >
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;