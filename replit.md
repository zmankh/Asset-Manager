# منصة النحو — Arabic Grammar Educational Platform

A full-stack gamified Arabic grammar learning platform for school students and teachers, with Firebase Auth/Firestore backend, quiz engine, leaderboards, analytics, and admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/edu-platform run dev` — run the frontend (port 21607)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query
- API: Express 5 + Firebase Admin SDK
- Auth & DB: Firebase Auth + Firestore
- Charts: Recharts
- CSV parsing: PapaParse
- Codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/edu-platform/src/` — React frontend (RTL Arabic UI)
  - `src/lib/firebase.ts` — Firebase client config
  - `src/lib/auth-context.tsx` — Auth context (login, isAdmin, etc.)
  - `src/pages/` — All pages (dashboard, quiz, leaderboard, admin/*)
  - `src/components/layout/` — Sidebar + main layout
- `artifacts/api-server/src/` — Express API server
  - `src/lib/firebase-admin.ts` — Firebase Admin init (uses FIREBASE_SERVICE_ACCOUNT_JSON)
  - `src/middlewares/auth.ts` — requireAuth / requireAdmin middleware
  - `src/routes/` — Route handlers for all entities
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod schemas

## Required Secrets

- `VITE_FIREBASE_API_KEY` — Firebase web config
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Full service account JSON for backend Firebase Admin

## Admin

- Admin email: `a.alkhdeirat@gmail.com`
- Admin gets access to `/admin/*` pages: analytics, users, grammar rules, questions, notifications, leaderboard titles, info cards

## Features

- Firebase email/password auth with role detection
- Student dashboard with XP bar, streak counter, floating notifications, info cards
- Gamified leaderboard (annual + weekly, resets weekly), admin-defined rank titles
- Quiz engine: randomized questions per grammar rule, answer validation by text string, XP awarded on correct answers, "why is this wrong?" hint on failure
- Admin analytics: overview cards, Recharts bar chart (performance per rule), weakness analysis (flags rules with >40% failure rate)
- Bulk question upload via CSV/Excel (PapaParse), downloadable template
- Full CRUD for: users, grammar rules, questions, notifications, leaderboard titles, info cards

## Architecture decisions

- Firebase Auth on the frontend; Firebase Admin SDK on the API server verifies ID tokens on every request
- All Firestore operations go through the Express API server (not direct client SDK calls) for security
- Admin check is done by email match (`a.alkhdeirat@gmail.com`) on both frontend and backend
- Weekly XP resets should be scheduled externally (e.g. Firebase Scheduled Functions) — the server tracks `xpWeekly` but doesn't auto-reset it
- Answer validation uses string matching (correctAnswer === answerText), not index-based, per requirements

## User preferences

- Arabic-first interface (RTL layout, dir="rtl")
- Emerald/green color palette with gold accents
- No emojis in the UI

## Gotchas

- After OpenAPI spec changes: always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend
- Firebase Firestore requires composite indexes for queries with multiple `.where()` + `.orderBy()` — create them in the Firebase console if you see index errors in logs
- The `leaderboard` route queries users ordered by `xpWeekly`/`xpAnnual` — Firestore needs an index on those fields if querying with a `where` clause simultaneously
