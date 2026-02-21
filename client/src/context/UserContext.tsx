import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@shared/schema';

// Define user types
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  profilePicture: string | null;
  avatarColor: string | null;
  bio: string | null;
  role: string;
  organizationId: number | null;
  teamId: number | null;
}

export interface Organization {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  organizationId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  organization: Organization | null;
  team: Team | null;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  isTeamManager: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  organization: null,
  team: null,
  isAdmin: false,
  isCompanyAdmin: false,
  isTeamManager: false,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  loading: false,
  error: null,
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if user is logged in and fetch latest data
  useEffect(() => {
    const initializeUser = async () => {
      // First check if user is stored locally
      const storedUser = localStorage.getItem('user');
      
      if (storedUser) {
        try {
          // Parse and set the stored user initially
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Then fetch the latest user data from the server
          const freshUserData = await fetchCurrentUser();
          
          if (freshUserData) {
            console.log('UserContext: Updating user with fresh data from server');
            // Update the user state with the latest data
            setUser(freshUserData);
            // Update localStorage with the fresh data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            // Fetch related organization and team details
            fetchUserDetails(freshUserData);
          } else {
            // If we couldn't fetch fresh data, use the stored data
            console.log('UserContext: Using cached user data from localStorage');
            fetchUserDetails(parsedUser);
          }
        } catch (e) {
          console.error('Failed to parse stored user', e);
          localStorage.removeItem('user');
        }
      }
    };
    
    initializeUser();
  }, []);

  // Fetch the current user data from the server
  const fetchCurrentUser = async (): Promise<User | null> => {
    try {
      console.log('UserContext: Fetching fresh user data from server');
      const response = await fetch('/api/users/current');
      if (response.ok) {
        const userData = await response.json();
        console.log('UserContext: Received fresh user data', userData);
        return userData;
      } else {
        console.error('UserContext: Failed to fetch current user data', response.statusText);
        return null;
      }
    } catch (e) {
      console.error('UserContext: Error fetching current user data', e);
      return null;
    }
  };

  // Fetch organization and team details if user belongs to one
  const fetchUserDetails = async (currentUser: User) => {
    if (currentUser.organizationId) {
      try {
        const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
        if (response.ok) {
          const org = await response.json();
          setOrganization(org);
        }
      } catch (e) {
        console.error('Failed to fetch organization details', e);
      }
    }

    if (currentUser.teamId) {
      try {
        const response = await fetch(`/api/teams/${currentUser.teamId}`);
        if (response.ok) {
          const teamData = await response.json();
          setTeam(teamData);
        }
      } catch (e) {
        console.error('Failed to fetch team details', e);
      }
    }
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/login', { username, password });
      
      // Handle email verification error (status 403)
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.message === 'Email verification required') {
          // Check if verification email was sent successfully
          if (errorData.emailVerificationSent) {
            // Redirect to login page with verification resent flag
            window.location.href = `/login?verification_resent=true&email=${encodeURIComponent(errorData.email || '')}`;
            throw new Error('Please verify your email address before logging in. A new verification email has been sent.');
          } else {
            // Redirect to login page with email error flag
            window.location.href = `/login?email_error=true&email=${encodeURIComponent(errorData.email || '')}`;
            throw new Error('We had trouble sending the verification email. Please try again later or contact support.');
          }
        }
      }
      
      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Initial login data
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));

      // Check if user needs to change password
      if (data.forcePasswordChange) {
        console.log('Login: User must change password on first login');
        toast({
          title: 'Password Change Required',
          description: 'Please change your password to continue.',
        });
        // Redirect to change password page
        window.location.href = '/change-password';
        return;
      }

      // Fetch the most up-to-date user data directly from the server
      const freshUserData = await fetchCurrentUser();

      if (freshUserData) {
        console.log('Login: Updating user with fresh data from server');
        // Update the user state with the latest data
        setUser(freshUserData);
        // Update localStorage with the fresh data
        localStorage.setItem('user', JSON.stringify(freshUserData));
        // Fetch organization and team details with fresh data
        fetchUserDetails(freshUserData);
      } else {
        // If we couldn't fetch fresh data, use the login response data
        console.log('Login: Using data from login response');
        fetchUserDetails(data);
      }

      toast({
        title: 'Login successful',
        description: `Welcome back, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginMutation.mutateAsync({ username, password });
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh user data from the server
  const refreshUser = async () => {
    if (!user) {
      console.log('UserContext: Cannot refresh, no user is logged in');
      return;
    }
    
    console.log('UserContext: Refreshing user data');
    setLoading(true);
    
    try {
      const freshUserData = await fetchCurrentUser();
      
      if (freshUserData) {
        console.log('UserContext: User data refreshed successfully');
        // Update the user state with the latest data
        setUser(freshUserData);
        // Update localStorage with the fresh data
        localStorage.setItem('user', JSON.stringify(freshUserData));
        // Fetch related details
        fetchUserDetails(freshUserData);
        
        // Invalidate any user-related queries to ensure UI is up-to-date
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      } else {
        console.error('UserContext: Failed to refresh user data');
      }
    } catch (e) {
      console.error('UserContext: Error refreshing user data', e);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setTeam(null);
    localStorage.removeItem('user');
    // Redirect to home page after logout
    window.location.href = '/';
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
  };

  // Determine user roles
  // Log user role details for debugging
  useEffect(() => {
    if (user) {
      console.log('UserContext: User role check', { 
        username: user.username,
        role: user.role,
        UserRoleAdmin: UserRole.ADMIN,
        isExactMatch: user.role === UserRole.ADMIN,
        isLowercaseMatch: user.role?.toLowerCase() === UserRole.ADMIN.toLowerCase(),
        roleType: typeof user.role
      });
      
      // If we detect user has role that matches 'admin' in any case, normalize it to lowercase
      if (user.role?.toLowerCase() === UserRole.ADMIN.toLowerCase() && user.role !== UserRole.ADMIN) {
        console.log('UserContext: Normalizing admin role to lowercase');
        const updatedUser = {...user, role: UserRole.ADMIN};
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }
  }, [user]);

  // Check roles with case insensitivity to handle potential string format issues in production
  const isAdmin = user?.role?.toLowerCase() === UserRole.ADMIN.toLowerCase();
  
  // Role checks with better debugging
  const isCompanyAdmin = user?.role?.toLowerCase() === UserRole.COMPANY_ADMIN.toLowerCase();
  
  const isTeamManager = user?.role?.toLowerCase() === UserRole.TEAM_MANAGER.toLowerCase();
  
  // Log role assignments for debugging
  if (user) {
    console.log('UserContext: Role assignments', {
      username: user.username,
      role: user.role,
      isAdmin,
      isCompanyAdmin,
      isTeamManager,
      ADMIN: UserRole.ADMIN,
      COMPANY_ADMIN: UserRole.COMPANY_ADMIN,
      TEAM_MANAGER: UserRole.TEAM_MANAGER
    });
  }

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        organization,
        team,
        isAdmin,
        isCompanyAdmin,
        isTeamManager,
        login,
        logout,
        refreshUser,
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};