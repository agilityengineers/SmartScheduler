import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles as an enum for type safety
export const UserRole = {
  ADMIN: 'admin',            // Super admin with access to all functionality
  COMPANY_ADMIN: 'company_admin', // Admin of an organization
  TEAM_MANAGER: 'team_manager',   // Manager of a team
  USER: 'user',              // Basic user
} as const;

// Define subscription plans as enums
export const SubscriptionPlan = {
  FREE: 'free',              // Free plan with limited features
  INDIVIDUAL: 'individual',  // Individual paid plan ($9.99/month per user)
  TEAM: 'team',              // Team plan ($30/month + $8/month per user)
  ORGANIZATION: 'organization', // Organization plan ($99/month + $8/month per user)
} as const;

// Define subscription status as enums
export const SubscriptionStatus = {
  ACTIVE: 'active',          // Active subscription
  TRIALING: 'trialing',      // Trial period
  PAST_DUE: 'past_due',      // Payment failed but grace period
  CANCELED: 'canceled',      // Subscription canceled but not expired
  EXPIRED: 'expired',        // Subscription expired
  UNPAID: 'unpaid',          // Payment failed and past grace period
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];
export type SubscriptionPlanType = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];
export type SubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayName: text("display_name"),
  profilePicture: text("profile_picture"),  // Store URL to profile picture
  avatarColor: text("avatar_color"), // For generated avatars
  bio: text("bio"),  // User biography/description
  timezone: text("timezone").default("UTC"),
  role: text("role").notNull().default(UserRole.USER),
  organizationId: integer("organization_id"),
  teamId: integer("team_id"),
  stripeCustomerId: text("stripe_customer_id").unique(), // For individual subscriptions
  hasFreeAccess: boolean("has_free_access").default(false), // For users with admin-granted free access
  trialEndsAt: timestamp("trial_ends_at"), // When the user's trial ends
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  displayName: true,
  profilePicture: true,
  avatarColor: true,
  bio: true,
  timezone: true,
  role: true,
  organizationId: true,
  teamId: true,
  stripeCustomerId: true,
  hasFreeAccess: true,
  trialEndsAt: true,
});

// Organization model
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  stripeCustomerId: text("stripe_customer_id").unique(), // Stripe customer ID for org billing
  trialEndsAt: timestamp("trial_ends_at"), // When the organization's trial ends
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  description: true,
  stripeCustomerId: true,
  trialEndsAt: true,
});

// Team model
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(), // Stripe customer ID for team billing
  trialEndsAt: timestamp("trial_ends_at"), // When the team's trial ends
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  organizationId: true,
  stripeCustomerId: true,
  trialEndsAt: true,
});

// Calendar integration model
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // google, outlook, ical, zapier, zoom
  name: text("name"), // Calendar name for multiple calendars from the same provider
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  calendarId: text("calendar_id"),
  lastSynced: timestamp("last_synced"),
  isConnected: boolean("is_connected").default(false),
  isPrimary: boolean("is_primary").default(false), // To mark the primary calendar for each type
  webhookUrl: text("webhook_url"), // For webhook-based integrations like Zapier
  apiKey: text("api_key"), // For API key based integrations
  metadata: jsonb("metadata"), // Additional metadata for integrations (e.g., OAuth type for Zoom)
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).pick({
  userId: true,
  type: true,
  name: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
  calendarId: true,
  lastSynced: true,
  isConnected: true,
  isPrimary: true,
  webhookUrl: true,
  apiKey: true,
  metadata: true,
});

// Event model
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  meetingUrl: text("meeting_url"),
  isAllDay: boolean("is_all_day").default(false),
  externalId: text("external_id"), // ID from external calendar service
  calendarType: text("calendar_type"), // google, outlook, ical
  calendarIntegrationId: integer("calendar_integration_id"), // Reference to the specific calendar integration
  attendees: jsonb("attendees").default([]), // Array of email addresses
  reminders: jsonb("reminders").default([]), // Array of reminder times
  timezone: text("timezone"),
  recurrence: text("recurrence"), // RRULE format
});

export const insertEventSchema = createInsertSchema(events).pick({
  userId: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  meetingUrl: true,
  isAllDay: true,
  externalId: true,
  calendarType: true,
  calendarIntegrationId: true,
  attendees: true,
  reminders: true,
  timezone: true,
  recurrence: true,
});

// Booking links model
export const bookingLinks = pgTable("booking_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id"), // Optional team ID for team booking links
  isTeamBooking: boolean("is_team_booking").default(false), // Whether this is a team booking link
  teamMemberIds: jsonb("team_member_ids").default([]), // Array of team member IDs to include
  assignmentMethod: text("assignment_method").default("round-robin"), // "round-robin", "pooled", "specific"
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  // Consolidated availability data into a single JSON field
  availability: jsonb("availability").default({
    window: 30, // days in advance that the booking link is available
    days: ["1", "2", "3", "4", "5"], // 0 = Sunday, 1 = Monday, etc.
    hours: { start: "09:00", end: "17:00" } // Available time slots
  }),
  meetingType: text("meeting_type").default("in-person"), // in-person, zoom, custom
  location: text("location"), // Physical location for in-person meetings
  meetingUrl: text("meeting_url"), // URL for virtual meetings
  bufferBefore: integer("buffer_before").default(0), // in minutes
  bufferAfter: integer("buffer_after").default(0), // in minutes
  maxBookingsPerDay: integer("max_bookings_per_day").default(0), // 0 = unlimited
  leadTime: integer("lead_time").default(60), // minutes required before booking (minimum notice)
});

// Create insert schema directly from schema object without using pick
export const insertBookingLinkSchema = createInsertSchema(bookingLinks);

// Booking model for appointments made through booking links
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingLinkId: integer("booking_link_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  notes: text("notes"),
  status: text("status").default("confirmed"), // confirmed, cancelled, rescheduled
  eventId: integer("event_id"), // link to created event
  assignedUserId: integer("assigned_user_id"), // For team bookings, which team member is assigned
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  bookingLinkId: true,
  name: true,
  email: true,
  startTime: true,
  endTime: true,
  notes: true,
  status: true,
  eventId: true,
  assignedUserId: true,
});

// Settings model
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  defaultReminders: jsonb("default_reminders").default([15]), // Default reminder times in minutes
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  defaultCalendar: text("default_calendar").default("google"), // Default calendar type (google, outlook, ical)
  defaultCalendarIntegrationId: integer("default_calendar_integration_id"), // Specific calendar integration to use as default
  defaultMeetingDuration: integer("default_meeting_duration").default(30), // in minutes
  showDeclinedEvents: boolean("show_declined_events").default(false), // Whether to show declined events
  combinedView: boolean("combined_view").default(true), // Whether to show all calendars in a combined view
  preferredTimezone: text("preferred_timezone").default("UTC"), // User's preferred timezone for bookings
  workingHours: jsonb("working_hours").default({
    0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
    1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
    2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
    3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
    4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
    5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
    6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
  }),
  timeFormat: text("time_format").default("12h"), // 12h or 24h
  timeBlocks: jsonb("time_blocks").default([]), // Array of time blocks for unavailability
  metadata: jsonb("metadata").default({}), // Additional metadata including onboarding progress
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  userId: true,
  defaultReminders: true,
  emailNotifications: true,
  pushNotifications: true,
  defaultCalendar: true,
  defaultCalendarIntegrationId: true,
  defaultMeetingDuration: true,
  showDeclinedEvents: true,
  combinedView: true,
  preferredTimezone: true,
  workingHours: true,
  timeFormat: true,
  timeBlocks: true,
  metadata: true,
});

// Types for schema
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type BookingLink = typeof bookingLinks.$inferSelect;
export type InsertBookingLink = z.infer<typeof insertBookingLinkSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Subscription model
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  plan: text("plan").notNull().default(SubscriptionPlan.FREE),
  status: text("status").notNull().default(SubscriptionStatus.TRIALING),
  priceId: text("price_id"), // Stripe price ID
  quantity: integer("quantity").default(1), // Number of licenses (seats)
  trialEndsAt: timestamp("trial_ends_at"), // When the trial period ends
  startsAt: timestamp("starts_at"), // When the subscription starts
  currentPeriodStart: timestamp("current_period_start"), // Current billing period start
  currentPeriodEnd: timestamp("current_period_end"), // Current billing period end
  canceledAt: timestamp("canceled_at"), // When the subscription was canceled
  endedAt: timestamp("ended_at"), // When the subscription ends/ended
  organizationId: integer("organization_id"), // For org-wide subscriptions
  teamId: integer("team_id"), // For team-wide subscriptions
  userId: integer("user_id"), // For individual subscriptions
  metadata: jsonb("metadata"), // Additional subscription metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  plan: true,
  status: true,
  priceId: true,
  quantity: true,
  trialEndsAt: true,
  startsAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  canceledAt: true,
  endedAt: true,
  organizationId: true,
  teamId: true,
  userId: true,
  metadata: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Customer payment methods
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
  type: text("type").notNull(), // card, bank_account, etc.
  isDefault: boolean("is_default").default(false),
  last4: text("last4"), // Last 4 digits of card/account
  brand: text("brand"), // Card brand (Visa, Mastercard, etc.)
  expiryMonth: integer("expiry_month"), // Card expiry month
  expiryYear: integer("expiry_year"), // Card expiry year
  organizationId: integer("organization_id"), // For org payment methods
  teamId: integer("team_id"), // For team payment methods
  userId: integer("user_id"), // For individual payment methods
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
  stripeCustomerId: true,
  stripePaymentMethodId: true,
  type: true,
  isDefault: true,
  last4: true,
  brand: true,
  expiryMonth: true,
  expiryYear: true,
  organizationId: true,
  teamId: true,
  userId: true,
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// Invoice model
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  subscriptionId: integer("subscription_id"),
  status: text("status").notNull(), // paid, open, uncollectible, void
  amountDue: real("amount_due").notNull(), // Amount due in cents
  amountPaid: real("amount_paid"), // Amount paid in cents
  amountRemaining: real("amount_remaining"), // Amount remaining in cents
  currency: text("currency").notNull().default("usd"),
  invoiceNumber: text("invoice_number"), // Custom invoice number
  invoiceDate: date("invoice_date").notNull(), // Date of the invoice
  dueDate: date("due_date"), // Due date for the invoice
  pdfUrl: text("pdf_url"), // URL to the PDF invoice
  hostedInvoiceUrl: text("hosted_invoice_url"), // URL to the hosted invoice page
  organizationId: integer("organization_id"), // For org invoices
  teamId: integer("team_id"), // For team invoices
  userId: integer("user_id"), // For individual invoices
  metadata: jsonb("metadata"), // Additional invoice metadata
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  stripeInvoiceId: true,
  stripeCustomerId: true,
  subscriptionId: true,
  status: true,
  amountDue: true,
  amountPaid: true,
  amountRemaining: true,
  currency: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  pdfUrl: true,
  hostedInvoiceUrl: true,
  organizationId: true,
  teamId: true,
  userId: true,
  metadata: true,
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Password reset tokens model
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  consumed: boolean("consumed").default(false),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  token: true,
  userId: true,
  email: true,
  expiresAt: true,
  consumed: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Workflow trigger types
export const WorkflowTriggerType = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELED: 'booking_canceled',
  BOOKING_RESCHEDULED: 'booking_rescheduled',
  EVENT_REMINDER: 'event_reminder',
  EVENT_STARTED: 'event_started',
  EVENT_ENDED: 'event_ended',
  FOLLOW_UP: 'follow_up',
} as const;

// Workflow action types
export const WorkflowActionType = {
  SEND_EMAIL: 'send_email',
  SEND_SMS: 'send_sms',
  TRIGGER_WEBHOOK: 'trigger_webhook',
  CREATE_EVENT: 'create_event',
  ADD_TO_CONTACT_LIST: 'add_to_contact_list',
  DELAY: 'delay',
  CONDITION: 'condition',
} as const;

// Workflow execution status
export const WorkflowExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type WorkflowTriggerTypeValue = (typeof WorkflowTriggerType)[keyof typeof WorkflowTriggerType];
export type WorkflowActionTypeValue = (typeof WorkflowActionType)[keyof typeof WorkflowActionType];
export type WorkflowExecutionStatusValue = (typeof WorkflowExecutionStatus)[keyof typeof WorkflowExecutionStatus];

// Workflows model - main workflow definition
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // booking_created, event_reminder, etc.
  triggerConfig: jsonb("trigger_config").default({}), // Trigger-specific configuration (e.g., reminder minutes)
  isEnabled: boolean("is_enabled").default(true),
  isTemplate: boolean("is_template").default(false), // Whether this is a template workflow
  templateId: integer("template_id"), // If created from a template, reference to the original
  version: integer("version").default(1), // For versioning
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkflowSchema = createInsertSchema(workflows).pick({
  userId: true,
  name: true,
  description: true,
  triggerType: true,
  triggerConfig: true,
  isEnabled: true,
  isTemplate: true,
  templateId: true,
  version: true,
});

// Workflow steps model - individual actions in a workflow
export const workflowSteps = pgTable("workflow_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  actionType: text("action_type").notNull(), // send_email, send_sms, trigger_webhook, etc.
  actionConfig: jsonb("action_config").default({}), // Action-specific configuration
  orderIndex: integer("order_index").notNull(), // Order of execution
  parentStepId: integer("parent_step_id"), // For branching - parent step ID
  branchCondition: text("branch_condition"), // 'true' or 'false' for conditional branches
  conditionConfig: jsonb("condition_config"), // Condition configuration for conditional steps
  delayMinutes: integer("delay_minutes").default(0), // Delay before executing this step
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).pick({
  workflowId: true,
  actionType: true,
  actionConfig: true,
  orderIndex: true,
  parentStepId: true,
  branchCondition: true,
  conditionConfig: true,
  delayMinutes: true,
});

// Workflow executions model - execution history for analytics
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  triggerData: jsonb("trigger_data").default({}), // Data that triggered the workflow (booking, event, etc.)
  status: text("status").notNull().default('pending'), // pending, running, completed, failed
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  stepsCompleted: integer("steps_completed").default(0),
  totalSteps: integer("total_steps").default(0),
  metadata: jsonb("metadata").default({}), // Additional execution metadata
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).pick({
  workflowId: true,
  triggerData: true,
  status: true,
  startedAt: true,
  completedAt: true,
  errorMessage: true,
  stepsCompleted: true,
  totalSteps: true,
  metadata: true,
});

// Workflow step executions - individual step execution logs
export const workflowStepExecutions = pgTable("workflow_step_executions", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull(),
  stepId: integer("step_id").notNull(),
  status: text("status").notNull().default('pending'), // pending, running, completed, failed, skipped
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  output: jsonb("output").default({}), // Output/result from the step
  errorMessage: text("error_message"),
});

export const insertWorkflowStepExecutionSchema = createInsertSchema(workflowStepExecutions).pick({
  executionId: true,
  stepId: true,
  status: true,
  startedAt: true,
  completedAt: true,
  output: true,
  errorMessage: true,
});

// Types for workflow schema
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

export type WorkflowStepExecution = typeof workflowStepExecutions.$inferSelect;
export type InsertWorkflowStepExecution = z.infer<typeof insertWorkflowStepExecutionSchema>;

// ==================== Smart-Scheduler Integration ====================

// Appointment types for unified scheduling
export const AppointmentType = {
  INITIAL_CONSULTATION: 'initial_consultation',
  BRAND_VOICE_INTERVIEW: 'brand_voice_interview',
  STRATEGY_SESSION: 'strategy_session',
  FOLLOW_UP: 'follow_up',
  ONBOARDING: 'onboarding',
} as const;

// Appointment sources for tracking where appointments come from
export const AppointmentSource = {
  SMART_SCHEDULER: 'smart-scheduler',
  CALENDLY: 'calendly',
  MANUAL: 'manual',
  INTERNAL: 'internal',
} as const;

// Host roles for team member classification
export const HostRole = {
  ADMIN: 'admin',
  ADVISOR: 'advisor',
  INTERVIEWER: 'interviewer',
  COACH: 'coach',
} as const;

// Appointment status
export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentTypeValue = (typeof AppointmentType)[keyof typeof AppointmentType];
export type AppointmentSourceValue = (typeof AppointmentSource)[keyof typeof AppointmentSource];
export type HostRoleValue = (typeof HostRole)[keyof typeof HostRole];
export type AppointmentStatusValue = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// Unified appointments table - receives data from multiple sources
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").unique(), // ID from external system (e.g., ss-12345 from Smart-Scheduler)
  source: text("source").notNull().default(AppointmentSource.INTERNAL), // smart-scheduler, calendly, manual, internal
  type: text("type").notNull().default(AppointmentType.INITIAL_CONSULTATION), // initial_consultation, brand_voice_interview, etc.
  status: text("status").notNull().default(AppointmentStatus.SCHEDULED),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30), // in minutes
  timezone: text("timezone").default("UTC"),
  // Client information
  clientExternalId: text("client_external_id"), // External system's client ID
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  // Host information
  hostUserId: integer("host_user_id"), // Reference to internal user
  hostExternalId: text("host_external_id"), // External system's host ID
  hostEmail: text("host_email"),
  hostName: text("host_name"),
  hostRole: text("host_role").default(HostRole.ADVISOR), // admin, advisor, interviewer, coach
  // Meeting details
  location: text("location"),
  meetingUrl: text("meeting_url"),
  notes: text("notes"),
  // Metadata
  metadata: jsonb("metadata").default({}), // Additional data from external systems
  organizationId: integer("organization_id"),
  teamId: integer("team_id"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  externalId: true,
  source: true,
  type: true,
  status: true,
  scheduledAt: true,
  duration: true,
  timezone: true,
  clientExternalId: true,
  clientEmail: true,
  clientName: true,
  clientPhone: true,
  hostUserId: true,
  hostExternalId: true,
  hostEmail: true,
  hostName: true,
  hostRole: true,
  location: true,
  meetingUrl: true,
  notes: true,
  metadata: true,
  organizationId: true,
  teamId: true,
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Webhook integrations table - stores configuration for external integrations
export const webhookIntegrations = pgTable("webhook_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id"),
  name: text("name").notNull(), // Display name (e.g., "Smart-Scheduler Production")
  source: text("source").notNull(), // smart-scheduler, calendly, etc.
  // Inbound webhook configuration (receiving webhooks)
  webhookSecret: text("webhook_secret").notNull(), // HMAC secret for signature verification
  isActive: boolean("is_active").default(true),
  // Outbound API configuration (calling external APIs)
  apiKey: text("api_key"), // API key for calling external service
  apiEndpoint: text("api_endpoint"), // Base URL for external API
  // Callback URL configuration (outgoing webhooks)
  callbackUrl: text("callback_url"), // URL to send webhooks to
  callbackSecret: text("callback_secret"), // Secret for signing outgoing webhooks
  // Metadata
  metadata: jsonb("metadata").default({}),
  lastWebhookAt: timestamp("last_webhook_at"), // Last time a webhook was received
  webhookCount: integer("webhook_count").default(0), // Number of webhooks received
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWebhookIntegrationSchema = createInsertSchema(webhookIntegrations).pick({
  userId: true,
  organizationId: true,
  name: true,
  source: true,
  webhookSecret: true,
  isActive: true,
  apiKey: true,
  apiEndpoint: true,
  callbackUrl: true,
  callbackSecret: true,
  metadata: true,
});

export type WebhookIntegration = typeof webhookIntegrations.$inferSelect;
export type InsertWebhookIntegration = z.infer<typeof insertWebhookIntegrationSchema>;

// Webhook logs table - for debugging and auditing webhook activity
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull(),
  eventType: text("event_type").notNull(), // appointment.created, appointment.updated, etc.
  payload: jsonb("payload").default({}), // Raw webhook payload
  signature: text("signature"), // Received signature
  signatureValid: boolean("signature_valid").default(false),
  processed: boolean("processed").default(false),
  processingError: text("processing_error"),
  appointmentId: integer("appointment_id"), // Created/updated appointment ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).pick({
  integrationId: true,
  eventType: true,
  payload: true,
  signature: true,
  signatureValid: true,
  processed: true,
  processingError: true,
  appointmentId: true,
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
