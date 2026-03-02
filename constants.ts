import { UserTier, Quota } from './types';

export const TIER_LIMITS: Record<UserTier, Quota> = {
  FREE: {
    summaries: 5,
    transcriptionsMinutes: 5,
    ocrScans: 5,
  },
  UNLIMITED: {
    summaries: Infinity,
    transcriptionsMinutes: Infinity,
    ocrScans: Infinity,
  },
};

export const PRICING = {
  UNLIMITED: "£4.99",
};

// Centralised colour palette for consistent UI theming
export const COLORS = {
  primary: '#6366f1',     // Indigo 500
  secondary: '#8b5cf6',   // Violet 500
  accent: '#f43f5e',      // Rose 500
  bgLight: '#f8fafc',     // Slate 50
  bgDark: '#0f172a',      // Slate 900
} as const;
