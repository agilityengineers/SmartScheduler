import { Router, Request, Response } from 'express';
import dns from 'dns/promises';
import { storage } from '../storage';
import crypto from 'crypto';
import { logAuditEvent } from './auditLog';

const router = Router();

/**
 * GET / - Get domain controls for the user's organization
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const domains = await storage.getDomainControls(user.organizationId);
    res.json(domains);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching domain controls' });
  }
});

/**
 * POST / - Add a domain control
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { domain, autoJoin } = req.body;
    if (!domain) return res.status(400).json({ message: 'Domain is required' });

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim();

    // Check if domain already exists for this org
    const existing = await storage.getDomainControlByDomain(normalizedDomain);
    if (existing) return res.status(409).json({ message: 'Domain already registered' });

    // Generate verification token (for DNS TXT record verification)
    const verificationToken = `smartscheduler-verify-${crypto.randomBytes(16).toString('hex')}`;

    const control = await storage.createDomainControl({
      organizationId: user.organizationId,
      domain: normalizedDomain,
      verificationToken,
      autoJoin: autoJoin || false,
    });

    await logAuditEvent(req, 'domain_add', 'domain_control', control.id, { domain: normalizedDomain });

    res.status(201).json(control);
  } catch (error) {
    res.status(500).json({ message: 'Error adding domain' });
  }
});

/**
 * POST /:id/verify - Verify domain ownership via a DNS TXT record.
 *
 * The domain is only marked verified if a TXT record on the domain contains the
 * per-domain verification token generated when the control was created. This
 * prevents a tenant from claiming a domain they do not actually control.
 */
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const controlId = parseInt(req.params.id);
    if (isNaN(controlId)) return res.status(400).json({ message: 'Invalid domain control ID' });

    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Scope the lookup to the caller's organization so one org cannot verify
    // another organization's domain control by guessing its ID.
    const controls = await storage.getDomainControls(user.organizationId);
    const control = controls.find(c => c.id === controlId);
    if (!control) return res.status(404).json({ message: 'Domain control not found' });

    if (!control.verificationToken) {
      return res.status(400).json({ message: 'Domain control has no verification token; re-add the domain.' });
    }

    // Read the domain's DNS TXT records and require one containing our token.
    let txtRecords: string[][];
    try {
      txtRecords = await dns.resolveTxt(control.domain);
    } catch (dnsError: any) {
      return res.status(400).json({
        verified: false,
        message: 'Could not read DNS TXT records for the domain. Add the verification TXT record and try again.',
        expectedToken: control.verificationToken,
        error: dnsError?.code || 'DNS_LOOKUP_FAILED',
      });
    }

    // Each TXT record may be split into multiple chunks; join before comparing.
    const flattened = txtRecords.map(chunks => chunks.join(''));
    const verified = flattened.some(record => record.includes(control.verificationToken!));

    if (!verified) {
      return res.status(400).json({
        verified: false,
        message: 'Verification TXT record not found. Add a DNS TXT record containing the token below, then retry.',
        expectedToken: control.verificationToken,
      });
    }

    const updated = await storage.updateDomainControl(controlId, { isVerified: true });
    await logAuditEvent(req, 'domain_verify', 'domain_control', controlId, { domain: control.domain });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error verifying domain' });
  }
});

/**
 * PUT /:id - Update domain control settings
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const controlId = parseInt(req.params.id);
    if (isNaN(controlId)) return res.status(400).json({ message: 'Invalid domain control ID' });

    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Enforce that the control belongs to the caller's organization.
    const controls = await storage.getDomainControls(user.organizationId);
    const existing = controls.find(c => c.id === controlId);
    if (!existing) return res.status(404).json({ message: 'Domain control not found' });

    const { autoJoin } = req.body;
    const control = await storage.updateDomainControl(controlId, { autoJoin });
    if (!control) return res.status(404).json({ message: 'Domain control not found' });

    res.json(control);
  } catch (error) {
    res.status(500).json({ message: 'Error updating domain control' });
  }
});

/**
 * DELETE /:id - Remove a domain control
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const controlId = parseInt(req.params.id);
    if (isNaN(controlId)) return res.status(400).json({ message: 'Invalid domain control ID' });

    const userId = (req.session as any)?.userId;
    const user = await storage.getUser(userId);
    if (!user?.organizationId) return res.status(400).json({ message: 'No organization' });

    if (user.role !== 'admin' && user.role !== 'company_admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Enforce that the control belongs to the caller's organization.
    const controls = await storage.getDomainControls(user.organizationId);
    const existing = controls.find(c => c.id === controlId);
    if (!existing) return res.status(404).json({ message: 'Domain control not found' });

    await storage.deleteDomainControl(controlId);
    await logAuditEvent(req, 'domain_remove', 'domain_control', controlId);

    res.json({ message: 'Domain control removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing domain control' });
  }
});

/**
 * GET /check/:email - Check if an email domain is controlled (public endpoint)
 */
router.get('/check/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return res.status(400).json({ message: 'Invalid email' });

    const control = await storage.getDomainControlByDomain(domain);
    if (control && control.isVerified) {
      const org = await storage.getOrganization(control.organizationId);
      res.json({
        controlled: true,
        organizationName: org?.name,
        autoJoin: control.autoJoin,
      });
    } else {
      res.json({ controlled: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking domain' });
  }
});

export default router;
