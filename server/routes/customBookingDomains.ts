import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';
import { logAuditEvent } from './auditLog';

const router = Router();

/**
 * GET / - Get custom booking domains for the user's organization
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);

    if (!user?.organizationId) {
      return res.status(400).json({ message: 'No organization found' });
    }

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const domains = await storage.getCustomBookingDomains(user.organizationId);
    res.json(domains);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching custom booking domains' });
  }
});

/**
 * POST / - Add a custom booking domain
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);

    if (!user?.organizationId) {
      return res.status(400).json({ message: 'No organization found' });
    }

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { domain, verificationMethod } = req.body;
    if (!domain) {
      return res.status(400).json({ message: 'Domain is required' });
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim();

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return res.status(400).json({ message: 'Invalid domain format. Example: book.yourcompany.com' });
    }

    // Check if domain already exists
    const existing = await storage.getCustomBookingDomainByDomain(normalizedDomain);
    if (existing) {
      return res.status(409).json({ message: 'Domain already registered' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(16).toString('hex');
    const method = verificationMethod || 'cname';

    const domainRecord = await storage.createCustomBookingDomain({
      organizationId: user.organizationId,
      domain: normalizedDomain,
      verificationMethod: method,
      verificationToken,
      isVerified: false,
      sslStatus: 'pending',
      isActive: false,
    });

    await logAuditEvent(req, 'custom_domain_add', 'custom_booking_domain', domainRecord.id, {
      domain: normalizedDomain,
    });

    // Return with DNS setup instructions
    res.status(201).json({
      ...domainRecord,
      dnsInstructions: method === 'cname'
        ? {
            type: 'CNAME',
            name: normalizedDomain,
            value: 'booking.smartscheduler.app',
            note: 'Add this CNAME record to your DNS provider',
          }
        : {
            type: 'TXT',
            name: `_smartscheduler.${normalizedDomain}`,
            value: `smartscheduler-verify=${verificationToken}`,
            note: 'Add this TXT record to your DNS provider',
          },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding custom booking domain', error: (error as Error).message });
  }
});

/**
 * POST /:id/verify - Verify domain ownership
 */
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);

    if (user?.role !== 'admin' && user?.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const domainRecord = await storage.getCustomBookingDomain(id);
    if (!domainRecord) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // In production, this would do actual DNS lookup via dns.resolveCname() or dns.resolveTxt()
    // For development, auto-verify
    const updated = await storage.updateCustomBookingDomain(id, {
      isVerified: true,
      verifiedAt: new Date(),
      sslStatus: 'active', // In production, SSL provisioning would be async
      isActive: true,
    });

    await logAuditEvent(req, 'custom_domain_verify', 'custom_booking_domain', id, {
      domain: domainRecord.domain,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error verifying domain' });
  }
});

/**
 * DELETE /:id - Remove a custom booking domain
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);

    if (user?.role !== 'admin' && user?.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const domainRecord = await storage.getCustomBookingDomain(id);
    if (!domainRecord) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    await storage.deleteCustomBookingDomain(id);
    await logAuditEvent(req, 'custom_domain_remove', 'custom_booking_domain', id, {
      domain: domainRecord.domain,
    });

    res.json({ message: 'Custom booking domain removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing custom booking domain' });
  }
});

/**
 * GET /resolve/:domain - Public: resolve a custom booking domain to an organization
 */
router.get('/resolve/:domain', async (req: Request, res: Response) => {
  try {
    const domain = req.params.domain.toLowerCase();
    const domainRecord = await storage.getCustomBookingDomainByDomain(domain);

    if (!domainRecord || !domainRecord.isActive || !domainRecord.isVerified) {
      return res.status(404).json({ message: 'Domain not found or not active' });
    }

    const org = await storage.getOrganization(domainRecord.organizationId);

    res.json({
      organizationId: domainRecord.organizationId,
      organizationName: org?.name,
      domain: domainRecord.domain,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving domain' });
  }
});

export default router;
