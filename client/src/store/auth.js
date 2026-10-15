import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      // Logged-in user's branch: { id, name, code, logo, attendBackground,
      // address, phone, currency, subbillUrl, isActive }
      branch: null,
      isAuthenticated: false,

      // Login/register loading state
      isLoading: false,

      setLoading: (isLoading) => {
        set({
          isLoading,
        });
      },

      setAuth: ({ accessToken, refreshToken, user, branch }) => {
        set({
          accessToken,
          refreshToken,
          user,
          // Keep the current branch when the caller doesn't send one.
          branch: branch !== undefined ? branch : get().branch,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      updateAccessToken: (accessToken) => {
        set({
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      getAuth: () => {
        return get();
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          branch: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: "zervo-auth",
    },
  ),
);
