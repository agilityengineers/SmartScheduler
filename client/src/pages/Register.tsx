import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, User, Building } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Registration form schema
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  accountType: z.enum(['freeTrial', 'company']).default('freeTrial'),
  companyName: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
}).refine(data => data.accountType !== 'company' || (data.companyName && data.companyName.length >= 2), {
  message: "Company name is required",
  path: ['companyName']
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<'freeTrial' | 'company'>('freeTrial');
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: 'freeTrial'
    }
  });
  
  // Watch account type changes for the form
  const watchAccountType = watch('accountType');
  
  const registerMutation = useMutation({
    mutationFn: async (data: Omit<RegisterFormValues, 'confirmPassword'>) => {
      const response = await apiRequest('POST', '/api/register', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Registration successful',
        description: 'A verification email has been sent to your email address. Please check your inbox and verify your email before logging in.',
      });
      
      // Redirect to login page with a query parameter to show verification message
      setLocation('/login?registered=true&email=' + encodeURIComponent(data.email));
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle account type change
  const handleAccountTypeChange = (value: 'freeTrial' | 'company') => {
    setValue('accountType', value);
    setAccountType(value);
  };

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registerData } = data;
    
    // Create registration data with additional fields based on account type
    const userData = {
      ...registerData,
      displayName: `${data.firstName} ${data.lastName}`, // Use first and last name for display name
      timezone: 'America/New_York', // Default timezone
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
      isCompanyAccount: data.accountType === 'company',
      role: data.accountType === 'company' ? 'company_admin' : 'user', // Set role based on account type
    };
    
    registerMutation.mutate(userData as any); // Using 'any' to bypass TypeScript check as the API will handle these fields
  };
  
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to register a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 mb-6">
              <Label className="text-base font-medium mb-2 block">Choose Account Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`border rounded-md p-4 cursor-pointer transition-all ${accountType === 'freeTrial' ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border hover:border-primary/50'}`}
                  onClick={() => handleAccountTypeChange('freeTrial')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-primary" />
                    <span className="font-medium">Individual</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Free Trial (14 days) with standard user permissions
                  </p>
                </div>
                
                <div 
                  className={`border rounded-md p-4 cursor-pointer transition-all ${accountType === 'company' ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border hover:border-primary/50'}`}
                  onClick={() => handleAccountTypeChange('company')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-5 w-5 text-primary" />
                    <span className="font-medium">Company</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create a company with admin privileges
                  </p>
                </div>
              </div>
              
              {accountType === 'company' && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    type="text" 
                    placeholder="Enter your company name" 
                    {...register('companyName')} 
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-500">{errors.companyName.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    A team called "Team A" will be created automatically.
                  </p>
                </div>
              )}
              
              <input type="hidden" {...register('accountType')} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  type="text" 
                  placeholder="First name" 
                  {...register('firstName')} 
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  type="text" 
                  placeholder="Last name" 
                  {...register('lastName')} 
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input 
                id="phoneNumber" 
                type="tel" 
                placeholder="Enter your phone number" 
                {...register('phoneNumber')} 
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Enter your username" 
                {...register('username')} 
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter your email" 
                {...register('email')} 
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Create a password" 
                {...register('password')} 
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="Confirm your password" 
                {...register('confirmPassword')} 
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Registering...' : 'Register'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center w-full text-muted-foreground">
            Already have an account?{' '}
            <a 
              onClick={() => setLocation('/login')} 
              className="text-primary hover:underline cursor-pointer"
            >
              Login
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}