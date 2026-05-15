/**
 * Youli Global Store — Context + useReducer (sem deps externas)
 * Substitui useState espalhado com estado global reativo
 */
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  name: string;
  avatar?: string;
  orchestratorName: string;
  bio?: string;
  xp: number;
  level: number;
}

export interface AppSettings {
  notifications: { daily_digest: boolean; habit_reminders: boolean; goal_alerts: boolean; finance_alerts: boolean };
  digestHour: number;
  theme: 'dark' | 'light' | 'auto';
  language: 'pt-BR' | 'en-US';
  onboardingDone: boolean;
}

interface UIState {
  copilotOpen: boolean;
  notificationsOpen: boolean;
  weeklyReviewOpen: boolean;
  checkInOpen: boolean;
  activeTab: string;
}

interface StoreState {
  profile: UserProfile;
  settings: AppSettings;
  ui: UIState;
  hydrated: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ADD_XP'; payload: number }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_NOTIF_PREF'; payload: { key: keyof AppSettings['notifications']; value: boolean } }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_UI'; payload: Partial<UIState> }
  | { type: 'HYDRATE'; payload: Partial<StoreState> };

const DEFAULT_PROFILE: UserProfile = { name: 'Gustavo', orchestratorName: 'Youli', xp: 0, level: 1 };
const DEFAULT_SETTINGS: AppSettings = {
  notifications: { daily_digest: true, habit_reminders: true, goal_alerts: true, finance_alerts: true },
  digestHour: 8,
  theme: 'dark',
  language: 'pt-BR',
  onboardingDone: false,
};
const DEFAULT_UI: UIState = { copilotOpen: false, notificationsOpen: false, weeklyReviewOpen: false, checkInOpen: false, activeTab: 'dashboard' };

const INITIAL: StoreState = { profile: DEFAULT_PROFILE, settings: DEFAULT_SETTINGS, ui: DEFAULT_UI, hydrated: false };

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'ADD_XP': {
      const newXP = state.profile.xp + action.payload;
      return { ...state, profile: { ...state.profile, xp: newXP, level: Math.floor(newXP / 500) + 1 } };
    }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_NOTIF_PREF':
      return { ...state, settings: { ...state.settings, notifications: { ...state.settings.notifications, [action.payload.key]: action.payload.value } } };
    case 'COMPLETE_ONBOARDING':
      return { ...state, settings: { ...state.settings, onboardingDone: true } };
    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.payload } };
    case 'HYDRATE':
      return { ...state, ...action.payload, hydrated: true };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const StoreCtx = createContext<{ state: StoreState; dispatch: React.Dispatch<Action> } | null>(null);

const PROFILE_KEY = '@youli:profile';
const SETTINGS_KEY = '@youli:settings';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Hydrate on mount
  useEffect(() => {
    (async () => {
      const [profileRaw, settingsRaw] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
      ]);
      const patch: Partial<StoreState> = {};
      if (profileRaw) patch.profile = { ...DEFAULT_PROFILE, ...JSON.parse(profileRaw) };
      if (settingsRaw) patch.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) };
      dispatch({ type: 'HYDRATE', payload: patch });
    })();
  }, []);

  // Persist profile changes
  useEffect(() => {
    if (state.hydrated) AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
  }, [state.profile, state.hydrated]);

  // Persist settings changes
  useEffect(() => {
    if (state.hydrated) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }, [state.settings, state.hydrated]);

  return React.createElement(StoreCtx.Provider, { value: { state, dispatch } }, children);
}

// ── Hooks de conveniência ─────────────────────────────────────────────────────
function useStoreCtx() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useProfile() {
  const { state, dispatch } = useStoreCtx();
  const setProfile = useCallback((patch: Partial<UserProfile>) => dispatch({ type: 'SET_PROFILE', payload: patch }), [dispatch]);
  const addXP = useCallback((amount: number) => dispatch({ type: 'ADD_XP', payload: amount }), [dispatch]);
  return { profile: state.profile, setProfile, addXP };
}

export function useSettings() {
  const { state, dispatch } = useStoreCtx();
  const setSettings = useCallback((patch: Partial<AppSettings>) => dispatch({ type: 'SET_SETTINGS', payload: patch }), [dispatch]);
  const setNotifPref = useCallback((key: keyof AppSettings['notifications'], value: boolean) =>
    dispatch({ type: 'SET_NOTIF_PREF', payload: { key, value } }), [dispatch]);
  const completeOnboarding = useCallback(() => dispatch({ type: 'COMPLETE_ONBOARDING' }), [dispatch]);
  return { settings: state.settings, setSettings, setNotifPref, completeOnboarding };
}

export function useUI() {
  const { state, dispatch } = useStoreCtx();
  const setUI = useCallback((patch: Partial<UIState>) => dispatch({ type: 'SET_UI', payload: patch }), [dispatch]);
  return {
    ui: state.ui,
    openCopilot: () => setUI({ copilotOpen: true }),
    closeCopilot: () => setUI({ copilotOpen: false }),
    openNotifications: () => setUI({ notificationsOpen: true }),
    closeNotifications: () => setUI({ notificationsOpen: false }),
    openWeeklyReview: () => setUI({ weeklyReviewOpen: true }),
    closeWeeklyReview: () => setUI({ weeklyReviewOpen: false }),
    openCheckIn: () => setUI({ checkInOpen: true }),
    closeCheckIn: () => setUI({ checkInOpen: false }),
    setActiveTab: (tab: string) => setUI({ activeTab: tab }),
  };
}

export function useHydrated() {
  return useStoreCtx().state.hydrated;
}
