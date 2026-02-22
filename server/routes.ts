import { z } from "zod";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import 'express-session';

// Extend the express-session SessionData interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
    userRole?: string;
    entryDomain?: string; // Track which domain the user entered through
  }
}
import {
  insertUserSchema, insertEventSchema, insertBookingLinkSchema,
  insertBookingSchema, insertSettingsSchema, insertOrganizationSchema, insertCompanySchema, insertTeamSchema,
  CalendarIntegration, UserRole, Team, Event, User, Company, SubscriptionPlan, SubscriptionStatus, BookingLink,
  passwordResetTokens
} from "@shared/schema";
import { GoogleCalendarService } from "./calendarServices/googleCalendar";
import { OutlookCalendarService } from "./calendarServices/outlookCalendar";
import { ICalendarService } from "./calendarServices/iCalendarService";
import { ZapierService } from "./calendarServices/zapierService";
import { ICloudService } from "./calendarServices/iCloudService";
import { ZoomService } from "./calendarServices/zoomService";
import { reminderService } from "./utils/reminderService";
import { timeZoneService, popularTimeZones } from "./utils/timeZoneService";
import { getAllTimezonesWithCurrentOffsets, getTimezoneWithCurrentOffset, TimeZone } from "../shared/timezones";
import { emailService } from "./utils/emailService";
import { teamSchedulingService } from "./utils/teamSchedulingService";
import { passwordResetService } from './utils/passwordResetUtils';
import { emailVerificationService } from './utils/emailVerificationUtils';
import { parseBookingDates, safeParseDate } from './utils/dateUtils';
import emailTemplateManager, { EmailTemplateType, EmailTemplate } from './utils/emailTemplateManager';
import { getBaseUrlForDomain } from './utils/domainConfig';
import stripeRoutes from './routes/stripe';
import stripeProductsManagerRoutes from './routes/stripeProductsManager';
import bookingPathsRoutes from './routes/bookingPaths';
import smartSchedulerWebhookRoutes from './routes/smartSchedulerWebhook';
import analyticsRoutes from './routes/analytics';
import availabilitySchedulesRoutes from './routes/availabilitySchedules';
import customQuestionsRoutes from './routes/customQuestions';
import dateOverridesRoutes from './routes/dateOverrides';
import meetingPollsRoutes from './routes/meetingPolls';
import meetingPollsPublicRoutes from './routes/meetingPollsPublic';
import slackIntegrationRoutes from './routes/slackIntegration';
import bookingPaymentRoutes from './routes/bookingPayment';
import managedEventsRoutes from './routes/managedEvents';
import managedWorkflowsRoutes from './routes/managedWorkflows';
import auditLogRoutes from './routes/auditLog';
import scimRoutes from './routes/scimProvisioning';
import domainControlRoutes from './routes/domainControl';
import dataRetentionRoutes from './routes/dataRetention';
import routingFormsRoutes from './routes/routingForms';
import routingFormPublicRoutes from './routes/routingFormPublic';
import qrCodeRoutes from './routes/qrCode';
import autoLoginRoutes from './routes/autoLogin';
import { db, pool } from './db';
import { eq, and, lt, gt, gte, lte } from 'drizzle-orm';
import { StripeService, STRIPE_PRICES } from './services/stripe';
import { 
  AppointmentType, AppointmentSource, AppointmentStatus, HostRole,
  insertWebhookIntegrationSchema
} from '@shared/schema';

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
  console.log("-----------------------------------");
  console.log(`[authMiddleware] Processing request to ${req.method} ${req.url}`);
  
  // Use session-based authentication
  if (!req.session.userId) {
    console.log("[authMiddleware] No userId found in session");
    return res.status(401).json({ message: 'Unauthorized: Please log in' });
  }
  
  console.log(`[authMiddleware] Found userId in session: ${req.session.userId}`);
  
  try {
    const userId = req.session.userId;
    console.log(`[authMiddleware] Looking up user with ID: ${userId}`);
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.log(`[authMiddleware] No user found with ID: ${userId}`);
      // Clear the invalid session
      req.session.destroy((err) => {
        if (err) {
          console.error('[authMiddleware] Error destroying session:', err);
        }
      });
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    
    console.log(`[authMiddleware] User found: ${user.username}, Role: ${user.role}, Organization: ${user.organizationId}, Team: ${user.teamId}`);
    
    req.userId = user.id;
    req.userRole = user.role;
    req.organizationId = user.organizationId;
    req.teamId = user.teamId;
    
    console.log(`[authMiddleware] Authentication successful, proceeding to next middleware`);
    next();
  } catch (error) {
    console.error('[authMiddleware] Authentication error:', error);
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

  // Rate limiters for authentication endpoints
  // Note: Replit uses a single-hop reverse proxy (app.set('trust proxy', 1))
  // We disable trustProxy validation since we've properly configured the Express app
  // to trust exactly 1 proxy hop, preventing IP spoofing
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
  });

  const passwordResetRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: 'Too many password reset attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
  });

  const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 registrations per hour
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
  });

  // Add userId to Request interface using module augmentation
  // This is done outside the function to avoid syntax errors

  // Register route modules
  app.use('/api/public', bookingPathsRoutes);
  
  // Smart-Scheduler webhook endpoints (no authentication - uses HMAC signature verification)
  app.use('/api/webhooks', smartSchedulerWebhookRoutes);

  // Health check endpoints (no authentication required)

  // Basic health check - always returns 200 if server is running
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      host: req.get('host'),
      uptime: process.uptime()
    });
  });

  // Liveness probe - Kubernetes/Docker health check
  // Returns 200 if the application is alive (doesn't check dependencies)
  app.get('/api/health/live', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  // Readiness probe - checks if app is ready to serve traffic
  // Returns 200 if all critical dependencies are healthy
  app.get('/api/health/ready', async (req, res) => {
    const checks: Record<string, { healthy: boolean; message?: string; latency?: number }> = {};

    // Check database connectivity
    try {
      const dbStart = Date.now();
      await pool.query('SELECT 1');
      checks.database = {
        healthy: true,
        latency: Date.now() - dbStart
      };
    } catch (error) {
      checks.database = {
        healthy: false,
        message: (error as Error).message
      };
    }

    // Check SendGrid (email service) configuration
    checks.email = {
      healthy: !!(process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL),
      message: process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured'
    };

    // Check session store
    checks.session = {
      healthy: !!(process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL : true),
      message: process.env.NODE_ENV === 'production' ? 'PostgreSQL session store' : 'Memory session store'
    };

    // Overall health status
    const allHealthy = Object.values(checks).every(check => check.healthy);
    const status = allHealthy ? 'ready' : 'not_ready';
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Startup probe - checks if app has started successfully
  // Returns 200 when the application is fully initialized
  app.get('/api/health/startup', async (req, res) => {
    // Check if critical services are initialized
    const initialized = {
      database: false,
      routes: true, // If this endpoint is accessible, routes are registered
    };

    // Quick database check
    try {
      await pool.query('SELECT 1');
      initialized.database = true;
    } catch (error) {
      // Database not ready yet
    }

    const isReady = Object.values(initialized).every(v => v);

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'started' : 'starting',
      timestamp: new Date().toISOString(),
      initialized,
      uptime: process.uptime()
    });
  });

  // API Routes - all prefixed with /api
  
  // ====== Admin Routes ======
  
  // New API endpoint for user management dashboard - role-based access
  app.get('/api/users/all', authMiddleware, async (req, res) => {
    console.log('[API /api/users/all] Access attempt', { 
      userRole: req.userRole, 
      userId: req.userId,
      organizationId: req.organizationId,
      teamId: req.teamId
    });
    
    try {
      let users: User[] = [];
      
      // Based on user role, determine which users they can see
      if (req.userRole === UserRole.ADMIN) {
        // Admins can see all users
        users = await storage.getAllUsers();
        console.log(`[API /api/users/all] Admin access - fetched ${users.length} users`);
      } 
      else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        // Company admins can see users in their organization
        users = await storage.getUsersByOrganization(req.organizationId);
        console.log(`[API /api/users/all] Company Admin access - fetched ${users.length} users for organization ${req.organizationId}`);
      } 
      else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId) {
        // Team managers can see users in their team
        users = await storage.getUsersByTeam(req.teamId);
        console.log(`[API /api/users/all] Team Manager access - fetched ${users.length} users for team ${req.teamId}`);
      } 
      else {
        // No access for regular users
        return res.status(403).json({ 
          message: 'Unauthorized: You do not have sufficient permissions to view user data',
          accessInfo: {
            userRole: req.userRole,
            organizationId: req.organizationId,
            teamId: req.teamId
          }
        });
      }
      
      res.json(users);
    } catch (error) {
      console.error('[API /api/users/all] Error fetching users:', error);
      res.status(500).json({ 
        message: 'Error fetching users', 
        error: (error as Error).message,
        accessInfo: {
          userRole: req.userRole,
          organizationId: req.organizationId,
          teamId: req.teamId
        }
      });
    }
  });
  
  // Get all users (role-based filtering)
  // ADMIN: sees all users across all companies
  // COMPANY_ADMIN: sees only users in their company
  // TEAM_MANAGER: sees only users in their team
  app.get('/api/admin/users', authMiddleware, managerAndAbove, async (req, res) => {
    try {
      let users: User[];

      if (req.userRole === UserRole.ADMIN) {
        // Super admin sees all users
        users = await storage.getAllUsers();
      } else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        // Company admin sees only users in their company/organization
        users = await storage.getUsersByOrganization(req.organizationId);
      } else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId) {
        // Team manager sees only users in their team
        users = await storage.getUsersByTeam(req.teamId);
      } else {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions or missing company/team assignment' });
      }

      console.log(`Fetched ${users.length} users for role ${req.userRole}`);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
    }
  });
  
  // Admin endpoint to manually verify a user's email
  app.post('/api/admin/verify-user-email', authMiddleware, adminOnly, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update emailVerified to true
      const updatedUser = await storage.updateUser(user.id, { emailVerified: true });
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update user verification status' });
      }
      
      console.log(`✅ Admin manually verified email for user: ${email}`);
      res.json({ message: 'User email verified successfully', user: updatedUser });
    } catch (error) {
      console.error('Error verifying user email:', error);
      res.status(500).json({ message: 'Error verifying user email', error: (error as Error).message });
    }
  });

  // Admin endpoint to resend credentials to a user with a new password
  app.post('/api/admin/resend-credentials', authMiddleware, adminOnly, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Find user by ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.email) {
        return res.status(400).json({ message: 'User does not have an email address' });
      }

      // Import password generator
      const { generateSimplePassword } = await import('./utils/passwordGenerator');

      // Generate new password
      const newPassword = generateSimplePassword(8);
      const hashedPassword = await hash(newPassword);

      // Update user's password and set forcePasswordChange
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        forcePasswordChange: true,
        emailVerified: true
      });

      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update user password' });
      }

      // Send credentials email
      const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
      const loginLink = `${baseUrl}/login`;

      const emailResult = await emailService.sendAccountCredentialsEmail(
        user.email,
        user.username,
        newPassword,
        loginLink
      );

      if (emailResult.success) {
        console.log(`✅ Credentials resent to user: ${user.email}`);
        res.json({
          message: 'Credentials sent successfully',
          email: user.email
        });
      } else {
        // Password was already updated, so we need to inform admin
        console.error(`⚠️ Password updated but failed to send email to ${user.email}`);
        res.status(500).json({
          message: 'Password was reset but email failed to send. Please try again or manually provide credentials.',
          error: emailResult.error?.message
        });
      }
    } catch (error) {
      console.error('Error resending credentials:', error);
      res.status(500).json({ message: 'Error resending credentials', error: (error as Error).message });
    }
  });

  // =====================================================
  // Admin Company routes (preferred - new terminology)
  // =====================================================

  // Get all companies (role-based filtering for admin dashboard)
  app.get('/api/admin/companies', authMiddleware, managerAndAbove, async (req, res) => {
    try {
      let companies: Company[];

      if (req.userRole === UserRole.ADMIN) {
        // Super admin sees all companies
        companies = await storage.getCompanies();
      } else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        // Company admin sees only their company
        const company = await storage.getCompany(req.organizationId);
        companies = company ? [company] : [];
      } else {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      }

      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching companies', error: (error as Error).message });
    }
  });

  // Create a new company (admin only)
  app.post('/api/admin/companies', authMiddleware, adminOnly, async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: 'Invalid company data', error: (error as Error).message });
    }
  });

  // Update a company (admin only)
  app.patch('/api/admin/companies/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = req.body;
      const company = await storage.updateCompany(id, companyData);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: 'Error updating company', error: (error as Error).message });
    }
  });

  // Delete a company (admin only)
  app.delete('/api/admin/companies/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCompany(id);
      if (!success) {
        return res.status(404).json({ message: 'Company not found' });
      }
      res.json({ message: 'Company deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting company', error: (error as Error).message });
    }
  });

  // =====================================================
  // Admin Organization routes (legacy - backward compatibility)
  // =====================================================

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
        bufferAfter,
        req.query.timezone as string || 'UTC'
      );
      
      res.json(availableSlots);
    } catch (error) {
      res.status(500).json({ message: 'Error finding team availability', error: (error as Error).message });
    }
  });
  
  // User routes
  app.post('/api/register', registerRateLimiter, async (req, res) => {
    try {
      // Extract additional fields from request body
      const { 
        accountType, 
        isCompanyAccount, 
        isTeamAccount, 
        companyName, 
        teamName, 
        trialEndDate, 
        trialPlan, 
        ...userDataRaw 
      } = req.body;
      
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
      
      // Hash the password before storing it
      const hashedPassword = await hash(userData.password);
      userData.password = hashedPassword;

      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      let user;
      let stripeCustomer = null;
      let stripeSubscription = null;
      const fullName = `${userData.firstName} ${userData.lastName}`;

      // For company accounts, create organization and team
      if (accountType === 'company' && companyName) {
        try {
          // Create Stripe customer if Stripe is enabled
          stripeCustomer = await StripeService.createCustomer(
            companyName,
            userData.email,
            { 
              user_id: null, // Will update after user creation
              account_type: 'company',
              company_name: companyName
            }
          );

          // Create the company/organization
          const organization = await storage.createOrganization({
            name: companyName,
            description: `${companyName} organization`,
            stripeCustomerId: stripeCustomer?.id || null
          });
          
          // Create the user with organization link and emailVerified set to false
          user = await storage.createUser({
            ...userData,
            emailVerified: false,
            organizationId: organization.id
          });

          // Update Stripe customer with user ID if created
          if (stripeCustomer) {
            await StripeService.updateCustomer(
              stripeCustomer.id,
              { metadata: { user_id: user.id.toString() } }
            );
          }
          
          // Create "Team A" for this organization
          const team = await storage.createTeam({
            name: "Team A",
            description: "Default team for " + companyName,
            organizationId: organization.id
          });

          // Create Stripe subscription with 14-day trial period if Stripe is enabled
          if (stripeCustomer) {
            stripeSubscription = await StripeService.createSubscription(
              stripeCustomer.id,
              STRIPE_PRICES.ORGANIZATION, // Use appropriate price ID
              1, // Initial quantity
              14, // 14-day trial
              { 
                organization_id: organization.id.toString(),
                user_id: user.id.toString()
              }
            );

            // Save subscription in database if created
            if (stripeSubscription) {
              await storage.createSubscription({
                userId: user.id,
                organizationId: organization.id,
                teamId: null,
                stripeCustomerId: stripeCustomer.id,
                stripeSubscriptionId: stripeSubscription.id,
                status: SubscriptionStatus.TRIALING,
                plan: SubscriptionPlan.ORGANIZATION,
                quantity: 1, // This will track the number of teams
                trialEndsAt,
                currentPeriodStart: new Date(),
                currentPeriodEnd: trialEndsAt,
                
                metadata: {
                  createdFromRegistration: true,
                  noCreditCardRequired: true,
                  initialTeamCount: 1, // Starting with one team
                  teamsCreated: [team.id], // Track the teams created
                },
              });
            }
          }

          // Generate verification token and send email with enhanced diagnostics
          const emailResult = await sendVerificationEmail(user, req.session?.entryDomain);

          res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            accountType: 'company',
            emailVerificationSent: emailResult.success,
            emailVerificationRequired: true,
            emailDeliveryMethod: emailResult.deliveryMethod || null,
            emailMessageId: emailResult.messageId || null,
            sendGridConfigured: !!process.env.SENDGRID_API_KEY,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            verificationTs: Date.now(),
            organizationId: organization.id,
            organization: { id: organization.id, name: organization.name },
            team: { id: team.id, name: team.name },
            trialEndsAt,
            stripeCustomerId: stripeCustomer?.id || null,
            stripeSubscriptionId: stripeSubscription?.id || null,
            hasTrialSubscription: !!stripeSubscription
          });
        } catch (error) {
          console.error('Error creating company account:', error);
          res.status(500).json({ 
            message: 'Error creating company account', 
            error: (error as Error).message 
          });
        }
      } 
      // For team accounts, create team
      else if (accountType === 'team' && teamName) {
        try {
          // Create Stripe customer if Stripe is enabled
          stripeCustomer = await StripeService.createCustomer(
            fullName,
            userData.email,
            {
              user_id: null, // Will update after user creation
              account_type: 'team',
              team_name: teamName
            }
          );

          // Create the user with emailVerified set to false
          user = await storage.createUser({
            ...userData,
            emailVerified: false
          });

          // Update Stripe customer with user ID if created
          if (stripeCustomer) {
            await StripeService.updateCustomer(
              stripeCustomer.id,
              { metadata: { user_id: user.id.toString() } }
            );
          }

          // Create the team
          // Create a special "standalone team" organization for team accounts
          const standalone = await storage.createOrganization({
            name: `${fullName}'s Organization`,
            description: `Organization for ${teamName}`,
            stripeCustomerId: stripeCustomer?.id // Link to the Stripe customer if available
          });
          
          // Now create the team with the organization ID
          const team = await storage.createTeam({
            name: teamName,
            description: `Team created by ${fullName}`,
            organizationId: standalone.id // Connect to the standalone organization
          });

          // Create Stripe subscription with 14-day trial period if Stripe is enabled
          if (stripeCustomer) {
            stripeSubscription = await StripeService.createSubscription(
              stripeCustomer.id,
              STRIPE_PRICES.TEAM, // Use appropriate price ID
              1, // Initial quantity
              14, // 14-day trial
              {
                team_id: team.id.toString(),
                user_id: user.id.toString()
              }
            );

            // Save subscription in database if created
            if (stripeSubscription) {
              await storage.createSubscription({
                userId: user.id,
                organizationId: undefined, // Using undefined instead of null for optional fields
                teamId: team.id,
                stripeCustomerId: stripeCustomer.id,
                stripeSubscriptionId: stripeSubscription.id,
                status: SubscriptionStatus.TRIALING,
                plan: SubscriptionPlan.TEAM,
                quantity: 1, // Single team
                trialEndsAt,
                currentPeriodStart: new Date(),
                currentPeriodEnd: trialEndsAt,
                
                metadata: {
                  createdFromRegistration: true,
                  noCreditCardRequired: true,
                  memberCount: 1, // Start with the creator
                  members: [user.id], // Track members in the team
                },
              });
            }
          }

          // Associate user with the team
          await storage.updateUser(user.id, { teamId: team.id });

          // Generate verification token and send email with enhanced diagnostics
          const emailResult = await sendVerificationEmail(user, req.session?.entryDomain);

          res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            accountType: 'team',
            emailVerificationSent: emailResult.success,
            emailVerificationRequired: true,
            emailDeliveryMethod: emailResult.deliveryMethod || null,
            emailMessageId: emailResult.messageId || null,
            sendGridConfigured: !!process.env.SENDGRID_API_KEY,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            verificationTs: Date.now(),
            teamId: team.id,
            team: { id: team.id, name: team.name },
            trialEndsAt,
            stripeCustomerId: stripeCustomer?.id || null,
            stripeSubscriptionId: stripeSubscription?.id || null,
            hasTrialSubscription: !!stripeSubscription
          });
        } catch (error) {
          console.error('Error creating team account:', error);
          res.status(500).json({
            message: 'Error creating team account',
            error: (error as Error).message
          });
        }
      } 
      else {
        try {
          // Check if this is a demo account
          const isDemoAccount = req.body.isDemoAccount === true;
          console.log(`Creating individual account. Demo account: ${isDemoAccount ? 'Yes' : 'No'}`);
          
          // Create Stripe customer if Stripe is enabled
          stripeCustomer = await StripeService.createCustomer(
            fullName,
            userData.email,
            {
              user_id: null, // Will update after user creation
              account_type: 'individual',
              is_demo: isDemoAccount ? 'true' : 'false'
            }
          );

          // Create regular user with emailVerified set to false
          user = await storage.createUser({
            ...userData,
            emailVerified: false
          });

          // Update Stripe customer with user ID if created
          if (stripeCustomer) {
            await StripeService.updateCustomer(
              stripeCustomer.id,
              { metadata: { user_id: user.id.toString() } }
            );
          }

          // Create Stripe subscription with 14-day trial period if Stripe is enabled
          if (stripeCustomer) {
            // Use demo price if requested, otherwise use regular individual price
            const priceId = isDemoAccount ? STRIPE_PRICES.INDIVIDUAL_DEMO : STRIPE_PRICES.INDIVIDUAL;
            
            stripeSubscription = await StripeService.createSubscription(
              stripeCustomer.id,
              priceId,
              1, // Individual plan quantity
              14, // 14-day trial
              { 
                user_id: user.id.toString(),
                is_demo: isDemoAccount ? 'true' : 'false'
              }
            );

            // Save subscription in database if created
            if (stripeSubscription) {
              await storage.createSubscription({
                userId: user.id,
                organizationId: undefined,
                teamId: undefined,
                stripeCustomerId: stripeCustomer.id,
                stripeSubscriptionId: stripeSubscription.id,
                status: SubscriptionStatus.TRIALING,
                plan: SubscriptionPlan.INDIVIDUAL,
                quantity: 1,
                trialEndsAt,
                currentPeriodStart: new Date(),
                currentPeriodEnd: trialEndsAt,
                metadata: {
                  createdFromRegistration: true,
                  noCreditCardRequired: true,
                  isDemoAccount: isDemoAccount,
                },
              });
            }
          }

          // Generate verification token and send email with enhanced diagnostics
          const emailResult = await sendVerificationEmail(user, req.session?.entryDomain);

          res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            accountType: 'individual',
            isDemoAccount: isDemoAccount,
            emailVerificationSent: emailResult.success,
            emailVerificationRequired: true,
            emailDeliveryMethod: emailResult.deliveryMethod || null,
            emailMessageId: emailResult.messageId || null,
            sendGridConfigured: !!process.env.SENDGRID_API_KEY,
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            verificationTs: Date.now(),
            trialEndsAt,
            stripeCustomerId: stripeCustomer?.id || null,
            stripeSubscriptionId: stripeSubscription?.id || null,
            hasTrialSubscription: !!stripeSubscription,
            priceId: isDemoAccount ? STRIPE_PRICES.INDIVIDUAL_DEMO : STRIPE_PRICES.INDIVIDUAL
          });
        } catch (error) {
          console.error('Error creating individual account:', error);
          res.status(500).json({
            message: 'Error creating individual account',
            error: (error as Error).message
          });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        message: 'Invalid user data', 
        error: (error as Error).message 
      });
    }
  });
  
  // Helper function to send verification email
  async function sendVerificationEmail(user: any, entryDomain?: string) {
    try {
      console.log('Preparing to send verification email to user:', {
        id: user.id,
        email: user.email,
        username: user.username
      });

      // Generate a verification token
      const token = emailVerificationService.generateToken(user.id, user.email);

      // Create verification link - use the domain the user entered through for consistency
      const baseUrl = getBaseUrlForDomain(entryDomain);

      // Use direct API endpoint with the entry domain
      const verifyLink = `${baseUrl}/api/verify-email?token=${token}`;

      // Send verification email with enhanced diagnostics
      // Pass the entry domain for domain-aware FROM address
      console.log('Calling emailService.sendEmailVerificationEmail...');
      const emailResult = await emailService.sendEmailVerificationEmail(user.email, verifyLink, entryDomain);
      
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
      
      // Use the current request's domain for consistency
      // The user clicked a link that brought them to this domain, so redirect within the same domain
      const baseUrl = getBaseUrlForDomain(req.session?.entryDomain) || `${req.protocol}://${req.get('host')}`;
      console.log('Using domain for login redirect:', baseUrl);

      // Add a simple HTML response instead of redirecting directly
      // This ensures it works even if API is on a different domain than the frontend
      const loginUrl = `${baseUrl}/login?verified=true`;
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

  // Password hashing function using bcrypt
  async function hash(password: string): Promise<string> {
    const saltRounds = 12; // Higher number = more secure but slower
    return await bcrypt.hash(password, saltRounds);
  }

  // Password comparison function using bcrypt
  async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  app.post('/api/login', authRateLimiter, async (req, res) => {
    console.log("[API /api/login] Login attempt started");
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string()
      }).parse(req.body);
      
      console.log(`[API /api/login] Login attempt for username: ${username}`);

      const user = await storage.getUserByUsername(username);
      console.log(`[API /api/login] User lookup result: ${user ? 'Found' : 'Not found'}`);

      if (!user) {
        console.log(`[API /api/login] Login failed: User not found`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Use bcrypt to compare the plain password with the hashed password
      const passwordMatch = await comparePassword(password, user.password);
      console.log(`[API /api/login] Password match: ${passwordMatch ? 'Yes' : 'No'}`);

      if (!passwordMatch) {
        console.log(`[API /api/login] Login failed: Password mismatch`);
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Check if email is verified
      if (user.emailVerified === false) {
        console.log(`[API /api/login] User email not verified. Sending verification email to: ${user.email}`);
        // Regenerate verification token and send a new verification email with enhanced diagnostics
        const emailResult = await sendVerificationEmail(user, req.session?.entryDomain);
        console.log(`[API /api/login] Verification email sent result:`, emailResult);
        
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
      
      console.log(`[API /api/login] Login authentication successful. Setting session for user ID: ${user.id}, Role: ${user.role}`);
      
      // Set the session data
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.userRole = user.role;
      
      console.log(`[API /api/login] Session data set, saving session...`);
      
      // Save the session before responding
      req.session.save((err) => {
        if (err) {
          console.error('[API /api/login] Error saving session:', err);
          return res.status(500).json({ message: 'Error during login' });
        }
        
        console.log(`[API /api/login] Session saved successfully, returning user data`);

        // Check if user needs to change password
        if (user.forcePasswordChange) {
          console.log(`[API /api/login] User ${user.username} must change password on first login`);
        }

        // Include role, organization and team information
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          teamId: user.teamId,
          displayName: user.displayName,
          forcePasswordChange: user.forcePasswordChange || false
        });
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid login data', error: (error as Error).message });
    }
  });

  // Change password endpoint (used for forced password changes and voluntary changes)
  app.post('/api/change-password', authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
        confirmPassword: z.string()
      }).parse(req.body);

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New passwords do not match' });
      }

      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const passwordMatch = await comparePassword(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash and update the new password
      const hashedPassword = await hash(newPassword);
      const updatedUser = await storage.updateUser(userId, {
        password: hashedPassword,
        forcePasswordChange: false // Clear the forced password change flag
      });

      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update password' });
      }

      console.log(`✅ Password changed successfully for user: ${user.username}`);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Error changing password', error: (error as Error).message });
    }
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    console.log('[API /api/logout] Logout request received');

    if (!req.session.userId) {
      console.log('[API /api/logout] No active session found');
      return res.status(400).json({ message: 'No active session' });
    }

    const username = req.session.username;
    console.log(`[API /api/logout] Logging out user: ${username}`);

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('[API /api/logout] Error destroying session:', err);
        return res.status(500).json({ message: 'Error during logout' });
      }

      console.log(`[API /api/logout] Session destroyed successfully for user: ${username}`);
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Password reset routes
  
  // Request password reset
  // Create a simple in-memory rate limiter for password reset requests
  // This protects against brute force attacks and spam
  const resetRateLimiter = {
    // Track requests by IP and email
    attempts: new Map<string, {count: number, timestamp: number}>(),
    
    // Maximum of 3 attempts per 15-minute window
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    
    // Check if rate limit is exceeded
    isLimited(key: string): boolean {
      const now = Date.now();
      const record = this.attempts.get(key);
      
      // If no record exists or window has expired, not limited
      if (!record || now - record.timestamp > this.windowMs) {
        return false;
      }
      
      return record.count >= this.maxAttempts;
    },
    
    // Record an attempt
    addAttempt(key: string): void {
      const now = Date.now();
      const record = this.attempts.get(key);
      
      if (!record || now - record.timestamp > this.windowMs) {
        // First attempt or window expired, reset counter
        this.attempts.set(key, { count: 1, timestamp: now });
      } else {
        // Increment attempt count
        this.attempts.set(key, { 
          count: record.count + 1, 
          timestamp: record.timestamp 
        });
      }
    },
    
    // Get remaining attempts
    getRemainingAttempts(key: string): number {
      const now = Date.now();
      const record = this.attempts.get(key);
      
      if (!record || now - record.timestamp > this.windowMs) {
        return this.maxAttempts;
      }
      
      return Math.max(0, this.maxAttempts - record.count);
    },
    
    // Get time remaining in reset window (in seconds)
    getTimeRemaining(key: string): number {
      const now = Date.now();
      const record = this.attempts.get(key);
      
      if (!record || record.count < this.maxAttempts) {
        return 0;
      }
      
      const timeElapsed = now - record.timestamp;
      const timeRemaining = this.windowMs - timeElapsed;
      
      return Math.max(0, Math.ceil(timeRemaining / 1000));
    }
  };
  
  app.post('/api/reset-password/request', async (req, res) => {
    console.log('[API] Password reset request initiated');
    try {
      const { email } = z.object({
        email: z.string().email()
      }).parse(req.body);
      
      // Get client IP address for rate limiting
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `${ip}:${email.toLowerCase()}`;
      
      // Check if rate limited
      if (resetRateLimiter.isLimited(rateLimitKey)) {
        const timeRemaining = resetRateLimiter.getTimeRemaining(rateLimitKey);
        console.log(`[API] Rate limit exceeded for password reset: ${rateLimitKey}`);
        return res.status(429).json({
          success: false,
          message: `Too many password reset attempts. Please try again in ${Math.ceil(timeRemaining / 60)} minutes.`,
          timeRemaining
        });
      }
      
      // Record this attempt
      resetRateLimiter.addAttempt(rateLimitKey);
      const remainingAttempts = resetRateLimiter.getRemainingAttempts(rateLimitKey);

      // Find user by email
      const user = await storage.getUserByEmail(email);

      // Always return success even if user is not found for security reasons
      if (!user) {
        return res.json({ success: true });
      }

      try {
        // Generate reset token
        const token = await passwordResetService.generateToken(user.id, user.email);

        // Create reset link - use the domain the user entered through for consistency
        const baseUrl = getBaseUrlForDomain(req.session?.entryDomain);

        // Direct the user straight to the frontend route instead of going through an API endpoint
        const resetLink = `${baseUrl}/set-new-password?token=${token}`;

        // Send email with reset link
        // Pass the entry domain for domain-aware FROM address
        try {
          const emailSent = await emailService.sendPasswordResetEmail(user.email, resetLink, req.session?.entryDomain);

          if (!emailSent) {
            console.error('[API] Failed to send password reset email');
          }
        } catch (emailError) {
          console.error('[API] Error sending password reset email:', emailError);
        }

        res.json({ success: true });
      } catch (tokenError) {
        console.error('[API] Error generating password reset token:', tokenError);
        // Still return success for security reasons
        res.json({ success: true });
      }
    } catch (error) {
      console.error('[API] Error in password reset request:', error);
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
      const userId = await passwordResetService.validateToken(token);
      
      // Use the current request's domain for consistency
      // The user clicked a link that brought them to this domain, so redirect within the same domain
      const baseUrl = getBaseUrlForDomain(req.session?.entryDomain) || `${req.protocol}://${req.get('host')}`;
      console.log('Using domain for password reset redirect:', baseUrl);

      // Create the redirect URL based on the token validation
      const redirectUrl = userId
        ? `${baseUrl}/set-new-password?token=${token}`
        : `${baseUrl}/reset-password?error=invalid`;
        
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
      // Use the current request's domain for consistency
      const baseUrl = getBaseUrlForDomain(req.session?.entryDomain) || `${req.protocol}://${req.get('host')}`;
      console.log('Using domain for error redirect:', baseUrl);
      const errorUrl = `${baseUrl}/reset-password?error=server`;
      
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
  
  // Validate password reset token with enhanced status information
  app.get('/api/reset-password/validate', async (req, res) => {
    try {
      console.log(`[TOKEN-VALIDATION] Starting token validation request`);
      
      const token = req.query.token as string;
      const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      console.log(`[TOKEN-VALIDATION] Request from IP: ${clientIP}`);
      
      if (!token) {
        console.log(`[TOKEN-VALIDATION] Token missing in request`);
        return res.status(400).json({ 
          valid: false, 
          status: 'not_found',
          message: 'Token is required' 
        });
      }
      
      console.log(`[TOKEN-VALIDATION] Validating token: ${token.substring(0, 10)}...`);
      
      // Use the more robust getTokenStatus method for detailed validation
      const tokenResult = await passwordResetService.getTokenStatus(token);
      
      console.log(`[TOKEN-VALIDATION] Token status: ${tokenResult.status}`);
      
      if (tokenResult.status === 'valid') {
        console.log(`[TOKEN-VALIDATION] Valid token for user ID: ${tokenResult.userId}`);
        
        // Get user email for additional validation
        const email = await passwordResetService.getEmailFromToken(token);
        console.log(`[TOKEN-VALIDATION] Token email: ${email}`);
        
        return res.json({ 
          valid: true, 
          status: 'valid',
          message: 'Valid reset link',
          // Include sanitized user info for UI personalization if needed
          user: email ? { email: email.split('@')[0] + '@...' } : undefined
        });
      } else {
        // For invalid tokens, return the specific reason
        console.log(`[TOKEN-VALIDATION] Invalid token reason: ${tokenResult.status}`);
        return res.json({
          valid: false,
          status: tokenResult.status,
          message: tokenResult.message
        });
      }
    } catch (error) {
      console.error('Error validating reset token:', error);
      res.status(500).json({ 
        valid: false, 
        status: 'error',
        message: 'Error validating token', 
        error: (error as Error).message,
        stack: process.env.NODE_ENV === 'production' ? undefined : (error as Error).stack
      });
    }
  });
  
  // Reset password with token - Enhanced with better diagnostics
  app.post('/api/reset-password/reset', async (req, res) => {
    try {
      console.log(`[PASSWORD-RESET] Starting password reset process`);
      
      const { token, password } = z.object({
        token: z.string(),
        password: z.string().min(8) // Ensure password meets minimum requirements
      }).parse(req.body);
      
      console.log(`[PASSWORD-RESET] Token validation: ${token.substring(0, 10)}...`);
      
      // Get detailed token validation information
      const tokenResult = await passwordResetService.getTokenStatus(token);
      
      // If token is invalid, return specific error message
      if (tokenResult.status !== 'valid') {
        console.log(`[PASSWORD-RESET] Invalid token: ${tokenResult.status}`);
        return res.status(400).json({ 
          success: false, 
          status: tokenResult.status,
          message: tokenResult.message 
        });
      }
      
      const userId = tokenResult.userId;
      if (!userId) {
        console.log(`[PASSWORD-RESET] Token valid but no user ID found`);
        return res.status(400).json({ success: false, message: 'Invalid token: no user associated' });
      }
      
      // Update user's password
      console.log(`[PASSWORD-RESET] Getting user with ID: ${userId}`);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`[PASSWORD-RESET] User not found: ${userId}`);
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      console.log(`[PASSWORD-RESET] Updating password for user: ${user.username}`);
      
      // Hash the password before storing it
      const hashedPassword = await hash(password);
      await storage.updateUser(userId, { password: hashedPassword });
      
      // Consume token so it can't be used again
      console.log(`[PASSWORD-RESET] Consuming token: ${token.substring(0, 10)}...`);
      await passwordResetService.consumeToken(token);
      
      console.log(`[PASSWORD-RESET] Password reset successful for user: ${user.username}`);
      res.json({ 
        success: true,
        message: 'Password has been successfully reset'
      });
    } catch (error) {
      console.error('[PASSWORD-RESET] Error resetting password:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      
      // Specific error handling for common cases
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password validation failed. Ensure your password is at least 8 characters long.',
          errors: error.errors
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error processing your password reset request',
        errorType: error instanceof Error ? error.name : 'Unknown error'
      });
    }
  });

  // Protected routes
  app.use('/api/calendar', authMiddleware);
  app.use('/api/events', authMiddleware);
  app.use('/api/booking', authMiddleware);
  app.use('/api/settings', authMiddleware);
  app.use('/api/integrations', authMiddleware);
  app.use('/api/user', authMiddleware);
  app.use('/api/users', authMiddleware);
  app.use('/api/organizations', authMiddleware);
  app.use('/api/teams', authMiddleware);

  // Debug endpoint for testing password reset token generation and validation
  // This helps diagnose token issues in production
  // SECURITY FIX: Removed dangerous /api/debug/reset-password/token-test endpoint that allowed anyone to generate and validate password reset tokens without authentication

  // Special verification test page for problematic users
  app.get('/verify-reset', async (req, res) => {
    try {
      // Get the directory path using ESM approach
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const verificationPath = path.join(__dirname, 'verification-test.html');
      console.log(`Loading verification page from: ${verificationPath}`);
      
      // Read file using fs/promises
      const verificationHtml = await readFile(verificationPath, 'utf8');
      
      // Serve the HTML page
      res.setHeader('Content-Type', 'text/html');
      res.send(verificationHtml);
      
      console.log('📋 Verification test page accessed');
    } catch (error) {
      console.error('Error serving verification test page:', error);
      console.error('Error details:', error instanceof Error ? error.stack : String(error));
      res.status(500).send('Error loading verification page');
    }
  });

  // Test email endpoint (API version) - accessible to all users for testing
  app.post('/api/email/test', async (req, res) => {
    try {
      const { email } = z.object({
        email: z.string().email()
      }).parse(req.body);
      
      console.log(`🔍 TEST EMAIL REQUEST: Attempting to send test email to: ${email}`);

      // Validate email configuration
      if (!process.env.FROM_EMAIL) {
        console.error('[API] FROM_EMAIL is not set');
      }
      if (!process.env.SENDGRID_API_KEY) {
        console.error('[API] SENDGRID_API_KEY is not set');
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
              <li>SendGrid: ${process.env.SENDGRID_API_KEY ? "Configured ✓" : "Not configured ⚠️"}</li>
              <li>Time sent: ${timestamp}</li>
              <li>Server domain: ${process.env.SERVER_DOMAIN || 'unknown'}</li>
            </ul>

            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
              <p><strong>Troubleshooting Tips:</strong></p>
              <ul>
                <li>Check spam/junk folders</li>
                <li>Verify SendGrid API key is configured</li>
                <li>Ensure your sending domain has proper DNS records (MX, SPF, DMARC)</li>
                <li>Check SendGrid dashboard for delivery status</li>
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
            sendGridConfigured: !!process.env.SENDGRID_API_KEY
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
            sendGridConfigured: !!process.env.SENDGRID_API_KEY
          },
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
          sendGridConfigured: !!process.env.SENDGRID_API_KEY
        }
      });
    }
  });

  // User management routes - Modified to allow org admins and team managers to see their users
  // Endpoint for getting current user data
  app.get('/api/users/current', authMiddleware, async (req, res) => {
    try {
      console.log("[API /api/users/current] Fetching user ID:", req.userId);
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user without sensitive information
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("[API /api/users/current] Error:", error);
      res.status(500).json({ message: 'Error fetching current user', error: (error as Error).message });
    }
  });
  
  app.get('/api/users', authMiddleware, async (req, res) => {
    console.log("[API /api/users] Received request from user ID:", req.userId, "Role:", req.userRole);
    try {
      let users: User[] = [];
      
      // For global admin, return all users
      if (req.userRole === UserRole.ADMIN) {
        console.log("[API /api/users] Admin user - Fetching all users with storage.getAllUsers()");
        users = await storage.getAllUsers();
      } 
      // For company admin, return all users in their organization
      else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        console.log(`[API /api/users] Company admin - Fetching users for organization ID: ${req.organizationId}`);
        users = await storage.getUsersByOrganization(req.organizationId);
      } 
      // For team manager, return all users in their team
      else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId) {
        console.log(`[API /api/users] Team manager - Fetching users for team ID: ${req.teamId}`);
        users = await storage.getUsersByTeam(req.teamId);
      } 
      // For regular users, return 403 Forbidden
      else {
        console.log("[API /api/users] Regular user - Access denied");
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to view users' });
      }
      
      console.log(`[API /api/users] Fetched ${users.length} users successfully`);
      
      // Log the first few users to diagnose issues
      if (users.length > 0) {
        console.log(`[API /api/users] First user: ID: ${users[0].id}, Username: ${users[0].username}, Role: ${users[0].role}`);
      } else {
        console.log("[API /api/users] WARNING: No users found in the database for this user's scope");
      }
      
      res.json(users);
    } catch (error) {
      console.error("[API /api/users] Error fetching users:", error);
      res.status(500).json({ message: 'Error fetching users', error: (error as Error).message });
    }
  });
  
  // SECURITY FIX: Removed dangerous /api/debug/all-users endpoint that exposed all user data without authentication

  // Production troubleshooting endpoint for checking user permissions
  app.get('/api/auth-status', async (req, res) => {
    console.log("[API /api/auth-status] Checking auth status");
    
    // Check if session exists
    const sessionExists = !!req.session.userId;
    console.log(`[API /api/auth-status] Session exists: ${sessionExists}`);
    
    // Detailed session data (without sensitive info)
    const sessionData = {
      userId: req.session.userId || null,
      username: req.session.username || null,
      userRole: req.session.userRole || null
    };
    
    let userData = null;
    if (sessionData.userId) {
      try {
        const user = await storage.getUser(sessionData.userId);
        if (user) {
          // Don't send password
          const { password, ...safeUserData } = user;
          userData = safeUserData;
          console.log(`[API /api/auth-status] Found user: ${userData.username}, Role: ${userData.role}`);
        } else {
          console.log(`[API /api/auth-status] No user found with ID: ${sessionData.userId}`);
        }
      } catch (error) {
        console.error(`[API /api/auth-status] Error fetching user: ${error}`);
      }
    }
    
    res.json({
      isAuthenticated: sessionExists,
      sessionData,
      userData,
      environment: process.env.NODE_ENV || 'development',
      usingPostgres: process.env.NODE_ENV === 'production'
    });
  });
  
  // New comprehensive auth check endpoint for production diagnostics
  // SECURITY FIX: Removed dangerous /api/auth-check endpoint that exposed session data, user data, and database information without authentication
  
  // SECURITY FIX: Removed dangerous /api/debug/users/:id DELETE endpoint that allowed anyone to delete user accounts

  // SECURITY FIX: Removed dangerous unauthenticated session debugging endpoints:
  // - /api/session-debug (exposed session data without authentication)
  // - /api/set-session-test (allowed session manipulation without authentication)
  // - /api/get-session-test (exposed session data without authentication)
  // - /api/fix-user-role (allowed anyone to change user roles without authentication)

  app.post('/api/users', adminOnly, async (req, res) => {
    try {
      const { passwordMode, sendWelcomeEmail, ...bodyData } = req.body;

      // Import password generator
      const { generateSimplePassword } = await import('./utils/passwordGenerator');

      // Handle password based on mode
      let plainPassword: string;
      if (passwordMode === 'auto-generate') {
        plainPassword = generateSimplePassword(8);
      } else {
        // Manual mode - password is required
        if (!bodyData.password) {
          return res.status(400).json({ message: 'Password is required when using manual password mode' });
        }
        plainPassword = bodyData.password;
      }

      // Hash the password before storing
      const hashedPassword = await hash(plainPassword);
      bodyData.password = hashedPassword;

      // If sending welcome email, set forcePasswordChange to true
      if (sendWelcomeEmail) {
        bodyData.forcePasswordChange = true;
        bodyData.emailVerified = true; // Admin-created users with email are verified
      }

      const userData = insertUserSchema.parse(bodyData);

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

      // Send welcome email with credentials if requested
      if (sendWelcomeEmail && user.email) {
        const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
        const loginLink = `${baseUrl}/login`;

        try {
          await emailService.sendAccountCredentialsEmail(
            user.email,
            user.username,
            plainPassword,
            loginLink
          );
          console.log(`✅ Account credentials email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`⚠️ Failed to send account credentials email to ${user.email}:`, emailError);
          // Don't fail user creation if email fails
        }
      }

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        teamId: user.teamId,
        emailSent: sendWelcomeEmail || false
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

      // Validate update data - allow different fields based on user role
      const isAdmin = req.userRole === UserRole.ADMIN;

      const baseAllowedFields = {
        displayName: true,
        profilePicture: true,
        avatarColor: true,
        bio: true,
        email: true,
        timezone: true
      };

      // Admins can update additional fields
      const adminAllowedFields = {
        ...baseAllowedFields,
        username: true,
        role: true,
        organizationId: true,
        teamId: true,
        emailVerified: true,
        displayName: true,
        firstName: true,
        lastName: true
      };

      const allowedFields = isAdmin ? adminAllowedFields : baseAllowedFields;

      // Filter the request body to only include allowed fields
      const updateData: any = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key in allowedFields) {
          updateData[key] = value;
        }
      }

      // Admin-specific validations
      if (isAdmin) {
        // Validate role if being updated
        if (updateData.role !== undefined) {
          const validRoles = [UserRole.ADMIN, UserRole.COMPANY_ADMIN, UserRole.TEAM_MANAGER, UserRole.USER];
          if (!validRoles.includes(updateData.role)) {
            return res.status(400).json({ message: 'Invalid role' });
          }
        }

        // Check if username is being updated and if it's already in use
        if (updateData.username && updateData.username !== user.username) {
          const existingUsername = await storage.getUserByUsername(updateData.username);
          if (existingUsername) {
            return res.status(400).json({ message: 'Username already in use' });
          }
        }

        // Validate organizationId if being updated
        if (updateData.organizationId !== undefined && updateData.organizationId !== null) {
          const org = await storage.getOrganization(updateData.organizationId);
          if (!org) {
            return res.status(400).json({ message: 'Organization not found' });
          }
        }

        // Validate teamId if being updated
        if (updateData.teamId !== undefined && updateData.teamId !== null) {
          const team = await storage.getTeam(updateData.teamId);
          if (!team) {
            return res.status(400).json({ message: 'Team not found' });
          }
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
  
  // Delete user (admin, company admin, team manager based on their scope)
  app.delete('/api/users/:id', authMiddleware, async (req, res) => {
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
      
      // Check permissions based on role
      let canDelete = false;
      
      if (req.userRole === UserRole.ADMIN) {
        // Admins can delete any user
        canDelete = true;
      } else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        // Company admins can only delete users in their organization who are not admins
        canDelete = (user.organizationId === req.organizationId && 
                    user.role !== UserRole.ADMIN);
      } else if (req.userRole === UserRole.TEAM_MANAGER && req.teamId) {
        // Team managers can only delete regular users in their team, not admins or company admins
        canDelete = (user.teamId === req.teamId && 
                    user.role !== UserRole.ADMIN && 
                    user.role !== UserRole.COMPANY_ADMIN);
      }
      
      if (!canDelete) {
        return res.status(403).json({ 
          message: 'Forbidden: You do not have permission to delete this user',
          details: 'You cannot delete users with higher role privileges or outside your scope'
        });
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

  // =====================================================
  // Company routes (preferred - new terminology)
  // =====================================================

  // Get all companies (role-based filtering)
  app.get('/api/companies', authMiddleware, async (req, res) => {
    try {
      // Admins can see all companies
      if (req.userRole === UserRole.ADMIN) {
        const companies = await storage.getCompanies();
        return res.json(companies);
      }

      // Company admins can see their company
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        const company = await storage.getCompany(req.organizationId);
        return res.json(company ? [company] : []);
      }

      // Team managers and regular users can only see their company if they're part of one
      if (req.organizationId) {
        const company = await storage.getCompany(req.organizationId);
        return res.json(company ? [company] : []);
      }

      res.json([]);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching companies', error: (error as Error).message });
    }
  });

  // Get a single company
  app.get('/api/companies/:id', authMiddleware, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      // Check permissions
      if (req.userRole !== UserRole.ADMIN && req.organizationId !== companyId) {
        return res.status(403).json({ message: 'You do not have access to this company' });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      res.json(company);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching company', error: (error as Error).message });
    }
  });

  // Create a company (admin only)
  app.post('/api/companies', authMiddleware, adminOnly, async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: 'Invalid company data', error: (error as Error).message });
    }
  });

  // Update a company
  app.patch('/api/companies/:id', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      // Company admins can only update their own company
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId !== companyId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own company' });
      }

      const updatedCompany = await storage.updateCompany(companyId, req.body);
      if (!updatedCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }

      res.json(updatedCompany);
    } catch (error) {
      res.status(500).json({ message: 'Error updating company', error: (error as Error).message });
    }
  });

  // Delete a company (admin only)
  app.delete('/api/companies/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      const success = await storage.deleteCompany(companyId);
      if (!success) {
        return res.status(404).json({ message: 'Company not found' });
      }

      res.json({ message: 'Company deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting company', error: (error as Error).message });
    }
  });

  // Get users in a company
  app.get('/api/companies/:id/users', authMiddleware, adminAndCompanyAdmin, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      // Company admins can only access their own company's users
      if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId !== companyId) {
        return res.status(403).json({ message: 'Forbidden: You can only view users in your own company' });
      }

      const users = await storage.getUsersByCompany(companyId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching company users', error: (error as Error).message });
    }
  });

  // Get teams in a company
  app.get('/api/companies/:id/teams', authMiddleware, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      // Check permissions
      if (req.userRole !== UserRole.ADMIN && req.organizationId !== companyId) {
        return res.status(403).json({ message: 'Forbidden: You can only view teams in your own company' });
      }

      const teams = await storage.getTeamsByCompany(companyId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching company teams', error: (error as Error).message });
    }
  });

  // =====================================================
  // Organization routes (legacy - backward compatibility)
  // These routes are deprecated, use /api/companies instead
  // =====================================================

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
      const updatedUser = await storage.updateUser(userId, { organizationId: undefined });
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
      const sanitized = integrations.map(integration => ({
        ...integration,
        accessToken: undefined,
        refreshToken: undefined,
        isConnected: integration.isConnected && !!integration.accessToken,
      }));
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching integrations', error: (error as Error).message });
    }
  });

  // Google Calendar Integration
  app.get('/api/integrations/google/auth', async (req, res) => {
    try {
      const { name } = req.query;
      const calendarName = typeof name === 'string' ? name : 'My Google Calendar';

      // Get the origin domain from session or request for multi-domain OAuth support
      const originDomain = req.session?.entryDomain || req.get('host')?.split(':')[0];

      const service = new GoogleCalendarService(req.userId);
      const authUrl = await service.getAuthUrl(originDomain);
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

      // Parse the state parameter which may contain custom calendar name and origin domain
      let calendarName = 'My Google Calendar';
      let originDomain: string | undefined;
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            calendarName = stateData.name;
          }
          if (stateData.origin) {
            originDomain = stateData.origin;
          }
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }

      // Fall back to request host if origin not in state
      if (!originDomain) {
        originDomain = req.get('host')?.split(':')[0];
      }

      console.log('Attempting to exchange auth code for tokens...');
      console.log('Using origin domain:', originDomain);
      const service = new GoogleCalendarService(req.userId);
      const integration = await service.handleAuthCallback(code, 'primary', calendarName, originDomain);
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
        // Delete all events associated with this calendar integration
        const deletedCount = await storage.deleteEventsByCalendarIntegration(integrationId);
        console.log(`Deleted ${deletedCount} events associated with Google Calendar integration ${integrationId}`);
        
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
        
        res.json({ message: 'Successfully disconnected from Google Calendar', eventsDeleted: deletedCount });
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

      // Get the origin domain from session or request for multi-domain OAuth support
      const originDomain = req.session?.entryDomain || req.get('host')?.split(':')[0];

      const service = new OutlookCalendarService(req.userId);
      const authUrl = await service.getAuthUrl(originDomain);
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

      // Parse the state parameter which may contain custom calendar name and origin domain
      let calendarName = 'My Outlook Calendar';
      let originDomain: string | undefined;
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            calendarName = stateData.name;
          }
          if (stateData.origin) {
            originDomain = stateData.origin;
          }
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }

      // Fall back to request host if origin not in state
      if (!originDomain) {
        originDomain = req.get('host')?.split(':')[0];
      }

      console.log('Attempting to exchange auth code for tokens...');
      console.log('Using origin domain:', originDomain);
      const service = new OutlookCalendarService(req.userId);
      const integration = await service.handleAuthCallback(code, 'primary', calendarName, originDomain);
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
        // Delete all events associated with this calendar integration
        const deletedCount = await storage.deleteEventsByCalendarIntegration(integrationId);
        console.log(`Deleted ${deletedCount} events associated with Outlook Calendar integration ${integrationId}`);
        
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
        // Delete all events associated with this calendar integration
        const deletedCount = await storage.deleteEventsByCalendarIntegration(integrationId);
        console.log(`Deleted ${deletedCount} events associated with iCalendar integration ${integrationId}`);
        
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

  // iCloud Calendar Integration
  // Note: iCloud Calendar requires CalDAV protocol with app-specific passwords
  app.post('/api/integrations/icloud/connect', async (req, res) => {
    try {
      const { appleId, appSpecificPassword, name } = z.object({
        appleId: z.string().email(),
        appSpecificPassword: z.string().min(1),
        name: z.string().optional()
      }).parse(req.body);

      const calendarName = name || 'iCloud Calendar';

      const service = new ICloudService(req.userId);
      const integration = await service.connect(appleId, appSpecificPassword, calendarName);

      // Set as primary if it's the first iCloud Calendar for this user
      const icloudCalendars = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'icloud');

      if (icloudCalendars.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });

        // Update user settings if no other calendar is set as default
        const otherCalendars = (await storage.getCalendarIntegrations(req.userId))
          .filter(cal => (cal.type === 'google' || cal.type === 'outlook') && cal.isPrimary);

        if (otherCalendars.length === 0) {
          const settings = await storage.getSettings(req.userId);
          if (settings) {
            await storage.updateSettings(req.userId, {
              defaultCalendar: 'icloud',
              defaultCalendarIntegrationId: integration.id
            });
          }
        }
      }

      res.json({ message: 'Successfully connected to iCloud Calendar', integration });
    } catch (error) {
      console.error('Error connecting to iCloud Calendar:', error);
      res.status(500).json({ message: 'Error connecting to iCloud Calendar', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/icloud/disconnect/:id', async (req, res) => {
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

      const service = new ICloudService(req.userId);
      const success = await service.disconnect(integrationId);

      if (success) {
        res.json({ message: 'iCloud Calendar disconnected successfully' });
      } else {
        res.status(404).json({ message: 'Calendar not found or already disconnected' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error disconnecting iCloud Calendar', error: (error as Error).message });
    }
  });

  app.post('/api/integrations/icloud/:id/primary', async (req, res) => {
    try {
      const { id } = req.params;
      const integrationId = parseInt(id);

      if (isNaN(integrationId)) {
        return res.status(400).json({ message: 'Invalid integration ID' });
      }

      // Verify this integration belongs to the user
      const integration = await storage.getCalendarIntegration(integrationId);
      if (!integration || integration.userId !== req.userId || integration.type !== 'icloud') {
        return res.status(403).json({ message: 'Not authorized to modify this calendar' });
      }

      // Clear primary flag from all other iCloud calendars for this user
      const userIntegrations = await storage.getCalendarIntegrations(req.userId);
      for (const cal of userIntegrations) {
        if (cal.type === 'icloud' && cal.id !== integrationId && cal.isPrimary) {
          await storage.updateCalendarIntegration(cal.id, { isPrimary: false });
        }
      }

      // Set this one as primary
      await storage.updateCalendarIntegration(integrationId, { isPrimary: true });

      // Update settings to use this as the default
      const settings = await storage.getSettings(req.userId);
      if (settings) {
        await storage.updateSettings(req.userId, {
          defaultCalendar: 'icloud',
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

  // Zoom OAuth: Get auth URL
  app.get('/api/integrations/zoom/auth', async (req, res) => {
    try {
      const { generateZoomAuthUrl } = await import('./utils/oauthUtils');
      const { name } = req.query;
      const calendarName = typeof name === 'string' ? name : 'Zoom Integration';

      const origin = req.get('origin') || req.get('referer') || '';
      let originDomain = '';
      try {
        if (origin) {
          originDomain = new URL(origin).hostname;
        }
      } catch (e) {}
      if (!originDomain) {
        originDomain = req.get('host')?.split(':')[0] || '';
      }

      const authUrl = generateZoomAuthUrl(calendarName, originDomain);
      res.json({ authUrl, name: calendarName });
    } catch (error) {
      res.status(500).json({ message: 'Error generating Zoom auth URL', error: (error as Error).message });
    }
  });

  // Zoom OAuth: Callback
  app.get('/api/integrations/zoom/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      let originDomain = '';
      let integrationName = 'Zoom Integration';
      try {
        if (state && typeof state === 'string') {
          const stateData = JSON.parse(decodeURIComponent(state));
          if (stateData.name) {
            integrationName = stateData.name;
          }
          if (stateData.origin) {
            originDomain = stateData.origin;
          }
        }
      } catch (e) {
        // ignore state parse errors
      }

      if (error) {
        console.error('Zoom OAuth error:', error);
        return res.redirect(`/integrations?error=zoom_auth_failed&reason=${encodeURIComponent(error as string)}`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect('/integrations?error=zoom_auth_failed&reason=no_code');
      }

      const zoom = new ZoomService(req.userId);
      const integration = await zoom.handleAuthCallback(code, integrationName, originDomain);

      const zoomIntegrations = (await storage.getCalendarIntegrations(req.userId))
        .filter(cal => cal.type === 'zoom');

      if (zoomIntegrations.length === 1) {
        await storage.updateCalendarIntegration(integration.id, { isPrimary: true });
      }

      res.redirect('/integrations?success=zoom_connected');
    } catch (error) {
      console.error('Error handling Zoom auth callback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.redirect(`/integrations?error=zoom_auth_failed&reason=${encodeURIComponent(errorMessage)}`);
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
        return res.status(403).json({ message: 'Not authorized to disconnect this integration' });
      }
      
      // Disconnect from Zoom
      const zoom = new ZoomService(req.userId);
      await zoom.disconnect(integrationId);
      
      // Delete all events associated with this Zoom integration
      const deletedCount = await storage.deleteEventsByCalendarIntegration(integrationId);
      console.log(`Deleted ${deletedCount} events associated with Zoom integration ${integrationId}`);
      
      res.status(200).json({ success: true, eventsDeleted: deletedCount });
    } catch (error) {
      res.status(400).json({ message: 'Error disconnecting from Zoom', error: (error as Error).message });
    }
  });
  
  // Create a Zoom meeting
  app.post('/api/integrations/zoom/create-meeting', async (req, res) => {
    try {
      const { title, startTime, endTime, description } = z.object({
        title: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        description: z.string().optional()
      }).parse(req.body);
      
      // Create an event object for the Zoom service
      const event: Event = {
        id: 0, // Temporary ID
        userId: req.userId,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: 'Zoom Meeting',
        meetingUrl: null,
        isAllDay: false,
        externalId: null,
        calendarType: 'zoom',
        calendarIntegrationId: null,
        attendees: [],
        reminders: [],
        timezone: null,
        recurrence: null
      };
      
      // Create the Zoom service
      const zoom = new ZoomService(req.userId);
      await zoom.initialize();
      
      // Create a Zoom meeting
      const meetingUrl = await zoom.createMeeting(event);
      
      res.status(201).json({ meetingUrl });
    } catch (error) {
      res.status(400).json({ message: 'Error creating Zoom meeting', error: (error as Error).message });
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
      
      // Validate meeting type against available integrations
      if (bookingLinkData.meetingType === 'google-meet' || bookingLinkData.autoCreateMeetLink) {
        const integrations = await storage.getCalendarIntegrations(req.userId!);
        const hasGoogle = integrations.some(i => i.type === 'google' && i.isConnected);
        if (!hasGoogle) {
          return res.status(400).json({ message: 'Google Calendar integration is required for Google Meet booking links. Please connect Google Calendar in Integrations.' });
        }
      }
      if (bookingLinkData.meetingType === 'zoom') {
        const integrations = await storage.getCalendarIntegrations(req.userId!);
        const hasZoom = integrations.some(i => i.type === 'zoom' && i.isConnected);
        if (!hasZoom) {
          return res.status(400).json({ message: 'Zoom integration is required for Zoom booking links. Please connect Zoom in Integrations.' });
        }
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
      
      // Validate meeting type against available integrations using effective values
      const effectiveMeetingType = req.body.meetingType ?? bookingLink.meetingType;
      const effectiveAutoMeet = req.body.autoCreateMeetLink ?? bookingLink.autoCreateMeetLink;
      if (effectiveMeetingType === 'google-meet' || effectiveAutoMeet) {
        const integrations = await storage.getCalendarIntegrations(req.userId!);
        const hasGoogle = integrations.some(i => i.type === 'google' && i.isConnected);
        if (!hasGoogle) {
          return res.status(400).json({ message: 'Google Calendar integration is required for Google Meet booking links. Please connect Google Calendar in Integrations.' });
        }
      }
      if (effectiveMeetingType === 'zoom') {
        const integrations = await storage.getCalendarIntegrations(req.userId!);
        const hasZoom = integrations.some(i => i.type === 'zoom' && i.isConnected);
        if (!hasZoom) {
          return res.status(400).json({ message: 'Zoom integration is required for Zoom booking links. Please connect Zoom in Integrations.' });
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

  // Helper function to generate user path for URL
  function generateUserPath(user: User): string {
    console.log(`[USER_PATH] Generating path for user:`, JSON.stringify({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName
    }));
    
    // If first and last name are available, use them
    if (user.firstName && user.lastName) {
      const path = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`;
      console.log(`[USER_PATH] Generated from first/last name: ${path}`);
      return path;
    }
    
    // If display name is available, try to extract first and last name
    if (user.displayName && user.displayName.includes(" ")) {
      const nameParts = user.displayName.split(" ");
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const path = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        console.log(`[USER_PATH] Generated from display name: ${path}`);
        return path;
      }
    }
    
    // Fall back to username
    console.log(`[USER_PATH] Falling back to username: ${user.username.toLowerCase()}`);
    return user.username.toLowerCase();
  }

  // Helper function to check for name collisions
  async function hasNameCollision(user: User): Promise<boolean> {
    // Get all users
    const allUsers = await storage.getAllUsers();
    
    // Generate path for current user
    const userPath = generateUserPath(user);
    
    // Check if any other user has the same path
    return allUsers.some(otherUser => 
      otherUser.id !== user.id && generateUserPath(otherUser) === userPath
    );
  }

  // Helper function to get unique user path
  async function getUniqueUserPath(user: User): Promise<string> {
    console.log(`[USER_PATH] Getting unique path for user ID ${user.id}, username: ${user.username}`);
    
    // If there's a name collision, always use username
    if (await hasNameCollision(user)) {
      console.log(`[USER_PATH] Name collision detected for user ${user.id}, using username instead: ${user.username.toLowerCase()}`);
      return user.username.toLowerCase();
    }
    
    // Otherwise use the regular path generation
    const path = generateUserPath(user);
    console.log(`[USER_PATH] Final path generated for user ${user.id}: ${path}`);
    return path;
  }

  // Public API for booking (legacy format - maintain backward compatibility)
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
      
      // Check if the owner has preferred timezone in settings
      const ownerSettings = await storage.getSettings(bookingLink.userId);
      const preferredTimezone = ownerSettings?.preferredTimezone || owner.timezone || "UTC";
      
      console.log(`[Booking] Owner preferred timezone: ${preferredTimezone} for booking link ${slug}`);

      // Fetch custom questions for the booking link
      const questions = await storage.getCustomQuestions(bookingLink.id);
      const enabledQuestions = questions.filter(q => q.enabled);

      // Check if one-off link has expired
      if (bookingLink.isOneOff && bookingLink.isExpired) {
        return res.status(410).json({ message: 'This booking link has expired after use' });
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
        ownerTimezone: preferredTimezone,
        isTeamBooking: bookingLink.isTeamBooking || false,
        teamName: teamName,
        ownerProfilePicture: owner.profilePicture,
        ownerAvatarColor: owner.avatarColor,
        customQuestions: enabledQuestions,
        brandLogo: bookingLink.brandLogo || null,
        brandColor: bookingLink.brandColor || null,
        removeBranding: bookingLink.removeBranding || false,
        redirectUrl: bookingLink.redirectUrl || null,
        confirmationMessage: bookingLink.confirmationMessage || null,
        confirmationCta: bookingLink.confirmationCta || null,
        isOneOff: bookingLink.isOneOff || false,
        requirePayment: bookingLink.requirePayment || false,
        price: bookingLink.price || null,
        currency: bookingLink.currency || 'usd',
        meetingType: bookingLink.meetingType || 'in-person',
        location: bookingLink.meetingType === 'in-person' ? (bookingLink.location || null) : null,
        meetingUrl: bookingLink.meetingType === 'custom' ? (bookingLink.meetingUrl || null) : null,
        autoCreateMeetLink: bookingLink.autoCreateMeetLink || false,
        isCollective: bookingLink.isCollective || false,
        collectiveMemberIds: bookingLink.collectiveMemberIds || [],
        rotatingMemberIds: bookingLink.rotatingMemberIds || [],
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
      
      // Get the owner's preferred timezone setting
      const owner = await storage.getUser(bookingLink.userId);
      let ownerSettings = await storage.getSettings(bookingLink.userId);
      
      // Determine which timezone to use (priority: query param > owner preference > UTC)
      let preferredTimezone = 'UTC';
      
      if (timezone) {
        // If the client explicitly requested a timezone, use that
        preferredTimezone = timezone as string;
        console.log(`[Timezone] Using client-requested timezone: ${preferredTimezone}`);
      } else if (ownerSettings?.preferredTimezone) {
        // Otherwise use owner's preferred timezone
        preferredTimezone = ownerSettings.preferredTimezone;
        console.log(`[Timezone] Using owner's preferred timezone: ${preferredTimezone}`);
      } else if (owner?.timezone) {
        // Fall back to user timezone if set
        preferredTimezone = owner.timezone;
        console.log(`[Timezone] Using owner's user account timezone: ${preferredTimezone}`);
      }
      
      // Log the timezone being used
      console.log(`[Availability] Using timezone: ${preferredTimezone} for booking link ${slug}`);
      
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
        
        // Find availability when ANY team member is free (union of availabilities)
        const slotsWithMembers = await teamSchedulingService.findAnyMemberAvailability(
          teamMemberIds,
          start,
          end,
          bookingLink.duration,
          bookingLink.bufferBefore || 0,
          bookingLink.bufferAfter || 0,
          preferredTimezone,
          bookingLink.startTimeIncrement || 30,
          bookingLink.availabilityScheduleId,
          bookingLink.userId
        );
        
        // Return slots with available member info for proper assignment
        return res.json(slotsWithMembers.map(slot => ({
          start: slot.start,
          end: slot.end,
          availableMembers: slot.availableMembers
        })));
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
          bookingLink.bufferAfter || 0,
          preferredTimezone,
          bookingLink.startTimeIncrement || 30,
          bookingLink.availabilityScheduleId,
          bookingLink.userId
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

      // Parse the dates safely
      let parsedDates;
      try {
        parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);
      } catch (dateError) {
        console.error('[BOOKING] Date parsing error:', dateError);
        return res.status(400).json({
          message: 'Invalid date format in booking request',
          error: dateError instanceof Error ? dateError.message : 'Failed to parse dates'
        });
      }

      // Now validate with properly parsed Date objects
      let bookingData;
      try {
        bookingData = insertBookingSchema.omit({ eventId: true }).parse({
          ...req.body,
          startTime: parsedDates.startTime,
          endTime: parsedDates.endTime,
          bookingLinkId: bookingLink.id
        });
      } catch (validationError) {
        console.error('[BOOKING] Validation error:', validationError);
        return res.status(400).json({
          message: 'Invalid booking data',
          error: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
      }

      // Use the parsed dates for further processing
      const startTime = parsedDates.startTime;
      const endTime = parsedDates.endTime;

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

      // Use advisory lock to prevent double-booking race condition
      // Lock key is booking link ID to serialize bookings on the same link
      const lockKey = bookingLink.id;
      let lockAcquired = false;
      let booking;
      let assignedUserId = bookingLink.userId; // Default to the booking link owner

      try {
        // Acquire advisory lock (blocks until lock is available)
        await pool.query('SELECT pg_advisory_lock($1)', [lockKey]);
        lockAcquired = true;

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

        // Create the booking (still inside the lock)
        booking = await storage.createBooking(bookingData);
      } finally {
        // Always release the lock
        if (lockAcquired) {
          await pool.query('SELECT pg_advisory_unlock($1)', [lockKey]);
        }
      }

      // Create an event for the booking (outside the lock - not timing-sensitive)
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

      // Send booking confirmation emails to both host and guest
      try {
        const hostUser = await storage.getUser(assignedUserId);
        const hostEmail = hostUser?.email || bookingLink.userId.toString();
        const guestEmail = bookingData.email;

        console.log(`Sending booking confirmation to host: ${hostEmail} and guest: ${guestEmail}`);
        await emailService.sendBookingConfirmation(createdEvent, hostEmail, guestEmail);
        console.log('Booking confirmation emails sent successfully');
      } catch (emailError) {
        console.error('Failed to send booking confirmation email:', emailError);
        // Don't fail the booking if email fails - just log the error
      }

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

  // Contacts Routes
  app.get('/api/contacts', async (req, res) => {
    try {
      // Get all bookings for this user
      const allBookings = await storage.getUserBookings(req.userId);

      // Aggregate unique contacts from bookings
      const contactsMap = new Map<string, {
        email: string;
        name: string;
        totalBookings: number;
        lastBookingDate: Date;
        firstBookingDate: Date;
      }>();

      allBookings.forEach(booking => {
        const email = booking.email.toLowerCase();
        const existing = contactsMap.get(email);

        if (existing) {
          // Update existing contact
          existing.totalBookings++;
          const createdAt = booking.createdAt ?? new Date();
          if (createdAt > existing.lastBookingDate) {
            existing.lastBookingDate = createdAt;
          }
          if (createdAt < existing.firstBookingDate) {
            existing.firstBookingDate = createdAt;
          }
        } else {
          // Add new contact
          const createdAt = booking.createdAt ?? new Date();
          contactsMap.set(email, {
            email: booking.email,
            name: booking.name,
            totalBookings: 1,
            lastBookingDate: createdAt,
            firstBookingDate: createdAt
          });
        }
      });

      // Convert map to array and sort by last booking date
      const contacts = Array.from(contactsMap.values())
        .sort((a, b) => b.lastBookingDate.getTime() - a.lastBookingDate.getTime());

      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching contacts', error: (error as Error).message });
    }
  });

  app.get('/api/contacts/:email/bookings', async (req, res) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({ message: 'Email parameter is required' });
      }

      // Get all bookings for this email address
      const bookings = await storage.getBookingsByEmail(email, req.userId);

      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching contact bookings', error: (error as Error).message });
    }
  });

  app.get('/api/contacts/stats', async (req, res) => {
    try {
      // Get all bookings for this user
      const allBookings = await storage.getUserBookings(req.userId);

      // Calculate statistics
      const uniqueContacts = new Set(allBookings.map(b => b.email.toLowerCase())).size;
      const totalBookings = allBookings.length;

      // Get bookings from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentBookings = allBookings.filter(b => b.createdAt != null && b.createdAt >= thirtyDaysAgo).length;

      res.json({
        totalContacts: uniqueContacts,
        totalBookings,
        recentBookings
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching contact stats', error: (error as Error).message });
    }
  });

  // Get all bookings for the authenticated user
  app.get('/api/user-bookings', async (req, res) => {
    try {
      const bookings = await storage.getUserBookings(req.userId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching bookings', error: (error as Error).message });
    }
  });

  // No-Show Management - Mark a booking as no-show
  app.post('/api/bookings/:bookingId/no-show', async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: 'Invalid booking ID' });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Verify ownership through booking link
      const bookingLink = await storage.getBookingLink(booking.bookingLinkId);
      if (!bookingLink || bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const updated = await storage.updateBooking(bookingId, {
        status: 'no_show',
        noShowMarkedAt: new Date(),
        noShowMarkedBy: req.userId,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Error marking no-show', error: (error as Error).message });
    }
  });

  // Reconfirmation - Send reconfirmation request for a booking
  app.post('/api/bookings/:bookingId/reconfirm', async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: 'Invalid booking ID' });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Verify ownership through booking link
      const bookingLink = await storage.getBookingLink(booking.bookingLinkId);
      if (!bookingLink || bookingLink.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Generate reconfirmation token
      const token = crypto.randomBytes(32).toString('hex');

      const updated = await storage.updateBooking(bookingId, {
        reconfirmationSentAt: new Date(),
        reconfirmationStatus: 'pending',
        reconfirmationToken: token,
      });

      res.json({
        booking: updated,
        reconfirmationUrl: `${req.protocol}://${req.get('host')}/api/public/reconfirm/${token}`,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error sending reconfirmation', error: (error as Error).message });
    }
  });

  function slugifyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  async function getCanonicalBookingUrl(baseUrl: string, bookingLink: BookingLink, owner: User): Promise<string> {
    if (bookingLink.isTeamBooking && bookingLink.teamId) {
      const team = await storage.getTeam(bookingLink.teamId);
      if (team) {
        const teamSlug = slugifyName(team.name);
        if (team.organizationId) {
          const org = await storage.getOrganization(team.organizationId);
          if (org) {
            const orgSlug = slugifyName(org.name);
            return `${baseUrl}/${orgSlug}/${teamSlug}/booking/${bookingLink.slug}`;
          }
        }
        return `${baseUrl}/team/${teamSlug}/booking/${bookingLink.slug}`;
      }
    }
    const userPath = await getUniqueUserPath(owner);
    return `${baseUrl}/${userPath}/booking/${bookingLink.slug}`;
  }

  app.get('/api/user/public-page-path', authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userPath = await getUniqueUserPath(user);
      res.json({ path: `/${userPath}/booking` });
    } catch (error) {
      res.status(500).json({ message: 'Error generating public page path' });
    }
  });

  app.get('/api/teams/:id/public-page-path', authMiddleware, async (req, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      const teamSlug = slugifyName(team.name);
      if (team.organizationId) {
        const org = await storage.getOrganization(team.organizationId);
        if (org) {
          const orgSlug = slugifyName(org.name);
          return res.json({ path: `/${orgSlug}/${teamSlug}/booking` });
        }
      }
      res.json({ path: `/team/${teamSlug}/booking` });
    } catch (error) {
      res.status(500).json({ message: 'Error generating team page path' });
    }
  });

  app.get('/api/booking/:id/url', authMiddleware, async (req, res) => {
    try {
      const bookingLink = await storage.getBookingLink(parseInt(req.params.id));
      if (!bookingLink || bookingLink.userId !== req.userId) {
        return res.status(404).json({ message: 'Booking link not found' });
      }

      const owner = await storage.getUser(bookingLink.userId);
      if (!owner) {
        return res.status(404).json({ message: 'Owner not found' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = await getCanonicalBookingUrl(baseUrl, bookingLink, owner);

      res.json({ url, path: url.replace(baseUrl, '') });
    } catch (error) {
      res.status(500).json({ message: 'Error generating booking URL', error: (error as Error).message });
    }
  });

  // Embed code generator - returns embed snippets for a booking link
  app.get('/api/booking/:id/embed', async (req, res) => {
    try {
      const bookingLink = await storage.getBookingLink(parseInt(req.params.id));
      if (!bookingLink || bookingLink.userId !== req.userId) {
        return res.status(404).json({ message: 'Booking link not found' });
      }

      const owner = await storage.getUser(bookingLink.userId);
      if (!owner) {
        return res.status(404).json({ message: 'Owner not found' });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const bookingUrl = await getCanonicalBookingUrl(baseUrl, bookingLink, owner);

      const brandColor = bookingLink.brandColor || '#4F46E5';

      // Generate embed codes
      const inlineEmbed = `<!-- SmartScheduler Inline Embed -->
<div id="smartscheduler-embed" data-url="${bookingUrl}" style="min-height:600px;"></div>
<script src="${baseUrl}/embed.js" async></script>`;

      const popupWidget = `<!-- SmartScheduler Popup Widget -->
<script src="${baseUrl}/embed.js" async
  data-url="${bookingUrl}"
  data-type="popup"
  data-color="${brandColor}"
  data-text="Schedule a Meeting"></script>`;

      const popupLink = `<!-- SmartScheduler Popup Link -->
<a href="" onclick="SmartScheduler.open('${bookingUrl}'); return false;"
  style="color:${brandColor}; text-decoration:underline; cursor:pointer;">
  Schedule a meeting with ${owner.displayName || owner.username}
</a>
<script src="${baseUrl}/embed.js" async></script>`;

      res.json({
        bookingUrl,
        inlineEmbed,
        popupWidget,
        popupLink,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error generating embed code', error: (error as Error).message });
    }
  });

  // Settings Routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings(req.userId);
      
      if (!settings) {
        // Create default settings if they don't exist
        // Get user's timezone if available
        const user = await storage.getUser(req.userId);
        const userTimezone = user?.timezone || 'UTC';
        
        const defaultSettings = await storage.createSettings({
          userId: req.userId,
          defaultReminders: [15],
          emailNotifications: true,
          pushNotifications: true,
          defaultCalendar: 'google',
          defaultMeetingDuration: 30,
          preferredTimezone: userTimezone, // Use the user's timezone or UTC as default
          workingHours: {
            0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
            1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
            2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
            3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
            4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
            5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
            6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
          },
          timeFormat: '12h',
          timeBlocks: [] // Initialize with empty array for unavailable time blocks
        });
        
        return res.json(defaultSettings);
      }
      
      // Ensure timeBlocks is properly initialized if it doesn't exist
      const responseSettings = {
        ...settings,
        timeBlocks: settings.timeBlocks || []
      };
      
      res.json(responseSettings);
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

  // Add PATCH endpoint for partial updates
  app.patch('/api/settings', async (req, res) => {
    try {
      // Special handling for timeBlocks array
      let updateData;
      if (req.body.timeBlocks !== undefined) {
        console.log('Updating timeBlocks in settings:', JSON.stringify(req.body.timeBlocks).substring(0, 200));
        updateData = insertSettingsSchema.partial().parse({
          ...req.body,
          userId: req.userId
        });
      } else {
        // Regular updates
        updateData = insertSettingsSchema.partial().parse({
          ...req.body,
          userId: req.userId
        });
      }
      
      // Get current settings
      let settings = await storage.getSettings(req.userId);
      
      if (!settings) {
        // Create settings if they don't exist
        settings = await storage.createSettings({
          ...updateData,
          userId: req.userId,
          timeBlocks: updateData.timeBlocks || [] // Initialize empty array if not provided
        });
      } else {
        // Update existing settings
        settings = await storage.updateSettings(req.userId, updateData);
      }
      
      if (!settings) {
        return res.status(500).json({ message: 'Failed to update settings' });
      }
      
      // Ensure timeBlocks is returned as an array
      const responseSettings = {
        ...settings,
        timeBlocks: settings.timeBlocks || []
      };
      
      res.json(responseSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(400).json({ message: 'Invalid settings data', error: (error as Error).message });
    }
  });

  // Onboarding Progress API
  app.get('/api/user/onboarding-progress', async (req, res) => {
    try {
      const settings = await storage.getSettings(req.userId);

      // Return onboarding status from settings metadata
      const onboardingData = (settings?.metadata as any)?.onboarding || {
        dismissed: false,
        completed: false,
        dismissedAt: null,
        completedAt: null
      };

      res.json(onboardingData);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching onboarding progress', error: (error as Error).message });
    }
  });

  app.patch('/api/user/onboarding-progress', async (req, res) => {
    try {
      const { dismissed, completed } = req.body;

      // Get current settings
      let settings = await storage.getSettings(req.userId);

      if (!settings) {
        // Create default settings if they don't exist
        const user = await storage.getUser(req.userId);
        const userTimezone = user?.timezone || 'UTC';

        settings = await storage.createSettings({
          userId: req.userId,
          defaultReminders: [15],
          emailNotifications: true,
          pushNotifications: true,
          defaultCalendar: 'google',
          defaultMeetingDuration: 30,
          preferredTimezone: userTimezone,
          workingHours: {
            0: { enabled: false, start: "09:00", end: "17:00" },
            1: { enabled: true, start: "09:00", end: "17:00" },
            2: { enabled: true, start: "09:00", end: "17:00" },
            3: { enabled: true, start: "09:00", end: "17:00" },
            4: { enabled: true, start: "09:00", end: "17:00" },
            5: { enabled: true, start: "09:00", end: "17:00" },
            6: { enabled: false, start: "09:00", end: "17:00" }
          },
          timeFormat: '12h',
          timeBlocks: []
        });
      }

      // Update onboarding metadata
      const currentMetadata = (settings.metadata as any) || {};
      const currentOnboarding = currentMetadata.onboarding || {};

      const updatedOnboarding = {
        ...currentOnboarding,
        ...(dismissed !== undefined && { dismissed, dismissedAt: dismissed ? new Date().toISOString() : null }),
        ...(completed !== undefined && { completed, completedAt: completed ? new Date().toISOString() : null })
      };

      const updatedMetadata = {
        ...currentMetadata,
        onboarding: updatedOnboarding
      };

      // Update settings with new metadata
      const updatedSettings = await storage.updateSettings(req.userId, {
        metadata: updatedMetadata
      });

      res.json(updatedOnboarding);
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      res.status(400).json({ message: 'Error updating onboarding progress', error: (error as Error).message });
    }
  });

  
  // Time Zone API
  app.get('/api/timezones', (_req, res) => {
    // Return a list of all timezones with current DST-aware offsets
    const timezonesWithCurrentOffsets = getAllTimezonesWithCurrentOffsets(new Date());
    
    // Map to expected format with formattedName as the display name
    const formattedTimezones = timezonesWithCurrentOffsets.map((tz: TimeZone & { offset: string, formattedName: string }) => ({
      id: tz.id,
      name: tz.formattedName, // Use the DST-aware formatted name
      offset: tz.offset,
      abbr: tz.abbr
    }));
    
    res.json(formattedTimezones);
  });

  app.get('/api/timezones/detect', (_req, res) => {
    try {
      // Detect the user's timezone
      const detectedTimezone = timeZoneService.getUserTimeZone();
      
      // Get current offset and formatted name for the detected timezone
      const tzInfo = getTimezoneWithCurrentOffset(detectedTimezone, new Date());
      
      res.json({ 
        timezone: detectedTimezone,
        offset: tzInfo.offset,
        formattedName: tzInfo.formattedName,
        abbr: tzInfo.abbr
      });
    } catch (error) {
      console.error('Error in timezone detection:', error);
      res.json({ timezone: 'UTC', offset: '+00:00', formattedName: 'UTC', abbr: 'UTC' });
    }
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
        parseInt(duration as string),
        0, // bufferBefore
        0, // bufferAfter
        req.query.timezone as string || 'UTC'
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
        fromEmail: 'noreply@smart-scheduler.ai'
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

      // Check if SendGrid is configured
      const sendGridConfigured = !!process.env.SENDGRID_API_KEY;

      res.json({
        success: true,
        data: {
          environment,
          fromEmail,
          normalizedFromEmail,
          fromEmailValid,
          sendGridConfigured,
          primaryMethod: sendGridConfigured ? 'SendGrid' : 'None'
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

      // Validate email configuration
      if (!process.env.FROM_EMAIL || !process.env.SENDGRID_API_KEY) {
        console.error('[API] Email configuration incomplete');
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
      console.log(`- SendGrid configured: ${!!process.env.SENDGRID_API_KEY}`);
      
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
          sendGridConfigured: !!process.env.SENDGRID_API_KEY
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

  // Public endpoint to get all booking links for a user by their userPath
  app.get('/api/public/:userPath/booking-links', async (req, res) => {
    try {
      const { userPath } = req.params;
      console.log(`[PUBLIC_USER_LANDING] Fetching booking links for userPath: ${userPath}`);

      const allUsers = await storage.getAllUsers();

      let user = null;
      for (const u of allUsers) {
        const path = await getUniqueUserPath(u);
        if (path === userPath) {
          user = u;
          break;
        }
      }

      if (!user) {
        console.log(`[PUBLIC_USER_LANDING] User not found for path: ${userPath}`);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`[PUBLIC_USER_LANDING] Found user: ${user.id} (${user.username})`);

      // Get all booking links for this user
      const allBookingLinks = await storage.getBookingLinks(user.id);

      // Filter to only include active, non-hidden, personal (non-team) booking links
      const activeBookingLinks = allBookingLinks.filter(link => {
        const isActive = 'isActive' in link ? link.isActive : true;
        const isHidden = link.isHidden ?? false;
        const isTeam = link.isTeamBooking ?? false;
        return isActive && !isHidden && !isTeam;
      });

      console.log(`[PUBLIC_USER_LANDING] Found ${activeBookingLinks.length} active booking links`);

      // Return user profile and booking links
      res.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio,
          profilePicture: user.profilePicture,
          avatarColor: user.avatarColor,
        },
        bookingLinks: activeBookingLinks,
      });
    } catch (error) {
      console.error('[PUBLIC_USER_LANDING] Error:', error);
      res.status(500).json({ message: 'Failed to fetch booking links' });
    }
  });

  // Public team landing page - fetch all active booking links for a team
  app.get('/api/public/team/:teamSlug/booking-links', async (req, res) => {
    try {
      const { teamSlug } = req.params;
      console.log(`[PUBLIC_TEAM_LANDING] Fetching booking links for teamSlug: ${teamSlug}`);

      const allTeams = await storage.getTeams();
      const team = allTeams.find(t => slugifyName(t.name) === teamSlug);

      if (!team) {
        console.log(`[PUBLIC_TEAM_LANDING] Team not found for slug: ${teamSlug}`);
        return res.status(404).json({ message: 'Team not found' });
      }

      let organization = null;
      if (team.organizationId) {
        organization = await storage.getOrganization(team.organizationId);
      }

      const allBookingLinks = await storage.getBookingLinksByTeamId(team.id);
      const activeBookingLinks = allBookingLinks.filter(link => {
        const isActive = 'isActive' in link ? link.isActive : true;
        const isHidden = link.isHidden ?? false;
        return isActive && !isHidden;
      });

      console.log(`[PUBLIC_TEAM_LANDING] Found ${activeBookingLinks.length} active booking links for team ${team.id}`);

      res.json({
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
        },
        organization: organization ? {
          id: organization.id,
          name: organization.name,
        } : null,
        bookingLinks: activeBookingLinks,
      });
    } catch (error) {
      console.error('[PUBLIC_TEAM_LANDING] Error:', error);
      res.status(500).json({ message: 'Failed to fetch team booking links' });
    }
  });

  // Public team landing page with org slug - fetch all active booking links for a team under an organization
  app.get('/api/public/org/:orgSlug/:teamSlug/booking-links', async (req, res) => {
    try {
      const { orgSlug, teamSlug } = req.params;
      console.log(`[PUBLIC_TEAM_LANDING] Fetching booking links for org: ${orgSlug}, team: ${teamSlug}`);

      const allOrgs = await storage.getOrganizations();
      const organization = allOrgs.find(o => slugifyName(o.name) === orgSlug);

      if (!organization) {
        console.log(`[PUBLIC_TEAM_LANDING] Organization not found for slug: ${orgSlug}`);
        return res.status(404).json({ message: 'Organization not found' });
      }

      const orgTeams = await storage.getTeams(organization.id);
      const team = orgTeams.find(t => slugifyName(t.name) === teamSlug);

      if (!team) {
        console.log(`[PUBLIC_TEAM_LANDING] Team not found for slug: ${teamSlug} in org: ${orgSlug}`);
        return res.status(404).json({ message: 'Team not found' });
      }

      const allBookingLinks = await storage.getBookingLinksByTeamId(team.id);
      const activeBookingLinks = allBookingLinks.filter(link => {
        const isActive = 'isActive' in link ? link.isActive : true;
        const isHidden = link.isHidden ?? false;
        return isActive && !isHidden;
      });

      console.log(`[PUBLIC_TEAM_LANDING] Found ${activeBookingLinks.length} active booking links for team ${team.id}`);

      res.json({
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
        },
        organization: {
          id: organization.id,
          name: organization.name,
        },
        bookingLinks: activeBookingLinks,
      });
    } catch (error) {
      console.error('[PUBLIC_TEAM_LANDING] Error:', error);
      res.status(500).json({ message: 'Failed to fetch team booking links' });
    }
  });

  // DEPRECATED: These :userPath routes are handled by bookingPaths.ts (mounted at /api/public, line 185).
  // bookingPaths.ts wildcard /:path(*)/booking/:slug matches first, so these handlers are effectively dead code.
  // Kept for safety but canonical handlers are in server/routes/bookingPaths.ts.
  app.get('/api/public/:userPath/booking/:slug', async (req, res) => {
    try {
      const { userPath, slug } = req.params;
      
      // Find the booking link
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      // Get the owner's information
      const owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Generate the expected user path
      const expectedUserPath = await getUniqueUserPath(owner);
      
      // Verify that the userPath in the URL matches the owner's path
      if (userPath !== expectedUserPath) {
        console.log(`[USER_PATH_GET_BOOKING] Path mismatch: Expected ${expectedUserPath}, got ${userPath}. Redirecting.`);
        // Instead of returning 404, redirect to the correct path
        return res.status(307).json({ 
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedUserPath}/booking/${slug}`
        });
      }
      
      // Check if booking link is active (if property exists)
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
      
      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
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
      
      // Check if the owner has preferred timezone in settings
      const ownerSettings = await storage.getSettings(bookingLink.userId);
      const preferredTimezone = ownerSettings?.preferredTimezone || owner.timezone || "UTC";
      
      console.log(`[Booking] Owner preferred timezone: ${preferredTimezone} for booking link ${slug}`);

      // Fetch custom questions for the booking link
      const questions = await storage.getCustomQuestions(bookingLink.id);
      const enabledQuestions = questions.filter(q => q.enabled);

      // Check if one-off link has expired
      if (bookingLink.isOneOff && bookingLink.isExpired) {
        return res.status(410).json({ message: 'This booking link has expired after use' });
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
        ownerTimezone: preferredTimezone,
        isTeamBooking: bookingLink.isTeamBooking || false,
        teamName: teamName,
        ownerProfilePicture: owner.profilePicture,
        ownerAvatarColor: owner.avatarColor,
        customQuestions: enabledQuestions,
        brandLogo: bookingLink.brandLogo || null,
        brandColor: bookingLink.brandColor || null,
        removeBranding: bookingLink.removeBranding || false,
        redirectUrl: bookingLink.redirectUrl || null,
        confirmationMessage: bookingLink.confirmationMessage || null,
        confirmationCta: bookingLink.confirmationCta || null,
        isOneOff: bookingLink.isOneOff || false,
        requirePayment: bookingLink.requirePayment || false,
        price: bookingLink.price || null,
        currency: bookingLink.currency || 'usd',
        meetingType: bookingLink.meetingType || 'in-person',
        location: bookingLink.meetingType === 'in-person' ? (bookingLink.location || null) : null,
        meetingUrl: bookingLink.meetingType === 'custom' ? (bookingLink.meetingUrl || null) : null,
        autoCreateMeetLink: bookingLink.autoCreateMeetLink || false,
        isCollective: bookingLink.isCollective || false,
        collectiveMemberIds: bookingLink.collectiveMemberIds || [],
        rotatingMemberIds: bookingLink.rotatingMemberIds || [],
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking link', error: (error as Error).message });
    }
  });

  // DEPRECATED: Handled by bookingPaths.ts (see deprecation note above)
  app.get('/api/public/:userPath/booking/:slug/availability', async (req, res) => {
    try {
      const { userPath, slug } = req.params;
      const { startDate, endDate, timezone } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }
      
      // Find the booking link
      const bookingLink = await storage.getBookingLinkBySlug(slug);
      
      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }
      
      // Get the owner's information
      const owner = await storage.getUser(bookingLink.userId);
      
      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }
      
      // Generate the expected user path
      const expectedUserPath = await getUniqueUserPath(owner);
      
      // Verify that the userPath in the URL matches the owner's path
      if (userPath !== expectedUserPath) {
        console.log(`[USER_PATH_AVAILABILITY] Path mismatch: Expected ${expectedUserPath}, got ${userPath}. Redirecting.`);
        // Instead of returning 404, redirect to the correct path
        return res.status(307).json({ 
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedUserPath}/booking/${slug}/availability?startDate=${encodeURIComponent(startDate as string)}&endDate=${encodeURIComponent(endDate as string)}${timezone ? `&timezone=${encodeURIComponent(timezone as string)}` : ''}`
        });
      }
      
      // Now proceed with the same logic as the original route
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Check if booking link is active
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;
      
      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
      }
      
      // Forward to the existing logic for finding available slots
      // For simplicity, this is the same code as in the original route
      
      // Get the owner's preferred timezone setting
      let ownerSettings = await storage.getSettings(bookingLink.userId);
      
      // Determine which timezone to use (priority: query param > owner preference > UTC)
      let preferredTimezone = 'UTC';
      
      if (timezone) {
        // If the client explicitly requested a timezone, use that
        preferredTimezone = timezone as string;
      } else if (ownerSettings?.preferredTimezone) {
        // Otherwise use owner's preferred timezone
        preferredTimezone = ownerSettings.preferredTimezone;
      } else if (owner?.timezone) {
        // Fall back to user timezone if set
        preferredTimezone = owner.timezone;
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
        
        // Find availability when ANY team member is free (union of availabilities)
        const slotsWithMembers = await teamSchedulingService.findAnyMemberAvailability(
          teamMemberIds,
          start,
          end,
          bookingLink.duration,
          bookingLink.bufferBefore || 0,
          bookingLink.bufferAfter || 0,
          preferredTimezone,
          bookingLink.startTimeIncrement || 30,
          bookingLink.availabilityScheduleId,
          bookingLink.userId
        );
        
        // Return slots with available member info for proper assignment
        return res.json(slotsWithMembers.map(slot => ({
          start: slot.start,
          end: slot.end,
          availableMembers: slot.availableMembers
        })));
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
          bookingLink.bufferAfter || 0,
          preferredTimezone,
          bookingLink.startTimeIncrement || 30,
          bookingLink.availabilityScheduleId,
          bookingLink.userId
        );
        
        return res.json(availableSlots);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ message: 'Error fetching availability', error: (error as Error).message });
    }
  });
  
  // DEPRECATED: Handled by bookingPaths.ts (see deprecation note above)
  app.post('/api/public/:userPath/booking/:slug', async (req, res) => {
    try {
      const { userPath, slug } = req.params;

      // Find the booking link
      const bookingLink = await storage.getBookingLinkBySlug(slug);

      if (!bookingLink) {
        return res.status(404).json({ message: 'Booking link not found' });
      }

      // Get the owner's information
      const owner = await storage.getUser(bookingLink.userId);

      if (!owner) {
        return res.status(404).json({ message: 'Booking link owner not found' });
      }

      // Generate the expected user path
      const expectedUserPath = await getUniqueUserPath(owner);

      // Verify that the userPath in the URL matches the owner's path
      if (userPath !== expectedUserPath) {
        // Instead of returning 404, redirect to the correct path
        return res.status(307).json({
          message: 'Redirecting to correct booking link path',
          redirectUrl: `/${expectedUserPath}/booking/${slug}`
        });
      }

      // Check if booking link is active (if property exists)
      const isActive = 'isActive' in bookingLink ? bookingLink.isActive : true;

      if (!isActive) {
        return res.status(404).json({ message: 'Booking link is inactive' });
      }

      // Parse the dates safely
      let parsedDates;
      try {
        parsedDates = parseBookingDates(req.body.startTime, req.body.endTime);
      } catch (dateError) {
        console.error('[USER_PATH_BOOKING] Date parsing error:', dateError);
        return res.status(400).json({
          message: 'Invalid date format in booking request',
          error: dateError instanceof Error ? dateError.message : 'Failed to parse dates'
        });
      }

      // Now validate with properly parsed Date objects
      let bookingData;
      try {
        bookingData = insertBookingSchema.omit({ eventId: true }).parse({
          ...req.body,
          startTime: parsedDates.startTime,
          endTime: parsedDates.endTime,
          bookingLinkId: bookingLink.id
        });
      } catch (validationError) {
        console.error('[USER_PATH_BOOKING] Validation error:', validationError);
        return res.status(400).json({
          message: 'Invalid booking data',
          error: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
      }

      // Use the parsed dates for further processing
      const startTime = parsedDates.startTime;
      const endTime = parsedDates.endTime;

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

      // Use advisory lock to prevent double-booking race condition
      // Lock key is booking link ID to serialize bookings on the same link
      const lockKey = bookingLink.id;
      let lockAcquired = false;
      let booking;
      let assignedUserId = bookingLink.userId; // Default to the booking link owner

      try {
        // Acquire advisory lock (blocks until lock is available)
        await pool.query('SELECT pg_advisory_lock($1)', [lockKey]);
        lockAcquired = true;

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

        // Create the booking (still inside the lock)
        booking = await storage.createBooking(bookingData);
      } finally {
        // Always release the lock
        if (lockAcquired) {
          await pool.query('SELECT pg_advisory_unlock($1)', [lockKey]);
        }
      }

      // Create an event for the booking (outside the lock - not timing-sensitive)
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
      console.error('[USER_PATH_BOOKING] Error creating booking:', error);
      console.error('[USER_PATH_BOOKING] Error stack:', (error as Error).stack);
      res.status(400).json({ message: 'Error creating booking', error: (error as Error).message });
    }
  });

  // ====== Admin Direct Access Routes ======
  // Direct admin routes that bypass Stripe integration and regular auth
  // Simple auth middleware - only checks if user is logged in
  const basicAuthCheck = async (req: any, res: Response, next: NextFunction) => {
    try {
      console.log('[basicAuthCheck] Checking session:', req.session);
      
      if (!req.session || !req.session.userId) {
        console.warn('[basicAuthCheck] No user session found');
        return res.status(401).json({ message: 'Please log in to access this feature' });
      }
      
      console.log('[basicAuthCheck] User session found, userId:', req.session.userId);
      
      // Get admin status from database directly
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        console.warn('[basicAuthCheck] User not found in database');
        return res.status(401).json({ message: 'User not found' });
      }
      
      console.log('[basicAuthCheck] User found. Username:', user.username, 'Role:', user.role);
      
      // Just set the userId on the request and continue
      req.userId = user.id;
      req.userRole = user.role;
      
      // We don't enforce admin check here - will be done in the handlers
      next();
    } catch (error) {
      console.error('[basicAuthCheck] Error:', error);
      res.status(500).json({ message: 'Authentication error' });
    }
  };
  
  app.post('/api/admin/free-access/:userId', basicAuthCheck, async (req: any, res: Response) => {
    try {
      console.log('🔍 [Direct] Grant Free Access - Processing request for userId:', req.params.userId);
      console.log('🔍 Current user session. userId:', req.userId, 'role:', req.userRole);
      
      // Check admin permissions - super permissive check
      // Accept any variation of 'admin' in the role
      const isAdmin = req.userRole && 
        (req.userRole.toLowerCase().includes('admin') || 
         (typeof UserRole !== 'undefined' && req.userRole === UserRole.ADMIN));
      
      if (!isAdmin) {
        console.warn('⚠️ [Direct] Grant Free Access - Access denied: not an admin. Current role:', req.userRole);
        return res.status(403).json({ 
          message: 'Admin permissions required',
          currentUserRole: req.userRole,
          userId: req.userId
        });
      }
      
      const userId = parseInt(req.params.userId, 10);
      console.log('🔍 [Direct] Grant Free Access - Fetching user with ID:', userId);
      
      // Get user directly from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.warn('⚠️ [Direct] Grant Free Access - User not found with ID:', userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log('🔍 [Direct] Grant Free Access - User found:', user.username);
      
      // Just mark the user as having free access without touching subscriptions
      console.log('🔍 [Direct] Grant Free Access - Granting free access directly');
      
      // Use storage interface instead of direct SQL
      await storage.updateUser(userId, { hasFreeAccess: true });
      
      console.log('✅ [Direct] Grant Free Access - Successfully updated user with free access');
      
      // Fetch updated user
      const updatedUser = await storage.getUser(userId);
      res.json({ success: true, user: updatedUser });
      
    } catch (error) {
      console.error('❌ [Direct] Error granting free access:', error);
      res.status(500).json({ 
        message: 'Failed to grant free access', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  app.post('/api/admin/revoke-free-access/:userId', basicAuthCheck, async (req: any, res: Response) => {
    try {
      console.log('🔍 [Direct] Revoke Free Access - Processing request for userId:', req.params.userId);
      console.log('🔍 Current user session. userId:', req.userId, 'role:', req.userRole);
      
      // Check admin permissions - super permissive check
      // Accept any variation of 'admin' in the role
      const isAdmin = req.userRole && 
        (req.userRole.toLowerCase().includes('admin') || 
         (typeof UserRole !== 'undefined' && req.userRole === UserRole.ADMIN));
      
      if (!isAdmin) {
        console.warn('⚠️ [Direct] Revoke Free Access - Access denied: not an admin. Current role:', req.userRole);
        return res.status(403).json({ 
          message: 'Admin permissions required',
          currentUserRole: req.userRole,
          userId: req.userId
        });
      }
      
      const userId = parseInt(req.params.userId, 10);
      console.log('🔍 [Direct] Revoke Free Access - Fetching user with ID:', userId);
      
      // Get user directly from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.warn('⚠️ [Direct] Revoke Free Access - User not found with ID:', userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log('🔍 [Direct] Revoke Free Access - User found:', user.username);
      
      // Just mark the user as not having free access
      console.log('🔍 [Direct] Revoke Free Access - Revoking free access directly');
      
      // Use storage interface instead of direct SQL
      await storage.updateUser(userId, { hasFreeAccess: false });
      
      console.log('✅ [Direct] Revoke Free Access - Successfully updated user to remove free access');
      
      // Fetch updated user
      const updatedUser = await storage.getUser(userId);
      res.json({ success: true, user: updatedUser });
      
    } catch (error) {
      console.error('❌ [Direct] Error revoking free access:', error);
      res.status(500).json({ 
        message: 'Failed to revoke free access', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // ====== Appointments API Routes (Smart-Scheduler Integration) ======
  
  // Get all appointments with filtering
  app.get('/api/appointments', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, source, type, status } = req.query;
      
      const filters: any = {};
      
      // Regular users can only see their own appointments
      if (req.userRole !== UserRole.ADMIN && req.userRole !== UserRole.COMPANY_ADMIN) {
        filters.userId = req.userId;
      } else if (req.userRole === UserRole.COMPANY_ADMIN && req.organizationId) {
        filters.organizationId = req.organizationId;
      }
      
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (source) {
        filters.source = source as string;
      }
      if (type) {
        filters.type = type as string;
      }
      if (status) {
        filters.status = status as string;
      }
      
      const appointments = await storage.getAppointments(filters);
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Error fetching appointments', error: (error as Error).message });
    }
  });
  
  // Get a single appointment
  app.get('/api/appointments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const appointment = await storage.getAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && 
          !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === appointment.organizationId) &&
          appointment.hostUserId !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      res.status(500).json({ message: 'Error fetching appointment', error: (error as Error).message });
    }
  });
  
  // Create a manual appointment
  app.post('/api/appointments', authMiddleware, async (req, res) => {
    try {
      const appointmentData = {
        ...req.body,
        source: AppointmentSource.MANUAL,
        hostUserId: req.body.hostUserId || req.userId,
        organizationId: req.organizationId,
        teamId: req.teamId,
        scheduledAt: new Date(req.body.scheduledAt),
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({ message: 'Error creating appointment', error: (error as Error).message });
    }
  });
  
  // Update an appointment
  app.patch('/api/appointments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingAppointment = await storage.getAppointment(id);
      
      if (!existingAppointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && 
          !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === existingAppointment.organizationId) &&
          existingAppointment.hostUserId !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updateData = { ...req.body };
      if (updateData.scheduledAt) {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }
      
      const appointment = await storage.updateAppointment(id, updateData);
      res.json(appointment);
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ message: 'Error updating appointment', error: (error as Error).message });
    }
  });
  
  // Delete an appointment
  app.delete('/api/appointments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingAppointment = await storage.getAppointment(id);
      
      if (!existingAppointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      // Check permissions
      if (req.userRole !== UserRole.ADMIN && 
          !(req.userRole === UserRole.COMPANY_ADMIN && req.organizationId === existingAppointment.organizationId) &&
          existingAppointment.hostUserId !== req.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteAppointment(id);
      res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      res.status(500).json({ message: 'Error deleting appointment', error: (error as Error).message });
    }
  });
  
  // ====== Webhook Integration Management Routes ======
  
  // Get all webhook integrations for the current user
  app.get('/api/webhook-integrations', authMiddleware, async (req, res) => {
    try {
      const integrations = await storage.getWebhookIntegrations(req.userId);
      // Don't expose secrets in the response
      const safeIntegrations = integrations.map(i => ({
        ...i,
        webhookSecret: i.webhookSecret ? '***' : null,
        apiKey: i.apiKey ? '***' : null,
        callbackSecret: i.callbackSecret ? '***' : null,
      }));
      res.json(safeIntegrations);
    } catch (error) {
      console.error('Error fetching webhook integrations:', error);
      res.status(500).json({ message: 'Error fetching webhook integrations', error: (error as Error).message });
    }
  });
  
  // Get a single webhook integration
  app.get('/api/webhook-integrations/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = await storage.getWebhookIntegration(id);
      
      if (!integration) {
        return res.status(404).json({ message: 'Webhook integration not found' });
      }
      
      if (integration.userId !== req.userId && req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Don't expose full secrets, but allow viewing
      res.json({
        ...integration,
        webhookSecret: integration.webhookSecret ? '***' : null,
        apiKey: integration.apiKey ? '***' : null,
        callbackSecret: integration.callbackSecret ? '***' : null,
      });
    } catch (error) {
      console.error('Error fetching webhook integration:', error);
      res.status(500).json({ message: 'Error fetching webhook integration', error: (error as Error).message });
    }
  });
  
  // Create a new webhook integration
  app.post('/api/webhook-integrations', authMiddleware, async (req, res) => {
    try {
      const integrationData = insertWebhookIntegrationSchema.parse({
        ...req.body,
        userId: req.userId,
        organizationId: req.organizationId,
      });
      
      const integration = await storage.createWebhookIntegration(integrationData);
      res.status(201).json({
        ...integration,
        webhookSecret: integration.webhookSecret ? '***' : null,
        apiKey: integration.apiKey ? '***' : null,
        callbackSecret: integration.callbackSecret ? '***' : null,
      });
    } catch (error) {
      console.error('Error creating webhook integration:', error);
      res.status(500).json({ message: 'Error creating webhook integration', error: (error as Error).message });
    }
  });
  
  // Update a webhook integration
  app.patch('/api/webhook-integrations/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingIntegration = await storage.getWebhookIntegration(id);
      
      if (!existingIntegration) {
        return res.status(404).json({ message: 'Webhook integration not found' });
      }
      
      if (existingIntegration.userId !== req.userId && req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const integration = await storage.updateWebhookIntegration(id, req.body);
      res.json({
        ...integration,
        webhookSecret: integration?.webhookSecret ? '***' : null,
        apiKey: integration?.apiKey ? '***' : null,
        callbackSecret: integration?.callbackSecret ? '***' : null,
      });
    } catch (error) {
      console.error('Error updating webhook integration:', error);
      res.status(500).json({ message: 'Error updating webhook integration', error: (error as Error).message });
    }
  });
  
  // Delete a webhook integration
  app.delete('/api/webhook-integrations/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingIntegration = await storage.getWebhookIntegration(id);
      
      if (!existingIntegration) {
        return res.status(404).json({ message: 'Webhook integration not found' });
      }
      
      if (existingIntegration.userId !== req.userId && req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteWebhookIntegration(id);
      res.json({ message: 'Webhook integration deleted successfully' });
    } catch (error) {
      console.error('Error deleting webhook integration:', error);
      res.status(500).json({ message: 'Error deleting webhook integration', error: (error as Error).message });
    }
  });
  
  // Get webhook logs for an integration
  app.get('/api/webhook-integrations/:id/logs', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 100;
      
      const existingIntegration = await storage.getWebhookIntegration(id);
      
      if (!existingIntegration) {
        return res.status(404).json({ message: 'Webhook integration not found' });
      }
      
      if (existingIntegration.userId !== req.userId && req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const logs = await storage.getWebhookLogs(id, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      res.status(500).json({ message: 'Error fetching webhook logs', error: (error as Error).message });
    }
  });
  
  // Generate a new webhook secret for an integration
  app.post('/api/webhook-integrations/:id/regenerate-secret', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingIntegration = await storage.getWebhookIntegration(id);
      
      if (!existingIntegration) {
        return res.status(404).json({ message: 'Webhook integration not found' });
      }
      
      if (existingIntegration.userId !== req.userId && req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Generate a new random secret
      const newSecret = crypto.randomBytes(32).toString('hex');
      
      await storage.updateWebhookIntegration(id, { webhookSecret: newSecret });
      
      // Return the new secret (only shown once)
      res.json({ 
        message: 'Webhook secret regenerated successfully',
        webhookSecret: newSecret 
      });
    } catch (error) {
      console.error('Error regenerating webhook secret:', error);
      res.status(500).json({ message: 'Error regenerating webhook secret', error: (error as Error).message });
    }
  });

  // Test webhook integration connection
  app.post('/api/webhook-integrations/:id/test', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingIntegration = await storage.getWebhookIntegration(id);
      
      console.log('[Test Connection] Integration ID:', id);
      console.log('[Test Connection] Integration data:', JSON.stringify(existingIntegration, null, 2));
      console.log('[Test Connection] isActive value:', existingIntegration?.isActive);
      console.log('[Test Connection] isActive type:', typeof existingIntegration?.isActive);
      console.log('[Test Connection] isActive truthy:', !!existingIntegration?.isActive);
      
      if (!existingIntegration) {
        return res.status(404).json({ message: 'Webhook integration not found' });
      }
      
      if (existingIntegration.userId !== req.userId && req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!existingIntegration.webhookSecret) {
        return res.json({
          success: false,
          message: 'No webhook secret configured',
          details: {
            hasSecret: false,
            signatureValid: false,
          }
        });
      }

      // Create a sample test payload
      const testPayload = {
        event: 'test.connection',
        timestamp: new Date().toISOString(),
        data: {
          integrationId: id,
          integrationName: existingIntegration.name,
          source: existingIntegration.source,
        }
      };

      const payloadString = JSON.stringify(testPayload);

      // Sign the payload with HMAC-SHA256
      const signature = crypto
        .createHmac('sha256', existingIntegration.webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Verify the signature (proves the secret is valid and working)
      const expectedSignature = crypto
        .createHmac('sha256', existingIntegration.webhookSecret)
        .update(payloadString)
        .digest('hex');

      const signatureValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      // Ensure isActive is treated as a boolean (handle potential string 't'/'f' from DB)
      const isActiveRaw: unknown = existingIntegration.isActive;
      const isActiveBoolean = isActiveRaw === true || isActiveRaw === 't' || isActiveRaw === 'true';
      
      console.log('[Test Connection] isActive converted to boolean:', isActiveBoolean);

      res.json({
        success: signatureValid && isActiveBoolean,
        message: signatureValid && isActiveBoolean
          ? 'SmartScheduler is ready to receive webhooks. The secret is configured and HMAC signing works correctly. Make sure Brand Voice Interview has the same secret configured.'
          : !isActiveBoolean
            ? 'Integration is disabled. Enable it to receive webhooks.'
            : 'Configuration check failed.',
        details: {
          hasSecret: true,
          signatureValid,
          integrationActive: isActiveBoolean,
          integrationActiveRaw: existingIntegration.isActive,
          integrationActiveType: typeof existingIntegration.isActive,
          source: existingIntegration.source,
          webhookCount: existingIntegration.webhookCount || 0,
          lastWebhookAt: existingIntegration.lastWebhookAt,
          generatedSignature: signature.substring(0, 16) + '...',
        }
      });
    } catch (error) {
      console.error('Error testing webhook integration:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error testing webhook integration', 
        error: (error as Error).message 
      });
    }
  });

  // ====== Stripe Integration Routes ======
  // Use Stripe routes
  app.use('/api/stripe', stripeRoutes);
  // Restrict Stripe Products Manager routes to admin users
  app.use('/api/stripe-manager', authMiddleware, adminOnly, stripeProductsManagerRoutes);

  // ====== Phase 1 Feature Routes ======
  app.use('/api/analytics', authMiddleware, analyticsRoutes);
  app.use('/api/availability-schedules', authMiddleware, availabilitySchedulesRoutes);
  app.use('/api/booking', authMiddleware, customQuestionsRoutes);
  app.use('/api/date-overrides', authMiddleware, dateOverridesRoutes);
  app.use('/api/meeting-polls', authMiddleware, meetingPollsRoutes);
  app.use('/api/public', meetingPollsPublicRoutes);
  app.use('/api/slack', authMiddleware, slackIntegrationRoutes);
  app.use('/api/public/booking-payment', bookingPaymentRoutes);
  app.use('/api/managed-events', authMiddleware, managedEventsRoutes);
  app.use('/api/managed-workflows', authMiddleware, managedWorkflowsRoutes);

  // Phase 5: Enterprise & Compliance
  app.use('/api/audit-logs', authMiddleware, auditLogRoutes);
  app.use('/api/scim', scimRoutes); // SCIM has its own auth (bearer token)
  app.use('/api/domain-controls', authMiddleware, domainControlRoutes);
  app.use('/api/data-retention', authMiddleware, dataRetentionRoutes);

  // Phase 6: Routing Forms & QR Codes
  app.use('/api/routing-forms', authMiddleware, routingFormsRoutes);
  app.use('/api/public/routing', routingFormPublicRoutes); // Public, no auth
  app.use('/api/qr-code', authMiddleware, qrCodeRoutes);

  // Auto-login token routes
  app.use('/api/auto-login', autoLoginRoutes.public);  // Public: token consumption (no auth)
  app.use('/api/admin/auto-login', authMiddleware, adminOnly, autoLoginRoutes.admin);  // Admin: token management

  // ====== Email Template Management Routes ======
  
  // Get all email templates (admin only)
  app.get('/api/email-templates', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templates = await emailTemplateManager.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ message: 'Error fetching email templates', error: (error as Error).message });
    }
  });
  
  // Get all template categories with counts (admin only)
  app.get('/api/email-templates/categories', authMiddleware, adminOnly, async (req, res) => {
    try {
      const categories = await emailTemplateManager.getTemplateCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching template categories:', error);
      res.status(500).json({ message: 'Error fetching template categories', error: (error as Error).message });
    }
  });
  
  // Get a specific email template (admin only)
  app.get('/api/email-templates/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templateId = req.params.id as EmailTemplateType;
      const template = await emailTemplateManager.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).json({ message: 'Error fetching email template', error: (error as Error).message });
    }
  });
  
  // Preview a template with sample data (admin only)
  app.get('/api/email-templates/:id/preview', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templateId = req.params.id as EmailTemplateType;
      const template = await emailTemplateManager.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      const preview = emailTemplateManager.previewTemplate(template);
      res.json(preview);
    } catch (error) {
      console.error('Error previewing email template:', error);
      res.status(500).json({ message: 'Error previewing email template', error: (error as Error).message });
    }
  });
  
  // Update a specific email template (admin only)
  app.put('/api/email-templates/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templateId = req.params.id as EmailTemplateType;
      const { 
        subject, 
        textContent, 
        htmlContent, 
        category, 
        language, 
        comment 
      } = req.body;
      
      // Validate required fields
      if (!subject || !textContent || !htmlContent) {
        return res.status(400).json({ 
          message: 'Missing required fields', 
          requiredFields: ['subject', 'textContent', 'htmlContent']
        });
      }
      
      // Update the template with enhanced options
      const updatedTemplate = await emailTemplateManager.updateTemplate(templateId, {
        subject,
        textContent,
        htmlContent,
        category,
        language,
        comment,
        createdBy: (req as any).userId ? 'User ID: ' + (req as any).userId : 'Admin'
      });
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ message: 'Error updating email template', error: (error as Error).message });
    }
  });
  
  // Restore a template to a previous version (admin only)
  app.post('/api/email-templates/:id/restore/:versionIndex', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templateId = req.params.id as EmailTemplateType;
      const versionIndex = parseInt(req.params.versionIndex, 10);
      
      if (isNaN(versionIndex)) {
        return res.status(400).json({ message: 'Version index must be a number' });
      }
      
      const restoredTemplate = await emailTemplateManager.restoreTemplateVersion(templateId, versionIndex);
      res.json(restoredTemplate);
    } catch (error) {
      console.error('Error restoring template version:', error);
      res.status(500).json({ message: 'Error restoring template version', error: (error as Error).message });
    }
  });
  
  // Reset a specific email template to default (admin only)
  app.post('/api/email-templates/:id/reset', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templateId = req.params.id as EmailTemplateType;
      const resetTemplate = await emailTemplateManager.resetTemplate(templateId);
      
      if (!resetTemplate) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(resetTemplate);
    } catch (error) {
      console.error('Error resetting email template:', error);
      res.status(500).json({ message: 'Error resetting email template', error: (error as Error).message });
    }
  });
  
  // Reset all email templates to defaults (admin only)
  app.post('/api/email-templates/reset-all', authMiddleware, adminOnly, async (req, res) => {
    try {
      const success = await emailTemplateManager.resetAllTemplates();
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to reset all templates' });
      }
      
      const templates = await emailTemplateManager.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error resetting all email templates:', error);
      res.status(500).json({ message: 'Error resetting all email templates', error: (error as Error).message });
    }
  });
  
  // Send a test email using a specific template (admin only)
  app.post('/api/email-templates/:id/test', authMiddleware, adminOnly, async (req, res) => {
    try {
      const templateId = req.params.id as EmailTemplateType;
      const { recipientEmail, variables } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      // Get the template
      const template = await emailTemplateManager.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      // Process the template with variables using the testTemplate function
      const { html, text, subject } = emailTemplateManager.testTemplate(template, variables || {});
      
      // Send the test email
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
        text
      });
      
      if (!result.success) {
        return res.status(500).json({ 
          message: 'Failed to send test email', 
          error: result.error,
          smtpDiagnostics: result.smtpDiagnostics
        });
      }
      
      res.json({ 
        message: 'Test email sent successfully',
        result
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Error sending test email', error: (error as Error).message });
    }
  });
  
  // Endpoint to check Stripe configuration (price IDs etc.)
  app.get('/api/check-stripe-config', async (req, res) => {
    try {
      const { STRIPE_PRICES, isStripeEnabled } = await import('./services/stripe');
      res.json({
        isStripeEnabled,
        prices: STRIPE_PRICES,
        env: {
          hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
          hasPublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
          hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        }
      });
    } catch (error) {
      console.error('Error checking Stripe config:', error);
      res.status(500).json({ error: 'Failed to check Stripe configuration' });
    }
  });
  
  // Admin endpoint to fetch all subscriptions
  app.get('/api/admin/subscriptions', authMiddleware, adminOnly, async (req, res) => {
    try {
      // Get all users, teams, and organizations
      const users = await storage.getAllUsers();
      const teams = await storage.getTeams();
      const organizations = await storage.getOrganizations();
      
      // Create a list to store all subscriptions
      let allSubscriptions = [];
      
      // Process all users
      for (const user of users) {
        const subscription = await storage.getUserSubscription(user.id);
        if (subscription) {
          allSubscriptions.push(subscription);
        }
      }
      
      // Process all teams
      for (const team of teams) {
        const subscription = await storage.getTeamSubscription(team.id);
        if (subscription) {
          allSubscriptions.push(subscription);
        }
      }
      
      // Process all organizations
      for (const org of organizations) {
        const subscription = await storage.getOrganizationSubscription(org.id);
        if (subscription) {
          allSubscriptions.push(subscription);
        }
      }
      
      res.json(allSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Error fetching subscriptions', error: (error as Error).message });
    }
  });

  // Legacy Stripe config check - route is replaced by more detailed version above

  // ==================== WORKFLOW API ROUTES ====================
  
  // Get all workflows for the current user
  app.get('/api/workflows', authMiddleware, async (req, res) => {
    try {
      const workflows = await storage.getWorkflows(req.userId);
      res.json(workflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({ message: 'Error fetching workflows', error: (error as Error).message });
    }
  });

  // Get workflow analytics - must be before :id routes
  app.get('/api/workflows/analytics/summary', authMiddleware, async (req, res) => {
    try {
      const analytics = await storage.getWorkflowAnalytics(req.userId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching workflow analytics:', error);
      res.status(500).json({ message: 'Error fetching analytics', error: (error as Error).message });
    }
  });

  app.get('/api/workflows/analytics', authMiddleware, async (req, res) => {
    try {
      const analytics = await storage.getWorkflowAnalytics(req.userId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching workflow analytics:', error);
      res.status(500).json({ message: 'Error fetching analytics', error: (error as Error).message });
    }
  });

  // Get workflow templates - must be before :id routes
  app.get('/api/workflows/templates', authMiddleware, async (req, res) => {
    try {
      const templates = getWorkflowTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      res.status(500).json({ message: 'Error fetching templates', error: (error as Error).message });
    }
  });

  // Get a single workflow with its steps
  app.get('/api/workflows/:id', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to view this workflow' });
      }
      
      const steps = await storage.getWorkflowSteps(workflowId);
      res.json({ ...workflow, steps });
    } catch (error) {
      console.error('Error fetching workflow:', error);
      res.status(500).json({ message: 'Error fetching workflow', error: (error as Error).message });
    }
  });

  // Create a new workflow
  app.post('/api/workflows', authMiddleware, async (req, res) => {
    try {
      // Handle both wrapped { workflow: {...}, steps: [...] } and flat { name, description, ... } formats
      const workflowData = req.body.workflow || req.body;
      const { name, description, triggerType, triggerConfig, isEnabled } = workflowData;
      const steps = req.body.steps;
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Workflow name is required' });
      }
      if (!triggerType || typeof triggerType !== 'string') {
        return res.status(400).json({ message: 'Trigger type is required' });
      }
      
      // Create the workflow
      const workflow = await storage.createWorkflow({
        userId: req.userId,
        name,
        description,
        triggerType,
        triggerConfig: triggerConfig || {},
        isEnabled: isEnabled !== false,
      });
      
      // Create steps if provided
      if (steps && Array.isArray(steps)) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await storage.createWorkflowStep({
            workflowId: workflow.id,
            actionType: step.actionType,
            actionConfig: step.actionConfig || {},
            orderIndex: step.orderIndex ?? i,
            parentStepId: step.parentStepId,
            branchCondition: step.branchCondition,
            conditionConfig: step.conditionConfig,
            delayMinutes: step.delayMinutes || 0,
          });
        }
      }
      
      const createdSteps = await storage.getWorkflowSteps(workflow.id);
      res.status(201).json({ ...workflow, steps: createdSteps });
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({ message: 'Error creating workflow', error: (error as Error).message });
    }
  });

  // Update a workflow
  app.put('/api/workflows/:id', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to update this workflow' });
      }
      
      const { name, description, triggerType, triggerConfig, isEnabled, steps } = req.body;
      
      const updatedWorkflow = await storage.updateWorkflow(workflowId, {
        name,
        description,
        triggerType,
        triggerConfig,
        isEnabled,
      });
      
      // Update steps if provided - delete all and recreate
      if (steps && Array.isArray(steps)) {
        await storage.deleteWorkflowSteps(workflowId);
        
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await storage.createWorkflowStep({
            workflowId,
            actionType: step.actionType,
            actionConfig: step.actionConfig || {},
            orderIndex: step.orderIndex ?? i,
            parentStepId: step.parentStepId,
            branchCondition: step.branchCondition,
            conditionConfig: step.conditionConfig,
            delayMinutes: step.delayMinutes || 0,
          });
        }
      }
      
      const updatedSteps = await storage.getWorkflowSteps(workflowId);
      res.json({ ...updatedWorkflow, steps: updatedSteps });
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({ message: 'Error updating workflow', error: (error as Error).message });
    }
  });

  // Toggle workflow enabled status
  app.patch('/api/workflows/:id/toggle', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to update this workflow' });
      }
      
      const updatedWorkflow = await storage.updateWorkflow(workflowId, {
        isEnabled: !workflow.isEnabled,
      });
      
      res.json(updatedWorkflow);
    } catch (error) {
      console.error('Error toggling workflow:', error);
      res.status(500).json({ message: 'Error toggling workflow', error: (error as Error).message });
    }
  });

  // Delete a workflow
  app.delete('/api/workflows/:id', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this workflow' });
      }
      
      await storage.deleteWorkflow(workflowId);
      res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({ message: 'Error deleting workflow', error: (error as Error).message });
    }
  });

  // Get workflow executions (activity log)
  app.get('/api/workflows/:id/executions', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to view this workflow' });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const executions = await storage.getWorkflowExecutions(workflowId, limit);
      res.json(executions);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      res.status(500).json({ message: 'Error fetching executions', error: (error as Error).message });
    }
  });

  // Get workflow steps
  app.get('/api/workflows/:id/steps', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const steps = await storage.getWorkflowSteps(workflowId);
      res.json(steps);
    } catch (error) {
      console.error('Error fetching workflow steps:', error);
      res.status(500).json({ message: 'Error fetching steps', error: (error as Error).message });
    }
  });

  // Execute a workflow (with optional test mode)
  app.post('/api/workflows/:id/execute', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to execute this workflow' });
      }

      const { triggerData = {}, testMode = false } = req.body;
      
      const { workflowExecutionService } = await import('./utils/workflowExecutionService');
      const execution = await workflowExecutionService.executeWorkflow(
        workflowId,
        { ...triggerData, userId: req.userId },
        testMode
      );
      
      res.json(execution);
    } catch (error) {
      console.error('Error executing workflow:', error);
      res.status(500).json({ message: 'Error executing workflow', error: (error as Error).message });
    }
  });

  // Test/run a workflow manually (legacy endpoint)
  app.post('/api/workflows/:id/test', authMiddleware, async (req, res) => {
    try {
      const workflowId = parseInt(req.params.id);
      const workflow = await storage.getWorkflow(workflowId);
      
      if (!workflow) {
        return res.status(404).json({ message: 'Workflow not found' });
      }
      
      if (workflow.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to test this workflow' });
      }

      const { workflowExecutionService } = await import('./utils/workflowExecutionService');
      const execution = await workflowExecutionService.executeWorkflow(
        workflowId,
        { testMode: true, triggeredAt: new Date().toISOString(), userId: req.userId },
        true
      );
      
      res.json({ 
        message: 'Workflow test completed successfully',
        execution,
      });
    } catch (error) {
      console.error('Error testing workflow:', error);
      res.status(500).json({ message: 'Error testing workflow', error: (error as Error).message });
    }
  });

  // Get workflow templates (legacy path)
  app.get('/api/workflow-templates', authMiddleware, async (req, res) => {
    try {
      const templates = getWorkflowTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      res.status(500).json({ message: 'Error fetching templates', error: (error as Error).message });
    }
  });

  return httpServer;
}

function getWorkflowTemplates() {
      return [
        {
          id: 'booking-confirmation',
          name: 'Booking Confirmation',
          description: 'Send a confirmation email when a new booking is created',
          triggerType: 'booking_created',
          triggerConfig: {},
          steps: [
            {
              actionType: 'send_email',
              actionConfig: {
                templateId: 'booking_confirmation',
                subject: 'Your Booking is Confirmed',
              },
              orderIndex: 0,
            },
          ],
        },
        {
          id: 'meeting-reminder',
          name: 'Meeting Reminder',
          description: 'Send a reminder email before the meeting starts',
          triggerType: 'event_reminder',
          triggerConfig: { minutesBefore: 60 },
          steps: [
            {
              actionType: 'send_email',
              actionConfig: {
                templateId: 'event_reminder',
                subject: 'Reminder: Your meeting starts in 1 hour',
              },
              orderIndex: 0,
            },
          ],
        },
        {
          id: 'follow-up-email',
          name: 'Follow-up Email',
          description: 'Send a follow-up email after the meeting ends',
          triggerType: 'follow_up',
          triggerConfig: { daysAfter: 1 },
          steps: [
            {
              actionType: 'delay',
              actionConfig: { minutes: 1440 },
              orderIndex: 0,
            },
            {
              actionType: 'send_email',
              actionConfig: {
                templateId: 'follow_up',
                subject: 'Thank you for meeting with us',
              },
              orderIndex: 1,
            },
          ],
        },
        {
          id: 'zapier-webhook',
          name: 'Zapier Automation',
          description: 'Trigger a Zapier webhook when a booking is created',
          triggerType: 'booking_created',
          triggerConfig: {},
          steps: [
            {
              actionType: 'trigger_webhook',
              actionConfig: {
                webhookUrl: '',
                payload: { booking: '{{booking}}' },
              },
              orderIndex: 0,
            },
          ],
        },
        {
          id: 'conditional-routing',
          name: 'Conditional Meeting Routing',
          description: 'Route to different actions based on meeting type',
          triggerType: 'booking_created',
          triggerConfig: {},
          steps: [
            {
              actionType: 'condition',
              actionConfig: {
                field: 'meetingType',
                operator: 'equals',
                value: 'zoom',
              },
              orderIndex: 0,
            },
            {
              actionType: 'send_email',
              actionConfig: {
                templateId: 'zoom_meeting',
                subject: 'Your Zoom meeting details',
              },
              orderIndex: 1,
              branchCondition: 'true',
              parentStepId: 0,
            },
            {
              actionType: 'send_email',
              actionConfig: {
                templateId: 'in_person_meeting',
                subject: 'Your in-person meeting details',
              },
              orderIndex: 2,
              branchCondition: 'false',
              parentStepId: 0,
            },
          ],
        },
      ];
}
