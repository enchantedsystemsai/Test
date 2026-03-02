export type UserTier = 'FREE' | 'UNLIMITED';

export interface Quota {
  summaries: number;
  transcriptionsMinutes: number;
  ocrScans: number;
}

export interface UserProfile {
  user_id: string;                     // Supabase user ID
  tier: UserTier;
  onboarded: boolean;

  usage: Quota;

  lastResetMonth: number;
  lastResetYear: number;

  theme: 'light' | 'dark';

  created_at: number;                  // Stored as timestamp (App.tsx expects number)
  updated_at: number;
}

export type NoteType = 'text' | 'checklist' | 'audio' | 'image';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  description: string;
  deadline?: string;
  completed: boolean;
}

export interface Note {
  id: string;

  title: string;
  content: string;
  type: NoteType;

  items?: ChecklistItem[];
  audioUrl?: string;

  tags: string[];
  tasks: Task[];

  summary?: string;
  strategicActions?: string;
  counterPerspective?: string;

  createdAt: number;                   // Local + Supabase sync
  updatedAt: number;

  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;

  orderIndex: number;                  // For manual reordering
}

export interface AppState {
  notes: Note[];
  profile: UserProfile;

  searchQuery: string;
  strategicBriefing: string;
  selectedTag: string | null;

  view:
    | 'list'
    | 'detail'
    | 'settings'
    | 'upgrade'
    | 'archive'
    | 'deleted'
    | 'onboarding'
    | 'privacy'
    | 'terms';

  returnView?: 'list' | 'archive' | 'deleted' | 'settings';
  showPaywallOnReturn?: boolean;

  selectedNoteId: string | null;
}