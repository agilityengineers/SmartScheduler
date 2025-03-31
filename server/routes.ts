import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, insertEventSchema, insertBookingLinkSchema, 
  insertBookingSchema, insertSettingsSchema, insertOrganizationSchema, insertTeamSchema,
  CalendarIntegration, UserRole
} from "@shared/schema";
import { GoogleCalendarService } from "./calendarServices/googleCalendar";
import { OutlookCalendarService } from "./calendarServices/outlookCalendar";
import { ICalendarService } from "./calendarServices/iCalendarService";
import { reminderService } from "./utils/reminderService";
import { timeZoneService, popularTimeZones } from "./utils/timeZoneService";
import { emailService } from "./utils/emailService";

// Add userId to Express Request interface using module augmentation
declare global {
  namespace Express {
    interface Request {
      userId: number;
      userRole: string;
      organizationId: number | null;
      teamId: number | null;
    }
  }
}

// Authentication middleware
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // For demo purposes, we'll use a fixed user ID
  // In a real app, this would be derived from a session or JWT
  const userId = parseInt(req.headers['user-id'] as string || '1');
  
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    
    req.userId = user.id;
    req.userRole = user.role;
    req.organizationId = user.organizationId;
    req.teamId = user.teamId;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error authenticating user', error: (error as Error).message });
  }
};

// Role-based authorization middleware
const roleCheck = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// Admin only middleware
const adminOnly = roleCheck([UserRole.ADMIN]);

// Admin and Company Admin middleware
const adminAndCompanyAdmin = roleCheck([UserRole.ADMIN, UserRole.COMPANY_ADMIN]);

// Team manager and above middleware
const managerAndAbove = roleCheck([UserRole.ADMIN, UserRole.COMPANY_ADMIN, UserRole.TEAM_MANAGER]);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Add userId to Request interface using module augmentation
  // This is done outside the function to avoid syntax errors

  // API Routes - all prefixed with /api
  
  // ====== Admin Routes ======
  
  // Get all users (admin only)
  app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
    }
  });
  
  // Get all organizations (admin only)
  app.get('/api/admin/organizations', authMiddleware, adminOnly, async (req, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching organizations', error: (error as Error).message });
    }
  });
  
  // Get all teams (admin only)
  app.get('/api/admin/teams', authMiddleware, adminOnly, async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching teams', error: (error as Error).message });
    }
  });
  
  // Create a new organization (admin only)
  app.post('/api/admin/organizations', authMiddleware, adminOnly, async (req, res) => {
    try {
      const organizationData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(organizationData);
      res.status(201).json(organization);
    } catch (error) {
      res.status(400).json({ message: 'Invalid organization data', error: (error as Error).message });
    }
  });
  
  // Update an organization (admin only)
  app.patch('/api/admin/organizations/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationData = req.body;
      const organization = await storage.updateOrganization(id, organizationData);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      res.json(organization);
    } catch (error) {
      res.status(400).json({ message: 'Error updating organization', error: (error as Error).message });
    }
  });
  
  // Delete an organization (admin only)
  app.delete('/api/admin/organizations/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteOrganization(id);
      if (!success) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting organization', error: (error as Error).message });
    }
  });
  
  // Create a new team (admin or company admin)
  app.post('/api/admin/teams', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      
      // If company admin, force the organizationId to be their own
      if (req.userRole === UserRole.COMPANY_ADMIN) {
        if (!req.organizationId) {
          return res.status(403).json({ message: 'You are not associated with an organization' });
        }
        teamData.organizationId = req.organizationId;
      }
      
      const team = await storage.createTeam(teamData);
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ message: 'Invalid team data', error: (error as Error).message });
    }
  });
  
  // Update a team (admin or company admin)
  app.patch('/api/admin/teams/:id', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const teamData = req.body;
      
      // If company admin, verify they manage this team's organization
      if (req.userRole === UserRole.COMPANY_ADMIN) {
        const team = await storage.getTeam(id);
        if (!team) {
          return res.status(404).json({ message: 'Team not found' });
        }
        
        if (team.organizationId !== req.organizationId) {
          return res.status(403).json({ message: 'You do not have permission to modify this team' });
        }
      }
      
      const team = await storage.updateTeam(id, teamData);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json(team);
    } catch (error) {
      res.status(400).json({ message: 'Error updating team', error: (error as Error).message });
    }
  });
  
  // Delete a team (admin or company admin)
  app.delete('/api/admin/teams/:id', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // If company admin, verify they manage this team's organization
      if (req.userRole === UserRole.COMPANY_ADMIN) {
        const team = await storage.getTeam(id);
        if (!team) {
          return res.status(404).json({ message: 'Team not found' });
        }
        
        if (team.organizationId !== req.organizationId) {
          return res.status(403).json({ message: 'You do not have permission to delete this team' });
        }
      }
      
      const success = await storage.deleteTeam(id);
      if (!success) {
        return res.status(404).json({ message: 'Team not found' });
      }
      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting team', error: (error as Error).message });
    }
  });
  
  // ====== Organization Routes ======
  
  // Get teams in an organization
  app.get('/api/organizations/:id/teams', authMiddleware, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && req.organizationId !== organizationId) {
        return res.status(403).json({ message: 'You do not have access to this organization' });
      }
      
      const teams = await storage.getTeams(organizationId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching teams', error: (error as Error).message });
    }
  });
  
  // Get users in an organization
  app.get('/api/organizations/:id/users', authMiddleware, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && req.organizationId !== organizationId) {
        return res.status(403).json({ message: 'You do not have access to this organization' });
      }
      
      const users = await storage.getUsersByOrganization(organizationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
    }
  });
  
  // ====== Team Routes ======
  
  // Get users in a team
  app.get('/api/teams/:id/users', authMiddleware, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === team.organizationId) &&
        !(req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId)
      ) {
        return res.status(403).json({ message: 'You do not have access to this team' });
      }
      
      const users = await storage.getUsersByTeam(teamId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team users', error: (error as Error).message });
    }
  });
  
  // Get events for a team
  app.get('/api/teams/:id/events', authMiddleware, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === team.organizationId) &&
        !(req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId) &&
        !(req.teamId === teamId) // Allow team members to view their team's events
      ) {
        return res.status(403).json({ message: 'You do not have access to this team' });
      }
      
      // Get team events (for now, just return empty array since we don't have team events implemented yet)
      // In a real app, this would filter events by teamId
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team events', error: (error as Error).message });
    }
  });
  
  // User routes
  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
      res.status(400).json({ message: 'Invalid user data', error: (error as Error).message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string()
      }).parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Include role, organization and team information
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        teamId: user.teamId,
        displayName: user.displayName
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid login data', error: (error as Error).message });
    }
  });

  // Protected routes
  app.use('/api/calendar', authMiddleware);
  app.use('/api/events', authMiddleware);
  app.use('/api/booking', authMiddleware);
  app.use('/api/settings', authMiddleware);
  app.use('/api/integrations', authMiddleware);
  app.use('/api/users', authMiddleware);
  app.use('/api/organizations', authMiddleware);
  app.use('/api/teams', authMiddleware);

  // User management routes - Admin only
  app.get('/api/users', adminOnly, async (req, res) => {
    try {
      // For admin, return all users
      const users = Array.from((await storage.getUser(1)) ? [await storage.getUser(1)] : []);
      for (let i = 2; i <= 100; i++) {
        const user = await storage.getUser(i);
        if (user) users.push(user);
      }
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
    }
  });

  app.post('/api/users', adminOnly, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        teamId: user.teamId 
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid user data', error: (error as Error).message });
    }
  });

  app.get('/api/users/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Regular users can only view their own profile
      if (req.userRole !== UserRole.ADMIN && userId !== req.userId) {
        return res.status(403).json({ message: 'Forbidden: You can only view your own profile' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user', error: (error as Error).message });
    }
  });

  app.patch('/api/users/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && userId !== req.userId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
      }
      
      // Admins can update any field, regular users have restrictions
      let updateData = req.body;
      
      // Regular users cannot change their role or organizational assignments
      if (req.userRole !== UserRole.ADMIN) {
        const { role, organizationId, teamId, ...allowedFields } = updateData;
        updateData = allowedFields;
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user', error: (error as Error).message });
    }
  });

  // Organization routes
  app.get('/api/organizations', authMiddleware, async (req, res) => {
    try {
      // Admins can see all organizations
      if (req.userRole === UserRole.ADMIN) {
        const organizations = await storage.getOrganizations();
        return res.json(organizations);
      }
      
      // Company admins can see their organization
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        const organization = await storage.getOrganization(req.organizationId);
        return res.json(organization ? [organization] : []);
      }
      
      // Team managers and regular users can only see their organization if they're part of one
      if (req.organizationId) {
        const organization = await storage.getOrganization(req.organizationId);
        return res.json(organization ? [organization] : []);
      }
      
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching organizations', error: (error as Error).message });
    }
  });

  // Get a single organization
  app.get('/api/organizations/:id', authMiddleware, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && req.organizationId !== organizationId) {
        return res.status(403).json({ message: 'You do not have access to this organization' });
      }
      
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      res.json(organization);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching organization', error: (error as Error).message });
    }
  });

  app.post('/api/organizations', adminOnly, async (req, res) => {
    try {
      const orgData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(orgData);
      res.status(201).json(organization);
    } catch (error) {
      res.status(400).json({ message: 'Invalid organization data', error: (error as Error).message });
    }
  });



  app.patch('/api/organizations/:id', adminAndCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = parseInt(id);
      
      // Company admins can only update their own organization
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId !== orgId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own organization' });
      }
      
      const updatedOrg = await storage.updateOrganization(orgId, req.body);
      if (!updatedOrg) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      res.json(updatedOrg);
    } catch (error) {
      res.status(500).json({ message: 'Error updating organization', error: (error as Error).message });
    }
  });

  app.delete('/api/organizations/:id', adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = parseInt(id);
      
      const success = await storage.deleteOrganization(orgId);
      if (!success) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting organization', error: (error as Error).message });
    }
  });

  // Team routes
  app.get('/api/teams', authMiddleware, async (req, res) => {
    try {
      // Admins can see all teams
      if (req.userRole === UserRole.ADMIN) {
        const teams = await storage.getTeams();
        return res.json(teams);
      }
      
      // Company admins can see teams in their organization
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        const teams = await storage.getTeams(req.organizationId);
        return res.json(teams);
      }
      
      // Team managers can see their team
      if (req.userRole === UserRole.TEAM_MANAGER && req.teamId) {
        const team = await storage.getTeam(req.teamId);
        return res.json(team ? [team] : []);
      }
      
      // Regular users can see their team if they're part of one
      if (req.teamId) {
        const team = await storage.getTeam(req.teamId);
        return res.json(team ? [team] : []);
      }
      
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching teams', error: (error as Error).message });
    }
  });

  app.post('/api/teams', adminAndCompanyAdmin, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      
      // Company admins can only create teams in their own organization
      if (req.userRole === UserRole.COMPANY_ADMIN && 
          teamData.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          message: 'Forbidden: You can only create teams in your own organization' 
        });
      }
      
      const team = await storage.createTeam(teamData);
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ message: 'Invalid team data', error: (error as Error).message });
    }
  });

  app.get('/api/teams/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (req.userRole === UserRole.ADMIN) {
        // Admins can see any team
        return res.json(team);
      }
      
      if (req.userRole === UserRole.COMPANY_ADMIN && 
          team.organizationId === req.organizationId) {
        // Company admins can see teams in their organization
        return res.json(team);
      }
      
      if ((req.userRole === UserRole.TEAM_MANAGER || req.userRole === UserRole.USER) && 
          req.teamId === teamId) {
        // Team managers and users can see their own team
        return res.json(team);
      }
      
      return res.status(403).json({ message: 'Forbidden: You cannot access this team' });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team', error: (error as Error).message });
    }
  });

  app.patch('/api/teams/:id', managerAndAbove, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (req.userRole === UserRole.ADMIN) {
        // Admins can update any team
      } else if (req.userRole === UserRole.COMPANY_ADMIN && 
                team.organizationId === req.organizationId) {
        // Company admins can update teams in their organization
      } else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId) {
        // Team managers can update their own team
        // But they cannot change the organizationId
        const { organizationId, ...allowedFields } = req.body;
        req.body = allowedFields;
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot modify this team' });
      }
      
      const updatedTeam = await storage.updateTeam(teamId, req.body);
      res.json(updatedTeam);
    } catch (error) {
      res.status(500).json({ message: 'Error updating team', error: (error as Error).message });
    }
  });

  app.delete('/api/teams/:id', adminAndCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Company admins can only delete teams in their organization
      if (req.userRole === UserRole.COMPANY_ADMIN && 
          team.organizationId !== req.organizationId) {
        return res.status(403).json({ 
          message: 'Forbidden: You can only delete teams in your own organization' 
        });
      }
      
      const success = await storage.deleteTeam(teamId);
      if (!success) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting team', error: (error as Error).message });
    }
  });

  // Get users in a team
  app.get('/api/teams/:id/users', managerAndAbove, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (req.userRole === UserRole.ADMIN) {
        // Admins can see users in any team
      } else if (req.userRole === UserRole.COMPANY_ADMIN && 
                team.organizationId === req.organizationId) {
        // Company admins can see users in teams in their organization
      } else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId) {
        // Team managers can see users in their own team
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot access users in this team' });
      }
      
      const users = await storage.getUsersByTeam(teamId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team users', error: (error as Error).message });
    }
  });

  // Get users in an organization
  app.get('/api/organizations/:id/users', adminAndCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = parseInt(id);
      
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Company admins can only see users in their own organization
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId !== orgId) {
        return res.status(403).json({ 
          message: 'Forbidden: You can only view users in your own organization' 
        });
      }
      
      const users = await storage.getUsersByOrganization(orgId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching organization users', error: (error as Error).message });
    }
  });

  // Calendar Integration Routes
  app.get('/api/integrations', async (req, res) => {
    try {
      const integrations = await storage.getCalendarIntegrations(req.userId);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching integrations', error: (error as Error).message });
    }
  });

  // Google Calendar Integration
  app.get('/api/integrations/google/auth', async (req, res) => {
    try {
      const { name } = req.query;
      const calendarName = typeof name === 'string' ? name : 'My Google Calendar';
      
      const service = new GoogleCalendarService(req.userId);
      const authUrl = await service.getAuthUrl();
      res.json({ authUrl, name: calendarName });
    } catch (error) {
      res.status(500).json({ message: 'Error generating auth URL', error: (error as Error).message });
    }
  });

  app.get('/api/integrations/google/callback', async (req, res) => {
    try {
      console.log('Google auth callback received with params:', req.query);
      const { code, state, error } = req.query;
      
      // Check if there was an error in the OAuth process
      if (error) {
        console.error('OAuth error received:', error);
        return res.redirect(`/settings?error=google_auth_failed&reason=${encodeURIComponent(error as string)}`);
      }
      
      if (!code || typeof code !== 'string') {
        console.error('No code parameter received in Google OAuth callback');
        return res.status(400).json({ message: 'Invalid auth code' });
      }
      
      // Parse the state parameter which may contain custom calendar name
      let calendarName = 'My Google Calendar';
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            calendarName = stateData.name;
          }
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }
      
      console.log('Attempting to exchange auth code for tokens...');
      const service = new GoogleCalendarService(req.userId);
      const integration = await service.handleAuthCallback(code, 'primary', calendarName);
      console.log('Successfully obtained tokens and created integration');
      
      // Set as primary if it's the first Google Calendar for this user
      const googleCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'google');
      
      if (googleCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
        
        // Update user settings to use this as the default calendar
        const settings = await storage.getSettings(req.userId);
        if (settings) {
          await storage.updateSettings(req.userId, { 
            defaultCalendar: 'google',
            defaultCalendarIntegrationId: integration.id
          });
        }
      }
      
      res.redirect('/settings?success=google_connected');
    } catch (error) {
      console.error('Error handling Google auth callback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.redirect(`/settings?error=google_auth_failed&reason=${encodeURIComponent(errorMessage)}`);
    }
  });

  app.post('/api/integrations/google/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to disconnect this calendar' });
      }
      
      // Check if this is the primary calendar
      const isPrimary = integration.isPrimary;
      
      const service = new GoogleCalendarService(req.userId);
      const success = await service.disconnect();
      
      if (success) {
        // If this was the primary calendar, set another one as primary if available
        if (isPrimary) {
          const remainingCalendars = (await storage.getCalendarIntegrations(req.userId))
            .filter(cal => cal.type === 'google' && cal.id !== integrationId);
          
          if (remainingCalendars.length > 0) {
            const newPrimary = remainingCalendars[0];
            await storage.updateCalendarIntegration(newPrimary.id, { isPrimary: true });
            
            // Update settings to use the new primary calendar
            const settings = await storage.getSettings(req.userId);
            if (settings) {
              await storage.updateSettings(req.userId, { defaultCalendarIntegrationId: newPrimary.id });
            }
          }
        }
        
        res.json({ message: 'Successfully disconnected from Google Calendar' });
      } else {
        res.status(500).json({ message: 'Failed to disconnect from Google Calendar' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from Google Calendar', error: (error as Error).message });
    }
  });
  
  // Set a Google Calendar as primary
  app.post('/api/integrations/google/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'google') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }
      
      // Clear primary flag from all other Google calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'google' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'google',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Calendar set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting calendar as primary', error: (error as Error).message });
    }
  });

  // Outlook Calendar Integration
  app.get('/api/integrations/outlook/auth', async (req, res) => {
    try {
      const { name } = req.query;
      const calendarName = typeof name === 'string' ? name : 'My Outlook Calendar';
      
      const service = new OutlookCalendarService(req.userId);
      const authUrl = await service.getAuthUrl();
      res.json({ authUrl, name: calendarName });
    } catch (error) {
      res.status(500).json({ message: 'Error generating auth URL', error: (error as Error).message });
    }
  });

  app.get('/api/integrations/outlook/callback', async (req, res) => {
    try {
      console.log('Outlook auth callback received with params:', req.query);
      const { code, state, error } = req.query;
      
      // Check if there was an error in the OAuth process
      if (error) {
        console.error('OAuth error received:', error);
        return res.redirect(`/settings?error=outlook_auth_failed&reason=${encodeURIComponent(error as string)}`);
      }
      
      if (!code || typeof code !== 'string') {
        console.error('No code parameter received in Outlook OAuth callback');
        return res.status(400).json({ message: 'Invalid auth code' });
      }
      
      // Parse the state parameter which may contain custom calendar name
      let calendarName = 'My Outlook Calendar';
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            calendarName = stateData.name;
          }
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }
      
      console.log('Attempting to exchange auth code for tokens...');
      const service = new OutlookCalendarService(req.userId);
      const integration = await service.handleAuthCallback(code, 'primary', calendarName);
      console.log('Successfully obtained tokens and created integration');
      
      // Set as primary if it's the first Outlook Calendar for this user
      const outlookCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'outlook');
      
      if (outlookCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
        
        // Update user settings if no Google calendar is set as default
        const googleCalendars = (await storage.getCalendarIntegrations(req.userId))
          .filter(cal => cal.type === 'google' && cal.isPrimary);
        
        if (googleCalendars.length === 0) {
          const settings = await storage.getSettings(req.userId);
          if (settings) {
            await storage.updateSettings(req.userId, { 
              defaultCalendar: 'outlook',
              defaultCalendarIntegrationId: integration.id
            });
          }
        }
      }
      
      res.redirect('/settings?success=outlook_connected');
    } catch (error) {
      console.error('Error handling Outlook auth callback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.redirect(`/settings?error=outlook_auth_failed&reason=${encodeURIComponent(errorMessage)}`);
    }
  });

  app.post('/api/integrations/outlook/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to disconnect this calendar' });
      }
      
      // Check if this is the primary calendar
      const isPrimary = integration.isPrimary;
      
      const service = new OutlookCalendarService(req.userId);
      const success = await service.disconnect();
      
      if (success) {
        // If this was the primary calendar, set another one as primary if available
        if (isPrimary) {
          const remainingCalendars = (await storage.getCalendarIntegrations(req.userId))
            .filter(cal => cal.type === 'outlook' && cal.id !== integrationId);
          
          if (remainingCalendars.length > 0) {
            const newPrimary = remainingCalendars[0];
            await storage.updateCalendarIntegration(newPrimary.id, { isPrimary: true });
            
            // Update settings to use the new primary calendar if Outlook was the default
            const settings = await storage.getSettings(req.userId);
            if (settings && settings.defaultCalendar === 'outlook') {
              await storage.updateSettings(req.userId, { defaultCalendarIntegrationId: newPrimary.id });
            }
          } else {
            // If no more Outlook calendars, check if there's a Google calendar to set as default
            const googleCalendars = (await storage.getCalendarIntegrations(req.userId))
              .filter(cal => cal.type === 'google');
            
            if (googleCalendars.length > 0) {
              const googlePrimary = googleCalendars.find(cal => cal.isPrimary) || googleCalendars[0];
              
              const settings = await storage.getSettings(req.userId);
              if (settings && settings.defaultCalendar === 'outlook') {
                await storage.updateSettings(req.userId, { 
                  defaultCalendar: 'google',
                  defaultCalendarIntegrationId: googlePrimary.id
                });
              }
            }
          }
        }
        
        res.json({ message: 'Successfully disconnected from Outlook Calendar' });
      } else {
        res.status(500).json({ message: 'Failed to disconnect from Outlook Calendar' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from Outlook Calendar', error: (error as Error).message });
    }
  });
  
  // Set an Outlook Calendar as primary
  app.post('/api/integrations/outlook/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'outlook') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }
      
      // Clear primary flag from all other Outlook calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'outlook' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'outlook',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Calendar set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting calendar as primary', error: (error as Error).message });
    }
  });

  // iCalendar Integration
  app.post('/api/integrations/ical/connect', async (req, res) => {
    try {
      const { calendarUrl, name } = z.object({
        calendarUrl: z.string().url(),
        name: z.string().optional()
      }).parse(req.body);
      
      const calendarName = name || 'My iCalendar';
      
      const service = new ICalendarService(req.userId);
      const integration = await service.connect(calendarUrl);
      
      // Update the integration name
      await storage.updateCalendarIntegration(integration.id, { name: calendarName });
      
      // Set as primary if it's the first iCalendar for this user
      const icalCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'ical');
      
      if (icalCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
        
        // Update user settings if no Google or Outlook calendar is set as default
        const otherCalendars = (await storage.getCalendarIntegrations(req.userId))
          .filter(cal => (cal.type === 'google' || cal.type === 'outlook') && cal.isPrimary);
        
        if (otherCalendars.length === 0) {
          const settings = await storage.getSettings(req.userId);
          if (settings) {
            await storage.updateSettings(req.userId, { 
              defaultCalendar: 'ical',
              defaultCalendarIntegrationId: integration.id
            });
          }
        }
      }
      
      res.json({ message: 'Successfully connected to iCalendar' });
    } catch (error) {
      res.status(500).json({ message: 'Error connecting to iCalendar', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/ical/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to disconnect this calendar' });
      }
      
      // Check if this is the primary calendar
      const isPrimary = integration.isPrimary;
      
      const service = new ICalendarService(req.userId);
      const success = await service.disconnect();
      
      if (success) {
        // If this was the primary calendar, set another one as primary if available
        if (isPrimary) {
          const remainingCalendars = (await storage.getCalendarIntegrations(req.userId))
            .filter(cal => cal.type === 'ical' && cal.id !== integrationId);
          
          if (remainingCalendars.length > 0) {
            const newPrimary = remainingCalendars[0];
            await storage.updateCalendarIntegration(newPrimary.id, { isPrimary: true });
            
            // Update settings to use the new primary calendar if iCal was the default
            const settings = await storage.getSettings(req.userId);
            if (settings && settings.defaultCalendar === 'ical') {
              await storage.updateSettings(req.userId, { defaultCalendarIntegrationId: newPrimary.id });
            }
          } else {
            // If no more iCal calendars, check if there's another calendar to set as default
            const otherCalendars = (await storage.getCalendarIntegrations(req.userId));
            
            if (otherCalendars.length > 0) {
              // Prefer Google over Outlook
              const googleCalendars = otherCalendars.filter(cal => cal.type === 'google');
              const outlookCalendars = otherCalendars.filter(cal => cal.type === 'outlook');
              
              let newDefault;
              let newType;
              
              if (googleCalendars.length > 0) {
                newDefault = googleCalendars.find(cal => cal.isPrimary) || googleCalendars[0];
                newType = 'google';
              } else if (outlookCalendars.length > 0) {
                newDefault = outlookCalendars.find(cal => cal.isPrimary) || outlookCalendars[0];
                newType = 'outlook';
              }
              
              if (newDefault) {
                const settings = await storage.getSettings(req.userId);
                if (settings && settings.defaultCalendar === 'ical') {
                  await storage.updateSettings(req.userId, { 
                    defaultCalendar: newType,
                    defaultCalendarIntegrationId: newDefault.id
                  });
                }
              }
            }
          }
        }
        
        res.json({ message: 'Successfully disconnected from iCalendar' });
      } else {
        res.status(500).json({ message: 'Failed to disconnect from iCalendar' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from iCalendar', error: (error as Error).message });
    }
  });
  
  // Set an iCalendar as primary
  app.post('/api/integrations/ical/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'ical') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }
      
      // Clear primary flag from all other iCalendar calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'ical' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'ical',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Calendar set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting calendar as primary', error: (error as Error).message });
    }
  });

  // Event Routes
  app.get('/api/events', async (req, res) => {
    try {
      const { start, end } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (start && typeof start === 'string') {
        startDate = new Date(start);
      }
      
      if (end && typeof end === 'string') {
        endDate = new Date(end);
      }
      
      const events = await storage.getEvents(req.userId, startDate, endDate);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching events', error: (error as Error).message });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to access this event' });
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching event', error: (error as Error).message });
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: req.userId
      });
      
      // Get user settings to determine which calendar to use
      const settings = await storage.getSettings(req.userId);
      const calendarType = settings?.defaultCalendar || 'google';
      const calendarIntegrationId = settings?.defaultCalendarIntegrationId;
      
      let createdEvent;
      
      // If a specific calendar integration was requested in the request
      const requestedCalendarId = eventData.calendarIntegrationId;
      if (requestedCalendarId) {
        // Verify the calendar belongs to the user
        const calendarIntegration = await storage.getCalendarIntegration(requestedCalendarId);
        if (!calendarIntegration || calendarIntegration.userId !== req.userId) {
          return res.status(403).json({ message: 'Not authorized to use this calendar' });
        }
        
        // Use the requested calendar's type
        const type = calendarIntegration.type;
        
        // Create event in the specific calendar service
        if (type === 'google') {
          const service = new GoogleCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          }
        } else if (type === 'outlook') {
          const service = new OutlookCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          }
        } else if (type === 'ical') {
          const service = new ICalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: type,
              calendarIntegrationId: requestedCalendarId
            });
          }
        } else {
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local',
            calendarIntegrationId: requestedCalendarId
          });
        }
      }
      // Use the default calendar from settings
      else if (calendarIntegrationId) {
        // Get the calendar integration
        const calendarIntegration = await storage.getCalendarIntegration(calendarIntegrationId);
        if (!calendarIntegration) {
          // Default calendar not found, fallback to create a local event
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        } else {
          // Use the default calendar's type
          const type = calendarIntegration.type;
          
          // Create event in the appropriate calendar service
          if (type === 'google') {
            const service = new GoogleCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'outlook') {
            const service = new OutlookCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'ical') {
            const service = new ICalendarService(req.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: 'local',
              calendarIntegrationId
            });
          }
        }
      }
      // Use calendar type without a specific integration
      else {
        // Find the primary calendar of the specified type
        const userCalendars = await storage.getCalendarIntegrations(req.userId);
        const primaryCalendar = userCalendars.find(cal => 
          cal.type === calendarType && cal.isPrimary);
        
        const integrationId = primaryCalendar?.id;
        
        // Create event in the appropriate calendar service
        if (calendarType === 'google') {
          const service = new GoogleCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'outlook') {
          const service = new OutlookCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'ical') {
          const service = new ICalendarService(req.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else {
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        }
      }
      
      // Schedule reminders for the event
      await reminderService.scheduleReminders(createdEvent.id);
      
      res.status(201).json(createdEvent);
    } catch (error) {
      res.status(400).json({ message: 'Invalid event data', error: (error as Error).message });
    }
  });

  app.put('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to modify this event' });
      }
      
      const updateData = req.body;
      let updatedEvent;
      
      // Check if the calendar integration is being changed
      if (updateData.calendarIntegrationId && 
          updateData.calendarIntegrationId !== event.calendarIntegrationId) {
        
        // Verify the calendar belongs to the user
        const calendarIntegration = await storage.getCalendarIntegration(updateData.calendarIntegrationId);
        if (!calendarIntegration || calendarIntegration.userId !== req.userId) {
          return res.status(403).json({ message: 'Not authorized to use this calendar' });
        }
        
        // If moving to a different calendar service, we need to create a new event in the target service
        // and delete the old one from the source service
        if (calendarIntegration.type !== event.calendarType) {
          // First create the new event in the target calendar
          const newEventData = {
            ...event,
            ...updateData,
            calendarType: calendarIntegration.type,
            calendarIntegrationId: updateData.calendarIntegrationId,
            id: undefined,  // Don't include the ID to create a new event
            externalId: undefined  // External ID will be set by the service
          };
          
          // Create in the target calendar service
          let newEvent;
          if (calendarIntegration.type === 'google') {
            const service = new GoogleCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              newEvent = await service.createEvent(newEventData);
            } else {
              newEvent = await storage.createEvent(newEventData);
            }
          } else if (calendarIntegration.type === 'outlook') {
            const service = new OutlookCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              newEvent = await service.createEvent(newEventData);
            } else {
              newEvent = await storage.createEvent(newEventData);
            }
          } else if (calendarIntegration.type === 'ical') {
            const service = new ICalendarService(req.userId);
            if (await service.isAuthenticated()) {
              newEvent = await service.createEvent(newEventData);
            } else {
              newEvent = await storage.createEvent(newEventData);
            }
          } else {
            newEvent = await storage.createEvent({
              ...newEventData,
              calendarType: 'local'
            });
          }
          
          // Now delete the old event from the source calendar
          let deleteSuccess = false;
          if (event.calendarType === 'google') {
            const service = new GoogleCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              deleteSuccess = await service.deleteEvent(eventId);
            } else {
              deleteSuccess = await storage.deleteEvent(eventId);
            }
          } else if (event.calendarType === 'outlook') {
            const service = new OutlookCalendarService(req.userId);
            if (await service.isAuthenticated()) {
              deleteSuccess = await service.deleteEvent(eventId);
            } else {
              deleteSuccess = await storage.deleteEvent(eventId);
            }
          } else if (event.calendarType === 'ical') {
            const service = new ICalendarService(req.userId);
            if (await service.isAuthenticated()) {
              deleteSuccess = await service.deleteEvent(eventId);
            } else {
              deleteSuccess = await storage.deleteEvent(eventId);
            }
          } else {
            deleteSuccess = await storage.deleteEvent(eventId);
          }
          
          if (!deleteSuccess) {
            console.log(`Warning: Failed to delete old event ${eventId} after moving to new calendar`);
          }
          
          // Schedule reminders for the new event
          await reminderService.scheduleReminders(newEvent.id);
          
          return res.json(newEvent);
        }
      }
      
      // If we're not changing calendars or staying in the same calendar type, do a normal update
      if (event.calendarType === 'google') {
        const service = new GoogleCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          updatedEvent = await service.updateEvent(eventId, updateData);
        } else {
          updatedEvent = await storage.updateEvent(eventId, updateData);
        }
      } else if (event.calendarType === 'outlook') {
        const service = new OutlookCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          updatedEvent = await service.updateEvent(eventId, updateData);
        } else {
          updatedEvent = await storage.updateEvent(eventId, updateData);
        }
      } else if (event.calendarType === 'ical') {
        const service = new ICalendarService(req.userId);
        if (await service.isAuthenticated()) {
          updatedEvent = await service.updateEvent(eventId, updateData);
        } else {
          updatedEvent = await storage.updateEvent(eventId, updateData);
        }
      } else {
        updatedEvent = await storage.updateEvent(eventId, updateData);
      }
      
      if (!updatedEvent) {
        return res.status(500).json({ message: 'Failed to update event' });
      }
      
      // Reschedule reminders if the event time changed
      if (updateData.startTime || updateData.reminders) {
        await reminderService.scheduleReminders(eventId);
      }
      
      res.json(updatedEvent);
    } catch (error) {
      res.status(400).json({ message: 'Invalid event data', error: (error as Error).message });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this event' });
      }
      
      let success = false;
      
      // Delete the event from the appropriate calendar service
      if (event.calendarType === 'google') {
        const service = new GoogleCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          success = await service.deleteEvent(eventId);
        } else {
          success = await storage.deleteEvent(eventId);
        }
      } else if (event.calendarType === 'outlook') {
        const service = new OutlookCalendarService(req.userId);
        if (await service.isAuthenticated()) {
          success = await service.deleteEvent(eventId);
        } else {
          success = await storage.deleteEvent(eventId);
        }
      } else if (event.calendarType === 'ical') {
        const service = new ICalendarService(req.userId);
        if (await service.isAuthenticated()) {
          success = await service.deleteEvent(eventId);
        } else {
          success = await storage.deleteEvent(eventId);
        }
      } else {
        success = await storage.deleteEvent(eventId);
      }
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete event' });
      }
      
      // Clear any scheduled reminders
      reminderService.clearReminders(eventId);
      
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting event', error: (error as Error).message });
    }
  });

  // Test endpoint for sending email notifications (admin only)
  // Email testing endpoint
  app.post('/api/test/send-email', authMiddleware, adminOnly, async (req, res) => {
    try {
      const { emailType, recipientEmail } = req.body;
      const user = await storage.getUser(req.userId);
      
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      
      // Use the provided recipient email or fallback to the user's email
      const to = recipientEmail || user.email;
      
      if (!to) {
        return res.status(400).json({ message: 'No recipient email provided and user has no email' });
      }
      
      // Create a test event
      const testEvent = {
        userId: req.userId,
        title: 'Test Event',
        description: 'This is a test event for email notifications',
        startTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        endTime: new Date(Date.now() + 90 * 60 * 1000),   // 90 minutes from now
        location: 'Virtual Meeting',
        meetingUrl: 'https://meet.example.com/test',
        isAllDay: false,
        externalId: null,
        calendarType: 'local',
        calendarIntegrationId: null,
        reminders: [15],
        recurrence: null,
        timezone: user.timezone || 'UTC',
        attendees: [to],
        id: 999 // This will be added by the database, but we need it for the test
      } as unknown as Event;
      
      let success = false;
      
      if (emailType === 'reminder') {
        // Send a reminder
        success = await emailService.sendEventReminder(testEvent, to, 15);
      } else if (emailType === 'booking') {
        // Send a booking confirmation
        success = await emailService.sendBookingConfirmation(
          testEvent,
          to, // host
          'guest@example.com' // guest
        );
      } else {
        // Default simple email
        success = await emailService.sendEmail({
          to,
          subject: 'Test Email from Smart Scheduler',
          text: 'This is a test email from your Smart Scheduler application.',
          html: '<p>This is a <strong>test email</strong> from your Smart Scheduler application.</p>'
        });
      }
      
      // Log API key status (without exposing the key)
      const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
      console.log(`SendGrid API key is ${hasSendGridKey ? 'configured' : 'NOT configured'}`);

      if (success) {
        res.json({ 
          message: 'Test email sent successfully',
          details: {
            to,
            emailType,
            sendGridConfigured: hasSendGridKey
          }
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to send test email', 
          details: {
            to,
            emailType,
            sendGridConfigured: hasSendGridKey
          }
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Error sending test email', error: (error as Error).message });
    }
  });

  // Booking Link Routes
  app.get('/api/booking', async (req, res) => {
    try {
      const bookingLinks = await storage.getBookingLinks(req.userId);
      res.json(bookingLinks);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking links', error: (error as Error).message });
    }
  });

  app.post('/api/booking', async (req, res) => {
    try {
      const bookingLinkData = insertBookingLinkSchema.parse({
        ...req.body,
        userId: req.userId
      });
      
      const existingLink = await storage.getBookingLinkBySlug(bookingLinkData.slug);
      if (existingLink) {
        return res.status(400).json({ message: 'This slug is already in use' });
      }
      
      const bookingLink = await storage.createBookingLink(bookingLinkData);
      res.status(201).json(bookingLink);
    } catch (error) {
      res.status(400).json({ message: 'Invalid booking link data', error: (error as Error).message });
    }
  });

  app.get('/api/booking/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const bookingLinkId = parseInt(id);
      
      if (isNaN(bookingLinkId)) {
        return res.status(400).json({ message: 'Invalid booking link ID' });
      }
      
      const bookingLink = await storage.getBookingLink(bookingLinkId);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      if (bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to access this booking link' });
      }
      
      res.json(bookingLink);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking link', error: (error as Error).message });
    }
  });

  app.put('/api/booking/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const bookingLinkId = parseInt(id);
      
      if (isNaN(bookingLinkId)) {
        return res.status(400).json({ message: 'Invalid booking link ID' });
      }
      
      const bookingLink = await storage.getBookingLink(bookingLinkId);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      if (bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to modify this booking link' });
      }
      
      // Check slug uniqueness if it's being changed
      if (req.body.slug && req.body.slug !== bookingLink.slug) {
        const existingLink = await storage.getBookingLinkBySlug(req.body.slug);
        if (existingLink) {
          return res.status(400).json({ message: 'This slug is already in use' });
        }
      }
      
      const updatedBookingLink = await storage.updateBookingLink(bookingLinkId, req.body);
      
      if (!updatedBookingLink) {
        return res.status(500).json({ message: 'Failed to update booking link' });
      }
      
      res.json(updatedBookingLink);
    } catch (error) {
      res.status(400).json({ message: 'Invalid booking link data', error: (error as Error).message });
    }
  });

  app.delete('/api/booking/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const bookingLinkId = parseInt(id);
      
      if (isNaN(bookingLinkId)) {
        return res.status(400).json({ message: 'Invalid booking link ID' });
      }
      
      const bookingLink = await storage.getBookingLink(bookingLinkId);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      if (bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this booking link' });
      }
      
      const success = await storage.deleteBookingLink(bookingLinkId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete booking link' });
      }
      
      res.json({ message: 'Booking link deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting booking link', error: (error as Error).message });
    }
  });

  // Public API for booking
  app.get('/api/public/booking/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({ message: 'Booking link not found or inactive' });
      }
      
      // Get the owner's information
      const owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Return booking link data without sensitive information
      res.json({
        id: bookingLink.id,
        title: bookingLink.title,
        description: bookingLink.description,
        duration: bookingLink.duration,
        availableDays: bookingLink.availableDays,
        availableHours: bookingLink.availableHours,
        ownerName: owner.displayName || owner.username,
        ownerTimezone: owner.timezone
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking link', error: (error as Error).message });
    }
  });

  app.post('/api/public/booking/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({ message: 'Booking link not found or inactive' });
      }
      
      // Validate the booking data
      const bookingData = insertBookingSchema.omit({ eventId: true }).parse({
        ...req.body,
        bookingLinkId: bookingLink.id
      });
      
      // Ensure the booking is within available hours
      const startTime = new Date(bookingData.startTime);
      const endTime = new Date(bookingData.endTime);
      
      // Calculate duration in minutes
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      if (durationMinutes !== bookingLink.duration) {
        return res.status(400).json({ message: 'Booking duration does not match expected duration' });
      }
      
      // Check if the booking respects the lead time (minimum notice)
      const now = new Date();
      const minutesUntilMeeting = (startTime.getTime() - now.getTime()) / (1000 * 60);
      
      const leadTime = bookingLink.leadTime ?? 0; // Default to 0 if null
      if (minutesUntilMeeting < leadTime) {
        return res.status(400).json({ 
          message: `Booking must be made at least ${leadTime} minutes in advance` 
        });
      }
      
      // Check if there are any existing bookings for this user on the same day
      const dayStart = new Date(startTime);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(startTime);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Get all events for the user on this day
      const userEvents = await storage.getEvents(bookingLink.userId, dayStart, dayEnd);
      
      // Check max bookings per day limit
      const maxBookingsPerDay = bookingLink.maxBookingsPerDay ?? 0; // Default to 0 if null
      if (maxBookingsPerDay > 0) {
        const existingBookingsCount = userEvents.length;
        
        if (existingBookingsCount >= maxBookingsPerDay) {
          return res.status(400).json({ 
            message: `Maximum number of bookings for this day has been reached` 
          });
        }
      }
      
      // Check for conflicts with existing events, considering buffer times
      const bufferBefore = bookingLink.bufferBefore ?? 0; // Default to 0 if null
      const bufferAfter = bookingLink.bufferAfter ?? 0; // Default to 0 if null
      
      const bufferBeforeTime = new Date(startTime);
      bufferBeforeTime.setMinutes(bufferBeforeTime.getMinutes() - bufferBefore);
      
      const bufferAfterTime = new Date(endTime);
      bufferAfterTime.setMinutes(bufferAfterTime.getMinutes() + bufferAfter);
      
      // Check for conflicts with existing events, including buffer times
      const hasConflict = userEvents.some(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        
        // Check if the new event (with buffers) overlaps with any existing event
        return (
          (bufferBeforeTime <= eventEnd && bufferAfterTime >= eventStart) ||
          (eventStart <= bufferAfterTime && eventEnd >= bufferBeforeTime)
        );
      });
      
      if (hasConflict) {
        return res.status(400).json({ 
          message: `This time slot conflicts with an existing event (including buffer time)` 
        });
      }
      
      // Create the booking
      const booking = await storage.createBooking(bookingData);
      
      // Create an event for the booking
      const eventData = {
        userId: bookingLink.userId,
        title: `Booking: ${bookingData.name}`,
        description: bookingData.notes || `Booking from ${bookingData.name} (${bookingData.email})`,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        attendees: [bookingData.email],
        reminders: [15],
        timezone: (await storage.getUser(bookingLink.userId))?.timezone || 'UTC'
      };
      
      // Get user settings to determine which calendar to use
      const settings = await storage.getSettings(bookingLink.userId);
      const calendarType = settings?.defaultCalendar || 'google';
      const calendarIntegrationId = settings?.defaultCalendarIntegrationId;
      
      let createdEvent;
      
      // Use the default calendar integration from settings
      if (calendarIntegrationId) {
        // Get the calendar integration
        const calendarIntegration = await storage.getCalendarIntegration(calendarIntegrationId);
        if (!calendarIntegration) {
          // Default calendar not found, fallback to create a local event
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        } else {
          // Use the default calendar's type
          const type = calendarIntegration.type;
          
          // Create event in the appropriate calendar service
          if (type === 'google') {
            const service = new GoogleCalendarService(bookingLink.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'outlook') {
            const service = new OutlookCalendarService(bookingLink.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else if (type === 'ical') {
            const service = new ICalendarService(bookingLink.userId);
            if (await service.isAuthenticated()) {
              createdEvent = await service.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            } else {
              createdEvent = await storage.createEvent({
                ...eventData,
                calendarType: type,
                calendarIntegrationId
              });
            }
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType: 'local',
              calendarIntegrationId
            });
          }
        }
      }
      // Use calendar type without a specific integration
      else {
        // Find the primary calendar of the specified type
        const userCalendars = await storage.getCalendarIntegrations(bookingLink.userId);
        const primaryCalendar = userCalendars.find(cal => 
          cal.type === calendarType && cal.isPrimary);
        
        const integrationId = primaryCalendar?.id;
        
        // Create event in the appropriate calendar service
        if (calendarType === 'google') {
          const service = new GoogleCalendarService(bookingLink.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'outlook') {
          const service = new OutlookCalendarService(bookingLink.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else if (calendarType === 'ical') {
          const service = new ICalendarService(bookingLink.userId);
          if (await service.isAuthenticated()) {
            createdEvent = await service.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          } else {
            createdEvent = await storage.createEvent({
              ...eventData,
              calendarType,
              calendarIntegrationId: integrationId
            });
          }
        } else {
          createdEvent = await storage.createEvent({
            ...eventData,
            calendarType: 'local'
          });
        }
      }
      
      // Update the booking with the event ID
      await storage.updateBooking(booking.id, { eventId: createdEvent.id });
      
      // Schedule reminders for the event
      await reminderService.scheduleReminders(createdEvent.id);
      
      res.status(201).json({
        id: booking.id,
        name: booking.name,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid booking data', error: (error as Error).message });
    }
  });

  // Settings Routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings(req.userId);
      
      if (!settings) {
        // Create default settings if they don't exist
        const defaultSettings = await storage.createSettings({
          userId: req.userId,
          defaultReminders: [15],
          emailNotifications: true,
          pushNotifications: true,
          defaultCalendar: 'google',
          defaultMeetingDuration: 30,
          workingHours: {
            0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
            1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
            2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
            3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
            4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
            5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
            6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
          },
          timeFormat: '12h'
        });
        
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching settings', error: (error as Error).message });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const updateData = insertSettingsSchema.partial().parse({
        ...req.body,
        userId: req.userId
      });
      
      let settings = await storage.getSettings(req.userId);
      
      if (!settings) {
        // Create settings if they don't exist
        settings = await storage.createSettings({
          ...updateData,
          userId: req.userId
        });
      } else {
        // Update existing settings
        settings = await storage.updateSettings(req.userId, updateData);
      }
      
      if (!settings) {
        return res.status(500).json({ message: 'Failed to update settings' });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: 'Invalid settings data', error: (error as Error).message });
    }
  });

  // Calendar Integrations API
  app.get('/api/integrations', async (req, res) => {
    try {
      const integrations = await storage.getCalendarIntegrations(req.userId);
      // Group by type
      const grouped = integrations.reduce((acc, integration) => {
        if (!acc[integration.type]) {
          acc[integration.type] = [];
        }
        acc[integration.type].push(integration);
        return acc;
      }, {} as Record<string, any[]>);
      
      res.json(grouped);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching calendar integrations', error: (error as Error).message });
    }
  });
  
  // Time Zone API
  app.get('/api/timezones', (_req, res) => {
    res.json(popularTimeZones);
  });

  app.get('/api/timezones/detect', (_req, res) => {
    const detectedTimezone = timeZoneService.getUserTimeZone();
    res.json({ timezone: detectedTimezone });
  });

  // Sync API
  app.post('/api/sync', async (req, res) => {
    try {
      const { calendarType, integrationId } = z.object({
        calendarType: z.enum(['google', 'outlook', 'ical']),
        integrationId: z.number().optional()
      }).parse(req.body);
      
      // If specific integration ID is provided, sync only that one
      if (integrationId) {
        const integration = await storage.getCalendarIntegration(integrationId);
        if (!integration || integration.userId !== req.userId || integration.type !== calendarType) {
          return res.status(403).json({ message: 'Not authorized to access this calendar integration' });
        }
        
        let success = false;
        
        if (calendarType === 'google') {
          const service = new GoogleCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            await service.syncEvents();
            success = true;
          }
        } else if (calendarType === 'outlook') {
          const service = new OutlookCalendarService(req.userId);
          if (await service.isAuthenticated()) {
            await service.syncEvents();
            success = true;
          }
        } else if (calendarType === 'ical') {
          const service = new ICalendarService(req.userId);
          if (await service.isAuthenticated()) {
            await service.syncEvents();
            success = true;
          }
        }
        
        if (success) {
          // Update the last synced timestamp
          await storage.updateCalendarIntegration(integrationId, {
            lastSynced: new Date()
          });
          res.json({ message: `Successfully synced calendar` });
        } else {
          res.status(400).json({ message: `Not authenticated with this calendar integration` });
        }
      }
      // Sync all calendars of the given type
      else {
        const integrations = (await storage.getCalendarIntegrations(req.userId))
          .filter(integration => integration.type === calendarType);
        
        if (integrations.length === 0) {
          return res.status(404).json({ message: `No ${calendarType} calendars found` });
        }
        
        let syncedCount = 0;
        const failed: number[] = [];
        
        // Try to sync each integration
        for (const integration of integrations) {
          try {
            let success = false;
            
            if (calendarType === 'google') {
              const service = new GoogleCalendarService(req.userId);
              if (await service.isAuthenticated()) {
                await service.syncEvents();
                success = true;
              }
            } else if (calendarType === 'outlook') {
              const service = new OutlookCalendarService(req.userId);
              if (await service.isAuthenticated()) {
                await service.syncEvents();
                success = true;
              }
            } else if (calendarType === 'ical') {
              const service = new ICalendarService(req.userId);
              if (await service.isAuthenticated()) {
                await service.syncEvents();
                success = true;
              }
            }
            
            if (success) {
              // Update the last synced timestamp
              await storage.updateCalendarIntegration(integration.id, {
                lastSynced: new Date()
              });
              syncedCount++;
            } else {
              failed.push(integration.id);
            }
          } catch (err) {
            console.error(`Error syncing calendar ${integration.id}:`, err);
            failed.push(integration.id);
          }
        }
        
        if (syncedCount > 0) {
          res.json({ 
            message: `Successfully synced ${syncedCount} calendar(s)`,
            syncedCount,
            totalCount: integrations.length,
            failedIds: failed
          });
        } else {
          res.status(400).json({ 
            message: `Failed to sync any calendars`,
            syncedCount: 0,
            totalCount: integrations.length,
            failedIds: failed
          });
        }
      }
    } catch (error) {
      res.status(500).json({ message: 'Error syncing calendar', error: (error as Error).message });
    }
  });

  // Debug route to check email configuration (admin only)
  app.get('/api/debug/email-config', authMiddleware, adminOnly, async (req, res) => {
    try {
      const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
      
      res.json({
        emailServiceConfigured: hasSendGridKey,
        fromEmail: 'app@mysmartscheduler.co'
      });
    } catch (error) {
      console.error('Error checking email config:', error);
      res.status(500).json({ 
        message: 'Error checking email configuration',
        error: (error as Error).message 
      });
    }
  });

  return httpServer;
}
