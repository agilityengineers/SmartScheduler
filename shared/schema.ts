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
