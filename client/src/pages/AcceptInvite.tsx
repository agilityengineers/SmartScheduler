import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Form schema for accepting an invitation and setting a password
const acceptInviteSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string()
    .regex(/^[a-zA-Z0-9._-]*$/, 'Username may only contain letters, numbers, and . _ -')
    .refine(v => v === '' || v.length >= 3, 'Username must be at least 3 characters')
    .optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [isComped, setIsComped] = useState<boolean>(false);

  // Extract token from URL query string
  useEffect(() => {
    try {
      const search = location.includes('?') ? location.split('?')[1] : window.location.search;
      const params = new URLSearchParams(search);
      const urlToken = (params.get('token') || '').trim();

      if (urlToken) {
        setToken(urlToken);
      } else {
        setToken('');
        setTokenValid(false);
        setLoading(false);
        setError('No invitation token found in the link. Please contact your administrator for a new invitation.');
      }
    } catch (err) {
      console.error('Error parsing invitation token from URL:', err);
      setToken('');
      setTokenValid(false);
      setLoading(false);
      setError('Error processing the invitation link. Please contact your administrator.');
    }
  }, [location]);

  // Validate the token with the server
  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;

      try {
        const response = await apiRequest('GET', `/api/invitations/${encodeURIComponent(token)}`);
        const data = await response.json();

        if (data.valid === true) {
          setTokenValid(true);
          setInviteEmail(data.email || '');
          setIsComped(data.isComped === true);
        } else {
          setTokenValid(false);
          setError(data.message || 'This invitation link is invalid or has expired.');
        }
      } catch (err) {
        console.error('Invitation validation error:', err);
        setTokenValid(false);
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const { register, handleSubmit, formState: { errors } } = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      confirmPassword: '',
    }
  });

  const onSubmit = async (data: AcceptInviteFormValues) => {
    if (!token) {
      setError('No invitation token provided.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest('POST', `/api/invitations/${encodeURIComponent(token)}/accept`, {
        password: data.password,
        username: data.username ? data.username.trim() : undefined,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // If a session was established, send the user into the app shortly.
        if (result.sessionEstablished) {
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } else {
        setError(result.message || 'Failed to accept invitation. Please try again.');
      }
    } catch (err) {
      console.error('Accept invitation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="text-center">
              <p>Validating your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'This invitation link is invalid or has expired. Please contact your administrator.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Accept Your Invitation</CardTitle>
          <CardDescription className="text-center">
            {inviteEmail
              ? <>Create your account for <strong>{inviteEmail}</strong></>
              : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Your account has been created successfully. Welcome to SmartScheduler!
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/login')} className="w-full">
                Continue to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isComped && (
                <Alert className="bg-green-50 border-green-200">
                  <Gift className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Your account includes complimentary free access.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="First name" {...register('firstName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Last name" {...register('lastName')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="username" placeholder="Leave blank to auto-generate" {...register('username')} />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Choose a password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm your password" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
