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
  startTimeIncrement: integer("start_time_increment").default(30), // minutes between slot start times (5, 10, 15, 20, 30, 60)
  isHidden: boolean("is_hidden").default(false), // hidden from public profile but bookable via direct URL
  availabilityScheduleId: integer("availability_schedule_id"), // optional link to a named availability schedule
  // Phase 2: Branding
  brandLogo: text("brand_logo"), // URL to custom logo for booking page
  brandColor: text("brand_color"), // Primary brand color hex (e.g., "#4F46E5")
  removeBranding: boolean("remove_branding").default(false), // Remove SmartScheduler branding
  // Phase 2: Post-Booking
  redirectUrl: text("redirect_url"), // Custom URL to redirect after booking
  confirmationMessage: text("confirmation_message"), // Custom confirmation page message
  confirmationCta: jsonb("confirmation_cta"), // Custom CTA: {label, url}
  // Phase 2: One-Off Meetings
  isOneOff: boolean("is_one_off").default(false), // Expires after single use
  isExpired: boolean("is_expired").default(false), // Whether a one-off link has been used
  // Phase 3: Payment Collection (Stripe)
  requirePayment: boolean("require_payment").default(false),
  price: integer("price"), // Price in cents (e.g., 5000 = $50.00)
  currency: text("currency").default("usd"),
  // Phase 3: Auto-conferencing
  autoCreateMeetLink: boolean("auto_create_meet_link").default(false),
  // Phase 4: Team & Admin Enhancements
  teamMemberWeights: jsonb("team_member_weights").default({}), // {userId: weight} for round-robin priority
  maxBookingsPerWeek: integer("max_bookings_per_week").default(0), // 0 = unlimited
  maxBookingsPerMonth: integer("max_bookings_per_month").default(0), // 0 = unlimited
  isCollective: boolean("is_collective").default(false), // All selected hosts must attend
  isManagedTemplate: boolean("is_managed_template").default(false), // Admin-created template
  managedTemplateId: integer("managed_template_id"), // Template this link was created from
  lockedFields: jsonb("locked_fields").default([]), // Array of field names locked by template
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
  status: text("status").default("confirmed"), // confirmed, cancelled, rescheduled, no_show
  eventId: integer("event_id"), // link to created event
  assignedUserId: integer("assigned_user_id"), // For team bookings, which team member is assigned
  customAnswers: jsonb("custom_answers").default([]), // Answers to custom invitee questions [{questionId, value}]
  noShowMarkedAt: timestamp("no_show_marked_at"), // When the booking was marked as no-show
  noShowMarkedBy: integer("no_show_marked_by"), // User ID who marked it as no-show
  reconfirmationSentAt: timestamp("reconfirmation_sent_at"), // When reconfirmation request was sent
  reconfirmationStatus: text("reconfirmation_status"), // pending, confirmed, declined
  reconfirmationToken: text("reconfirmation_token"), // Token for reconfirmation link
  // Phase 3: Payment
  paymentStatus: text("payment_status"), // pending, paid, refunded, failed
  paymentIntentId: text("payment_intent_id"), // Stripe Payment Intent ID
  paymentAmount: integer("payment_amount"), // Amount in cents
  paymentCurrency: text("payment_currency"),
  // Phase 3: Google Meet auto-link
  meetingUrl: text("meeting_url"),
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
  customAnswers: true,
  noShowMarkedAt: true,
  noShowMarkedBy: true,
  reconfirmationSentAt: true,
  reconfirmationStatus: true,
  reconfirmationToken: true,
  paymentStatus: true,
  paymentIntentId: true,
  paymentAmount: true,
  paymentCurrency: true,
  meetingUrl: true,
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
  metadata: jsonb("metadata"), // Additional metadata (onboarding progress, etc.)
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

// Workflow model
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").default({}),
  isEnabled: boolean("is_enabled").default(true),
  isTemplate: boolean("is_template").default(false),
  templateId: integer("template_id"),
  version: integer("version").default(1),
  // Phase 4: Managed Workflows
  isManagedTemplate: boolean("is_managed_template").default(false), // Admin-created managed template
  managedTemplateId: integer("managed_template_id"), // Template this workflow was pushed from
  lockedFields: jsonb("locked_fields").default([]), // Fields locked by the managed template
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
  isManagedTemplate: true,
  managedTemplateId: true,
  lockedFields: true,
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

// Workflow steps model
export const workflowSteps = pgTable("workflow_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  actionType: text("action_type").notNull(),
  actionConfig: jsonb("action_config").default({}),
  orderIndex: integer("order_index").notNull(),
  parentStepId: integer("parent_step_id"),
  branchCondition: text("branch_condition"),
  conditionConfig: jsonb("condition_config"),
  delayMinutes: integer("delay_minutes").default(0),
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

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;

// Workflow executions model
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  triggerData: jsonb("trigger_data").default({}),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  stepsCompleted: integer("steps_completed").default(0),
  totalSteps: integer("total_steps").default(0),
  metadata: jsonb("metadata").default({}),
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

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

// Workflow step executions model
export const workflowStepExecutions = pgTable("workflow_step_executions", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").notNull(),
  stepId: integer("step_id").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  output: jsonb("output").default({}),
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

export type WorkflowStepExecution = typeof workflowStepExecutions.$inferSelect;
export type InsertWorkflowStepExecution = z.infer<typeof insertWorkflowStepExecutionSchema>;

// Appointment enums
export const AppointmentSource = {
  INTERNAL: "internal",
  BRAND_VOICE: "brand_voice_interview",
  EXTERNAL: "external",
  MANUAL: "manual",
  SMART_SCHEDULER: "smart_scheduler",
} as const;

export const AppointmentType = {
  INITIAL_CONSULTATION: "initial_consultation",
  FOLLOW_UP: "follow_up",
  BRAND_VOICE_INTERVIEW: "brand_voice_interview",
  STRATEGY_SESSION: "strategy_session",
  OTHER: "other",
} as const;

export const AppointmentStatus = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  RESCHEDULED: "rescheduled",
} as const;

export const HostRole = {
  ADVISOR: "advisor",
  COACH: "coach",
  CONSULTANT: "consultant",
  INTERVIEWER: "interviewer",
  OTHER: "other",
} as const;

// Appointments model (Smart-Scheduler integration)
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  externalId: text("external_id"),
  source: text("source").notNull().default("internal"),
  type: text("type").notNull().default("initial_consultation"),
  status: text("status").notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30),
  timezone: text("timezone").default("UTC"),
  clientExternalId: text("client_external_id"),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  hostUserId: integer("host_user_id"),
  hostExternalId: text("host_external_id"),
  hostEmail: text("host_email"),
  hostName: text("host_name"),
  hostRole: text("host_role").default("advisor"),
  location: text("location"),
  meetingUrl: text("meeting_url"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  organizationId: integer("organization_id"),
  teamId: integer("team_id"),
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

// Webhook integrations model
export const webhookIntegrations = pgTable("webhook_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id"),
  name: text("name").notNull(),
  source: text("source").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  isActive: boolean("is_active").default(true),
  apiKey: text("api_key"),
  apiEndpoint: text("api_endpoint"),
  callbackUrl: text("callback_url"),
  callbackSecret: text("callback_secret"),
  metadata: jsonb("metadata").default({}),
  lastWebhookAt: timestamp("last_webhook_at"),
  webhookCount: integer("webhook_count").default(0),
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

// Webhook logs model
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").default({}),
  signature: text("signature"),
  signatureValid: boolean("signature_valid").default(false),
  processed: boolean("processed").default(false),
  processingError: text("processing_error"),
  appointmentId: integer("appointment_id"),
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

// Availability Schedules model - named, reusable availability configurations
export const availabilitySchedules = pgTable("availability_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(), // e.g., "Weekday Mornings", "Full Day"
  isDefault: boolean("is_default").default(false), // Whether this is the user's default schedule
  timezone: text("timezone").default("UTC"),
  rules: jsonb("rules").default([]), // Array of availability rules: [{dayOfWeek, startTime, endTime}]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAvailabilityScheduleSchema = createInsertSchema(availabilitySchedules).pick({
  userId: true,
  name: true,
  isDefault: true,
  timezone: true,
  rules: true,
});

export type AvailabilitySchedule = typeof availabilitySchedules.$inferSelect;
export type InsertAvailabilitySchedule = z.infer<typeof insertAvailabilityScheduleSchema>;

// Custom Questions model - custom form fields for booking links
export const customQuestions = pgTable("custom_questions", {
  id: serial("id").primaryKey(),
  bookingLinkId: integer("booking_link_id").notNull(),
  label: text("label").notNull(), // Question text
  type: text("type").notNull(), // text, textarea, dropdown, radio, checkbox, phone
  required: boolean("required").default(false),
  options: jsonb("options").default([]), // For dropdown/radio/checkbox: array of option strings
  orderIndex: integer("order_index").notNull().default(0),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomQuestionSchema = createInsertSchema(customQuestions).pick({
  bookingLinkId: true,
  label: true,
  type: true,
  required: true,
  options: true,
  orderIndex: true,
  enabled: true,
});

export type CustomQuestion = typeof customQuestions.$inferSelect;
export type InsertCustomQuestion = z.infer<typeof insertCustomQuestionSchema>;

// Date-specific Availability Overrides model - user-level overrides for specific dates
export const dateOverrides = pgTable("date_overrides", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("override_date").notNull(), // ISO date string (YYYY-MM-DD)
  isAvailable: boolean("is_available").default(true), // false = completely unavailable
  startTime: text("start_time"), // Override start time (HH:mm), null if unavailable
  endTime: text("end_time"), // Override end time (HH:mm), null if unavailable
  label: text("label"), // Optional label (e.g., "Holiday", "Half Day")
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDateOverrideSchema = createInsertSchema(dateOverrides).pick({
  userId: true,
  date: true,
  isAvailable: true,
  startTime: true,
  endTime: true,
  label: true,
});

export type DateOverride = typeof dateOverrides.$inferSelect;
export type InsertDateOverride = z.infer<typeof insertDateOverrideSchema>;

// Meeting Polls model - allow invitees to vote on preferred times
export const meetingPolls = pgTable("meeting_polls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Poll creator
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(), // Unique URL slug for the poll
  duration: integer("duration").notNull(), // Meeting duration in minutes
  location: text("location"),
  meetingUrl: text("meeting_url"),
  status: text("status").default("open"), // open, closed, scheduled
  deadline: timestamp("deadline"), // Voting deadline
  selectedOptionId: integer("selected_option_id"), // The option that was selected as final
  timezone: text("timezone").default("UTC"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingPollSchema = createInsertSchema(meetingPolls).pick({
  userId: true,
  title: true,
  description: true,
  slug: true,
  duration: true,
  location: true,
  meetingUrl: true,
  status: true,
  deadline: true,
  selectedOptionId: true,
  timezone: true,
});

export type MeetingPoll = typeof meetingPolls.$inferSelect;
export type InsertMeetingPoll = z.infer<typeof insertMeetingPollSchema>;

// Meeting Poll Options model - proposed time slots for a poll
export const meetingPollOptions = pgTable("meeting_poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeetingPollOptionSchema = createInsertSchema(meetingPollOptions).pick({
  pollId: true,
  startTime: true,
  endTime: true,
});

export type MeetingPollOption = typeof meetingPollOptions.$inferSelect;
export type InsertMeetingPollOption = z.infer<typeof insertMeetingPollOptionSchema>;

// Meeting Poll Votes model - votes from participants
export const meetingPollVotes = pgTable("meeting_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  voterName: text("voter_name").notNull(),
  voterEmail: text("voter_email").notNull(),
  vote: text("vote").notNull().default("yes"), // yes, no, if_needed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeetingPollVoteSchema = createInsertSchema(meetingPollVotes).pick({
  pollId: true,
  optionId: true,
  voterName: true,
  voterEmail: true,
  vote: true,
});

export type MeetingPollVote = typeof meetingPollVotes.$inferSelect;
export type InsertMeetingPollVote = z.infer<typeof insertMeetingPollVoteSchema>;

// Slack Integration Config model - per-user Slack notification settings
export const slackIntegrations = pgTable("slack_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  webhookUrl: text("webhook_url").notNull(), // Slack incoming webhook URL
  channelName: text("channel_name"), // Display name of the channel
  notifyOnBooking: boolean("notify_on_booking").default(true),
  notifyOnCancellation: boolean("notify_on_cancellation").default(true),
  notifyOnReschedule: boolean("notify_on_reschedule").default(true),
  notifyOnNoShow: boolean("notify_on_no_show").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSlackIntegrationSchema = createInsertSchema(slackIntegrations).pick({
  userId: true,
  webhookUrl: true,
  channelName: true,
  notifyOnBooking: true,
  notifyOnCancellation: true,
  notifyOnReschedule: true,
  notifyOnNoShow: true,
  isActive: true,
});

export type SlackIntegration = typeof slackIntegrations.$inferSelect;
export type InsertSlackIntegration = z.infer<typeof insertSlackIntegrationSchema>;

// HubSpot Integration model - per-user HubSpot CRM config
