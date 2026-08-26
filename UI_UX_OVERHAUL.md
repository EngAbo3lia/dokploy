# Dokploy UI/UX Overhaul Plan — Vercel-Tier Quality

## Target: Web dashboard (React/Next.js, shadcn/ui, Tailwind CSS v4)
## Stack: Next.js 16 Pages Router, tRPC, shadcn/ui (radix-nova), Inter font, Lucide icons
## Goal: Transform from functional-but-generic to premium, polished, confidence-inspiring dashboard

---

## PART 1: DESIGN SYSTEM

### 1A. Color Palette — "Slate with Intent"

**Current problem:** Purely neutral/monochrome. No brand identity. Every SaaS dashboard is boring when it's just grays.

**Direction:** Like Vercel — neutral base with a subtle indigo/slate-blue brand accent. The accent is used sparingly: selected states, active indicators, primary CTAs. Everything else stays neutral.

```css
/* Light Mode */
:root {
  --background: 0 0% 100%;           /* white */
  --foreground: 222 47% 11%;         /* near-black, slightly blue-tinted */
  --card: 0 0% 100%;                 /* white */
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  /* Brand accent — used for active states, links, primary CTAs */
  --primary: 226 70% 55%;            /* indigo-blue #3b5bdb → Vercel blue feel */
  --primary-foreground: 0 0% 100%;

  /* Subtle backgrounds */
  --secondary: 220 14% 96%;          /* very light blue-gray */
  --secondary-foreground: 222 47% 11%;
  --muted: 220 14% 96%;
  --muted-foreground: 216 12% 45%;
  --accent: 220 14% 96%;
  --accent-foreground: 222 47% 11%;

  /* Semantic */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --success: 142 71% 45%;            /* green-500 for running/healthy */
  --warning: 38 92% 50%;             /* amber-500 for degraded/warning */
  --info: 221 83% 53%;               /* blue-500 for info/deploying */

  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 226 70% 55%;               /* match primary */
  --radius: 0.5rem;
}

/* Dark Mode */
.dark {
  --background: 224 71% 4%;          /* very dark blue-black */
  --foreground: 213 31% 91%;         /* light gray */
  --card: 224 50% 8%;                /* slightly lighter than bg */
  --card-foreground: 213 31% 91%;
  --popover: 224 50% 8%;
  --popover-foreground: 213 31% 91%;

  --primary: 226 70% 60%;            /* brighter blue in dark mode */
  --primary-foreground: 0 0% 100%;

  --secondary: 223 45% 13%;
  --secondary-foreground: 213 31% 91%;
  --muted: 223 45% 13%;
  --muted-foreground: 215 20% 55%;
  --accent: 223 45% 13%;
  --accent-foreground: 213 31% 91%;

  --destructive: 0 63% 55%;
  --destructive-foreground: 0 0% 100%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --info: 221 83% 58%;

  --border: 223 45% 16%;
  --input: 223 45% 16%;
  --ring: 226 70% 60%;
}
```

**Semantic status colors (Tailwind utility classes):**
| State | Light | Dark | Usage |
|---|---|---|---|
| Running/Healthy | `bg-emerald-500` | `bg-emerald-400` | Container running, service healthy |
| Stopped | `bg-zinc-400` | `bg-zinc-500` | Container stopped intentionally |
| Failed/Error | `bg-red-500` | `bg-red-400` | Build failed, crash |
| Degraded | `bg-amber-500` | `bg-amber-400` | Some containers down |
| Deploying | `bg-blue-500` | `bg-blue-400` | Build in progress |
| Pending/Queued | `bg-zinc-300` | `bg-zinc-600` | In queue |

### 1B. Typography Scale

**Current:** Inter 400/500/600/700 — good choice, keep it.
**Change:** Tighter heading line-heights, more deliberate size hierarchy.

| Token | Size | Leading | Weight | Usage |
|---|---|---|---|---|
| `display` | 2rem (32px) | 1.2 | 700 | Page titles ("Welcome back") |
| `h1` | 1.5rem (24px) | 1.3 | 600 | Section headings |
| `h2` | 1.125rem (18px) | 1.4 | 600 | Card headings |
| `h3` | 0.875rem (14px) | 1.4 | 600 | Subsection headings |
| `body` | 0.875rem (14px) | 1.5 | 400 | Default text (unchanged) |
| `caption` | 0.75rem (12px) | 1.5 | 400 | Timestamps, metadata |
| `mono` | 0.8125rem (13px) | 1.6 | 400 | Code, IDs, tokens |

### 1C. Spacing Scale (keep Tailwind defaults)

| Token | Value | Usage |
|---|---|---|
| `1` | 4px | Tight inline gaps |
| `2` | 8px | Standard inline gaps |
| `3` | 12px | Form field gaps |
| `4` | 16px | Card content gaps |
| `5` | 20px | Card internal padding |
| `6` | 24px | Section padding |
| `8` | 32px | Page section gaps |
| `10` | 40px | Page outer padding |
| `12` | 48px | Major section separators |

### 1D. Radius Scale

| Token | Value | Usage |
|---|---|---|
| `sm` | 6px | Badges, chips, small buttons |
| `md` | 8px | Buttons, inputs, standard elements |
| `lg` | 10px | Cards, panels, dialogs |
| `xl` | 12px | Feature cards, hero sections |
| `2xl` | 16px | Modals, large panels |
| `full` | 9999px | Status dots, avatars, pills |

### 1E. Shadow System

```css
/* Cards — subtle elevation */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* Focus ring */
--ring: 0 0 0 2px var(--background), 0 0 0 4px var(--primary);
```

**Usage:**
- Default card: `shadow-xs` + `ring-1 ring-border`
- Hover card: `shadow-sm` + `ring-1 ring-border/50`
- Popover/dropdown: `shadow-lg`
- Dialog: `shadow-xl`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

---

## PART 2: COMPONENT IMPROVEMENTS

### 2A. Skeleton Loading System (NEW)

**Current problem:** 5 different loading patterns. Spinner, pulse div, text, or nothing.
**Solution:** Create a `SkeletonGroup` component + page-level skeleton screens.

**New file: `components/shared/skeleton-card.tsx`**
```tsx
// Reusable skeleton for cards, tables, lists
export function SkeletonCard({ lines = 3, className }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 space-y-3", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="p-4 border-b">
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn("h-3", j === 0 ? "w-1/4" : "w-1/6")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="space-y-2 pb-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

**Apply to every page that currently shows "Loading..." spinner:**
- `dashboard/home.tsx` — SkeletonStatCard x4 + SkeletonTable
- `dashboard/projects.tsx` — SkeletonCard x6 (grid)
- `dashboard/project/[projectId]/...` — SkeletonStatCard x4 + SkeletonCard x3
- `dashboard/monitoring.tsx` — SkeletonChart x3
- `dashboard/docker.tsx` — SkeletonTable
- All settings pages — SkeletonCard x2
- All service detail pages — SkeletonCard x3

### 2B. Empty State Component (NEW)

**Current problem:** Each page builds its own inconsistent empty state.
**Solution:** Standardized `EmptyState` component.

**New file: `components/shared/empty-state.tsx`**
```tsx
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,           // { label, onClick } or { label, href }
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-2xl bg-muted p-4 mb-4">
        <Icon className="size-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}
```

**Replace all ad-hoc empty states across:**
- Projects list: `<EmptyState icon={FolderInput} title="No projects yet" description="..." action={{ label: "Create Project", onClick: openCreate }} />`
- Home deployments: `<EmptyState icon={Rocket} ... />`
- Services list: `<EmptyState icon={Server} ... />`
- Docker containers: `<EmptyState icon={Container} ... />`
- Domains list: `<EmptyState icon={Globe} ... />`
- Tags: `<EmptyState icon={Tag} ... />`
- etc. (~15 locations)

### 2C. Error Boundary (NEW)

**Current problem:** No error boundaries. JS errors crash the whole page.
**Solution:** Page-level and section-level error boundaries.

**New file: `components/shared/error-boundary.tsx`**
```tsx
export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Try again</Button>
        <Button onClick={() => window.location.href = '/dashboard/home'}>Go home</Button>
      </div>
    </div>
  );
}
```

**Wrap in `_app.tsx` at page level + wrap individual dashboard sections.**

### 2D. Card System Overhaul

**Current:** Cards are flat with `shadow-md` or `ring-1 ring-border`. No hover states.
**New system:**

```tsx
// Standard card wrapper — used everywhere
<Card className="bg-card rounded-xl shadow-xs ring-1 ring-border transition-all duration-200 hover:shadow-sm hover:ring-border/50">
  <CardContent className="p-6">
    ...
  </CardContent>
</Card>
```

**Stat cards (dashboard home, project overview):**
```tsx
<Card className="bg-card rounded-xl shadow-xs ring-1 ring-border p-5 transition-all duration-200 hover:shadow-sm">
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projects</p>
  <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
  <p className="text-xs text-muted-foreground mt-1">+2 this week</p>
</Card>
```

**Action cards (service cards, project cards):**
- Left: colored status dot or icon
- Center: title + metadata
- Right: action button + chevron
- Hover: background shift from `bg-card` to `bg-muted/30`, subtle shadow increase

### 2E. Table Overhaul

**Current tables:** Flat, no hover, no alternating rows, inconsistent headers.
**New system:**

```tsx
// Table header
<TableHeader>
  <TableRow className="hover:bg-transparent border-b border-border">
    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider h-10">Name</TableHead>
    ...
  </TableRow>
</TableHeader>

// Table body
<TableBody>
  {items.map((item) => (
    <TableRow key={item.id} className="group cursor-pointer transition-colors hover:bg-muted/50">
      <TableCell className="py-3">{item.name}</TableCell>
      ...
    </TableRow>
  ))}
</TableBody>
```

**Key changes:**
- Header row: uppercase tracking-wider text-xs font-medium text-muted-foreground
- Body rows: py-3 (tighter), hover:bg-muted/50, group for child hover effects
- Status cells: colored dot + text (not just colored text)
- Timestamp cells: `<DateTooltip>` with relative + absolute
- Action column: visible on hover only (opacity-0 group-hover:opacity-100 transition)

### 2F. Status Indicator System (Standardize)

**Current:** Different pages use different status patterns (colored dots, badges, text, icons).
**New system:**

```tsx
// Status dot — compact inline indicator
function StatusDot({ status, size = "sm" }) {
  const colors = {
    running: "bg-emerald-500",
    healthy: "bg-emerald-500",
    stopped: "bg-zinc-400 dark:bg-zinc-500",
    failed: "bg-red-500",
    error: "bg-red-500",
    degraded: "bg-amber-500",
    deploying: "bg-blue-500 animate-pulse",
    pending: "bg-zinc-300 dark:bg-zinc-600",
    idle: "bg-zinc-300 dark:bg-zinc-600",
    done: "bg-emerald-500",
    cancelled: "bg-zinc-400 dark:bg-zinc-500",
  };
  return (
    <span className={cn(
      "rounded-full inline-block",
      size === "sm" ? "size-2" : "size-2.5",
      colors[status] || "bg-zinc-300"
    )} />
  );
}

// Status badge — for labels
function StatusBadge({ status }) {
  const config = {
    running: { label: "Running", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    failed: { label: "Failed", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
    deploying: { label: "Deploying", className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    // ... etc
  };
  const { label, className } = config[status] || { label: status, className: "" };
  return <Badge variant="outline" className={cn("gap-1.5 font-medium", className)}><StatusDot status={status} />{label}</Badge>;
}
```

**Replace all ad-hoc status patterns across ~30+ locations.**

### 2G. Button Polish

**Current:** shadcn default button styles. Works but feels generic.
**New additions:**

```tsx
// Add transition + subtle shadow to all buttons
<button className="... transition-all duration-150 active:scale-[0.98]">
  Deploy
</button>
```

**Specific patterns:**
- Primary CTA: `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98]`
- Destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90`
- Ghost hover: `hover:bg-muted hover:text-foreground`
- All buttons: `transition-all duration-150` + `disabled:opacity-50 disabled:pointer-events-none`

### 2H. Input/Form Polish

**Current:** Default shadcn inputs.
**New additions:**
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Error state: `border-destructive focus-visible:ring-destructive/50`
- All form fields: `transition-colors duration-150`
- Labels: `text-sm font-medium text-foreground` (consistent)
- Descriptions: `text-xs text-muted-foreground mt-1`
- Error messages: `text-xs text-destructive mt-1`

---

## PART 3: PAGE-BY-PAGE IMPROVEMENTS

### 3A. Login Page (`pages/index.tsx`)
**Current:** Standard form. Works fine.
**Improvements:**
- Center card with subtle gradient background
- Add subtle animated gradient or dot pattern to the background
- Logo + tagline above the form
- Form card: `rounded-2xl shadow-lg ring-1 ring-border`
- Button: full-width, loading spinner on submit
- Social login buttons: outlined style, consistent with primary
- Add keyboard shortcut hint: "Press Enter to sign in"
- Error state: inline alert, not toast

### 3B. Dashboard Home (`pages/dashboard/home.tsx`)
**Current:** Stat cards + recent deployments list.
**Improvements:**
- **Stat cards:** Consistent height, subtle hover shadow, trending indicator (↑↓ arrows with %)
- **Recent deployments list:** 
  - Each row: status dot + project name + service name + git commit + relative time
  - Click to navigate to deployment detail
  - Add "View all" link with count badge
- **Status overview:** Replace text with visual bar (green/yellow/red segments)
- **Quick actions:** "Deploy all", "New project" floating action cards at top
- **Welcome section:** Remove or make dismissible. Add server health summary instead.

### 3C. Projects List (`pages/dashboard/projects.tsx`)
**Current:** Grid of project cards with health badges.
**Improvements:**
- **Card layout:** Consistent 280px min-width cards
- **Card content:** Project name (bold) + service count + environment count + last deploy time
- **Health badge:** Colored dot + text, not just colored background
- **Hover state:** Subtle elevation change, show quick actions (Settings, Deploy)
- **Empty state:** Eye-catching illustration or icon with CTA
- **Filter bar:** Sticky, with search + sort + tag filter
- **Create button:** Primary CTA, always visible in header

### 3D. Project Overview (`components/dashboard/project/project-overview.tsx`)
**Current:** Health card + services grid.
**Improvements:**
- **Health card:** Visual health bar (not just numbers), animated status dot
- **Services grid:** Card per service with: name, status dot, type icon, last deploy time, quick deploy button
- **Domains section:** Domain list with SSL status badges
- **Deployments timeline:** Visual timeline with status markers

### 3E. Environment Page (`pages/dashboard/project/[projectId]/environment/[environmentId].tsx`)
**Current:** Tabbed interface (Overview, Services, Deployments, Logs, Monitoring, Configuration)
**Improvements:**
- **Tab bar:** Underline style tabs (not pill/rounded), consistent with Vercel
- **Overview:** Status summary cards + container health grid
- **Services:** Card grid with status, type, last deploy
- **Deployments:** Our new table with search/filter — already good
- **Logs:** Full-height log viewer with timestamps and levels
- **Header:** Project name > Environment > Service breadcrumb, always visible

### 3F. Service Detail Pages (Application, Compose, Database)
**Current:** Tabbed interface (Overview, Deployments, Logs, Configuration with sub-tabs)
**Improvements:**
- **Header:** Service name + type badge + status badge + Deploy/Stop/Restart buttons
- **Tab bar:** Consistent underline tabs
- **Overview tab:** 
  - Quick stats (CPU, Memory, Uptime) in stat cards
  - Recent deployments list
  - Domain list with SSL/DNS badges
  - Container health grid
- **Configuration tab:**
  - Sub-tabs: left sidebar navigation (like Vercel project settings)
  - OR: horizontal scrollable tabs
  - Each sub-section: clear heading, description, form fields

### 3G. Settings Pages (`pages/dashboard/settings/*`)
**Current:** 22 settings pages, each with its own card layout.
**Improvements:**
- **Settings layout:** Left sidebar navigation (like Vercel settings) OR grouped cards on a single page
- **Each setting section:**
  - Section heading with description
  - Card with form fields
  - Save button at bottom
  - Success toast on save
- **Consistent patterns:**
  - All forms use same spacing (space-y-6)
  - All buttons same position (bottom-right or bottom-full-width)
  - All descriptions same style (text-sm text-muted-foreground)

### 3H. Docker Pages (`pages/dashboard/docker.tsx` + sub-pages)
**Current:** Complex multi-section page with containers, images, volumes, networks, etc.
**Improvements:**
- **Container list:** Table with status dot, name, image, ports, CPU/Memory, actions
- **Image list:** Table with name, tag, size, created, actions
- **Volume list:** Table with name, driver, mountpoint, size, actions
- **Network list:** Table with name, driver, scope, containers, actions
- **All tables:** Consistent header styling, hover rows, action column
- **Health section:** Visual health dashboard with charts

### 3I. Monitoring Page (`pages/dashboard/monitoring.tsx`)
**Current:** Charts for CPU, Memory, etc.
**Improvements:**
- **Time range selector:** Preset buttons (1h, 6h, 24h, 7d, 30d) + custom
- **Chart cards:** Consistent sizing, loading skeletons
- **Empty state:** "No metrics available — configure monitoring service"
- **Export:** Download chart data as CSV

### 3J. Schedules Page (`pages/dashboard/schedules.tsx`)
**Current:** List of cron jobs.
**Improvements:**
- **Schedule cards:** Name, cron expression (with human-readable preview), next run, last run, status
- **Actions:** Edit, Run now, Delete with confirmation
- **Empty state:** "No schedules configured"

### 3K. Sidebar (`components/layouts/side.tsx`)
**Current:** 1257 lines, floating variant, collapsible.
**Improvements:**
- **Active state:** Left border accent (blue bar) + background tint
- **Group headers:** Uppercase tracking-wider, smaller font
- **Hover state:** Smooth background transition
- **Version badge:** Move to footer, smaller
- **Organization selector:** Cleaner dropdown
- **Breadcrumb:** Better styling, more prominent
- **Collapse animation:** Smoother transition

---

## PART 4: MICRO-INTERACTIONS & POLISH

### 4A. Transitions
```css
/* Global transition defaults */
* {
  transition-property: color, background-color, border-color, box-shadow, opacity;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Page transitions */
.page-enter { opacity: 0; transform: translateY(4px); }
.page-enter-active { opacity: 1; transform: translateY(0); transition: all 200ms ease-out; }
```

### 4B. Hover Effects
- **Cards:** `hover:shadow-sm hover:ring-border/50 transition-all duration-200`
- **Table rows:** `hover:bg-muted/50 transition-colors`
- **Buttons:** `active:scale-[0.98] transition-transform duration-150`
- **Links:** `hover:text-foreground transition-colors`
- **Status dots:** `hover:scale-125 transition-transform` (when clickable)

### 4C. Loading States
- **Page load:** Skeleton screens (not spinners)
- **Data fetch:** Skeleton for the specific section
- **Action submit:** Button loading spinner + disabled state
- **Optimistic updates:** Immediate UI update, then confirm

### 4D. Keyboard Navigation
- All interactive elements: visible focus ring (`focus-visible:ring-2 focus-visible:ring-ring`)
- Tab order: logical, follows visual layout
- Escape: close modals/popovers
- Enter/Space: activate buttons
- Arrow keys: navigate within tab groups, selects

### 4E. Accessibility
- All colors: minimum 4.5:1 contrast ratio (WCAG AA)
- All images: alt text
- All forms: labels + descriptions
- All interactive: keyboard accessible
- Screen reader: aria-labels on icon buttons
- Reduced motion: respect `prefers-reduced-motion`

---

## PART 5: IMPLEMENTATION PHASES

### Phase 1: Foundation (Design System) — 2 days
**Files to edit:**
- `styles/globals.css` — New color palette, shadows, remove duplicate variables
- `components/shared/skeleton-card.tsx` — NEW: skeleton components
- `components/shared/empty-state.tsx` — NEW: empty state component
- `components/shared/error-boundary.tsx` — NEW: error boundary
- `components/shared/status-indicator.tsx` — NEW: status dot + badge system
- `components/ui/button.tsx` — Add transitions + active states
- `components/ui/input.tsx` — Add focus ring + transitions
- `components/ui/card.tsx` — Add hover states + shadows
- `components/ui/table.tsx` — Add hover rows + consistent styling
- `components/ui/badge.tsx` — Add status variants

### Phase 2: Layout & Navigation — 1 day
**Files to edit:**
- `components/layouts/side.tsx` — Active state, hover effects, group styling
- `components/layouts/dashboard-layout.tsx` — Page transition wrapper
- `components/layouts/user-nav.tsx` — Polish dropdown
- `pages/_app.tsx` — Add error boundary wrapper

### Phase 3: Dashboard Home + Projects — 2 days
**Files to edit:**
- `pages/dashboard/home.tsx` — Skeleton loading, stat cards, status bar
- `components/dashboard/home/show-home.tsx` — New layout
- `pages/dashboard/projects.tsx` — Skeleton loading, card polish
- `components/dashboard/projects/show.tsx` — Card hover, empty state
- `components/dashboard/projects/handle-project.tsx` — Dialog polish

### Phase 4: Project + Environment Pages — 2 days
**Files to edit:**
- `components/dashboard/project/project-overview.tsx` — Health cards, skeleton
- `components/dashboard/project/project-health-summary.tsx` — Status bar
- `components/dashboard/project/project-health.ts` — Status logic
- `components/dashboard/project/project-deployments.tsx` — Deployment list
- `pages/dashboard/project/[projectId]/environment/[environmentId].tsx` — Tab bar, header

### Phase 5: Service Detail Pages — 3 days
**Files to edit:**
- `components/dashboard/compose/compose-overview.tsx` — Overview polish
- `components/dashboard/compose/compose-configuration-tabs.tsx` — Config tabs
- `components/dashboard/compose/general/show.tsx` — General tab
- `components/dashboard/application/general/show.tsx` — Application general
- `components/dashboard/application/deployments/show-deployments.tsx` — Deployment list
- `components/dashboard/deployment/deployment-detail.tsx` — Detail page polish
- `components/dashboard/deployment/deployment-timeline.tsx` — Timeline polish
- `components/dashboard/application/domains/show-domains.tsx` — Domain cards
- All database service pages (postgres, mysql, mongo, redis, etc.)

### Phase 6: Docker + Monitoring + Settings — 2 days
**Files to edit:**
- `pages/dashboard/docker.tsx` — Table overhaul
- `components/dashboard/docker/` — All docker sub-components
- `pages/dashboard/monitoring.tsx` — Chart cards, time range
- `pages/dashboard/schedules.tsx` — Schedule cards
- `pages/dashboard/traefik.tsx` — Table overhaul
- `pages/dashboard/requests.tsx` — Table overhaul
- All `pages/dashboard/settings/*.tsx` — Consistent form layout

### Phase 7: Polish & Testing — 1 day
**Tasks:**
- Global keyboard navigation testing
- Screen reader testing
- Performance audit (no layout shifts)
- Cross-browser testing
- Mobile responsive testing
- Dark mode consistency check

---

## ACCEPTANCE CRITERIA

### Must Have:
1. ✅ Skeleton loading on EVERY page (no "Loading..." text spinners)
2. ✅ Empty state with icon + title + description + CTA on every list view
3. ✅ Error boundary wrapping every page section
4. ✅ Consistent status indicators (dot + badge) across all pages
5. ✅ Card hover effects everywhere
6. ✅ Table hover rows everywhere
7. ✅ Button active:scale effect
8. ✅ Focus rings on all interactive elements
9. ✅ Dark mode works perfectly for all new styles
10. ✅ Zero console errors

### Nice to Have:
1. Page transition animations
2. Keyboard shortcut overlay (Cmd+K)
3. Toast notification system improvements
4. Chart loading skeletons
5. Drag-and-drop reordering
