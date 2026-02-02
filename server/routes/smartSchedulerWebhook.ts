import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  AppointmentSource, 
  AppointmentStatus, 
  AppointmentType,
  insertAppointmentSchema
} from '@shared/schema';

const router = Router();

const webhookPayloadSchema = z.object({
  event: z.enum(['appointment.created', 'appointment.updated', 'appointment.cancelled', 'appointment.completed']),
  timestamp: z.string(),
  signature: z.string().optional(),
  data: z.object({
    appointmentId: z.string(),
    type: z.enum(['initial_consultation', 'brand_voice_interview', 'strategy_session', 'follow_up', 'onboarding']),
    scheduledAt: z.string(),
    duration: z.number(),
    status: z.string().optional(),
    client: z.object({
      externalId: z.string().optional(),
      email: z.string().email(),
      name: z.string(),
      phone: z.string().optional(),
    }),
    host: z.object({
      externalId: z.string().optional(),
      email: z.string().email(),
      name: z.string(),
      role: z.enum(['admin', 'advisor', 'interviewer', 'coach']),
    }),
    metadata: z.object({
      source: z.string().optional(),
      notes: z.string().optional(),
    }).optional(),
  }),
});

type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

function mapEventToStatus(event: string, existingStatus?: string): string {
  switch (event) {
    case 'appointment.created':
      return AppointmentStatus.SCHEDULED;
    case 'appointment.updated':
      return existingStatus || AppointmentStatus.SCHEDULED;
    case 'appointment.cancelled':
      return AppointmentStatus.CANCELLED;
    case 'appointment.completed':
      return AppointmentStatus.COMPLETED;
    default:
      return AppointmentStatus.SCHEDULED;
  }
}

interface RequestWithRawBody extends Request {
  rawBody?: string;
}

router.post('/smart-scheduler', async (req: RequestWithRawBody, res: Response) => {
  console.log('[Webhook] Received Smart-Scheduler webhook');
  
  try {
    const signatureHeader = req.headers['x-webhook-signature'] as string;
    
    const integration = await storage.getWebhookIntegrationBySource('smart-scheduler');
    
    if (!integration) {
      console.error('[Webhook] No active Smart-Scheduler integration found - rejecting webhook');
      return res.status(403).json({ 
        error: 'No active webhook integration configured',
        message: 'Please configure a Smart-Scheduler webhook integration in Settings' 
      });
    }
    
    if (!integration.isActive) {
      console.error('[Webhook] Integration is disabled - rejecting webhook');
      return res.status(403).json({ 
        error: 'Webhook integration is disabled',
        message: 'Please enable the integration in Settings' 
      });
    }
    
    if (!signatureHeader) {
      console.error('[Webhook] Missing signature header - rejecting webhook');
      await storage.createWebhookLog({
        integrationId: integration.id,
        eventType: 'unknown',
        payload: req.body as any,
        signature: null,
        signatureValid: false,
        processed: false,
        processingError: 'Missing signature header',
      });
      return res.status(401).json({ 
        error: 'Missing webhook signature',
        message: 'X-Webhook-Signature header is required' 
      });
    }
    
    if (!req.rawBody) {
      console.error('[Webhook] Raw body not captured - internal error');
      await storage.createWebhookLog({
        integrationId: integration.id,
        eventType: 'internal_error',
        payload: req.body as any,
        signature: signatureHeader,
        signatureValid: false,
        processed: false,
        processingError: 'Raw body not captured for signature verification',
      });
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Unable to verify webhook signature' 
      });
    }
    
    const isValid = verifyHmacSignature(req.rawBody, signatureHeader, integration.webhookSecret);
    
    const parseResult = webhookPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error('[Webhook] Invalid payload:', parseResult.error.errors);
      await storage.createWebhookLog({
        integrationId: integration.id,
        eventType: 'parse_error',
        payload: req.body as any,
        signature: signatureHeader,
        signatureValid: isValid,
        processed: false,
        processingError: 'Invalid payload structure',
      });
      return res.status(400).json({ 
        error: 'Invalid webhook payload', 
        details: parseResult.error.errors 
      });
    }
    
    const payload = parseResult.data;
    console.log(`[Webhook] Processing event: ${payload.event} for appointment: ${payload.data.appointmentId}`);
    
    const webhookLog = await storage.createWebhookLog({
      integrationId: integration.id,
      eventType: payload.event,
      payload: payload as any,
      signature: signatureHeader,
      signatureValid: isValid,
      processed: false,
    });
    
    if (!isValid) {
      console.error('[Webhook] Invalid signature - rejecting webhook');
      await storage.updateWebhookLog(webhookLog.id, {
        processed: false,
        processingError: 'Invalid HMAC signature',
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    await storage.updateWebhookIntegration(integration.id, {
      lastWebhookAt: new Date(),
      webhookCount: (integration.webhookCount || 0) + 1,
    });
    
    const existingAppointment = await storage.getAppointmentByExternalId(payload.data.appointmentId);
    
    let appointment;
    const scheduledAt = new Date(payload.data.scheduledAt);
    
    if (payload.event === 'appointment.created') {
      if (existingAppointment) {
        console.log(`[Webhook] Appointment ${payload.data.appointmentId} already exists, updating instead`);
        appointment = await storage.updateAppointment(existingAppointment.id, {
          type: payload.data.type,
          status: mapEventToStatus(payload.event),
          scheduledAt,
          duration: payload.data.duration,
          clientEmail: payload.data.client.email,
          clientName: payload.data.client.name,
          clientPhone: payload.data.client.phone || null,
          clientExternalId: payload.data.client.externalId || null,
          hostEmail: payload.data.host.email,
          hostName: payload.data.host.name,
          hostRole: payload.data.host.role,
          hostExternalId: payload.data.host.externalId || null,
          notes: payload.data.metadata?.notes || null,
          metadata: payload.data.metadata || {},
        });
      } else {
        appointment = await storage.createAppointment({
          externalId: payload.data.appointmentId,
          source: AppointmentSource.SMART_SCHEDULER,
          type: payload.data.type,
          status: mapEventToStatus(payload.event),
          scheduledAt,
          duration: payload.data.duration,
          clientEmail: payload.data.client.email,
          clientName: payload.data.client.name,
          clientPhone: payload.data.client.phone || null,
          clientExternalId: payload.data.client.externalId || null,
          hostEmail: payload.data.host.email,
          hostName: payload.data.host.name,
          hostRole: payload.data.host.role,
          hostExternalId: payload.data.host.externalId || null,
          notes: payload.data.metadata?.notes || null,
          metadata: payload.data.metadata || {},
        });
        console.log(`[Webhook] Created appointment: ${appointment.id}`);
      }
    } else if (payload.event === 'appointment.updated') {
      if (!existingAppointment) {
        appointment = await storage.createAppointment({
          externalId: payload.data.appointmentId,
          source: AppointmentSource.SMART_SCHEDULER,
          type: payload.data.type,
          status: mapEventToStatus(payload.event),
          scheduledAt,
          duration: payload.data.duration,
          clientEmail: payload.data.client.email,
          clientName: payload.data.client.name,
          clientPhone: payload.data.client.phone || null,
          clientExternalId: payload.data.client.externalId || null,
          hostEmail: payload.data.host.email,
          hostName: payload.data.host.name,
          hostRole: payload.data.host.role,
          hostExternalId: payload.data.host.externalId || null,
          notes: payload.data.metadata?.notes || null,
          metadata: payload.data.metadata || {},
        });
        console.log(`[Webhook] Created appointment from update event: ${appointment.id}`);
      } else {
        appointment = await storage.updateAppointment(existingAppointment.id, {
          type: payload.data.type,
          status: mapEventToStatus(payload.event, existingAppointment.status),
          scheduledAt,
          duration: payload.data.duration,
          clientEmail: payload.data.client.email,
          clientName: payload.data.client.name,
          clientPhone: payload.data.client.phone || null,
          clientExternalId: payload.data.client.externalId || null,
          hostEmail: payload.data.host.email,
          hostName: payload.data.host.name,
          hostRole: payload.data.host.role,
          hostExternalId: payload.data.host.externalId || null,
          notes: payload.data.metadata?.notes || null,
          metadata: payload.data.metadata || {},
        });
        console.log(`[Webhook] Updated appointment: ${existingAppointment.id}`);
      }
    } else if (payload.event === 'appointment.cancelled') {
      if (existingAppointment) {
        appointment = await storage.updateAppointment(existingAppointment.id, {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
        });
        console.log(`[Webhook] Cancelled appointment: ${existingAppointment.id}`);
      } else {
        console.log(`[Webhook] Appointment ${payload.data.appointmentId} not found for cancellation`);
        return res.status(404).json({ error: 'Appointment not found' });
      }
    } else if (payload.event === 'appointment.completed') {
      if (existingAppointment) {
        appointment = await storage.updateAppointment(existingAppointment.id, {
          status: AppointmentStatus.COMPLETED,
          completedAt: new Date(),
        });
        console.log(`[Webhook] Completed appointment: ${existingAppointment.id}`);
      } else {
        console.log(`[Webhook] Appointment ${payload.data.appointmentId} not found for completion`);
        return res.status(404).json({ error: 'Appointment not found' });
      }
    }
    
    await storage.updateWebhookLog(webhookLog.id, {
      processed: true,
      appointmentId: appointment?.id,
    });
    
    res.status(200).json({ 
      success: true, 
      message: `Processed ${payload.event}`,
      appointmentId: appointment?.id 
    });
    
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: (error as Error).message 
    });
  }
});

router.get('/smart-scheduler/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'Smart-Scheduler Webhook',
    timestamp: new Date().toISOString()
  });
});

export default router;
