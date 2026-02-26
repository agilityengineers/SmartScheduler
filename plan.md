# Time Booking Fix Plan

## Summary of Investigation

After a comprehensive analysis of the entire booking flow — frontend (PublicBookingPage.tsx), backend (routes.ts, bookingPaths.ts), validation (bookingUtils.ts, dateUtils.ts), availability engine (teamSchedulingService.ts), and storage layer — I identified **10 issues** across 3 severity levels that can cause booking failures, silent data corruption, or inconsistent behavior.

---

## CRITICAL Issues (likely causing the error on save)

### 1. `bookingPaths.ts` missing lead time, buffer conflict, max-per-day checks, and concurrency lock
**Files:** `server/routes/bookingPaths.ts:472-695`
**Problem:** The newer path-format booking endpoint (`/:path(*)/booking/:slug` POST) skips four validations that the legacy endpoint (`/api/public/booking/:slug` in routes.ts:5440-5595) performs:
- **No lead time check** — bookings can be made in the past or with zero notice
- **No buffer conflict detection** — double-bookings can occur when buffers overlap
- **No max bookings per day check** — daily limit is never enforced
- **No `pg_advisory_lock`** — race condition allows concurrent double-bookings

The frontend uses the path-format endpoints (`/:userPath/booking/:slug`) when a `userPath` is present (PublicBookingPage.tsx:316-318), which is the default for most users. This means most booking submissions go through the unprotected code path.

**Fix:** Add lead time validation, buffer conflict checking, max-per-day limit enforcement, and advisory locking to `bookingPaths.ts`, matching the logic in `routes.ts:5490-5568`.

### 2. Duration validation uses strict equality — floating-point mismatch causes rejection
**Files:** `server/routes.ts:5491-5494`, `server/routes.ts:7634-7638`
**Problem:** The duration check uses `durationMinutes !== bookingLink.duration` (strict `!==`). The calculation `(endTime.getTime() - startTime.getTime()) / (1000 * 60)` can produce floating-point values like `29.999999999` instead of `30` due to millisecond rounding in date parsing. Since `bookingLink.duration` is an integer from the database, this strict comparison fails and returns "Booking duration does not match expected duration". **This is the most likely cause of the save error.**

**Fix:** Replace strict equality with a tolerance check: `Math.abs(durationMinutes - bookingLink.duration) > 1` (allow up to 1 minute tolerance).

### 3. Max bookings per day counts ALL calendar events, not just bookings
**Files:** `server/routes.ts:5528-5540`, `server/routes.ts:7672-7684`
**Problem:** `storage.getEvents()` returns all events (Google Calendar synced events, Outlook events, personal events) — not just bookings. `userEvents.length` is compared against `maxBookingsPerDay`, so a user with 3 personal calendar events and a limit of 3 bookings/day would be blocked from receiving any bookings. Additionally, cancelled/rescheduled bookings are not filtered out (unlike the weekly/monthly checks in `bookingPaths.ts:519-521` which correctly filter by status).

**Fix:** Use `storage.getBookings()` filtered by date and status, or filter `userEvents` to only count booking-originated events.

---

## HIGH Issues (cause incorrect behavior)

### 4. Pooled team assignment ignores buffer times
**File:** `server/utils/teamSchedulingService.ts:592-606`
**Problem:** The pooled assignment method checks for direct time overlap (`startTime < eventEnd && endTime > eventStart`) but does not account for `bufferBefore` and `bufferAfter`. A team member could be assigned even if the buffer zone overlaps with their existing event, leading to back-to-back bookings that violate the configured buffer.

**Fix:** Include buffer times in the conflict check for pooled assignment, consistent with how `findCommonAvailability` handles buffers.

### 5. Buffer conflict check uses redundant/identical conditions
**Files:** `server/routes.ts:5557-5561`, `server/routes.ts:7701-7705`
**Problem:** The overlap check has two conditions joined by `||`, but they are mathematically identical:
```
(bufferBeforeTime <= eventEnd && bufferAfterTime >= eventStart) ||
(eventStart <= bufferAfterTime && eventEnd >= bufferBeforeTime)
```
Both conditions check the same interval overlap. While this doesn't cause false negatives, it uses `<=`/`>=` (inclusive) while `teamSchedulingService.ts` uses `<`/`>` (exclusive). This inconsistency means the availability engine shows a slot as available, but the booking endpoint rejects it when events share an exact boundary timestamp.

**Fix:** Simplify to a single condition and use consistent comparison operators (`<`/`>` exclusive, matching the availability engine).

### 6. Frontend date boundaries are not timezone-aware
**File:** `client/src/components/booking/PublicBookingPage.tsx:156-157`
**Problem:** `startOfDay(selectedDate)` and `endOfDay(selectedDate)` compute midnight boundaries in the browser's local timezone, not the `selectedTimeZone`. If a user in UTC selects a date while viewing slots in America/Los_Angeles (UTC-8), the API receives date boundaries offset by 8 hours, potentially showing slots from the wrong day.

**Fix:** Compute day boundaries in the selected timezone using `date-fns-tz` functions before converting to ISO for the API call.

---

## MODERATE Issues (edge cases and code quality)

### 7. Day boundary calculation uses server local time for UTC timestamps
**Files:** `server/routes.ts:5521-5525`, `server/routes.ts:7665-7669`
**Problem:** `dayStart.setHours(0, 0, 0, 0)` sets midnight in the server's local timezone, not UTC. Since timestamps are stored in UTC, this creates a mismatch — the "day" window doesn't align with actual UTC day boundaries.

**Fix:** Use UTC-based day boundaries: `dayStart.setUTCHours(0, 0, 0, 0)` and `dayEnd.setUTCHours(23, 59, 59, 999)`.

### 8. One-off link expiry check happens after validation but before creation — race window
**File:** `server/routes/bookingPaths.ts:622-625`
**Problem:** The `isOneOff && isExpired` check occurs outside any advisory lock (which doesn't exist in this endpoint — see Issue #1). Two concurrent requests could both pass the check.

**Fix:** This will be resolved as part of Issue #1 when advisory locking is added.

### 9. Round-robin counts cancelled bookings toward member load
**File:** `server/utils/teamSchedulingService.ts:615-627`
**Problem:** `storage.getBookings(link.id)` returns all bookings regardless of status. Cancelled bookings are counted in the round-robin distribution, skewing assignment fairness.

**Fix:** Filter bookings by `status !== 'cancelled'` before counting.

### 10. Debug console.log statements in production code
**Files:** `client/src/hooks/useTimeZone.ts` (lines 27, 36), `server/routes/bookingPaths.ts` (multiple lines)
**Problem:** Verbose logging of timestamps and booking data in client-side code.

**Fix:** Remove client-side debug logs; keep server-side logs but reduce verbosity.

---

## Implementation Order

| Step | Issue | File(s) | Impact |
|------|-------|---------|--------|
| 1 | #2 — Duration tolerance | `server/routes.ts` (2 locations) | Fixes likely save error |
| 2 | #1 — Missing validations in bookingPaths | `server/routes/bookingPaths.ts` | Fixes save errors on path-format bookings |
| 3 | #3 — Max bookings per day logic | `server/routes.ts` (2 locations), `server/routes/bookingPaths.ts` | Prevents false rejections |
| 4 | #5 — Buffer conflict consistency | `server/routes.ts` (2 locations), `server/routes/bookingPaths.ts` | Prevents show-then-reject |
| 5 | #4 — Pooled assignment buffers | `server/utils/teamSchedulingService.ts` | Prevents buffer violations |
| 6 | #6 — Frontend date boundaries | `client/src/components/booking/PublicBookingPage.tsx` | Fixes wrong-day slots |
| 7 | #7 — UTC day boundaries | `server/routes.ts` (2 locations) | Fixes day window alignment |
| 8 | #9 — Round-robin cancelled filter | `server/utils/teamSchedulingService.ts` | Fixes fairness |
| 9 | #10 — Remove debug logs | `client/src/hooks/useTimeZone.ts` | Cleanup |

Steps 1-4 are the most likely to resolve the save error. Steps 5-9 fix related correctness issues discovered during investigation.
