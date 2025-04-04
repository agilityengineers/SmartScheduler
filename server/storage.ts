import {
  User, InsertUser,
  Organization, InsertOrganization,
  Team, InsertTeam,
  CalendarIntegration, InsertCalendarIntegration,
  Event, InsertEvent,
  BookingLink, InsertBookingLink,
  Booking, InsertBooking,
  Settings, InsertSettings
} from '@shared/schema';

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
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private teams: Map<number, Team>;
  private calendarIntegrations: Map<number, CalendarIntegration>;
  private events: Map<number, Event>;
  private bookingLinks: Map<number, BookingLink>;
  private bookings: Map<number, Booking>;
  private settings: Map<number, Settings>;

  private userId: number;
  private organizationId: number;
  private teamId: number;
  private calendarIntegrationId: number;
  private eventId: number;
  private bookingLinkId: number;
  private bookingId: number;
  private settingsId: number;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.teams = new Map();
    this.calendarIntegrations = new Map();
    this.events = new Map();
    this.bookingLinks = new Map();
    this.bookings = new Map();
    this.settings = new Map();

    this.userId = 1;
    this.organizationId = 1;
    this.teamId = 1;
    this.calendarIntegrationId = 1;
    this.eventId = 1;
    this.bookingLinkId = 1;
    this.bookingId = 1;
    this.settingsId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      emailVerified: insertUser.emailVerified ?? false,
      displayName: insertUser.displayName ?? null,
      profilePicture: insertUser.profilePicture ?? null,
      avatarColor: insertUser.avatarColor ?? null,
      bio: insertUser.bio ?? null,
      timezone: insertUser.timezone ?? 'UTC',
      role: insertUser.role ?? 'user',
      organizationId: insertUser.organizationId ?? null,
      teamId: insertUser.teamId ?? null
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.role === role);
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.organizationId === organizationId
    );
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.teamId === teamId
    );
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const id = this.organizationId++;
    
    const newOrganization: Organization = {
      id,
      name: organization.name,
      description: organization.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.organizations.set(id, newOrganization);
    return newOrganization;
  }

  async updateOrganization(id: number, updateData: Partial<Organization>): Promise<Organization | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;

    const updatedOrganization = { 
      ...organization, 
      ...updateData,
      updatedAt: new Date()
    };
    
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }

  async deleteOrganization(id: number): Promise<boolean> {
    return this.organizations.delete(id);
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeams(organizationId?: number): Promise<Team[]> {
    const teams = Array.from(this.teams.values());
    if (organizationId !== undefined) {
      return teams.filter((team) => team.organizationId === organizationId);
    }
    return teams;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const id = this.teamId++;
    
    const newTeam: Team = {
      id,
      name: team.name,
      organizationId: team.organizationId,
      description: team.description ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.teams.set(id, newTeam);
    return newTeam;
  }

  async updateTeam(id: number, updateData: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;

    const updatedTeam = { 
      ...team, 
      ...updateData,
      updatedAt: new Date()
    };
    
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    return this.teams.delete(id);
  }

  // Calendar Integration operations
  async getCalendarIntegrations(userId: number): Promise<CalendarIntegration[]> {
    return Array.from(this.calendarIntegrations.values()).filter(
      (integration) => integration.userId === userId
    );
  }

  async getCalendarIntegration(id: number): Promise<CalendarIntegration | undefined> {
    return this.calendarIntegrations.get(id);
  }

  async getCalendarIntegrationByType(userId: number, type: string): Promise<CalendarIntegration | undefined> {
    return Array.from(this.calendarIntegrations.values()).find(
      (integration) => integration.userId === userId && integration.type === type
    );
  }

  async createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const id = this.calendarIntegrationId++;
    
    const newIntegration: CalendarIntegration = { 
      id,
      name: integration.name ?? null,
      type: integration.type,
      userId: integration.userId,
      accessToken: integration.accessToken ?? null,
      refreshToken: integration.refreshToken ?? null,
      expiresAt: integration.expiresAt ?? null,
      calendarId: integration.calendarId ?? null,
      lastSynced: integration.lastSynced ?? null,
      settings: integration.settings ?? {},
      status: integration.status ?? null,
      scope: integration.scope ?? null,
      error: integration.error ?? null,
      metadata: integration.metadata ?? {}
    };
    
    this.calendarIntegrations.set(id, newIntegration);
    return newIntegration;
  }

  async updateCalendarIntegration(id: number, updateData: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined> {
    const integration = this.calendarIntegrations.get(id);
    if (!integration) return undefined;

    const updatedIntegration = { ...integration, ...updateData };
    this.calendarIntegrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteCalendarIntegration(id: number): Promise<boolean> {
    return this.calendarIntegrations.delete(id);
  }

  // Event operations
  async getEvents(userId: number, startDate?: Date, endDate?: Date): Promise<Event[]> {
    const events = Array.from(this.events.values()).filter(
      (event) => event.userId === userId
    );

    if (startDate && endDate) {
      return events.filter(
        (event) => event.startTime >= startDate && event.endTime <= endDate
      );
    }

    return events;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventByExternalId(externalId: string, calendarType: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.externalId === externalId && event.calendarType === calendarType
    );
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventId++;
    
    const newEvent: Event = { 
      id,
      userId: event.userId,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone ?? null,
      description: event.description ?? null,
      location: event.location ?? null,
      meetingUrl: event.meetingUrl ?? null,
      isAllDay: event.isAllDay ?? false,
      status: event.status ?? null,
      externalId: event.externalId ?? null,
      calendarType: event.calendarType ?? null,
      visibility: event.visibility ?? null,
      recurrence: event.recurrence ?? null
    };
    
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, updateData: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;

    const updatedEvent = { ...event, ...updateData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Booking Link operations
  async getBookingLinks(userId: number): Promise<BookingLink[]> {
    return Array.from(this.bookingLinks.values()).filter(
      (link) => link.userId === userId
    );
  }

  async getBookingLink(id: number): Promise<BookingLink | undefined> {
    return this.bookingLinks.get(id);
  }

  async getBookingLinkBySlug(slug: string): Promise<BookingLink | undefined> {
    return Array.from(this.bookingLinks.values()).find(
      (link) => link.slug === slug
    );
  }

  async createBookingLink(bookingLink: InsertBookingLink): Promise<BookingLink> {
    const id = this.bookingLinkId++;
    
    const newBookingLink: BookingLink = { 
      id,
      ...bookingLink
    };
    
    this.bookingLinks.set(id, newBookingLink);
    return newBookingLink;
  }

  async updateBookingLink(id: number, updateData: Partial<BookingLink>): Promise<BookingLink | undefined> {
    const bookingLink = this.bookingLinks.get(id);
    if (!bookingLink) return undefined;

    const updatedBookingLink = { ...bookingLink, ...updateData };
    this.bookingLinks.set(id, updatedBookingLink);
    return updatedBookingLink;
  }

  async deleteBookingLink(id: number): Promise<boolean> {
    return this.bookingLinks.delete(id);
  }

  // Booking operations
  async getBookings(bookingLinkId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.bookingLinkId === bookingLinkId
    );
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.bookingId++;
    
    const newBooking: Booking = { 
      id,
      ...booking,
      createdAt: new Date(),
    };
    
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async updateBooking(id: number, updateData: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    const updatedBooking = { ...booking, ...updateData };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Settings operations
  async getSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId
    );
  }

  async createSettings(settings: InsertSettings): Promise<Settings> {
    const id = this.settingsId++;
    
    const newSettings: Settings = {
      id,
      ...settings
    };
    
    this.settings.set(id, newSettings);
    return newSettings;
  }

  async updateSettings(userId: number, updateData: Partial<Settings>): Promise<Settings | undefined> {
    const existingSettings = await this.getSettings(userId);
    
    if (!existingSettings) {
      // If no settings exist, create them
      return this.createSettings({
        userId,
        ...updateData
      });
    }
    
    // Otherwise update existing settings
    const updatedSettings = { ...existingSettings, ...updateData };
    this.settings.set(existingSettings.id, updatedSettings);
    return updatedSettings;
  }
}

// Import PostgresStorage implementation after MemStorage is defined
import { PostgresStorage } from './postgresStorage';

// Determine which storage implementation to use based on environment
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';

// Export the appropriate storage implementation
export const storage = usePostgres ? new PostgresStorage() : new MemStorage();

// Log the storage mode being used
console.log(`📊 Storage mode: ${usePostgres ? 'PostgreSQL' : 'In-Memory'}`);