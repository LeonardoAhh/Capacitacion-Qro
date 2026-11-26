## Overview

The marketing surface follows the Ubuntu system's near-white canvas and near-black ink, with color reserved for the hero mesh gradient and illustration accents. The ViñoPlastic workspace supports the explicit light and dark palettes below; its theme changes colors only, preserving Ubuntu, geometry, spacing, and elevation.

Typography does the heavy lifting. **Ubuntu** is the only typeface throughout the interface, from tightly-tracked display headlines to labels and code. Buttons split into two shapes by context: the marketing CTAs are fully rounded black **pills** (`{rounded.pill}` — 100px, "Start Deploying" / "Get a Demo"), while nav and in-app controls use a tight 6px square (`{rounded.sm}`, "Sign Up" / "Log In"). The contrast between the rounded marketing pill and the square app button is itself a deliberate signal of which surface you're on.

Surfaces barely lift. Marketing cards are white (`{colors.canvas-elevated}`) on the near-white canvas, separated by a 1px hairline and, at most, a whisper-soft layered shadow. Workspace surfaces use the active theme's card and border tokens. Feature sections are built from precise grids of hairline cards, often holding thin node-graph or code-editor illustrations rendered in the same restrained palette.

**Key Characteristics:**
- Marketing uses a neutral ink ladder on a near-white canvas; workspace colors resolve from the selected light or dark palette.
- The multi-stop mesh gradient (cyan → blue → violet → magenta → amber) stays confined to the hero; login and workspace selection share a local Ink Ridges illustration in the active theme's neutral palette.
- Two button shapes by context: rounded black **pills** (`{rounded.pill}`) for marketing CTAs, tight 6px squares (`{rounded.sm}`) for nav/app controls.
- Ubuntu for all text, including lightly-tracked display type (`{typography.display-xl}` at -0.96px), uppercase technical eyebrows, and code.
- Hairline-bordered cards in precise grids; depth via 1px border + whisper shadow, never heavy elevation.
- The classic Vercel gradient trio (develop/preview/ship) survives as a named accent system: `{colors.gradient-develop-start}`→end, preview, ship.
- Color-block page rhythm: white hero with mesh gradient → logo strip → hairline feature-card grid → code-editor band → template cards → black-text CTA band → grey footer.

## Colors

> Source pages analyzed: the home page, the AI Gateway page, the customers page, and the pricing page. The ink/canvas/hairline trio recurs on every page; the accent blue (`{colors.link}`) surfaces on pricing, and the mesh-gradient stops live in the hero.

**ViñoPlastic application themes:** The app supports persistent light, dark, and system modes. System mode follows the device color-scheme preference, applies before hydration, and responds to device preference changes without replacing the selected mode. The light palette uses grafito claro surfaces and `--primary` #0070f3 (Vercel Blue); dark mode uses grafito oscuro surfaces and a lighter `--primary` blue (#3d9bff) with dark text. Typography (Ubuntu), geometry, spacing, and elevation remain the same in both palettes. The mode is selected in Settings; only roles without Settings (evaluator) pick it from the account menu.

| UI token | Light | Dark |
|---|---|---|
| Background | `#f4f5f7` | `#121418` |
| Foreground | `#14171c` | `#eceff3` |
| Card / popover | `#ffffff` | `#1a1d23` |
| Primary | `#0070f3` | `#3d9bff` |
| Ring (focus) | muted-foreground (`hsl(0 0% 35%)`) | muted-foreground (`hsl(0 0% 68%)`) |
| Secondary | `#e4e7ec` | `#262b33` |
| Muted | `#eceef1` | `#20242b` |
| Accent | `#e4e7ec` | `#262b33` |
| Destructive | `#8f1d1d` | `#ff9b9b` |
| Border | `#c9ced6` | `#363c46` |
| Input | `#7a8494` | `#7d8798` |
| Sidebar | Same as background (`#f4f5f7`) | Same as background (`#121418`) |
| Success | `#0070f3` | `#0070f3` |
| Warning | `#f5a623` | `#f5a623` |

Chart and sidebar semantic colors are defined as theme tokens in `app/globals.css`. Charts use at most five distinct hues, `--chart-1` to `--chart-5` (teal, blue, amber, violet, rose; lighter in dark mode), never several grays: `--chart-1` marks approved/meets goal (teal, so blue stays for actions), `--chart-2` is the primary blue and `--chart-3` marks pending/partial (warning amber); failures use `--destructive`. The sidebar surface and text follow the active theme's background and foreground; its hover, selected, and border tokens remain distinct. The app keeps Ubuntu, its current radii, spacing scale, and elevation treatments. Accent customization is not available.

### Brand & Accent
- **Ink** (`{colors.primary}` / `{colors.ink}` — #171717): the brand's defining near-black. Headings, primary CTA fill, logo, and the darkest text tier. Paired with `{colors.on-primary}` (white).
- **Vercel Blue** (`{colors.link}` — #0070f3): the link and accent blue — inline links and pricing highlights. It is also the workspace `--primary`: actions and selected states (focus rings use the neutral `--ring`, muted-foreground). Darker press tone `{colors.link-deep}` (#0761d1), pale wash `{colors.link-soft}` (#d3e5ff).
- **Violet** (`{colors.violet}` — #7928ca), **Cyan** (`{colors.cyan}` — #50e3c2), **Pink** (`{colors.pink}` — #ff0080), **Magenta** (`{colors.magenta}` — #eb367f): the chromatic accent family, used sparingly for illustration accents and as mesh-gradient stops, never as chrome fills.

### Surface
- **Canvas** (`{colors.canvas}`): the default page background; authenticated app values are `#f4f5f7` in light mode and `#121418` in dark mode.
- **Elevated** (`{colors.canvas-elevated}` — #ffffff): pure white for cards, buttons, inputs, and code blocks lifted off the canvas.
- **Hairline-Soft Surface** (`{colors.hairline-soft}` — #f2f2f2): the faintest grey fill for subtle alternating panels and inset wells.

### Text
- **Ink** (`{colors.ink}`): primary headings and high-emphasis text, resolved through the active theme's foreground token.
- **Body** (`{colors.body}`): standard paragraph and secondary copy, resolved through the active theme's muted-foreground token.
- **Mute** (`{colors.mute}`): lower-emphasis captions and metadata, resolved through the active theme's muted-foreground token.
- **Faint** (`{colors.faint}` — #a1a1a1): the lowest tier — placeholders, disabled labels.

### Borders
- **Hairline** (`{colors.hairline}`): the 1px border on every card, input, and divider; `#c9ced6` in light mode and `#363c46` in dark mode.

### Semantic
- **Error** (`{colors.error}` — #ee0000): validation / destructive, with a deep press tier `{colors.error-deep}` (#c50000).
- **Warning** (`{colors.warning}` — #f5a623): caution states, with soft `{colors.warning-soft}` and deep `{colors.warning-deep}` tiers.
- **Success** maps to `{colors.link}` (#0070f3) — the blue doubles as the positive/active signal.

### Brand Gradient
Three named two-stop gradients form the legacy Vercel gradient identity, surviving as illustration and accent washes:
- **Develop**: `{colors.gradient-develop-start}` (#007cf0) → `{colors.gradient-develop-end}` (#00dfd8) — blue to cyan.
- **Preview**: `{colors.gradient-preview-start}` (#7928ca) → `{colors.gradient-preview-end}` (#ff0080) — violet to pink.
- **Ship**: `{colors.gradient-ship-start}` (#ff4d4d) → `{colors.gradient-ship-end}` (#f9cb28) — red to amber.
These, blended together, form the hero's multi-stop mesh.

## Typography

### Font Family
The system uses **Ubuntu** for UI, prose, labels, and code. The same font is reused by application error surfaces. Printable formats and generated PDFs use locally bundled **Inter**.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-2xl}` | 56px | 700 | 56px | -1.4px | Login introductory headline on larger screens |
| `{typography.display-xl}` | 48px | 700 | 48px | -0.96px | Hero headline |
| `{typography.heading-xl}` | 32px | 700 | 40px | -0.48px | Major section headings |
| `{typography.heading-lg}` | 24px | 700 | 32px | -0.24px | Login introductory headline on mobile, large titles |
| `{typography.heading-md}` | 20px | 700 | 28px | 0 | Sub-section / card headings |
| `{typography.label-sm}` | 15px | 500 | 22px | 0 | Strong labels, nav emphasis |
| `{typography.eyebrow}` | 13px | 500 | 18px | 0 | Uppercase Ubuntu section labels |
| `{typography.body-lg}` | 17px | 400 | 26px | 0 | Lead paragraphs, large body |
| `{typography.body-md}` | 15px | 400 | 22px | 0 | Default body, nav links, table cells |
| `{typography.body-sm}` | 13px | 400 | 18px | 0 | Captions, footnotes, metadata |
| `{typography.button-lg}` | 17px | 500 | 22px | 0 | Marketing pill button labels |
| `{typography.button-md}` | 15px | 500 | 22px | 0 | Nav / app button labels |
| `{typography.code}` | 15px | 400 | 22px | 0 | Code blocks and inline code (Ubuntu) |

### Principles
- Ubuntu is already compact: only headings of 24px and up get a light negative tracking (-0.01em to -0.025em, tighter as size grows); headings of 20px, labels and body sit at 0. The scale is ordered largest to smallest: display-2xl, display-xl, heading-xl, heading-lg, heading-md, body-lg, label-sm / body-md, eyebrow / body-sm. Components use these tokens only — never `text-xs/sm/base/lg/xl`, arbitrary `text-[Npx]` or inline sizes — and nothing renders below 13px. Body and label sizes sit 1px above the usual 12/14/16 steps because Ubuntu has a small x-height.
- Three weights: 700 for headings, 500 for buttons/labels, and 400 for everything else (Ubuntu ships no 600). There is no light or black weight, and no italic.
- Ubuntu is used consistently for interface headings, body copy, labels, and code. Printable formats and PDFs use Inter.

### Font License
Ubuntu is licensed under the Ubuntu Font Licence and loaded through `next/font/google` (`lib/fonts.ts`) with weights 400, 500 and 700; Next.js downloads it at build time and serves it from the app, so browsers never request Google at runtime. Keep heading weight at 700 and keep the light negative tracking only on large headings.

Inter is self-hosted for print under the SIL Open Font License (`public/fonts/Inter-OFL.txt`). Browser printing uses its variable WOFF2 file; generated PDFs embed the regular and bold TTF files.

## Layout

### Spacing System
- **Base unit**: 4px. The scale steps 4 → 8 → 12 → 16 → 24 → 32 → 40 → 64 → 96 → 128px.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.2xl}` 40px · `{spacing.3xl}` 64px · `{spacing.4xl}` 96px · `{spacing.section}` 128px.
- **Card interiors** sit at `{spacing.lg}`–`{spacing.xl}` (24–32px); **section bands** run `{spacing.4xl}`–`{spacing.section}` (96–128px) of vertical rhythm.
- **Button padding** is horizontal-only — marketing pills run `0px 14px`, nav buttons `0px 6px` — with height set by line-height rather than vertical padding.

### Grid & Container
- Centered max-width container (~1200px) with comfortable gutters; the hero and CTA bands center their content.
- **Authenticated workspace** (`{layout.workspace-max}` — 1536px): shared maximum width for the application header and main content. It gives data grids and three-column layouts more room without returning to a full-bleed canvas.
- **Evaluation pending summary** (`{layout.evaluation-summary-max}` — 960px): centered within the authenticated workspace; the search and evaluation form keep the workspace width.
- **Workspace gutters** (`{layout.workspace-gutter}`): 16px on mobile, 24px from tablet, and 32px from laptop upward. Header and main content must use the same gutter values and centered grid.
- **Workspace frame** (`{components.workspace-frame}`): login keeps one elevated-canvas panel (`{colors.canvas-elevated}`) with a 1px hairline and 12px radius. In the authenticated workspace the sidebar and header sit directly on the elevated canvas, with no border between them; the main content lives in an inset panel to their right and below the header, using the theme background (`{colors.canvas}`), a 1px hairline and 12px radius, and it owns vertical scrolling. The outer inset is 16px on tablet and 24px on laptop and desktop. No shadow. On mobile, the frame becomes full-bleed with no outer border or radius, and the header keeps its bottom hairline.
- **Workspace sidebar**: desktop and mobile navigation share one tree in the fixed order of `lib/navigation.ts`: loose routes first (Inicio, Kanban), then collapsible groups (Desempeño, Capacitación, Motivacional) with an uppercase eyebrow heading and a chevron; routes inside each group are sorted alphabetically. Every route has a unique icon; no dividers. Each group remembers whether it was left open or closed, the active route's group opens on arrival, and a group with no routes visible to the role is hidden. Rows have a 44px minimum hit area; the current route uses a white surface and visible border. On desktop the sidebar hides completely; the show/hide control is an icon button in the header, before the page title, and the preference persists across routes. Views without a desktop header (evaluator) always show the sidebar. The sidebar top shows the workspace name and “ViñoPlastic”. The mobile drawer retains its brand and always remains expanded. Use 6px radius for sidebar links and controls, never full/pill radius. On desktop, the sidebar stays viewport-bound while the workspace main region owns vertical scrolling, keeping the frame border visible.
- **Workspace header**: 48px high and shares the content grid and gutter tokens; its desktop sticky inset is defined by the workspace tokens. The page title stays on the left; the account control stays on the right. Menu controls have a 44px minimum hit area and use the same neutral focus treatment as the sidebar.
- **Floating notices**: toasts and update notices sit at the bottom right on desktop and top center on mobile. Their edge inset respects mobile safe areas, and their width stays within the shared notice token.
- Feature sections use 2-up, 3-up, and 4-up hairline-card grids that collapse toward 1-up on narrow widths.
- The pricing page uses a multi-column tier grid; the customers page a logo / case-study grid.

### Whitespace Philosophy
Whitespace is structural. The near-white canvas and generous section padding do the separating work; cards are grouped by thin hairlines rather than heavy backgrounds. The page breathes — large vertical gaps between bands, tight internal rhythm inside cards.

### Responsive Strategy

#### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | ≤ 640px | Single-column stacks; nav → menu trigger; hero type scales down; pill CTAs go full-width |
| Tablet | 768px | 2-up card grids; condensed nav |
| Laptop | 1024px | 3–4-up grids; full nav row |
| Desktop | 1200px+ | Centered max-width container, full multi-column grids |

#### Touch Targets
Marketing pill CTAs (`{components.button-primary}`) and nav buttons clear the 44px WCAG-AAA target via line-height-driven height. Functional icon buttons keep a 44px hit area and 6px radius.

#### Collapsing Strategy
On desktop the workspace sidebar hides completely (no icon rail) and remains expanded inside the mobile drawer. The marketing nav row collapses behind a menu trigger; multi-column hairline-card grids reflow to a single column; code-editor and node-graph illustrations scale or scroll rather than shrink illegibly; the pricing tier grid stacks vertically.

#### Image Behavior
The hero mesh gradient is a CSS/SVG composition that scales fluidly. Feature illustrations (node graphs, code editors) are vector/HTML, ink-on-white, scaling crisply. Customer logos sit in a greyscale strip. No heavy raster photography.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | 1px hairline (`{colors.hairline}`), no shadow | Default feature cards, inputs, dividers, the canvas |
| 1 — Whisper | Border + `0px 1px 1px rgba(0,0,0,0.04)` micro-shadow | Lightly-raised cards |
| 2 — Floating | Layered soft shadow (`0px 2px 2px` + `0px 8px 16px -4px` low-alpha black) + inset hairline | Menus, modals, tooltips |

Depth is deliberately minimal. The system prefers a crisp 1px hairline plus the near-white-on-white surface step to a shadow; when a surface floats, it uses a finely-layered, very-low-alpha shadow stack rather than a single heavy drop.

### Decorative Depth
The hero **mesh gradient** is a soft multi-stop bloom of the brand accent colors against the white canvas. Login and workspace selection share Ink Ridges as a local background; its paper and ink follow the active theme. Feature illustrations (ink node-graphs, code editors) add a sense of product depth without color. No glows, no heavy gradients elsewhere.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed bands, dividers |
| `{rounded.sm}` | 6px | Nav / app buttons, inputs |
| `{rounded.md}` | 12px | Feature cards, code blocks |
| `{rounded.lg}` | 16px | Pricing cards, larger panels |
| `{rounded.pill-category}` | 64px | Category-tab pills (AI Apps / Web Apps) |
| `{rounded.pill}` | 100px | Marketing CTA pills |
| `{rounded.full}` | 9999px | Circular avatars only |

The radius language is bimodal: tight 6px squares for functional chrome, full pills for marketing CTAs and category tabs, with 12–16px on content cards in between. Do not use full/pill radius for app buttons, badges, or navigation; circular avatars are the only exception.

### Geometry
Cards are rectangles at 12–16px radius; marketing buttons and category tabs are full pills; functional icon buttons use 6px radius; only avatars are circular. Illustrations are line-weight vector graphics in ink on white.

## Components

> No hover states are documented. Each spec covers Default and (where extracted) pressed/active states. Variants live as separate `components:` entries.

### Navigation

**`nav-bar`** — top navigation
- Background `{colors.canvas}`, bottom hairline `{colors.hairline}`, text `{colors.body}`, type `{typography.body-md}`, padding `{spacing.sm} {spacing.lg}`. Holds the black wordmark, ghost nav links, and the Sign Up / Log In buttons at right.

**`nav-link`** — individual nav item
- Body-grey text `{colors.body}`, type `{typography.body-md}`, 6px radius `{rounded.sm}`, padding `{spacing.xs} {spacing.sm}`. Transparent until interacted.

### Buttons

**`button-primary`** — the black marketing pill ("Start Deploying", "Deploy")
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-lg}`, fully rounded `{rounded.pill}` (100px), padding `0px 14px`.

**`button-secondary`** — the white marketing pill ("Get a Demo")
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-lg}`, rounded `{rounded.pill}`, padding `0px 14px`. Same pill shape as primary, inverted fill.

**`button-primary-sm`** — the compact black nav CTA ("Sign Up")
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, tight square `{rounded.sm}` (6px), padding `0px 6px`.

**`button-ghost-sm`** — the white nav/app button ("Log In", "Ask AI")
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.button-md}`, rounded `{rounded.sm}`, padding `0px 6px`.

**`button-category-pill`** — the category-tab pill ("AI Apps", "Web Apps", "Ecommerce")
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-md}`, rounded `{rounded.pill-category}` (64px), padding `0px 16px`.

**`button-icon`** — functional icon control
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.body-lg}`, rounded `{rounded.sm}`, no padding. Circular avatar is the only use of `{rounded.full}`.

### Inputs & Forms

**`text-input`** — default form field
- Background `{colors.canvas-elevated}`, ink text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.body-md}`, rounded `{rounded.sm}`, padding `{spacing.xs} {spacing.sm}`.

**`choice-toggle`** — single-choice buttons inside forms (Yes/No, severity levels)
- One button per option in an equal-width row, separated by `{spacing.xs}`. Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, rounded `{rounded.sm}`, control height, type `{typography.body-md}` at regular weight. Selected: border and text in the theme `--primary`, still no fill, weight 500. Hover: the grey `--accent` fill of outline buttons on both options; the selected one keeps its primary border and text. Exposes `aria-pressed` and stays inside a labelled group. Do not use radio circles or a grey track for these choices.

**`toolbar-filters`** — filters in page toolbars
- One filter: a plain select, never the grouped menu. Two or more filters that do not fit on one line: the single `Filtros` button (icon + text) that groups them as sub-menus.
- Selects carry text only, no leading icon. Their "no filter" option is the filter's plural noun (`Departamentos`, `Estados`, `Periodos`), never "Todos los …". Option labels are short words with no parenthetical details; the select is wide enough for its longest option so nothing truncates.
- Filter controls never collapse to icon-only. The clear action is a ghost button with an `X` icon and the text `Limpiar`, shown only while a filter is active.
- Search does not live in the toolbar: it goes in the header magnifier (`HeaderSearch`).

### Cards & Containers

**`feature-card`** — flat hairline content card
- Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, ink text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}`, padding `{spacing.lg}`. The workhorse grid tile, often holding a node-graph or code illustration.

**`feature-card-elevated`** — lifted card variant
- Same chrome as `feature-card` with the Level-2 floating shadow for menus / featured tiles.

**`pricing-card`** — pricing tier card
- Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, ink text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.lg}`, padding `{spacing.xl}`.

**`code-block`** — code / terminal surface
- Background `{colors.canvas-elevated}`, ink text `{colors.ink}`, 1px hairline `{colors.hairline}`, Ubuntu code `{typography.code}`, rounded `{rounded.md}`, padding `{spacing.md}`. Syntax rendered in the ink-and-accent palette.

### Bands

**`logo-strip`** — customer logo band
- Background `{colors.canvas}`, mute text `{colors.mute}`, type `{typography.body-md}`, padding `{spacing.xl} {spacing.lg}`. A greyscale row of customer wordmarks.

**`hero-band`** — full-width hero section
- Background `{colors.canvas}` with the mesh gradient, ink text `{colors.ink}`, display type `{typography.display-xl}`, padding `{spacing.section} {spacing.lg}`.

**`cta-band`** — end-of-page call-to-action band ("Start Deploying")
- Background `{colors.canvas}`, ink text `{colors.ink}`, display type `{typography.display-xl}`, padding `{spacing.4xl} {spacing.lg}`, with a `{components.button-primary}` pill.

### Footer

**`footer`** — site footer
- Background `{colors.canvas}`, top hairline `{colors.hairline}`, body-grey text `{colors.body}`, type `{typography.body-md}`, padding `{spacing.3xl} {spacing.lg}`. Multi-column link groups under the wordmark.

## Do's and Don'ts

### Do
- Keep the canvas near-white (`{colors.canvas}`) and let near-black ink (`{colors.ink}`) carry headings, CTAs, and borders.
- In marketing, confine color to the hero mesh gradient and small illustration accents; in the workspace, use the active theme palette and reserve its primary for actions and selected states.
- Use the two button shapes by context: black pill (`{components.button-primary}`) for marketing CTAs, 6px square (`{components.button-primary-sm}`) for nav/app.
- Define cards and inputs with a 1px hairline (`{colors.hairline}`) before any shadow — flat is the default.
- Use Ubuntu for all typography. Set display headings at weight 700 with light negative tracking; keep section labels uppercase.
- Step the grey text ladder deliberately: `{colors.ink}` → `{colors.body}` → `{colors.mute}` → `{colors.faint}`.

### Don't
- Don't fill large surfaces with the accent colors — violet/cyan/pink/blue live in the gradient and illustrations, not as chrome.
- Don't mix the button shapes within one context — marketing CTAs stay pills, app/nav controls stay 6px squares.
- Don't pile on shadows — depth is a 1px hairline plus, at most, a finely-layered low-alpha shadow stack.
- Don't set marketing body copy in pure black (`#000000`) — the brand's ink is #171717 and body steps to `{colors.body}`. Workspace text uses the active theme's foreground tokens.
- Don't add a second decorative system to the shared chrome. Ink Ridges is the approved exception on login and workspace selection only; other surfaces keep the established ink-on-white treatment.
- Don't add negative tracking to text below 24px; with Ubuntu it hurts legibility.
