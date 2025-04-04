import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fs from "fs";
import path from "path";
import * as crypto from "crypto";
import { 
  insertUserSchema, insertEventSchema, insertBookingLinkSchema, 
  insertBookingSchema, insertSettingsSchema, insertOrganizationSchema, insertTeamSchema,
  CalendarIntegration, UserRole, Team, Event
} from "@shared/schema";
import { GoogleCalendarService } from "./calendarServices/googleCalendar";
import { OutlookCalendarService } from "./calendarServices/outlookCalendar";
import { ICalendarService } from "./calendarServices/iCalendarService";
import { ZapierService } from "./calendarServices/zapierService";
import { ZoomService } from "./calendarServices/zoomService";
import { reminderService } from "./utils/reminderService";
import { timeZoneService, popularTimeZones } from "./utils/timeZoneService";
import { emailService } from "./utils/emailService";
import { teamSchedulingService } from "./utils/teamSchedulingService";
import { passwordResetService } from './utils/passwordResetUtils';
import { emailVerificationService } from './utils/emailVerificationUtils';

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
      console.log('Fetched users:', users);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      
      // Get team members and their events
      const users = await storage.getUsersByTeam(teamId);
      const events = [];
      
      for (const user of users) {
        // We're checking a default 30-day window
        const now = new Date();
        const thirtyDaysLater = new Date(now);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        const userEvents = await storage.getEvents(user.id, now, thirtyDaysLater);
        events.push(...userEvents.map(event => ({
          ...event,
          userName: user.displayName || user.username
        })));
      }
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team events', error: (error as Error).message });
    }
  });
  
  // Get team availability - find common free time slots for team members
  app.get('/api/teams/:id/availability', authMiddleware, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // Default to 7 days if no end date
      
      const duration = parseInt(req.query.duration as string || '30'); // Default to 30 minutes
      const bufferBefore = parseInt(req.query.bufferBefore as string || '0');
      const bufferAfter = parseInt(req.query.bufferAfter as string || '0');
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === team.organizationId) &&
        !(req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId) &&
        !(req.teamId === teamId) // Allow team members to view their team's availability
      ) {
        return res.status(403).json({ message: 'You do not have access to this team' });
      }
      
      // Get team members
      const users = await storage.getUsersByTeam(teamId);
      const teamMemberIds = users.map(user => user.id);
      
      // Find common availability
      const availableSlots = await teamSchedulingService.findCommonAvailability(
        teamMemberIds,
        startDate,
        endDate,
        duration,
        bufferBefore,
        bufferAfter
      );
      
      res.json(availableSlots);
    } catch (error) {
      res.status(500).json({ message: 'Error finding team availability', error: (error as Error).message });
    }
  });
  
  // User routes
  app.post('/api/register', async (req, res) => {
    try {
      // Extract additional fields from request body
      const { isCompanyAccount, companyName, trialEndDate, ...userDataRaw } = req.body;
      
      // Parse the base user data with our schema
      const userData = insertUserSchema.parse(userDataRaw);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      let user;
      // For company accounts, create organization and team
      if (isCompanyAccount && companyName) {
        try {
          // Create the company/organization
          const organization = await storage.createOrganization({
            name: companyName,
            description: `${companyName} organization`,
          });
          
          // Create the user with organization link and emailVerified set to false
          user = await storage.createUser({
            ...userData,
            emailVerified: false,
            organizationId: organization.id
          });
          
          // Create "Team A" for this organization
          const team = await storage.createTeam({
            name: "Team A",
            description: "Default team for " + companyName,
            organizationId: organization.id
          });

          // Generate verification token and send email with enhanced diagnostics
          const emailResult = await sendVerificationEmail(user);
          
          res.status(201).json({ 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role,
            emailVerificationSent: emailResult.success,
            emailVerificationRequired: true,
            emailDeliveryMethod: emailResult.deliveryMethod || null,
            emailMessageId: emailResult.messageId || null,
            sendGridConfigured: !!process.env.SENDGRID_API_KEY,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            verificationTs: Date.now(),
            organizationId: organization.id,
            organization: { id: organization.id, name: organization.name },
            team: { id: team.id, name: team.name }
          });
        } catch (error) {
          res.status(500).json({ 
            message: 'Error creating company account', 
            error: (error as Error).message 
          });
        }
      } else {
        // Create regular user with emailVerified set to false
        user = await storage.createUser({
          ...userData,
          emailVerified: false
        });

        // Generate verification token and send email with enhanced diagnostics
        const emailResult = await sendVerificationEmail(user);

        res.status(201).json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role,
          emailVerificationSent: emailResult.success,
          emailVerificationRequired: true,
          emailDeliveryMethod: emailResult.deliveryMethod || null,
          emailMessageId: emailResult.messageId || null,
          sendGridConfigured: !!process.env.SENDGRID_API_KEY,
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
          verificationTs: Date.now()
        });
      }
    } catch (error) {
      res.status(400).json({ 
        message: 'Invalid user data', 
        error: (error as Error).message 
      });
    }
  });
  
  // Helper function to send verification email
  async function sendVerificationEmail(user: any) {
    try {
      console.log('Preparing to send verification email to user:', {
        id: user.id,
        email: user.email,
        username: user.username
      });
      
      // Log email environment variables (without exposing keys)
      console.log('Email environment check:');
      console.log('- FROM_EMAIL set:', !!process.env.FROM_EMAIL);
      if (process.env.FROM_EMAIL) {
        console.log('- FROM_EMAIL value:', process.env.FROM_EMAIL);
      }
      console.log('- SMTP configuration available:', !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
      
      // Generate a verification token
      const token = emailVerificationService.generateToken(user.id, user.email);
      console.log('Generated verification token:', token.substring(0, 10) + '...');
      
      // Create verification link - always use the production domain for emails
      // Since we want emails to always use the production domain, we'll force it here
      const productionDomain = "https://mysmartscheduler.co";
      console.log('Using production domain for verification link:', productionDomain);
      
      // Log environment variables for debugging
      console.log('Environment variables:');
      console.log('- BASE_URL:', process.env.BASE_URL);
      console.log('- REPL_SLUG:', process.env.REPL_SLUG);
      console.log('- REPL_OWNER:', process.env.REPL_OWNER);
      
      // Use direct API endpoint with production domain
      const verifyLink = `${productionDomain}/api/verify-email?token=${token}`;
      console.log('Verification link:', verifyLink);
      
      // Send verification email with enhanced diagnostics
      console.log('Calling emailService.sendEmailVerificationEmail...');
      const emailResult = await emailService.sendEmailVerificationEmail(user.email, verifyLink);
      
      // Create a result object with detailed delivery information
      const result = {
        success: emailResult.success,
        deliveryMethod: emailResult.method || 'smtp',
        messageId: emailResult.messageId
      };
      
      if (result.success) {
        console.log(`✅ Verification email successfully sent to: ${user.email} via ${result.deliveryMethod}`);
        console.log(`- Message ID: ${result.messageId || 'unknown'}`);
      } else {
        console.error(`❌ Failed to send verification email to: ${user.email}`);
        console.error('Possible reasons for email failure:');
        
        if (!process.env.FROM_EMAIL) {
          console.error('- FROM_EMAIL is not set');
        } else if (!process.env.FROM_EMAIL.includes('@')) {
          console.error('- FROM_EMAIL does not contain a valid email address');
        }
        
        if (!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
          console.error('- SMTP configuration is not complete');
          console.error('  Missing:', [
            !process.env.SMTP_HOST ? 'SMTP_HOST' : null,
            !process.env.SMTP_USER ? 'SMTP_USER' : null,
            !process.env.SMTP_PASS ? 'SMTP_PASS' : null
          ].filter(Boolean).join(', '));
        }
        
        // Log SMTP diagnostics if available
        if (emailResult.smtpDiagnostics) {
          console.error('SMTP diagnostics:', emailResult.smtpDiagnostics);
        }
        
        // Log detailed error information if available
        if ('error' in emailResult && emailResult.error) {
          console.error('Error details:', emailResult.error);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error sending verification email:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      return { success: false, deliveryMethod: 'error', messageId: null };
    }
  }
  
  // Email verification route
  app.get('/api/verify-email', async (req, res) => {
    try {
      const token = req.query.token as string;
      console.log('Received verification request with token:', token ? token.substring(0, 10) + '...' : 'none');
      
      if (!token) {
        console.error('Verification failed: No token provided');
        return res.status(400).json({ success: false, message: 'Token is required' });
      }
      
      // Validate the token and get the user ID
      const userId = emailVerificationService.validateToken(token);
      
      if (!userId) {
        console.error('Verification failed: Invalid or expired token');
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
      }
      
      console.log('Token validated successfully, user ID:', userId);
      
      // Get the user to verify email address
      const user = await storage.getUser(userId);
      if (!user) {
        console.error('Verification failed: User not found');
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      console.log('Found user:', { id: user.id, email: user.email });
      
      // Mark the user's email as verified
      const success = await emailVerificationService.markEmailAsVerified(userId);
      
      if (!success) {
        console.error('Failed to mark email as verified for user:', userId);
        return res.status(500).json({ success: false, message: 'Failed to verify email' });
      }
      
      console.log('Successfully verified email for user:', { id: user.id, email: user.email });
      
      // Consume the token so it can't be used again
      emailVerificationService.consumeToken(token);
      console.log('Verification token consumed');
      
      // Always use the production domain for consistency with the email link
      // Since we're sending emails with the production domain, we need to redirect there
      const productionDomain = "https://mysmartscheduler.co";
      console.log('Using production domain for login redirect:', productionDomain);
      
      // Add a simple HTML response instead of redirecting directly
      // This ensures it works even if API is on a different domain than the frontend
      const loginUrl = `${productionDomain}/login?verified=true`;
      console.log('Login URL for redirection:', loginUrl);
      
      // Return HTML that immediately redirects to the login page
      // This approach works even when the domains don't match
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Email Verified</title>
            <meta http-equiv="refresh" content="0;url=${loginUrl}">
            <script>
              window.location.href = "${loginUrl}";
            </script>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f9f9f9;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              h1 {
                color: #4f46e5;
              }
              p {
                margin: 20px 0;
                line-height: 1.6;
              }
              a {
                display: inline-block;
                padding: 10px 20px;
                background-color: #4f46e5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Email Verified!</h1>
              <p>Your email has been successfully verified. You're being redirected to the login page.</p>
              <p>If you aren't redirected automatically, please click the button below:</p>
              <a href="${loginUrl}">Go to Login Page</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error verifying email:', error);
      console.error('Error stack trace:', error instanceof Error ? error.stack : String(error));
      res.status(500).json({ success: false, message: 'Error verifying email', error: (error as Error).message });
    }
  });

  // Password hashing function (same as in initDB.ts)
  async function hash(password: string): Promise<string> {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string()
      }).parse(req.body);
      
      // Hash the provided password for comparison
      const hashedPassword = await hash(password);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== hashedPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Check if email is verified
      if (user.emailVerified === false) {
        // Regenerate verification token and send a new verification email with enhanced diagnostics
        const emailResult = await sendVerificationEmail(user);
        
        return res.status(403).json({ 
          message: 'Email verification required',
          emailVerificationSent: emailResult.success,
          emailDeliveryMethod: emailResult.deliveryMethod || null,
          emailMessageId: emailResult.messageId || null,
          email: user.email,
          sendGridConfigured: !!process.env.SENDGRID_API_KEY,
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
          verificationTs: Date.now() // Timestamp of when verification was attempted
        });
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
  
  // Password reset routes
  
  // Request password reset
  app.post('/api/reset-password/request', async (req, res) => {
    try {
      const { email } = z.object({
        email: z.string().email()
      }).parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success even if user is not found for security reasons
      if (!user) {
        return res.json({ success: true });
      }
      
      // Generate reset token
      const token = passwordResetService.generateToken(user.id, user.email);
      
      // Create reset link - always use the production domain for emails
      // Since we want emails to always use the production domain, we'll force it here
      const productionDomain = "https://mysmartscheduler.co";
      console.log('Using production domain for reset link:', productionDomain);
      
      // Use API endpoint directly to avoid client-side routing issues
      const resetLink = `${productionDomain}/api/reset-password?token=${token}`;
      
      // Send email with reset link
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetLink);
      
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${user.email}`);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(400).json({ success: false, message: 'Invalid request', error: (error as Error).message });
    }
  });
  
  // Direct endpoint for password reset
  app.get('/api/reset-password', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }
      
      // Validate the token
      const userId = passwordResetService.validateToken(token);
      
      // Always use the production domain for consistency with the email link
      // Since we're sending emails with the production domain, we need to redirect there
      const productionDomain = "https://mysmartscheduler.co";
      console.log('Using production domain for password reset redirect:', productionDomain);
      
      // Create the redirect URL based on the token validation
      const redirectUrl = userId 
        ? `${productionDomain}/set-new-password?token=${token}` 
        : `${productionDomain}/reset-password?error=invalid`;
        
      // Return HTML that immediately redirects to the appropriate page
      // This approach works even when the domains don't match
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
            <meta http-equiv="refresh" content="0;url=${redirectUrl}">
            <script>
              window.location.href = "${redirectUrl}";
            </script>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f9f9f9;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              h1 {
                color: #4f46e5;
              }
              p {
                margin: 20px 0;
                line-height: 1.6;
              }
              a {
                display: inline-block;
                padding: 10px 20px;
                background-color: #4f46e5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${userId ? 'Reset Your Password' : 'Invalid Reset Link'}</h1>
              <p>${userId 
                ? 'You will be redirected to set your new password.' 
                : 'This password reset link is invalid or has expired.'}</p>
              <p>If you aren't redirected automatically, please click the button below:</p>
              <a href="${redirectUrl}">${userId ? 'Reset Password' : 'Back to Reset Password Page'}</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error processing reset password:', error);
      const productionDomain = "https://mysmartscheduler.co";
      console.log('Using production domain for error redirect:', productionDomain);
      const errorUrl = `${productionDomain}/reset-password?error=server`;
      
      // Return HTML with error information
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Password Reset Error</title>
            <meta http-equiv="refresh" content="0;url=${errorUrl}">
            <script>
              window.location.href = "${errorUrl}";
            </script>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f9f9f9;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 500px;
              }
              h1 {
                color: #e53e3e;
              }
              p {
                margin: 20px 0;
                line-height: 1.6;
              }
              a {
                display: inline-block;
                padding: 10px 20px;
                background-color: #4f46e5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Server Error</h1>
              <p>We encountered an error processing your password reset request. Please try again later.</p>
              <p>If you aren't redirected automatically, please click the button below:</p>
              <a href="${errorUrl}">Back to Reset Password Page</a>
            </div>
          </body>
        </html>
      `);
    }
  });
  
  // Validate password reset token
  app.get('/api/reset-password/validate', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }
      
      const userId = passwordResetService.validateToken(token);
      
      if (!userId) {
        return res.json({ valid: false, message: 'Invalid or expired token' });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error('Error validating reset token:', error);
      res.status(500).json({ valid: false, message: 'Error validating token', error: (error as Error).message });
    }
  });
  
  // Reset password with token
  app.post('/api/reset-password/reset', async (req, res) => {
    try {
      const { token, password } = z.object({
        token: z.string(),
        password: z.string().min(8) // Ensure password meets minimum requirements
      }).parse(req.body);
      
      const userId = passwordResetService.validateToken(token);
      
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
      }
      
      // Update user's password
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Hash the password before storing it
      const hashedPassword = await hash(password);
      await storage.updateUser(userId, { password: hashedPassword });
      
      // Consume token so it can't be used again
      passwordResetService.consumeToken(token);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(400).json({ success: false, message: 'Invalid request', error: (error as Error).message });
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

  // Network diagnostics for SMTP connectivity - accessible to all users for testing
  app.get('/api/email/diagnostics', async (req, res) => {
    try {
      // Use dynamic import instead of require
      const { runSmtpDiagnostics } = await import('./utils/testSmtpDiagnostics');
      const results = await runSmtpDiagnostics();
      
      res.json({
        success: true,
        diagnostics: results,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        emailConfig: {
          fromEmail: process.env.FROM_EMAIL || 'not configured',
          fromEmailConfigured: !!process.env.FROM_EMAIL,
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
          smtpHost: process.env.SMTP_HOST || 'not configured'
        }
      });
    } catch (error) {
      console.error('Error running network diagnostics:', error);
      res.status(500).json({
        success: false,
        message: 'Error running network diagnostics',
        error: (error as Error).message
      });
    }
  });

  // Test email endpoint (API version) - accessible to all users for testing
  app.post('/api/email/test', async (req, res) => {
    try {
      const { email } = z.object({
        email: z.string().email()
      }).parse(req.body);
      
      console.log(`🔍 TEST EMAIL REQUEST: Attempting to send test email to: ${email}`);
      
      // Test environment variables with extensive logging
      console.log('📋 EMAIL ENVIRONMENT DIAGNOSTICS:');
      console.log('- FROM_EMAIL set:', !!process.env.FROM_EMAIL);
      if (process.env.FROM_EMAIL) {
        console.log('- FROM_EMAIL value:', process.env.FROM_EMAIL);
        
        // Validate the FROM_EMAIL format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(process.env.FROM_EMAIL)) {
          console.warn(`⚠️ WARNING: FROM_EMAIL (${process.env.FROM_EMAIL}) doesn't appear to be a valid email format`);
        }
        
        // Check domain configuration
        if (process.env.FROM_EMAIL.includes('@mysmartscheduler.co')) {
          console.log('- Using mysmartscheduler.co domain (should have proper MX, SPF, DMARC records)');
        } else {
          console.warn('- FROM_EMAIL is not using the verified mysmartscheduler.co domain');
        }
      } else {
        console.error('⛔ FROM_EMAIL is not set in environment variables!');
      }
      
      // Log SMTP configuration status
      console.log('- SMTP configuration status:');
      console.log('  - SMTP_HOST set:', !!process.env.SMTP_HOST);
      console.log('  - SMTP_PORT set:', !!process.env.SMTP_PORT);
      console.log('  - SMTP_USER set:', !!process.env.SMTP_USER);
      console.log('  - SMTP_PASS set:', !!process.env.SMTP_PASS);
      console.log('  - SMTP_SECURE set:', !!process.env.SMTP_SECURE);
      console.log('  - Configuration complete:', !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
      
      // Run SMTP diagnostics
      try {
        console.log('🌐 Testing SMTP connectivity...');
        const { testSmtpConnectivity } = await import('./utils/testSmtpConnectivity');
        const connectivityResult = await testSmtpConnectivity();
        
        if (connectivityResult.success) {
          console.log('✅ SMTP server is reachable and responding');
        } else {
          console.error(`❌ SMTP connectivity test failed: ${connectivityResult.error}`);
        }
      } catch (pingError) {
        console.error('❌ Failed to run SMTP connectivity test:', pingError);
      }
      
      // Generate a unique tracking ID for this test
      const testId = Math.random().toString(36).substring(2, 10);
      const timestamp = new Date().toISOString();
      
      // Send a test email with extensive diagnostics
      const emailResult = await emailService.sendEmail({
        to: email,
        subject: `Test Email from SmartScheduler [${testId}]`,
        text: `This is a test email from your SmartScheduler application (ID: ${testId}).\nSent at: ${timestamp}\nIf you received this, email delivery is working correctly!`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4a86e8;">SmartScheduler Test Email</h2>
            <p>This is a test email from your SmartScheduler application.</p>
            <p><strong>Test ID:</strong> ${testId}</p>
            <p><strong>If you received this:</strong> Email delivery is working correctly!</p>
            <p><strong>Environment information:</strong></p>
            <ul>
              <li>FROM_EMAIL: ${process.env.FROM_EMAIL ? process.env.FROM_EMAIL : "Not configured ⚠️"}</li>
              <li>SMTP Configuration: ${(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ? "Configured ✓" : "Not configured ⚠️"}</li>
              <li>Time sent: ${timestamp}</li>
              <li>Server domain: ${process.env.SERVER_DOMAIN || 'unknown'}</li>
            </ul>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
              <p><strong>Troubleshooting Tips:</strong></p>
              <ul>
                <li>Check spam/junk folders</li>
                <li>Verify your SMTP server is properly configured</li>
                <li>Ensure your sending domain has proper DNS records (MX, SPF, DMARC)</li>
                <li>Check firewall settings if emails aren't being sent</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #666;">This is an automated test message. Please do not reply.</p>
          </div>
        `
      });
      
      if (emailResult.success) {
        console.log(`✅ Test email successfully sent to: ${email} [Test ID: ${testId}]`);
        res.json({ 
          success: true, 
          message: `Test email sent to ${email}`, 
          testId,
          timestamp,
          emailConfig: {
            fromEmail: process.env.FROM_EMAIL,
            fromEmailConfigured: !!process.env.FROM_EMAIL,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT
          },
          deliveryMethod: emailResult.method,
          messageId: emailResult.messageId
        });
      } else {
        console.error(`❌ Failed to send test email to: ${email} [Test ID: ${testId}]`);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send test email',
          testId,
          timestamp,
          emailConfig: {
            fromEmail: process.env.FROM_EMAIL,
            fromEmailConfigured: !!process.env.FROM_EMAIL,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            smtpHost: process.env.SMTP_HOST,
            smtpPort: process.env.SMTP_PORT
          },
          smtpDiagnostics: emailResult.smtpDiagnostics,
          error: emailResult.error
        });
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      res.status(500).json({ 
        success: false, 
        message: 'Error sending test email', 
        error: (error as Error).message,
        stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined,
        emailConfig: {
          fromEmailConfigured: !!process.env.FROM_EMAIL,
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
        }
      });
    }
  });

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
  
  // Update user profile
  app.patch('/api/users/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Only allow users to update their own profile, unless admin
      if (req.userRole !== UserRole.ADMIN && userId !== req.userId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Validate update data - only allow certain fields
      const allowedFields = {
        displayName: true,
        profilePicture: true,
        avatarColor: true,
        bio: true,
        email: true,
        timezone: true
      };
      
      // Filter the request body to only include allowed fields
      const updateData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key in allowedFields) {
          updateData[key] = value;
        }
      }
      
      // Check if email is being updated and if it's already in use
      if (updateData.email && updateData.email !== user.email) {
        const existingEmail = await storage.getUserByEmail(updateData.email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user', error: (error as Error).message });
    }
  });
  
  // Delete user (admin only)
  app.delete('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't allow deleting the admin user (ID 1)
      if (userId === 1) {
        return res.status(403).json({ message: 'Cannot delete the admin user' });
      }
      
      // Delete the user
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete user' });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Error deleting user', error: (error as Error).message });
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
  
  // Add a user to a team
  app.post('/api/teams/:id/users', managerAndAbove, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      const { userId } = req.body;
      
      if (!userId || typeof userId !== 'number') {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (req.userRole === UserRole.ADMIN) {
        // Admins can add users to any team
      } else if (req.userRole === UserRole.COMPANY_ADMIN && 
                team.organizationId === req.organizationId) {
        // Company admins can add users to teams in their organization
      } else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId) {
        // Team managers can add users to their own team
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot add users to this team' });
      }
      
      // Get the user to add
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update the user's team
      const updatedUser = await storage.updateUser(userId, { teamId });
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to add user to team' });
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error adding user to team', error: (error as Error).message });
    }
  });
  
  // Remove a user from a team
  app.delete('/api/teams/:teamId/users/:userId', managerAndAbove, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check permissions
      if (req.userRole === UserRole.ADMIN) {
        // Admins can remove users from any team
      } else if (req.userRole === UserRole.COMPANY_ADMIN && 
                team.organizationId === req.organizationId) {
        // Company admins can remove users from teams in their organization
      } else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId) {
        // Team managers can remove users from their own team
      } else {
        return res.status(403).json({ message: 'Forbidden: You cannot remove users from this team' });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is in the team
      if (user.teamId !== teamId) {
        return res.status(400).json({ message: 'User is not a member of this team' });
      }
      
      // Update the user to remove from team
      const updatedUser = await storage.updateUser(userId, { teamId: null });
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to remove user from team' });
      }
      
      res.status(200).json({ message: 'User removed from team successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error removing user from team', error: (error as Error).message });
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
  
  // Add a user to an organization
  app.post('/api/organizations/:id/users', adminAndCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const orgId = parseInt(id);
      const { userId } = req.body;
      
      if (!userId || typeof userId !== 'number') {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Company admins can only add users to their own organization
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId !== orgId) {
        return res.status(403).json({ 
          message: 'Forbidden: You can only add users to your own organization' 
        });
      }
      
      // Get the user to add
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update the user's organization
      const updatedUser = await storage.updateUser(userId, { organizationId: orgId });
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to add user to organization' });
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: 'Error adding user to organization', error: (error as Error).message });
    }
  });
  
  // Remove a user from an organization
  app.delete('/api/organizations/:orgId/users/:userId', adminAndCompanyAdmin, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const userId = parseInt(req.params.userId);
      
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Company admins can only remove users from their own organization
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId !== orgId) {
        return res.status(403).json({ 
          message: 'Forbidden: You can only remove users from your own organization' 
        });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is in the organization
      if (user.organizationId !== orgId) {
        return res.status(400).json({ message: 'User is not a member of this organization' });
      }
      
      // If user is in a team, remove them from the team first
      if (user.teamId !== null) {
        // Get the team to make sure it belongs to this organization
        const team = await storage.getTeam(user.teamId);
        if (team && team.organizationId === orgId) {
          // Remove user from team
          await storage.updateUser(userId, { teamId: null });
        }
      }
      
      // Update the user to remove from organization
      const updatedUser = await storage.updateUser(userId, { organizationId: null });
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to remove user from organization' });
      }
      
      res.status(200).json({ message: 'User removed from organization successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error removing user from organization', error: (error as Error).message });
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

  // Zapier Integration
  app.post('/api/integrations/zapier/connect', async (req, res) => {
    try {
      const { name } = z.object({
        name: z.string().optional()
      }).parse(req.body);
      
      const integrationName = name || 'My Zapier Integration';
      
      const service = new ZapierService(req.userId);
      const integration = await service.connect(integrationName);
      
      res.json({ 
        message: 'Successfully connected to Zapier', 
        integration,
        apiKey: integration.apiKey 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error connecting to Zapier', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/zapier/webhook', async (req, res) => {
    try {
      const { apiKey } = req.query;
      
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(401).json({ message: 'API key is required' });
      }
      
      // Find the integration with this API key
      const integrations = await storage.getCalendarIntegrations(req.userId);
      const zapierIntegration = integrations.find(i => i.type === 'zapier' && i.apiKey === apiKey);
      
      if (!zapierIntegration) {
        return res.status(401).json({ message: 'Invalid API key' });
      }
      
      const service = new ZapierService(zapierIntegration.userId);
      await service.initialize(zapierIntegration.id);
      
      // Process the webhook payload
      const result = await service.handleWebhook(req.body, apiKey as string);
      
      res.json({ message: 'Webhook received', result });
    } catch (error) {
      res.status(500).json({ message: 'Error processing webhook', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/zapier/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'zapier') {
        return res.status(403).json({ message: 'Not authorized to disconnect this integration' });
      }
      
      const service = new ZapierService(req.userId);
      const success = await service.disconnect(integrationId);
      
      if (success) {
        // Check if we need to update settings
        const settings = await storage.getSettings(req.userId);
        if (settings && settings.defaultCalendarIntegrationId === integrationId) {
          // Find another calendar to set as default
          const userIntegrations = await storage.getCalendarIntegrations(req.userId);
          const anotherCalendar = userIntegrations.find(cal => cal.id !== integrationId && cal.isPrimary);
          
          if (anotherCalendar) {
            await storage.updateSettings(req.userId, {
              defaultCalendar: anotherCalendar.type,
              defaultCalendarIntegrationId: anotherCalendar.id
            });
          } else {
            // No other primary calendar, reset to null
            await storage.updateSettings(req.userId, {
              defaultCalendarIntegrationId: null
            });
          }
        }
        
        res.json({ message: 'Successfully disconnected from Zapier' });
      } else {
        res.status(500).json({ message: 'Error disconnecting from Zapier' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from Zapier', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/zapier/:id/webhook', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      const { webhookUrl } = z.object({
        webhookUrl: z.string().url()
      }).parse(req.body);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'zapier') {
        return res.status(403).json({ message: 'Not authorized to modify this integration' });
      }
      
      const service = new ZapierService(req.userId);
      await service.initialize(integrationId);
      
      const updatedIntegration = await service.setWebhookUrl(webhookUrl, integrationId);
      
      if (updatedIntegration) {
        res.json({ message: 'Webhook URL updated successfully', integration: updatedIntegration });
      } else {
        res.status(500).json({ message: 'Failed to update webhook URL' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error updating webhook URL', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/zapier/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'zapier') {
        return res.status(403).json({ message: 'Not authorized to modify this integration' });
      }
      
      // Clear primary flag from all other Zapier integrations for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'zapier' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, { 
          defaultCalendar: 'zapier',
          defaultCalendarIntegrationId: integrationId
        });
      }
      
      res.json({ message: 'Integration set as primary' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting integration as primary', error: (error as Error).message });
    }
  });

  // ====== Zoom Integration Routes ======
  
  // Connect Zoom with API Key and Secret
  app.post('/api/integrations/zoom/connect', async (req, res) => {
    try {
      const { apiKey, apiSecret, name, accountId, isOAuth } = z.object({
        apiKey: z.string(),
        apiSecret: z.string(),
        name: z.string().optional(),
        accountId: z.string().optional(),
        isOAuth: z.boolean().optional()
      }).parse(req.body);
      
      // Create the Zoom service
      const zoom = new ZoomService(req.userId);
      
      // Connect to Zoom
      const integration = await zoom.connect(apiKey, apiSecret, name, accountId, isOAuth);
      
      res.status(201).json(integration);
    } catch (error) {
      res.status(400).json({ message: 'Error connecting to Zoom', error: (error as Error).message });
    }
  });
  
  // Disconnect from Zoom
  app.post('/api/integrations/zoom/disconnect/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'zoom') {
        return res.status(403).json({ message: 'Not authorized to modify this integration' });
      }
      
      // Create Zoom service
      const zoom = new ZoomService(req.userId);
      await zoom.initialize(integrationId);
      
      // Disconnect
      const success = await zoom.disconnect();
      
      if (success) {
        res.json({ message: 'Zoom integration disconnected successfully' });
      } else {
        res.status(500).json({ message: 'Error disconnecting from Zoom' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting from Zoom', error: (error as Error).message });
    }
  });
  
  // Set a Zoom integration as primary
  app.post('/api/integrations/zoom/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);
      
      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }
      
      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'zoom') {
        return res.status(403).json({ message: 'Not authorized to modify this integration' });
      }
      
      // Clear primary flag from all other Zoom integrations for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'zoom' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }
      
      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });
      
      res.json({ message: 'Integration set as primary successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error setting integration as primary', error: (error as Error).message });
    }
  });
  
  // Create a Zoom meeting for an event
  app.post('/api/integrations/zoom/meeting', async (req, res) => {
    try {
      const { eventId } = z.object({
        eventId: z.number()
      }).parse(req.body);
      
      // Get the event
      const event = await storage.getEvent(eventId);
      if (!event || event.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to access this event' });
      }
      
      // Create Zoom service
      const zoom = new ZoomService(req.userId);
      if (!await zoom.initialize()) {
        return res.status(400).json({ message: 'No active Zoom integration found' });
      }
      
      // Create meeting
      const meetingUrl = await zoom.createMeeting(event);
      
      // Update the event with the meeting URL
      const updatedEvent = await storage.updateEvent(eventId, { meetingUrl });
      
      res.json({ meetingUrl, event: updatedEvent });
    } catch (error) {
      res.status(500).json({ message: 'Error creating Zoom meeting', error: (error as Error).message });
    }
  });

  // Event Routes
  app.get('/api/events', async (req, res) => {
    try {
      const { start, end, organizationId, teamId } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      let orgId: number | undefined;
      let tId: number | undefined;
      
      if (start && typeof start === 'string') {
        startDate = new Date(start);
      }
      
      if (end && typeof end === 'string') {
        endDate = new Date(end);
      }

      if (organizationId && typeof organizationId === 'string') {
        orgId = parseInt(organizationId, 10);
      }

      if (teamId && typeof teamId === 'string') {
        tId = parseInt(teamId, 10);
      }
      
      let events: any[] = [];
      
      if (orgId) {
        // If organization ID is provided, fetch all users in that organization
        const orgUsers = await storage.getUsersByOrganization(orgId);
        
        // Fetch events for all users in the organization
        const orgEvents = [];
        for (const user of orgUsers) {
          const userEvents = await storage.getEvents(user.id, startDate, endDate);
          orgEvents.push(...userEvents);
        }
        events = orgEvents;
      } else if (tId) {
        // If team ID is provided, fetch all users in that team
        const teamUsers = await storage.getUsersByTeam(tId);
        
        // Fetch events for all users in the team
        const teamEvents = [];
        for (const user of teamUsers) {
          const userEvents = await storage.getEvents(user.id, startDate, endDate);
          teamEvents.push(...userEvents);
        }
        events = teamEvents;
      } else {
        // Default behavior - fetch events for the current user only
        const userEvents = await storage.getEvents(req.userId, startDate, endDate);
        events = userEvents;
      }
      
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
      // Create a modified schema that accepts ISO string dates
      const modifiedInsertEventSchema = insertEventSchema.extend({
        startTime: z.string().or(z.date()).transform(val => new Date(val)),
        endTime: z.string().or(z.date()).transform(val => new Date(val))
      });
      
      const eventData = modifiedInsertEventSchema.parse({
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
      
      // Transform date strings to Date objects
      const updateData = { ...req.body };
      if (typeof updateData.startTime === 'string') {
        updateData.startTime = new Date(updateData.startTime);
      }
      if (typeof updateData.endTime === 'string') {
        updateData.endTime = new Date(updateData.endTime);
      }
      
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
        const result = await emailService.sendEmail({
          to,
          subject: 'Test Email from My Smart Scheduler',
          text: 'This is a test email from your My Smart Scheduler application.',
          html: '<p>This is a <strong>test email</strong> from your My Smart Scheduler application.</p>'
        });
        success = result.success;
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
      // Create initial booking link data with user ID
      const bookingLinkData = insertBookingLinkSchema.parse({
        ...req.body,
        userId: req.userId
      });
      
      // Check if slug is already in use
      const existingLink = await storage.getBookingLinkBySlug(bookingLinkData.slug);
      if (existingLink) {
        return res.status(400).json({ message: 'This slug is already in use' });
      }
      
      // If this is a team booking link, validate team related data
      if (bookingLinkData.isTeamBooking) {
        // For team booking, the user must have a team
        if (!req.teamId && !bookingLinkData.teamId) {
          return res.status(400).json({ message: 'You must be associated with a team or specify a team ID for team booking links' });
        }
        
        // Set teamId to user's team if not specified
        if (!bookingLinkData.teamId) {
          bookingLinkData.teamId = req.teamId;
        }
        
        // Check if user has permission for the specified team
        if (bookingLinkData.teamId !== req.teamId) {
          // If user is not the team's manager or admin, reject
          if (
            req.userRole !== UserRole.ADMIN && 
            !(req.userRole === UserRole.COMPANY_ADMIN && 
              (await storage.getTeam(bookingLinkData.teamId as number))?.organizationId === req.organizationId) &&
            !(req.userRole === UserRole.TEAM_MANAGER && req.teamId === bookingLinkData.teamId)
          ) {
            return res.status(403).json({ message: 'You do not have permission to create booking links for this team' });
          }
        }
        
        // If no team member IDs specified, get all team members
        if (!bookingLinkData.teamMemberIds || (bookingLinkData.teamMemberIds as any[]).length === 0) {
          const teamMembers = await storage.getUsersByTeam(bookingLinkData.teamId as number);
          bookingLinkData.teamMemberIds = teamMembers.map(user => user.id);
        }
      } else {
        // Not a team booking - clear team-specific fields
        bookingLinkData.teamId = null;
        bookingLinkData.teamMemberIds = [];
        bookingLinkData.assignmentMethod = 'specific';
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
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      // Check if booking link is active (if property exists)
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
      
      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
      }
      
      // Get the owner's information
      const owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Additional info for team bookings
      let teamName = null;
      if (bookingLink.isTeamBooking && bookingLink.teamId) {
        const team = await storage.getTeam(bookingLink.teamId);
        if (team) {
          teamName = team.name;
        }
      }
      
      // Extract availability from the consolidated availability property
      let availableDays: string[] = ["1", "2", "3", "4", "5"]; // Default weekdays
      let availableHours: { start: string, end: string } = { start: "09:00", end: "17:00" }; // Default business hours
      
      // Get availability data from the availability JSON field
      try {
        const availabilityObj = bookingLink.availability as unknown;
        
        if (availabilityObj && typeof availabilityObj === 'object') {
          const availability = availabilityObj as Record<string, unknown>;
          
          // Extract days from availability.days
          if ('days' in availability && 
              availability.days && 
              Array.isArray(availability.days)) {
            availableDays = availability.days as string[];
          }
          
          // Extract hours from availability.hours
          if ('hours' in availability &&
              availability.hours && 
              typeof availability.hours === 'object' &&
              availability.hours !== null) {
            const hours = availability.hours as Record<string, unknown>;
            
            if ('start' in hours && 'end' in hours &&
                typeof hours.start === 'string' && 
                typeof hours.end === 'string') {
              availableHours = {
                start: hours.start,
                end: hours.end
              };
            }
          }
        }
      } catch (err) {
        console.error('Error parsing booking link availability:', err);
        // Use default values if there's any error in parsing
      }
      
      // Return booking link data without sensitive information
      res.json({
        id: bookingLink.id,
        title: bookingLink.title,
        description: bookingLink.description || "",
        duration: bookingLink.duration,
        availableDays: availableDays,
        availableHours: availableHours,
        ownerName: owner.displayName || owner.username,
        ownerTimezone: owner.timezone || "UTC",
        isTeamBooking: bookingLink.isTeamBooking || false,
        teamName: teamName
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking link', error: (error as Error).message });
    }
  });
  
  // Get available time slots for a booking link
  app.get('/api/public/booking/:slug/availability', async (req, res) => {
    try {
      const { slug } = req.params;
      const { startDate, endDate, timezone } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      // Check if booking link is active (if property exists)
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
      
      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
      }
      
      // For team booking, find common availability across team members
      if (bookingLink.isTeamBooking && bookingLink.teamId) {
        const teamMemberIds = bookingLink.teamMemberIds as number[] || [];
        
        if (teamMemberIds.length === 0) {
          // If no specific team members are assigned, get all team members
          const teamMembers = await storage.getUsersByTeam(bookingLink.teamId as number);
          teamMemberIds.push(...teamMembers.map(user => user.id));
        }
        
        if (teamMemberIds.length === 0) {
          return res.status(404).json({ message: 'No team members found for this booking link' });
        }
        
        // Find common availability
        const availableSlots = await teamSchedulingService.findCommonAvailability(
          teamMemberIds,
          start,
          end,
          bookingLink.duration,
          bookingLink.bufferBefore || 0,
          bookingLink.bufferAfter || 0
        );
        
        return res.json(availableSlots);
      }
      // For individual booking, get the user's availability
      else {
        const userId = bookingLink.userId;
        const events = await storage.getEvents(userId, start, end);
        
        // Extract availability from the consolidated availability property
        let availableDays: string[] = ["1", "2", "3", "4", "5"]; // Default weekdays
        let availableHours: { start: string, end: string } = { start: "09:00", end: "17:00" }; // Default business hours
        
        // Get availability data from the availability JSON field
        try {
          const availabilityObj = bookingLink.availability as unknown;
          
          if (availabilityObj && typeof availabilityObj === 'object') {
            const availability = availabilityObj as Record<string, unknown>;
            
            // Extract days from availability.days
            if ('days' in availability && 
                availability.days && 
                Array.isArray(availability.days)) {
              availableDays = availability.days as string[];
            }
            
            // Extract hours from availability.hours
            if ('hours' in availability &&
                availability.hours && 
                typeof availability.hours === 'object' &&
                availability.hours !== null) {
              const hours = availability.hours as Record<string, unknown>;
              
              if ('start' in hours && 'end' in hours &&
                  typeof hours.start === 'string' && 
                  typeof hours.end === 'string') {
                availableHours = {
                  start: hours.start,
                  end: hours.end
                };
              }
            }
          }
        } catch (err) {
          console.error('Error parsing booking link availability:', err);
          // Use default values if there's any error in parsing
        }
        
        const workingHours = {
          0: { enabled: availableDays.includes('0'), start: availableHours.start, end: availableHours.end },
          1: { enabled: availableDays.includes('1'), start: availableHours.start, end: availableHours.end },
          2: { enabled: availableDays.includes('2'), start: availableHours.start, end: availableHours.end },
          3: { enabled: availableDays.includes('3'), start: availableHours.start, end: availableHours.end },
          4: { enabled: availableDays.includes('4'), start: availableHours.start, end: availableHours.end },
          5: { enabled: availableDays.includes('5'), start: availableHours.start, end: availableHours.end },
          6: { enabled: availableDays.includes('6'), start: availableHours.start, end: availableHours.end },
        };
        
        const availableSlots = await teamSchedulingService.findCommonAvailability(
          [userId],
          start,
          end,
          bookingLink.duration,
          bookingLink.bufferBefore || 0,
          bookingLink.bufferAfter || 0
        );
        
        return res.json(availableSlots);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ message: 'Error fetching availability', error: (error as Error).message });
    }
  });

  app.post('/api/public/booking/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      // Check if booking link is active (if property exists)
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
      
      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
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
      
      // For team bookings, assign a team member
      let assignedUserId = bookingLink.userId; // Default to the booking link owner
      
      if (bookingLink.isTeamBooking && bookingLink.teamId) {
        try {
          // Assign a team member based on the assignment method
          assignedUserId = await teamSchedulingService.assignTeamMember(
            bookingLink,
            startTime,
            endTime
          );
          
          // Add assignedUserId to booking data
          bookingData.assignedUserId = assignedUserId;
        } catch (error) {
          console.error('Error assigning team member:', error);
          // If there's an error in team assignment, fall back to the booking link owner
        }
      }
      
      // Create the booking
      const booking = await storage.createBooking(bookingData);
      
      // Create an event for the booking
      const eventData = {
        userId: assignedUserId, // Use the assigned user
        title: `Booking: ${bookingData.name}`,
        description: bookingData.notes || `Booking from ${bookingData.name} (${bookingData.email})`,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        attendees: [bookingData.email],
        reminders: [15],
        timezone: (await storage.getUser(assignedUserId))?.timezone || 'UTC'
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

  // Team Routes
  app.get('/api/teams', authMiddleware, async (req, res) => {
    try {
      let teams: Team[] = [];
      // Admins can see all teams
      if (req.userRole === UserRole.ADMIN) {
        teams = await storage.getTeams();
      }
      // Company admins can see teams in their organization
      else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        teams = await storage.getTeams(req.organizationId);
      }
      // Team managers and basic users can only see their own team
      else if (req.teamId) {
        const team = await storage.getTeam(req.teamId);
        if (team) {
          teams = [team];
        }
      }
      
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching teams', error: (error as Error).message });
    }
  });
  
  app.get('/api/teams/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user has permission to access this team
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && team.organizationId === req.organizationId) &&
        !(req.teamId === teamId)
      ) {
        return res.status(403).json({ message: 'Not authorized to access this team' });
      }
      
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team', error: (error as Error).message });
    }
  });
  
  app.post('/api/teams', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse({
        ...req.body,
        organizationId: req.body.organizationId || req.organizationId
      });
      
      // Company admins can only create teams in their organization
      if (req.userRole === UserRole.COMPANY_ADMIN && teamData.organizationId !== req.organizationId) {
        return res.status(403).json({ message: 'Not authorized to create teams in this organization' });
      }
      
      const team = await storage.createTeam(teamData);
      
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ message: 'Invalid team data', error: (error as Error).message });
    }
  });
  
  app.put('/api/teams/:id', authMiddleware, managerAndAbove, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user has permission to update this team
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && team.organizationId === req.organizationId) &&
        !(req.userRole === UserRole.TEAM_MANAGER && req.teamId === teamId)
      ) {
        return res.status(403).json({ message: 'Not authorized to update this team' });
      }
      
      // Team managers can only update certain fields
      let updateData = req.body;
      if (req.userRole === UserRole.TEAM_MANAGER) {
        // Restrict fields that team managers can update
        updateData = {
          name: req.body.name,
          description: req.body.description
        };
      }
      
      const updatedTeam = await storage.updateTeam(teamId, updateData);
      
      if (!updatedTeam) {
        return res.status(500).json({ message: 'Failed to update team' });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      res.status(400).json({ message: 'Invalid team data', error: (error as Error).message });
    }
  });
  
  app.delete('/api/teams/:id', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Company admins can only delete teams in their organization
      if (req.userRole === UserRole.COMPANY_ADMIN && team.organizationId !== req.organizationId) {
        return res.status(403).json({ message: 'Not authorized to delete this team' });
      }
      
      const success = await storage.deleteTeam(teamId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete team' });
      }
      
      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting team', error: (error as Error).message });
    }
  });
  
  app.get('/api/teams/:id/users', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user has permission to access this team's users
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && team.organizationId === req.organizationId) &&
        !(req.teamId === teamId)
      ) {
        return res.status(403).json({ message: 'Not authorized to access this team\'s users' });
      }
      
      const users = await storage.getUsersByTeam(teamId);
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team users', error: (error as Error).message });
    }
  });
  
  app.get('/api/organizations/:id/teams', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const organizationId = parseInt(id);
      
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: 'Invalid organization ID' });
      }
      
      // Check if user has permission to access this organization's teams
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === organizationId)
      ) {
        return res.status(403).json({ message: 'Not authorized to access this organization\'s teams' });
      }
      
      const teams = await storage.getTeams(organizationId);
      
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching organization teams', error: (error as Error).message });
    }
  });
  
  // API endpoint for team availability
  app.get('/api/teams/:id/availability', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const teamId = parseInt(id);
      const { startDate, endDate, duration } = req.query;
      
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      
      if (!startDate || !endDate || !duration) {
        return res.status(400).json({ message: 'Start date, end date, and duration are required' });
      }
      
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if user has permission to access this team's availability
      if (
        req.userRole !== UserRole.ADMIN && 
        !(req.userRole === UserRole.COMPANY_ADMIN && team.organizationId === req.organizationId) &&
        !(req.teamId === teamId)
      ) {
        return res.status(403).json({ message: 'Not authorized to access this team\'s availability' });
      }
      
      // Get team members
      const teamMembers = await storage.getUsersByTeam(teamId);
      const teamMemberIds = teamMembers.map(user => user.id);
      
      // Find common availability
      const availableSlots = await teamSchedulingService.findCommonAvailability(
        teamMemberIds,
        new Date(startDate as string),
        new Date(endDate as string),
        parseInt(duration as string)
      );
      
      res.json(availableSlots);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching team availability', error: (error as Error).message });
    }
  });
  
  // Debug route to check email configuration (admin only)
  app.get('/api/debug/email-config', authMiddleware, adminOnly, async (req, res) => {
    try {
      const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
      
      res.json({
        emailServiceConfigured: hasSendGridKey,
        fromEmail: 'noreply@mysmartscheduler.co'
      });
    } catch (error) {
      console.error('Error checking email config:', error);
      res.status(500).json({ 
        message: 'Error checking email configuration',
        error: (error as Error).message 
      });
    }
  });
  
  // Email diagnostics API endpoints (no auth required for direct access)
  
  // Environment configuration
  app.get('/api/email/diagnostics/environment', async (req, res) => {
    try {
      // Check FROM_EMAIL configuration
      let rawFromEmail = process.env.FROM_EMAIL || 'not configured';
      
      // Validate email format
      let fromEmailValid = false;
      let normalizedFromEmail = rawFromEmail;
      let isNormalized = false;
      
      // Check if FROM_EMAIL is just a domain or needs normalization
      if (rawFromEmail && rawFromEmail.startsWith('@')) {
        normalizedFromEmail = 'noreply' + rawFromEmail;
        isNormalized = true;
      }
      
      // Validate proper email format
      if (normalizedFromEmail) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        fromEmailValid = emailRegex.test(normalizedFromEmail);
      }
      
      // Remove SendGrid references
      const sendGridKeyLength = 0;
      const sendGridKeyPrefix = null;
      const hasSendGridKey = false;
      
      // Get SMTP configuration
      const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      
      res.json({
        success: true,
        data: {
          // Email Configuration
          rawFromEmail,
          normalizedFromEmail,
          fromEmailIsNormalized: isNormalized,
          fromEmailValid,
          fromEmailRecommendation: fromEmailValid ? null : 'Use format: user@domain.com',
          
          // SMTP Configuration
          hasSmtpConfig,
          smtpHost: process.env.SMTP_HOST || null,
          
          // Environment
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          platform: process.platform,
          hostname: process.env.HOSTNAME || 'unknown'
        }
      });
    } catch (error) {
      console.error('Error checking email environment:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error checking email environment: ' + (error as Error).message
      });
    }
  });
  

  
  // Email configuration information
  app.get('/api/email/diagnostics/config', async (req, res) => {
    try {
      // Get environment information
      const environment = process.env.NODE_ENV || 'development';
      
      // Get email configuration
      const fromEmail = process.env.FROM_EMAIL || '';
      let normalizedFromEmail = fromEmail;
      
      if (fromEmail && fromEmail.startsWith('@')) {
        normalizedFromEmail = 'noreply' + fromEmail;
      }
      
      // Check if email has both local part and domain
      const fromEmailValid = normalizedFromEmail.includes('@') && 
        normalizedFromEmail.split('@')[0].length > 0 &&
        normalizedFromEmail.split('@')[1].length > 0;
      
      // Check if SMTP is configured
      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      
      res.json({
        success: true,
        data: {
          environment,
          fromEmail,
          normalizedFromEmail,
          fromEmailValid,
          smtpConfigured,
          primaryMethod: smtpConfigured ? 'SMTP' : 'None',
          smtpHost: process.env.SMTP_HOST || null,
          smtpPort: process.env.SMTP_PORT || '587',
          smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'
        }
      });
    } catch (error) {
      console.error('Error retrieving email configuration:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error retrieving email configuration: ' + (error as Error).message
      });
    }
  });

  // Network tests for SMTP connectivity
  app.get('/api/email/diagnostics/network', async (req, res) => {
    try {
      // Import directly to avoid namespace issues
      const { runSmtpDiagnostics } = await import('./utils/testSmtpDiagnostics');
      const results = await runSmtpDiagnostics();
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error running network tests:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error running network tests: ' + (error as Error).message
      });
    }
  });
  
  // Test SMTP connectivity
  app.get('/api/email/diagnostics/smtp', async (req, res) => {
    try {
      const { testSmtpConnectivity } = await import('./utils/testSmtpConnectivity');
      const results = await testSmtpConnectivity();
      
      res.json({
        success: results.success,
        data: results,
        message: results.success ? 'SMTP connection successful' : 'SMTP connection failed',
        details: results.error ? { error: results.error } : undefined
      });
    } catch (error) {
      console.error('Error testing SMTP connectivity:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error testing SMTP connectivity: ' + (error as Error).message,
        details: error instanceof Error ? { stack: error.stack } : {}
      });
    }
  });
  
  // Check SMTP config file
  app.get('/api/diagnostics/check-smtp-config-file', async (req, res) => {
    try {
      // For ESM compatibility
      const __filename = import.meta.url.replace('file://', '');
      const __dirname = path.dirname(__filename);
      const configPath = path.join(__dirname, 'smtp-config.json');
      
      if (fs.existsSync(configPath)) {
        try {
          const configData = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configData);
          
          // Mask the password for security
          if (config.pass) {
            config.pass = '********';
          }
          
          res.json({
            success: true,
            message: 'SMTP configuration file found',
            config: config
          });
        } catch (parseError) {
          res.json({
            success: false,
            message: 'SMTP configuration file exists but could not be parsed',
            error: (parseError as Error).message
          });
        }
      } else {
        res.json({
          success: false,
          message: 'SMTP configuration file not found',
          error: `File not found at path: ${configPath}`
        });
      }
    } catch (error) {
      console.error('Error checking SMTP config file:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error checking SMTP config file',
        error: (error as Error).message
      });
    }
  });
  
  // Send test email
  app.post('/api/email/diagnostics/test', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }
      
      // Generate a unique test ID to track this email
      const testId = Math.random().toString(36).substring(2, 10);
      
      console.log(`🔍 TEST EMAIL REQUEST: Attempting to send test email to: ${email}`);
      
      // Test environment variables with extensive logging
      console.log('📋 EMAIL ENVIRONMENT DIAGNOSTICS:');
      console.log('- FROM_EMAIL set:', !!process.env.FROM_EMAIL);
      if (process.env.FROM_EMAIL) {
        console.log('- FROM_EMAIL value:', process.env.FROM_EMAIL);
        
        // Validate the FROM_EMAIL format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(process.env.FROM_EMAIL)) {
          console.warn(`⚠️ WARNING: FROM_EMAIL (${process.env.FROM_EMAIL}) doesn't appear to be a valid email format`);
        }
        
        // Check email domain
        if (process.env.FROM_EMAIL.includes('@mysmartscheduler.co')) {
          console.log('- Using mysmartscheduler.co domain');
        } else {
          console.warn('- FROM_EMAIL is not using the mysmartscheduler.co domain');
        }
      } else {
        console.error('⛔ FROM_EMAIL is not set in environment variables!');
      }
      
      // Log SMTP configuration
      console.log('- SMTP_HOST set:', !!process.env.SMTP_HOST);
      console.log('- SMTP_USER set:', !!process.env.SMTP_USER);
      console.log('- SMTP_PASS set:', !!process.env.SMTP_PASS);
      console.log('- SMTP_PORT set:', !!process.env.SMTP_PORT, process.env.SMTP_PORT || '587');
      console.log('- SMTP_SECURE set:', !!process.env.SMTP_SECURE, process.env.SMTP_SECURE || 'false');
      
      // Check if SMTP is fully configured
      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      console.log('- SMTP fully configured:', smtpConfigured);
      
      if (!smtpConfigured) {
        console.error('⛔ SMTP configuration is incomplete. Email sending will likely fail.');
      }
      
      // Generate both HTML and plain text versions
      const htmlContent = `
        <h1>Email Delivery Test</h1>
        <p>This is a test email from the Smart Scheduler email diagnostics tool.</p>
        <p>If you're seeing this message, email delivery is working correctly!</p>
        <p>Time sent: ${new Date().toISOString()}</p>
        <p>Test ID: ${testId}</p>
        <p>Server info: ${process.platform} - Node.js ${process.version}</p>
      `;
      
      const textContent = 
        `Email Delivery Test [${testId}]
        
        This is a test email from the Smart Scheduler email diagnostics tool.
        If you're seeing this message, email delivery is working correctly!
        
        Time sent: ${new Date().toISOString()}
        Test ID: ${testId}
        Server info: ${process.platform} - Node.js ${process.version}`;
      
      console.log(`📧 Preparing to send email to ${email} with subject "Test Email from SmartScheduler [${testId}]"`);
      console.log(`- FROM_EMAIL: ${emailService.getFromEmail()}`);
      console.log(`- ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
      console.log(`- SMTP configured: ${!!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)}`);
      console.log(`- SMTP_HOST: ${process.env.SMTP_HOST || 'not set'}`);
      console.log(`- SMTP_PORT: ${process.env.SMTP_PORT || '587'}`);
      console.log(`- SMTP_SECURE: ${process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' ? 'true' : 'false'}`);
      
      const result = await emailService.sendEmail({
        to: email,
        subject: `Test Email from SmartScheduler [${testId}]`,
        html: htmlContent,
        text: textContent
      });
      
      if (result.success) {
        console.log(`✅ Test email successfully sent to: ${email} [Test ID: ${testId}]`);
        
        res.json({
          success: true,
          method: result.method,
          messageId: result.messageId,
          data: {
            recipient: email,
            timestamp: new Date().toISOString(),
            testId: testId
          }
        });
      } else {
        console.error(`❌ Failed to send test email to: ${email} [Test ID: ${testId}]`);
        console.error('Error details:', result.error);
        
        res.status(500).json({
          success: false,
          error: result.error?.message || 'Failed to send test email',
          details: {
            errorCode: result.error?.code,
            smtpDiagnostics: result.smtpDiagnostics,
            errorDetails: result.error?.details
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      
      res.status(500).json({ 
        success: false, 
        message: 'Error sending test email: ' + (error as Error).message,
        stack: process.env.NODE_ENV !== 'production' ? (error as Error).stack : undefined,
        emailConfig: {
          fromEmailConfigured: !!process.env.FROM_EMAIL,
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Standalone email diagnostics page (no auth required)
  app.get('/email-diagnostics', async (req, res) => {
    // Serve the new comprehensive diagnostic page using import.meta.url for ESM
    const __filename = import.meta.url.replace('file://', '');
    const __dirname = path.dirname(__filename);
    res.sendFile(path.join(__dirname, 'diagnostics.html'));
  });
  
  // Legacy diagnostics page (can be removed once migrated)
  app.get('/email-diagnostics-legacy', async (req, res) => {
    // For ESM
    const __filename = import.meta.url.replace('file://', '');
    const __dirname = path.dirname(__filename);
    // Simple HTML for email diagnostics (using template literal for direct embedding)
    const diagnosticsHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email System Diagnostics</title>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; margin-bottom: 2rem; }
          .card { background: #f9f9f9; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          button { background: #4f46e5; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
          button:hover { background: #4338ca; }
          pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
          .hidden { display: none; }
          .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem; font-weight: 500; }
          .status-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
          .status-error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        </style>
      </head>
      <body>
        <h1>Email System Diagnostics</h1>
        
        <div class="card">
          <h2>Environment Configuration</h2>
          <button id="check-env-btn" onclick="checkEnvironment()">Check Environment</button>
          <div id="env-results" class="hidden"></div>
        </div>
        
        
        <div class="card">
          <h2>Network Tests</h2>
          <button id="run-network-tests-btn" onclick="runNetworkTests()">Run Network Tests</button>
          <div id="network-results" class="hidden"></div>
        </div>
        
        <div class="card">
          <h2>Send Test Email</h2>
          <form id="test-email-form">
            <label for="test-email">Recipient Email:</label>
            <input type="email" id="test-email" required style="width: 100%; padding: 0.5rem; margin: 0.5rem 0;">
            <button type="submit">Send Test Email</button>
          </form>
          <div id="test-email-result" class="hidden"></div>
        </div>
        
        <script>
          // Check environment configuration
          async function checkEnvironment() {
            const button = document.getElementById('check-env-btn');
            const resultsDiv = document.getElementById('env-results');
            
            button.disabled = true;
            button.textContent = 'Checking...';
            
            try {
              const response = await fetch('/api/email/diagnostics/environment');
              const data = await response.json();
              
              if (data.success) {
                resultsDiv.innerHTML = \`
                  <pre>\${JSON.stringify(data.data, null, 2)}</pre>
                \`;
                resultsDiv.classList.remove('hidden');
              } else {
                alert(\`Error checking environment: \${data.message}\`);
              }
            } catch (error) {
              alert(\`Failed to check environment: \${error.message}\`);
            } finally {
              button.disabled = false;
              button.textContent = 'Check Environment';
            }
          }
          

          
          // Run network tests
          async function runNetworkTests() {
            const button = document.getElementById('run-network-tests-btn');
            const resultsDiv = document.getElementById('network-results');
            
            button.disabled = true;
            button.textContent = 'Running Tests...';
            
            try {
              const response = await fetch('/api/email/diagnostics/network');
              const data = await response.json();
              
              if (data.success) {
                resultsDiv.innerHTML = \`
                  <pre>\${JSON.stringify(data.data, null, 2)}</pre>
                \`;
                resultsDiv.classList.remove('hidden');
              } else {
                alert(\`Error running network tests: \${data.message}\`);
              }
            } catch (error) {
              alert(\`Failed to run network tests: \${error.message}\`);
            } finally {
              button.disabled = false;
              button.textContent = 'Run Network Tests';
            }
          }
          
          // Send test email
          document.getElementById('test-email-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const button = e.target.querySelector('button');
            const resultDiv = document.getElementById('test-email-result');
            const email = document.getElementById('test-email').value;
            
            button.disabled = true;
            button.textContent = 'Sending...';
            
            try {
              const response = await fetch('/api/email/diagnostics/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              
              const data = await response.json();
              
              resultDiv.innerHTML = data.success 
                ? \`<p style="color: #10b981">Test email sent successfully to \${email}. Check your inbox.</p>\` 
                : \`<p style="color: #ef4444">Error: \${data.message}</p>\`;
              
              resultDiv.classList.remove('hidden');
            } catch (error) {
              resultDiv.innerHTML = \`<p style="color: #ef4444">Failed to send test email: \${error.message}</p>\`;
              resultDiv.classList.remove('hidden');
            } finally {
              button.disabled = false;
              button.textContent = 'Send Test Email';
            }
          });
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(diagnosticsHtml);
  });

  return httpServer;
}
