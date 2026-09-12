---
name: Safe startup
description: Protect existing accounts when preview and deployed instances may use persistent databases.
---

Database-backed startup must not reset existing account passwords or seed demo accounts by default, even outside production.

**Why:** Preview restarts previously reset a demo-named administrator's password. A development environment does not guarantee an isolated or disposable database.

**How to apply:** Require explicit development-only opt-in for fixtures, preserve existing accounts, and fail startup when required database initialization fails rather than claiming readiness.