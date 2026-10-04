import { create } from "zustand";

export const useSettingsStore = create((set) => ({
  notificationsEnabled: true,

  setNotificationsEnabled: (enabled) =>
    set({
      notificationsEnabled: enabled,
    }),

  toggleNotifications: () =>
    set((state) => ({
      notificationsEnabled: !state.notificationsEnabled,
    })),
}));
