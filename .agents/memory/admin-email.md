---
name: Admin email
description: The single admin account email and where it's hardcoded
---

## Admin email: a.alkhdeirat@gmail.com

Hardcoded in:
- artifacts/api-server/src/lib/firebase-admin.ts → exported as ADMIN_EMAIL
- artifacts/edu-platform/src/lib/auth-context.tsx → ADMIN_EMAIL constant

**Why:** Single-admin platform. No admin management UI needed.
**How to apply:** If changing the admin email, update both files above.
