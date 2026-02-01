import { db } from './db';
import { IStorage } from './storage';
import {
  User, InsertUser,
  Organization, InsertOrganization,
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
  users, organizations, teams, calendarIntegrations, events, bookingLinks, bookings, settings,
  subscriptions, paymentMethods, invoices, workflows, workflowSteps, workflowExecutions, workflowStepExecutions
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

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const results = await db.select().from(organizations).where(eq(organizations.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const results = await db.insert(organizations).values(organization).returning();
    return results[0];
  }

  async updateOrganization(id: number, updateData: Partial<Organization>): Promise<Organization | undefined> {
    const results = await db.update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();
    
    return results.length > 0 ? results[0] : undefined;
  }

  async deleteOrganization(id: number): Promise<boolean> {
    const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
    return result.length > 0;
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
}