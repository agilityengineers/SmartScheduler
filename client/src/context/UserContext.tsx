import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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

  // Check if user is logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchUserDetails(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('user');
      }
    }
  }, []);

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
    onSuccess: (data) => {
      // Set user in state and localStorage
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      
      // Fetch organization and team details
      fetchUserDetails(data);
      
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
  const isCompanyAdmin = user?.role?.toLowerCase() === UserRole.COMPANY_ADMIN.toLowerCase();
  const isTeamManager = user?.role?.toLowerCase() === UserRole.TEAM_MANAGER.toLowerCase();

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
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};