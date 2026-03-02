import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, AppState, NoteType, ChecklistItem, Task, UserProfile, Quota } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { TIER_LIMITS, PRICING } from './constants';
import { Paywall } from './components/Paywall';
import { 
  PlusIcon, NoteIcon, AudioIcon, SparklesIcon, ScanIcon, ImageIcon,
  SearchIcon, AccountIcon, CheckIcon, CompassLogo, PinIcon, ArchiveIcon, SendIcon, CopyIcon,
  DeletedIcon, GridIcon, ListIcon, BrainIcon, HomeIcon, RocketIcon, DragIcon
} from './components/Icons';
import { supabase } from './supabaseClient';

const getRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatFullDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // Max 3 seconds fallback

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="fixed inset-0 z-[10000] bg-[#f1f5f9] dark:bg-[#020617] flex items-center justify-center overflow-hidden"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        className="w-full h-full object-cover"
        poster="/splash_static.png"
      >
        <source src="/splash_video.mp4" type="video/mp4" />
      </video>
    </motion.div>
  );
};

const EmptyState = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500 min-h-[50vh]">
    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-8 text-slate-400 dark:text-slate-600 rotate-6 shadow-sm overflow-hidden transition-colors">
      <div className="w-10 h-10 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-3 tracking-tight transition-colors">{title}</h3>
    {description && <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed max-w-[240px] font-medium transition-colors">{description}</p>}
  </div>
);

const onboardingScreens = [
  {
    title: "Navigate your thoughts",
    body: "Professional AI-powered notepad for creative minds.",
    icon: (
      <div className="relative w-32 h-32 animate-in zoom-in duration-700 flex items-center justify-center">
         <div className="absolute inset-0 bg-white rounded-full shadow-2xl z-0" />
         <CompassLogo size="w-32 h-32" className="relative z-10 !rounded-full !shadow-none" />
      </div>
    ),
    highlights: ["DYNAMIC NOTES", "VOICE TRANSCRIPTION", "SMART SEARCH"]
  },
  {
    title: "Capture in any format",
    body: "Record voice notes, snap photos, create checklists, or type freely.",
    icon: (
      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-indigo-500 animate-in zoom-in duration-500"><AudioIcon size="w-7 h-7" /></div>
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-emerald-500 animate-in zoom-in duration-500 delay-75"><ImageIcon size="w-7 h-7" /></div>
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-blue-500 animate-in zoom-in duration-500 delay-150"><NoteIcon size="w-7 h-7" /></div>
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-amber-500 animate-in zoom-in duration-500 delay-200"><CheckIcon size="w-7 h-7" /></div>
      </div>
    ),
    highlights: ["AUDIO TO TEXT", "IMAGE TO TEXT", "CHECKLISTS"]
  },
  {
    title: "AI Summaries",
    body: "Turn long notes into clear summaries and action items instantly.",
    icon: (
      <div className="w-28 h-28 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[2rem]" />
        <SparklesIcon size="w-14 h-14" className="drop-shadow-2xl" />
      </div>
    ),
    highlights: ["KEY SUMMARIES", "TASK EXTRACTION", "ACTIONABLE STEPS"]
  },
  {
    title: "Stay organised",
    body: "Pin what matters, archive what's done, and find anything instantly.",
    icon: (
      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 animate-in zoom-in duration-500"><SearchIcon size="w-7 h-7" /></div>
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-amber-500 animate-in zoom-in duration-500 delay-75"><PinIcon size="w-7 h-7" /></div>
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-blue-500 animate-in zoom-in duration-500 delay-150"><ArchiveIcon size="w-7 h-7" /></div>
         <div className="w-14 h-14 rounded-[1.2rem] bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-rose-500 animate-in zoom-in duration-500 delay-200"><DeletedIcon size="w-7 h-7" /></div>
      </div>
    ),
    highlights: ["GLOBAL SEARCH", "PRIORITY PINNING", "SECURE ARCHIVING"]
  }
];

export default function App() {
  const { notes: initialNotes, profile: initialProfile } = storageService.loadData();
  const now = new Date();

  let activeProfile: UserProfile = initialProfile || {
    user_id: "",
    tier: "FREE",
    onboarded: false,
    usage: {
      summaries: 0,
      transcriptionsMinutes: 0,
      ocrScans: 0,
    },
    theme: "light",
    lastResetMonth: now.getMonth(),
    lastResetYear: now.getFullYear(),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  if (
    activeProfile.lastResetMonth !== now.getMonth() ||
    activeProfile.lastResetYear !== now.getFullYear()
  ) {
    activeProfile = {
      ...activeProfile,
      usage: { summaries: 0, transcriptionsMinutes: 0, ocrScans: 0 },
      lastResetMonth: now.getMonth(),
      lastResetYear: now.getFullYear()
    };
  }

  const [state, setState] = useState<AppState>(() => ({
    notes: initialNotes || [],
    profile: activeProfile,
    searchQuery: '',
    strategicBriefing: '',
    selectedTag: null,
    view: activeProfile.onboarded ? 'list' : 'onboarding',
    returnView: 'list',
    selectedNoteId: null,
  }));

  const [showPaywall, setShowPaywall] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [recordingTargetId, setRecordingTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; color?: string } | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuCategory, setAddMenuCategory] = useState<'root' | 'image'>('root');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEmptyDeletedConfirm, setShowEmptyDeletedConfirm] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const handleLogin = async (provider: 'azure' | 'apple' | 'google' | 'microsoft') => {
    try {
      hapticFeedback(); // Keep the vibration feedback
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error(`${provider} login error:`, error.message);
        showToast('Sign-in failed', 'error');
      }
    } catch (e) {
     console.error(e);
     showToast('Sign-in failed', 'error');
   }
  };

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Reordering logic
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const checklistItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const noteItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const checklistContainerRef = useRef<HTMLDivElement>(null);
  const checklistRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [autoFocusContent, setAutoFocusContent] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingLimitTimerRef = useRef<number | null>(null);
  const recordingTickerRef = useRef<number | null>(null);

  const hapticFeedback = () => {
    if ("vibrate" in navigator) navigator.vibrate(10);
  };

  const mapNoteFromDb = (row: any): Note => {
    return {
      id: row.id,
      title: row.title || 'New Note',
      content: row.content || '',
      summary: row.summary || '',
      strategicActions: row.strategic_actions || '',
      type: row.type || 'text',
      tags: row.tags || [],
      tasks: row.tasks || [],
      items: row.items || undefined,
      audioUrl: row.audio_url || undefined,
      isPinned: row.is_pinned,
      isArchived: row.is_archived,
      isDeleted: row.is_deleted,
      createdAt: typeof row.created_at === 'number' ? row.created_at : Date.now(),
      updatedAt: typeof row.updated_at === 'number' ? row.updated_at : Date.now(),
      counterPerspective: row.counter_perspective || undefined,
      orderIndex: row.order_index ?? (typeof row.created_at === 'number' ? row.created_at : Date.now()),
    } as Note;
  };
  const mapNoteToDb = (note: Note, userId: string) => ({
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    summary: note.summary || null,
    strategic_actions: note.strategicActions || null,
    counter_perspective: note.counterPerspective || null,
    type: note.type,
    tags: note.tags || [],
    tasks: note.tasks || [],
    items: note.items || [],
    audio_url: note.audioUrl || null,
    is_pinned: note.isPinned,
    is_archived: note.isArchived,
    is_deleted: note.isDeleted,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    order_index: note.orderIndex,
  });

  const syncProfileToSupabase = async (profile: UserProfile, userId: string) => {
    try {
      const nowTs = Date.now();
      await supabase
        .from('profiles')
        .upsert(
          {
            user_id: userId,
            tier: profile.tier,
            usage: profile.usage,
            theme: profile.theme,
            onboarded: profile.onboarded,
            lastResetMonth: profile.lastResetMonth,
            lastResetYear: profile.lastResetYear,
            created_at: profile.created_at,
            updated_at: nowTs,
          },
          { onConflict: 'user_id' }
        );
    } catch (e) {
      console.error('Error syncing profile to Supabase', e);
    }
  };

  const syncNoteToSupabase = async (note: Note) => {
    if (!user || !isOnline) return;
    try {
      await supabase
        .from('notes')
        .upsert(mapNoteToDb(note, user.id), { onConflict: 'id' });
    } catch (e) {
      console.error('Error syncing note to Supabase', e);
    }
  };

  const deleteNoteFromSupabase = async (id: string) => {
    if (!user || !isOnline) return;
    try {
      await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      console.error('Error deleting note from Supabase', e);
    }
  };

  const fullSyncWithSupabase = async (currentNotes: Note[], currentProfile: UserProfile, userId: string) => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const { data: remoteNotesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId);

      if (notesError) throw notesError;

      const remoteNotes = (remoteNotesData || []).map(mapNoteFromDb);

      const mergedMap = new Map<string, Note>();
      for (const n of remoteNotes) mergedMap.set(n.id, n);
      for (const n of currentNotes) {
        const existing = mergedMap.get(n.id);
        if (!existing || n.updatedAt > existing.updatedAt) {
          mergedMap.set(n.id, n);
        }
      }
      const mergedNotes = Array.from(mergedMap.values());

      setState(prev => ({
        ...prev,
        notes: mergedNotes,
        profile: currentProfile
      }));

      if (mergedNotes.length > 0) {
        const payload = mergedNotes.map(n => mapNoteToDb(n, userId));
        await supabase.from('notes').upsert(payload, { onConflict: 'id' });
      }

      await syncProfileToSupabase(currentProfile, userId);
    } catch (e) {
      console.error('Full sync error', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    storageService.saveData(state.notes, state.profile);
  }, [state.notes, state.profile]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(data.user ?? null);
      } catch (e) {
        console.error('Error getting user', e);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        let profile: UserProfile;
        const now = new Date();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error loading profile', profileError);
          profile = {
            ...state.profile,
          };
        } else if (!profileData) {
          profile = {
            ...state.profile,
            user_id: user.id,
          };
          const nowTs = Date.now();
          await supabase.from('profiles').insert({
            user_id: user.id,
            tier: profile.tier,
            usage: profile.usage,
            theme: profile.theme,
            onboarded: profile.onboarded,
            lastResetMonth: profile.lastResetMonth,
            lastResetYear: profile.lastResetYear,
            created_at: profile.created_at,
            updated_at: nowTs,
          });
        } else {
          profile = {
            user_id: profileData.user_id ?? state.profile.user_id,
            tier: profileData.tier ?? state.profile.tier,
            onboarded: profileData.onboarded ?? state.profile.onboarded,
            usage: profileData.usage ?? state.profile.usage,
            theme: profileData.theme ?? state.profile.theme,
            lastResetMonth: profileData.lastResetMonth ?? state.profile.lastResetMonth,
            lastResetYear: profileData.lastResetYear ?? state.profile.lastResetYear,
            created_at: profileData.created_at ?? state.profile.created_at,
            updated_at: Date.now(),
          };
        }

        if (
          profile.lastResetMonth !== now.getMonth() ||
          profile.lastResetYear !== now.getFullYear()
        ) {
          profile = {
            ...profile,
            usage: { summaries: 0, transcriptionsMinutes: 0, ocrScans: 0 },
            lastResetMonth: now.getMonth(),
            lastResetYear: now.getFullYear(),
          };
        }

        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id);

        if (notesError) {
          console.error('Error loading notes', notesError);
        }

        const remoteNotes = (notesData || []).map(mapNoteFromDb);

        const mergedMap = new Map<string, Note>();
        for (const n of remoteNotes) mergedMap.set(n.id, n);
        for (const n of state.notes) {
          const existing = mergedMap.get(n.id);
          if (!existing || n.updatedAt > existing.updatedAt) {
            mergedMap.set(n.id, n);
          }
        }
        const mergedNotes = Array.from(mergedMap.values());

        setState(prev => ({
          ...prev,
          notes: mergedNotes,
          profile,
          view: profile.onboarded ? 'list' : 'onboarding',
        }));

        await fullSyncWithSupabase(mergedNotes, profile, user.id);
      } catch (e) {
        console.error('Error loading user data', e);
      }
    };

    loadUserData();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setState(prev => {
            let notes = [...prev.notes];
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const incoming = mapNoteFromDb(payload.new);
              const idx = notes.findIndex(n => n.id === incoming.id);
              if (idx === -1) {
                notes.push(incoming);
              } else {
                if (incoming.updatedAt > notes[idx].updatedAt) {
                  notes[idx] = incoming;
                }
              }
            } else if (payload.eventType === 'DELETE') {
              const id = payload.old.id;
              notes = notes.filter(n => n.id !== id);
            }
            return { ...prev, notes };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Back Online", "success");
      if (user) {
        fullSyncWithSupabase(state.notes, state.profile, user.id);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Offline Mode", "info");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, state.notes, state.profile]);

  useEffect(() => {
    if (state.profile.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
  }, [state.profile.theme]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, state.selectedNoteId]);

  useEffect(() => {
    if (focusTargetId) {
      setEditingItemId(focusTargetId);
      setTimeout(() => {
        const el = checklistRefs.current.get(focusTargetId);
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
          setFocusTargetId(null);
        }
      }, 0);
    }
  }, [focusTargetId]);

  useEffect(() => {
    if (autoFocusContent && state.view === 'detail' && contentRef.current) {
      contentRef.current.focus();
      setAutoFocusContent(false);
    }
  }, [autoFocusContent, state.view]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', color?: string) => {
    setToast({ message, type, color });
    setTimeout(() => setToast(null), 3000);
  };

  const checkQuota = (key: keyof typeof TIER_LIMITS.FREE): boolean => {
    const limit = TIER_LIMITS[state.profile.tier][key];
    const used = state.profile.usage[key];
    if (used >= limit) {
      hapticFeedback();
      setShowPaywall(true);
      return false;
    }
    return true;
  }

  const incrementQuota = (key: keyof typeof TIER_LIMITS.FREE, amount = 1) => {
    setState(prev => {
      const updatedProfile: UserProfile = {
        ...prev.profile,
        usage: { ...prev.profile.usage, [key]: prev.profile.usage[key] + amount }
      };
      if (user && isOnline) {
        syncProfileToSupabase(updatedProfile, user.id);
      }
      return {
        ...prev,
        profile: updatedProfile
      };
    });
  };

  const toggleTheme = () => {
    hapticFeedback();
    setState(prev => {
      const newTheme = prev.profile.theme === 'dark' ? 'light' : 'dark';
      const updatedProfile: UserProfile = { ...prev.profile, theme: newTheme };
      if (user && isOnline) {
        syncProfileToSupabase(updatedProfile, user.id);
      }
      return {
        ...prev,
        profile: updatedProfile
      };
    });
  };

  const sortedNotes = useMemo(() => {
    return [...state.notes].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.orderIndex !== b.orderIndex) return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
      return b.updatedAt - a.updatedAt;
    });
  }, [state.notes]);

  const activeNotes = useMemo(() => {
    let list = sortedNotes.filter(n => {
      if (state.view === 'deleted') return n.isDeleted;
      if (state.view === 'archive') return n.isArchived && !n.isDeleted;
      return !n.isArchived && !n.isDeleted;
    });
    
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q) ||
        (n.items && n.items.some(item => item.text.toLowerCase().includes(q))) ||
        (n.summary && n.summary.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sortedNotes, state.searchQuery, state.view]);

  const currentNote = useMemo(() => state.notes.find(n => n.id === state.selectedNoteId), [state.notes, state.selectedNoteId]);

  const handleCreateNote = (type: NoteType = 'text', initialContent = '') => {
    hapticFeedback();
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    
    let defaultTitle = 'New Note';
    if (type === 'audio') defaultTitle = 'Voice Note';
    else if (type === 'checklist') defaultTitle = 'New List';
    
    if (type === 'checklist') {
      setFocusTargetId('1');
    } else if (type === 'text' || type === 'image' || type === 'audio') {
      setAutoFocusContent(true);
    }

    const createdAt = Date.now();
    const minOrderIndex = state.notes.length > 0 ? Math.min(...state.notes.map(n => n.orderIndex ?? 0)) : 0;
    
    const newNote: Note = {
      id, 
      title: defaultTitle, 
      content: initialContent, 
      type, 
      tags: [], 
      tasks: [], 
      createdAt: createdAt, 
      updatedAt: createdAt, 
      isPinned: false, 
      isArchived: false, 
      isDeleted: false,
      orderIndex: minOrderIndex - 1,
      items: type === 'checklist' ? [{ id: '1', text: '', completed: false }] : undefined
    };
    setState(prev => ({ ...prev, notes: [newNote, ...prev.notes], selectedNoteId: id, view: 'detail', returnView: 'list' }));
    setIsAddMenuOpen(false);
    setAddMenuCategory('root');

    if (user && isOnline) {
      syncNoteToSupabase(newNote);
    }

    return id;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setState(prev => {
      const updatedNotes = prev.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n);
      const updatedNote = updatedNotes.find(n => n.id === id);
      if (updatedNote && user && isOnline) {
        syncNoteToSupabase(updatedNote);
      }
      return { ...prev, notes: updatedNotes };
    });
  };

  const togglePin = (id: string) => {
    hapticFeedback();
    const note = state.notes.find(n => n.id === id);
    if (note) {
      updateNote(id, { isPinned: !note.isPinned });
      showToast(note.isPinned ? 'Unpinned' : 'Pinned to top', 'info', 'bg-amber-400');
    }
  };

  const archiveNote = (id: string) => {
    hapticFeedback();
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const willBeArchived = !note.isArchived;
    updateNote(id, { isArchived: willBeArchived });
    showToast(willBeArchived ? 'Sent to Archive' : 'Restored to home', 'info', 'bg-blue-400');
    if (state.selectedNoteId === id) setState(p => ({ ...p, view: p.returnView || 'list', selectedNoteId: null }));
  };

  const toggleDelete = (id: string) => {
    hapticFeedback();
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const willBeDeleted = !note.isDeleted;
    updateNote(id, { isDeleted: willBeDeleted });
    showToast(willBeDeleted ? 'Moved to Deleted' : 'Restored', willBeDeleted ? 'info' : 'success', willBeDeleted ? 'bg-rose-500' : undefined);
    if (state.selectedNoteId === id) setState(p => ({ ...p, view: p.returnView || 'list', selectedNoteId: null }));
  };

  const permanentlyDeleteNote = (id: string) => {
    hapticFeedback();
    setState(prev => {
      const newNotes = prev.notes.filter(n => n.id !== id);
      return {
        ...prev,
        notes: newNotes,
        selectedNoteId: prev.selectedNoteId === id ? null : prev.selectedNoteId,
        view: prev.selectedNoteId === id ? (prev.returnView || 'list') : prev.view
      };
    });
    if (user && isOnline) {
      deleteNoteFromSupabase(id);
    }
    showToast('Deleted forever', 'error', 'bg-rose-500');
  };

  const emptyDeleted = () => {
    hapticFeedback();
    setShowEmptyDeletedConfirm(true);
  };

  const confirmEmptyDeleted = () => {
    hapticFeedback();
    const deletedIds = state.notes.filter(n => n.isDeleted).map(n => n.id);
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(n => !n.isDeleted)
    }));
    if (user && isOnline && deletedIds.length > 0) {
      deletedIds.forEach(id => deleteNoteFromSupabase(id));
    }
    setShowEmptyDeletedConfirm(false);
    showToast("Deleted Forever", "success", "bg-rose-500");
  };
  const handleAiAction = async (action: 'summarize' | 'polish' | 'steps' | 'counter') => {
    if (!currentNote || isAiLoading) return;
    if (!isOnline) {
      hapticFeedback();
      showToast("Internet required for AI", "info");
      return;
    }
    hapticFeedback();
    setIsAiLoading(true); 
    try {
      const content = currentNote.type === 'checklist' ? currentNote.items?.map(i => i.text).join('\n') || '' : currentNote.content;
      if (!content.trim() && !currentNote.audioUrl) { 
        showToast('Write something first', 'info'); 
        setIsAiLoading(false); 
        return; 
      }

      switch(action) {
        case 'summarize': 
          if (!checkQuota('summaries')) break;
          const [sum, tags, tasks, title] = await Promise.all([
            geminiService.summarizeNote(content), 
            geminiService.suggestTags(content),
            geminiService.extractTasks(content), 
            geminiService.generateTitle(content)
          ]);
          updateNote(currentNote.id, { 
            summary: sum, 
            tags: [...new Set([...currentNote.tags, ...tags])], 
            tasks, 
            title 
          });
          incrementQuota('summaries');
          showToast('Caught up on this note'); 
          break;

        case 'polish':
          const polished = await geminiService.rewriteProfessional(content);
          updateNote(currentNote.id, { content: polished });
          showToast('Text cleaned up'); 
          break;

        case 'steps':
          const steps = await geminiService.getNextSteps(content);
          updateNote(currentNote.id, { strategicActions: steps });
          showToast('What to do next'); 
          break;

        case 'counter':
          const risk = await geminiService.getCounterPerspective(content);
          updateNote(currentNote.id, { counterPerspective: risk });
          showToast('A fresh perspective'); 
          break;
      }
    } catch (e: any) { 
      console.error(e);
      const isRateLimit = e?.message?.includes('429') || e?.status === 429;
      showToast(isRateLimit ? 'Too many requests. Please wait a moment.' : 'Problem with the internet', 'error'); 
    } 
    finally { 
      setIsAiLoading(false); 
    }
  };

  const uploadAudioToSupabase = async (blob: Blob, noteId: string) => {
    if (!user || !isOnline) return null;
    try {
      const filePath = `${user.id}/${noteId}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(filePath, blob, {
          contentType: 'audio/webm',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('audio').getPublicUrl(filePath);
      return publicUrlData.publicUrl || null;
    } catch (e) {
      console.error('Error uploading audio', e);
      return null;
    }
  };

  const startRecording = async (existingNoteId?: string) => {
    try {
      hapticFeedback();
      const targetId = existingNoteId || recordingTargetId;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        
        const noteId = targetId || handleCreateNote('audio');
        updateNote(noteId as string, { audioUrl: localUrl });
        
        const remoteUrl = await uploadAudioToSupabase(blob, noteId as string);
        if (remoteUrl) {
          updateNote(noteId as string, { audioUrl: remoteUrl });
        }

        if (isOnline && checkQuota('transcriptionsMinutes')) {
          setIsTranscribing(true);
          try {
            const base64 = await new Promise<string>((res) => {
              const r = new FileReader(); 
              r.onloadend = () => res((r.result as string).split(',')[1]); 
              r.readAsDataURL(blob);
            });
            const text = await geminiService.transcribeAudio(base64);
            const title = await geminiService.generateTitle(text);
            updateNote(noteId as string, { content: text, title });
            incrementQuota('transcriptionsMinutes', 1);
            showToast('Transcription done');
          } catch (e: any) { 
            const isRateLimit = e?.message?.includes('429') || e?.status === 429;
            showToast(isRateLimit ? 'Voice AI is busy. Try in a few seconds.' : 'Could not transcribe', 'error'); 
          }
          finally { 
            setIsTranscribing(false); 
          }
        } else if (!isOnline) {
          showToast("Offline: Recording saved without transcript", "info");
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      if (existingNoteId) setRecordingTargetId(existingNoteId);

      recordingLimitTimerRef.current = window.setTimeout(() => {
        stopRecording();
        showToast("Recording limit (10m) reached", "info");
      }, 600000);

      recordingTickerRef.current = window.setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

    } catch (err) { 
      console.error("Mic access error:", err);
      showToast('Need microphone access to record audio', 'error'); 
    }
  };

  const stopRecording = () => {
    hapticFeedback();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTargetId(null);
    setRecordingSeconds(0);
    
    if (recordingLimitTimerRef.current) {
      clearTimeout(recordingLimitTimerRef.current);
      recordingLimitTimerRef.current = null;
    }
    if (recordingTickerRef.current) {
      clearInterval(recordingTickerRef.current);
      recordingTickerRef.current = null;
    }
  };

  const triggerScan = (mode: 'camera' | 'gallery') => {
    if (!isOnline) {
      hapticFeedback();
      showToast("Internet required for scanning", "info");
      return;
    }
    if (fileInputRef.current) {
      if (mode === 'camera') {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.value = ''; 
      fileInputRef.current.click();
    }
  };

  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isOnline) {
      showToast("Connection lost. Scan aborted.", "error");
      return;
    }
    if (!checkQuota('ocrScans')) return;

    setIsAiLoading(true);
    setIsAddMenuOpen(false);
    setAddMenuCategory('root');
    
    try {
      const mimeType = file.type || 'image/jpeg';
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader(); 
        r.onloadend = () => res((r.result as string).split(',')[1]); 
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      
      const text = await geminiService.performOCR(base64, mimeType);
      
      const noteContent = text && text.trim().length > 0 ? text : "Scan complete. No text detected in this image.";
      const title = text && text.trim().length > 0 ? await geminiService.generateTitle(text) : "Image Scan";
      
      hapticFeedback();
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
      const newNote: Note = {
        id, 
        title, 
        content: noteContent, 
        type: 'image', 
        tags: [], 
        tasks: [], 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        isPinned: false, 
        isArchived: false, 
        isDeleted: false,
        orderIndex: Date.now(),
      };
      
      setState(prev => ({ 
        ...prev, 
        notes: [newNote, ...prev.notes], 
        selectedNoteId: id, 
        view: 'detail',
        returnView: 'list'
      }));

      if (user && isOnline) {
        syncNoteToSupabase(newNote);
      }
      
      incrementQuota('ocrScans');
      showToast(text && text.trim().length > 0 ? 'Scanning complete' : 'Image saved (no text detected)');
    } catch (err: any) { 
      console.error("OCR Scan Process Error:", err);
      const isRateLimit = err?.message?.includes('429') || err?.status === 429 || JSON.stringify(err).includes('429');
      showToast(isRateLimit ? 'Gemini API Rate Limit hit. Try again in 1 minute.' : 'Problem processing your image', 'error'); 
    }
    finally { 
      setIsAiLoading(false); 
    }
  };

  const handleAddChecklistItem = (afterId?: string) => {
    if (!currentNote || currentNote.type !== 'checklist') return;
    hapticFeedback();
    const newItemId = Math.random().toString(36).substr(2, 9);
    const newItem: ChecklistItem = { id: newItemId, text: '', completed: false };
    const currentItems = currentNote.items || [];
    let newItems: ChecklistItem[] = [];
    
    if (afterId) {
      const idx = currentItems.findIndex(i => i.id === afterId);
      newItems = [...currentItems];
      newItems.splice(idx + 1, 0, newItem);
    } else {
      newItems = [...currentItems, newItem];
    }
    
    setFocusTargetId(newItemId);
    updateNote(currentNote.id, { items: newItems });
  };

  // Improved Reordering Logic for Checklists
  const handlePointerDownChecklist = (id: string, e: React.PointerEvent) => {
    if (currentNote?.isDeleted) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');
    hapticFeedback();
    setDraggedItemId(id);
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!currentNote || currentNote.type !== 'checklist') return;
      const y = moveEvent.clientY;
      const visibleItems = currentNote.items || [];
      
      let overId: string | null = null;
      for (const [itemId, ref] of checklistItemRefs.current.entries()) {
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          overId = itemId;
          break;
        }
      }

      if (overId && overId !== id) {
        const fromIdx = visibleItems.findIndex(i => i.id === id);
        const toIdx = visibleItems.findIndex(i => i.id === overId);
        
        if (fromIdx !== -1 && toIdx !== -1) {
          const newItems = [...visibleItems];
          const [dragged] = newItems.splice(fromIdx, 1);
          newItems.splice(toIdx, 0, dragged);
          updateNote(currentNote.id, { items: newItems });
          hapticFeedback();
        }
      }
    };

    const handlePointerUp = () => {
      setDraggedItemId(null);
      document.body.classList.remove('dragging');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Improved Reordering Logic for Notes
  const handlePointerDownNote = (id: string, e: React.PointerEvent) => {
    if (state.searchQuery) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');
    hapticFeedback();
    setDraggedItemId(id);
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const y = moveEvent.clientY;
      const visibleNotes = activeNotes;
      
      let overId: string | null = null;
      for (const [noteId, ref] of noteItemRefs.current.entries()) {
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          overId = noteId;
          break;
        }
      }

      if (overId && overId !== id) {
        const fromIdx = visibleNotes.findIndex(n => n.id === id);
        const toIdx = visibleNotes.findIndex(n => n.id === overId);
        
        if (fromIdx !== -1 && toIdx !== -1) {
          const newActiveNotes = [...visibleNotes];
          const [dragged] = newActiveNotes.splice(fromIdx, 1);
          newActiveNotes.splice(toIdx, 0, dragged);
          
          // Optimistically update local state for visual smoothness
          const allNotes = [...state.notes];
          newActiveNotes.forEach((note, idx) => {
            const found = allNotes.find(n => n.id === note.id);
            if (found) found.orderIndex = idx;
          });
          
          setState(prev => ({ ...prev, notes: allNotes }));
          hapticFeedback();
        }
      }
    };

    const handlePointerUp = () => {
      setDraggedItemId(null);
      document.body.classList.remove('dragging');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      // Final persistence sync
      if (user && isOnline) {
        state.notes.forEach(syncNoteToSupabase);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Enhanced multi-item delete handler listening on window to avoid focus issues
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (state.view !== 'detail' || !currentNote || currentNote.type !== 'checklist' || currentNote.isDeleted) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const currentItems = currentNote.items || [];
      const idsToRemove: string[] = [];
      
      // Iterate through checklist items and check if their container intersects the selection range
      currentItems.forEach(item => {
        const el = document.querySelector(`[data-checklist-id="${item.id}"]`);
        if (el && range.intersectsNode(el)) {
          idsToRemove.push(item.id);
        }
      });

      // If multiple items are highlighted, process batch deletion
      if (idsToRemove.length > 1) {
        e.preventDefault();
        hapticFeedback();
        
        const firstRemovedIdx = currentItems.findIndex(i => i.id === idsToRemove[0]);
        let targetFocusId: string | null = null;
        
        // Target focus to the item before the removed block
        if (firstRemovedIdx > 0) {
          targetFocusId = currentItems[firstRemovedIdx - 1].id;
        } else {
          // If the first item was removed, target the new first item
          const remaining = currentItems.filter(i => !idsToRemove.includes(i.id));
          if (remaining.length > 0) targetFocusId = remaining[0].id;
        }
        
        const newItems = currentItems.filter(i => !idsToRemove.includes(i.id));
        
        // Ensure at least one empty item remains
        if (newItems.length === 0) {
          const newItemId = Math.random().toString(36).substr(2, 9);
          newItems.push({ id: newItemId, text: '', completed: false });
          setFocusTargetId(newItemId);
        } else if (targetFocusId) {
          setFocusTargetId(targetFocusId);
        }

        updateNote(currentNote.id, { items: newItems });
        // Clear selection to avoid triggering again on the new state
        selection.removeAllRanges();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [state.view, currentNote?.id, currentNote?.items?.length, currentNote?.isDeleted]);

  const addMenuItems = useMemo(() => {
    if (addMenuCategory === 'root') {
      return [
        { label: 'Audio', icon: <AudioIcon className="w-6 h-6 text-indigo-500" />, action: () => handleCreateNote('audio') },
        { label: 'Image', icon: <ImageIcon className={`w-6 h-6 text-emerald-500 ${!isOnline ? 'opacity-30' : ''}`} />, action: () => { if(isOnline) { hapticFeedback(); setAddMenuCategory('image'); } else showToast("Internet needed to scan", "info"); } },
        { label: 'List', icon: <CheckIcon className="w-6 h-6 text-amber-500" />, action: () => handleCreateNote('checklist') },
        { label: 'Text', icon: <NoteIcon className="w-6 h-6 text-blue-500" />, action: () => handleCreateNote('text') }
      ];
    }
    return [
      { label: 'Back', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>, action: () => { hapticFeedback(); setAddMenuCategory('root'); } },
      { label: 'Take Photo', icon: <ScanIcon className="w-6 h-6" />, action: () => triggerScan('camera') },
      { label: 'From Gallery', icon: <ImageIcon className="w-6 h-6" />, action: () => triggerScan('gallery') },
    ];
  }, [addMenuCategory, isOnline]);

  const QuotaIndicator = ({ label, used, limit }: { label: string, used: number, limit: number }) => {
    const percentage = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
    return (
      <div className="bg-slate-50/80 dark:bg-slate-900/80 p-6 rounded-[2.5rem] space-y-4 border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex justify-between items-center px-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</span>
          <span className="text-[12px] font-black text-slate-900 dark:text-white tracking-tighter">
            {used} / {limit === Infinity ? '∞' : limit}
          </span>
        </div>
        <div className="h-3 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 dark:bg-indigo-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)] dark:shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
            style={{ width: `${limit === Infinity ? 100 : percentage}%`, opacity: limit === Infinity ? 0.3 : 1 }} 
          />
        </div>
      </div>
    );
  };

  const renderNoteActions = (note: Note, isDeletedView: boolean, layout: 'list' | 'grid') => {
    if (isDeletedView) {
      return (
        <div className={`flex gap-2 ${layout === 'list' ? 'scale-75 origin-right' : 'scale-90 justify-center w-full mt-4'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleDelete(note.id); }}
            className="px-4 py-2 rounded-2xl text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Restore
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); permanentlyDeleteNote(note.id); }}
            className="px-4 py-2 rounded-2xl text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Delete
          </button>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${layout === 'list' ? '-mt-1 -mr-1' : 'justify-center w-full mt-4'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
          className={`p-2.5 rounded-[1.2rem] transition-all flex items-center justify-center ${note.isPinned ? 'text-amber-600 bg-amber-100/80 dark:bg-amber-900/40 shadow-sm scale-105' : 'text-amber-500 bg-amber-50 dark:bg-slate-800/50 hover:bg-amber-100 dark:hover:bg-slate-800'}`}
        >
          <PinIcon active={note.isPinned} className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); archiveNote(note.id); }}
          className={`p-2.5 rounded-[1.2rem] transition-all flex items-center justify-center ${note.isArchived ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 shadow-sm scale-105' : 'text-blue-500 bg-blue-50 dark:bg-slate-800/50 hover:bg-amber-100 dark:hover:bg-slate-800'}`}
        >
          <ArchiveIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleDelete(note.id); }}
          className={`p-2.5 rounded-[1.2rem] transition-all flex items-center justify-center ${note.isDeleted ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 shadow-sm scale-105' : 'text-rose-500 bg-rose-50 dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-slate-800'}`}
        >
          <DeletedIcon className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex items-center gap-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-bl-sm w-fit shadow-sm">
      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
    </div>
  );

    if (authLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="mb-6">
          <CompassLogo size="w-16 h-16" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Loading...</p>
      </div>
    );
  }
    if (!user) {
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden font-sans select-none transition-colors">
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">

          <div className="mb-4 relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-white rounded-full shadow-2xl" />
            <CompassLogo size="w-24 h-24" className="relative z-10 !rounded-full !shadow-none" />
          </div>

          <h1 className="text-2xl font-black tracking-tighter mb-2">
            NoteCompass AI
          </h1>

          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs font-medium text-sm">
            Sign in to sync your notes across devices.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={() => handleLogin('azure')}
              className="w-[255px] max-w-full py-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-800"
            >
              <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">M</span>
              Continue with Microsoft
            </button>

            <button
              onClick={() => handleLogin('google')}
              className="w-[255px] max-w-full py-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-800"
            >
              <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">G</span>
              Continue with Google
            </button>

            <button
              onClick={() => handleLogin('apple')}
              className="w-[255px] max-w-full py-3.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-800"
            >
              <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">A</span>
              Continue with Apple
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden font-sans select-none transition-colors duration-300">
      
      <AnimatePresence>
        {showSplash && (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoScan} />

      {!isOnline && (
        <div className="bg-amber-500/10 dark:bg-amber-900/20 py-2 px-6 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 relative z-[1001] border-b border-amber-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Limited Mode: Offline</span>
        </div>
      )}

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-3xl shadow-2xl text-[11px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-6 bg-slate-900 dark:bg-slate-800 text-white flex items-center gap-3 transition-colors">
          <div className={`w-1.5 h-1.5 rounded-full ${
            toast.color ? toast.color : 
            (toast.type === 'success' ? 'bg-emerald-400' : 
             toast.type === 'error' ? 'bg-rose-400' : 'bg-blue-400')
          }`} />
          {toast.message}
        </div>
      )}

      {isRecording && (
        <div className="absolute inset-0 z-[1300] bg-slate-900/95 dark:bg-slate-950/95 flex flex-col items-center justify-center p-12 text-center animate-in fade-in transition-colors">
          <div className="w-40 h-40 bg-rose-500 rounded-full flex items-center justify-center mb-12 shadow-[0_0_80px_rgba(244,63,94,0.4)] pulse-soft">
            <AudioIcon className="w-[104px] h-[104px] text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Recording Audio...</h2>
          <div className="text-xl font-black text-white mb-4 tracking-widest bg-white/10 px-6 py-2 rounded-full">
            {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')} / 10:00
          </div>
          <p className="text-rose-200/60 font-bold mb-16 max-w-[200px]">Speak clearly to get the best transcription results.</p>
          <button 
            onClick={stopRecording}
            className="w-full max-w-xs py-7 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-all shadow-2xl"
          >
            Stop Recording
          </button>
        </div>
      )}

      {(isAiLoading || isTranscribing) && (
        <div className="absolute inset-0 z-[1100] glass dark:bg-slate-950/70 flex flex-col items-center justify-center gap-6 animate-in fade-in transition-colors">
          <div className="relative">
            <div className="w-20 h-20 border-[6px] border-slate-100 dark:border-slate-800 border-t-slate-900 dark:border-t-indigo-500 rounded-full animate-spin transition-colors" />
            <SparklesIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-slate-900 dark:text-indigo-400 pulse-soft transition-colors" />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] transition-colors">{isTranscribing ? 'Transcribing...' : 'Thinking...'}</p>
        </div>
      )}

      {state.view === 'onboarding' && (
        <div className="absolute inset-0 flex flex-col bg-white dark:bg-slate-950 z-[2000] transition-colors overflow-hidden">
           <div className="flex-1 flex flex-col items-center justify-start pt-6 p-6 text-center overflow-hidden no-scrollbar pb-48">
              <div className="h-48 flex items-center justify-center mb-4 spring-up shrink-0 w-full">
                {onboardingScreens[onboardingStep].icon}
              </div>
              
              <div className="w-full max-w-xs mx-auto">
                <h1 className="text-3xl font-black mb-2 tracking-tighter text-slate-900 dark:text-white leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {onboardingScreens[onboardingStep].title}
                </h1>
                
                <p className="text-slate-500 dark:text-slate-400 mb-4 leading-relaxed px-4 text-[17px] font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                  {onboardingScreens[onboardingStep].body}
                </p>
                <div className="flex flex-col gap-2 w-full items-center animate-in fade-in duration-1000 delay-300">
                  {onboardingScreens[onboardingStep].highlights.map((h, i) => (
                    <div key={i} className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800/50 py-2 px-6 rounded-2xl bg-slate-50/30 dark:bg-slate-900/30 w-fit">
                      {h}
                    </div>
                  ))}
                </div>
              </div>
           </div>

           <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent pt-10 pb-12 px-8 flex flex-col items-center gap-6 pointer-events-none">
              <div className="flex gap-2 pointer-events-auto">
                {onboardingScreens.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${onboardingStep === i ? 'w-10 bg-slate-900 dark:bg-indigo-500 shadow-sm' : 'w-1.5 bg-slate-100 dark:bg-slate-800'}`} />
                ))}
              </div>

              <div className="w-full flex flex-col pointer-events-auto">
                <button 
                  onClick={() => { 
                    hapticFeedback(); 
                    if (onboardingStep < 3) {
                      setOnboardingStep(s => s + 1);
                    } else {
                      setState(p => {
                        const updatedProfile: UserProfile = { ...p.profile, onboarded: true };
                        if (user && isOnline) {
                          syncProfileToSupabase(updatedProfile, user.id);
                        }
                        return { ...p, view: 'list', profile: updatedProfile };
                      });
                    }
                  }}
                  className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-2xl active:scale-[0.98] transition-all text-sm uppercase tracking-[0.2em]"
                >
                  {onboardingStep === 3 ? "Get Started" : "Continue"}
                </button>
              </div>
           </div>
        </div>
      )}
      {['list', 'archive', 'deleted'].includes(state.view) && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="px-6 pt-12 pb-4 border-b border-slate-100 dark:border-slate-900 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-[400] transition-colors">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="dark:bg-white rounded-full p-0.5 transition-colors">
                  <CompassLogo size="w-9 h-9" className="rotate-3 transition-colors" />
                </div>
                <h1 className="text-2xl font-black tracking-tighter leading-none text-slate-900 dark:text-white transition-colors">
                  {state.view === 'list' ? 'My Notes' : state.view.charAt(0).toUpperCase() + state.view.slice(1)}
                </h1>
              </div>
              <div className="flex gap-4">
                {state.view === 'deleted' && activeNotes.length > 0 && (
                  <button 
                    onClick={() => { hapticFeedback(); emptyDeleted(); }} 
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all flex items-center justify-center group"
                    title="Clear Deleted Items"
                  >
                    <DeletedIcon className="w-5 h-5 text-rose-500 dark:text-rose-400 group-active:scale-90 transition-transform" />
                  </button>
                )}
                {activeNotes.length > 0 && (
                  <button 
                    onClick={() => { hapticFeedback(); setLayoutMode(l => l==='list'?'grid':'list'); }} 
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  >
                    {layoutMode === 'list' 
                      ? <GridIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" /> 
                      : <ListIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    }
                  </button>
                )}
                <button 
                  onClick={() => { hapticFeedback(); setState(p => ({...p, view:'settings'})); }} 
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  <AccountIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            <div className="relative group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-focus-within:text-slate-900 dark:group-focus-within:text-slate-200 transition-colors" />
              <input 
                type="text" 
                placeholder="Search..."
                className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl py-3 pl-11 pr-4 font-bold text-[13px] outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 border border-transparent focus:border-slate-100 dark:focus:border-slate-800 text-slate-900 dark:text-white"
                value={state.searchQuery} 
                onChange={(e) => setState(p => ({...p, searchQuery: e.target.value}))}
              />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 no-scrollbar pb-32">
            {activeNotes.length === 0 ? (
              <EmptyState 
                icon={
                  state.view === 'deleted' ? <DeletedIcon className="w-7 h-7" /> : 
                  state.view === 'archive' ? <ArchiveIcon className="w-7 h-7" /> : 
                  state.searchQuery ? <SearchIcon className="w-7 h-7" /> : 
                  <NoteIcon className="w-7 h-7" />
                }
                title={
                  state.view === 'deleted' ? "No deleted notes" : 
                  state.view === 'archive' ? "Archive is empty" : 
                  state.searchQuery ? "No matches found" : "No notes yet"
                }
                description=""
              />
            ) : (
              <div className={layoutMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-3"}>
                {activeNotes.map((note, index) => (
                  <div 
                    key={note.id} 
                    ref={el => { if (el) noteItemRefs.current.set(note.id, el); }}
                    onClick={() => { 
                      hapticFeedback(); 
                      setState(p => ({
                        ...p, 
                        selectedNoteId: note.id, 
                        view: 'detail', 
                        returnView: p.view as any 
                      })); 
                    }}
                    className={`p-4 px-4.5 rounded-[1.4rem] border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:shadow transition-all cursor-pointer relative group flex flex-col ${layoutMode === 'list' ? 'min-h-[70px]' : 'min-h-[120px]'} ${
                      draggedItemId === note.id 
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-700 opacity-50 scale-[0.98] z-50 shadow-none select-none pointer-events-none' 
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="flex gap-2 items-center overflow-hidden flex-1">
                        {layoutMode === 'list' && !state.searchQuery && (
                          <div 
                            onPointerDown={(e) => { e.stopPropagation(); handlePointerDownNote(note.id, e); }}
                            className={`p-1.5 -ml-1 rounded-xl transition-all cursor-grab active:cursor-grabbing touch-none flex items-center justify-center select-none ${
                              draggedItemId === note.id 
                                ? 'text-indigo-500 scale-125 bg-white dark:bg-slate-800 shadow-sm' 
                                : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-500'
                            }`}
                            style={{ touchAction: 'none' }}
                          >
                            <DragIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className={`p-0.5 transition-colors flex-shrink-0 ${
                          note.type === 'audio' ? 'text-indigo-500' :
                          note.type === 'image' ? 'text-emerald-500' :
                          note.type === 'checklist' ? 'text-amber-500' :
                          'text-blue-500'
                        }`}>
                           {note.type === 'audio' ? <AudioIcon className="w-4 h-4" /> 
                            : note.type === 'checklist' ? <CheckIcon className="w-4 h-4" /> 
                            : note.type === 'image' ? <ImageIcon className="w-4 h-4" /> 
                            : <NoteIcon className="w-4 h-4" />}
                        </div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white truncate leading-tight text-[13px] transition-colors">
                          {note.title || 'Untitled'}
                        </h3>
                      </div>
                      
                      {layoutMode === 'list' && (
                        <div className="flex-shrink-0">
                          {renderNoteActions(note, !!note.isDeleted, 'list')}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] line-clamp-1 leading-relaxed mb-1.5 font-bold flex-1 transition-colors">
                      {note.type === 'checklist' 
                        ? (note.items?.map(i => i.text).filter(t => t.trim() !== '').join(', ') || 'Empty List')
                        : (note.content || note.summary || 'Empty')}
                    </p>

                    {layoutMode === 'grid' && (
                      <div className="mt-auto">
                        {renderNoteActions(note, !!note.isDeleted, 'grid')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>

          {state.view === 'list' && (
            <button 
              onClick={() => { 
                hapticFeedback(); 
                setIsAddMenuOpen(!isAddMenuOpen); 
                if (isAddMenuOpen) setAddMenuCategory('root'); 
              }} 
              className="fixed bottom-32 right-6 w-16 h-16 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.6rem] shadow-2xl flex items-center justify-center z-[1000] active:scale-90 transition-all"
            >
              <PlusIcon className={`w-8 h-8 transition-transform duration-500 ${isAddMenuOpen ? 'rotate-45' : ''}`} />
            </button>
          )}

          {isAddMenuOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/10 dark:bg-slate-950/40 backdrop-blur-sm z-[950] animate-in fade-in transition-colors" 
              onClick={() => { setIsAddMenuOpen(false); setAddMenuCategory('root'); }}
            >
               <div className="absolute bottom-52 right-6 flex flex-col items-end gap-4">
                 {addMenuItems.map((i, idx) => (
                   <button 
                     key={idx} 
                     onClick={(e) => { e.stopPropagation(); i.action(); }} 
                     className="flex items-center gap-4 animate-in slide-in-from-bottom-6" 
                     style={{animationDelay: `${idx*50}ms`}}
                   >
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-5 py-3 rounded-xl shadow-xl border border-slate-50 dark:border-slate-700 transition-colors">
                       {i.label}
                     </span>
                     <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-2xl active:scale-90 transition-colors">
                       {i.icon}
                     </div>
                   </button>
                 ))}
               </div>
            </div>
          )}

          <nav className="fixed bottom-0 inset-x-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-900 h-24 flex items-center justify-around px-10 z-[900] transition-colors">
            {[
              { id: 'list', icon: <HomeIcon className="w-6 h-6" />, label: 'Home' },
              { id: 'archive', icon: <ArchiveIcon className="w-6 h-6" />, label: 'Archive' },
              { id: 'deleted', icon: <DeletedIcon className="w-6 h-6" />, label: 'Deleted' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => { hapticFeedback(); setState(p => ({...p, view: tab.id as any})); }}
                className={`flex flex-col items-center gap-1.5 transition-all ${state.view === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-700'}`}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  {tab.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {state.view === 'detail' && currentNote && (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden animate-in slide-in-from-right-full duration-500 z-[500] transition-colors">
           <header className="px-5 pt-6 pb-4 flex items-center justify-between bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-[600] border-b border-slate-50 dark:border-slate-900 transition-colors">
             <button 
               onClick={() => { 
                 hapticFeedback(); 
                 setState(p => ({
                   ...p, 
                   view: p.returnView || 'list', 
                   selectedNoteId: null
                 })); 
               }} 
               className="p-2 text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-all"
             >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor">
                 <path d="M15.75 19.5 8.25 12l7.5-7.5" />
               </svg>
             </button>
             
             <div className="flex items-center gap-5">
               {!currentNote.isDeleted && (
                 <>
                   <button 
                    disabled={!isOnline}
                    onClick={() => handleAiAction('summarize')}
                    className={`flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_8px_20px_rgba(99,102,241,0.25)] ${
                      !isOnline ? 'opacity-40 grayscale pointer-events-none' : ''
                    }`}
                   >
                     <span className="w-4"><SparklesIcon /></span> AI Summary
                   </button>

                   <div className="flex items-center gap-3 p-1">
                     <button 
                       onClick={() => togglePin(currentNote.id)} 
                       className={`p-2.5 rounded-[1.2rem] transition-all flex items-center justify-center ${
                         currentNote.isPinned 
                           ? 'text-amber-600 bg-amber-100/80 dark:bg-amber-900/40 shadow-sm scale-105' 
                           : 'text-amber-500 bg-amber-50 dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-slate-800'
                       }`}
                     >
                       <PinIcon active={currentNote.isPinned} className="w-5 h-5" />
                     </button>

                     <button 
                       onClick={() => archiveNote(currentNote.id)} 
                       className={`p-2.5 rounded-[1.2rem] transition-all flex items-center justify-center ${
                         currentNote.isArchived 
                           ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 shadow-sm scale-105' 
                           : 'text-blue-500 bg-blue-50 dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800'
                       }`}
                     >
                       <ArchiveIcon className="w-5 h-5" />
                     </button>

                     <button 
                       onClick={() => toggleDelete(currentNote.id)} 
                       className={`p-2.5 rounded-[1.2rem] transition-all flex items-center justify-center ${
                         currentNote.isDeleted 
                           ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 shadow-sm scale-105' 
                           : 'text-rose-500 bg-rose-50 dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-slate-800'
                       }`}
                     >
                       <DeletedIcon className="w-5 h-5" />
                     </button>
                   </div>
                 </>
               )}
             </div>
           </header>

           <main className="flex-1 overflow-y-auto px-4 pt-4 pb-48 no-scrollbar">
              <div className="mb-2">
                <textarea 
                 className="w-full text-[16px] font-extrabold bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-100 dark:placeholder:text-slate-800 mb-0 leading-tight resize-none no-scrollbar transition-colors"
                 rows={1}
                 value={currentNote.title} 
                 onChange={(e) => updateNote(currentNote.id, { title: e.target.value })}
                 readOnly={currentNote.isDeleted}
                 placeholder="Untitled"
                />

                <div className="flex flex-wrap items-center gap-3 mt-1 border-t border-slate-50 dark:border-slate-900 pt-2 transition-colors">
                  <span className="text-slate-400 dark:text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] transition-colors">
                    Last edited {formatFullDateTime(currentNote.updatedAt)}
                  </span>
                </div>
              </div>

              {currentNote.type === 'audio' ? (
                <div className="flex flex-col items-center justify-center py-12 gap-10">
                  {currentNote.audioUrl ? (
                    <div className="w-full space-y-8">
                       <div className="p-8 rounded-[3rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6 shadow-sm transition-colors">
                         <div className="w-28 h-28 bg-slate-900 dark:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-colors">
                           <AudioIcon className="w-12 h-12" />
                         </div>

                         <audio 
                           ref={audioRef} 
                           src={currentNote.audioUrl} 
                           controls 
                           className="w-full h-10 accent-slate-900 dark:accent-indigo-500" 
                         />

                         <div className="flex items-center gap-2 justify-center mt-2">
                            {[0.5, 1, 1.5, 2].map(speed => (
                              <button 
                                key={speed}
                                onClick={() => { hapticFeedback(); setPlaybackSpeed(speed); }}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                  playbackSpeed === speed 
                                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' 
                                    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                         </div>
                       </div>

                       {!currentNote.isDeleted && (
                         <button 
                          onClick={() => startRecording(currentNote.id)}
                          className="w-full py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-100 dark:hover:border-slate-100 transition-all active:scale-95"
                         >
                           Record again
                         </button>
                       )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-500">
                       <div className="w-40 h-40 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800 transition-colors">
                         <AudioIcon className="w-[104px] h-[104px] text-slate-400 dark:text-slate-400 transition-colors" />
                       </div>

                       <button 
                         onClick={() => startRecording(currentNote.id)}
                         className="px-12 py-7 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-95 transition-all flex items-center gap-4"
                       >
                         <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                         Start Recording
                       </button>
                    </div>
                  )}

                  {currentNote.content && (
                    <div className="w-full space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 px-4 transition-colors">
                        Transcript
                      </h4>

                      <textarea 
                        ref={contentRef}
                        className="w-full min-h-[200px] text-base leading-relaxed text-slate-400 dark:text-slate-400 bg-transparent outline-none resize-none font-medium placeholder:text-slate-200 dark:placeholder:text-slate-800 transition-colors"
                        placeholder="Transcription will appear here..."
                        value={currentNote.content} 
                        onChange={(e) => updateNote(currentNote.id, { content: e.target.value })}
                        readOnly={currentNote.isDeleted}
                      />
                    </div>
                  )}
                </div>
              ) : currentNote.type === 'checklist' ? (
                <div className="space-y-0.5 mb-8 mt-1" ref={checklistContainerRef}>
                  {(currentNote.items || []).map((item, index) => (
                    <div 
                      key={item.id} 
                      data-checklist-id={item.id}
                      ref={el => { if (el) checklistItemRefs.current.set(item.id, el); }}
                      className={`flex items-center gap-1.5 py-1 px-1 rounded-2xl group transition-all duration-300 border-2 border-transparent ${
                        draggedItemId === item.id 
                          ? 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-700 opacity-50 scale-[0.98] z-50 shadow-none select-none pointer-events-none' 
                          : 'bg-white dark:bg-transparent'
                      }`}
                    >
                       <div 
                         onPointerDown={(e) => handlePointerDownChecklist(item.id, e)}
                         className={`p-1 rounded-xl transition-all cursor-grab active:cursor-grabbing touch-none flex items-center justify-center select-none ${
                           currentNote.isDeleted ? 'hidden' : 'block'
                         } ${
                           draggedItemId === item.id 
                             ? 'text-indigo-500 scale-125 bg-white dark:bg-slate-800 shadow-sm' 
                             : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                         }`}
                         style={{ touchAction: 'none' }}
                       >
                         <DragIcon className="w-5 h-5" />
                       </div>
                       <button 
                        disabled={currentNote.isDeleted}
                        onClick={() => { 
                          hapticFeedback(); 
                          updateNote(currentNote.id, { 
                            items: currentNote.items?.map(i => 
                              i.id === item.id ? {...i, completed: !i.completed} : i
                            ) 
                          }); 
                        }}
                        className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          item.completed 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                            : 'border-slate-400 dark:border-slate-400 bg-white dark:bg-slate-900'
                        }`}
                       >
                         {item.completed && <span className="w-4.5 h-4.5"><CheckIcon strokeWidth={4} /></span>}
                       </button>
                       
                       <div className="flex-1 min-h-[32px] flex items-center cursor-text relative">
                        {editingItemId === item.id && !currentNote.isDeleted ? (
                          <input 
                            ref={el => {
                              if (el) {
                                checklistRefs.current.set(item.id, el);
                              } else {
                                checklistRefs.current.delete(item.id);
                              }
                            }}
                            className={`w-full text-base font-semibold bg-transparent outline-none transition-all py-1 ${
                              item.completed 
                                ? 'text-slate-300 dark:text-slate-700 line-through' 
                                : 'text-slate-700 dark:text-slate-400'
                            }`}
                            value={item.text} 
                            autoFocus
                            onBlur={() => setEditingItemId(null)}
                            onChange={(e) => updateNote(currentNote.id, { 
                              items: currentNote.items?.map(i => 
                                i.id === item.id ? {...i, text: e.target.value} : i
                              ) 
                            })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChecklistItem(item.id);
                              } else if (e.key === 'ArrowDown') {
                                const currentItems = currentNote.items || [];
                                if (index < currentItems.length - 1) {
                                  e.preventDefault();
                                  setFocusTargetId(currentItems[index + 1].id);
                                }
                              } else if (e.key === 'ArrowUp') {
                                const currentItems = currentNote.items || [];
                                if (index > 0) {
                                  e.preventDefault();
                                  setFocusTargetId(currentItems[index - 1].id);
                                }
                              } else if ((e.key === 'Backspace' || e.key === 'Delete') && item.text === '') {
                                const currentItems = currentNote.items || [];
                                if (currentItems.length > 1) {
                                  e.preventDefault();
                                  let targetFocusId: string | null = null;
                                  
                                  if (e.key === 'Backspace') {
                                    targetFocusId = index > 0 
                                      ? currentItems[index - 1].id 
                                      : (currentItems[index + 1]?.id || null);
                                  } else if (e.key === 'Delete') {
                                    targetFocusId = index < currentItems.length - 1 
                                      ? currentItems[index + 1].id 
                                      : (index > 0 ? currentItems[index - 1].id : null);
                                  }
                                  
                                  if (targetFocusId) setFocusTargetId(targetFocusId);
                                  updateNote(currentNote.id, { 
                                    items: currentItems.filter(i => i.id !== item.id) 
                                  });
                                }
                              }
                            }}
                            placeholder="List Item"
                          />
                        ) : (
                          <div 
                            onClick={() => { 
                              if(!currentNote.isDeleted) setEditingItemId(item.id); 
                            }}
                            className={`w-full text-base font-semibold py-1 leading-normal transition-all select-text ${
                              item.completed 
                                ? 'text-slate-300 dark:text-slate-700 line-through' 
                                : 'text-slate-700 dark:text-slate-400'
                            } ${!item.text ? 'text-slate-200 dark:text-slate-400/30 italic' : ''}`}
                          >
                            {item.text || 'List Item'}
                          </div>
                        )}
                       </div>
                    </div>
                  ))}

                  {!currentNote.isDeleted && (
                    <button 
                      onClick={() => handleAddChecklistItem()} 
                      className="flex items-center gap-2 text-slate-300 dark:text-slate-400 font-bold text-[8.5px] uppercase tracking-widest py-3 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-auto mt-1 ml-1"
                    >
                      <PlusIcon className="w-4 h-4" /> 
                      <span>Add New Item</span>
                    </button>
                  )}
                </div>
              ) : (
                <textarea 
                  ref={contentRef}
                  className="w-full min-h-[400px] text-base leading-relaxed text-slate-600 dark:text-slate-400 bg-transparent outline-none resize-none font-medium placeholder:text-slate-200 dark:placeholder:text-slate-400/30 mt-2 transition-colors"
                  placeholder="Start typing..."
                  value={currentNote.content} 
                  onChange={(e) => updateNote(currentNote.id, { content: e.target.value })}
                  readOnly={currentNote.isDeleted}
                />
              )}

              {(currentNote.summary || currentNote.strategicActions) && (
                <div className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-6 transition-colors">
                  <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-900 transition-colors" />

                  {currentNote.summary && (
                    <div className="p-8 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 transition-colors">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 dark:text-indigo-400 mb-4 flex items-center gap-2.5">
                        <span className="w-4 h-4"><SparklesIcon /></span> AI Summary
                      </h4>
                      <div className="text-[15px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap transition-colors">
                        {currentNote.summary}
                      </div>
                    </div>
                  )}

                  {currentNote.strategicActions && (
                    <div className="p-8 rounded-[2.5rem] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 transition-colors">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-500 mb-4 flex items-center gap-2.5">
                        <span className="w-4 h-4"><CheckIcon strokeWidth={4} /></span> Next Steps
                      </h4>
                      <div className="text-[15px] font-bold text-slate-700 dark:text-slate-400 leading-relaxed whitespace-pre-wrap transition-colors">
                        {currentNote.strategicActions}
                      </div>
                    </div>
                  )}
                </div>
              )}
           </main>
        </div>
      )}
      {state.view === 'settings' && (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden animate-in slide-in-from-left-full z-[1000] transition-colors">
           <header className="px-10 pt-20 pb-10 flex items-center gap-8 transition-colors">
             <button 
               onClick={() => { 
                 hapticFeedback(); 
                 setState(p => ({...p, view: 'list'})); 
               }} 
               className="p-5 bg-slate-50 dark:bg-slate-900 rounded-[1.8rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
             >
               <svg className="w-8 h-8 text-slate-900 dark:text-white transition-colors" fill="none" stroke="currentColor" strokeWidth={4}>
                 <path d="M15.75 19.5 8.25 12l7.5-7.5" />
               </svg>
             </button>

             <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors">
               Account
             </h2>
           </header>

           <div className="px-10 py-6 space-y-14 overflow-y-auto no-scrollbar pb-40">

              <section className="p-12 rounded-[3.5rem] bg-slate-900 dark:bg-slate-900/80 text-white shadow-[0_40px_100px_rgba(15,23,42,0.3)] relative overflow-hidden group transition-colors">
                 <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/20 rounded-full blur-[100px]" />

                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">
                   Current Plan
                 </p>

                 <h3 className="text-5xl font-black mb-12 tracking-tighter">
                   {state.profile.tier}
                 </h3>
                 
                 {state.profile.tier === 'FREE' && (
                    <button 
                      onClick={() => { 
                        hapticFeedback(); 
                        setShowPaywall(true);
                      }}
                      className="w-full py-5 bg-white text-slate-900 rounded-[1.8rem] font-black uppercase tracking-widest text-[11px] shadow-2xl active:scale-95 transition-all animate-in slide-in-from-bottom-4 duration-700"
                    >
                      Upgrade to Unlimited
                    </button>
                 )}
              </section>

              <section className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 ml-6 mb-8 transition-colors">
                   Monthly Limits
                 </h3>

                 <div className="space-y-4">
                    <QuotaIndicator 
                      label="AI Summaries" 
                      used={state.profile.usage.summaries} 
                      limit={TIER_LIMITS[state.profile.tier].summaries} 
                    />
                    <QuotaIndicator 
                      label="Audio to Text" 
                      used={state.profile.usage.transcriptionsMinutes} 
                      limit={TIER_LIMITS[state.profile.tier].transcriptionsMinutes} 
                    />
                    <QuotaIndicator 
                      label="Image to Text" 
                      used={state.profile.usage.ocrScans} 
                      limit={TIER_LIMITS[state.profile.tier].ocrScans} 
                    />
                 </div>
              </section>

              <section className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 ml-6 mb-8 transition-colors">
                   Appearance
                 </h3>

                 <div className="bg-slate-50/80 dark:bg-slate-900/80 px-6 h-20 rounded-[2.5rem] flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 transition-colors">
                      Dark Mode
                    </span>

                    <button 
                      onClick={toggleTheme}
                      className={`w-14 h-8 rounded-full transition-all relative p-1 flex-shrink-0 ${
                        state.profile.theme === 'dark' 
                          ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]' 
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <div 
                        className={`w-6 h-6 rounded-full bg-white dark:bg-slate-100 shadow-md transition-all transform ${
                          state.profile.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                        }`} 
                      />
                    </button>
                 </div>
              </section>

              <section className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 ml-6 mb-8 transition-colors">
                   Legal
                 </h3>
                 <div className="space-y-4">
                  <button
                    onClick={() => { hapticFeedback(); setState(p => ({...p, view: 'privacy', returnView: 'settings'})); }}
                    className="w-full bg-slate-50/80 dark:bg-slate-900/80 px-6 h-20 rounded-[2.5rem] flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm transition-all active:scale-95"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 transition-colors">
                      Privacy Policy
                    </span>
                    <svg
                      className="w-5 h-5 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>

                  <button
                    onClick={() => { hapticFeedback(); setState(p => ({...p, view: 'terms', returnView: 'settings'})); }}
                    className="w-full bg-slate-50/80 dark:bg-slate-900/80 px-6 h-20 rounded-[2.5rem] flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm transition-all active:scale-95"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 transition-colors">
                      Terms of Service
                    </span>
                    <svg
                      className="w-5 h-5 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </section>
           </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showPaywall && (
          <Paywall 
            onClose={() => setShowPaywall(false)}
            onShowTerms={() => { hapticFeedback(); setShowPaywall(false); setState(p => ({...p, view: 'terms', returnView: p.view as any, showPaywallOnReturn: true })); }}
            onShowPrivacy={() => { hapticFeedback(); setShowPaywall(false); setState(p => ({...p, view: 'privacy', returnView: p.view as any, showPaywallOnReturn: true })); }}
            onUpgrade={() => {
              hapticFeedback();
              setState(prev => {
                const updatedProfile: UserProfile = { ...prev.profile, tier: 'UNLIMITED' };
                if (user && isOnline) {
                  syncProfileToSupabase(updatedProfile, user.id);
                }
                return { ...prev, profile: updatedProfile };
              });
              setShowPaywall(false);
              showToast("Upgraded to Unlimited!", "success", "bg-indigo-500");
            }}
          />
        )}
        {state.view === 'privacy' && (
          <motion.div 
            key="privacy"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-1 flex flex-col bg-[#fcfdfe] dark:bg-[#020617] overflow-hidden z-[1100] transition-colors"
          >
          <header className="px-8 pt-16 pb-8 flex items-center justify-between sticky top-0 bg-[#fcfdfe]/80 dark:bg-[#020617]/80 backdrop-blur-xl z-[10] border-b border-slate-100 dark:border-slate-900">
             <button onClick={() => { 
               hapticFeedback(); 
               if (state.showPaywallOnReturn) setShowPaywall(true);
               setState(p => ({...p, view: p.returnView || 'settings', showPaywallOnReturn: false})); 
             }} className="p-4 bg-white dark:bg-slate-900 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-100 dark:border-slate-800">
               <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
             </button>
             <div className="text-right">
               <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Privacy Policy</h2>
             </div>
          </header>
          <div className="flex-1 overflow-y-auto px-8 pt-12 pb-40 no-scrollbar">
             <div className="max-w-2xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-16"
                >
                   <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-none">Privacy Policy</h1>
                   <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">Last Updated: 17 February 2026</div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">4 min read</div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">App: NoteCompass AI</div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">Business: Enchanted Systems</div>
                   </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-16 p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/50"
                >
                  <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">Quick Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Data Ownership", value: "You own your notes" },
                      { label: "Security", value: "Encrypted via Supabase" },
                      { label: "AI Processing", value: "No training on your data" },
                      { label: "Privacy", value: "We never sell your data" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-1 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white">✓</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <div className="space-y-16">
                   {[
                     {
                       id: "01",
                       title: "Introduction",
                       content: (
                         <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                           <p>This Privacy Policy explains how NoteCompass AI (“the App”, “we”, “us”, “our”) — operated by Enchanted Systems, a UK‑based sole trader — collects, uses, stores, and protects your personal data.</p>
                           <p>By using NoteCompass AI, you agree to the practices described in this policy.</p>
                         </div>
                       )
                     },
                     {
                       id: "02",
                       title: "Data We Collect",
                       content: (
                         <div className="space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                           <p>We collect only the data required to provide core functionality.</p>
                           <div className="grid gap-6 sm:grid-cols-2">
                             <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                               <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-3">2.1 Account Information</h5>
                               <ul className="space-y-2 text-sm">
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> Email address</li>
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> Password (encrypted via Supabase)</li>
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> Authentication tokens</li>
                               </ul>
                             </div>
                             <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                               <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-3">2.2 Notes & Content</h5>
                               <ul className="space-y-2 text-sm">
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> Text notes and Checklists</li>
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> Audio recordings</li>
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> Images uploaded for OCR</li>
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> AI‑generated insights</li>
                               </ul>
                             </div>
                             <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 sm:col-span-2">
                               <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-3">2.3 Usage Data</h5>
                               <ul className="space-y-2 text-sm">
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> AI feature consumption counts</li>
                                 <li className="flex items-center gap-2"><div className="w-1 h-1 bg-indigo-500 rounded-full" /> App theme and onboarding status</li>
                               </ul>
                             </div>
                           </div>
                         </div>
                       )
                     },
                     {
                       id: "03",
                       title: "How Your Data Is Used",
                       content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">We use your data to sync notes securely across devices, provide AI features, and improve app performance. We never sell your data.</p>
                     },
                     {
                       id: "04",
                       title: "AI Processing",
                       content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">NoteCompass AI uses Google Gemini models for summaries, transcription, OCR, and more. Your content is sent securely to Google’s AI services only for processing. We do not use your data to train AI models.</p>
                     },
                     {
                       id: "05",
                       title: "Storage & Security",
                       content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Your data is stored using Supabase, providing encrypted storage and UK/EU GDPR compliance. Audio files are stored in Supabase Storage, while notes are in Supabase Postgres.</p>
                     },
                     {
                       id: "06",
                       title: "Your Rights (UK GDPR)",
                       content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">You have the right to access, correct, delete your account, export notes, or withdraw consent. Contact: <span className="text-indigo-600 dark:text-indigo-400 font-bold underline decoration-2 underline-offset-4">enchantedsys@gmail.com</span></p>
                     },
                     {
                       id: "07",
                       title: "Data Retention",
                       content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">We retain your data while your account is active. Deleting your account permanently erases notes, audio files, and profile data. Backups are purged within 30 days.</p>
                     }
                   ].map((section, i) => (
                     <motion.section 
                       key={section.id}
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: 0.1 * i }}
                       className="group"
                     >
                       <div className="flex items-center gap-3 mb-6">
                         <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-100 dark:border-indigo-900/50">{section.id}</span>
                         <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{section.title}</h4>
                       </div>
                       {section.content}
                     </motion.section>
                   ))}

                   <motion.div 
                     initial={{ opacity: 0 }}
                     whileInView={{ opacity: 1 }}
                     viewport={{ once: true }}
                     className="pt-16 border-t border-slate-100 dark:border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                   >
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">Enchanted Systems</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sole Trader • United Kingdom</p>
                      </div>
                      <a href="https://enchantedsystems.com" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">enchantedsystems.com</a>
                   </motion.div>
                </div>
             </div>
          </div>
        </motion.div>
      )}

        {state.view === 'terms' && (
          <motion.div 
            key="terms"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-1 flex flex-col bg-[#fcfdfe] dark:bg-[#020617] overflow-hidden z-[1100] transition-colors"
          >
          <header className="px-8 pt-16 pb-8 flex items-center justify-between sticky top-0 bg-[#fcfdfe]/80 dark:bg-[#020617]/80 backdrop-blur-xl z-[10] border-b border-slate-100 dark:border-slate-900">
             <button onClick={() => { 
               hapticFeedback(); 
               if (state.showPaywallOnReturn) setShowPaywall(true);
               setState(p => ({...p, view: p.returnView || 'settings', showPaywallOnReturn: false})); 
             }} className="p-4 bg-white dark:bg-slate-900 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-100 dark:border-slate-800">
               <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
             </button>
             <div className="text-right">
               <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Terms of Service</h2>
             </div>
          </header>
          <div className="flex-1 overflow-y-auto px-8 pt-12 pb-40 no-scrollbar">
             <div className="max-w-2xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-16"
                >
                   <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-none">Terms of Service</h1>
                   <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">Last Updated: 17 February 2026</div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">5 min read</div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">App: NoteCompass AI</div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/50">Business: Enchanted Systems</div>
                   </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-16 p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/50"
                >
                  <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">Quick Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Service", value: "Provided \"as is\"" },
                      { label: "AI Outputs", value: "May be imperfect" },
                      { label: "Payments", value: "Free & Unlimited tiers" },
                      { label: "Law", value: "England & Wales" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-1 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white">✓</div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <div className="space-y-16">
                   {[
                     { id: "01", title: "Acceptance of Terms", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">By using NoteCompass AI, you agree to these Terms of Service. If you do not agree, you must stop using the App.</p> },
                     { id: "02", title: "Description of the Service", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">NoteCompass AI provides cloud-synced note-taking, audio recording/transcription, image scanning/OCR, and AI-generated insights. The service is provided “as is” without guarantees of uninterrupted availability.</p> },
                     { id: "03", title: "Accounts & Security", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">You must provide a valid email, keep your password secure, and not share your account. We may suspend accounts involved in abuse or misuse.</p> },
                     { id: "04", title: "Acceptable Use", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">You agree not to upload illegal or harmful content, harass others, or attempt to reverse engineer the service. Use of AI features for harmful purposes is strictly prohibited.</p> },
                     { id: "05", title: "AI Features", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">AI outputs may be imperfect, inaccurate, or incomplete. You agree not to rely on AI outputs for professional medical, legal, financial, or safety-critical advice.</p> },
                     { id: "06", title: "Subscription & Payments", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">NoteCompass AI offers Free and future Unlimited tiers. Prices may change with notice. Refunds are handled according to UK consumer law.</p> },
                     { id: "07", title: "Data & Privacy", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Your data is handled according to our Privacy Policy. You retain full ownership of your notes while consenting to necessary cloud storage and AI processing.</p> },
                     { id: "08", title: "Termination", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">You may delete your account at any time. We reserve the right to terminate accounts that violate these terms or compromise service security.</p> },
                     { id: "09", title: "Limitation of Liability", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">To the fullest extent permitted by UK law, we are not liable for data loss, AI errors, or service interruptions. Your use of the App is at your own risk.</p> },
                     { id: "10", title: "Governing Law", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">These Terms are governed by the laws of England and Wales.</p> },
                     { id: "11", title: "Contact", content: <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">For support or legal questions: <span className="text-indigo-600 dark:text-indigo-400 font-bold underline decoration-2 underline-offset-4">enchantedsys@gmail.com</span></p> }
                   ].map((section, i) => (
                     <motion.section 
                       key={section.id}
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: 0.1 * i }}
                       className="group"
                     >
                       <div className="flex items-center gap-3 mb-6">
                         <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 w-8 h-8 flex items-center justify-center rounded-lg border border-indigo-100 dark:border-indigo-900/50">{section.id}</span>
                         <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{section.title}</h4>
                       </div>
                       {section.content}
                     </motion.section>
                   ))}

                   <motion.div 
                     initial={{ opacity: 0 }}
                     whileInView={{ opacity: 1 }}
                     viewport={{ once: true }}
                     className="pt-16 border-t border-slate-100 dark:border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                   >
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">Enchanted Systems</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sole Trader • United Kingdom</p>
                      </div>
                      <a href="https://enchantedsystems.com" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors">enchantedsystems.com</a>
                   </motion.div>
                </div>
             </div>
          </div>
        </motion.div>
      )}

      </AnimatePresence>

      {showEmptyDeletedConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center px-8 animate-in fade-in duration-300">
           <div 
             className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-colors" 
             onClick={() => setShowEmptyDeletedConfirm(false)} 
           />

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl relative z-10 spring-up transition-colors">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-3xl flex items-center justify-center mb-8 mx-auto transition-colors">
                 <DeletedIcon className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-3 tracking-tight transition-colors">
                Clear Deleted Items?
              </h3>

              <p className="text-slate-500 dark:text-slate-400 text-center font-bold leading-relaxed mb-10 transition-colors">
                All items in the deleted folder will be permanently removed. This action cannot be undone.
              </p>

              <div className="space-y-3">
                 <button 
                   onClick={confirmEmptyDeleted}
                   className="w-full py-5 bg-rose-500 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-rose-200 active:scale-95 transition-all"
                 >
                   Delete All
                 </button>

                 <button 
                   onClick={() => setShowEmptyDeletedConfirm(false)}
                   className="w-full py-5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-[1.8rem] font-black uppercase tracking-widest text-[11px] hover:text-slate-600 dark:hover:text-slate-400 transition-all"
                 >
                   Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
