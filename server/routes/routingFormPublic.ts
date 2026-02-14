import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * GET /form/:slug - Get public routing form by slug
 */
router.get('/form/:slug', async (req: Request, res: Response) => {
  try {
    const form = await storage.getRoutingFormBySlug(req.params.slug);
    if (!form || !form.isActive) {
      return res.status(404).json({ message: 'Routing form not found' });
    }

    const questions = await storage.getRoutingFormQuestions(form.id);

    // Get owner info for display
    const owner = await storage.getUser(form.userId);

    res.json({
      id: form.id,
      title: form.title,
      description: form.description,
      questions: questions.map(q => ({
        id: q.id,
        label: q.label,
        type: q.type,
        options: q.options,
        isRequired: q.isRequired,
        orderIndex: q.orderIndex,
      })),
      ownerName: owner ? (owner.displayName || owner.username) : 'Unknown',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching routing form' });
  }
});

/**
 * POST /form/:slug/submit - Submit answers and get routing result
 */
router.post('/form/:slug/submit', async (req: Request, res: Response) => {
  try {
    const form = await storage.getRoutingFormBySlug(req.params.slug);
    if (!form || !form.isActive) {
      return res.status(404).json({ message: 'Routing form not found' });
    }

    const { answers, email, name } = req.body;
    // answers format: { [questionId]: value }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Answers are required' });
    }

    // Get rules sorted by priority (highest first)
    const rules = await storage.getRoutingFormRules(form.id);
    const activeRules = rules.filter(r => r.isActive).sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Evaluate rules against answers
    let matchedRule = null;
    for (const rule of activeRules) {
      const answer = answers[String(rule.questionId)];
      if (answer === undefined) continue;

      const answerStr = String(answer).toLowerCase();
      const ruleValue = rule.value.toLowerCase();

      let matches = false;
      switch (rule.operator) {
        case 'equals':
          matches = answerStr === ruleValue;
          break;
        case 'not_equals':
          matches = answerStr !== ruleValue;
          break;
        case 'contains':
          matches = answerStr.includes(ruleValue);
          break;
        case 'starts_with':
          matches = answerStr.startsWith(ruleValue);
          break;
        default:
          matches = answerStr === ruleValue;
      }

      if (matches) {
        matchedRule = rule;
        break;
      }
    }

    // Determine routing outcome
    let routedTo = 'no_match';
    let result: any = { action: 'show_message', message: 'Thank you for your submission.' };

    if (matchedRule) {
      switch (matchedRule.action) {
        case 'route_to_booking': {
          if (matchedRule.targetBookingLinkId) {
            const bookingLink = await storage.getBookingLink(matchedRule.targetBookingLinkId);
            if (bookingLink) {
              const owner = await storage.getUser(bookingLink.userId);
              routedTo = `booking_link:${bookingLink.id}`;
              result = {
                action: 'route_to_booking',
                bookingLinkId: bookingLink.id,
                bookingLinkSlug: bookingLink.slug,
                bookingLinkTitle: bookingLink.title,
                ownerName: owner?.displayName || owner?.username,
              };
            }
          }
          break;
        }
        case 'route_to_url': {
          routedTo = `url:${matchedRule.targetUrl}`;
          result = {
            action: 'route_to_url',
            url: matchedRule.targetUrl,
          };
          break;
        }
        case 'show_message': {
          routedTo = 'message';
          result = {
            action: 'show_message',
            message: matchedRule.targetMessage || 'Thank you for your submission.',
          };
          break;
        }
      }
    }

    // Record submission
    await storage.createRoutingFormSubmission({
      routingFormId: form.id,
      answers,
      routedTo,
      routedBookingLinkId: matchedRule?.targetBookingLinkId || null,
      submitterEmail: email || null,
      submitterName: name || null,
    });

    res.json(result);
  } catch (error) {
    console.error('[ROUTING_FORM] Error processing submission:', error);
    res.status(500).json({ message: 'Error processing form submission' });
  }
});

export default router;
