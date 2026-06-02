# Migrate admin auth to the official WorkOS AuthKit (TanStack Start) SDK

## Context

The hand-rolled WorkOS integration has three user-facing defects and one security hole:

1. **Sign-out doesn't end the session.** `logoutServerFn` ([apps/frontend/src/server/auth.ts:130-150](../apps/frontend/src/server/auth.ts)) only expires `wos-session`, never `wos-refresh`, and the backend never revokes the WorkOS session. Navigating back to `/admin/*` triggers a 401 → silent `/api/auth/refresh` → the still-valid refresh cookie re-mints a session → user is logged back in.
2. **Random "token expired" that a reload fixes** + **abrupt bounces to login.** WorkOS refresh tokens are single-use. The dashboard fans out many parallel server fns; when the ~5-min access token is dead they all 401 and each replays the _same_ refresh token. One wins, the rest fail (and WorkOS reuse-detection can revoke the whole session). A failed `me` returns `null` → `/admin` `beforeLoad` redirects to login.
3. **Security:** `WorkosAuthService.verifyToken` ([apps/backend/src/modules/auth/services/workos-auth.service.ts:77-87](../apps/backend/src/modules/auth/services/workos-auth.service.ts)) base64-decodes the JWT and **never verifies the signature** — a forged token with a known user id passes.

**Decision:** Replace the custom layer with `@workos/authkit-tanstack-react-start`. The SDK runs auth on the TanStack Start server: encrypted sealed-cookie sessions, automatic single-flight refresh in middleware (kills #2), and `signOut()` that redirects to WorkOS logout and revokes the session (kills #1). The NestJS backend becomes a pure **resource server** that verifies the WorkOS access token via JWKS (kills #3).

**Locked choices:** Hosted AuthKit UI (redirect — replaces the custom `/auth/*` pages). On first login, auto-provision an org (named from the user's email) + `super_admin` membership, renameable during onboarding step 1.

## Architecture shift

| Concern                | Before                                                       | After                                                                     |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Session store          | backend sets `wos-session`/`wos-refresh` cookies             | SDK sealed cookie on the TanStack Start server (`WORKOS_COOKIE_PASSWORD`) |
| Login UI               | custom `/auth/login` + `/auth/signup` + `/auth/verify-email` | redirect to WorkOS-hosted AuthKit                                         |
| Refresh                | reactive, racy `withRefresh` in api-client                   | automatic in `authkitMiddleware` (no race)                                |
| Logout                 | clear cookies (incomplete)                                   | `signOut()` → WorkOS logout + session revoke                              |
| Backend auth           | `AdminAuthGuard` reads cookie, decodes JWT unsafely          | `AdminAuthGuard` verifies `Authorization: Bearer <accessToken>` via JWKS  |
| Frontend→backend calls | forward raw cookies                                          | attach `Bearer` from `getAuth().accessToken`                              |
| Org/role source        | extra WorkOS API calls per request                           | `org_id` / `role` claims read from the verified token                     |

## Implementation

### 1. Dependencies, env, dashboard

- Frontend: `npm i @workos/authkit-tanstack-react-start` (in `apps/frontend`).
- Backend: `npm i jose` (JWKS verification via `createRemoteJWKSet` + `jwtVerify`).
- Frontend `.env` (server-side, all required): `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback`, `WORKOS_COOKIE_PASSWORD` (`openssl rand -base64 24`, 32+ chars). Keep `VITE_API_URL`.
- Backend keeps `WORKOS_API_KEY`, `WORKOS_CLIENT_ID` (for `getJwksUrl(clientId)` + org management).
- **WorkOS dashboard (manual):** set Redirect URI to the callback URL; set the **Sign-in endpoint** to `http://localhost:3000/api/auth/sign-in`; enable password + Google in AuthKit; (optional) theme the hosted UI.

### 2. Frontend — SDK wiring (new files)

- `apps/frontend/src/start.ts` — `createStart(() => ({ requestMiddleware: [authkitMiddleware()] }))` (named export `startInstance`).
- `apps/frontend/src/routes/api.auth.callback.tsx` — `handleCallbackRoute({ onSuccess, errorRedirectUrl: '/auth/login?error=auth_failed' })`. `onSuccess` is where first-login org provisioning is kicked off (see §6).
- `apps/frontend/src/routes/api.auth.sign-in.tsx` and `api.auth.sign-up.tsx` — 307 redirect to `getSignInUrl` / `getSignUpUrl`, honoring `returnPathname`.
- `apps/frontend/src/routes/__root.tsx` — wrap `<Outlet/>` in `<AuthKitProvider>` (from `/client`) so client hooks work; keep existing head/devtools.
- Regenerate `routeTree.gen.ts` via `npm run build` / `tsr generate` (do not hand-edit).

### 3. Frontend — replace auth pages

- `routes/auth/login.tsx`, `auth/signup.tsx`, `auth/verify-email.tsx`, `auth/route.tsx`: delete the custom forms. Replace `/auth/login` with a loader that `redirect`s to `getSignInUrl`; `/auth/signup` → `getSignUpUrl`. (Keep a thin `/auth/login` route because existing `redirect({ to: '/auth/login' })` call sites point at it — simplest is to have it bounce to the hosted sign-in.)
- `routes/index.tsx`: send unauthenticated visitors to sign-in, authenticated to `/admin/dashboard`.
- Remove the Google button / `VITE_API_URL/api/auth/google` usage (hosted AuthKit owns social login).

### 4. Frontend — guards & logout (replace `me` plumbing)

- Delete `queries/auth.ts` (`meQueryOptions`) and the `getMeServerFn`/`login`/`logout`/`signup`/`verify`/`resend` server fns in `server/auth.ts`.
- `routes/admin/route.tsx` `beforeLoad`: replace `ensureQueryData(meQueryOptions())` with `const { user, organizationId } = await getAuth()`; `if (!user) throw redirect({ href: await getSignInUrl(...) })`. Keep the onboarding-step + `ensureActiveStoreServerFn` logic. Add the no-org bootstrap (see §6).
- `routes/onboarding/route.tsx`: same `getAuth()` guard.
- `components/app-sidebar.tsx`: `handleLogout` → call the SDK `signOut()` (via a `/auth/signout` route loader or the client hook `useAuth().signOut()`), drop `logoutServerFn`/`queryClient.clear()` cookie dance. Display name/role from `useAuth()` instead of `meQueryOptions`.

### 5. Frontend — data layer to Bearer tokens

- `lib/api-client.ts`: delete `withRefresh`/`tryRefresh`/`swapSessionCookie` (the SDK handles refresh). Keep the thin redaxios wrapper but have it accept an `Authorization` header instead of `cookie`. Add a server-only helper `authHeader()` → `const { accessToken } = await getAuth(); return { Authorization: 'Bearer ' + accessToken }`.
- All 10 `apps/frontend/src/server/*.ts` files: replace `headers: { cookie: incomingCookie() }` with `headers: await authHeader()`. This is a mechanical, repeated edit. The store/onboarding cookies (`wos-active-store`, `wos-onboarding-step`) in `server/stores.ts` are unrelated to the WorkOS session — **keep them as-is**; still pass `X-Store-Id` where already done.

### 6. Frontend + backend — org provisioning on first login

Hosted signup has no "organization name" field, and a brand-new user's access token has no `org_id`. Flow:

- New backend endpoint `POST /api/auth/bootstrap` (guarded, Bearer): given the verified token's `sub`, if the user has no org membership, create a WorkOS org (default name derived from email local-part), `super_admin` membership, and the DB `organizations` row — reusing `WorkosAuthService.createOrganization/createMembership` + `TenantService.create` (the same logic in [apps/backend/src/modules/tenant/services/tenant-provisioning.service.ts:17-47](../apps/backend/src/modules/tenant/services/tenant-provisioning.service.ts)). Idempotent. Returns `{ workosOrgId }`.
- In `/admin` `beforeLoad`, when `getAuth()` returns a `user` but no `organizationId`: call `bootstrap`, then `await switchToOrganization({ data: { organizationId: workosOrgId } })` so the sealed session is re-minted with `org_id`, then continue. (Onboarding step 1 already lets them set the real store; add org rename there.)
- `handleCallbackRoute.onSuccess` can pre-warm provisioning, but `/admin` beforeLoad is the idempotent safety net and the place `switchToOrganization` must run.

### 7. Backend — resource-server auth guard

- Rewrite `AdminAuthGuard` ([apps/backend/src/modules/auth/guards/admin-auth.guard.ts](../apps/backend/src/modules/auth/guards/admin-auth.guard.ts)): read `Authorization: Bearer`; verify with `jose` against WorkOS JWKS (`workos.userManagement.getJwksUrl(clientId)` cached in a `createRemoteJWKSet`). Pull `sub`, `org_id`, `role`, `sid` from verified claims. Keep the existing **DB org lookup / auto-insert** (lines 82-98) and `resolveStoreId`/`extractStoreId` logic. Keep the `SKIP_AUTH` dev bypass.
- `WorkosAuthService.verifyToken`: replace the unsafe base64 decode with JWKS verification (or delete and inline in the guard). Keep `getOrganization`, `createOrganization`, `createMembership`, `getOrganizationMembership`, `listOrganizations` (still used for provisioning/`me`-style data). `login`/`refreshSession` become dead → remove.

### 8. Backend — prune obsolete endpoints

- In `auth.controller.ts` remove `login`, `refresh`, `logout`, `signup`, `verify-email`, `resend-verification`, the Google route, and `setSessionCookies`/`clearSessionCookies` (the SDK owns all of this). Add `bootstrap` (§6) and keep `me` (now reads from the verified token/tenant context) for the sidebar if still wanted. Keep API-key endpoints unchanged.
- Drop `cookie-parser` use for admin auth if nothing else needs it (storefront/customer auth is separate — verify before removing).
- Provisioning: the `tenant.created` event + `TenantProvisioningService` are no longer triggered by a backend signup. Either call the same service from the `bootstrap` endpoint or keep the event and emit it from `bootstrap`. Reuse, don't duplicate.

### 9. Cleanup

- Delete dead DTOs (`login.dto.ts`, `signup.dto.ts`, `verify-email.dto.ts`, `resend-verification.dto.ts`) once endpoints are gone.
- Storefront customer auth (`customer-auth.service.ts`, `StorefrontAuthGuard`) is a separate stack — **do not touch**.

## Files (representative)

**New (frontend):** `src/start.ts`, `src/routes/api.auth.callback.tsx`, `api.auth.sign-in.tsx`, `api.auth.sign-up.tsx`, optional `src/routes/auth/signout.tsx`.
**Modified (frontend):** `__root.tsx`, `routes/admin/route.tsx`, `routes/onboarding/route.tsx`, `routes/index.tsx`, `components/app-sidebar.tsx`, `lib/api-client.ts`, all `server/*.ts` (Bearer swap), `.env`.
**Deleted (frontend):** `queries/auth.ts`, custom `routes/auth/login.tsx`/`signup.tsx`/`verify-email.tsx` bodies, auth server fns in `server/auth.ts`.
**Modified (backend):** `guards/admin-auth.guard.ts`, `services/workos-auth.service.ts`, `controllers/auth.controller.ts`, possibly `main.ts`.
**Reused (backend):** `TenantProvisioningService`, `TenantService.create`, `WorkosAuthService` org methods, RBAC guard/decorators.

## Verification

1. `npm run build` (frontend) + `npm run check-types` (root) pass; route tree regenerates.
2. **Fresh signup:** new user → hosted AuthKit → callback → lands in onboarding with an auto-provisioned org; can rename in step 1; reaches dashboard. Confirm a DB `organizations` row + WorkOS membership exist.
3. **Bug #1:** log in, click sign out, then manually type `/admin/dashboard` → must land on hosted sign-in, NOT the dashboard.
4. **Bug #2/#3:** log in, idle past access-token expiry (~5 min, or temporarily shorten), hard-navigate around the dashboard → no "token expired", no surprise bounce to login; session refreshes transparently.
5. **Bug #3 (security):** `curl` a forged `Bearer` token to a `/api/admin/*` route → 401.
6. Existing admin REST calls still carry org scope (products/orders/etc. load for the right tenant).

## Risks / manual steps

- WorkOS dashboard config (Redirect URI, Sign-in endpoint, enabled auth methods) is **manual** and must be done or login 404s/loops.
- `switchToOrganization` sequencing for first-login org context is the fiddliest part — bootstrap must be idempotent and run before the dashboard renders.
- This removes in-app branded auth pages (accepted). Hosted UI is themeable in the dashboard.
- Verify no non-auth consumer depends on `cookie-parser` before removing it.
