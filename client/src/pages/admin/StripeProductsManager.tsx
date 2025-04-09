import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Import layout components
import AppHeader from '@/components/layout/AppHeader';
import Sidebar from '@/components/layout/Sidebar';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, DollarSign, Tag, Package, RefreshCw } from 'lucide-react';

interface Price {
  id: string;
  productName: string;
  amount: number;
  currency: string;
  interval?: string;
  active?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
}

interface PlanMapping {
  planId: string;
  planName: string;
  priceId: string;
}

const StripeProductsManager = () => {
  const [createPriceOpen, setCreatePriceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newPriceName, setNewPriceName] = useState('');
  const [newPriceAmount, setNewPriceAmount] = useState('');
  const [newPriceCurrency, setNewPriceCurrency] = useState('usd');
  const [newPriceInterval, setNewPriceInterval] = useState('month');
  const [newPriceProduct, setNewPriceProduct] = useState('');
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [planMappingOpen, setPlanMappingOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  
  const { toast } = useToast();

  // Load Stripe products and prices
  const { data: stripeConfig, isLoading: stripeConfigLoading, error: stripeConfigError, refetch: refetchStripeConfig } = useQuery({
    queryKey: ['/api/stripe/validate-config'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stripe/validate-config', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          let errorText = 'Unknown error';
          try {
            errorText = await response.text();
          } catch (e) {
            console.error('Failed to read error text:', e);
          }
          throw new Error(`Failed to fetch Stripe configuration: ${response.status} ${errorText}`);
        }
        
        try {
          const data = await response.json();
          return data;
        } catch (error) {
          const jsonError = error as Error;
          throw new Error(`Failed to parse Stripe configuration JSON: ${jsonError.message}`);
        }
      } catch (fetchError) {
        console.error('Exception in Stripe config fetch:', fetchError);
        throw fetchError;
      }
    },
  });

  // Get all products
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/stripe-manager/products'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe-manager/products');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    enabled: stripeConfig?.enabled === true,
  });

  // Get all prices
  const { data: prices, isLoading: pricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: ['/api/stripe-manager/prices'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe-manager/prices');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch prices: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    enabled: stripeConfig?.enabled === true,
  });

  // Get current plan mappings
  const { data: planMappings, isLoading: mappingsLoading, refetch: refetchMappings } = useQuery({
    queryKey: ['/api/stripe-manager/plan-mappings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe-manager/plan-mappings');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch plan mappings: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    enabled: stripeConfig?.enabled === true,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/stripe-manager/products', data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create product: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Product created',
        description: 'The product has been created successfully.',
      });
      refetchProducts();
      setCreateProductOpen(false);
      setNewProductName('');
      setNewProductDescription('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create price mutation
  const createPriceMutation = useMutation({
    mutationFn: async (data: { 
      productId: string; 
      unitAmount: number; 
      currency: string; 
      recurring?: { interval: string } 
    }) => {
      const response = await apiRequest('POST', '/api/stripe-manager/prices', data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create price: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Price created',
        description: 'The price has been created successfully.',
      });
      refetchPrices();
      setCreatePriceOpen(false);
      setNewPriceName('');
      setNewPriceAmount('');
      setNewPriceProduct('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update plan mapping mutation
  const updatePlanMappingMutation = useMutation({
    mutationFn: async (data: { planId: string; priceId: string }) => {
      const response = await apiRequest('POST', '/api/stripe-manager/plan-mappings', data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update plan mapping: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Plan mapping updated',
        description: 'The plan mapping has been updated successfully.',
      });
      refetchMappings();
      refetchStripeConfig();
      setPlanMappingOpen(false);
      setSelectedPlan('');
      setSelectedPrice('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateProduct = () => {
    if (!newProductName) {
      toast({
        title: 'Error',
        description: 'Product name is required',
        variant: 'destructive',
      });
      return;
    }

    createProductMutation.mutate({
      name: newProductName,
      description: newProductDescription,
    });
  };

  const handleCreatePrice = () => {
    if (!newPriceProduct || !newPriceAmount) {
      toast({
        title: 'Error',
        description: 'Product and amount are required',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseInt(newPriceAmount) * 100; // Convert to cents
    
    createPriceMutation.mutate({
      productId: newPriceProduct,
      unitAmount: amount,
      currency: newPriceCurrency,
      recurring: newPriceInterval ? { interval: newPriceInterval } : undefined,
    });
  };

  const handleUpdatePlanMapping = () => {
    if (!selectedPlan || !selectedPrice) {
      toast({
        title: 'Error',
        description: 'Plan and price are required',
        variant: 'destructive',
      });
      return;
    }

    updatePlanMappingMutation.mutate({
      planId: selectedPlan,
      priceId: selectedPrice,
    });
  };

  // Get the price ID for a specific plan
  const getPriceIdForPlan = (planId: string) => {
    if (!planMappings) return 'Not mapped';
    
    const mapping = planMappings.find((m: PlanMapping) => m.planId === planId);
    return mapping ? mapping.priceId : 'Not mapped';
  };

  // Get the price details for a specific price ID
  const getPriceDetails = (priceId: string) => {
    if (!prices) return null;
    
    return prices.find((p: Price) => p.id === priceId);
  };

  // Get the product name for a specific price
  const getProductForPrice = (priceId: string) => {
    const price = getPriceDetails(priceId);
    return price ? price.productName : 'Unknown product';
  };

  // Format currency amount
  const formatAmount = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Refresh all data
  const refreshAllData = () => {
    refetchStripeConfig();
    refetchProducts();
    refetchPrices();
    refetchMappings();
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-slate-900">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">
                Stripe Products & Prices Manager
              </h1>
              <p className="text-neutral-600 dark:text-slate-400">
                Manage Stripe products, prices, and plan mappings
              </p>
            </div>
            <Button 
              onClick={refreshAllData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Stripe configuration status */}
          {stripeConfigLoading ? (
            <div className="mt-2 text-sm text-neutral-500">Checking Stripe configuration...</div>
          ) : stripeConfigError ? (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Error loading Stripe configuration: {stripeConfigError instanceof Error 
                ? stripeConfigError.message 
                : 'Unknown error'}
            </div>
          ) : stripeConfig?.enabled ? (
            <div className="mt-2 text-sm text-green-600 flex items-center mb-6">
              <CheckCircle className="h-4 w-4 mr-1" />
              Stripe integration active - {stripeConfig.products || 0} product(s) and {stripeConfig.prices?.length || 0} price(s) available
            </div>
          ) : (
            <div className="mt-2 text-sm text-red-600 flex items-center mb-6">
              <AlertCircle className="h-4 w-4 mr-1" />
              {stripeConfig?.message || "Stripe integration is not configured"}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => refetchStripeConfig()}
              >
                Retry
              </Button>
            </div>
          )}

          <Tabs defaultValue="plan-mappings" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-[400px] mb-6">
              <TabsTrigger value="plan-mappings">Plan Mappings</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="prices">Prices</TabsTrigger>
            </TabsList>

            <TabsContent value="plan-mappings">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plan Mappings</CardTitle>
                  <CardDescription>
                    Map subscription plans to Stripe prices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mappingsLoading ? (
                    <div>Loading plan mappings...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Price ID</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stripeConfig?.prices && Object.entries(stripeConfig.prices).map(([planId, priceId]) => {
                          const priceDetails = getPriceDetails(priceId as string);
                          return (
                            <TableRow key={planId}>
                              <TableCell className="font-medium">{planId}</TableCell>
                              <TableCell>{priceId as string}</TableCell>
                              <TableCell>{priceDetails ? priceDetails.productName : 'Unknown'}</TableCell>
                              <TableCell>
                                {priceDetails 
                                  ? formatAmount(priceDetails.amount, priceDetails.currency)
                                  : 'Unknown'
                                }
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlan(planId);
                                    setSelectedPrice(priceId as string);
                                    setPlanMappingOpen(true);
                                  }}
                                >
                                  Change
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div>
                    <Button 
                      onClick={() => setPlanMappingOpen(true)}
                    >
                      Update Plan Mapping
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Stripe Products</CardTitle>
                  <CardDescription>
                    Manage your Stripe products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div>Loading products...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products && products.map((product: Product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-mono text-xs">{product.id}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              {product.active ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-md truncate">{product.description || 'No description'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div>
                    <Button 
                      onClick={() => setCreateProductOpen(true)}
                    >
                      Create New Product
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="prices">
              <Card>
                <CardHeader>
                  <CardTitle>Stripe Prices</CardTitle>
                  <CardDescription>
                    Manage your Stripe prices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pricesLoading ? (
                    <div>Loading prices...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Interval</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prices && prices.map((price: Price) => (
                          <TableRow key={price.id}>
                            <TableCell className="font-mono text-xs">{price.id}</TableCell>
                            <TableCell>{price.productName}</TableCell>
                            <TableCell>{formatAmount(price.amount, price.currency)}</TableCell>
                            <TableCell>{price.interval || 'One-time'}</TableCell>
                            <TableCell>
                              {price.active !== false ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div>
                    <Button 
                      onClick={() => setCreatePriceOpen(true)}
                    >
                      Create New Price
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Create Product Dialog */}
          <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Create a new product in your Stripe account.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    placeholder="Enter product name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="product-description">Description (Optional)</Label>
                  <Input
                    id="product-description"
                    placeholder="Enter product description"
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateProductOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProduct}
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Price Dialog */}
          <Dialog open={createPriceOpen} onOpenChange={setCreatePriceOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Price</DialogTitle>
                <DialogDescription>
                  Create a new price for a product in your Stripe account.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select onValueChange={setNewPriceProduct} value={newPriceProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products && products
                        .filter((p: Product) => p.active !== false)
                        .map((product: Product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price-amount">Amount</Label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
                    <Input
                      id="price-amount"
                      placeholder="9.99"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newPriceAmount}
                      onChange={(e) => setNewPriceAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Enter the amount in dollars (e.g. 9.99)</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select onValueChange={setNewPriceCurrency} value={newPriceCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                      <SelectItem value="gbp">GBP - British Pound</SelectItem>
                      <SelectItem value="cad">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="aud">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
                  <Select onValueChange={setNewPriceInterval} value={newPriceInterval}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="day">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreatePriceOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePrice}
                  disabled={createPriceMutation.isPending}
                >
                  {createPriceMutation.isPending ? 'Creating...' : 'Create Price'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Plan Mapping Dialog */}
          <Dialog open={planMappingOpen} onOpenChange={setPlanMappingOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Plan Mapping</DialogTitle>
                <DialogDescription>
                  Map a subscription plan to a Stripe price.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select onValueChange={setSelectedPlan} value={selectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                      <SelectItem value="organization_member">Organization Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Select onValueChange={setSelectedPrice} value={selectedPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a price" />
                    </SelectTrigger>
                    <SelectContent>
                      {prices && prices.map((price: Price) => (
                        <SelectItem key={price.id} value={price.id}>
                          {price.productName} - {formatAmount(price.amount, price.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedPrice && prices && (
                  <div className="mt-4 p-4 border rounded-md bg-neutral-50 dark:bg-slate-800">
                    <h4 className="font-medium mb-2">Selected Price Details</h4>
                    {prices
                      .filter((p: Price) => p.id === selectedPrice)
                      .map((price: Price) => (
                        <div key={price.id} className="space-y-1 text-sm">
                          <p><strong>Product:</strong> {price.productName}</p>
                          <p><strong>Amount:</strong> {formatAmount(price.amount, price.currency)}</p>
                          <p><strong>Billing:</strong> {price.interval ? `Every ${price.interval}` : 'One-time'}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPlanMappingOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdatePlanMapping}
                  disabled={updatePlanMappingMutation.isPending || !selectedPlan || !selectedPrice}
                >
                  {updatePlanMappingMutation.isPending ? 'Updating...' : 'Update Mapping'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default StripeProductsManager;