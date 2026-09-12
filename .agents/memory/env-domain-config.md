---
name: Canonical domain configuration
description: Domain safety requirements and limits of the earlier production diagnosis.
---

Use smart-scheduler.ai for platform links and noreply@smart-scheduler.ai for platform email. Reject deprecated mysmartscheduler.co values in domain resolution.

**Why:** Previously sent invitations used the deprecated domain. Historical configuration included stale defaults. The earlier claim that dotenv overrides existing secrets was incorrect: without override enabled, existing environment values win. The exact production configuration source was not conclusively established.

**How to apply:** Use centralized domain resolution rather than raw environment values. Do not read or edit credential files to diagnose configuration. Check production configuration through supported environment tools and verify new emails separately from startup configuration.