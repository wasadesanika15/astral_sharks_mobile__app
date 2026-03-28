import { create } from 'zustand';

interface AppState {
  isOfflineMode: boolean;
  setOfflineMode: (status: boolean) => void;
  safeZones: any[];
  setSafeZones: (zones: any[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOfflineMode: false,
  setOfflineMode: (status) => set({ isOfflineMode: status }),
  safeZones: [],
  setSafeZones: (zones) => set({ safeZones: zones }),
}));
