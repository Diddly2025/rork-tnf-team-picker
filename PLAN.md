# User Authentication System (Supabase Auth)

## Overview
Add complete user authentication to PlayDay using Supabase Auth, replacing the placeholder `getDefaultUserId()` with real authenticated user IDs.

## Completed

- [x] **Supabase client updated** — Added AsyncStorage-based session persistence, auto-refresh tokens, `getAuthUserId()` helper
- [x] **AuthProvider context** — Created `context/AuthContext.tsx` with session state, `signIn`, `signUp`, `signOut`, `resetPassword` methods using `createContextHook`
- [x] **Login screen** — `app/login.tsx` with email/password fields, PlayDay branding, error handling, links to register and forgot password
- [x] **Register screen** — `app/register.tsx` with email, password, confirm password, email confirmation flow
- [x] **Forgot Password screen** — `app/forgot-password.tsx` with email input, success state after sending reset email
- [x] **App layout auth routing** — `app/_layout.tsx` updated with `useProtectedRoute()` guard that redirects unauthenticated users to login, and authenticated users away from auth screens
- [x] **Replaced getDefaultUserId()** — `utils/supabaseSync.ts` now uses `supabase.auth.getUser()` to get the real authenticated user ID for all Supabase writes
- [x] **Logout button** — Added to the Cloud tab in Finance screen with confirmation dialog, shows signed-in email
- [x] **Session persistence** — Supabase sessions stored in AsyncStorage, users stay logged in between app restarts
- [x] **Error handling** — Clear messages for wrong credentials, already registered email, password mismatch, network errors

## Files Changed
- `utils/supabase.ts` — Auth session persistence config, `getAuthUserId()` export
- `context/AuthContext.tsx` — New auth context provider
- `app/_layout.tsx` — Auth provider wrapping, protected route guard, splash screen tied to auth check
- `app/login.tsx` — New login screen
- `app/register.tsx` — New register screen
- `app/forgot-password.tsx` — New forgot password screen
- `utils/supabaseSync.ts` — Replaced `getDefaultUserId()` with async `getAuthUserId()` using real Supabase auth
- `app/(tabs)/finance/index.tsx` — Added logout button and auth context usage in Cloud tab
