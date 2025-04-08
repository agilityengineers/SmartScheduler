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
  Invoice, InsertInvoice
} from '@shared/schema';

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  getUsersByTeam(teamId: number): Promise<User[]>;
  
  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizations(): Promise<Organization[]>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<Organization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<boolean>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(organizationId?: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  // Calendar Integration operations
  getCalendarIntegrations(userId: number): Promise<CalendarIntegration[]>;
  getCalendarIntegration(id: number): Promise<CalendarIntegration | undefined>;
  getCalendarIntegrationByType(userId: number, type: string): Promise<CalendarIntegration | undefined>;
  createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration>;
  updateCalendarIntegration(id: number, integration: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined>;
  deleteCalendarIntegration(id: number): Promise<boolean>;

  // Event operations
  getEvents(userId: number, startDate?: Date, endDate?: Date): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventByExternalId(externalId: string, calendarType: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // Booking Link operations
  getBookingLinks(userId: number): Promise<BookingLink[]>;
  getBookingLink(id: number): Promise<BookingLink | undefined>;
  getBookingLinkBySlug(slug: string): Promise<BookingLink | undefined>;
  createBookingLink(bookingLink: InsertBookingLink): Promise<BookingLink>;
  updateBookingLink(id: number, bookingLink: Partial<BookingLink>): Promise<BookingLink | undefined>;
  deleteBookingLink(id: number): Promise<boolean>;

  // Booking operations
  getBookings(bookingLinkId: number): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;

  // Settings operations
  getSettings(userId: number): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(userId: number, settings: Partial<Settings>): Promise<Settings | undefined>;

  // Subscription operations
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  getUserSubscription(userId: number): Promise<Subscription | undefined>;
  getTeamSubscription(teamId: number): Promise<Subscription | undefined>;
  getOrganizationSubscription(organizationId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: number): Promise<boolean>;

  // Payment Method operations
  getPaymentMethods(userId?: number, teamId?: number, organizationId?: number): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<boolean>;

  // Invoice operations
  getInvoices(userId?: number, teamId?: number, organizationId?: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
}

// Import storage implementations
import { PostgresStorage } from './postgresStorage';
import { MemStorage } from './memStorage';

// Determine which storage implementation to use based on environment
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';

// Export the appropriate storage implementation
export const storage = usePostgres ? new PostgresStorage() : new MemStorage();

// Log the storage mode being used
console.log(`📊 Storage mode: ${usePostgres ? 'PostgreSQL' : 'In-Memory'}`);