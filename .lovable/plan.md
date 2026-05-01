# Secure Password Update with Old-Password Verification

## Current behavior (problem)
On the Settings page, password update only checks:
- New password ≥ 6 characters
- New password matches confirmation
- User has an active session

It does **not** verify the user's current password. The `currentPassword` state exists but is never used or rendered. This means anyone on a logged-in device can silently change the password.

## What we'll build

### 1. New edge function: `update-password`
Path: `supabase/functions/update-password/index.ts`

Responsibilities:
- Require a valid JWT (validate via `getClaims`)
- Accept JSON body: `{ currentPassword, newPassword, confirmPassword }`
- Validate with zod:
  - All fields non-empty
  - `newPassword` ≥ 8 characters (stronger than current 6)
  - `newPassword === confirmPassword`
  - `newPassword !== currentPassword`
- **Verify old password** by calling `supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })` using an anon client. If it fails → return 401 "Current password is incorrect."
- On success, use a **service-role** client to call `supabase.auth.admin.updateUserById(userId, { password: newPassword })`
- Return clear error codes: 400 (validation), 401 (auth / wrong current pw), 500 (server)
- Standard CORS headers on every response (including errors)

### 2. Update `src/pages/Settings.tsx`
- Render the **Current Password** input (already in state, not shown today)
- Replace the direct `supabase.auth.updateUser({ password })` call with `supabase.functions.invoke('update-password', { body: { currentPassword, newPassword, confirmPassword } })`
- Show server-returned error messages in the toast (e.g. "Current password is incorrect")
- Keep client-side checks as a first pass (length, match) for quick UX feedback
- Clear all three fields on success

### 3. Config
- No `supabase/config.toml` change needed — functions deploy with `verify_jwt = false` by default and we validate the JWT in code.
- Uses existing secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (already configured).

## New password criteria (after change)
1. Current password must be provided and correct
2. New password ≥ 8 characters
3. New password = confirm password
4. New password ≠ current password
5. User must have a valid session (JWT)

## Files
- create `supabase/functions/update-password/index.ts`
- edit `src/pages/Settings.tsx` (add Current Password field, switch to edge function call)

## Out of scope
- Password strength rules beyond length (can add HIBP check later via `configure_auth` if desired)
- Email notification on password change
