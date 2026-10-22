/**
 * Application-level constants — navigation, routes, and static config.
 */

export const APP_NAME = 'VoicePilot';
export const APP_TAGLINE = 'AI Sales Studio';

export const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: 'LayoutDashboard' },
  { label: 'Live Call', href: '/call', icon: 'Phone' },
  { label: 'Call History', href: '/history', icon: 'History' },
  { label: 'Product Setup', href: '/setup', icon: 'Settings' },
] as const;

export type NavItemIcon = (typeof NAV_ITEMS)[number]['icon'];

/** Key used for browser localStorage persistence of ProductConfig in Phase 1. */
export const PRODUCT_CONFIG_STORAGE_KEY = 'voicepilot:product_config_v1';

/**
 * Outcome badge styling — maps SalesOutcome to Tailwind colour token.
 * Kept here so it can be updated in one place if the palette changes.
 */
export const OUTCOME_BADGE_CLASSES = {
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  interested: 'bg-blue-50 text-blue-700 border-blue-200',
  follow_up_required: 'bg-amber-50 text-amber-700 border-amber-200',
  not_interested: 'bg-red-50 text-red-700 border-red-200',
  demo_requested: 'bg-violet-50 text-violet-700 border-violet-200',
  no_response: 'bg-gray-50 text-gray-500 border-gray-200',
} as const;
