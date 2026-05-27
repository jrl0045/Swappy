# CLAUDE.md

Guidance for AI assistants working in this repository.

## Project Overview

**Swappy** is a mobile-first peer-to-peer **short-term rental marketplace** (Wallapop-style, but for renting objects rather than selling them). Users list items they own (tools, cameras, camping gear, etc.) and rent items from people nearby. It is a TFG (final degree project) for DAM 2025-2026.

The app is a **single-page React app** with **Supabase** as the entire backend (Postgres + Auth + Storage + Realtime). It is also packaged as a native mobile app via **Capacitor** (iOS + Android).

The product/UI language is **Spanish**; the codebase has an English/Spanish i18n layer (`es` is the default).

## Tech Stack

- **React 19** + **TypeScript** (`~5.8`), bundled with **Vite 6**
- **TailwindCSS v4** (via `@tailwindcss/vite`, no `tailwind.config.js` — utilities used inline)
- **Framer Motion** — imported as `motion/react` (the `motion` package), NOT `framer-motion`
- **lucide-react** for icons, **recharts** for charts (financial reports)
- **Supabase** (`@supabase/supabase-js`) — database, auth, storage, realtime
- **Capacitor 8** — native iOS/Android shells in `ios/` and `android/`
- **Nominatim (OpenStreetMap)** for free geocoding — no API key

## Commands

```bash
npm install          # install deps
npm run dev          # vite dev server on port 3000, host 0.0.0.0
npm run build        # production build to dist/
npm run preview      # preview the build
npm run lint         # tsc --noEmit  ← this is the ONLY check; there is NO ESLint, NO test suite
npm run clean        # rm -rf dist

# Capacitor (native)
npm run sync         # build + npx cap sync
npm run open:ios     # open ios project in Xcode
npm run open:android # open android project in Android Studio
npm run dev:ios      # cap run ios with live-reload
npm run dev:android  # cap run android with live-reload
```

**Before reporting work done, run `npm run lint`** (it runs `tsc --noEmit`). There is no test framework and no linter configured, so type-checking is the only automated gate.

## Environment Variables

Create a `.env` (gitignored) with:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`src/lib/supabase.ts` throws at startup if either is missing. `GEMINI_API_KEY` is wired into vite config (`process.env.GEMINI_API_KEY`) but not currently used in app code.

## Architecture & Key Conventions

### Navigation: no router
There is **no react-router**. `src/App.tsx` (`AppContent`) holds a single `view` string in state (`'home' | 'item' | 'publicProfile' | 'profile' | 'favorites' | 'admin' | 'messages'`) and conditionally renders the matching component inside an `AnimatePresence`. Navigation = calling `setView(...)`. Deep links use a `?item=<uuid>` query param parsed on mount, then cleared with `history.replaceState`.

To add a "page", add a new `view` value and a corresponding `motion.div` block in `AppContent`.

### Providers
`App` wraps the tree in this order: `LanguageContext.Provider` → `AuthProvider` → `ToastProvider` → `AppContent`.

- **`useAuth()`** (`src/context/AuthContext.tsx`) — exposes `user`, `session`, `profile`, `loading`, `signOut`, `refreshProfile`. It listens to `supabase.auth.onAuthStateChange`, and `ensureProfile` auto-creates a `profiles` row on first login. **Banned users are force-signed-out** here. Note: `onAuthStateChange` callbacks must NOT be async (fire-and-forget pattern is used).
- **`useToast()`** (`src/context/ToastContext.tsx`) — `showToast(message, type?, duration?)`; types: `'success' | 'like' | 'follow' | 'info'`.
- **`useLanguage()`** (`src/LanguageContext.ts`) — `{ lang, setLang, t }`. `t(key)` looks up `src/i18n.ts` translations. Add new strings to BOTH `en` and `es` objects in `i18n.ts`.

### Auth gating
`requireAuth(action)` in `App.tsx` opens the auth modal if there is no `user`, otherwise runs the action. Use this pattern for any action requiring login (listing, messaging, favorites, etc.).

### Data layer — `src/lib/api.ts`
**All Supabase access should go through `src/lib/api.ts`** (~800 lines, one module of exported async functions). Components call these functions; they do not build Supabase queries inline (the realtime subscriptions in `hooks/useUnreadCounts.ts` and a few `auth` calls are the exceptions).

Key conventions in `api.ts`:
- **DB row types** (`snake_case`) live in `src/lib/database.types.ts` as `DbProfile`, `DbItem`, `DbRental`, etc.
- **App/domain types** (`camelCase`) live in `src/data.ts` (`RentalItem`, `Owner`, `Category`, ...).
- **Converter functions** (`dbItemToRentalItem`, `dbProfileToOwner`) translate DB rows → domain objects. When adding a column, update the DB type, the converter, and the domain type together.
- Functions are grouped by section with `// ─── Section ───` comment banners: Items, Rentals, Reviews, Profiles, Messages, Follows/Likes, Notifications, Admin, Payouts.
- Read functions generally `console.error` and return `[]`/`null` on error; write functions `throw`.
- **Visibility rule** (in `fetchItems`): an item is shown if it is active AND its owner is not banned, OR the current user is the owner.

### Realtime
`src/hooks/useUnreadCounts.ts` subscribes to `postgres_changes` on `messages`, `rentals`, and `notifications` channels to keep unread badges live and fire toasts. `api.subscribeToMessages` is used by the chat view. Remember to `unsubscribe()` in effect cleanup.

### Components
Flat folder `src/components/*.tsx`, named exports, PascalCase files. Modals are conditionally rendered in `App.tsx` inside `AnimatePresence`. Admin screens (`AdminPanel`, `AdminConversations`, `AdminPayouts`, `AdminReports`) are gated by `profile.isAdmin`. Styling is inline Tailwind classes; the brand background is `#F9FAFB`.

## Database / Supabase

There is **no Supabase CLI migration setup**. SQL lives in `supabase/` as manually-numbered scripts run by hand in the Supabase Dashboard → SQL Editor, **in order**:

1. `schema.sql` — base tables: `profiles`, `items`, `rentals`, `messages` + storage buckets `FotosPerfil`, `FotosProductos`
2. `schema_v2.sql` — `reviews`, `user_reviews` (3-factor rating), bucket `item-images`
3. `schema_v3.sql` — geolocation (`lat`, `lng`, `pickup_address` on items)
4. `schema_v4.sql` — `follows`, `likes` tables
5. `schema_v5.sql` — counter columns + triggers (`likes_count`, `followers_count`, `following_count`), `notifications` table + realtime
6. `supabase_payouts_setup.sql` — `payout_requests` table + `rentals.payout_request_id`
7. `seed.sql` — optional sample data

**When you change the schema:** add a NEW `schema_vN.sql` (additive, use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) rather than editing earlier files, and update `src/lib/database.types.ts` + the relevant `api.ts` converters to match.

**RLS note:** most policies are intentionally **open ("Public ...")** for development. `notifications` and `payout_requests` use proper `auth.uid()`-based policies. Don't assume RLS enforces ownership on the older tables.

### Core tables (see `class.diagram.md` for the full ER/class diagram)
`profiles`, `items`, `rentals`, `messages`, `reviews` (item reviews), `user_reviews` (renter↔owner ratings), `follows`, `likes`, `notifications`, `payout_requests`. Admin/ban flags live on `profiles` (`is_admin`, `is_banned`); item soft-hide via `is_active`.

## Domain Flows (use-case shorthand seen in comments)

- Rental request → owner approves/rejects from chat → renter clicks **Finalizar** (`completeRental`, CU14) which marks rental completed and re-activates the item.
- On completion, **3-factor rating** (CU15/16/17): item, owner, and renter are rated via `reviews` / `user_reviews`.
- Payouts: owner requests payout of unpaid completed rentals (commission deducted); admin marks `in_progress` / `paid`.

## Conventions for Edits

- Match the existing inline-Tailwind, named-export, function-component style.
- Keep all new Supabase queries inside `src/lib/api.ts` behind a typed exported function.
- Add user-facing strings to `src/i18n.ts` (both `en` and `es`) and render via `t(...)`.
- Import animations from `motion/react`, not `framer-motion`.
- Comments in the codebase are frequently in Spanish — that's fine; match the surrounding file.
- Run `npm run lint` (tsc) before considering a change complete.

## Git / Workflow

- Active development branch for AI tasks: **`claude/claude-md-docs-HFZIO`**. Develop, commit, and push there; never push to `main` without explicit permission.
- Do not create a pull request unless explicitly asked.
