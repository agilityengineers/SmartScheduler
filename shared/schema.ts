import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles as an enum for type safety
export const UserRole = {
  ADMIN: 'admin',            // Super admin with access to all functionality
  COMPANY_ADMIN: 'company_admin', // Admin of an organization
  TEAM_MANAGER: 'team_manager',   // Manager of a team
  USER: 'user',              // Basic user
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  timezone: text("timezone").default("UTC"),
  role: text("role").notNull().default(UserRole.USER),
  organizationId: integer("organization_id"),
  teamId: integer("team_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  timezone: true,
  role: true,
  organizationId: true,
  teamId: true,
});

// Organization model
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  description: true,
});

// Team model
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  organizationId: true,
});

// Calendar integration model
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // google, outlook, ical
  name: text("name"), // Calendar name for multiple calendars from the same provider
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  calendarId: text("calendar_id"),
  lastSynced: timestamp("last_synced"),
  isConnected: boolean("is_connected").default(false),
  isPrimary: boolean("is_primary").default(false), // To mark the primary calendar for each type
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
  availabilityWindow: integer("availability_window").default(30), // days in advance
  isActive: boolean("is_active").default(true),
  notifyOnBooking: boolean("notify_on_booking").default(true),
  availableDays: jsonb("available_days").default(["1", "2", "3", "4", "5"]), // 0 = Sunday, 1 = Monday, etc.
  availableHours: jsonb("available_hours").default({ start: "09:00", end: "17:00" }),
  bufferBefore: integer("buffer_before").default(0), // in minutes
  bufferAfter: integer("buffer_after").default(0), // in minutes
  maxBookingsPerDay: integer("max_bookings_per_day").default(0), // 0 = unlimited
  leadTime: integer("lead_time").default(60), // minutes required before booking (minimum notice)
});

export const insertBookingLinkSchema = createInsertSchema(bookingLinks).pick({
  userId: true,
  teamId: true,
  isTeamBooking: true,
  teamMemberIds: true,
  assignmentMethod: true,
  slug: true,
  title: true,
  description: true,
  duration: true,
  availabilityWindow: true,
  isActive: true,
  notifyOnBooking: true,
  availableDays: true,
  availableHours: true,
  bufferBefore: true,
  bufferAfter: true,
  maxBookingsPerDay: true,
  leadTime: true,
});

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
  workingHours: true,
  timeFormat: true,
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
