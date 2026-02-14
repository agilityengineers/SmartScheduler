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
  Appointment, InsertAppointment,
  WebhookIntegration, InsertWebhookIntegration,
  WebhookLog, InsertWebhookLog,
  AvailabilitySchedule, InsertAvailabilitySchedule,
  CustomQuestion, InsertCustomQuestion,
  DateOverride, InsertDateOverride
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
  getEventsByUserIds(userIds: number[], startDate?: Date, endDate?: Date): Promise<Event[]>; // Batch loading for N+1 fix
  getEvent(id: number): Promise<Event | undefined>;
  getEventByExternalId(externalId: string, calendarType: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  deleteEventsByCalendarIntegration(calendarIntegrationId: number): Promise<number>;

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
  getUserBookings(userId: number): Promise<Booking[]>;
  getBookingsByEmail(email: string, userId: number): Promise<Booking[]>;

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

  // Workflow operations
  getWorkflows(userId: number): Promise<Workflow[]>;
  getWorkflow(id: number): Promise<Workflow | undefined>;
  getWorkflowsByTrigger(userId: number, triggerType: string): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: number, workflow: Partial<Workflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: number): Promise<boolean>;

  // Workflow step operations
  getWorkflowSteps(workflowId: number): Promise<WorkflowStep[]>;
  getWorkflowStep(id: number): Promise<WorkflowStep | undefined>;
  createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep>;
  updateWorkflowStep(id: number, step: Partial<WorkflowStep>): Promise<WorkflowStep | undefined>;
  deleteWorkflowStep(id: number): Promise<boolean>;
  deleteWorkflowSteps(workflowId: number): Promise<boolean>;

  // Workflow execution operations
  getWorkflowExecutions(workflowId: number, limit?: number): Promise<WorkflowExecution[]>;
  getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined>;
  createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateWorkflowExecution(id: number, execution: Partial<WorkflowExecution>): Promise<WorkflowExecution | undefined>;
  getWorkflowAnalytics(userId: number): Promise<{ total: number; successful: number; failed: number; pending: number }>;

  // Workflow step execution operations
  getWorkflowStepExecutions(executionId: number): Promise<WorkflowStepExecution[]>;
  createWorkflowStepExecution(stepExecution: InsertWorkflowStepExecution): Promise<WorkflowStepExecution>;
  updateWorkflowStepExecution(id: number, stepExecution: Partial<WorkflowStepExecution>): Promise<WorkflowStepExecution | undefined>;

  // Appointment operations (Smart-Scheduler integration)
  getAppointments(filters?: {
    userId?: number;
    organizationId?: number;
    source?: string;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentByExternalId(externalId: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;

  // Webhook integration operations
  getWebhookIntegrations(userId: number): Promise<WebhookIntegration[]>;
  getWebhookIntegration(id: number): Promise<WebhookIntegration | undefined>;
  getWebhookIntegrationBySource(source: string, organizationId?: number): Promise<WebhookIntegration | undefined>;
  createWebhookIntegration(integration: InsertWebhookIntegration): Promise<WebhookIntegration>;
  updateWebhookIntegration(id: number, integration: Partial<WebhookIntegration>): Promise<WebhookIntegration | undefined>;
  deleteWebhookIntegration(id: number): Promise<boolean>;

  // Webhook log operations
  getWebhookLogs(integrationId: number, limit?: number): Promise<WebhookLog[]>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  updateWebhookLog(id: number, log: Partial<WebhookLog>): Promise<WebhookLog | undefined>;

  // Availability Schedule operations
  getAvailabilitySchedules(userId: number): Promise<AvailabilitySchedule[]>;
  getAvailabilitySchedule(id: number): Promise<AvailabilitySchedule | undefined>;
  createAvailabilitySchedule(schedule: InsertAvailabilitySchedule): Promise<AvailabilitySchedule>;
  updateAvailabilitySchedule(id: number, schedule: Partial<AvailabilitySchedule>): Promise<AvailabilitySchedule | undefined>;
  deleteAvailabilitySchedule(id: number): Promise<boolean>;

  // Custom Question operations
  getCustomQuestions(bookingLinkId: number): Promise<CustomQuestion[]>;
  getCustomQuestion(id: number): Promise<CustomQuestion | undefined>;
  createCustomQuestion(question: InsertCustomQuestion): Promise<CustomQuestion>;
  updateCustomQuestion(id: number, question: Partial<CustomQuestion>): Promise<CustomQuestion | undefined>;
  deleteCustomQuestion(id: number): Promise<boolean>;
  deleteCustomQuestionsByBookingLink(bookingLinkId: number): Promise<boolean>;

  // Date Override operations
  getDateOverrides(userId: number): Promise<DateOverride[]>;
  getDateOverride(id: number): Promise<DateOverride | undefined>;
  getDateOverrideByDate(userId: number, date: string): Promise<DateOverride | undefined>;
  createDateOverride(override: InsertDateOverride): Promise<DateOverride>;
  updateDateOverride(id: number, override: Partial<DateOverride>): Promise<DateOverride | undefined>;
  deleteDateOverride(id: number): Promise<boolean>;
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