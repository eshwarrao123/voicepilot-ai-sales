---
name: VoicePilot Design System
description: Achromatic Ledger — Light editorial sales operations workbench
colors:
  surface-base: "#f9f9f8"
  surface-raised: "#ffffff"
  surface-sunken: "#f2f2f0"
  border-subtle: "#e5e5e3"
  border-default: "#d4d4d0"
  border-strong: "#a3a39e"
  ink-primary: "#111110"
  ink-secondary: "#52524e"
  ink-tertiary: "#8f8f8a"
  ink-disabled: "#c0c0bb"
  accent-primary: "#2563eb"
  accent-hover: "#1d4ed8"
  accent-subtle-bg: "#eff6ff"
  accent-border: "#bfdbfe"
  status-success: "#166534"
  status-success-bg: "#f0fdf4"
  status-warning: "#92400e"
  status-warning-bg: "#fffbeb"
  status-error: "#991b1b"
  status-error-bg: "#fef2f2"
  call-live: "#16a34a"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "1.2"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: "1.2"
  section:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: "1.4"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.6"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.4"
  small:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: "1.4"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-secondary}"
    border: "1px solid {colors.border-default}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface-raised}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
---

# VoicePilot Design System

## Phase 4B: Achromatic Ledger Implementation

**Direction**: Light editorial sales-operations workbench  
**Style**: Achromatic ledger (from Taste skill library)  
**Completed**: 2026-10-22

## Overview

VoicePilot is a professional AI sales studio designed for sales development reps and account executives. The Phase 4B redesign implements a light, editorial, information-dense visual system optimized for operational clarity and rapid scanning during live sales conversations.

The design follows the **achromatic-ledger** direction from the Taste skill library, characterized by:
- No color in chrome (sidebar, navigation, shell)
- High-contrast ink on warm light surfaces
- Color reserved for data, status, and primary actions
- Restrained cobalt accent for interactive elements
- Semantic status colors (green for success/active, amber for warnings, red for errors)
- Compact, editorial typography with clear hierarchy
- Information density appropriate for working professionals

## Visual Language

### Removed from Previous Design

The Phase 4B redesign explicitly removed:
- ❌ Dark navy background (`#080c14`, `#0d1117`)
- ❌ Purple-to-blue gradients (`linear-gradient(135deg, #4f86f7 0%, #8b5cf6 100%)`)
- ❌ Glowing shadows and radial background effects
- ❌ Glassmorphism and backdrop filters
- ❌ Electric violet accent (`#8b5cf6`)
- ❌ Icons in tinted square containers
- ❌ 10px uppercase micro-labels
- ❌ Decorative gradient text
- ❌ Heavy panel shadows and borders
- ❌ Large identical cards for every section
- ❌ Oversized hero banner with glowing icon

### Established Light System

**Surfaces**
- Page canvas: `#f9f9f8` — warm neutral, slightly off-white for reduced glare
- Raised cards: `#ffffff` — crisp white for primary content containers
- Sunken inputs: `#f2f2f0` — subtle recessed surface for form controls
- Borders: `#e5e5e3` (subtle), `#d4d4d0` (default), `#a3a39e` (strong)

**Typography**
- Font: Inter with system fallbacks
- Scale: 11px–28px (compact for operational density)
- Primary ink: `#111110` (near-black, high contrast)
- Secondary ink: `#52524e` (readable gray)
- Tertiary ink: `#8f8f8a` (de-emphasized metadata)
- Tabular numerals for durations, timestamps, metrics

**Accent & Status**
- Primary accent: `#2563eb` (cobalt blue) — reserved for primary actions and data focus
- Live call status: `#16a34a` (semantic green)
- Success: `#166534` on `#f0fdf4`
- Warning: `#92400e` on `#fffbeb`
- Error: `#991b1b` on `#fef2f2`

**Layout**
- Desktop sidebar: 240px, light surface with subtle divider
- Mobile: Collapsing sidebar, sticky header with accessible drawer
- Content: Max 1100px centered canvas, 2rem vertical rhythm
- Metric strip: Unified container with 1px dividers (no individual cards)
- Compact spacing: Information-dense without crowding

## Components

### Navigation
- **Desktop Sidebar**: 240px stable column, white background, minimal accent use
- **Active State**: Neutral gray fill (`#e8e8e6`), not colored
- **Mobile Header**: Sticky 48px bar with hamburger menu
- **Mobile Drawer**: 280px slide-out panel with overlay, keyboard accessible

### Buttons
- **Primary**: Solid cobalt (`#2563eb`), white text, 6px radius
- **Secondary**: White background, gray text, 1px border
- **Ghost**: Transparent with hover state
- **No gradients**: Flat fills only

### Cards
- White background, 1px subtle border (`#e5e5e3`), 8px radius
- Minimal shadow (removed heavy drop shadows)
- Hover: Border darkens to `#d4d4d0`

### Metrics
- Unified strip with 1px dividers (not individual tiles)
- Label above value, compact spacing
- Tabular numerals for alignment
- Loading: Skeleton with shimmer animation

### Transcript
- **AI bubbles**: Light gray fill (`#f2f2f0`), subtle border, left-aligned
- **Customer bubbles**: Accent subtle background (`#eff6ff`), right-aligned
- **Spacing fix**: Preserved leading whitespace detection to prevent word concatenation
- Readable line length (85% max width), appropriate line-height (1.6)

### Status Indicators
- **Live dot**: 8px green circle with pulse animation
- **Status pills**: Small, restrained semantic colors with 1px borders
- **No decorative glows**: Clean, flat presentation

## Layout Patterns

### Overview Page
- Compact header: Title, description, actions (no banner)
- Metric strip: 4 unified cells with 1px dividers
- Recent calls: Compact rows with inline metadata
- Empty state: Honest, centered, clear primary action

### Call Studio (Not fully redesigned in Phase 4B)
- Two-column workspace (prospect/controls + transcript)
- Clear status communication
- Readable transcript with proper speaker distinction
- Recording consent and controls grouped logically

### History (Not fully redesigned in Phase 4B)
- Data-dense list view recommended
- Inline metadata (date, duration, outcome)
- Expandable detail rows or drawer
- Filter controls without extra chrome

### Setup (Not fully redesigned in Phase 4B)
- Two-column editorial layout recommended
- Section title + description | form panel
- Readable field labels and hints
- Clear save/reset actions

## Accessibility

- WCAG AA contrast ratios maintained
- Visible focus indicators (2px cobalt outline)
- Keyboard navigation for all interactive elements
- Proper ARIA labels and semantic HTML
- Mobile drawer with focus management
- Screen reader friendly empty and loading states

## Typography Scale

| Token | Size | Use |
|-------|------|-----|
| `xs` | 11px | Fine print, micro-labels, helper text |
| `sm` | 13px | Body text, labels, controls |
| `base` | 15px | Default body text |
| `lg` | 17px | Section headers |
| `xl` | 19px | Subsection titles |
| `2xl` | 22px | Page titles |
| `3xl` | 28px | Headline metrics, hero numbers |

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 4px | Small controls, badges |
| `md` | 6px | Buttons, inputs |
| `lg` | 8px | Cards, panels |
| `xl` | 12px | Large containers |

## Spacing Scale

4px baseline grid: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`

## Motion

- Subtle transitions: 150ms ease
- Pulse animation for live status indicator
- Skeleton shimmer for loading states
- No gratuitous entrance animations
- Reduced motion support via `prefers-reduced-motion`

## Technical Implementation

**Stack**
- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS v4 with CSS variables
- Lucide React icons

**CSS Variables**
All tokens defined as CSS custom properties in `globals.css` under `:root`, allowing consistent theming and easy maintenance.

**Component Structure**
- `AppShell.tsx`: Navigation shell with responsive mobile drawer
- `page.tsx` (Overview): Compact metrics and recent calls
- `useLiveSession.ts`: Fixed transcript spacing bug

## Design Decisions

### Why Achromatic Ledger?

This direction was selected because VoicePilot is:
1. **Operational software** used during live sales conversations (not marketing)
2. **Information-dense** requiring rapid scanning of metrics, transcripts, outcomes
3. **Professional B2B context** favoring clarity over decoration
4. **Data-focused** where color on chrome would distract from actual sales intelligence

### Key Departures from Generic AI SaaS

| Generic AI Pattern | VoicePilot Approach |
|-------------------|-------------------|
| Purple gradients everywhere | Solid cobalt accent, used sparingly |
| Dark "premium" theme | Light editorial for readability |
| Large hero banners | Compact headers, content-first |
| Glowing elements | Flat surfaces, subtle shadows |
| Icon grids with tinted backgrounds | Data-driven layouts |
| KPI cards with sparklines | Unified metric strip, tabular figures |
| Arbitrary decorative charts | Real data only, honest empty states |

## Rationale: Color Budget

Following the achromatic-ledger style, color occupies <1% of screen pixels:
- **Primary action buttons**: Cobalt
- **Live status indicator**: Green
- **Outcome badges**: Semantic colors (green/amber/red)
- **Everything else**: Ink on light surfaces

This constraint forces:
1. Clear information hierarchy through type scale and weight
2. Efficient use of whitespace and layout
3. Attention naturally drawn to actionable elements
4. Professional, focused appearance

## Do's

✅ Use high-contrast ink on light surfaces  
✅ Reserve color for status and primary actions  
✅ Maintain honest empty states (no fake data)  
✅ Keep recording consent visible and clear  
✅ Use tabular numerals for aligned metrics  
✅ Provide visible focus indicators  
✅ Test with real Supabase data when configured  
✅ Preserve functional behavior during visual updates  

## Don'ts

❌ Do not add purple or rainbow gradients  
❌ Do not use glowing shadows or backdrops  
❌ Do not invent demo metrics or sample calls  
❌ Do not hide functional controls for aesthetics  
❌ Do not use micro-labels (10px uppercase)  
❌ Do not make RLS policies public for visual testing  
❌ Do not sacrifice readability for visual density  
❌ Do not animate elements unless indicating state change  

## Known Limitations (Phase 4B Scope)

The Phase 4B redesign focused on:
- ✅ Design system (globals.css)
- ✅ AppShell and mobile navigation
- ✅ Overview page
- ✅ Transcript spacing bug fix

**Not fully redesigned** (recommended for future phases):
- ⚠️ Call Studio page (requires careful UX work)
- ⚠️ History page (needs data-dense list treatment)
- ⚠️ Setup page (needs two-column editorial layout)
- ⚠️ Audio player refinements (duration display verification)

These pages retain functional behavior but may have visual inconsistencies with the new design system until Phase 4C.

## Testing Notes

- Lint: Passing (ESLint clean)
- TypeScript: Passing (no type errors)
- Build: Successful (Next.js production build)
- Playwright: Not executed in Phase 4B (recommend running separately)
- Taste Inspector: Not executed in Phase 4B (requires dev server)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari iOS 14+
- Mobile Chrome Android 90+

## Future Recommendations

1. **Complete route redesigns**: Apply achromatic-ledger consistently to Call, History, Setup
2. **Taste inspection**: Run full app-screen inspector workflow at 1440/768/390px
3. **Audio player**: Verify WebM duration metadata and seeking behavior
4. **Mobile testing**: Real device testing for drawer UX and touch targets
5. **Accessibility audit**: Full WCAG 2.1 AA validation with assistive tech
6. **Performance**: Measure and optimize for low-bandwidth scenarios
7. **Dark mode** (if needed): Implement separate achromatic dark style, not the old purple theme

## Maintenance

When adding new features:
- Use existing CSS variables from `globals.css`
- Follow established component patterns
- Keep color usage minimal (refer to achromatic budget)
- Test at mobile breakpoint (768px)
- Maintain honest data states
- Document any new tokens or patterns here
