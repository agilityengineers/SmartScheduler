---
name: env-domain-config
description: Why production kept generating old-domain (mysmartscheduler.co) links/emails despite the BASE_URL secret being correct.
---

# Committed .env overrides secrets in production

A committed `.env` file in the repo hardcodes the deprecated domain
(`BASE_URL=https://mysmartscheduler.co`, plus `SMTP_USER`/`SMTP_FROM=noreply@mysmartscheduler.co`).
`server/loadEnv.ts` runs `dotenv.config()` (no `override`) at startup, so `process.env`
wins over `.env` — but production was still emitting the old domain.

**Why:** The `.env` file is the guaranteed-present source in the deployed app, and the
Replit `BASE_URL` *secret* (set to `smart-scheduler.ai`) is NOT reliably present in the
production runtime (must republish after changing it, and even then the `.env` value is a
landmine). In dev the secret is present so it works; in prod the `.env` old value surfaces.

**Constraint:** The `.env` file CANNOT be edited (forbidden — secrets must not live in the
filesystem). So the fix must be in code, not config.

**How to apply:** Domain/URL/email resolution must reject any `process.env` value pointing
at a deprecated domain and fall back to the canonical `smart-scheduler.ai`. Implemented via
an `isDeprecatedUrl()` / `DEPRECATED_DOMAINS = ['mysmartscheduler.co']` guard in
`server/utils/domainConfig.ts` (`getBaseUrlForDomain`, `getFromEmailForDomain`),
`server/utils/oauthUtils.ts` (`getBaseUrl`), and the `EmailService` constructor
(`server/utils/emailService.ts`). Any NEW code that reads `process.env.BASE_URL`/`FROM_EMAIL`
directly must apply the same guard or use these helpers — never trust the raw env value.
