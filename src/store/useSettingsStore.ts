import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from './types';

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  isMultimodal: false,
  enableReasoning: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'lightflow-settings',
    }
  )
);
