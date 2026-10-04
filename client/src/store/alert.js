import { create } from "zustand";

let nextId = 1;

export const useAlertStore = create((set) => ({
  alerts: [],

  // Adds an alert and returns its id.
  addAlert: ({ type = "info", title, message, duration = 3000 }) => {
    const id = nextId++;

    set((state) => ({
      // newest first, same as toastify's `newestOnTop`
      alerts: [{ id, type, title, message, duration }, ...state.alerts],
    }));

    return id;
  },

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),

  clearAlerts: () => set({ alerts: [] }),
}));
