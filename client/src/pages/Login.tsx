import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type LoginFormValues = {
  username: string;
  password: string;
};

export default function Login() {
  const { login, loading, error } = useUser();
  const [, setLocation] = useLocation();
  
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
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
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
  );
}