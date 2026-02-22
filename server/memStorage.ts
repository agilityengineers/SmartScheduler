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
  AppointmentSource, AppointmentType, AppointmentStatus, HostRole
} from '@shared/schema';
import { IStorage } from './storage';

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private teams: Map<number, Team>;
  private calendarIntegrations: Map<number, CalendarIntegration>;
  private events: Map<number, Event>;
  private bookingLinks: Map<number, BookingLink>;
  private bookings: Map<number, Booking>;
  private settings: Map<number, Settings>;
  private subscriptions: Map<number, Subscription>;
  private paymentMethods: Map<number, PaymentMethod>;
  private invoices: Map<number, Invoice>;
  private workflows: Map<number, Workflow>;
  private workflowSteps: Map<number, WorkflowStep>;
  private workflowExecutions: Map<number, WorkflowExecution>;
  private workflowStepExecutions: Map<number, WorkflowStepExecution>;
  private appointments: Map<number, Appointment>;
  private webhookIntegrations: Map<number, WebhookIntegration>;
  private webhookLogs: Map<number, WebhookLog>;
  private availabilitySchedules: Map<number, AvailabilitySchedule>;
  private customQuestions: Map<number, CustomQuestion>;
  private dateOverrides: Map<number, DateOverride>;
  private meetingPollsMap: Map<number, MeetingPoll>;
  private meetingPollOptionsMap: Map<number, MeetingPollOption>;
  private meetingPollVotesMap: Map<number, MeetingPollVote>;
  private slackIntegrationsMap: Map<number, SlackIntegration>;
  private auditLogsMap: Map<number, AuditLog>;
  private domainControlsMap: Map<number, DomainControl>;
  private dataRetentionPoliciesMap: Map<number, DataRetentionPolicy>;
  private scimConfigsMap: Map<number, ScimConfig>;
  private routingFormsMap: Map<number, RoutingForm>;
  private routingFormQuestionsMap: Map<number, RoutingFormQuestion>;
  private routingFormRulesMap: Map<number, RoutingFormRule>;
  private routingFormSubmissionsMap: Map<number, RoutingFormSubmission>;
  private autoLoginTokensMap: Map<number, AutoLoginToken>;

  private userId: number;
  private organizationId: number;
  private teamId: number;
  private calendarIntegrationId: number;
  private eventId: number;
  private bookingLinkId: number;
  private bookingId: number;
  private settingsId: number;
  private subscriptionId: number;
  private paymentMethodId: number;
  private invoiceId: number;
  private workflowId: number;
  private workflowStepId: number;
  private workflowExecutionId: number;
  private workflowStepExecutionId: number;
  private appointmentId: number;
  private webhookIntegrationId: number;
  private webhookLogId: number;
  private availabilityScheduleId: number;
  private customQuestionId: number;
  private dateOverrideId: number;
  private meetingPollId: number;
  private meetingPollOptionId: number;
  private meetingPollVoteId: number;
  private slackIntegrationId: number;
  private auditLogId: number;
  private domainControlId: number;
  private dataRetentionPolicyId: number;
  private scimConfigId: number;
  private routingFormId: number;
  private routingFormQuestionId: number;
  private routingFormRuleId: number;
  private routingFormSubmissionId: number;
  private autoLoginTokenId: number;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.teams = new Map();
    this.calendarIntegrations = new Map();
    this.events = new Map();
    this.bookingLinks = new Map();
    this.bookings = new Map();
    this.settings = new Map();
    this.subscriptions = new Map();
    this.paymentMethods = new Map();
    this.invoices = new Map();
    this.workflows = new Map();
    this.workflowSteps = new Map();
    this.workflowExecutions = new Map();
    this.workflowStepExecutions = new Map();
    this.appointments = new Map();
    this.webhookIntegrations = new Map();
    this.webhookLogs = new Map();
    this.availabilitySchedules = new Map();
    this.customQuestions = new Map();
    this.dateOverrides = new Map();
    this.meetingPollsMap = new Map();
    this.meetingPollOptionsMap = new Map();
    this.meetingPollVotesMap = new Map();
    this.slackIntegrationsMap = new Map();
    this.auditLogsMap = new Map();
    this.domainControlsMap = new Map();
    this.dataRetentionPoliciesMap = new Map();
    this.scimConfigsMap = new Map();
    this.routingFormsMap = new Map();
    this.routingFormQuestionsMap = new Map();
    this.routingFormRulesMap = new Map();
    this.routingFormSubmissionsMap = new Map();
    this.autoLoginTokensMap = new Map();

    this.userId = 1;
    this.organizationId = 1;
    this.teamId = 1;
    this.calendarIntegrationId = 1;
    this.eventId = 1;
    this.bookingLinkId = 1;
    this.bookingId = 1;
    this.settingsId = 1;
    this.subscriptionId = 1;
    this.paymentMethodId = 1;
    this.invoiceId = 1;
    this.workflowId = 1;
    this.workflowStepId = 1;
    this.workflowExecutionId = 1;
    this.workflowStepExecutionId = 1;
    this.appointmentId = 1;
    this.webhookIntegrationId = 1;
    this.webhookLogId = 1;
    this.availabilityScheduleId = 1;
    this.customQuestionId = 1;
    this.dateOverrideId = 1;
    this.meetingPollId = 1;
    this.meetingPollOptionId = 1;
    this.meetingPollVoteId = 1;
    this.slackIntegrationId = 1;
    this.auditLogId = 1;
    this.domainControlId = 1;
    this.dataRetentionPolicyId = 1;
    this.scimConfigId = 1;
    this.routingFormId = 1;
    this.routingFormQuestionId = 1;
    this.routingFormRuleId = 1;
    this.routingFormSubmissionId = 1;
    this.autoLoginTokenId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
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
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      displayName: insertUser.displayName ?? null,
      profilePicture: insertUser.profilePicture ?? null,
      avatarColor: insertUser.avatarColor ?? null,
      bio: insertUser.bio ?? null,
      timezone: insertUser.timezone ?? 'UTC',
      role: insertUser.role ?? 'user',
      organizationId: insertUser.organizationId ?? null,
      teamId: insertUser.teamId ?? null,
      stripeCustomerId: insertUser.stripeCustomerId ?? null,
      hasFreeAccess: insertUser.hasFreeAccess ?? false,
      trialEndsAt: insertUser.trialEndsAt ?? null
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
  
  // Company operations (uses the organizations Map which stores Company data)
  async getCompany(id: number): Promise<Company | undefined> {
    return this.organizations.get(id);
  }

  async getCompanies(): Promise<Company[]> {
    return Array.from(this.organizations.values());
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = this.organizationId++;

    const newCompany: Company = {
      id,
      name: company.name,
      description: company.description ?? null,
      stripeCustomerId: company.stripeCustomerId ?? null,
      trialEndsAt: company.trialEndsAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.organizations.set(id, newCompany);
    return newCompany;
  }

  async updateCompany(id: number, updateData: Partial<Company>): Promise<Company | undefined> {
    const company = this.organizations.get(id);
    if (!company) return undefined;

    const updatedCompany = {
      ...company,
      ...updateData,
      updatedAt: new Date()
    };

    this.organizations.set(id, updatedCompany);
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<boolean> {
    return this.organizations.delete(id);
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.organizationId === companyId
    );
  }

  async getTeamsByCompany(companyId: number): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(
      (team) => team.organizationId === companyId
    );
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
      stripeCustomerId: team.stripeCustomerId ?? null,
      trialEndsAt: team.trialEndsAt ?? null,
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
      isConnected: integration.isConnected ?? false,
      isPrimary: integration.isPrimary ?? false,
      webhookUrl: integration.webhookUrl ?? null,
      apiKey: integration.apiKey ?? null,
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
    // First delete all events associated with this calendar integration
    await this.deleteEventsByCalendarIntegration(id);
    
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

  // Batch loading method to fix N+1 query problem
  async getEventsByUserIds(userIds: number[], startDate?: Date, endDate?: Date): Promise<Event[]> {
    if (userIds.length === 0) {
      return [];
    }

    const userIdSet = new Set(userIds);
    const events = Array.from(this.events.values()).filter(
      (event) => userIdSet.has(event.userId)
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
      description: event.description ?? null,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location ?? null,
      meetingUrl: event.meetingUrl ?? null,
      isAllDay: event.isAllDay ?? false,
      externalId: event.externalId ?? null,
      calendarType: event.calendarType ?? null,
      calendarIntegrationId: event.calendarIntegrationId ?? null,
      attendees: event.attendees ?? [],
      reminders: event.reminders ?? [],
      timezone: event.timezone ?? null,
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

  async deleteEventsByCalendarIntegration(calendarIntegrationId: number): Promise<number> {
    let count = 0;
    for (const [id, event] of Array.from(this.events)) {
      if (event.calendarIntegrationId === calendarIntegrationId) {
        this.events.delete(id);
        count++;
      }
    }
    return count;
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
      userId: bookingLink.userId,
      title: bookingLink.title,
      slug: bookingLink.slug,
      duration: bookingLink.duration,
      teamId: bookingLink.teamId ?? null,
      description: bookingLink.description ?? null,
      isTeamBooking: bookingLink.isTeamBooking ?? false,
      teamMemberIds: bookingLink.teamMemberIds ?? [],
      assignmentMethod: bookingLink.assignmentMethod ?? null,
      availability: bookingLink.availability ?? {
        window: 30,
        days: ["1", "2", "3", "4", "5"],
        hours: { start: "09:00", end: "17:00" }
      },
      meetingType: bookingLink.meetingType ?? 'in-person',
      location: bookingLink.location ?? null,
      meetingUrl: bookingLink.meetingUrl ?? null,
      bufferBefore: bookingLink.bufferBefore ?? 0,
      bufferAfter: bookingLink.bufferAfter ?? 0,
      maxBookingsPerDay: bookingLink.maxBookingsPerDay ?? 0,
      leadTime: bookingLink.leadTime ?? 60,
      startTimeIncrement: bookingLink.startTimeIncrement ?? 30,
      isHidden: bookingLink.isHidden ?? false,
      availabilityScheduleId: bookingLink.availabilityScheduleId ?? null,
      brandLogo: bookingLink.brandLogo ?? null,
      brandColor: bookingLink.brandColor ?? null,
      removeBranding: bookingLink.removeBranding ?? false,
      redirectUrl: bookingLink.redirectUrl ?? null,
      confirmationMessage: bookingLink.confirmationMessage ?? null,
      confirmationCta: bookingLink.confirmationCta ?? null,
      isOneOff: bookingLink.isOneOff ?? false,
      isExpired: bookingLink.isExpired ?? false,
      requirePayment: bookingLink.requirePayment ?? false,
      price: bookingLink.price ?? null,
      currency: bookingLink.currency ?? 'usd',
      autoCreateMeetLink: bookingLink.autoCreateMeetLink ?? false,
      teamMemberWeights: bookingLink.teamMemberWeights ?? {},
      maxBookingsPerWeek: bookingLink.maxBookingsPerWeek ?? 0,
      maxBookingsPerMonth: bookingLink.maxBookingsPerMonth ?? 0,
      isCollective: bookingLink.isCollective ?? false,
      collectiveMemberIds: bookingLink.collectiveMemberIds ?? [],
      rotatingMemberIds: bookingLink.rotatingMemberIds ?? [],
      isManagedTemplate: bookingLink.isManagedTemplate ?? false,
      managedTemplateId: bookingLink.managedTemplateId ?? null,
      lockedFields: bookingLink.lockedFields ?? [],
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
      email: booking.email,
      name: booking.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      bookingLinkId: booking.bookingLinkId,
      status: booking.status ?? 'pending',
      notes: booking.notes ?? null,
      eventId: booking.eventId ?? null,
      assignedUserId: booking.assignedUserId ?? null,
      customAnswers: booking.customAnswers ?? [],
      noShowMarkedAt: booking.noShowMarkedAt ?? null,
      noShowMarkedBy: booking.noShowMarkedBy ?? null,
      reconfirmationSentAt: booking.reconfirmationSentAt ?? null,
      reconfirmationStatus: booking.reconfirmationStatus ?? null,
      reconfirmationToken: booking.reconfirmationToken ?? null,
      collectiveAttendeeIds: booking.collectiveAttendeeIds ?? [],
      paymentStatus: booking.paymentStatus ?? null,
      paymentIntentId: booking.paymentIntentId ?? null,
      paymentAmount: booking.paymentAmount ?? null,
      paymentCurrency: booking.paymentCurrency ?? null,
      meetingUrl: booking.meetingUrl ?? null,
      createdAt: new Date()
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

  async getUserBookings(userId: number): Promise<Booking[]> {
    // Get all booking links for this user
    const userBookingLinks = Array.from(this.bookingLinks.values()).filter(
      (link) => link.userId === userId
    );
    const bookingLinkIds = userBookingLinks.map(link => link.id);

    // Get all bookings for these booking links
    return Array.from(this.bookings.values()).filter(
      (booking) => bookingLinkIds.includes(booking.bookingLinkId)
    );
  }

  async getBookingsByEmail(email: string, userId: number): Promise<Booking[]> {
    // Get all booking links for this user
    const userBookingLinks = Array.from(this.bookingLinks.values()).filter(
      (link) => link.userId === userId
    );
    const bookingLinkIds = userBookingLinks.map(link => link.id);

    // Get all bookings for these booking links with matching email
    return Array.from(this.bookings.values()).filter(
      (booking) => bookingLinkIds.includes(booking.bookingLinkId) && booking.email === email
    );
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
      userId: settings.userId,
      metadata: (settings as any).metadata ?? null,
      defaultReminders: settings.defaultReminders ?? [15],
      emailNotifications: settings.emailNotifications ?? true,
      pushNotifications: settings.pushNotifications ?? true,
      defaultCalendar: settings.defaultCalendar ?? null,
      defaultCalendarIntegrationId: settings.defaultCalendarIntegrationId ?? null,
      defaultMeetingDuration: settings.defaultMeetingDuration ?? 30,
      showDeclinedEvents: settings.showDeclinedEvents ?? false,
      combinedView: settings.combinedView ?? true,
      preferredTimezone: settings.preferredTimezone ?? 'UTC',
      workingHours: settings.workingHours ?? {
        0: { enabled: false, start: "09:00", end: "17:00" }, // Sunday
        1: { enabled: true, start: "09:00", end: "17:00" },  // Monday
        2: { enabled: true, start: "09:00", end: "17:00" },  // Tuesday
        3: { enabled: true, start: "09:00", end: "17:00" },  // Wednesday
        4: { enabled: true, start: "09:00", end: "17:00" },  // Thursday
        5: { enabled: true, start: "09:00", end: "17:00" },  // Friday
        6: { enabled: false, start: "09:00", end: "17:00" }  // Saturday
      },
      timeFormat: settings.timeFormat ?? '12h',
      timeBlocks: settings.timeBlocks ?? []
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
      } as InsertSettings);
    }
    
    // Otherwise update existing settings
    const updatedSettings = { ...existingSettings, ...updateData };
    this.settings.set(existingSettings.id, updatedSettings);
    return updatedSettings;
  }

  // Subscription operations
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.stripeSubscriptionId === stripeSubscriptionId
    );
  }

  async getUserSubscription(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.userId === userId
    );
  }

  async getTeamSubscription(teamId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.teamId === teamId
    );
  }

  async getOrganizationSubscription(organizationId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.organizationId === organizationId
    );
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionId++;
    
    const newSubscription: Subscription = {
      id,
      stripeCustomerId: subscription.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
      plan: subscription.plan ?? 'free',
      status: subscription.status ?? 'trialing',
      priceId: subscription.priceId ?? null,
      quantity: subscription.quantity ?? 1,
      trialEndsAt: subscription.trialEndsAt ?? null,
      startsAt: subscription.startsAt ?? null,
      currentPeriodStart: subscription.currentPeriodStart ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
      endedAt: subscription.endedAt ?? null,
      canceledAt: subscription.canceledAt ?? null,
      userId: subscription.userId ?? null,
      teamId: subscription.teamId ?? null,
      organizationId: subscription.organizationId ?? null,
      metadata: subscription.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.subscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateSubscription(id: number, updateData: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;

    const updatedSubscription = { 
      ...subscription, 
      ...updateData,
      updatedAt: new Date()
    };
    
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async deleteSubscription(id: number): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  // Payment Method operations
  async getPaymentMethods(userId?: number, teamId?: number, organizationId?: number): Promise<PaymentMethod[]> {
    return Array.from(this.paymentMethods.values()).filter(
      (paymentMethod) => 
        (userId && paymentMethod.userId === userId) ||
        (teamId && paymentMethod.teamId === teamId) ||
        (organizationId && paymentMethod.organizationId === organizationId)
    );
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    return this.paymentMethods.get(id);
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const id = this.paymentMethodId++;
    
    const newPaymentMethod: PaymentMethod = {
      id,
      stripeCustomerId: paymentMethod.stripeCustomerId,
      stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
      type: paymentMethod.type,
      last4: paymentMethod.last4 ?? null,
      expiryMonth: paymentMethod.expiryMonth ?? null,
      expiryYear: paymentMethod.expiryYear ?? null,
      brand: paymentMethod.brand ?? null,
      isDefault: paymentMethod.isDefault ?? false,
      userId: paymentMethod.userId ?? null,
      teamId: paymentMethod.teamId ?? null,
      organizationId: paymentMethod.organizationId ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.paymentMethods.set(id, newPaymentMethod);
    return newPaymentMethod;
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    return this.paymentMethods.delete(id);
  }

  // Invoice operations
  async getInvoices(userId?: number, teamId?: number, organizationId?: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => 
        (userId && invoice.userId === userId) ||
        (teamId && invoice.teamId === teamId) ||
        (organizationId && invoice.organizationId === organizationId)
    );
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceId++;
    
    const newInvoice: Invoice = {
      id,
      stripeInvoiceId: invoice.stripeInvoiceId,
      stripeCustomerId: invoice.stripeCustomerId,
      subscriptionId: invoice.subscriptionId ?? null,
      amountDue: invoice.amountDue,
      amountPaid: invoice.amountPaid ?? null,
      amountRemaining: invoice.amountRemaining ?? null,
      currency: invoice.currency ?? 'usd',
      status: invoice.status,
      invoiceNumber: invoice.invoiceNumber ?? null,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate ?? null,
      userId: invoice.userId ?? null,
      teamId: invoice.teamId ?? null,
      organizationId: invoice.organizationId ?? null,
      pdfUrl: invoice.pdfUrl ?? null,
      hostedInvoiceUrl: invoice.hostedInvoiceUrl ?? null,
      metadata: invoice.metadata ?? null,
      createdAt: new Date()
    };
    
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: number, updateData: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const updatedInvoice = { ...invoice, ...updateData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  // Workflow operations
  async getWorkflows(userId: number): Promise<Workflow[]> {
    return Array.from(this.workflows.values()).filter(w => w.userId === userId);
  }

  async getWorkflow(id: number): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  async getWorkflowsByTrigger(userId: number, triggerType: string): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .filter(w => w.userId === userId && w.triggerType === triggerType && w.isEnabled);
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const id = this.workflowId++;
    const newWorkflow: Workflow = {
      id,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description ?? null,
      triggerType: workflow.triggerType,
      triggerConfig: workflow.triggerConfig ?? {},
      isEnabled: workflow.isEnabled ?? true,
      isTemplate: workflow.isTemplate ?? false,
      templateId: workflow.templateId ?? null,
      version: workflow.version ?? 1,
      isManagedTemplate: workflow.isManagedTemplate ?? false,
      managedTemplateId: workflow.managedTemplateId ?? null,
      lockedFields: workflow.lockedFields ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workflows.set(id, newWorkflow);
    return newWorkflow;
  }

  async updateWorkflow(id: number, updateData: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;
    const updatedWorkflow = { ...workflow, ...updateData, updatedAt: new Date() };
    this.workflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }

  async deleteWorkflow(id: number): Promise<boolean> {
    // Delete related steps first
    for (const [stepId, step] of Array.from(this.workflowSteps)) {
      if (step.workflowId === id) {
        this.workflowSteps.delete(stepId);
      }
    }
    return this.workflows.delete(id);
  }

  // Workflow step operations
  async getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]> {
    return Array.from(this.workflowSteps.values())
      .filter(s => s.workflowId === workflowId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getWorkflowStep(id: number): Promise<WorkflowStep | undefined> {
    return this.workflowSteps.get(id);
  }

  async createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep> {
    const id = this.workflowStepId++;
    const newStep: WorkflowStep = {
      id,
      workflowId: step.workflowId,
      actionType: step.actionType,
      actionConfig: step.actionConfig ?? {},
      orderIndex: step.orderIndex,
      parentStepId: step.parentStepId ?? null,
      branchCondition: step.branchCondition ?? null,
      conditionConfig: step.conditionConfig ?? null,
      delayMinutes: step.delayMinutes ?? 0,
      createdAt: new Date(),
    };
    this.workflowSteps.set(id, newStep);
    return newStep;
  }

  async updateWorkflowStep(id: number, updateData: Partial<WorkflowStep>): Promise<WorkflowStep | undefined> {
    const step = this.workflowSteps.get(id);
    if (!step) return undefined;
    const updatedStep = { ...step, ...updateData };
    this.workflowSteps.set(id, updatedStep);
    return updatedStep;
  }

  async deleteWorkflowStep(id: number): Promise<boolean> {
    return this.workflowSteps.delete(id);
  }

  async deleteWorkflowSteps(workflowId: number): Promise<boolean> {
    for (const [id, step] of Array.from(this.workflowSteps)) {
      if (step.workflowId === workflowId) {
        this.workflowSteps.delete(id);
      }
    }
    return true;
  }

  // Workflow execution operations
  async getWorkflowExecutions(workflowId: number, limit: number = 50): Promise<WorkflowExecution[]> {
    return Array.from(this.workflowExecutions.values())
      .filter(e => e.workflowId === workflowId)
      .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))
      .slice(0, limit);
  }

  async getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined> {
    return this.workflowExecutions.get(id);
  }

  async createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const id = this.workflowExecutionId++;
    const newExecution: WorkflowExecution = {
      id,
      workflowId: execution.workflowId,
      triggerData: execution.triggerData ?? {},
      status: execution.status ?? 'pending',
      startedAt: execution.startedAt ?? new Date(),
      completedAt: execution.completedAt ?? null,
      errorMessage: execution.errorMessage ?? null,
      stepsCompleted: execution.stepsCompleted ?? 0,
      totalSteps: execution.totalSteps ?? 0,
      metadata: execution.metadata ?? {},
    };
    this.workflowExecutions.set(id, newExecution);
    return newExecution;
  }

  async updateWorkflowExecution(id: number, updateData: Partial<WorkflowExecution>): Promise<WorkflowExecution | undefined> {
    const execution = this.workflowExecutions.get(id);
    if (!execution) return undefined;
    const updatedExecution = { ...execution, ...updateData };
    this.workflowExecutions.set(id, updatedExecution);
    return updatedExecution;
  }

  async getWorkflowAnalytics(userId: number): Promise<{ total: number; successful: number; failed: number; pending: number }> {
    const userWorkflows = Array.from(this.workflows.values()).filter(w => w.userId === userId);
    const workflowIds = new Set(userWorkflows.map(w => w.id));
    const executions = Array.from(this.workflowExecutions.values())
      .filter(e => workflowIds.has(e.workflowId));
    
    return {
      total: executions.length,
      successful: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      pending: executions.filter(e => e.status === 'pending' || e.status === 'running').length,
    };
  }

  // Workflow step execution operations
  async getWorkflowStepExecutions(executionId: number): Promise<WorkflowStepExecution[]> {
    return Array.from(this.workflowStepExecutions.values())
      .filter(e => e.executionId === executionId);
  }

  async createWorkflowStepExecution(stepExecution: InsertWorkflowStepExecution): Promise<WorkflowStepExecution> {
    const id = this.workflowStepExecutionId++;
    const newStepExecution: WorkflowStepExecution = {
      id,
      executionId: stepExecution.executionId,
      stepId: stepExecution.stepId,
      status: stepExecution.status ?? 'pending',
      startedAt: stepExecution.startedAt ?? null,
      completedAt: stepExecution.completedAt ?? null,
      output: stepExecution.output ?? {},
      errorMessage: stepExecution.errorMessage ?? null,
    };
    this.workflowStepExecutions.set(id, newStepExecution);
    return newStepExecution;
  }

  async updateWorkflowStepExecution(id: number, updateData: Partial<WorkflowStepExecution>): Promise<WorkflowStepExecution | undefined> {
    const stepExecution = this.workflowStepExecutions.get(id);
    if (!stepExecution) return undefined;
    const updatedStepExecution = { ...stepExecution, ...updateData };
    this.workflowStepExecutions.set(id, updatedStepExecution);
    return updatedStepExecution;
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
    let result = Array.from(this.appointments.values());
    
    if (filters?.userId) {
      result = result.filter(a => a.hostUserId === filters.userId);
    }
    if (filters?.organizationId) {
      result = result.filter(a => a.organizationId === filters.organizationId);
    }
    if (filters?.source) {
      result = result.filter(a => a.source === filters.source);
    }
    if (filters?.type) {
      result = result.filter(a => a.type === filters.type);
    }
    if (filters?.status) {
      result = result.filter(a => a.status === filters.status);
    }
    if (filters?.startDate) {
      result = result.filter(a => a.scheduledAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter(a => a.scheduledAt <= filters.endDate!);
    }

    return result.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentByExternalId(externalId: string): Promise<Appointment | undefined> {
    return Array.from(this.appointments.values()).find(a => a.externalId === externalId);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentId++;
    const newAppointment: Appointment = {
      id,
      externalId: appointment.externalId ?? null,
      source: appointment.source ?? AppointmentSource.INTERNAL,
      type: appointment.type ?? AppointmentType.INITIAL_CONSULTATION,
      status: appointment.status ?? AppointmentStatus.SCHEDULED,
      scheduledAt: appointment.scheduledAt,
      duration: appointment.duration ?? 30,
      timezone: appointment.timezone ?? 'UTC',
      clientExternalId: appointment.clientExternalId ?? null,
      clientEmail: appointment.clientEmail,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone ?? null,
      hostUserId: appointment.hostUserId ?? null,
      hostExternalId: appointment.hostExternalId ?? null,
      hostEmail: appointment.hostEmail ?? null,
      hostName: appointment.hostName ?? null,
      hostRole: appointment.hostRole ?? HostRole.ADVISOR,
      location: appointment.location ?? null,
      meetingUrl: appointment.meetingUrl ?? null,
      notes: appointment.notes ?? null,
      metadata: appointment.metadata ?? {},
      organizationId: appointment.organizationId ?? null,
      teamId: appointment.teamId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      cancelledAt: null,
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: number, updateData: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    const updatedAppointment = { ...appointment, ...updateData, updatedAt: new Date() };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }

  // Webhook integration operations
  async getWebhookIntegrations(userId: number): Promise<WebhookIntegration[]> {
    return Array.from(this.webhookIntegrations.values()).filter(w => w.userId === userId);
  }

  async getWebhookIntegration(id: number): Promise<WebhookIntegration | undefined> {
    return this.webhookIntegrations.get(id);
  }

  async getWebhookIntegrationBySource(source: string, organizationId?: number): Promise<WebhookIntegration | undefined> {
    return Array.from(this.webhookIntegrations.values()).find(w => 
      w.source === source && 
      w.isActive && 
      (organizationId ? w.organizationId === organizationId : true)
    );
  }

  async createWebhookIntegration(integration: InsertWebhookIntegration): Promise<WebhookIntegration> {
    const id = this.webhookIntegrationId++;
    const newIntegration: WebhookIntegration = {
      id,
      userId: integration.userId,
      organizationId: integration.organizationId ?? null,
      name: integration.name,
      source: integration.source,
      webhookSecret: integration.webhookSecret,
      isActive: integration.isActive ?? true,
      apiKey: integration.apiKey ?? null,
      apiEndpoint: integration.apiEndpoint ?? null,
      callbackUrl: integration.callbackUrl ?? null,
      callbackSecret: integration.callbackSecret ?? null,
      metadata: integration.metadata ?? {},
      lastWebhookAt: null,
      webhookCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.webhookIntegrations.set(id, newIntegration);
    return newIntegration;
  }

  async updateWebhookIntegration(id: number, updateData: Partial<WebhookIntegration>): Promise<WebhookIntegration | undefined> {
    const integration = this.webhookIntegrations.get(id);
    if (!integration) return undefined;
    const updatedIntegration = { ...integration, ...updateData, updatedAt: new Date() };
    this.webhookIntegrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteWebhookIntegration(id: number): Promise<boolean> {
    return this.webhookIntegrations.delete(id);
  }

  // Webhook log operations
  async getWebhookLogs(integrationId: number, limit: number = 100): Promise<WebhookLog[]> {
    return Array.from(this.webhookLogs.values())
      .filter(l => l.integrationId === integrationId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, limit);
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const id = this.webhookLogId++;
    const newLog: WebhookLog = {
      id,
      integrationId: log.integrationId,
      eventType: log.eventType,
      payload: log.payload ?? {},
      signature: log.signature ?? null,
      signatureValid: log.signatureValid ?? false,
      processed: log.processed ?? false,
      processingError: log.processingError ?? null,
      appointmentId: log.appointmentId ?? null,
      createdAt: new Date(),
    };
    this.webhookLogs.set(id, newLog);
    return newLog;
  }

  async updateWebhookLog(id: number, updateData: Partial<WebhookLog>): Promise<WebhookLog | undefined> {
    const log = this.webhookLogs.get(id);
    if (!log) return undefined;
    const updatedLog = { ...log, ...updateData };
    this.webhookLogs.set(id, updatedLog);
    return updatedLog;
  }

  // Availability Schedule operations
  async getAvailabilitySchedules(userId: number): Promise<AvailabilitySchedule[]> {
    return Array.from(this.availabilitySchedules.values()).filter(s => s.userId === userId);
  }

  async getAvailabilitySchedule(id: number): Promise<AvailabilitySchedule | undefined> {
    return this.availabilitySchedules.get(id);
  }

  async createAvailabilitySchedule(schedule: InsertAvailabilitySchedule): Promise<AvailabilitySchedule> {
    const id = this.availabilityScheduleId++;
    const newSchedule: AvailabilitySchedule = {
      id,
      userId: schedule.userId,
      name: schedule.name,
      isDefault: schedule.isDefault ?? false,
      timezone: schedule.timezone ?? 'UTC',
      rules: schedule.rules ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.availabilitySchedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateAvailabilitySchedule(id: number, updateData: Partial<AvailabilitySchedule>): Promise<AvailabilitySchedule | undefined> {
    const schedule = this.availabilitySchedules.get(id);
    if (!schedule) return undefined;
    const updated = { ...schedule, ...updateData, updatedAt: new Date() };
    this.availabilitySchedules.set(id, updated);
    return updated;
  }

  async deleteAvailabilitySchedule(id: number): Promise<boolean> {
    return this.availabilitySchedules.delete(id);
  }

  // Custom Question operations
  async getCustomQuestions(bookingLinkId: number): Promise<CustomQuestion[]> {
    return Array.from(this.customQuestions.values())
      .filter(q => q.bookingLinkId === bookingLinkId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getCustomQuestion(id: number): Promise<CustomQuestion | undefined> {
    return this.customQuestions.get(id);
  }

  async createCustomQuestion(question: InsertCustomQuestion): Promise<CustomQuestion> {
    const id = this.customQuestionId++;
    const newQuestion: CustomQuestion = {
      id,
      bookingLinkId: question.bookingLinkId,
      label: question.label,
      type: question.type,
      required: question.required ?? false,
      options: question.options ?? [],
      orderIndex: question.orderIndex ?? 0,
      enabled: question.enabled ?? true,
      createdAt: new Date(),
    };
    this.customQuestions.set(id, newQuestion);
    return newQuestion;
  }

  async updateCustomQuestion(id: number, updateData: Partial<CustomQuestion>): Promise<CustomQuestion | undefined> {
    const question = this.customQuestions.get(id);
    if (!question) return undefined;
    const updated = { ...question, ...updateData };
    this.customQuestions.set(id, updated);
    return updated;
  }

  async deleteCustomQuestion(id: number): Promise<boolean> {
    return this.customQuestions.delete(id);
  }

  async deleteCustomQuestionsByBookingLink(bookingLinkId: number): Promise<boolean> {
    for (const [id, question] of Array.from(this.customQuestions.entries())) {
      if (question.bookingLinkId === bookingLinkId) {
        this.customQuestions.delete(id);
      }
    }
    return true;
  }

  // Date Override operations
  async getDateOverrides(userId: number): Promise<DateOverride[]> {
    return Array.from(this.dateOverrides.values()).filter(o => o.userId === userId);
  }

  async getDateOverride(id: number): Promise<DateOverride | undefined> {
    return this.dateOverrides.get(id);
  }

  async getDateOverrideByDate(userId: number, date: string): Promise<DateOverride | undefined> {
    return Array.from(this.dateOverrides.values()).find(
      o => o.userId === userId && o.date === date
    );
  }

  async createDateOverride(override: InsertDateOverride): Promise<DateOverride> {
    const id = this.dateOverrideId++;
    const newOverride: DateOverride = {
      id,
      userId: override.userId,
      date: override.date,
      isAvailable: override.isAvailable ?? true,
      startTime: override.startTime ?? null,
      endTime: override.endTime ?? null,
      label: override.label ?? null,
      createdAt: new Date(),
    };
    this.dateOverrides.set(id, newOverride);
    return newOverride;
  }

  async updateDateOverride(id: number, updateData: Partial<DateOverride>): Promise<DateOverride | undefined> {
    const override = this.dateOverrides.get(id);
    if (!override) return undefined;
    const updated = { ...override, ...updateData };
    this.dateOverrides.set(id, updated);
    return updated;
  }

  async deleteDateOverride(id: number): Promise<boolean> {
    return this.dateOverrides.delete(id);
  }

  // Meeting Poll operations
  async getMeetingPolls(userId: number): Promise<MeetingPoll[]> {
    return Array.from(this.meetingPollsMap.values()).filter(p => p.userId === userId);
  }

  async getMeetingPoll(id: number): Promise<MeetingPoll | undefined> {
    return this.meetingPollsMap.get(id);
  }

  async getMeetingPollBySlug(slug: string): Promise<MeetingPoll | undefined> {
    return Array.from(this.meetingPollsMap.values()).find(p => p.slug === slug);
  }

  async createMeetingPoll(poll: InsertMeetingPoll): Promise<MeetingPoll> {
    const id = this.meetingPollId++;
    const newPoll: MeetingPoll = {
      id,
      userId: poll.userId,
      title: poll.title,
      description: poll.description || null,
      slug: poll.slug,
      duration: poll.duration,
      location: poll.location || null,
      meetingUrl: poll.meetingUrl || null,
      status: poll.status || 'open',
      deadline: poll.deadline || null,
      selectedOptionId: poll.selectedOptionId || null,
      timezone: poll.timezone || 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.meetingPollsMap.set(id, newPoll);
    return newPoll;
  }

  async updateMeetingPoll(id: number, poll: Partial<MeetingPoll>): Promise<MeetingPoll | undefined> {
    const existing = this.meetingPollsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...poll, updatedAt: new Date() };
    this.meetingPollsMap.set(id, updated);
    return updated;
  }

  async deleteMeetingPoll(id: number): Promise<boolean> {
    return this.meetingPollsMap.delete(id);
  }

  // Meeting Poll Option operations
  async getMeetingPollOptions(pollId: number): Promise<MeetingPollOption[]> {
    return Array.from(this.meetingPollOptionsMap.values()).filter(o => o.pollId === pollId);
  }

  async createMeetingPollOption(option: InsertMeetingPollOption): Promise<MeetingPollOption> {
    const id = this.meetingPollOptionId++;
    const newOption: MeetingPollOption = {
      id,
      pollId: option.pollId,
      startTime: option.startTime,
      endTime: option.endTime,
      createdAt: new Date(),
    };
    this.meetingPollOptionsMap.set(id, newOption);
    return newOption;
  }

  async deleteMeetingPollOption(id: number): Promise<boolean> {
    return this.meetingPollOptionsMap.delete(id);
  }

  async deleteMeetingPollOptions(pollId: number): Promise<boolean> {
    Array.from(this.meetingPollOptionsMap.entries()).forEach(([id, option]) => {
      if (option.pollId === pollId) this.meetingPollOptionsMap.delete(id);
    });
    return true;
  }

  // Meeting Poll Vote operations
  async getMeetingPollVotes(pollId: number): Promise<MeetingPollVote[]> {
    return Array.from(this.meetingPollVotesMap.values()).filter(v => v.pollId === pollId);
  }

  async getMeetingPollVotesByOption(optionId: number): Promise<MeetingPollVote[]> {
    return Array.from(this.meetingPollVotesMap.values()).filter(v => v.optionId === optionId);
  }

  async createMeetingPollVote(vote: InsertMeetingPollVote): Promise<MeetingPollVote> {
    const id = this.meetingPollVoteId++;
    const newVote: MeetingPollVote = {
      id,
      pollId: vote.pollId,
      optionId: vote.optionId,
      voterName: vote.voterName,
      voterEmail: vote.voterEmail,
      vote: vote.vote || 'yes',
      createdAt: new Date(),
    };
    this.meetingPollVotesMap.set(id, newVote);
    return newVote;
  }

  async deleteMeetingPollVote(id: number): Promise<boolean> {
    return this.meetingPollVotesMap.delete(id);
  }

  async deleteMeetingPollVotesByVoter(pollId: number, voterEmail: string): Promise<boolean> {
    Array.from(this.meetingPollVotesMap.entries()).forEach(([id, vote]) => {
      if (vote.pollId === pollId && vote.voterEmail === voterEmail) {
        this.meetingPollVotesMap.delete(id);
      }
    });
    return true;
  }

  // Slack Integration operations
  async getSlackIntegration(userId: number): Promise<SlackIntegration | undefined> {
    return Array.from(this.slackIntegrationsMap.values()).find(s => s.userId === userId);
  }

  async createSlackIntegration(integration: InsertSlackIntegration): Promise<SlackIntegration> {
    const id = this.slackIntegrationId++;
    const newIntegration: SlackIntegration = {
      id,
      userId: integration.userId,
      webhookUrl: integration.webhookUrl,
      channelName: integration.channelName ?? null,
      notifyOnBooking: integration.notifyOnBooking ?? true,
      notifyOnCancellation: integration.notifyOnCancellation ?? true,
      notifyOnReschedule: integration.notifyOnReschedule ?? true,
      notifyOnNoShow: integration.notifyOnNoShow ?? false,
      isActive: integration.isActive ?? true,
      createdAt: new Date(),
    };
    this.slackIntegrationsMap.set(id, newIntegration);
    return newIntegration;
  }

  async updateSlackIntegration(id: number, integration: Partial<SlackIntegration>): Promise<SlackIntegration | undefined> {
    const existing = this.slackIntegrationsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...integration };
    this.slackIntegrationsMap.set(id, updated);
    return updated;
  }

  async deleteSlackIntegration(id: number): Promise<boolean> {
    return this.slackIntegrationsMap.delete(id);
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = this.auditLogId++;
    const newLog: AuditLog = {
      id,
      userId: log.userId ?? null,
      organizationId: log.organizationId ?? null,
      action: log.action,
      entityType: log.entityType ?? null,
      entityId: log.entityId ?? null,
      details: log.details ?? {},
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      createdAt: new Date(),
    };
    this.auditLogsMap.set(id, newLog);
    return newLog;
  }

  async getAuditLogs(filters: { organizationId?: number; userId?: number; action?: string; entityType?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogsMap.values());
    if (filters.organizationId) logs = logs.filter(l => l.organizationId === filters.organizationId);
    if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    if (filters.entityType) logs = logs.filter(l => l.entityType === filters.entityType);
    logs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return logs.slice(offset, offset + limit);
  }

  async getAuditLogCount(filters: { organizationId?: number; userId?: number; action?: string; entityType?: string }): Promise<number> {
    let logs = Array.from(this.auditLogsMap.values());
    if (filters.organizationId) logs = logs.filter(l => l.organizationId === filters.organizationId);
    if (filters.userId) logs = logs.filter(l => l.userId === filters.userId);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    if (filters.entityType) logs = logs.filter(l => l.entityType === filters.entityType);
    return logs.length;
  }

  async deleteAuditLogsBefore(date: Date, organizationId?: number): Promise<number> {
    let count = 0;
    const entries = Array.from(this.auditLogsMap.entries());
    for (const [id, log] of entries) {
      if (log.createdAt && log.createdAt < date) {
        if (!organizationId || log.organizationId === organizationId) {
          this.auditLogsMap.delete(id);
          count++;
        }
      }
    }
    return count;
  }

  // Domain Control operations
  async getDomainControls(organizationId: number): Promise<DomainControl[]> {
    return Array.from(this.domainControlsMap.values()).filter(d => d.organizationId === organizationId);
  }

  async createDomainControl(control: InsertDomainControl): Promise<DomainControl> {
    const id = this.domainControlId++;
    const newControl: DomainControl = {
      id,
      organizationId: control.organizationId,
      domain: control.domain,
      isVerified: control.isVerified ?? false,
      verificationToken: control.verificationToken ?? null,
      autoJoin: control.autoJoin ?? false,
      createdAt: new Date(),
    };
    this.domainControlsMap.set(id, newControl);
    return newControl;
  }

  async updateDomainControl(id: number, control: Partial<DomainControl>): Promise<DomainControl | undefined> {
    const existing = this.domainControlsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...control };
    this.domainControlsMap.set(id, updated);
    return updated;
  }

  async deleteDomainControl(id: number): Promise<boolean> {
    return this.domainControlsMap.delete(id);
  }

  async getDomainControlByDomain(domain: string): Promise<DomainControl | undefined> {
    return Array.from(this.domainControlsMap.values()).find(d => d.domain === domain);
  }

  // Data Retention Policy operations
  async getDataRetentionPolicies(organizationId: number): Promise<DataRetentionPolicy[]> {
    return Array.from(this.dataRetentionPoliciesMap.values()).filter(p => p.organizationId === organizationId);
  }

  async createDataRetentionPolicy(policy: InsertDataRetentionPolicy): Promise<DataRetentionPolicy> {
    const id = this.dataRetentionPolicyId++;
    const newPolicy: DataRetentionPolicy = {
      id,
      organizationId: policy.organizationId,
      entityType: policy.entityType,
      retentionDays: policy.retentionDays,
      isActive: policy.isActive ?? true,
      lastRunAt: null,
      deletedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dataRetentionPoliciesMap.set(id, newPolicy);
    return newPolicy;
  }

  async updateDataRetentionPolicy(id: number, policy: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy | undefined> {
    const existing = this.dataRetentionPoliciesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...policy, updatedAt: new Date() };
    this.dataRetentionPoliciesMap.set(id, updated);
    return updated;
  }

  async deleteDataRetentionPolicy(id: number): Promise<boolean> {
    return this.dataRetentionPoliciesMap.delete(id);
  }

  // SCIM Config operations
  async getScimConfig(organizationId: number): Promise<ScimConfig | undefined> {
    return Array.from(this.scimConfigsMap.values()).find(c => c.organizationId === organizationId);
  }

  async createScimConfig(config: InsertScimConfig): Promise<ScimConfig> {
    const id = this.scimConfigId++;
    const newConfig: ScimConfig = {
      id,
      organizationId: config.organizationId,
      bearerToken: config.bearerToken,
      isActive: config.isActive ?? true,
      baseUrl: config.baseUrl ?? null,
      lastSyncAt: null,
      provisionedCount: 0,
      createdAt: new Date(),
    };
    this.scimConfigsMap.set(id, newConfig);
    return newConfig;
  }

  async updateScimConfig(id: number, config: Partial<ScimConfig>): Promise<ScimConfig | undefined> {
    const existing = this.scimConfigsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...config };
    this.scimConfigsMap.set(id, updated);
    return updated;
  }

  async deleteScimConfig(id: number): Promise<boolean> {
    return this.scimConfigsMap.delete(id);
  }

  async getScimConfigByToken(token: string): Promise<ScimConfig | undefined> {
    return Array.from(this.scimConfigsMap.values()).find(c => c.bearerToken === token && c.isActive);
  }

  // Routing Form operations
  async getRoutingForms(userId: number): Promise<RoutingForm[]> {
    return Array.from(this.routingFormsMap.values()).filter(f => f.userId === userId);
  }

  async getRoutingForm(id: number): Promise<RoutingForm | undefined> {
    return this.routingFormsMap.get(id);
  }

  async getRoutingFormBySlug(slug: string): Promise<RoutingForm | undefined> {
    return Array.from(this.routingFormsMap.values()).find(f => f.slug === slug);
  }

  async createRoutingForm(form: InsertRoutingForm): Promise<RoutingForm> {
    const id = this.routingFormId++;
    const newForm: RoutingForm = {
      id,
      userId: form.userId,
      title: form.title,
      slug: form.slug,
      description: form.description ?? null,
      isActive: form.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.routingFormsMap.set(id, newForm);
    return newForm;
  }

  async updateRoutingForm(id: number, form: Partial<RoutingForm>): Promise<RoutingForm | undefined> {
    const existing = this.routingFormsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...form, updatedAt: new Date() };
    this.routingFormsMap.set(id, updated);
    return updated;
  }

  async deleteRoutingForm(id: number): Promise<boolean> {
    // Also delete questions, rules, submissions
    Array.from(this.routingFormQuestionsMap.entries()).forEach(([qId, q]) => {
      if (q.routingFormId === id) this.routingFormQuestionsMap.delete(qId);
    });
    Array.from(this.routingFormRulesMap.entries()).forEach(([rId, r]) => {
      if (r.routingFormId === id) this.routingFormRulesMap.delete(rId);
    });
    Array.from(this.routingFormSubmissionsMap.entries()).forEach(([sId, s]) => {
      if (s.routingFormId === id) this.routingFormSubmissionsMap.delete(sId);
    });
    return this.routingFormsMap.delete(id);
  }

  // Routing Form Question operations
  async getRoutingFormQuestions(routingFormId: number): Promise<RoutingFormQuestion[]> {
    return Array.from(this.routingFormQuestionsMap.values())
      .filter(q => q.routingFormId === routingFormId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async createRoutingFormQuestion(question: InsertRoutingFormQuestion): Promise<RoutingFormQuestion> {
    const id = this.routingFormQuestionId++;
    const newQuestion: RoutingFormQuestion = {
      id,
      routingFormId: question.routingFormId,
      label: question.label,
      type: question.type,
      options: question.options ?? [],
      isRequired: question.isRequired ?? true,
      orderIndex: question.orderIndex ?? 0,
    };
    this.routingFormQuestionsMap.set(id, newQuestion);
    return newQuestion;
  }

  async updateRoutingFormQuestion(id: number, question: Partial<RoutingFormQuestion>): Promise<RoutingFormQuestion | undefined> {
    const existing = this.routingFormQuestionsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...question };
    this.routingFormQuestionsMap.set(id, updated);
    return updated;
  }

  async deleteRoutingFormQuestion(id: number): Promise<boolean> {
    return this.routingFormQuestionsMap.delete(id);
  }

  // Routing Form Rule operations
  async getRoutingFormRules(routingFormId: number): Promise<RoutingFormRule[]> {
    return Array.from(this.routingFormRulesMap.values())
      .filter(r => r.routingFormId === routingFormId)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async createRoutingFormRule(rule: InsertRoutingFormRule): Promise<RoutingFormRule> {
    const id = this.routingFormRuleId++;
    const newRule: RoutingFormRule = {
      id,
      routingFormId: rule.routingFormId,
      questionId: rule.questionId,
      operator: rule.operator,
      value: rule.value,
      action: rule.action,
      targetBookingLinkId: rule.targetBookingLinkId ?? null,
      targetUrl: rule.targetUrl ?? null,
      targetMessage: rule.targetMessage ?? null,
      priority: rule.priority ?? 0,
      isActive: rule.isActive ?? true,
    };
    this.routingFormRulesMap.set(id, newRule);
    return newRule;
  }

  async updateRoutingFormRule(id: number, rule: Partial<RoutingFormRule>): Promise<RoutingFormRule | undefined> {
    const existing = this.routingFormRulesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...rule };
    this.routingFormRulesMap.set(id, updated);
    return updated;
  }

  async deleteRoutingFormRule(id: number): Promise<boolean> {
    return this.routingFormRulesMap.delete(id);
  }

  // Routing Form Submission operations
  async createRoutingFormSubmission(submission: InsertRoutingFormSubmission): Promise<RoutingFormSubmission> {
    const id = this.routingFormSubmissionId++;
    const newSubmission: RoutingFormSubmission = {
      id,
      routingFormId: submission.routingFormId,
      answers: submission.answers ?? {},
      routedTo: submission.routedTo ?? null,
      routedBookingLinkId: submission.routedBookingLinkId ?? null,
      submitterEmail: submission.submitterEmail ?? null,
      submitterName: submission.submitterName ?? null,
      createdAt: new Date(),
    };
    this.routingFormSubmissionsMap.set(id, newSubmission);
    return newSubmission;
  }

  async getRoutingFormSubmissions(routingFormId: number, limit: number = 50): Promise<RoutingFormSubmission[]> {
    return Array.from(this.routingFormSubmissionsMap.values())
      .filter(s => s.routingFormId === routingFormId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Auto-login token operations
  async getAutoLoginToken(id: number): Promise<AutoLoginToken | undefined> {
    return this.autoLoginTokensMap.get(id);
  }

  async getAutoLoginTokenByToken(token: string): Promise<AutoLoginToken | undefined> {
    return Array.from(this.autoLoginTokensMap.values()).find(t => t.token === token);
  }

  async getAutoLoginTokensByUserId(userId: number): Promise<AutoLoginToken[]> {
    return Array.from(this.autoLoginTokensMap.values()).filter(t => t.userId === userId);
  }

  async getActiveAutoLoginTokens(): Promise<AutoLoginToken[]> {
    return Array.from(this.autoLoginTokensMap.values())
      .filter(t => t.revokedAt === null)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createAutoLoginToken(token: InsertAutoLoginToken): Promise<AutoLoginToken> {
    const id = this.autoLoginTokenId++;
    const newToken: AutoLoginToken = {
      id,
      token: token.token,
      userId: token.userId,
      createdByUserId: token.createdByUserId,
      expiresAt: token.expiresAt ?? null,
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: null,
      useCount: 0,
      label: token.label ?? null,
    };
    this.autoLoginTokensMap.set(id, newToken);
    return newToken;
  }

  async updateAutoLoginToken(id: number, data: Partial<AutoLoginToken>): Promise<AutoLoginToken | undefined> {
    const existing = this.autoLoginTokensMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.autoLoginTokensMap.set(id, updated);
    return updated;
  }

  async deleteAutoLoginToken(id: number): Promise<boolean> {
    return this.autoLoginTokensMap.delete(id);
  }
}