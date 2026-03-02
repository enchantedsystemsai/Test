import { Note, UserProfile } from '../types';

const STORAGE_KEY = 'notecompass_data';

const now = Date.now();

const DEFAULT_PROFILE: UserProfile = {
  user_id: '',                     // No user yet (local mode)
  tier: 'FREE',
  onboarded: false,
  usage: {
    summaries: 0,
    transcriptionsMinutes: 0,
    ocrScans: 0,
  },
  lastResetMonth: new Date().getMonth(),
  lastResetYear: new Date().getFullYear(),
  theme: 'dark',
  created_at: now,
  updated_at: now,
};

function migrateNote(raw: any): Note {
  const createdAt = raw.createdAt ?? now;
  return {
    id: raw.id,
    title: raw.title ?? 'New Note',
    content: raw.content ?? '',
    type: raw.type ?? 'text',

    items: raw.items ?? [],
    audioUrl: raw.audioUrl ?? undefined,

    tags: raw.tags ?? [],
    tasks: raw.tasks ?? [],

    summary: raw.summary ?? '',
    strategicActions: raw.strategicActions ?? '',
    counterPerspective: raw.counterPerspective ?? '',

    createdAt: createdAt,
    updatedAt: raw.updatedAt ?? now,

    isPinned: raw.isPinned ?? false,
    isArchived: raw.isArchived ?? false,
    isDeleted: raw.isDeleted ?? false,
    orderIndex: raw.orderIndex ?? createdAt,
  };
}

function migrateProfile(raw: any): UserProfile {
  const base = { ...DEFAULT_PROFILE, ...(raw || {}) };

  return {
    user_id: base.user_id ?? '',
    tier: base.tier ?? 'FREE',
    onboarded: base.onboarded ?? false,
    usage: base.usage ?? DEFAULT_PROFILE.usage,
    lastResetMonth: base.lastResetMonth ?? DEFAULT_PROFILE.lastResetMonth,
    lastResetYear: base.lastResetYear ?? DEFAULT_PROFILE.lastResetYear,
    theme: base.theme ?? 'dark',
    created_at: base.created_at ?? now,
    updated_at: base.updated_at ?? now,
  };
}

export const storageService = {
  saveData(notes: Note[], profile: UserProfile) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        notes,
        profile: { ...profile, updated_at: Date.now() },
      })
    );
  },

  loadData(): { notes: Note[]; profile: UserProfile } {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { notes: [], profile: DEFAULT_PROFILE };
    }

    try {
      const parsed = JSON.parse(raw);

      const notes = Array.isArray(parsed.notes)
        ? parsed.notes.map(migrateNote)
        : [];

      const profile = migrateProfile(parsed.profile);

      return { notes, profile };
    } catch {
      return { notes: [], profile: DEFAULT_PROFILE };
    }
  },
};