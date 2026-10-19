import { create } from "zustand";

import { getInitData } from "@/api/init/initApi";

/**
 * Init store: holds the result of each promise the server runs after login
 * (GET /api/init).
 *
 *   API  ->  store  ->  pages / dropdowns
 *
 * fetchInit re-throws on failure and shows no toast, so the caller (Login)
 * decides what to tell the user.
 *
 * The server runs its loaders with Promise.all, so the response is all or
 * nothing. Each loader's result is stored under its own key, so pages read
 * what they need, e.g. `useInitStore((s) => s.branches)`.
 *
 * When a new loader is added on the server (a new key in `data`), add that key
 * to `initialResults` below with its empty value.
 */

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// One entry per server loader. The key matches the key in the response.
const initialResults = {
  // Active branches (is_active = 1):
  // [{ id, name, code, logo, attendBackground, address, phone, currency,
  //    subbillUrl, isActive }]
  branches: [],
};

const initialState = {
  ...initialResults,

  // Status of the whole init call
  hasLoaded: false,
  isLoading: false,
  error: null,
};

// Used to ignore a slow response after reset() or when a newer call was made.
let requestId = 0;

export const useInitStore = create((set) => ({
  ...initialState,

  // GET /api/init  (call once after a successful login)
  fetchInit: async () => {
    const currentRequestId = ++requestId;

    set({ isLoading: true, error: null });

    try {
      const data = await getInitData();

      if (currentRequestId !== requestId) return;

      // Keep only the keys the store knows about, so the response can never
      // overwrite status fields such as `isLoading`. Missing keys fall back
      // to their empty value.
      const results = Object.keys(initialResults).reduce((acc, key) => {
        acc[key] = data?.[key] ?? initialResults[key];
        return acc;
      }, {});

      set({
        ...results,
        hasLoaded: true,
        isLoading: false,
      });

      return results;
    } catch (error) {
      if (currentRequestId !== requestId) return;

      const message = getApiError(error, "Failed to load initial data");

      // No toast here: the caller shows its own message (see Login.jsx).
      set({ error: message, isLoading: false });

      throw error;
    }
  },

  // Clear everything (call on logout so the next user starts clean).
  reset: () => {
    requestId += 1;
    set({ ...initialState });
  },
}));
