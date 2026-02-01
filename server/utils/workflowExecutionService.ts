import { storage } from '../storage';
import { emailService } from './emailService';
import type { Workflow, WorkflowStep, WorkflowExecution, InsertWorkflowExecution, InsertWorkflowStepExecution } from '@shared/schema';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface ActionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';

interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value: string;
}

class WorkflowExecutionService {
  private twilioClient: any = null;
  private twilioConfig: TwilioConfig | null = null;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(accountSid, authToken);
        this.twilioConfig = { accountSid, authToken, fromNumber };
        console.log('✅ Twilio client initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Twilio client:', error);
      }
    } else {
      console.log('ℹ️ Twilio credentials not configured - SMS actions will be simulated');
    }
  }

  async executeWorkflow(
    workflowId: number,
    triggerData: Record<string, unknown>,
    testMode: boolean = false
  ): Promise<WorkflowExecution> {
    const workflow = await storage.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const steps = await storage.getWorkflowSteps(workflowId);
    
    const execution = await storage.createWorkflowExecution({
      workflowId,
      triggerData,
      status: 'running',
      startedAt: new Date(),
      stepsCompleted: 0,
      totalSteps: steps.length,
      metadata: { testMode },
    });

    try {
      let stepsCompleted = 0;
      let currentData = { ...triggerData };

      for (const step of steps) {
        const stepExecution = await storage.createWorkflowStepExecution({
          executionId: execution.id,
          stepId: step.id,
          status: 'running',
          startedAt: new Date(),
        });

        try {
          if (step.actionType === 'condition') {
            const conditionMet = this.evaluateCondition(step.actionConfig as unknown as ConditionConfig, currentData);
            await storage.updateWorkflowStepExecution(stepExecution.id, {
              status: 'completed',
              completedAt: new Date(),
              output: { conditionMet, evaluatedWith: currentData },
            });
            
            if (!conditionMet) {
              console.log(`[Workflow ${workflowId}] Condition not met, skipping remaining steps`);
              break;
            }
          } else if (step.actionType === 'delay') {
            const delayMinutes = step.delayMinutes || (step.actionConfig as { minutes?: number })?.minutes || 0;
            
            if (testMode) {
              console.log(`[Workflow ${workflowId}] TEST MODE: Would delay ${delayMinutes} minutes`);
            } else if (delayMinutes > 0) {
              await this.scheduleDelayedExecution(execution.id, step.id, delayMinutes, currentData);
              await storage.updateWorkflowStepExecution(stepExecution.id, {
                status: 'pending',
                output: { scheduledDelayMinutes: delayMinutes },
              });
              continue;
            }
            
            await storage.updateWorkflowStepExecution(stepExecution.id, {
              status: 'completed',
              completedAt: new Date(),
              output: { delayMinutes, skipped: testMode },
            });
          } else {
            const result = await this.executeAction(step, currentData, testMode);
            
            await storage.updateWorkflowStepExecution(stepExecution.id, {
              status: result.success ? 'completed' : 'failed',
              completedAt: new Date(),
              output: result.output || {},
              errorMessage: result.error,
            });

            if (!result.success) {
              throw new Error(result.error || 'Action failed');
            }

            if (result.output) {
              currentData = { ...currentData, ...result.output };
            }
          }

          stepsCompleted++;
          await storage.updateWorkflowExecution(execution.id, { stepsCompleted });
        } catch (stepError) {
          await storage.updateWorkflowStepExecution(stepExecution.id, {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: stepError instanceof Error ? stepError.message : 'Unknown error',
          });
          throw stepError;
        }
      }

      await storage.updateWorkflowExecution(execution.id, {
        status: 'completed',
        completedAt: new Date(),
        stepsCompleted,
      });

      return (await storage.getWorkflowExecution(execution.id))!;
    } catch (error) {
      await storage.updateWorkflowExecution(execution.id, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async executeAction(
    step: WorkflowStep,
    data: Record<string, unknown>,
    testMode: boolean
  ): Promise<ActionResult> {
    const config = step.actionConfig as Record<string, unknown>;
    const resolvedConfig = this.resolveTemplateVariables(config, data);

    switch (step.actionType) {
      case 'send_email':
        return this.executeEmailAction(resolvedConfig, testMode);
      
      case 'send_sms':
        return this.executeSmsAction(resolvedConfig, testMode);
      
      case 'webhook':
        return this.executeWebhookAction(resolvedConfig, testMode);
      
      case 'zapier':
        return this.executeZapierAction(resolvedConfig, testMode);
      
      case 'create_event':
        return this.executeCreateEventAction(resolvedConfig, data, testMode);
      
      default:
        return { success: false, error: `Unknown action type: ${step.actionType}` };
    }
  }

  private async executeEmailAction(
    config: Record<string, unknown>,
    testMode: boolean
  ): Promise<ActionResult> {
    const to = config.to as string;
    const subject = config.subject as string;
    const body = config.body as string;
    const textBody = body.replace(/<[^>]*>/g, '');

    if (testMode) {
      console.log(`[TEST MODE] Would send email to: ${to}, subject: ${subject}`);
      return { success: true, output: { testMode: true, to, subject } };
    }

    try {
      const result = await emailService.sendEmail({
        to,
        subject,
        html: body,
        text: textBody,
      });

      return { 
        success: result.success, 
        output: { messageId: result.messageId, method: result.method },
        error: result.error?.message,
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  }

  private async executeSmsAction(
    config: Record<string, unknown>,
    testMode: boolean
  ): Promise<ActionResult> {
    const to = config.to as string;
    const message = config.message as string;

    if (testMode) {
      console.log(`[TEST MODE] Would send SMS to: ${to}, message: ${message}`);
      return { success: true, output: { testMode: true, to, messagePreview: message.substring(0, 50) } };
    }

    if (!this.twilioClient || !this.twilioConfig) {
      console.log(`[SIMULATED] SMS to ${to}: ${message}`);
      return { 
        success: true, 
        output: { simulated: true, to, message, note: 'Twilio not configured' } 
      };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioConfig.fromNumber,
        to,
      });

      return { 
        success: true, 
        output: { sid: result.sid, status: result.status, to } 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send SMS' 
      };
    }
  }

  private async executeWebhookAction(
    config: Record<string, unknown>,
    testMode: boolean
  ): Promise<ActionResult> {
    const url = config.url as string;
    const method = (config.method as string) || 'POST';
    const headers = (config.headers as Record<string, string>) || {};
    const body = config.body as Record<string, unknown>;

    if (testMode) {
      console.log(`[TEST MODE] Would call webhook: ${method} ${url}`);
      return { success: true, output: { testMode: true, url, method } };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.text();
      
      return { 
        success: response.ok, 
        output: { 
          status: response.status, 
          statusText: response.statusText,
          response: responseData.substring(0, 1000),
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook request failed' 
      };
    }
  }

  private async executeZapierAction(
    config: Record<string, unknown>,
    testMode: boolean
  ): Promise<ActionResult> {
    const webhookUrl = config.webhookUrl as string;
    const payload = config.payload as Record<string, unknown> || config;

    if (testMode) {
      console.log(`[TEST MODE] Would trigger Zapier webhook: ${webhookUrl}`);
      return { success: true, output: { testMode: true, webhookUrl } };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return { 
        success: response.ok, 
        output: { status: response.status, triggered: true },
        error: response.ok ? undefined : `Zapier webhook failed: ${response.status}`,
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Zapier webhook failed' 
      };
    }
  }

  private async executeCreateEventAction(
    config: Record<string, unknown>,
    triggerData: Record<string, unknown>,
    testMode: boolean
  ): Promise<ActionResult> {
    const title = config.title as string;
    const startTime = config.startTime as string;
    const duration = (config.duration as number) || 30;

    if (testMode) {
      console.log(`[TEST MODE] Would create event: ${title} at ${startTime}`);
      return { success: true, output: { testMode: true, title, startTime, duration } };
    }

    try {
      const userId = triggerData.userId as number;
      if (!userId) {
        return { success: false, error: 'No userId in trigger data' };
      }

      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const event = await storage.createEvent({
        userId,
        title,
        startTime: startDate,
        endTime: endDate,
        isAllDay: false,
        timezone: (triggerData.timezone as string) || 'UTC',
      });

      return { success: true, output: { eventId: event.id, title: event.title } };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create event' 
      };
    }
  }

  private evaluateCondition(config: ConditionConfig, data: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(data, config.field);
    const compareValue = config.value;

    switch (config.operator) {
      case 'equals':
        return String(fieldValue) === String(compareValue);
      case 'not_equals':
        return String(fieldValue) !== String(compareValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private resolveTemplateVariables(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        resolved[key] = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
          const val = this.getNestedValue(data, path);
          return val !== undefined ? String(val) : `{{${path}}}`;
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.resolveTemplateVariables(value as Record<string, unknown>, data);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  private async scheduleDelayedExecution(
    executionId: number,
    stepId: number,
    delayMinutes: number,
    data: Record<string, unknown>
  ): Promise<void> {
    console.log(`[Workflow] Scheduling delayed execution: ${delayMinutes} minutes for step ${stepId}`);
    
    setTimeout(async () => {
      try {
        const execution = await storage.getWorkflowExecution(executionId);
        if (!execution || execution.status !== 'running') {
          console.log(`[Workflow] Delayed execution cancelled - execution ${executionId} no longer running`);
          return;
        }

        const step = await storage.getWorkflowStep(stepId);
        if (!step) {
          console.log(`[Workflow] Delayed execution failed - step ${stepId} not found`);
          return;
        }

        const stepExecution = (await storage.getWorkflowStepExecutions(executionId))
          .find(se => se.stepId === stepId);
        
        if (stepExecution) {
          await storage.updateWorkflowStepExecution(stepExecution.id, {
            status: 'completed',
            completedAt: new Date(),
            output: { delayCompleted: true, delayMinutes },
          });
        }

        console.log(`[Workflow] Delay of ${delayMinutes} minutes completed for step ${stepId}`);
      } catch (error) {
        console.error(`[Workflow] Error in delayed execution:`, error);
      }
    }, delayMinutes * 60 * 1000);
  }

  async triggerWorkflowsByEvent(
    userId: number,
    triggerType: string,
    triggerData: Record<string, unknown>
  ): Promise<WorkflowExecution[]> {
    const workflows = await storage.getWorkflowsByTrigger(userId, triggerType);
    const executions: WorkflowExecution[] = [];

    for (const workflow of workflows) {
      try {
        const execution = await this.executeWorkflow(workflow.id, triggerData);
        executions.push(execution);
      } catch (error) {
        console.error(`[Workflow] Failed to execute workflow ${workflow.id}:`, error);
      }
    }

    return executions;
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
