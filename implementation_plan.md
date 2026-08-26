# Comprehensive UI/UX Upgrade Plan

Streamline workflows, organize settings navigation, eliminate jarring page reloads on organization switch, decouple card navigation from actions, and harmonize database service controls.

## User Review Required

> [!NOTE]
> All changes are strictly UI/UX, accessibility, and client-side flow enhancements with zero database migrations or backend breaking changes.

## Proposed Changes

### 1. Kill "Confirmation Fatigue" (Streamline Routine Actions)
Remove intrusive confirmation dialogs for routine, non-destructive actions (`Deploy`, `Reload`, `Rebuild`, `Start`), while retaining confirmation dialogs exclusively for destructive/interruptive actions (`Stop`, `Delete`).

#### [MODIFY] [application/general/show.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/application/general/show.tsx)
- Convert `Deploy`, `Reload`, `Rebuild`, and `Start` from `<DialogAction>` modals into direct 1-click buttons with tooltip descriptions and active spinner states.
- Keep `Stop` inside `<DialogAction type="destructive">`.
- Fix Tooltip hierarchy to wrap Button via `asChild`.

#### [MODIFY] [postgres/general/show-general-postgres.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/postgres/general/show-general-postgres.tsx)
#### [MODIFY] [mysql/general/show-general-mysql.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/mysql/general/show-general-mysql.tsx)
#### [MODIFY] [mariadb/general/show-general-mariadb.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/mariadb/general/show-general-mariadb.tsx)
#### [MODIFY] [mongo/general/show-general-mongo.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/mongo/general/show-general-mongo.tsx)
#### [MODIFY] [redis/general/show-general-redis.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/redis/general/show-general-redis.tsx)
#### [MODIFY] [libsql/general/show-general-libsql.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/libsql/general/show-general-libsql.tsx)
- Streamline database `Deploy`, `Reload`, and `Start` to direct 1-click actions.
- Keep `Stop` confirmation dialog.
- Clean up tooltips and ensure error toast forwarding.

---

### 2. Restructure the 25-Item Settings Sidebar
Group the 20+ flat settings items into 4 structured, collapsible categories:
- **Account & Access**: Profile, Sessions, Users, SSH Keys, SSO, License, Billing
- **Infrastructure**: Remote Servers, Web Server, Deployments, AI
- **Integrations**: Git Providers, Registry, Secrets, DNS Providers, S3 Destinations, Certificates, Notifications
- **Workspace**: Tags, Audit Logs, Whitelabeling

#### [MODIFY] [side.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/layouts/side.tsx)
- Group `settings` menu items in `MENU.settings` into grouped collapsible sections using the existing `NavItem` (`isSingle: false`) group structure.

---

### 3. SPA Organization Switching (No Hard Browser Reload)
Eliminate jarring `window.location.reload()` on active organization switch.

#### [MODIFY] [side.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/layouts/side.tsx)
- Replace `window.location.reload()` with `await utils.invalidate()`, toast confirmation, and router refresh/navigation.

---

### 4. Decouple Card Navigation & Event Propagation in Projects Overview
Fix the invalid nesting where entire cards are wrapped in `<Link>` while containing nested Dropdown menus and Dialog triggers.

#### [MODIFY] [projects/show.tsx](file:///c:/Aboalia/Dokploy/apps/dokploy/components/dashboard/projects/show.tsx)
- Move `<Card>` to be the outer element.
- Make the card title and content link to the project dashboard using a dedicated link, while keeping the kebab actions dropdown independent at the top-right without event collisions.

---

## Verification Plan

### Automated Tests
- Run TypeScript typecheck: `pnpm --filter dokploy typecheck` (`tsc --noEmit`).
- Run Biome format and check: `pnpm --filter dokploy format`.

### Manual Verification
- Test 1-click Deploy, Rebuild, and Reload in an application service without confirmation dialogs.
- Test that Stop action continues to ask for confirmation.
- Inspect the Settings sidebar to verify collapsible categories expand/collapse smoothly and show active indicator.
- Switch active organization in the selector and confirm query invalidation happens without a full-page white flash.
- Click actions dropdown on project cards and confirm it opens without triggering project page navigation.
