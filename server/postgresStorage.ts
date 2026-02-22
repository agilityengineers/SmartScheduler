import { db } from './db';
import { IStorage } from './storage';
import {
  User, InsertUser,
  Company, InsertCompany,
  Organization, InsertOrganization, // Legacy alias
  Team, InsertTeam,
  CalendarIntegration, InsertCalendarIntegration,
  Event, InsertEvent,
  BookingLink, InsertBookingLink,
  Booking, InsertBooking,
  Settings, InsertSettings,
  Subscription, InsertSubscription,
  PaymentMethod, InsertPaymentMethod,
  Invoice, InsertInvoice,
  Workflow, InsertWorkflow,
  WorkflowStep, InsertWorkflowStep,
  WorkflowExecution, InsertWorkflowExecution,
  WorkflowStepExecution, InsertWorkflowStepExecution,
  Appointment, InsertAppointment,
  WebhookIntegration, InsertWebhookIntegration,
  WebhookLog, InsertWebhookLog,
  users, companies, organizations, teams, calendarIntegrations, events, bookingLinks, bookings, settings,
  subscriptions, paymentMethods, invoices, workflows, workflowSteps, workflowExecutions, workflowStepExecutions,
  appointments, webhookIntegrations, webhookLogs,
  AvailabilitySchedule, InsertAvailabilitySchedule,
  CustomQuestion, InsertCustomQuestion,
  DateOverride, InsertDateOverride,
  MeetingPoll, InsertMeetingPoll,
  MeetingPollOption, InsertMeetingPollOption,
  MeetingPollVote, InsertMeetingPollVote,
  SlackIntegration, InsertSlackIntegration,
  AuditLog, InsertAuditLog,
  DomainControl, InsertDomainControl,
  DataRetentionPolicy, InsertDataRetentionPolicy,
  ScimConfig, InsertScimConfig,
  RoutingForm, InsertRoutingForm,
  RoutingFormQuestion, InsertRoutingFormQuestion,
  RoutingFormRule, InsertRoutingFormRule,
  RoutingFormSubmission, InsertRoutingFormSubmission,
  AutoLoginToken, InsertAutoLoginToken,
  availabilitySchedules, customQuestions, dateOverrides,
  meetingPolls, meetingPollOptions, meetingPollVotes,
  slackIntegrations,
  auditLogs, domainControls, dataRetentionPolicies, scimConfigs,
  routingForms, routingFormQuestions, routingFormRules, routingFormSubmissions,
  autoLoginTokens
} from '@shared/schema';
import { eq, and, gte, lte, inArray, desc, sql } from 'drizzle-orm';

export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results.length > 0 ? results[0] : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const results = await db.insert(users).values(user).returning();
    return results[0];
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    try {
      // Special handling for hasFreeAccess field - use direct SQL
      // This bypasses any schema validation issues
      if (updateData.hasFreeAccess !== undefined) {
        console.log('🔧 Direct SQL update for hasFreeAccess field:', updateData.hasFreeAccess);
        
        // Simplest possible SQL, most likely to work in any environment
        try {
          // Using raw database pool for maximum compatibility
          // Import the pool from db.ts
          const { pool } = require('./db');
          
          // Use direct pool query to bypass ORM entirely
          await pool.query(
            "UPDATE users SET has_free_access = $1 WHERE id = $2",
            [updateData.hasFreeAccess, id]
          );
          
          console.log('✅ Direct SQL update successful');
        } catch (directSqlError) {
          console.error('❌ Direct SQL update failed:', directSqlError);
          
          // SECURITY FIX: Removed SQL injection vulnerable alternate query
          // Original code used string interpolation which was vulnerable to SQL injection
          console.error('❌ Parameterized query failed, no unsafe fallback available');
          throw directSqlError;
        }
        
        // Get the updated user
        const results = await db.select().from(users).where(eq(users.id, id));
        return results.length > 0 ? results[0] : undefined;
      }
      
      // Normal case - use Drizzle ORM
      const results = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('Error in updateUser:', error);
      // SECURITY FIX: Removed SQL injection vulnerable fallback code
      // Original code used string concatenation which was vulnerable to SQL injection
      // If Drizzle ORM fails, the underlying issue should be fixed rather than using unsafe raw SQL
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Company operations (uses the companies table which was formerly organizations)
  async getCompany(id: number): Promise<Company | undefined> {
    const results = await db.select().from(companies).where(eq(companies.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const results = await db.insert(companies).values(company).returning();
    return results[0];
  }

  async updateCompany(id: number, updateData: Partial<Company>): Promise<Company | undefined> {
    const results = await db.update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    return results.length > 0 ? results[0] : undefined;
  }

  async deleteCompany(id: number): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id)).returning();
    return result.length > 0;
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, companyId));
  }

  async getTeamsByCompany(companyId: number): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.organizationId, companyId));
  }

  // Legacy Organization operations (aliases for Company methods - backward compatibility)
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.getCompany(id);
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.getCompanies();
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    return this.createCompany(organization);
  }

  async updateOrganization(id: number, updateData: Partial<Organization>): Promise<Organization | undefined> {
    return this.updateCompany(id, updateData);
  }

  async deleteOrganization(id: number): Promise<boolean> {
    return this.deleteCompany(id);
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const results = await db.select().from(teams).where(eq(teams.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getTeams(organizationId?: number): Promise<Team[]> {
    if (organizationId) {
      return await db.select().from(teams).where(eq(teams.organizationId, organizationId));
    }
    return await db.select().from(teams);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const results = await db.insert(teams).values(team).returning();
    return results[0];
  }

  async updateTeam(id: number, updateData: Partial<Team>): Promise<Team | undefined> {
    const results = await db.update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  // Calendar Integration operations
  async getCalendarIntegrations(userId: number): Promise<CalendarIntegration[]> {
    return await db.select().from(calendarIntegrations).where(eq(calendarIntegrations.userId, userId));
  }

  async getCalendarIntegration(id: number): Promise<CalendarIntegration | undefined> {
    const results = await db.select().from(calendarIntegrations).where(eq(calendarIntegrations.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getCalendarIntegrationByType(userId: number, type: string): Promise<CalendarIntegration | undefined> {
    const results = await db.select()
      .from(calendarIntegrations)
      .where(
        and(
          eq(calendarIntegrations.userId, userId),
          eq(calendarIntegrations.type, type)
        )
      );
    
    return results.length > 0 ? results[0] : undefined;
  }

  async createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const results = await db.insert(calendarIntegrations).values(integration).returning();
    return results[0];
  }

  async updateCalendarIntegration(id: number, updateData: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined> {
    const results = await db.update(calendarIntegrations)
      .set(updateData)
      .where(eq(calendarIntegrations.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteCalendarIntegration(id: number): Promise<boolean> {
    // First delete all events associated with this calendar integration
    await this.deleteEventsByCalendarIntegration(id);
    
    const result = await db.delete(calendarIntegrations).where(eq(calendarIntegrations.id, id)).returning();
    return result.length > 0;
  }

  // Event operations
  async getEvents(userId: number, startDate?: Date, endDate?: Date): Promise<Event[]> {
    if (startDate && endDate) {
      return await db.select().from(events).where(
        and(
          eq(events.userId, userId),
          gte(events.startTime, startDate),
          lte(events.endTime, endDate)
        )
      );
    }
    return await db.select().from(events).where(eq(events.userId, userId));
  }

  // Batch loading method to fix N+1 query problem
  async getEventsByUserIds(userIds: number[], startDate?: Date, endDate?: Date): Promise<Event[]> {
    if (userIds.length === 0) {
      return [];
    }

    if (startDate && endDate) {
      return await db.select().from(events).where(
        and(
          inArray(events.userId, userIds),
          gte(events.startTime, startDate),
          lte(events.endTime, endDate)
        )
      );
    }
    return await db.select().from(events).where(inArray(events.userId, userIds));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const results = await db.select().from(events).where(eq(events.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getEventByExternalId(externalId: string, calendarType: string): Promise<Event | undefined> {
    const results = await db.select()
      .from(events)
      .where(
        and(
          eq(events.externalId, externalId),
          eq(events.calendarType, calendarType)
        )
      );
    
    return results.length > 0 ? results[0] : undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const results = await db.insert(events).values(event).returning();
    return results[0];
  }

  async updateEvent(id: number, updateData: Partial<Event>): Promise<Event | undefined> {
    const results = await db.update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  async deleteEventsByCalendarIntegration(calendarIntegrationId: number): Promise<number> {
    const result = await db.delete(events).where(eq(events.calendarIntegrationId, calendarIntegrationId)).returning();
    return result.length;
  }

  // Booking Link operations
  async getBookingLinks(userId: number): Promise<BookingLink[]> {
    return await db.select().from(bookingLinks).where(eq(bookingLinks.userId, userId));
  }

  async getBookingLinksByTeamId(teamId: number): Promise<BookingLink[]> {
    return await db.select().from(bookingLinks).where(eq(bookingLinks.teamId, teamId));
  }

  async getBookingLink(id: number): Promise<BookingLink | undefined> {
    const results = await db.select().from(bookingLinks).where(eq(bookingLinks.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getBookingLinkBySlug(slug: string): Promise<BookingLink | undefined> {
    const results = await db.select().from(bookingLinks).where(eq(bookingLinks.slug, slug));
    return results.length > 0 ? results[0] : undefined;
  }

  async createBookingLink(bookingLink: InsertBookingLink): Promise<BookingLink> {
    const results = await db.insert(bookingLinks).values(bookingLink).returning();
    return results[0];
  }

  async updateBookingLink(id: number, updateData: Partial<BookingLink>): Promise<BookingLink | undefined> {
    const results = await db.update(bookingLinks)
      .set(updateData)
      .where(eq(bookingLinks.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteBookingLink(id: number): Promise<boolean> {
    const result = await db.delete(bookingLinks).where(eq(bookingLinks.id, id)).returning();
    return result.length > 0;
  }

  // Booking operations
  async getBookings(bookingLinkId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.bookingLinkId, bookingLinkId));
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const results = await db.select().from(bookings).where(eq(bookings.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const results = await db.insert(bookings).values(booking).returning();
    return results[0];
  }

  async updateBooking(id: number, updateData: Partial<Booking>): Promise<Booking | undefined> {
    const results = await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteBooking(id: number): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    return result.length > 0;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    // Get all bookings for booking links owned by this user
    const userBookingLinks = await db.select().from(bookingLinks).where(eq(bookingLinks.userId, userId));
    const bookingLinkIds = userBookingLinks.map(link => link.id);

    if (bookingLinkIds.length === 0) {
      return [];
    }

    return await db.select().from(bookings).where(inArray(bookings.bookingLinkId, bookingLinkIds));
  }

  async getBookingsByEmail(email: string, userId: number): Promise<Booking[]> {
    // Get all bookings for a specific email across user's booking links
    const userBookingLinks = await db.select().from(bookingLinks).where(eq(bookingLinks.userId, userId));
    const bookingLinkIds = userBookingLinks.map(link => link.id);

    if (bookingLinkIds.length === 0) {
      return [];
    }

    return await db.select()
      .from(bookings)
      .where(and(
        inArray(bookings.bookingLinkId, bookingLinkIds),
        eq(bookings.email, email)
      ));
  }

  // Settings operations
  async getSettings(userId: number): Promise<Settings | undefined> {
    const results = await db.select().from(settings).where(eq(settings.userId, userId));
    return results.length > 0 ? results[0] : undefined;
  }

  async createSettings(setting: InsertSettings): Promise<Settings> {
    // Make sure defaultReminders and other JSON fields are properly converted
    const defaultReminders = Array.isArray(setting.defaultReminders) 
      ? setting.defaultReminders 
      : setting.defaultReminders !== undefined 
        ? setting.defaultReminders 
        : [15];
        
    const workingHours = setting.workingHours || {
      0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
      1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
      2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
      3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
      4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
      5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
      6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
    };
    
    const settingToInsert = {
      ...setting,
      defaultReminders,
      workingHours
    };
    
    const results = await db.insert(settings).values(settingToInsert).returning();
    return results[0];
  }

  async updateSettings(userId: number, updateData: Partial<Settings>): Promise<Settings | undefined> {
    const userSettings = await this.getSettings(userId);
    
    if (!userSettings) {
      // If no settings exist, create them
      const defaultSettings: InsertSettings = {
        userId,
        defaultReminders: updateData.defaultReminders || [15],
        emailNotifications: updateData.emailNotifications ?? true,
        pushNotifications: updateData.pushNotifications ?? true,
        defaultCalendar: updateData.defaultCalendar || 'google',
        defaultCalendarIntegrationId: updateData.defaultCalendarIntegrationId || null,
        defaultMeetingDuration: updateData.defaultMeetingDuration || 30,
        showDeclinedEvents: updateData.showDeclinedEvents ?? false,
        combinedView: updateData.combinedView ?? true,
        workingHours: updateData.workingHours || {
          0: { enabled: false, start: "09:00", end: "17:00" },
          1: { enabled: true, start: "09:00", end: "17:00" },
          2: { enabled: true, start: "09:00", end: "17:00" },
          3: { enabled: true, start: "09:00", end: "17:00" },
          4: { enabled: true, start: "09:00", end: "17:00" },
          5: { enabled: true, start: "09:00", end: "17:00" },
          6: { enabled: false, start: "09:00", end: "17:00" }
        },
        timeFormat: updateData.timeFormat || '12h',
        timeBlocks: updateData.timeBlocks || []
      };
      
      return await this.createSettings(defaultSettings);
    }
    
    // Prepare update data, ensuring JSON fields are properly handled
    const updatedSettings = { ...updateData };
    
    // Otherwise update existing settings
    const results = await db.update(settings)
      .set(updatedSettings)
      .where(eq(settings.userId, userId))
      .returning();
    
    return results[0];
  }

  // Subscription operations
  async getSubscription(id: number): Promise<Subscription | undefined> {
    const results = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const results = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    const results = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return results.length > 0 ? results[0] : undefined;
  }

  async getTeamSubscription(teamId: number): Promise<Subscription | undefined> {
    const results = await db.select().from(subscriptions).where(eq(subscriptions.teamId, teamId));
    return results.length > 0 ? results[0] : undefined;
  }

  async getOrganizationSubscription(organizationId: number): Promise<Subscription | undefined> {
    const results = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId));
    return results.length > 0 ? results[0] : undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    // Filter out metadata field if it exists in the subscription - it may not exist in the actual DB schema
    const safeSubscription: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(subscription)) {
      // Skip metadata field which might not exist in the database schema
      if (key === 'metadata') {
        console.log('⚠️ Skipping metadata field in subscription creation as it might not exist in DB schema');
        continue;
      }
      safeSubscription[key] = value;
    }
    
    console.log('🔄 Creating subscription with filtered data');
    
    try {
      const results = await db.insert(subscriptions).values(safeSubscription).returning();
      return results[0];
    } catch (error) {
      console.error('❌ Error creating subscription in database:', error);
      throw error;
    }
  }

  async updateSubscription(id: number, updateData: Partial<Subscription>): Promise<Subscription | undefined> {
    // Filter out metadata field if it exists in updateData - it may not exist in the actual DB schema
    // Create a safe copy of the data without potentially problematic fields
    const safeUpdateData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      // Skip metadata field which might not exist in the database schema
      if (key === 'metadata') {
        console.log('⚠️ Skipping metadata field in subscription update as it might not exist in DB schema');
        continue;
      }
      safeUpdateData[key] = value;
    }
    
    console.log('🔄 Updating subscription with filtered data:', safeUpdateData);
    
    try {
      const results = await db.update(subscriptions)
        .set(safeUpdateData)
        .where(eq(subscriptions.id, id))
        .returning();
      
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error('❌ Error updating subscription in database:', error);
      
      // If we're just trying to update status and endedAt, we can try a more targeted approach
      if (safeUpdateData.status && safeUpdateData.endedAt && Object.keys(safeUpdateData).length === 2) {
        console.log('🔄 Attempting targeted update with only status and endedAt fields');
        try {
          const results = await db.update(subscriptions)
            .set({
              status: safeUpdateData.status,
              endedAt: safeUpdateData.endedAt
            })
            .where(eq(subscriptions.id, id))
            .returning();
          
          return results.length > 0 ? results[0] : undefined;
        } catch (fallbackError) {
          console.error('❌ Even targeted update failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  async deleteSubscription(id: number): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id)).returning();
    return result.length > 0;
  }

  // Payment Method operations
  async getPaymentMethods(userId?: number, teamId?: number, organizationId?: number): Promise<PaymentMethod[]> {
    if (userId) {
      return await db.select().from(paymentMethods).where(eq(paymentMethods.userId, userId));
    } else if (teamId) {
      return await db.select().from(paymentMethods).where(eq(paymentMethods.teamId, teamId));
    } else if (organizationId) {
      return await db.select().from(paymentMethods).where(eq(paymentMethods.organizationId, organizationId));
    }
    return await db.select().from(paymentMethods);
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const results = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const results = await db.insert(paymentMethods).values(paymentMethod).returning();
    return results[0];
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const result = await db.delete(paymentMethods).where(eq(paymentMethods.id, id)).returning();
    return result.length > 0;
  }

  // Invoice operations
  async getInvoices(userId?: number, teamId?: number, organizationId?: number): Promise<Invoice[]> {
    if (userId) {
      return await db.select().from(invoices).where(eq(invoices.userId, userId));
    } else if (teamId) {
      return await db.select().from(invoices).where(eq(invoices.teamId, teamId));
    } else if (organizationId) {
      return await db.select().from(invoices).where(eq(invoices.organizationId, organizationId));
    }
    return await db.select().from(invoices);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const results = await db.select().from(invoices).where(eq(invoices.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const results = await db.insert(invoices).values(invoice).returning();
    return results[0];
  }

  async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined> {
    const results = await db.update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  // Workflow operations
  async getWorkflows(userId: number): Promise<Workflow[]> {
    return await db.select().from(workflows).where(eq(workflows.userId, userId));
  }

  async getWorkflow(id: number): Promise<Workflow | undefined> {
    const results = await db.select().from(workflows).where(eq(workflows.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getWorkflowsByTrigger(userId: number, triggerType: string): Promise<Workflow[]> {
    return await db.select().from(workflows)
      .where(and(
        eq(workflows.userId, userId),
        eq(workflows.triggerType, triggerType),
        eq(workflows.isEnabled, true)
      ));
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const results = await db.insert(workflows).values(workflow).returning();
    return results[0];
  }

  async updateWorkflow(id: number, workflow: Partial<Workflow>): Promise<Workflow | undefined> {
    const results = await db.update(workflows)
      .set({ ...workflow, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteWorkflow(id: number): Promise<boolean> {
    // Delete all related data first
    await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, id));
    const result = await db.delete(workflows).where(eq(workflows.id, id)).returning();
    return result.length > 0;
  }

  // Workflow step operations
  async getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]> {
    return await db.select().from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId))
      .orderBy(workflowSteps.orderIndex);
  }

  async getWorkflowStep(id: number): Promise<WorkflowStep | undefined> {
    const results = await db.select().from(workflowSteps).where(eq(workflowSteps.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep> {
    const results = await db.insert(workflowSteps).values(step).returning();
    return results[0];
  }

  async updateWorkflowStep(id: number, step: Partial<WorkflowStep>): Promise<WorkflowStep | undefined> {
    const results = await db.update(workflowSteps)
      .set(step)
      .where(eq(workflowSteps.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteWorkflowStep(id: number): Promise<boolean> {
    const result = await db.delete(workflowSteps).where(eq(workflowSteps.id, id)).returning();
    return result.length > 0;
  }

  async deleteWorkflowSteps(workflowId: number): Promise<boolean> {
    await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, workflowId));
    return true;
  }

  // Workflow execution operations
  async getWorkflowExecutions(workflowId: number, limit: number = 50): Promise<WorkflowExecution[]> {
    return await db.select().from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit);
  }

  async getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined> {
    const results = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const results = await db.insert(workflowExecutions).values(execution).returning();
    return results[0];
  }

  async updateWorkflowExecution(id: number, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution | undefined> {
    const results = await db.update(workflowExecutions)
      .set(execution)
      .where(eq(workflowExecutions.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async getWorkflowAnalytics(userId: number): Promise<{ total: number; successful: number; failed: number; pending: number }> {
    // Get all workflows for the user
    const userWorkflows = await db.select({ id: workflows.id }).from(workflows).where(eq(workflows.userId, userId));
    const workflowIds = userWorkflows.map(w => w.id);
    
    if (workflowIds.length === 0) {
      return { total: 0, successful: 0, failed: 0, pending: 0 };
    }

    // Get execution counts
    const executions = await db.select().from(workflowExecutions)
      .where(inArray(workflowExecutions.workflowId, workflowIds));

    const total = executions.length;
    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const pending = executions.filter(e => e.status === 'pending' || e.status === 'running').length;

    return { total, successful, failed, pending };
  }

  // Workflow step execution operations
  async getWorkflowStepExecutions(executionId: number): Promise<WorkflowStepExecution[]> {
    return await db.select().from(workflowStepExecutions)
      .where(eq(workflowStepExecutions.executionId, executionId));
  }

  async createWorkflowStepExecution(stepExecution: InsertWorkflowStepExecution): Promise<WorkflowStepExecution> {
    const results = await db.insert(workflowStepExecutions).values(stepExecution).returning();
    return results[0];
  }

  async updateWorkflowStepExecution(id: number, stepExecution: Partial<WorkflowStepExecution>): Promise<WorkflowStepExecution | undefined> {
    const results = await db.update(workflowStepExecutions)
      .set(stepExecution)
      .where(eq(workflowStepExecutions.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  // Appointment operations (Smart-Scheduler integration)
  async getAppointments(filters?: {
    userId?: number;
    organizationId?: number;
    source?: string;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Appointment[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(appointments.hostUserId, filters.userId));
    }
    if (filters?.organizationId) {
      conditions.push(eq(appointments.organizationId, filters.organizationId));
    }
    if (filters?.source) {
      conditions.push(eq(appointments.source, filters.source));
    }
    if (filters?.type) {
      conditions.push(eq(appointments.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(appointments.scheduledAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(appointments.scheduledAt, filters.endDate));
    }

    if (conditions.length === 0) {
      return await db.select().from(appointments).orderBy(desc(appointments.scheduledAt));
    }

    return await db.select().from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.scheduledAt));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const results = await db.select().from(appointments).where(eq(appointments.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getAppointmentByExternalId(externalId: string): Promise<Appointment | undefined> {
    const results = await db.select().from(appointments).where(eq(appointments.externalId, externalId));
    return results.length > 0 ? results[0] : undefined;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const results = await db.insert(appointments).values(appointment).returning();
    return results[0];
  }

  async updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment | undefined> {
    const results = await db.update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const results = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return results.length > 0;
  }

  // Helper to ensure PostgreSQL boolean values are proper JavaScript booleans
  private normalizeWebhookIntegration(integration: WebhookIntegration): WebhookIntegration {
    return {
      ...integration,
      // PostgreSQL may return 't'/'f' strings for booleans in some configurations
      isActive: integration.isActive === true || (integration.isActive as any) === 't' || (integration.isActive as any) === 'true'
    };
  }

  // Webhook integration operations
  async getWebhookIntegrations(userId: number): Promise<WebhookIntegration[]> {
    const results = await db.select().from(webhookIntegrations).where(eq(webhookIntegrations.userId, userId));
    return results.map(r => this.normalizeWebhookIntegration(r));
  }

  async getWebhookIntegration(id: number): Promise<WebhookIntegration | undefined> {
    const results = await db.select().from(webhookIntegrations).where(eq(webhookIntegrations.id, id));
    return results.length > 0 ? this.normalizeWebhookIntegration(results[0]) : undefined;
  }

  async getWebhookIntegrationBySource(source: string, organizationId?: number): Promise<WebhookIntegration | undefined> {
    const conditions = [eq(webhookIntegrations.source, source), eq(webhookIntegrations.isActive, true)];
    if (organizationId) {
      conditions.push(eq(webhookIntegrations.organizationId, organizationId));
    }
    const results = await db.select().from(webhookIntegrations).where(and(...conditions));
    return results.length > 0 ? this.normalizeWebhookIntegration(results[0]) : undefined;
  }

  async createWebhookIntegration(integration: InsertWebhookIntegration): Promise<WebhookIntegration> {
    const results = await db.insert(webhookIntegrations).values(integration).returning();
    return results[0];
  }

  async updateWebhookIntegration(id: number, integration: Partial<WebhookIntegration>): Promise<WebhookIntegration | undefined> {
    const results = await db.update(webhookIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(webhookIntegrations.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteWebhookIntegration(id: number): Promise<boolean> {
    const results = await db.delete(webhookIntegrations).where(eq(webhookIntegrations.id, id)).returning();
    return results.length > 0;
  }

  // Webhook log operations
  async getWebhookLogs(integrationId: number, limit: number = 100): Promise<WebhookLog[]> {
    return await db.select().from(webhookLogs)
      .where(eq(webhookLogs.integrationId, integrationId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const results = await db.insert(webhookLogs).values(log).returning();
    return results[0];
  }

  async updateWebhookLog(id: number, log: Partial<WebhookLog>): Promise<WebhookLog | undefined> {
    const results = await db.update(webhookLogs)
      .set(log)
      .where(eq(webhookLogs.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  // Availability Schedule operations
  async getAvailabilitySchedules(userId: number): Promise<AvailabilitySchedule[]> {
    return await db.select().from(availabilitySchedules).where(eq(availabilitySchedules.userId, userId));
  }

  async getAvailabilitySchedule(id: number): Promise<AvailabilitySchedule | undefined> {
    const results = await db.select().from(availabilitySchedules).where(eq(availabilitySchedules.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createAvailabilitySchedule(schedule: InsertAvailabilitySchedule): Promise<AvailabilitySchedule> {
    const results = await db.insert(availabilitySchedules).values(schedule).returning();
    return results[0];
  }

  async updateAvailabilitySchedule(id: number, updateData: Partial<AvailabilitySchedule>): Promise<AvailabilitySchedule | undefined> {
    const results = await db.update(availabilitySchedules)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(availabilitySchedules.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteAvailabilitySchedule(id: number): Promise<boolean> {
    const result = await db.delete(availabilitySchedules).where(eq(availabilitySchedules.id, id)).returning();
    return result.length > 0;
  }

  // Custom Question operations
  async getCustomQuestions(bookingLinkId: number): Promise<CustomQuestion[]> {
    return await db.select().from(customQuestions)
      .where(eq(customQuestions.bookingLinkId, bookingLinkId))
      .orderBy(customQuestions.orderIndex);
  }

  async getCustomQuestion(id: number): Promise<CustomQuestion | undefined> {
    const results = await db.select().from(customQuestions).where(eq(customQuestions.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async createCustomQuestion(question: InsertCustomQuestion): Promise<CustomQuestion> {
    const results = await db.insert(customQuestions).values(question).returning();
    return results[0];
  }

  async updateCustomQuestion(id: number, updateData: Partial<CustomQuestion>): Promise<CustomQuestion | undefined> {
    const results = await db.update(customQuestions)
      .set(updateData)
      .where(eq(customQuestions.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteCustomQuestion(id: number): Promise<boolean> {
    const result = await db.delete(customQuestions).where(eq(customQuestions.id, id)).returning();
    return result.length > 0;
  }

  async deleteCustomQuestionsByBookingLink(bookingLinkId: number): Promise<boolean> {
    await db.delete(customQuestions).where(eq(customQuestions.bookingLinkId, bookingLinkId));
    return true;
  }

  // Date Override operations
  async getDateOverrides(userId: number): Promise<DateOverride[]> {
    return await db.select().from(dateOverrides).where(eq(dateOverrides.userId, userId));
  }

  async getDateOverride(id: number): Promise<DateOverride | undefined> {
    const results = await db.select().from(dateOverrides).where(eq(dateOverrides.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getDateOverrideByDate(userId: number, date: string): Promise<DateOverride | undefined> {
    const results = await db.select().from(dateOverrides)
      .where(and(eq(dateOverrides.userId, userId), eq(dateOverrides.date, date)));
    return results.length > 0 ? results[0] : undefined;
  }

  async createDateOverride(override: InsertDateOverride): Promise<DateOverride> {
    const results = await db.insert(dateOverrides).values(override).returning();
    return results[0];
  }

  async updateDateOverride(id: number, updateData: Partial<DateOverride>): Promise<DateOverride | undefined> {
    const results = await db.update(dateOverrides)
      .set(updateData)
      .where(eq(dateOverrides.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteDateOverride(id: number): Promise<boolean> {
    const result = await db.delete(dateOverrides).where(eq(dateOverrides.id, id)).returning();
    return result.length > 0;
  }

  // Meeting Poll operations
  async getMeetingPolls(userId: number): Promise<MeetingPoll[]> {
    return await db.select().from(meetingPolls).where(eq(meetingPolls.userId, userId));
  }

  async getMeetingPoll(id: number): Promise<MeetingPoll | undefined> {
    const results = await db.select().from(meetingPolls).where(eq(meetingPolls.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getMeetingPollBySlug(slug: string): Promise<MeetingPoll | undefined> {
    const results = await db.select().from(meetingPolls).where(eq(meetingPolls.slug, slug));
    return results.length > 0 ? results[0] : undefined;
  }

  async createMeetingPoll(poll: InsertMeetingPoll): Promise<MeetingPoll> {
    const results = await db.insert(meetingPolls).values(poll).returning();
    return results[0];
  }

  async updateMeetingPoll(id: number, poll: Partial<MeetingPoll>): Promise<MeetingPoll | undefined> {
    const results = await db.update(meetingPolls).set({ ...poll, updatedAt: new Date() }).where(eq(meetingPolls.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteMeetingPoll(id: number): Promise<boolean> {
    const result = await db.delete(meetingPolls).where(eq(meetingPolls.id, id)).returning();
    return result.length > 0;
  }

  // Meeting Poll Option operations
  async getMeetingPollOptions(pollId: number): Promise<MeetingPollOption[]> {
    return await db.select().from(meetingPollOptions).where(eq(meetingPollOptions.pollId, pollId));
  }

  async createMeetingPollOption(option: InsertMeetingPollOption): Promise<MeetingPollOption> {
    const results = await db.insert(meetingPollOptions).values(option).returning();
    return results[0];
  }

  async deleteMeetingPollOption(id: number): Promise<boolean> {
    const result = await db.delete(meetingPollOptions).where(eq(meetingPollOptions.id, id)).returning();
    return result.length > 0;
  }

  async deleteMeetingPollOptions(pollId: number): Promise<boolean> {
    await db.delete(meetingPollOptions).where(eq(meetingPollOptions.pollId, pollId));
    return true;
  }

  // Meeting Poll Vote operations
  async getMeetingPollVotes(pollId: number): Promise<MeetingPollVote[]> {
    return await db.select().from(meetingPollVotes).where(eq(meetingPollVotes.pollId, pollId));
  }

  async getMeetingPollVotesByOption(optionId: number): Promise<MeetingPollVote[]> {
    return await db.select().from(meetingPollVotes).where(eq(meetingPollVotes.optionId, optionId));
  }

  async createMeetingPollVote(vote: InsertMeetingPollVote): Promise<MeetingPollVote> {
    const results = await db.insert(meetingPollVotes).values(vote).returning();
    return results[0];
  }

  async deleteMeetingPollVote(id: number): Promise<boolean> {
    const result = await db.delete(meetingPollVotes).where(eq(meetingPollVotes.id, id)).returning();
    return result.length > 0;
  }

  async deleteMeetingPollVotesByVoter(pollId: number, voterEmail: string): Promise<boolean> {
    await db.delete(meetingPollVotes).where(
      and(eq(meetingPollVotes.pollId, pollId), eq(meetingPollVotes.voterEmail, voterEmail))
    );
    return true;
  }

  // Slack Integration operations
  async getSlackIntegration(userId: number): Promise<SlackIntegration | undefined> {
    const results = await db.select().from(slackIntegrations).where(eq(slackIntegrations.userId, userId));
    return results.length > 0 ? results[0] : undefined;
  }

  async createSlackIntegration(integration: InsertSlackIntegration): Promise<SlackIntegration> {
    const results = await db.insert(slackIntegrations).values(integration).returning();
    return results[0];
  }

  async updateSlackIntegration(id: number, integration: Partial<SlackIntegration>): Promise<SlackIntegration | undefined> {
    const results = await db.update(slackIntegrations)
      .set(integration)
      .where(eq(slackIntegrations.id, id))
      .returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteSlackIntegration(id: number): Promise<boolean> {
    const result = await db.delete(slackIntegrations).where(eq(slackIntegrations.id, id)).returning();
    return result.length > 0;
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const results = await db.insert(auditLogs).values(log).returning();
    return results[0];
  }

  async getAuditLogs(filters: { organizationId?: number; userId?: number; action?: string; entityType?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters.organizationId) conditions.push(eq(auditLogs.organizationId, filters.organizationId));
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));

    const query = db.select().from(auditLogs);
    const withConditions = conditions.length > 0 ? query.where(and(...conditions)) : query;
    return withConditions.orderBy(desc(auditLogs.createdAt)).limit(filters.limit || 50).offset(filters.offset || 0);
  }

  async getAuditLogCount(filters: { organizationId?: number; userId?: number; action?: string; entityType?: string }): Promise<number> {
    const conditions = [];
    if (filters.organizationId) conditions.push(eq(auditLogs.organizationId, filters.organizationId));
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));

    const query = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    const withConditions = conditions.length > 0 ? query.where(and(...conditions)) : query;
    const result = await withConditions;
    return Number(result[0]?.count || 0);
  }

  async deleteAuditLogsBefore(date: Date, organizationId?: number): Promise<number> {
    const conditions = [lte(auditLogs.createdAt, date)];
    if (organizationId) conditions.push(eq(auditLogs.organizationId, organizationId));
    const result = await db.delete(auditLogs).where(and(...conditions)).returning();
    return result.length;
  }

  // Domain Control operations
  async getDomainControls(organizationId: number): Promise<DomainControl[]> {
    return db.select().from(domainControls).where(eq(domainControls.organizationId, organizationId));
  }

  async createDomainControl(control: InsertDomainControl): Promise<DomainControl> {
    const results = await db.insert(domainControls).values(control).returning();
    return results[0];
  }

  async updateDomainControl(id: number, control: Partial<DomainControl>): Promise<DomainControl | undefined> {
    const results = await db.update(domainControls).set(control).where(eq(domainControls.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteDomainControl(id: number): Promise<boolean> {
    const result = await db.delete(domainControls).where(eq(domainControls.id, id)).returning();
    return result.length > 0;
  }

  async getDomainControlByDomain(domain: string): Promise<DomainControl | undefined> {
    const results = await db.select().from(domainControls).where(eq(domainControls.domain, domain));
    return results.length > 0 ? results[0] : undefined;
  }

  // Data Retention Policy operations
  async getDataRetentionPolicies(organizationId: number): Promise<DataRetentionPolicy[]> {
    return db.select().from(dataRetentionPolicies).where(eq(dataRetentionPolicies.organizationId, organizationId));
  }

  async createDataRetentionPolicy(policy: InsertDataRetentionPolicy): Promise<DataRetentionPolicy> {
    const results = await db.insert(dataRetentionPolicies).values(policy).returning();
    return results[0];
  }

  async updateDataRetentionPolicy(id: number, policy: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy | undefined> {
    const results = await db.update(dataRetentionPolicies).set(policy).where(eq(dataRetentionPolicies.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteDataRetentionPolicy(id: number): Promise<boolean> {
    const result = await db.delete(dataRetentionPolicies).where(eq(dataRetentionPolicies.id, id)).returning();
    return result.length > 0;
  }

  // SCIM Config operations
  async getScimConfig(organizationId: number): Promise<ScimConfig | undefined> {
    const results = await db.select().from(scimConfigs).where(eq(scimConfigs.organizationId, organizationId));
    return results.length > 0 ? results[0] : undefined;
  }

  async createScimConfig(config: InsertScimConfig): Promise<ScimConfig> {
    const results = await db.insert(scimConfigs).values(config).returning();
    return results[0];
  }

  async updateScimConfig(id: number, config: Partial<ScimConfig>): Promise<ScimConfig | undefined> {
    const results = await db.update(scimConfigs).set(config).where(eq(scimConfigs.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteScimConfig(id: number): Promise<boolean> {
    const result = await db.delete(scimConfigs).where(eq(scimConfigs.id, id)).returning();
    return result.length > 0;
  }

  async getScimConfigByToken(token: string): Promise<ScimConfig | undefined> {
    const results = await db.select().from(scimConfigs).where(and(eq(scimConfigs.bearerToken, token), eq(scimConfigs.isActive, true)));
    return results.length > 0 ? results[0] : undefined;
  }

  // Routing Form operations
  async getRoutingForms(userId: number): Promise<RoutingForm[]> {
    return db.select().from(routingForms).where(eq(routingForms.userId, userId));
  }

  async getRoutingForm(id: number): Promise<RoutingForm | undefined> {
    const results = await db.select().from(routingForms).where(eq(routingForms.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getRoutingFormBySlug(slug: string): Promise<RoutingForm | undefined> {
    const results = await db.select().from(routingForms).where(eq(routingForms.slug, slug));
    return results.length > 0 ? results[0] : undefined;
  }

  async createRoutingForm(form: InsertRoutingForm): Promise<RoutingForm> {
    const results = await db.insert(routingForms).values(form).returning();
    return results[0];
  }

  async updateRoutingForm(id: number, form: Partial<RoutingForm>): Promise<RoutingForm | undefined> {
    const results = await db.update(routingForms).set(form).where(eq(routingForms.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteRoutingForm(id: number): Promise<boolean> {
    await db.delete(routingFormSubmissions).where(eq(routingFormSubmissions.routingFormId, id));
    await db.delete(routingFormRules).where(eq(routingFormRules.routingFormId, id));
    await db.delete(routingFormQuestions).where(eq(routingFormQuestions.routingFormId, id));
    const result = await db.delete(routingForms).where(eq(routingForms.id, id)).returning();
    return result.length > 0;
  }

  async getRoutingFormQuestions(routingFormId: number): Promise<RoutingFormQuestion[]> {
    return db.select().from(routingFormQuestions).where(eq(routingFormQuestions.routingFormId, routingFormId));
  }

  async createRoutingFormQuestion(question: InsertRoutingFormQuestion): Promise<RoutingFormQuestion> {
    const results = await db.insert(routingFormQuestions).values(question).returning();
    return results[0];
  }

  async updateRoutingFormQuestion(id: number, question: Partial<RoutingFormQuestion>): Promise<RoutingFormQuestion | undefined> {
    const results = await db.update(routingFormQuestions).set(question).where(eq(routingFormQuestions.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteRoutingFormQuestion(id: number): Promise<boolean> {
    const result = await db.delete(routingFormQuestions).where(eq(routingFormQuestions.id, id)).returning();
    return result.length > 0;
  }

  async getRoutingFormRules(routingFormId: number): Promise<RoutingFormRule[]> {
    return db.select().from(routingFormRules).where(eq(routingFormRules.routingFormId, routingFormId));
  }

  async createRoutingFormRule(rule: InsertRoutingFormRule): Promise<RoutingFormRule> {
    const results = await db.insert(routingFormRules).values(rule).returning();
    return results[0];
  }

  async updateRoutingFormRule(id: number, rule: Partial<RoutingFormRule>): Promise<RoutingFormRule | undefined> {
    const results = await db.update(routingFormRules).set(rule).where(eq(routingFormRules.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteRoutingFormRule(id: number): Promise<boolean> {
    const result = await db.delete(routingFormRules).where(eq(routingFormRules.id, id)).returning();
    return result.length > 0;
  }

  async createRoutingFormSubmission(submission: InsertRoutingFormSubmission): Promise<RoutingFormSubmission> {
    const results = await db.insert(routingFormSubmissions).values(submission).returning();
    return results[0];
  }

  async getRoutingFormSubmissions(routingFormId: number, limit: number = 50): Promise<RoutingFormSubmission[]> {
    return db.select().from(routingFormSubmissions)
      .where(eq(routingFormSubmissions.routingFormId, routingFormId))
      .orderBy(desc(routingFormSubmissions.createdAt))
      .limit(limit);
  }

  // Auto-login token operations
  async getAutoLoginToken(id: number): Promise<AutoLoginToken | undefined> {
    const results = await db.select().from(autoLoginTokens).where(eq(autoLoginTokens.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getAutoLoginTokenByToken(token: string): Promise<AutoLoginToken | undefined> {
    const results = await db.select().from(autoLoginTokens).where(eq(autoLoginTokens.token, token));
    return results.length > 0 ? results[0] : undefined;
  }

  async getAutoLoginTokensByUserId(userId: number): Promise<AutoLoginToken[]> {
    return db.select().from(autoLoginTokens).where(eq(autoLoginTokens.userId, userId));
  }

  async getActiveAutoLoginTokens(): Promise<AutoLoginToken[]> {
    return db.select().from(autoLoginTokens)
      .where(sql`${autoLoginTokens.revokedAt} IS NULL`)
      .orderBy(desc(autoLoginTokens.createdAt));
  }

  async createAutoLoginToken(token: InsertAutoLoginToken): Promise<AutoLoginToken> {
    const results = await db.insert(autoLoginTokens).values(token).returning();
    return results[0];
  }

  async updateAutoLoginToken(id: number, data: Partial<AutoLoginToken>): Promise<AutoLoginToken | undefined> {
    const results = await db.update(autoLoginTokens).set(data).where(eq(autoLoginTokens.id, id)).returning();
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteAutoLoginToken(id: number): Promise<boolean> {
    const result = await db.delete(autoLoginTokens).where(eq(autoLoginTokens.id, id)).returning();
    return result.length > 0;
  }
}