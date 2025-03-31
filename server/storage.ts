import { 
  User, InsertUser, 
  Organization, InsertOrganization,
  Team, InsertTeam,
  CalendarIntegration, InsertCalendarIntegration,
  Event, InsertEvent,
  BookingLink, InsertBookingLink,
  Booking, InsertBooking,
  Settings, InsertSettings,
  UserRole
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

    // Create a default admin user for testing
    this.createUser({
      username: "admin",
      password: "adminpass",
      email: "admin@example.com",
      displayName: "Admin User",
      timezone: "America/New_York",
      role: UserRole.ADMIN
    });
    
    // Create a demo organization
    const org1 = this.createOrganization({
      name: "Acme Corporation",
      description: "A multinational technology company"
    });
    
    // Create teams for the organization
    org1.then(organization => {
      this.createTeam({
        name: "Engineering",
        description: "Software development team",
        organizationId: organization.id
      }).then(engineeringTeam => {
        // Create a company admin for the organization
        this.createUser({
          username: "companyadmin",
          password: "companypass",
          email: "companyadmin@example.com",
          displayName: "Company Admin",
          timezone: "America/New_York",
          role: UserRole.COMPANY_ADMIN,
          organizationId: organization.id
        });
        
        // Create a team manager for the engineering team
        this.createUser({
          username: "teammanager",
          password: "teampass",
          email: "teammanager@example.com",
          displayName: "Team Manager",
          timezone: "America/New_York",
          role: UserRole.TEAM_MANAGER,
          organizationId: organization.id,
          teamId: engineeringTeam.id
        });
      });
      
      this.createTeam({
        name: "Marketing",
        description: "Marketing and sales team",
        organizationId: organization.id
      });
      
      this.createTeam({
        name: "HR",
        description: "Human resources team",
        organizationId: organization.id
      });
    });
    
    // Create a second organization
    const org2 = this.createOrganization({
      name: "Globex Industries",
      description: "A global conglomerate"
    });
    
    org2.then(organization => {
      this.createTeam({
        name: "Research",
        description: "R&D department",
        organizationId: organization.id
      });
    });
    
    // Create a default user for testing
    this.createUser({
      username: "testuser",
      password: "password",
      email: "test@example.com",
      displayName: "Test User",
      timezone: "America/New_York",
      role: UserRole.USER
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      displayName: insertUser.displayName || null,
      timezone: insertUser.timezone || null,
      role: insertUser.role || UserRole.USER,
      organizationId: insertUser.organizationId || null,
      teamId: insertUser.teamId || null
    };
    this.users.set(id, user);

    // Create default settings for the user
    this.createSettings({
      userId: id,
      defaultReminders: [15],
      emailNotifications: true,
      pushNotifications: true,
      defaultCalendar: "google",
      defaultCalendarIntegrationId: null,
      defaultMeetingDuration: 30,
      showDeclinedEvents: false,
      combinedView: true,
      workingHours: {
        0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
        1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
        2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
        3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
        4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
        5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
        6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
      },
      timeFormat: "12h"
    });

    return user;
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = { ...existingUser, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.organizationId === organizationId);
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.teamId === teamId);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    // Delete any events, bookings, and settings associated with the user
    const userEvents = await this.getEvents(id);
    for (const event of userEvents) {
      await this.deleteEvent(event.id);
    }
    
    // Delete calendar integrations
    const integrations = await this.getCalendarIntegrations(id);
    for (const integration of integrations) {
      await this.deleteCalendarIntegration(integration.id);
    }
    
    // Delete booking links
    const bookingLinks = await this.getBookingLinks(id);
    for (const link of bookingLinks) {
      await this.deleteBookingLink(link.id);
    }
    
    // Delete settings
    const settings = await this.getSettings(id);
    if (settings) {
      this.settings.delete(settings.id);
    }
    
    // Finally delete the user
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
      ...organization,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: organization.description || null
    };
    this.organizations.set(id, newOrganization);
    return newOrganization;
  }

  async updateOrganization(id: number, updateData: Partial<Organization>): Promise<Organization | undefined> {
    const existingOrganization = this.organizations.get(id);
    if (!existingOrganization) return undefined;

    const updatedOrganization = { 
      ...existingOrganization, 
      ...updateData,
      updatedAt: new Date()
    };
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }

  async deleteOrganization(id: number): Promise<boolean> {
    // First find all teams in this organization
    const orgTeams = await this.getTeams(id);
    
    // Delete each team
    for (const team of orgTeams) {
      await this.deleteTeam(team.id);
    }
    
    // Find all users in this organization and update them
    const orgUsers = await this.getUsersByOrganization(id);
    for (const user of orgUsers) {
      await this.updateUser(user.id, { organizationId: null, teamId: null });
    }
    
    return this.organizations.delete(id);
  }
  
  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeams(organizationId?: number): Promise<Team[]> {
    const teams = Array.from(this.teams.values());
    if (organizationId) {
      return teams.filter(team => team.organizationId === organizationId);
    }
    return teams;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const id = this.teamId++;
    const newTeam: Team = {
      ...team,
      id,
      description: team.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.teams.set(id, newTeam);
    return newTeam;
  }

  async updateTeam(id: number, updateData: Partial<Team>): Promise<Team | undefined> {
    const existingTeam = this.teams.get(id);
    if (!existingTeam) return undefined;

    const updatedTeam = { 
      ...existingTeam, 
      ...updateData,
      updatedAt: new Date()
    };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    // Find all users in this team and update them
    const teamUsers = await this.getUsersByTeam(id);
    for (const user of teamUsers) {
      await this.updateUser(user.id, { teamId: null });
    }
    
    return this.teams.delete(id);
  }

  // Calendar Integration operations
  async getCalendarIntegrations(userId: number): Promise<CalendarIntegration[]> {
    return Array.from(this.calendarIntegrations.values()).filter(
      (integration) => integration.userId === userId,
    );
  }

  async getCalendarIntegration(id: number): Promise<CalendarIntegration | undefined> {
    return this.calendarIntegrations.get(id);
  }

  async getCalendarIntegrationByType(userId: number, type: string): Promise<CalendarIntegration | undefined> {
    return Array.from(this.calendarIntegrations.values()).find(
      (integration) => integration.userId === userId && integration.type === type,
    );
  }

  async createCalendarIntegration(integration: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const id = this.calendarIntegrationId++;
    const newIntegration: CalendarIntegration = { 
      ...integration, 
      id,
      name: integration.name || null,
      accessToken: integration.accessToken || null,
      refreshToken: integration.refreshToken || null,
      expiresAt: integration.expiresAt || null,
      calendarId: integration.calendarId || null,
      lastSynced: integration.lastSynced || null,
      isConnected: integration.isConnected || false,
      isPrimary: integration.isPrimary || false
    };
    this.calendarIntegrations.set(id, newIntegration);
    return newIntegration;
  }

  async updateCalendarIntegration(id: number, updateData: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined> {
    const existingIntegration = this.calendarIntegrations.get(id);
    if (!existingIntegration) return undefined;

    const updatedIntegration = { ...existingIntegration, ...updateData };
    this.calendarIntegrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteCalendarIntegration(id: number): Promise<boolean> {
    return this.calendarIntegrations.delete(id);
  }

  // Event operations
  async getEvents(userId: number, startDate?: Date, endDate?: Date): Promise<Event[]> {
    let events = Array.from(this.events.values()).filter(
      (event) => event.userId === userId,
    );

    if (startDate) {
      events = events.filter((event) => new Date(event.startTime) >= startDate);
    }

    if (endDate) {
      events = events.filter((event) => new Date(event.startTime) <= endDate);
    }

    return events;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventByExternalId(externalId: string, calendarType: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.externalId === externalId && event.calendarType === calendarType,
    );
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventId++;
    const newEvent: Event = { 
      ...event, 
      id,
      description: event.description || null,
      location: event.location || null,
      meetingUrl: event.meetingUrl || null,
      isAllDay: event.isAllDay || false,
      externalId: event.externalId || null,
      calendarType: event.calendarType || null,
      calendarIntegrationId: event.calendarIntegrationId || null,
      attendees: event.attendees || [],
      reminders: event.reminders || [],
      timezone: event.timezone || null,
      recurrence: event.recurrence || null
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, updateData: Partial<Event>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return undefined;

    const updatedEvent = { ...existingEvent, ...updateData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Booking Link operations
  async getBookingLinks(userId: number): Promise<BookingLink[]> {
    return Array.from(this.bookingLinks.values()).filter(
      (link) => link.userId === userId,
    );
  }

  async getBookingLink(id: number): Promise<BookingLink | undefined> {
    return this.bookingLinks.get(id);
  }

  async getBookingLinkBySlug(slug: string): Promise<BookingLink | undefined> {
    return Array.from(this.bookingLinks.values()).find(
      (link) => link.slug === slug,
    );
  }

  async createBookingLink(bookingLink: InsertBookingLink): Promise<BookingLink> {
    const id = this.bookingLinkId++;
    const newBookingLink: BookingLink = { 
      ...bookingLink, 
      id,
      description: bookingLink.description || null,
      availabilityWindow: bookingLink.availabilityWindow || 30,
      isActive: bookingLink.isActive ?? true,
      notifyOnBooking: bookingLink.notifyOnBooking ?? true,
      availableDays: bookingLink.availableDays || ["1", "2", "3", "4", "5"],
      availableHours: bookingLink.availableHours || { start: "09:00", end: "17:00" },
      bufferBefore: bookingLink.bufferBefore || 0,
      bufferAfter: bookingLink.bufferAfter || 0,
      maxBookingsPerDay: bookingLink.maxBookingsPerDay || 0,
      leadTime: bookingLink.leadTime || 60
    };
    this.bookingLinks.set(id, newBookingLink);
    return newBookingLink;
  }

  async updateBookingLink(id: number, updateData: Partial<BookingLink>): Promise<BookingLink | undefined> {
    const existingLink = this.bookingLinks.get(id);
    if (!existingLink) return undefined;

    const updatedLink = { ...existingLink, ...updateData };
    this.bookingLinks.set(id, updatedLink);
    return updatedLink;
  }

  async deleteBookingLink(id: number): Promise<boolean> {
    return this.bookingLinks.delete(id);
  }

  // Booking operations
  async getBookings(bookingLinkId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.bookingLinkId === bookingLinkId,
    );
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.bookingId++;
    const newBooking: Booking = { 
      ...booking, 
      id, 
      status: booking.status || "confirmed",
      notes: booking.notes || null,
      eventId: booking.eventId || null,
      createdAt: new Date() 
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async updateBooking(id: number, updateData: Partial<Booking>): Promise<Booking | undefined> {
    const existingBooking = this.bookings.get(id);
    if (!existingBooking) return undefined;

    const updatedBooking = { ...existingBooking, ...updateData };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Settings operations
  async getSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId,
    );
  }

  async createSettings(settings: InsertSettings): Promise<Settings> {
    const id = this.settingsId++;
    // Make a copy of settings to avoid modifying the input
    let settingsCopy = { ...settings };
    
    // Create the settings object with properly typed fields
    const newSettings = { 
      id,
      userId: settingsCopy.userId,
      defaultReminders: settingsCopy.defaultReminders ?? [15] as any, // Explicit cast to resolve type issue
      emailNotifications: settingsCopy.emailNotifications ?? true,
      pushNotifications: settingsCopy.pushNotifications ?? true,
      defaultCalendar: settingsCopy.defaultCalendar || "google",
      defaultCalendarIntegrationId: settingsCopy.defaultCalendarIntegrationId || null,
      defaultMeetingDuration: settingsCopy.defaultMeetingDuration || 30,
      showDeclinedEvents: settingsCopy.showDeclinedEvents ?? false,
      combinedView: settingsCopy.combinedView ?? true,
      workingHours: settingsCopy.workingHours || {
        0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
        1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
        2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
        3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
        4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
        5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
        6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
      },
      timeFormat: settingsCopy.timeFormat || "12h"
    } as Settings;
    this.settings.set(id, newSettings);
    return newSettings;
  }

  async updateSettings(userId: number, updateData: Partial<Settings>): Promise<Settings | undefined> {
    const existingSettings = Array.from(this.settings.values()).find(
      (setting) => setting.userId === userId,
    );

    if (!existingSettings) return undefined;

    const updatedSettings = { ...existingSettings, ...updateData };
    this.settings.set(existingSettings.id, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();
