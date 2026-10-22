---
name: VoicePilot Design System
description: Sales Studio — restrained, high-density, accessible interface system for voice sales operations
colors:
  surface-base: "#f9f9f8"
  surface-raised: "#ffffff"
  border-subtle: "#e5e5e3"
  border-default: "#d4d4d0"
  border-strong: "#a3a39e"
  ink-primary: "#111110"
  ink-secondary: "#52524e"
  ink-tertiary: "#8f8f8a"
  ink-disabled: "#c0c0bb"
  accent: "#2563eb"
  accent-hover: "#1d4ed8"
  accent-subtle: "#eff6ff"
  accent-border: "#bfdbfe"
  status-success: "#166534"
  status-success-bg: "#f0fdf4"
  status-warning: "#92400e"
  status-warning-bg: "#fffbeb"
  status-error: "#991b1b"
  status-error-bg: "#fef2f2"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "1.2"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: "1.3"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.4"
  caption:
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
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# VoicePilot Design System

## Overview

VoicePilot is a professional sales workspace designed for sales development reps and account executives. The visual language favors clarity, crisp typography, high informational density, and rapid scanning over decorative flourish.

## Colors

- **Surfaces**: Warm neutral canvas (`#f9f9f8`) with crisp elevated cards (`#ffffff`).
- **Borders**: Layered neutral borders (`#e5e5e3` subtle, `#d4d4d0` default, `#a3a39e` strong) providing clear structural division without heavy contrast.
- **Ink**: High-contrast, legible text scale from primary ink (`#111110`) down to tertiary ink (`#8f8f8a`) and disabled indicators (`#c0c0bb`).
- **Accents**: Restrained cobalt blue (`#2563eb`) reserved for primary action calls and navigational orientation.
- **Call & Status States**: Accessible semantic green for live connectivity and converted leads, amber for warnings and follow-ups, red for terminated calls or objections.

## Typography

- **Font Family**: Inter, paired with system font fallbacks for near-zero layout shift.
- **Scale**: Purposefully compact desktop scale (11px captions, 13px controls/labels, 15px base body, 17px section headers, 22-28px page titles). Avoids bloated dashboard font sizes.

## Layout

- **Shell**: 240px persistent desktop sidebar with responsive collapsing for tablet and mobile viewports.
- **Grid & Spacing**: 4px baseline rhythm. Two-column responsive workspace for active calls (configuration/controls on left, live transcript stream on right).
- **Density**: Compact padding ensuring critical call context and transcripts remain visible without excessive scrolling.

## Elevation & Depth

- **Tonal Layering**: Flat-to-subtle elevation. Shadows are soft and restrained (`0 1px 2px rgba(0,0,0,0.05)` for cards; `0 2px 8px rgba(0,0,0,0.08)` for elevated states).
- Avoids floating cards, glassmorphism blur filters, or neon drop-shadows.

## Shapes

- Consistent border radius: 6px (`--radius-md`) for controls and badges; 8px (`--radius-lg`) for standard cards; 12px (`--radius-xl`) for banner callouts.

## Components

- **Buttons**:
  - Primary (`btn-primary`): Solid accent fill, white text, subtle hover lift.
  - Secondary (`btn-secondary`): Surface-raised background with neutral border.
  - Destructive (`btn-danger`): Subdued red border and text, deepening on hover.
- **Transcript Bubbles**:
  - AI Speaker: Left-aligned, light neutral surface (`--surface-base`), subtle border, clear avatar indicator.
  - Customer Speaker: Right-aligned, subtle blue tinted surface (`--accent-50`), border accent.
- **Call Status Pill**:
  - Live state includes a pulsing green dot (`--call-live`).
  - Connecting state displays an amber pulsing indicator.
  - Idle/Ended states display stable neutral metadata.

## Do's and Don'ts

### Do
- Keep text labels visible and accessible with high contrast ratios (WCAG AA compliant).
- Use truthful empty states that clearly state metrics will appear once actual calls are completed.
- Maintain persistent, visible recording-consent status.
- Ensure focus rings (`:focus-visible`) are prominent on all interactive elements.

### Don't
- Do not use generic purple or rainbow AI gradients.
- Do not invent mock metrics, charts, or simulated conversations.
- Do not animate elements unless they indicate live state changes (such as an active call timer or recording indicator).
