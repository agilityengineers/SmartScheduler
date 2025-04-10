import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect, useState } from 'react';
import Footer from '@/components/layout/Footer';

type LoginFormValues = {
  username: string;
  password: string;
};

export default function Login() {
  const { login, loading, error } = useUser();
  const [location, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState({
    showMessage: false,
    email: '',
    verified: false,
    registered: false,
    emailError: false,
    verificationResent: false
  });
  
  // Extract query parameters to check verification status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Check if email was verified
    const verified = params.get('verified') === 'true';
    
    // Check if the user just registered
    const registered = params.get('registered') === 'true';
    
    // Check if there's an email verification error
    const emailError = params.get('email_error') === 'true';
    
    // Check if a verification email was resent
    const verificationResent = params.get('verification_resent') === 'true';
    
    // Get email from query parameters if available
    const email = params.get('email') || '';
    
    if (verified || registered || emailError || verificationResent) {
      setVerificationStatus({
        showMessage: true,
        email,
        verified,
        registered,
        emailError,
        verificationResent
      });
      
      // Clear query parameters from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    defaultValues: {
      username: '',
      password: ''
    }
  });
  
  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.username, data.password);
      setLocation('/');
    } catch (error) {
      // Error is handled by the context
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto flex-1 flex items-center justify-center py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
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
              
              {/* Email verification status messages */}
              {verificationStatus.showMessage && verificationStatus.verified && (
                <Alert variant="default" className="bg-green-50 border-green-300">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Your email has been successfully verified! You can now log in.
                  </AlertDescription>
                </Alert>
              )}
              
              {verificationStatus.showMessage && verificationStatus.registered && (
                <Alert variant="default" className="bg-blue-50 border-blue-300">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Registration successful! Please check your email 
                    {verificationStatus.email && <strong> ({verificationStatus.email})</strong>} 
                    to verify your account before logging in.
                  </AlertDescription>
                </Alert>
              )}
              
              {verificationStatus.showMessage && verificationStatus.emailError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    There was a problem sending the verification email to 
                    {verificationStatus.email && <strong> {verificationStatus.email}</strong>}.
                    Please ensure your email address is correct and try again. If the problem persists, 
                    please contact support.
                  </AlertDescription>
                </Alert>
              )}
              
              {verificationStatus.showMessage && verificationStatus.verificationResent && (
                <Alert variant="default" className="bg-blue-50 border-blue-300">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    A new verification email has been sent to 
                    {verificationStatus.email && <strong> {verificationStatus.email}</strong>}.
                    Please check your inbox and spam folder.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="Enter your username" 
                  {...register('username', { required: 'Username is required' })} 
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a 
                    onClick={() => setLocation('/reset-password')} 
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password" 
                  {...register('password', { required: 'Password is required' })} 
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <a 
                onClick={() => setLocation('/register')} 
                className="text-primary hover:underline cursor-pointer"
              >
                Register
              </a>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Demo accounts:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <p><strong>Admin:</strong> admin / adminpass</p>
                <p><strong>Company Admin:</strong> companyadmin / companypass</p>
              </div>
              <div>
                <p><strong>Team Manager:</strong> teammanager / teampass</p>
                <p><strong>User:</strong> testuser / password</p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}