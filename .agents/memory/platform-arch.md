---
name: Platform architecture
description: نحوي platform tech stack, API client quirks, and generated hook patterns
---

## Stack
- Frontend: artifacts/edu-platform (React+Vite, port from PORT env)
- Backend: artifacts/api-server (Express, port 8080)
- Auth: Firebase Auth client SDK + firebase-admin on server
- DB: Firestore (client SDK for auth-context, firebase-admin for all API routes)
- API codegen: lib/api-spec/openapi.yaml → `pnpm --filter @workspace/api-spec run codegen`

## Generated hook quirks
- All query hooks require `queryKey` in the query options — always import and use the matching `get*QueryKey` helper
- All mutation hooks for routes with path params need `{ sessionId, data: {...} }` shape (e.g. submitAnswer, completeExam, completeQuiz)
- GradeCategory is a union type "primary"|"middle"|"secondary" — never pass empty string

## Grade mapping
- 4-6 → primary (أساسي)
- 7-9 → middle (إعدادي)  
- 10-12/توجيهي → secondary (ثانوي)

**Why:** The OpenAPI spec and codegen enforce strict types; forgetting queryKey causes TS2741 errors.
