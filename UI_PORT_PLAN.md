# Creative OS + QC Styling Port into Dokploy

Plan for applying the Creative OS (Apple-inspired) design language from the
"Aboalia Work" project (`D:\Aboalia\Aboalia Work` — `frontend/src/styles/studio.css`,
`creativeos-reference/docs/DESIGN.md`, plus QC tokens in `frontend/src/index.css`)
onto the Dokploy frontend (`apps/dokploy`).

**Direction:** Aboalia Work → Dokploy. Dokploy keeps its architecture (shadcn/ui
components, Tailwind v4, next-themes light/dark). The port is token-first: every
shadcn component reads CSS variables, so remapping the variables in
`globals.css` reskins the whole app, then targeted component edits add the
signature Creative OS patterns.

**Scope decisions (confirmed with user):**

- Full visual overhaul (tokens + component reskin + layout: sidebar, header, shell).
- Keep 2 theme modes (light/dark), map Creative OS light + dark palettes.
- Inter only — no Newsreader serif.
- Primary accent = Creative OS blue `#0071E3` (light) / `#2997FF` (dark).
- Skip RTL, dim theme, and non-UI features.

**Design source rules (Creative OS spec, abridged):**

1. 4 shadow levels only: `apple-sm`, `apple-card`, `apple-float`, `apple-modal`.
2. Hairline borders `black/[0.06]` ↔ `white/[0.08]`, never solid gray borders.
3. Status = alpha-chip triple (bg/10, border/20, text 600/400). Danger gets glow.
4. All entrance motion 160ms `cubic-bezier(0.16,1,0.3,1)`.
5. `rounded-full` for buttons/pills/badges; `rounded-xl`+ (18px) for cards.
6. Accent used only for primary action / active state, never large surfaces.
7. Numerals in `font-mono`; labels uppercase `tracking-wider` ≤11px.
8. Empty/loading/error states on every list; skeletons not spinners.

---

## Phase 1 — Token remap (`apps/dokploy/styles/globals.css`)

Replace `:root` and `.dark` variable values with the Creative OS palette. Values
are written raw (hex/rgba); Tailwind v4 `color-mix` handles opacity modifiers
(`bg-primary/10`) on hex values, so no oklch conversion is required.

### Light (`:root` ~line 389)

| Variable | New value |
|---|---|
| `--background` | `#F5F5F7` |
| `--foreground` | `#1D1D1F` |
| `--card` / `--popover` | `#FFFFFF` |
| `--card-foreground` / `--popover-foreground` | `#1D1D1F` |
| `--primary` / `--ring` | `#0071E3` |
| `--primary-foreground` | `#FFFFFF` |
| `--secondary` / `--muted` / `--accent` | `rgba(0,0,0,0.04)` |
| `--secondary-foreground` / `--accent-foreground` | `#1D1D1F` |
| `--muted-foreground` | `#6E6E73` |
| `--destructive` | `#E11D48` |
| `--destructive-foreground` | `#FFFFFF` |
| `--border` | `rgba(0,0,0,0.06)` |
| `--input` | `rgba(0,0,0,0.1)` |
| `--sidebar` | `#F7F7F8` |
| `--sidebar-foreground` | `#1D1D1F` |
| `--sidebar-primary` | `#0071E3` |
| `--sidebar-accent` | `rgba(0,0,0,0.06)` |
| `--sidebar-accent-foreground` | `#1D1D1F` |
| `--sidebar-border` | `rgba(0,0,0,0.06)` |
| `--sidebar-ring` | `#0071E3` |
| `--success` | `#059669` |
| `--warning` | `#B45309` |
| `--info` | `#0071E3` |
| `--radius` | `0.8rem` (→ `--radius-xl` ≈ 18px) |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)` |
| `--shadow-xl` | `0 24px 48px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.08)` |
| `--chart-1..5` | emerald `#059669`-ish, amber, blue `#0071E3`, purple, rose |

### Dark (`.dark` ~line 435)

| Variable | New value |
|---|---|
| `--background` | `#09090B` |
| `--foreground` | `#F4F4F5` |
| `--card` / `--popover` | `#121215` |
| `--secondary` / `--muted` / `--accent` | `rgba(255,255,255,0.06)` |
| `--muted-foreground` | `#98989D` |
| `--primary` / `--ring` | `#2997FF` |
| `--destructive` | `#FB7185` |
| `--border` | `rgba(255,255,255,0.07)` |
| `--input` | `rgba(255,255,255,0.14)` |
| `--sidebar` | `#0D0D11` |
| `--sidebar-accent` | `rgba(255,255,255,0.08)` |
| `--success` | `#34D399` |
| `--warning` | `#FBBF24` |
| `--info` | `#2997FF` |
| shadows | apple scale with heavier alpha per studio.css (0.3–0.7 black) |

### Global additions (same file)

- `--ease-smooth-out` → `cubic-bezier(0.16,1,0.3,1)` (Apple easeOutExpo).
- Entrance `--duration-fast` → `160ms` (page transitions).
- `body` gets `font-feature-settings: "cv02","cv03","cv04","cv11"` +
  `-webkit-font-smoothing: antialiased`.
- `::selection` → `#0071e333` bg + `#0071E3` text (dark variant: `rgba(0,113,227,0.4)` + white).
- Sync the dead `--sidebar-background` var (line ~179/190) with the real `--sidebar` value.
- Keep: panel/page transition machinery, terminal/CodeMirror/xterm overrides, focus ring base.

**Checklist:**

- [ ] Light `:root` colors remapped
- [ ] Dark `.dark` colors remapped
- [ ] Radius `0.8rem`
- [ ] Apple shadow tokens (light + dark)
- [ ] Chart tokens remapped
- [ ] Motion: ease + duration-fast updated
- [ ] Font features + antialiased on body
- [ ] Selection colors (light + dark)
- [ ] `--sidebar-background` synced

---

## Phase 2 — Component reskin (`apps/dokploy/components/ui/`)

- `button.tsx`: base `rounded-lg` → `rounded-full`; remove size-level radius
  overrides (`xs`, `icon-xs`, `icon-sm`) → `rounded-full`; keep `in-data-[slot=button-group]` pill. Primary hover stays `hover:bg-primary/90` (= `#0077ED`).
- `badge.tsx`: semantic variants `red/yellow/orange/green/blue/blank` — `rounded-md` → `rounded-full`; red variant gets glow `shadow-[0_0_6px_rgba(244,63,94,0.4)]`.
- `card.tsx`: `ring-1 ring-foreground/10` → `border border-border` (hairline rule); radius via token; keep `shadow-sm` + `hover:shadow-md` (now apple-card/float).
- `dialog.tsx`: overlay `bg-black/10` → `bg-black/40` + keep `backdrop-blur-xs`; content `ring-1 ring-foreground/10` → `border border-border`; entrance `duration-100` → `duration-150` (160ms family).
- `input.tsx`: focus ring `ring-ring/50` → `ring-ring/30` (Creative OS accent 30%).
- `progress.tsx`: track `h-4` → `h-1.5` (Creative OS thin track).

**Checklist:**

- [ ] button.tsx pill radius
- [ ] badge.tsx pill + danger glow
- [ ] card.tsx hairline border
- [ ] dialog.tsx dark overlay + border + timing
- [ ] input.tsx soft focus ring
- [ ] progress.tsx thin track

---

## Phase 3 — Layout overhaul

- `components/ui/sidebar.tsx`:
  - `SidebarGroupLabel` → `text-[10px] uppercase tracking-wider` (+ muted color).
  - Active state (`data-active:*`) → `bg-primary/10 text-primary` (walk line 467, 573, 667); sub-button `[&>svg]:text-sidebar-accent-foreground` → `[&>svg]:text-current`.
  - `SidebarMenuButton` base `rounded-md` → `rounded-lg`.
- `components/layouts/side.tsx`: pass `isActive` instead of `className="bg-border"` on single/sub nav buttons (keep icon `text-primary` on active).
- Header (side.tsx `header`): `sticky top-0 z-10 bg-background/75 backdrop-blur-[20px] border-b border-border/50`.
- `globals.css` `@utility container`: max-width `87.5rem` → `85rem` (1360px Creative OS shell).

**Checklist:**

- [ ] Sidebar group labels micro-uppercase
- [ ] Sidebar active = primary/10 + primary text
- [ ] Sidebar sub-button svg inherits color
- [ ] side.tsx isActive wiring
- [ ] Header sticky glass
- [ ] Container 85rem

---

## Phase 4 — New shared component: segmented control

Port `apple-segmented` (studio.css) as `components/ui/segmented.tsx`: pill track
(`bg-muted`-based), active segment = `bg-card shadow-sm text-foreground`,
inactive = `text-muted-foreground hover:text-foreground`. Generic over string
values, `role="tablist"` semantics. Not wired into pages yet — available for
filter/view toggles.

**Checklist:**

- [ ] `ui/segmented.tsx` created
- [ ] Exports clean, no unused deps

---

## Phase 5 — Hardcoded-color sweep

Grep `apps/dokploy/components` + `apps/dokploy/pages` for stragglers that fight
the theme: literal `oklch(`, `bg-gray-`, `text-gray-`, `border-gray-`,
`bg-slate-`, `bg-zinc-`. Fix only layout-critical ones; accept benign
non-UI uses (icons, diagrams). Whitelabeling override path must still work.

**Checklist:**

- [ ] Grep sweep done
- [ ] Stragglers fixed
- [ ] Whitelabeling tokens still override

---

## Verification

1. `pnpm exec biome check` on edited files — clean.
2. `pnpm --filter dokploy exec tsc --noEmit` — type-safe.
3. `pnpm --filter dokploy dev` — boots without console errors.
4. Visual check light + dark (dashboard, project card, service page, settings,
   dialog, badge grid) — palette, hairline borders, pill buttons, 18px cards,
   sidebar active state.
5. Terminal / code editor pages remain readable (separate overrides untouched).

**Checklist:**

- [ ] biome check clean
- [ ] tsc clean
- [ ] dev boots
- [ ] Light + dark visual pass
- [ ] Terminal/editor intact

---

## Risk notes

- ~330 dashboard components: some may hardcode gray/oklch classes — sweep
  catches the impactful ones; cosmetic leftovers acceptable.
- Whitelabeling branding must override tokens — verify after remap.
- Sonner toasts, recharts, CodeMirror use their own palettes; only charts
  cost-nothing (token-driven) are remapped.